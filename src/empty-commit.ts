import type { getOctokit } from '@actions/github';

type Props = {
  owner: string;
  repo: string;
  branch: string;
  message: string;
  octokit: ReturnType<typeof getOctokit>;
  newRef?: string;
};

export const createEmptyCommitWithMessage = async ({ octokit, owner, repo, branch, message, newRef }: Props) => {
  const newBranchRef = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });

  console.log({ newBranchRef: newBranchRef.data });

  const currentCommit = await octokit.rest.git.getCommit({
    owner,
    repo,
    commit_sha: newRef ?? newBranchRef?.data?.object?.sha,
  });

  console.log({ currentCommit: currentCommit.data });

  const newCommit = await octokit.rest.git.createCommit({
    owner,
    repo,
    message,
    tree: currentCommit?.data?.tree?.sha,
    parents: [currentCommit?.data?.sha],
  });

  console.log({ newCommit: newCommit.data });

  const updatedRef = await octokit.rest.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: newCommit.data.sha,
  });

  return updatedRef.data.object.sha;
};
