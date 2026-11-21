---
depends_on: ["MIM-S019","MIM-S020"]
id: "MIM-S021"
parent: ["MIM-E003"]
priority: "high"
schema_version: 1
status: "closed"
title: "Close out the bounded online AI pilot"
type: "enhancement"
---
## Outcome

Complete and document the bounded owner-only online AI pilot, its recorded outcomes, recovery evidence, cost accounting and explicit limitations. Closure records the completed pilot and its disposition; it does not establish hosted production readiness.

## Acceptance

- [x] Record the authorized scope, original AI and hosting limits, exact deployed assets and bounded operating decisions.
- [x] Record observed single-writer continuity, real AI goals and receipts, and the pilot's stopped final state.
- [x] Preserve and document the recovered pulse-293 history, bundles and ledger, distinguishing local recovery from the interrupted final offsite backup.
- [x] Record available billing evidence, conservative accounting and unresolved attribution without releasing holds or treating estimates as final charges.
- [x] Assign unfinished genuine hosted authentication, operating/recovery qualification and billing to explicit follow-up issues.

## Bounded pilot closeout — 2026-11-21

The owner chose to close this issue as a bounded pilot while keeping the pilot stopped. The writer stopped at pulse 293 before its deadline. The last completed offsite archive was pulse 290: the final offsite backup was interrupted during shutdown. The recovered pulse-293 world, all 294 checkpoints, bundles and AI ledger were independently archived and restored locally; the shutdown repair has local qualification, not live cloud or systemd qualification. The pilot demonstrated real AI goal selections and recorded outcomes; [S022](MIM-S022.md) contains the offline evaluation. No comparative model benefit or broader hosted readiness is claimed.

The original USD 5 AI and USD 2 hosting allocations are not renewed. Preserve the two USD 0.50 uncertain-request holds and conservative AI and hosting/recovery accounting described below. Genuine Firebase expiry/refresh and return behavior remain in [S008](MIM-S008.md); hosted operations, shutdown and recovery qualification move to [S024](MIM-S024.md); final billing, attribution and retained-storage disposition move to [S025](MIM-S025.md). Future deployment, restart, spending or resource changes require separate authorization.

The dated entries below are historical observations and do not describe the pilot as currently running.


## S020 handoff — 2026-11-13

S020 is complete locally. The selected fresh frontier bundle is sha256-1ee5c0af5f365d8dee6aaef585dcc986d4286074c84f24a88ec4e77fcb0a079e; its separate offline launcher starts paused with 12 Sparks and AI disabled. Event-RC study histories and default offline cadence were verified separately. Source/resource bounds, new goal-wire projection, project witnesses, restart and bundle-inclusive restoration are qualified locally.

Retain the measured access/recovery pressure in sustained qualification: 375/363 deficit Spark-pulses and peak deficit 35 across the declared six-Spark histories. These are not long-duration balance acceptance. New frontier choices have synthetic adapter coverage, not a new paid/live-model run. The original allocation was not renewed or changed. Existing S008, audience, auth, cadence/continuation, operating allocation, stop and off-host recovery gates remain. [Final local evidence](../docs/evidence/first-glow-frontier-2026-11-13.md).


## S021 implementation progress — 2026-11-13

Portable metadata broker, fixed online lease, exclusive writer coordination, durable pause, original-allocation handoff and paired world/bundles/AI-ledger recovery are implemented locally. Authenticated goal/history/status reads and Spark return-context persistence are covered by targeted checks. The expanded-map backup assertion was corrected to require the frontier plus both archived fixture bundles. The initial full verifier stopped on that assertion; a fresh exact-source run is still required before publication.

The owner selected **$2 additional hosting for a 24-hour pilot**. This earlier preparation-only selection was superseded by the owner authorization recorded below. No allocation was renewed, real model request made or live service changed. The existing archived hosted world remains paused at pulse 64. Genuine hosted auth, exact deployed assets, off-host paired restore, observer/scaling limits within the hosting ceiling and operational shutdown remain activation gates. See [online preparation](../docs/spark-ai-online.md).


## Original allocation continuation — 2026-11-13

