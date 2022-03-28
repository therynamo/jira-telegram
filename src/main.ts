import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { escapeRegExp, hasCommitted } from './utils';
import { createEmptyCommitWithMessage } from './empty-commit';
import { uniq } from 'lodash';

const { setFailed, getInput } = core;

const COMMENT_REGEX = /(?:<!--\s.?telegram\s.?-->)(?<content>[\S\s.]*?)(?:<!--\s.?end telegram\s.?-->)/gim;

export async function run(): Promise<void> {
  try {
    const { pull_request } = context.payload;

    if (!pull_request) {
      setFailed('This action only works on pull requests');
    }
    const jiraHost = getInput('jira_host');
    const firstTicketOnly = getInput('first_ticket_only');
    const ingoredKeysInput = getInput('ignored_project_keys');
    const projectKeysInput = getInput('project_keys');
    const usePrCommentBlocks = getInput('use_pr_comment_blocks');

    const projectKeys = projectKeysInput.trim().split(',');
    const ignoredKeys = ingoredKeysInput.trim().split(',');

    const token = getInput('github_token');

    const octokit = getOctokit(token);

    const { body = '' } = pull_request ?? {};

    let content = body ?? '';

    if (usePrCommentBlocks) {
      content = COMMENT_REGEX.exec(body)?.groups?.content ?? '';
    }

    const jiraRegexp = new RegExp(
      `(?:${escapeRegExp('[')}|${escapeRegExp(`${jiraHost}/browse/`)})(?<ticket_id>[[A-Z][A-Z0-9]*-[1-9][0-9]*)${escapeRegExp(']')}?`,
      'gmi',
    );

    const ticketIds = content.match(jiraRegexp)?.map((match) => {
      // Reset last index since we're looping and we don't
      // want to waste cycles re-initializing the regex for
      // every element.
      jiraRegexp.lastIndex = 0;

      return jiraRegexp.exec(match)?.groups?.ticket_id;
    });

    let filteredTicketIds = ticketIds ?? [];

    if (ignoredKeys.length) {
      core.info(`Filtering based on ignored keys input: ${ignoredKeys}`);
      filteredTicketIds = filteredTicketIds?.filter((ticket) => !ignoredKeys.some((ignore) => ticket?.includes(ignore)));
    }

    if (projectKeys.length) {
      core.info(`Filtering based on project keys input: ${projectKeys}`);

      filteredTicketIds = ticketIds?.filter((ticket) => projectKeys.some((projectKey) => ticket?.includes(projectKey))) ?? [];
    }

    if (!filteredTicketIds?.length) {
      core.info('No tickets were found. Exiting gracefully...');
      return;
    }

    filteredTicketIds = uniq(filteredTicketIds);

    if (firstTicketOnly) {
      const hasCommittedAlready = await hasCommitted({
        octokit,
        pull_number: pull_request?.number ?? 0,
        ticketId: filteredTicketIds[0] ?? '',
        context,
      });

      if (hasCommittedAlready) {
        core.info('Telegram has already been sent - skipping commit.');
        return;
      }

      core.info(`Creating commit for ${filteredTicketIds[0]}`);

      try {
        await createEmptyCommitWithMessage({
          ...context.repo,
          message: `${filteredTicketIds[0]}` ?? '',
          branch: pull_request?.head?.ref,
          octokit,
        });
      } catch (error) {
        core.error(`Failed on ${filteredTicketIds[0]}. Has been committed? ${hasCommittedAlready}: ${error}`);
        setFailed(`Failed on ${filteredTicketIds[0]}. Has been committed? ${hasCommittedAlready}: ${error}`);
      }

      core.info(`Succeeded in committing for ${filteredTicketIds[0]}`);
    }

    let newRef = '';

    const batchedCommit = async ({ ticketId, isLastMessage }: { ticketId: string; isLastMessage: boolean }) => {
      const hasCommittedAlready = await hasCommitted({ pull_number: pull_request?.number ?? 0, octokit, ticketId, context });

      if (!hasCommittedAlready) {
        try {
          const ref = await createEmptyCommitWithMessage({
            ...context.repo,
            message: `${ticketId} ${isLastMessage ? '[actions skip]' : ''}`,
            branch: pull_request?.head?.ref,
            octokit,
            newRef,
          });
          newRef = ref;
        } catch (error) {
          core.error(`Failed on ${ticketId} - ${hasCommittedAlready}: ${error}`);
          setFailed(`Failed on ${ticketId} - ${hasCommittedAlready}: ${error}`);
        }
      }
    };

    for (let i = 0; i < filteredTicketIds.length; i++) {
      const isLastMessage = i !== (filteredTicketIds as string[])?.length - 1;
      try {
        core.info(`Creating commit for ${filteredTicketIds[i]}`);

        await batchedCommit({ ticketId: (filteredTicketIds as string[])[i], isLastMessage });

        core.info(`Succeeded in committing for ${filteredTicketIds[i]}`);
      } catch (error) {
        core.info(`Failed in committing for ${filteredTicketIds[i]}`);
        console.log({ error });
      }
    }
  } catch (error) {
    if (error instanceof Error) setFailed(error.message);

    core.error(`${error}`);
  }
}

run();
