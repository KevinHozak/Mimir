# Observer-P5 stream cleanup — October 3, 2026

Issue [#270](https://github.com/KevinHozak/Mimir/issues/270) has a successful bounded single-client cleanup observation after the authorized bridge and Hosting deployments. The initial failed transport is retained below. This is process-scoped evidence, not audience capacity or an atomic fleet gauge.

The above describes the initial preparation. The user subsequently explicitly authorized PR delivery, deployment, and the single-client verification. The initial authorized rollout and its failed cleanup observation are recorded below; they supersede the preparation-only disposition without erasing the failure.

## Existing evidence and access

The checkout began clean at freshly fetched `origin/main` commit `5f53981069b9dc650cf12b1a3b026aa9f9c9cba0`; issue branch `codex/270-stream-lifecycle` has that base. Prerequisite #254 is closed as completed. The existing [deployment evidence](hosted-p18-p4-deployment-2026-10-03.md) records revision `mimir-observer-bridge-00004-qff`, browser streams, request completions, and container counts; it explicitly lacks active-stream baseline and server cleanup verification. Those dated values are not new measurements.

A read-only Cloud Logging query for the bridge's existing revision logs, limited to the preceding day, returned `PERMISSION_DENIED` for all log views. No IAM change was attempted. This establishes a telemetry access gap, not absence of logs or zero active streams. Existing source inspection found no bridge active-stream counters and a timeout cleared immediately after starting the non-awaited body pipeline.

## Prepared local implementation

The body pipeline is now awaited, preserving the configured timeout through the entire stream lifetime and removing request/response listeners on settlement. In-process diagnostics distinguish authenticated live GET handlers from successful upstream SSE bodies. An optional telemetry callback receives fixed lifecycle fields. Standalone production logging is disabled unless `OBSERVER_STREAM_TELEMETRY=1` is selected; it uses existing stdout with process-session/revision scope, UTC baseline/samples, open/close records, and total handler duration. It does not report the authoritative VM's resource count.

Local regression scenarios cover two concurrent approved synthetic clients and independent closure, rejected identity, timeout after headers, client closure while upstream headers are pending, natural completion, upstream status rejection, abrupt upstream failure, and HEAD exclusion. Assertions require bridge gauges and the actual fixture upstream response/socket count to return to zero within two seconds. This bounded deadline is a regression limit, not a hosted cleanup measurement. Records are checked for credential/identity/URL leakage. Existing authentication and SSE tests are also required.

## Local validation

`npm ci --no-audit --no-fund` installed locked dependencies without manifest/lock changes. `npm run test:observer-bridge-lifecycle`, `npm run test:observer-bridge-sse`, and `npm run test:observer-bridge-auth` passed on Node 24.14.0. The initial ordinary-shell lifecycle/SSE runs failed with loopback `EACCES`; the approved execution with loopback access passed. This is an environment limitation, not an application assertion failure. `git diff --check` passed. No simulation suites were required for this bridge-only lifecycle change.

## Initial preparation gaps (superseded by authorized observations below)

- Fresh timestamped hosted baseline, all serving revision/process coverage, and active stream counts are unknown.
- One approved hosted client's connect/close and baseline recovery have not been observed in this task; VM-side release timing remains unknown.
- Log visibility and any instrumentation rollout require separate authorization; this issue does not authorize deployment or permission changes.
- Request completions, container counts, and browser tab closure cannot substitute for active-stream or VM cleanup observations. Process loss and absent records prevent summing local gauges into a reliable fleet baseline without coverage checks.

#272 rehearsal and #257 disposition retain their separate gates. Authentication allowlists, read-only routes, bearer privacy, and the single authoritative SQLite writer are preserved.

## Authorized initial rollout and failed cleanup

PR [#281](https://github.com/KevinHozak/Mimir/pull/281) merged at `16d81cf62b88dc293d475a5cd4616fb48e53376e` after successful CI run `37171618139`. Cloud Build `76ded4d1-a04a-4a1e-9ca3-5e395c579844` built the minimal nine-file tracked-input context from head `634832660178fdfbc9a9e5cfa4e49179d7416863`, producing image digest `sha256:96f7770b3e917d07c9764d4914c023b5d88acb584569621c03eda904be0d6e6b`. The Dockerfile also gained its required authentication module. The source head is recorded explicitly; a concurrent lockfile update reached main separately, so this is not an exact-current-main image claim.

The existing authorized operator could read logs; no IAM change was needed. At 02:37:23 UTC, a preceding-day bounded sample returned 100 records (78 HTTP records), no structured stream records, from revision `00004-qff`. The sample limit is not an exhaustive log inventory. Revision `mimir-observer-bridge-p5-634832` was created without traffic and then assigned 100% after CI/merge. Its image was verified; existing authentication/upstream environment, service account, concurrency, timeout, networking, scaling, CPU, and memory settings were preserved. Only image and opt-in telemetry changed. The previous exact revision remains the rollback target. Hosted boundary reads returned 401 for unauthenticated `/api/live` and 404 for GET `/api/owner/pulse`.

UTC measurement window is October 4; local calendar date is October 3, CDT. Startup baseline at `02:45:20.989228Z` and samples at `02:45:50.990863Z` and `02:46:20.991899Z` showed zero live handlers and zero upstream streams. One temporary approved browser client rendered pulse 0, 12 Sparks, and 7 sites. Its live handler opened at `02:46:41.483649Z`, upstream SSE at `02:46:41.541963Z`, with counts 1/1. The browser tab closed during `02:47:29.265Z–02:47:29.318Z`, about 48 seconds later.

Closure did **not** return the bridge to baseline: additional live handlers opened after closure, and the `02:50:50.995578Z` sample showed 15/15 with no close records. That query covered one observed Cloud Run instance and one process session. Additional traffic origin is unconfirmed; browser request capture was truncated and cannot identify every client/retry. The agent's temporary observer tab was verified absent afterward. An operator question asked whether other approved observers were active; no attribution is inferred from silence.

The trusted existing PuTTY/IAP VM path reported the service active, one Node process, and zero established port-8888 TCP connections at `02:41:57Z`. A 250-ms nominal sampling window around the client showed nine connections during observation; six remained at `02:48:42Z`. TCP counts include ordinary HTTP keep-alive sockets and are not SSE counters. There was no observed VM return to zero in that window. No VM restart, scheduler change, database write, or new key was performed.

This is a hosted cleanup failure, not acceptance evidence. [Cloud Run explicitly states that HTTP/1.1 client disconnect events are not propagated to containers](https://docs.cloud.google.com/run/docs/troubleshooting#client-disconnect-does-not-propagate-to-cloud-run), and recommends HTTP/2 or WebSockets. The bridge was using HTTP/1.1. [Firebase Hosting also limits rewritten requests to 60 seconds](https://firebase.google.com/docs/hosting/cloud-run). These facts explain why local direct-socket cancellation tests do not establish hosted cancellation; attribution of additional openings remains unverified.

## Authorized HTTP/2 and direct API delivery

PR [#282](https://github.com/KevinHozak/Mimir/pull/282) merged at `051550b090e2e4cb486059181d790cd6f1ad7aab` after successful CI `37172475178`. Cloud Build `55b4caf2-aa79-4362-aa24-7b5cf7c0cc77` produced digest `sha256:9b50923271ad57435d45ccbcab850b7d1bcb250519a3a3636209c94e19124d2a` from head `596163445ff7abd98d257e74c1b774d0b52133b1`. Serving revision `mimir-observer-bridge-p5-h2b-596163` received 100% traffic at `03:03:28.523Z`, with verified `OBSERVER_HTTP2=1`, `OBSERVER_STREAM_TELEMETRY=1`, and h2c container protocol. A preceding no-traffic revision with incorrectly combined environment values was detected by readback and never served traffic. Existing authentication, upstream, identity, limits, and single-writer settings were preserved.

HTTP/2 behind the Hosting rewrite still failed prompt cleanup: the tab closed at `03:05:58.028Z–03:05:58.049Z`, and retained handlers eventually drained through their deadlines. This did not pass acceptance. Hosting was then built from clean exact main `051550b` with the existing authenticated bridge URL as `VITE_API_URL`. Hosting version `075c16f2594c0bd4` passed exact live-index and both asset-byte checks (`index-DQv4i-Sc.js`, `index-BUYIgogU.css`). Existing CORS preflight returned 204 for the Hosting origin; unauthenticated live reads remain 401 and owner reads 404. No IAM or origin allowlist widening occurred.

An ordinary navigation initially reused the previous cached bundle and still requested the Hosting rewrite. That attempt was discarded as direct-route evidence. Fresh navigation loaded the new script and confirmed direct bridge API requests. Previously cached clients need a fresh navigation or hard reload; old rewrite tails may persist until their bounded deadline. The deployment script now defaults to this exact existing direct bridge and rejects same-origin, empty, or unrelated API overrides before building/deploying.

## Clean final single-client observation

All following timestamps are October 4 UTC (October 3 CDT). Serving revision is `mimir-observer-bridge-p5-h2b-596163`. Logs observed two process sessions: `1d59047d-67ac-4472-babf-03303a91b634` had startup zero counts and no observed opens; `c5cf4d83-f4e1-48bf-b569-d27437962816` handled the tests. The latter's repeated samples from `03:30:14.965827Z` through `03:36:14.975693Z` showed 0 handlers / 0 streams after earlier tails drained. Idle-process samples can stop with CPU inactivity, so this coverage does not establish an atomic all-instance total or classify an absent process as zero.

One approved fresh browser tab loaded `index-DQv4i-Sc.js`, rendered pulse 0 / 12 Sparks / 7 sites, and made API requests directly to the bridge. Its authenticated live handler opened at `03:36:27.165771Z`, SSE body at `03:36:27.171598Z`, raising counts from 0/0 to 1/1. The tab closed during `03:37:13.423Z–03:37:13.535Z`. At `03:37:24.724496Z`, `request-close` with reason `client-close` returned both gauges to 0. Observed closure lag is 11.189496 seconds from close completion (11.301496 seconds from close start); total handler duration was 57,558 ms. This is cancellation, not five-minute deadline expiry. No other live opens were observed in this clean window.

The earlier direct-route test also recorded `client-close` at `03:24:16.823906Z`, approximately 11.2 seconds after tab closure, but overlapped old rewrite tails and is not the clean baseline test. VM established port-8888 connections were zero at `03:28:02.666Z` through `03:28:03.440Z`. Final read-only VM sampling distinguishes all established TCP sockets, including ordinary HTTP keep-alives, from the bridge's SSE body gauge. Its final release result is recorded below.

Final VM sampling ran `03:36:11.865Z–03:38:45.820Z` at approximately 257-ms intervals. Initial TCP count was zero; it rose to six at `03:36:27.279Z` (SSE plus ordinary API sockets), was five after the bridge's close, and returned to zero at `03:38:22.192Z`, remaining zero through the window's end. Complete TCP baseline recovery was observed 68.657 seconds after tab close completion. TCP totals do not identify individual sockets as SSE; the bridge body gauge and actual upstream-cancellation regression provide that distinction. The VM remained the existing service/writer; no reset or runtime mutation was issued.

Lifecycle, auth, SSE, and HTTP/2 regression tests passed locally and in both merged PR CI runs. The HTTP/2 fixture asserts actual upstream cancellation. Deployment-origin tests cover default/approved origin and override precedence/rejection. Raw cloud logs, identities, tokens, and SSH metadata remain private ignored artifacts. #272's audience rehearsal and #257's readiness disposition retain separate gates; this observation does not complete them.