The owner superseded preparation-only mode and authorized recorded costs plus a reasonable buffer, continuation within the original USD 5 AI budget, and USD 2 hosting for a 24-hour owner-only pilot. The implemented accounting uses 2x recorded token estimates plus USD 0.10 reserve; unknown/in-flight costs retain USD 0.50 holds. Original ledger adoption retained ten receipts and the USD 5 cap: USD 0.008844 recorded estimate, USD 0.117688 guarded, USD 4.882312 headroom; still stopped until its single-writer handoff. Focused accounting/runtime checks passed (16 tests). Hosting usage/deadline watchdog tests passed. Publication, genuine hosted auth and current paired off-host recovery remain pending.


## Bounded-memory and rollback verification

The recorded-cost policy is applied to the stopped original ledger without new provider calls. The independently restored pulse-64 off-host backup remains intact; new streamed recovery hashes match all previous table hashes exactly. The 78 MB / 81-checkpoint frontier database was also hashed under a 96 MiB Node heap limit (26 MiB observed JavaScript heap). Selected stream, read-rate and response-size limits passed local transport checks. Existing VM and backup timers were inspected without mutation; no new release, inference, traffic change or clock activation has occurred. The final full verifier remains the publication gate.


## Active bounded pilot — 2026-11-14

PR #332 merged; exact Hosting assets and bridge revision verified. The single private writer is running a fresh six-Spark frontier world on Node 22.23.5 at four-minute cadence, with the original USD 5 ledger handed off once and the desktop spender permanently retired. Fixed expiry is 2026-11-15 05:24 UTC; USD 2 hosting controls, actual watchdog ticks, ingress cutoff and independent paired offsite backup/initial restore are verified. At 07:02 UTC pulse 7 was healthy with no new provider attempts yet. Genuine SDK refresh, latest AI-goal restoration, sustained outcomes and final billing remain open. S021 stays in progress. See [current operating record](../docs/spark-ai-online.md) and [sanitized evidence](../docs/evidence/spark-online-2026-11-14.md).


## AI recovery repair — 2026-11-14

The online check reached pulse 132 with a healthy world but two uncertain provider failures and no accepted new AI decisions. Diagnosis isolated token-count connectivity: metadata works, while Private Google Access excludes the pinned multi-regional endpoint. A run-owned private endpoint restored countTokens (200, 114 ms) with generation blocked. Early/deadline cleanup controls are armed inside the same USD 2 ceiling. Local audited recovery retains both unknown holds, receipts and the original USD 5 cap; uncertain contexts cannot retry. Safe phase/status diagnostics and focused tests are implemented. Full verification, source delivery and real AI resumption/receipts remain separate gates. [Repair evidence](../docs/evidence/spark-online-ai-recovery-2026-11-14.md).


## Pulse-150 chart/read recovery — 2026-11-14

AI recovery PR #334 is merged but was not activated: the old paused server blocked on chart/history reads and stopped answering health requests. The already-paused writer was stopped and its run/pause/checkpoint were independently verified. A proper stopped-writer paired backup succeeded in 22 seconds. The narrow metrics projection/cache passes focused tests and a real read-only Node22 probe of 151 checkpoints (3.44 s cold, 36 ms warm). Full source verification, repaired HTTP responsiveness, same-world audited resume, independent restoration and real AI decisions remain required. The original budget and hard cutoff remain fixed.


## Cost-bounded polling implementation — 2026-11-14

During the later private continuation, three real goal selections and their receipts were independently restored at pulse 159. The later owner polling observation preserved selection and Follow across a natural pulse. See the [private continuation](../docs/evidence/spark-online-private-running-2026-11-14.md) and [polling observation](../docs/evidence/observer-polling-live-2026-11-14.md); both are historical and do not change this pilot’s stopped closeout.

The owner selected occasional polling to restore observation without extending the original budgets or deadline. The implementation supplies visible-tab four-minute refresh, no streaming or old 15-second reload, compressed/authenticated bounded reads, and cumulative two-revision accounting with private-only viewing fallback. Local synthetic browser checks passed cadence, new committed pulse, selection/follow preservation and desktop/mobile layout. Exact-source verification and actual image/Hosting/live admission remain rollout gates; S021 remains in progress. See [local evidence](../docs/evidence/observer-polling-local-2026-11-14.md).


## Final stopped-pilot recovery and shutdown repair — 2026-11-15

