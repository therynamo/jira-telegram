import * as core from '@actions/core';
import {context} from '@actions/github';

async function run(): Promise<void> {
  try {
    // eslint-disable-next-line no-console
    console.log(`${JSON.stringify(context.payload, null, 2)}`);
    core.setOutput('time', new Date().toTimeString());
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

run();
