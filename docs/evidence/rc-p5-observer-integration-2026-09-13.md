# RC-P5 observer integration evidence

Date: 2026-09-13
Scope: isolated issue-172 worktree, `codex/issue-172-rc-p5`
Runtime: First Glow schema 3 / structured-v2

## Delivered boundary

The server now exposes `/api/reflection`, a projection of persisted Reflection capacity and scheduler state. It reports First Glow baseline RC 1, explicit Hero assignments and capacities, current-day global usage/remaining allowance, each Spark's usage/remaining allowance and next cadence window, current intention summary, and recent committed reflection decisions. Provider runtime status is included only as bounded operator metadata; `clientCredentialsExposed` is explicitly false.

The web observer renders this projection in a responsive Reflection cadence panel. Private reflection-memory summaries, prompt material, access tokens, and hidden provider reasoning are not returned.

## Verification

- `npm run build` passed for all four workspaces.
- `npm test` passed for the world-data and engine suites.
- `node packages/engine/dist/first-glow-observer.test.js` passed.
- `npm run test:ai-runtime --workspace @mimir/server` passed.
- `npm run test:first-glow-restart --workspace @mimir/server` reached application assertions but failed restart equivalence at the existing checkpoint comparison (`2 !== 1`); this is recorded as unresolved rather than presented as a pass.
- `npm run test:backup-restore --workspace @mimir/server` was blocked before application assertions by Windows child-process `spawn EPERM` in the restricted runner.

## Limitations

This evidence covers the implementation and local build/test boundary. It does not authorize Vertex calls, public exposure, deployment, or merge. Full desktop/mobile browser evidence and clean restart/restore evidence require an environment where the existing server child-process and browser runners are permitted.
