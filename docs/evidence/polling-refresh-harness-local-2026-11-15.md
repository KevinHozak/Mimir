# Polling refresh harness — local synthetic qualification, 2026-11-15

## Result and scope

A separate polling harness now reuses the production `createObserverFetch` transport and `startObserverPolling` controller with synthetic credentials and injected responses. The selected interval stays 240,000 ms; tests advance a virtual monotonic clock rather than shortening production cadence. It exercises two serial eight-read batches, with parallel GETs inside each batch, and one separate expired-credential forced-retry case. It opens no stream. No real SDK credentials, hosted endpoint, cloud resources, pilot database or provider are used by the new suite; native fetch is replaced by a rejecting stub.

Automatic observation requires a changed credential used after a notification, two successful batches, no forced refresh, drained local requests and completed credential disposal. Notifications alone, unnotified credential changes and pending/failed disposal cannot pass. This is synthetic transport correlation, not genuine SDK or deployed-UI proof.

The harness requires explicit synthetic mode and an injected request function. Only fixed GET fixture paths on `https://synthetic-observer.invalid` are admitted; redirects are rejected. At most seventeen request dispatches cover two normal batches plus a possible forced retry. Forced mode runs one read and at most one retry, then closes. Errors close rather than creating a retry storm. The original stream harness remains available separately, with its original admission gates.

## Validation

- Web TypeScript typecheck passed after correcting the timer-adapter type boundary.
- `npm run test:hosted-refresh-harness --workspace @mimir/web` passed: eight historical harness tests (including synthetic Chromium stream navigation/cleanup) and the then-current twelve polling tests. After adding teardown-failure coverage, the final polling suite passed all thirteen tests via `npx tsx packages/web/src/hosted-polling-refresh-harness.test.ts`; typecheck passed again.
- New polling tests cover scheduled credential use, forced retry, missed/incorrect credential boundaries, hidden/show cadence, stalled preparation/token acquisition/request/denial body, fixed privacy failures, second denial, setup/teardown failure, idempotent cleanup and pending/failed disposal.
- Eight verifier regression tests passed, including discovery of the new polling suite through the package script. Production observer transport browser and polling-controller regressions passed separately.
- The first combined attempt encountered a restricted-environment Chromium launch failure and was interrupted; the same suites passed with local process permissions. A separate transport test initially ran from the repository root and could not serve its source module; rerunning from the required web-package working directory passed. The initial typecheck timer mismatch was corrected before the passing run. These initial failures are not reported as passing assertions.

The new suite is wired into both `test:hosted-refresh-harness` and `test:hosted-auth-boundary`, so the full local verifier will run it. These targeted results are separate from the full exact-source publication verifier; its result belongs to the specific source/PR verification receipt. The earlier 115-step documentation result does not cover this new source. Exact-source verification is required before publication.

## Remaining limits

Reports contain only bounded status/count/boolean/timing fields, never credential values, successful private payloads or arbitrary exception text. `hostedUiVerified`, `genuineFirebaseVerified` and `directProcessCleanupVerified` remain false. Local abort/settlement counters do not establish remote process cleanup. Virtual-clock tests do not prove wall-clock browser scheduling or page navigation for the new polling harness; historical browser tests qualify their own transport only.

The new harness is not imported by the shipped observer, has no live CLI/admission mode and imports no Firebase runtime. A deployed-UI driver, supported genuine credential-use correlation, direct process telemetry and a polling-compatible independent browser supervisor remain future work. The existing supervisor retains its 120-second cap; this change does not extend it to the proposed polling trial window.

S021/S008 remain open under the [closeout matrix](../s021-s008-closeout-matrix-2026-11-15.md) and [polling plan](../hosted-token-refresh-verification-plan.md). No live qualification, human acceptance or comparative model benefit is claimed. The expired pilot stays stopped. No deployment, restart, additional spending, allocation renewal or reserve release occurred.
