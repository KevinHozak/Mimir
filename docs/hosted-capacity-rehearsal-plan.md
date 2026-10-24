# MIM-S010 bounded capacity rehearsal â€” approval proposal

Status: **the approved USD 0.15 bounded operational retry passed; financial readiness remains pending**. The [immutable-journal retry](evidence/hosted-capacity-journal-retry-2026-10-24.md) completed two clients for 120.039 seconds and exact cleanup by T+139.090. Conservative cumulative allocation is USD 0.146966358, including prior work and startup boost. Complete actual-quantity reconciliation, final attributable billing and a separate expansion decision remain open. Earlier USD 0.10 failures remain in their dated evidence.

## Existing evidence and residual questions

| Area | Verified evidence | Remaining boundary |
| --- | --- | --- |
| Auth | [MIM-S007 genuine-token matrix](evidence/hosted-auth-live-fixtures-2026-10-23.md): expired/wrong-project denial, positive controls, no private-data leakage and rollback | Recheck normal authorized access before any new run; do not recreate token fixtures for this capacity test |
| Session lifecycle | [MIM-S008](../issues/MIM-S008.md): automated expiry, refresh, rotation, EOF/disconnect and tab-close coverage | Genuine hosted Firebase refresh remains unverified; a two-minute steady run does not prove natural token expiry |
| Recovery | [MIM-S009 run 27](evidence/hosted-outage-cleanup-2026-10-23.md): cold replay, actual restart, exact rollback, writer/history/backup checks and direct final zeros by T+161.056 | Historical recovery evidence; fresh preflight still required. Do not repeat a fault for S010 |
| Capacity | [Attempt 10](evidence/hosted-capacity-journal-retry-2026-10-24.md): two live streams, per-client bytes, observed resource maxima, immutable measurements and timed cleanup | Paused-world limited staging only; no general capacity or expansion claim |
| Cost | Fresh rates/inventory and USD 0.146966358 conservative cumulative allocation in [attempt 10](evidence/hosted-capacity-journal-retry-2026-10-24.md) | Final attributable billing and complete per-component actual quantities remain pending. No free-tier or zero-cost assumption |

The current envelope incorporates the user-authorized collector repairs and cumulative ceiling increase. Historical no-mutation/no-load proposals do not override those later instructions; their outcomes remain in dated evidence.

## Approved envelope

- Same private paused pulse-64 world, pinned existing bridge and deployed observer. Exactly two authenticated, read-only SSE clients; no additional active observer during the window.
- The hosted harness opens at most two observer frames. Run for 120 seconds from client-run start; require at least 90 seconds with both streams established and nonempty data received by each. An absolute client deadline never exceeds T+165; baseline acquisition, sampling and cleanup together must finish by T+180.
- No VM stop/restart, IAM/allowlist change, provider call, simulation pulse or archive publication. Temporary same-image collector revisions, bounded traffic routing, exact restoration and owned-revision deletion are approved instrumentation. Permanent image/Hosting updates and audience expansion remain outside scope.
- Approved cumulative maximum **USD 0.15 conservative allocated cost** across attempts, covering bridge, VM, storage, network and logging, including fixed/background allocation where attribution cannot isolate traffic. Obtain fresh verified quantity bounds and rates before execution. Missing data or a bound above the ceiling means do not start. This estimate is not a cloud-enforced billing cap.
- Resource acceptance: complete whole-window maximum utilization at or below 80% for bridge CPU/memory and VM CPU/memory, and at most one serving bridge instance. These are conservative proposed review gates, not a scaling guarantee. Means alone cannot pass; guest memory not available means an explicit unresolved gate, not an invented value.
- Stop on any unexpected HTTP status, redirect, non-SSE response, early EOF, transport failure, missing process sample, existing observer, third stream/request, lost diagnostic confidence or operator cancellation. No retries that silently extend the window.

## Automated execution and evidence contract

