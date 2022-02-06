# Jira Telegram

The missing messenger for Jira's [github automation integrations](https://support.atlassian.com/jira-software-cloud/docs/reference-issues-in-your-development-work/).

Currently, Jira integrations do not support `Pull Request Body` as a valid option for Jira Automations.

> ### Pull requests
>
> Do at least one of the following:
>
> - Include a commit in the pull request that has the issue key in the commit message. Note, the commit cannot be a merge commit.
> - Include the issue key at the beginning of the pull request title.
> - Ensure that the source branch name also includes the issue key at the beginning of the branch name.
>   This works by default in connected Bitbucket, GitLab, GitHub, and GitHub Enterprise tools.
>   If you create the pull request from the development panel in a Jira issue, the issue key is added automatically.

There is one option - `pull request body` that is missing from this list. This action serves to rectify that issue!

## Why?

While Jira and Github are both fantastic tools in their own right, ticket numbers themselves are not. What is meant by that is `MYPROJ-123` tells one nothing about the contents of what is being worked on - it simply just states "there is a ticket" for this pull request.

> Yes yes, but why are we talking about this?

There is a finite, and rather small, amount of space to help others reviewing code to see what a pull request contains at a glance. Take the two following pr title examples:

- fix: fix for JIRA-123
- fix: bug in header component

If you're an engineer, you know that reviewing PRs take time, energy, and effort. Being able to decern quickly, and at a glance, what PRs you may be able to contribute to could end up saving you just enough time to be able to review one more PR (or go grab that coffee you've been dying for since this morning).

And that is the problem this action intends to solve.

Most `Pull Request Templates` have an area for `## Issue You are Working on Goes Here` - where a link to the ticket your working on would go. _This should be enough for Jira to link the PR to the issue_. This action uses that link to then push an empty commit back to the pull request with a commit message of the Jira ticket ID. Based on the [reference rules](https://support.atlassian.com/jira-software-cloud/docs/reference-issues-in-your-development-work/) this should be enough for any PR to be linked to Jira's automation flows.

Voila - PR titles, branches, and commit names can all go back to their normal descriptive selves.

Kick back - grab a coffee - and watch your issues automatically resolve themselves like magic!

## Contributing

### Code in Main

Install the dependencies

```bash
$ yarn install
```

Build the typescript and package it for distribution

```bash
$ yarn run build && yarn run package
```

Run the tests :heavy_check_mark:

```bash
$ yarn test

 PASS  ./index.test.js
  ✓ throws invalid number (3ms)
  ✓ wait 500 ms (504ms)
  ✓ test runs (95ms)

...
```

## Publish to a distribution branch

Actions are run from GitHub repos so we will checkin the packed dist folder.

Then run [ncc](https://github.com/zeit/ncc) and push the results:

```bash
$ npm run package
$ git add dist
$ git commit -a -m "prod dependencies"
$ git push origin releases/v1
```

Note: We recommend using the `--license` option for ncc, which will create a license file for all of the production node modules used in your project.

Your action is now published! :rocket:

See the [versioning documentation](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)

## Validate

You can now validate the action by referencing `./` in a workflow in this repo (see [test.yml](.github/workflows/test.yml))

```yaml
uses: ./
with:
  milliseconds: 1000
```

See the [actions tab](https://github.com/actions/typescript-action/actions) for runs of this action! :rocket:

## Usage:

After testing you can [create a v1 tag](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md) to reference the stable and latest V1 action