The bounded pilot is stopped and its original deadline has expired. The writer stopped cleanly at 2026-11-15 05:19:00.923 UTC, before the original 05:24 UTC hard cutoff, at pulse 293 with 12 Sparks. Final state contains 294 checkpoints, 2,390 events and 44 goals: 35 completed, six active and three interrupted. Sparks 9 and 10 physically met at pulse 287; Sparks 11 and 4 had not met and remained preparing. Sparks 7 and 8 each completed a third rules-selected exploration goal. Spark 2 completed shaping and made one further AI marking choice. Intent, AI selection, rules-mediated acceptance and physical completion remain distinct.

The final offsite backup did not finish. Endpoint-cleanup retries delayed queueing; the cutoff path waited 70 seconds for a service with a 180-second allowance and then initiated shutdown, terminating the backup. The last verified offsite snapshot contained pulse 290. A temporary isolated reader recovered the stopped disk through a read-only clone without booting the original VM. Both temporary resources were deleted after checksum verification. World/ledger integrity and current state validation passed; all 291 previously recovered checkpoints matched byte-for-byte, closing the final recorded-outcome and AI-ledger gap. [Sanitized recovery evidence](../docs/evidence/spark-pilot-final-recovery-2026-11-15.md).

The original AI ledger retains 41 attempts, 39 completed and uncertain IDs 11/12. Recorded token estimate is USD 0.040698; conservative accounting is USD 1.181396 / USD 5, including both USD 0.50 holds. Hosting retained USD 1.923414 conservative accounting; the USD 0.04 recovery reserve brings the combined estimate to USD 1.963414 / USD 2. These estimates/reserves are not final invoices. No budget, attempt ceiling or deadline was renewed.

The source fix gives one cutoff unit ownership of regular-backup/health quiescence, writer stop, the full 180-second final-backup allowance plus acknowledgement time, observer closure and shutdown. Endpoint retries cannot gate it. Waiting remains bounded by the original lease and independent hard stop. All 11 focused regressions and the integrated online-run suite passed. The real local paired archive/receipt/restore rehearsal preserved pulse 293, all 294 checkpoints, eight bundle files and all 41 ledger rows with unchanged recovered source hashes. Service control and cloud storage were mocked; no live systemd deployment was qualified. [Local repair evidence](../docs/evidence/final-backup-shutdown-local-2026-11-15.md).

S021 remains **in_progress**. Genuine hosted auth/return behavior, final billing reconciliation and any separately authorized future deployment/operating qualification remain open. The expired pilot stays stopped; publishing this repair does not deploy it, create another allocation or authorize further hosting/inference. Human finalization remains deferred in S023, without acceptance or comparative model-benefit claims.


## Posted-charge reconciliation — 2026-11-15

Read-only Cloud Billing reports were scoped to Mimir and Mimir Realm Backups. The original-allocation charge period November 8–15 posts exactly **90,548 input and 3,927 output tokens** for the Gemini 3.5 Flash Lite regional text SKUs, matching all known recovered receipt quantities. The shorter November 13–15 filter omitted 1,549 input and 86 output tokens from earlier allocation activity; the full-date comparison resolves that discrepancy. Known AI token quantities are now reconciled, without asserting final attributable currency charges.

The ledger remains 41 attempts, 39 completed and uncertain IDs 11/12. USD 0.040698 is the recorded estimate; posted AI SKU costs display about USD 0.04 before displayed savings, at cent precision. Keep USD 1 in unknown holds and the unchanged USD 1.181396 / USD 5 conservative accounting. Matching aggregate quantities does not settle per-request uncertainty, release holds or renew the expired operating allocation.

For November 13–15, non-AI service usage rows sum to approximately USD 0.50 at displayed precision. Free-tier negative usage SKUs, other savings and baseline costs are present; the full filtered project net including AI is USD -0.01. That credited project net is not a refund, exact pilot cost or additional spending authority. Retain USD 1.963414 / USD 2 conservative hosting/recovery accounting and USD 0.036586 headroom until exact attribution is established.

