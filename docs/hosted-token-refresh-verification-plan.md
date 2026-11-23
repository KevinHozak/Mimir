# Bounded hosted authentication qualification plan — polling

Updated 2026-11-15 for [MIM-S008](../issues/MIM-S008.md) and [MIM-S021](../issues/MIM-S021.md). **Plan only. No live execution is authorized.** The pilot is stopped; its deadline and budgets are not renewed. See the [closeout matrix](s021-s008-closeout-matrix-2026-11-15.md).

## Selected transport and evidence boundary

The selected hosted read-only path in `packages/web/src/main.tsx` uses `startObserverPolling` with a 240,000 ms interval. `observer-polling.ts` serializes refresh batches, schedules the next interval after completion, pauses hidden tabs and aborts owned work on stop. One `loadLive` batch contains eight parallel GETs; serial batches do not mean a single HTTP request. The polling branch does not subscribe to token-change stream rotation. `createObserverFetch` in `observer-session.ts` obtains an SDK credential for each request and retries a GET/HEAD once after 401 using forced refresh; concurrent outstanding refreshes share a promise, not necessarily one refresh for an entire batch.

Therefore automatic-refresh acceptance means a genuine SDK credential change followed by its use on the next eligible scheduled poll, with retained UI context. It does not require stream rotation or an immediate extra read. `/api/live` requests must remain zero. Historical stream tests remain evidence for the retained non-polling path, not polling-hosted acceptance.

Existing [local polling evidence](evidence/observer-polling-local-2026-11-14.md) establishes synthetic cadence, visibility, abort, failure and selection behavior. It does not prove real Firebase refresh. Source inspection for this plan is not a new test run or deployed parity check.

## Admission before any future live trial

- Obtain explicit authorization for an exact bounded run, deployed versions, existing identity, audience, endpoint, preparation time, active time, cleanup and all-in costs. No approval is requested by this document. No pilot restart or ingress reopening is implied.
- Resolve exact frontend/bridge parity and a supported non-secret deployed-SDK observation method. Do not inject an auth backdoor, export credentials from the user's tab or silently deploy missing instrumentation.
- Keep original allocations, unknown holds and expired leases intact. S008 historically retains USD 0.1469663581 against its USD 0.15 cumulative ceiling, leaving USD 0.0030336419 unreleased headroom. S021 accounting is separate and does not fund this trial automatically. Neither allowance is renewed. Fresh attributable costs and a defensible all-in bound are required; stop if the proposed trial cannot fit.
- Price preparation refresh traffic, complete eight-read batches and retry bounds, telemetry, idle resources, network bytes, baseline reads and cleanup. Do not assume credits/free tier. Do not enable billing exports/APIs or paid queries.
- Establish direct process-aware request/stream counts, task ownership, recovery hashes, unchanged world identity and baseline service configuration. Require the writer stopped/paused and AI disabled with no simulation advances. Retain independent backup evidence. If this needs infrastructure changes, that is a separate authorization gate.
- One task-owned observer, at most two observers including existing sessions. No automatic retry or second trial after a failed gate. Preserve unrelated sessions.

## Credential preparation

Use an isolated browser context, existing approved identity and memory-only SDK persistence. Supported SDK operations only: no forged token, altered expiry/clock, intercepted auth response or revocation. Any genuine token retained to age stays only in memory. No observer data requests during preparation. Proposed preparation maximum remains 75 minutes, with an independent absolute watchdog and no aging loops; actual timing and costs require approval.

Do not record JWTs, claims, authorization headers, cookies, auth bodies, HARs or credential-bearing traces/video. Record only relative expiry timing, token-changed/credential-used booleans, status/count fields and non-secret source identifiers. A supported driver must correlate token use in memory without serializing token values.

## Separately reported cases

### A. Genuine expired credential and forced retry

Age a genuine initially valid credential beyond its actual expiry and verified clock allowance. Through the production read-only fetch transport and real SDK adapter, send it for one protected read. Require actual 401 with no private response, exactly one forced-refresh retry for that request and successful authorized response. Never synthesize the 401. Record this as isolated transport/SDK proof, not deployed automatic UI acceptance. No SSE connection is needed.

### B. Genuine automatic refresh and scheduled polling continuity

Observe a genuine automatic SDK token change through a supported isolated deployed-UI observation method. On the next eligible scheduled poll, verify use of the current credential and successful reads. Preserve Spark selection, Follow, presentation, zoom, selected timeline/history pulse and committed event identity; live pulse may advance only if the separately approved world configuration permits it. Do not force a pulse, reload to accelerate refresh, bypass the interval or call `getIdToken(true)` to pass automatic acceptance. A request-triggered ordinary SDK refresh must be labeled separately from an observed automatic token-change case.

