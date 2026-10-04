# Observer-P5 stream cleanup — October 3, 2026

Issue [#270](https://github.com/KevinHozak/Mimir/issues/270) remains incomplete for hosted acceptance. Focused instrumentation and regression coverage are prepared for review. No deployment, cloud permission change, public telemetry endpoint, logging service, new writer, or hosted test traffic was introduced.

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
