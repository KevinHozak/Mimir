# S021 / S008 local closeout matrix — 2026-11-15

Documentation review only, against local source `270d89b` and the linked dated evidence. No new runtime qualification was performed. Both issues remain **in_progress**; their acceptance boxes remain unchecked where hosted evidence is missing. This matrix is an evidence index, not another issue store.

The pilot is stopped at pulse 293. Its expired authorization is not renewed. No restart, deployment, ingress reopening, cloud resources, provider calls, paid queries, export/API enablement, reserve release or storage deletion is authorized. Retained storage may continue accruing charges; this local work makes no cloud changes.

## Acceptance mapping

| Issue / criterion | Evidence already available | Remaining closeout evidence / decision | Can close locally now? |
| --- | --- | --- | --- |
| S021: exact-source preparation, access, allocation, cadence, continuation and rollback | Historical pilot decisions and deployment record in [online operating record](spark-ai-online.md); original lease expired | Any future run needs exact-source parity, a complete bounded operating packet and explicit authorization; no automatic continuation | Preparation only; no new operational acceptance |
| S021 and S008: genuine auth refresh, reconnect and return selection | [Synthetic lifecycle evidence](evidence/observer-session-lifecycle-2026-10-23.md), [polling checks](evidence/observer-polling-local-2026-11-14.md); source uses scheduled authenticated reads | Genuine expired-token denial/forced retry, automatic SDK refresh used by deployed polling UI, return context and direct cleanup under an approved bounded plan | Plan can be updated; genuine acceptance cannot |
| S021: persistent single writer, same world and goal/AI receipts through restart/reconnect | Local lease/restart coverage; [final recovery](evidence/spark-pilot-final-recovery-2026-11-15.md) preserves final world/ledger | Consolidate historical same-world restart evidence with future auth/return evidence; do not infer hosted reconnect from local restore | Evidence indexing only; hosted gate remains |
| S021: latest bundle-inclusive off-host restore and visible failures | Offsite snapshot 290; stopped-disk recovery 293; [real local paired restore](evidence/final-backup-shutdown-local-2026-11-15.md) preserves 294 checkpoints, eight bundle files and 41 ledger rows | Final offsite snapshot failed. Merged PR #341 shutdown repair is undeployed; live systemd ordering, final upload/receipt and independent fresh restore remain unqualified | Local recovery gap is closed; hosted operating gap is not |
| S021: stop controls, budget exhaustion and provider-free archive reads in selected host | Local online-run tests and shutdown failure-path rehearsal; actual pilot stopped before hard cutoff | Future selected-host proof of repaired cutoff, budget behavior and provider-free archive access; no new provider use is needed for a future read-only archive test | Existing local coverage stands; no need to repeat unchanged checks |
| S021: deployed assets, audience/time limits, costs and limitations | Dated operating/recovery records and [billing reconciliation](evidence/spark-pilot-cost-reconciliation-2026-11-15.md) | Final currency/invoice attribution, delayed/recovery charges, resource-to-run attribution, uncertain IDs 11/12 settlement and retained-storage disposition | Prepare worksheet from existing records; final external evidence/owner disposition remains |
| S008: three checked local lifecycle criteria | Existing synthetic transport/browser tests and dated evidence; historical stream coverage remains valid for that transport | Polling-specific live acceptance below supersedes stream rotation as the selected hosted target; no new implementation claim | Retain checked local criteria, do not convert them into hosted proof |
| S008: two unchecked genuine credential/UI criteria | [Historical blocked packet](hosted-token-refresh-approval-packet.md) and [revised polling plan](hosted-token-refresh-verification-plan.md) | Real forced refresh and automatic refresh on next eligible poll, preserved observer context and bounded request/timer cleanup | Remain unchecked |

## Accounting and acceptance boundaries

Known posted token quantities match 90,548 input / 3,927 output. This does not settle uncertain request IDs 11/12. Keep USD 1 in holds and USD 1.181396 / USD 5 guarded AI accounting. Keep USD 1.963414 / USD 2 conservative hosting/recovery accounting. Rounded posted amounts and credits do not create renewed spending authority. S008's separate historical USD 0.15 cumulative ceiling is also not reset or transferred into S021.

Retained original disk, backups and artifacts need an explicit retention/disposal decision after recovery requirements are established. This document neither deletes them nor claims their cost has stopped. Human finalization remains in S023; no human acceptance or comparative model-benefit conclusion is supplied.

## Local preparation completed by this update

- Mapped every S021 acceptance criterion and both remaining S008 genuine-hosted criteria to evidence and remaining gates.
- Revised the auth plan for four-minute polling, request-based credential use, zero SSE and a timing proposal that can actually observe a later poll.
- Marked the old stream approval packet as historical and unsuitable for execution.
- Linked both authoritative local issues without changing their status or relationships.

Further local implementation, such as adapting the old stream harness into a polling integration driver, remains separate work. This documentation update does not claim that driver exists or that any new browser/runtime checks passed.
