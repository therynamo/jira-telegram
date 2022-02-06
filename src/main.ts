import * as core from '@actions/core';
import { context } from '@actions/github';

const { setFailed, setOutput, getInput } = core;

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
const escapeRegExp = (str: string) => {
  // eslint-disable-next-line no-useless-escape
  return str.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'); // $& means the whole matched string
};

async function run(): Promise<void> {
  try {
    const { pull_request } = context.payload;

    if (!pull_request) {
      setFailed('This action only works on pull requests');
    }
    const jiraHost = getInput('jira_host');
    // const projectKeys = getInput('project_keys');

    const { body = '' } = pull_request ?? {};

    const jiraRegexp = new RegExp(
      `(?:${escapeRegExp('[')}|${escapeRegExp(`${jiraHost}/browse/`)})(?<ticket_id>[[A-Z][A-Z0-9]*-[1-9][0-9]*)${escapeRegExp(']')}?`,
      'gmi',
    );

    const matches = jiraRegexp.exec(body);

    // eslint-disable-next-line no-console
    console.log(`${matches?.groups?.jira_ticket}`);
    setOutput('time', new Date().toTimeString());
  } catch (error) {
    if (error instanceof Error) setFailed(error.message);
  }
}

run();