Require one initial batch and one later eligible batch, no overlapping batches, no legacy 15-second refresh and zero `/api/live` calls. Count parallel requests and all refresh/retry attempts. A refresh event alone, or success without supported credential-use correlation, is inconclusive.

### C. Return, visibility and cleanup

Verify selected Spark/Follow/presentation deep-link return to the same world, with history/live state distinguished. Only claim zoom or other state across full reload if implementation actually persists it; same-tab continuity and reload persistence are separate results. Hide/show must not bypass cadence or create overlapping batches. Network/auth failure must retain committed data, show failure and avoid retry storms. Close owned clients and prove active task requests drain, zero owned streams and stopped timers/subscriptions. A local repeat can cover these synthetic cases; real deployed auth/return remains separate.

## Timing proposal — supersedes the historical stream window

The October plan's 120-second observation / 180-second overall trial cannot contain a four-minute scheduled polling interval. Do not speed up production polling to fit that window. For case A, the old 180-second overall limit may be retained if independently admitted. For combined polling cases B/C, propose a separately approved maximum **480 seconds overall**, including at most **360 seconds active observation** and **120 seconds cleanup**. Start the absolute lease before the first protected request; baseline by T+30, later poll/required refresh evidence by T+330, close clients by T+360 and finish direct cleanup evidence by T+480. Preparation is separately capped and costed. These are proposed bounds, not granted extensions.

Real response duration and SDK timing must fit the window. If a genuine boundary is unavailable or a batch cannot finish in time, stop as blocked/inconclusive; do not extend, rearm, manufacture refresh or start another aging loop. Independent supervisor death/navigation handling must not reset the absolute cutoff.

## Local tooling work still required

The historical `hosted-refresh-harness.ts` automatic case explicitly opens and refreshes a stream. It cannot pass polling acceptance unchanged. A separate `hosted-polling-refresh-harness.ts` exercises the production polling controller and authenticated-read transport locally with synthetic credentials, an injected request adapter and no default network fetch. It runs the eight-read polling shape at the unchanged four-minute interval, records only bounded non-secret counters and fails closed on transport/privacy/setup errors. Its virtual-clock tests do not establish real SDK behavior or deployed UI continuity. See [local evidence](evidence/polling-refresh-harness-local-2026-11-15.md).

A separate synthetic-only polling supervisor and watchdog support an observer deadline of up to 480 seconds without changing the historical live supervisor's 120-second cap. Its browser context is offline, blocks service workers and aborts routed requests; this is not an OS-level network sandbox for arbitrary driver code. It is not wired to a live driver or an authorization to run one. A future polling driver still needs reviewed production-fetch bindings, supported deployed-UI observation, batch/credential correlation, request accounting and direct process cleanup readers. Locally demonstrate missed boundaries, denial, stalled requests, driver death, hidden tabs, cutoff and redaction with synthetic tokens and network access forbidden before proposing live execution. Deployed-UI bindings, genuine credential correlation and direct process telemetry remain unimplemented. No live timing or cost gate is changed.

The synthetic supervisor launches its watchdog detached from the driver. Local process tests exercise actual driver termination and confirm an observer lease cannot extend the preparation deadline. These tests use a disposable stand-in process, not hosted process telemetry; they do not establish deployed cleanup or qualify the historical live supervisor.

## Completion and recovery

- [ ] Genuine expiry/401, real forced refresh and successful protected retry, separately labeled.
- [ ] Genuine automatic SDK change and current credential used by the next scheduled deployed polling batch.
- [ ] Retained same-world selection/return context, with precise persistence boundaries.
- [ ] Zero SSE, bounded batches/requests, no cadence bypass or retry storm; direct cleanup within the admitted lease.
- [ ] Unchanged world/history/ledger, no provider calls, mutations or simulation advances; recovery and service configuration preserved.
- [ ] Final conservative attributable cost and uncertainty recorded within explicitly authorized cumulative bounds.

Rollback closes only owned clients/workers and discards isolated credentials; it never deletes/reset databases or unrelated sessions. Missing direct cleanup proof is a failure, not inferred from browser closure. Unexpected state/configuration change stops the trial and needs a scoped recovery decision.

The [October approval packet](hosted-token-refresh-approval-packet.md) and [October readiness evidence](evidence/hosted-refresh-preparation-2026-10-24.md) are historical. Their stream bindings, pulse-64 baseline, running-VM assumptions and timings are not current admission. Both genuine acceptance boxes remain open until new redacted evidence satisfies this plan under a separately authorized configuration.
