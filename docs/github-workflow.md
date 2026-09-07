# GitHub development workflow

[Mimir Development](https://github.com/users/KevinHozak/projects/2) tracks implementation and bugs. Repository documentation remains the design reference, especially [World Theme](world-theme.md). Issues define bounded work and acceptance criteria; the project tracks its priority, area, and status.

## Daily work

Use the bug or implementation issue form. Link the relevant design reference and describe observable completion criteria. Move work through Backlog, Ready, In progress, In review, and Done. Only mark Done when acceptance criteria and relevant checks pass. Avoid treating every brainstorming proposal as committed work.

Use focused pull requests. The PR template records behavior, validation, and compatibility effects on saved histories, simulation versions, bundles, or hosting.

## Automated checks

The CI workflow runs on pull requests, pushes to main, and manual dispatch. It uses Node 22, installs locked dependencies, builds all four packages, and runs world-data, engine, server state, integration, structured restart, backup/restore, and browser tests. Test harnesses use isolated runtime paths and ports. CI does not deploy or advance the normal local world.

Actions are pinned to commit hashes. Dependabot checks npm and GitHub Actions weekly, grouping npm minor/patch updates and Actions updates. npm major updates remain separate for compatibility review. Dependency updates are not automatically merged.

## Repository settings

On September 7, 2026, Dependabot alerts and automated security fixes were enabled and verified. GitHub rejected branch rules for this private repository with a requirement to upgrade to Pro or make it public. Secret scanning was reported unavailable; CodeQL default setup was rejected as not enabled. The repository remains private and no paid plan was added.

Until branch rules are available, check the CI result before merging. If the account becomes eligible, require the `Build and test` check and prohibit force pushes to main. Do not require another reviewer for solo work. Recheck CodeQL and secret scanning/push protection availability before enabling them; this configuration does not claim they are active.
