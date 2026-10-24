# MIM-S008 live-run approval packet — 2026-10-24

**Disposition: NOT READY FOR EXECUTION. No live run is requested or submitted.** The owner authorized local implementation, read-only readiness and this packet only. Access remains limited staging. See [prepared plan](hosted-token-refresh-verification-plan.md), [readiness evidence](evidence/hosted-refresh-preparation-2026-10-24.md) and [recorded decision](hosted-observer-readiness-decision.md).

## Proposed scope, once gates pass

Existing approved Mimir user, existing Google/Firebase project, same Hosting/bridge/private VM, one task-owned browser and one observer per trial. At most two observers total including unrelated existing sessions. No new identity, signer, grant, allowlist entry, deployment, VM stop, world advancement or provider call. Human engagement remains deferred.

Two separately labeled cases: (A) genuine naturally expired credential, actual fixed 401 denial and real forced SDK refresh/successful retry through the production transport; (B) genuine automatic SDK token-change and deployed UI rotation retaining Spark/Follow/presentation/zoom/history/event identity. A forced call cannot pass case B, and an isolated SDK harness cannot alone pass deployed UI acceptance.

## Timing and cleanup proposal

One bounded memory-only preparation per case, maximum 75 minutes without observer requests. No repeated aging loops. No trial begins unless its boundary fits the admitted window. Independent supervisor acknowledgement precedes the first protected request; navigation cannot rearm or extend the lease. Baseline by T+30, refresh/reconnect by T+90, clients closed by T+120, direct process/recovery evidence by T+160, all cleanup by T+180. Stop on any missed gate; no automatic retry or second case after failure.

Use `withRefreshBrowser` from `scripts/hosted-refresh-supervisor.mjs`, the harness from `packages/web/src/hosted-refresh-harness.ts`, and the isolated SDK adapter from `hosted-refresh-firebase.ts`. These are programmatic building blocks, not an approval-bypassing live CLI. The integration driver must bind the approved account/config, direct telemetry/recovery readers, deployed UI observation and evidence output, and demonstrate those bindings locally before a live command is proposed. Never evaluate test code or export credentials from the user's existing browser tab.

## Admission matrix

| Gate | Current result | Required before approval |
| --- | --- | --- |
| Local transport/deadline/privacy coverage | Eight harness and two supervisor tests pass; TypeScript passes | Full local verifier and reviewed exact driver integration |
| Exact deployed frontend | JS differs from current local output; CSS matches | Identify deployed source and prove required code or prepare a separately approved deployment |
| Bridge/VM metadata | Original revision/image, 100% traffic, private RUNNING VM | Fresh per-process baseline/closure counters plus state/history/integrity/single-writer/backup checks |
| Real SDK timing and identity | No real sign-in or aging performed | Approved existing identity, supported popup/domain and observation wiring; admit a genuine refresh boundary without clock/token tampering |
| Deployed UI acceptance | No supported diagnostic hook verified | Reviewed non-secret observation of real refresh and retained UI/event identity; no new hosted backdoor |
| Cumulative cost | USD 0.1469663581 retained, USD 0.0030336419 unreleased headroom | Reconcile metadata/static-read overhead and prior uncertainty; fresh priced all-in upper bound for preparation, both trials, telemetry, requests, network, baseline resources and cleanup, within USD 0.15 |
| Owner approval | Not granted for execution | Exact versions, approved schedule, evidence paths, complete cost receipt and bounded commands |

**USD 0.15 is cumulative and cannot be reset, shifted to another issue or increased by this packet.** Do not release unknown reservations, assume free-tier credits, or start a run that cannot prove fit. No export/API enablement or paid query job is authorized.

## Recovery and evidence

Discard only the isolated browser/SDK context, stop owned retry timers/workers, and use direct process counters to prove zero owned streams relative to the baseline. Preserve unrelated sessions and the user's current tab. Confirm exact configuration/traffic and unchanged paused history, integrity, one writer and healthy independent backups. Any missing cleanup proof remains failed, not inferred from browser closure. Reports contain fixed relative timings, status/count/boolean fields and non-secret versions; no JWTs, claims, headers, auth bodies, cookies, HARs, traces or private history payloads.

Next action is resolving the blocked admission gates and producing a reviewed integration driver; this document does not solicit blanket permission to work around them.
