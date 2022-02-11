import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { createEmptyCommitWithMessage } from './empty-commit';
import { uniq } from 'lodash';
const { setFailed, getInput } = core;

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
const escapeRegExp = (str: string) => {
  // eslint-disable-next-line no-useless-escape
  return str.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'); // $& means the whole matched string
};

const sleep = async (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

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

    const octoKit = getOctokit(token);

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

    let filteredTicketIds = ticketIds;

    // if (!!ignoredKeys.length && !!projectKeys.length) {
    //   setFailed('Choose between `ignored_project_keys` and `project_keys` - using both is not supported');
    //   return;
    // }

    if (ignoredKeys.length) {
      filteredTicketIds = ticketIds?.filter((ticket) => !ignoredKeys.some((ignore) => ticket?.includes(ignore)));
    }

    if (projectKeys.length) {
      filteredTicketIds = ticketIds?.filter((ticket) => projectKeys.some((projectKey) => ticket?.includes(projectKey)));
    }

    if (!filteredTicketIds?.length) {
      core.info('No tickets were found. Exiting gracefully...');
      return;
    }

    filteredTicketIds = uniq(filteredTicketIds);

    if (firstTicketOnly) {
      const { data: commits } = await octoKit.rest.pulls.listCommits({
        ...context.repo,
        pull_number: pull_request?.number ?? 0,
      });

      const hasCommittedAlready = commits?.some((commit) => {
        return filteredTicketIds?.includes(commit.commit.message);
      });

      if (hasCommittedAlready) {
        core.info('Telegram has already been sent - skipping commit.');
        return;
      }

      await createEmptyCommitWithMessage({
        ...context.repo,
        message: `${filteredTicketIds[0]}` ?? '',
        branch: pull_request?.head?.ref,
        octokit: octoKit,
      });
    }

    let newRef = '';

    const batchedCommit = async ({ ticketId, isLastMessage }: { ticketId: string; isLastMessage: boolean }) => {
      const { data: commits } = await octoKit.rest.pulls.listCommits({
        ...context.repo,
        pull_number: pull_request?.number ?? 0,
      });

      const hasCommittedAlready = commits?.some((commit) => commit?.commit?.message?.includes(ticketId ?? ''));
      console.log({ hasCommittedAlready, commits: commits.map((com) => com.commit.message), ticketId });

      if (!hasCommittedAlready) {
        try {
          const ref = await createEmptyCommitWithMessage({
            ...context.repo,
            message: `${ticketId} ${isLastMessage ? '[actions skip]' : ''}`,
            branch: pull_request?.head?.ref,
            octokit: octoKit,
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
        await sleep(2000);
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
