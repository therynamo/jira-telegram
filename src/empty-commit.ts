import type { getOctokit } from '@actions/github';

type Props = {
  owner: string;
  repo: string;
  branch: string;
  message: string;
  octokit: ReturnType<typeof getOctokit>;
};

export const createEmptyCommitWithMessage = async ({ octokit, owner, repo, branch, message }: Props) => {
  const newBranchRef = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `refs/heads/${branch}`,
  });
  console.log({ newBranchRef });

  const currentCommit = await octokit.rest.git.getCommit({
    owner,
    repo,
    commit_sha: newBranchRef?.data?.object?.sha,
  });
  console.log({ currentCommit });

  const newCommit = await octokit.rest.git.createCommit({
    owner,
    repo,
    message,
    tree: currentCommit?.data?.tree?.sha,
    parents: [currentCommit?.data?.sha],
  });
  console.log({ newCommit });

  await octokit.rest.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: newCommit.data.sha,
  });
};
