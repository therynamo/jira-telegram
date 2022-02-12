import { Context } from '@actions/github/lib/context';
import { getOctokit } from '@actions/github';

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
export const escapeRegExp = (str: string) => {
  // eslint-disable-next-line no-useless-escape
  return str.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'); // $& means the whole matched string
};

interface HasCommittedProps {
  octokit: ReturnType<typeof getOctokit>;
  pull_number: number;
  ticketId: string;
  context: Context;
}

export const hasCommitted = async ({ octokit, pull_number, ticketId, context }: HasCommittedProps) => {
  const { data: commits } = await octokit.rest.pulls.listCommits({
    ...context.repo,
    pull_number,
    per_page: 100,
  });

  const commitRegex = new RegExp(`${ticketId}([^\\w]|$)`, 'gm');

  const hasCommittedAlready = commits?.some((commit) => {
    return commitRegex.test(commit?.commit?.message);
  });

  return hasCommittedAlready;
};