`runCapacityChecks` in `scripts/observer-capacity.mjs` acquires a zero baseline, starts `runBoundedRehearsal`, polls direct per-process counts every five seconds, cancels on a lost/unsafe sample, waits for zero and collects final checks under the overall deadline. It accepts read-only `sampleProcesses(signal)` and `finalChecks(signal)` adapters; both must honor their abort signal. No mutation adapter exists. The hosted execution uses the separately prepared temporary collector, `observer-capacity-controller.py`, browser parent deadline and independent rollback watchdog. Direct expiring probes and a pre-established read-only VM sampler were preflighted before load. Failure to collect required evidence still blocks its gate.

- `sampleProcesses` must return every observed revision/process session with direct nonnegative integer `activeRequests` and `activeUpstreamStreams`, and `direct: true`. Continue accounting for a process after it reaches zero; its disappearance is not retirement proof. Bind logging queries to the run, calibrate cloud/local clock bounds and reject pagination/truncation or missing samples. Do not mistake delayed Cloud Logging records for current instantaneous counters. If timely direct evidence cannot be obtained, abort without declaring a capacity pass.
- `finalChecks` must return `{clockCalibrated, cleanup, metrics, recovery, measuredQuantities, billing}`. `measuredQuantities` contains one actual quantity per cost component in matching order/unit; omitted usage becomes unknown. `billing` may explicitly remain pending. Cleanup supplies actual `clients: 0`, independent VM `upstreamSockets: 0` and `ownedResourcesAbsent: true`; metrics supply complete maximum resource utilization, whole-window coverage and peak instance count. Recovery supplies integrity, paused pulse 64, one writer, unchanged history/configuration and healthy independent backups. Preserve the exact preflight history/configuration fingerprints privately. Use read-only VM attestation. Approved temporary instrumentation requires exact service restoration and owned-revision deletion, without VM lifecycle or writer changes.
- `cost` supplies USD budget, verified rate source and timestamp (within 24 hours), one or more `{scope, unit, quantityUpperBound, usdPerUnit, boundsVerified}` components covering all five scopes, and `windowStartedAt`. Quantities must conservatively bound the full window, not merely bytes read by these clients. After collection, add `measuredQuantity` in the same unit to every component; missing usage or usage beyond a bound fails cost reconciliation. Rates and units must match; record discounts/free-tier credit separately and do not assume eligibility.
- Raw credentials, response bodies, owner configuration, identity claims, billing account IDs and resource destinations stay out of diagnostics/public reports. Tokens remain in memory; errors use fixed categories. Private input/output artifacts belong beneath `.tmp/`.

The evaluator is independently runnable after collecting sanitized evidence:

```powershell
node scripts/observer-capacity.mjs .tmp/mim-s010/evidence.json .tmp/mim-s010/result.json
```

The output is an exclusive new file and contains only fixed gate labels, aggregate counts and cost totals. Exit 1 means rehearsal gates are not satisfied. This command evaluates records; it does not acquire cloud evidence or grant approval. The input schema is exercised by `scripts/observer-capacity.test.mjs`; its fixtures and prices are synthetic and must never be used as hosted measurements.

## Closeout and decision

1. By T+180: both clients closed, every observed process directly zero, VM upstream sockets zero, no owned resources, exact unchanged service/VM/history and healthy backups. If a deadline is missed, record failure and continue safe client cancellation; never relabel late cleanup as in-window acceptance.
2. Read-only delayed Monitoring/billing queries may follow without reopening observers or mutating anything. Preserve the tested 180-second interval; distinguish metric ingestion from measurement time. Do not extend the load window to await billing. Reconcile actual quantities against all supplied bounds and attributable whole-window billing against USD 0.15. Missing or partial billing stays pending, never zero.
3. Publish a redacted decision report: runtime gate result, resource peaks and sampling limitations, cleanup/recovery, conservative allocation versus actual billing, and unresolved genuine hosted refresh. `rehearsalPassed` and `decisionReady` are separate. Even when both pass, `expansionAuthorized` remains false; require a separate explicit decision before increasing audience or availability. The existing two-observer/three-minute staging ceiling remains in force.

**Approved scope:** one no-fault, two-live-client/120-second rehearsal, 180-second total cap and USD 0.15 cumulative ceiling, subject to fresh identity, backup, collection and pricing preflight. Prerequisite repairs cannot bypass these gates. Wider access and permanent configuration changes remain outside this approval.
