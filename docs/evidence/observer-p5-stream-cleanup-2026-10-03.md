# Observer-P5 stream cleanup — October 3, 2026

Issue [#270](https://github.com/KevinHozak/Mimir/issues/270) remains incomplete for hosted acceptance. Focused instrumentation and regression coverage are prepared for review. No deployment, cloud permission change, public telemetry endpoint, logging service, new writer, or hosted test traffic was introduced.

The above describes the initial preparation. The user subsequently explicitly authorized PR delivery, deployment, and the single-client verification. The initial authorized rollout and its failed cleanup observation are recorded below; they supersede the preparation-only disposition without erasing the failure.

## Existing evidence and access

The checkout began clean at freshly fetched `origin/main` commit `5f53981069b9dc650cf12b1a3b026aa9f9c9cba0`; issue branch `codex/270-stream-lifecycle` has that base. Prerequisite #254 is closed as completed. The existing [deployment evidence](hosted-p18-p4-deployment-2026-10-03.md) records revision `mimir-observer-bridge-00004-qff`, browser streams, request completions, and container counts; it explicitly lacks active-stream baseline and server cleanup verification. Those dated values are not new measurements.

A read-only Cloud Logging query for the bridge's existing revision logs, limited to the preceding day, returned `PERMISSION_DENIED` for all log views. No IAM change was attempted. This establishes a telemetry access gap, not absence of logs or zero active streams. Existing source inspection found no bridge active-stream counters and a timeout cleared immediately after starting the non-awaited body pipeline.

## Prepared local implementation

The body pipeline is now awaited, preserving the configured timeout through the entire stream lifetime and removing request/response listeners on settlement. In-process diagnostics distinguish authenticated live GET handlers from successful upstream SSE bodies. An optional telemetry callback receives fixed lifecycle fields. Standalone production logging is disabled unless `OBSERVER_STREAM_TELEMETRY=1` is selected; it uses existing stdout with process-session/revision scope, UTC baseline/samples, open/close records, and total handler duration. It does not report the authoritative VM's resource count.

Local regression scenarios cover two concurrent approved synthetic clients and independent closure, rejected identity, timeout after headers, client closure while upstream headers are pending, natural completion, upstream status rejection, abrupt upstream failure, and HEAD exclusion. Assertions require bridge gauges and the actual fixture upstream response/socket count to return to zero within two seconds. This bounded deadline is a regression limit, not a hosted cleanup measurement. Records are checked for credential/identity/URL leakage. Existing authentication and SSE tests are also required.

## Local validation

`npm ci --no-audit --no-fund` installed locked dependencies without manifest/lock changes. `npm run test:observer-bridge-lifecycle`, `npm run test:observer-bridge-sse`, and `npm run test:observer-bridge-auth` passed on Node 24.14.0. The initial ordinary-shell lifecycle/SSE runs failed with loopback `EACCES`; the approved execution with loopback access passed. This is an environment limitation, not an application assertion failure. `git diff --check` passed. No simulation suites were required for this bridge-only lifecycle change.

## Remaining hosted acceptance

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

An HTTP/2 follow-up adds optional h2c support and a synthetic regression proving HTTP/2 cancellation releases the private upstream. Its hosted rollout and repeat measurement remain pending at this entry.