Final billing remains open: the latest available statement is October 31, no November statement is present, all five displayed BigQuery export types are disabled, and the CSV download timed out. No export/API was enabled and no paid query job was run. Exact cents, delayed/recovery charges, project-to-run attribution and retained storage remain unresolved. Fresh resource inventory confirms the original VM is TERMINATED, only its original 30GB disk remains, and temporary recovery resources are absent. Existing retained disk/backup/artifact storage was not deleted and is not assumed free.

[Reconciliation evidence and remaining gates](../docs/evidence/spark-pilot-cost-reconciliation-2026-11-15.md). S021 remains **in_progress**: known AI quantities are reconciled, while final invoice/currency attribution, uncertain-hold settlement, hosting/resource attribution, retained-storage disposition and genuine hosted auth/return qualification remain open. The shutdown fix is merged in PR #341 but undeployed. This review performed no new inference, resource creation, deployment, restart, billable query or budget change. The pilot stays stopped. Publishing this documentation does not alter the runtime or authorize additional spending.


## Local closeout matrix — 2026-11-15

The [S021/S008 closeout matrix](../docs/s021-s008-closeout-matrix-2026-11-15.md) maps all six acceptance criteria to dated evidence and remaining gates. The [auth qualification plan](../docs/hosted-token-refresh-verification-plan.md) now targets scheduled polling rather than hosted stream rotation. Final recovery/local shutdown coverage and known token reconciliation are retained; genuine hosted auth/return, deployed shutdown/offsite recovery qualification, final billing/uncertain holds and retained-storage disposition remain open. No acceptance box or relationship changed. Human finalization remains deferred to S023.

Documentation preparation is complete locally; this is not new runtime qualification. No service, resource, allocation, lease or reserve changed. The expired pilot stays stopped and the shutdown repair remains undeployed. Future execution requires a separately authorized bounded plan.

## Refreshed Cloud Billing exports (2026-11-21)

Read-only, SKU-grouped Google Cloud Billing Reports CSVs for Mimir and Mimir Realm Backups were compared against the November 15 snapshot. The original exports are private and remain outside the repository.

- **November 8–15, AI allocation window.** Vertex AI still shows 90,548 input tokens and 3,927 output tokens, matching the known ledger receipts and the November 15 snapshot. After savings the input SKU subtotal is USD 0.012517 and the output SKU subtotal is USD 0.004632, totaling USD 0.017149. The full filtered project total is USD -0.044506 after savings and tax.
- **November 13–15, hosting and recovery window.** No increase is visible at the original snapshot's cent precision. Networking usage cost still displays USD 0.26, Cloud Run USD 0.22 (fully offset), and Artifact Registry USD 0.01. Private Service Connect shows 12.07 endpoint hours and USD 0.048918 after savings. The full filtered project total is USD -0.008775 after savings and tax, displayed as USD -0.01. The rounded baseline cannot rule out sub-cent changes.
- **November 16–21, after shutdown.** The report shows a USD 0.00 filtered total and no inference SKU. Artifact Registry shows USD 0.02 in usage cost before savings, offset at cent precision. Persistent disk, Firebase Hosting, Cloud Storage, and Service Directory still show usage with zero displayed billed cost.

The filtered totals include credits and project activity outside the pilot. Final invoice and run-level attribution remain open. AI request IDs 11 and 12 remain uncertain, with both USD 0.50 holds retained (USD 1 total). The USD 1.181396 conservative AI accounting and USD 1.963414 conservative hosting and recovery accounting remain in effect. The pilot stays stopped. This update used the supplied CSVs and incurred no additional spending.

## Fresh Edge billing confirmation — 2026-11-21

A read-only Google Cloud Billing Reports check in Edge confirmed that the report was grouped by SKU and scoped to Mimir and Mimir Realm Backups. For November 8–15, Vertex AI still displayed 90,548 input and 3,927 output tokens, with a filtered total of USD -0.04 at the console's cent precision. For November 13–15, the filtered total displayed USD -0.01 and Private Service Connect showed 12.07 endpoint hours and USD 0.05 after savings. For November 16–21, the filtered total displayed USD 0.00, with no inference SKU in the report; Artifact Registry displayed USD 0.02 usage offset by USD 0.02 savings, while persistent disk, Firebase Hosting, Cloud Storage and Service Directory showed usage. These observations agree with the CSV evidence above at displayed precision and do not resolve invoice or run-level attribution. The existing uncertain-request holds and conservative accounting remain unchanged.
