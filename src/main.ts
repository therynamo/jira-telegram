import * as core from '@actions/core';
import { context } from '@actions/github';

const { setFailed, setOutput, getInput } = core;

async function run(): Promise<void> {
  try {
    const { pull_request } = context.payload;

    if (!pull_request) {
      setFailed('This action only works on pull requests');
    }
    const jiraHost = getInput('jira_host');
    // const projectKeys = getInput('project_keys');

    const { body = '' } = pull_request ?? {};

    const jiraRegexp = new RegExp(`(?:<jira_ticket>${jiraHost})`, 'gmi');

    const matches = jiraRegexp.exec(body);

    // eslint-disable-next-line no-console
    console.log(`${matches?.groups?.jira_ticket}`);
    setOutput('time', new Date().toTimeString());
  } catch (error) {
    if (error instanceof Error) setFailed(error.message);
  }
}

run();
