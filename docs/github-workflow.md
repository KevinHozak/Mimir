# GitHub development workflow

The [local issue backlog](../issues/) tracks unfinished implementation, bugs, and acceptance criteria. Repository documentation remains the design reference, especially [World Theme](world-theme.md). Create local issues through the shared issue runner; publish an issue to GitHub only when explicitly requested.

## Daily work

Describe observable acceptance criteria and relevant design references in each local issue. Work with more than three major phases uses an epic with child stories. Mark work complete only when acceptance and relevant checks pass; brainstorming remains a proposal until selected.

Use focused pull requests for changes to main. The PR description records behavior, local validation, and compatibility effects on saved histories, simulation versions, bundles, or hosting.

## Local automated checks

Run `npm run verify:local` before creating or updating every PR, using Node 22 or newer and the locked npm dependencies. Install Playwright Chromium before the first run. The command builds all four packages and runs the engine, server, security, persistence, importer, launcher, and browser regressions. It stops on failure and records exit codes and source identities under `.tmp/verification/`; source changes invalidate the run. See [README](../README.md#verify-locally-before-a-pull-request) for setup and preview configuration.

GitHub Actions does not run the test suite. The automatic CI workflow is removed and its former required status rule is disabled. Local checks use isolated databases and ports, do not deploy, and do not call paid providers. Include the successful run and tested source in the PR validation notes; failed or blocked verification stops publication.

Dependabot checks npm dependencies weekly. Dependency updates are reviewed and verified locally before merge; they are not automatically merged.

## Repository settings

The current main rules require a pull request and block branch deletion and non-fast-forward pushes. No CI status check is required under the local-only policy. Do not bypass these rules or force-push main.

Dependabot alerts and automated security fixes were enabled in the September 7, 2026 review. That dated review reported secret scanning and CodeQL unavailable; this guide does not claim they are active now. Avoid printing authenticated account/configuration output, and never commit credentials or runtime databases.
