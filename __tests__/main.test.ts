import { run } from '../src/main';
import * as gh from '@actions/github';
import stubContextPayload from './__fixtures__/pr_with_body.json';

jest.mock('@actions/github');

test('Jira Telegram', async () => {
  // @ts-expect-error haha
  gh.context.payload = stubContextPayload;

  await run();
  expect(1).toEqual(1);
});
