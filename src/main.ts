import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { escapeRegExp, hasCommitted } from './utils';
import { createEmptyCommitWithMessage } from './empty-commit';
import { uniq } from 'lodash';

const { setFailed, getInput } = core;

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

    const projectKeys = projectKeysInput.split(',');
    const ignoredKeys = ingoredKeysInput.split(',');

    const token = getInput('github_token');

    const octokit = getOctokit(token);

    const { body = '' } = pull_request ?? {};

    const jiraRegexp = new RegExp(
      `(?:${escapeRegExp('[')}|${escapeRegExp(`${jiraHost}/browse/`)})(?<ticket_id>[[A-Z][A-Z0-9]*-[1-9][0-9]*)${escapeRegExp(']')}?`,
      'gmi',
    );

    const ticketIds = body.match(jiraRegexp)?.map((match) => {
      // Reset last index since we're looping and we don't
      // want to waste cycles re-initializing the regex for
      // every element.
      jiraRegexp.lastIndex = 0;

      return jiraRegexp.exec(match)?.groups?.ticket_id;
    });

    let filteredTicketIds = ticketIds ?? [];

    if (ignoredKeys.length) {
      filteredTicketIds = filteredTicketIds?.filter((ticket) => !ignoredKeys.some((ignore) => ticket?.includes(ignore)));
    }

    if (projectKeys.length) {
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

      await createEmptyCommitWithMessage({
        ...context.repo,
        message: `${filteredTicketIds[0]}` ?? '',
        branch: pull_request?.head?.ref,
        octokit,
      });
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
          setFailed(`Failed on ${ticketId} - ${hasCommittedAlready}: ${error}`);
        }
      }
    };

    for (let i = 0; i < filteredTicketIds.length; i++) {
      const isLastMessage = i !== (filteredTicketIds as string[])?.length - 1;
      try {
        await batchedCommit({ ticketId: (filteredTicketIds as string[])[i], isLastMessage });
      } catch (error) {
        console.log({ error });
      }
    }
  } catch (error) {
    if (error instanceof Error) setFailed(error.message);
  }
}

run();
