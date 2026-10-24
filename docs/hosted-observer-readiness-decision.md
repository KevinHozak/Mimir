# Hosted observer readiness decision — recorded 2026-10-24

**Owner decision: retain limited staging; HOLD audience and availability expansion.** Recorded from the owner's explicit instruction on 2026-10-24. This completes MIM-S010's decision criterion without asserting that unresolved billing or hosted refresh has passed.

| Gate | Evidence and disposition |
| --- | --- |
| Bounded capacity | Passed for two authenticated clients, 120.039 seconds; direct simultaneous-stream lower bound 116.419 seconds. Paused rules-only pulse 64 only. |
| Recovery and cleanup | Passed: direct zeros/recovery T+124.777, exact original configuration and candidate deletion T+135.466, final cleanup T+139.090 within 180 seconds. |
| Allocated cost | USD 0.1469663581 within the USD 0.15 cumulative ceiling; USD 0.0030336419 retained headroom. No further run authorized. |
| Final financial attribution | Open: rounded two-day billing totals are not rehearsal-only charges; export absent, CSV unavailable, missing quantities and delayed charges retained as uncertainty. |
| Session lifecycle | Automated S008 coverage exists; genuine hosted Firebase natural expiration/refresh remains unverified. |
| Wider operation | Not established: advancing-world load, continuous availability and human engagement are outside this paused bounded run. |
| Source verification | PR 319 merged; exact source passed all 76 local verifier steps. |

Evidence: [successful bounded attempt](evidence/hosted-capacity-journal-retry-2026-10-24.md), [billing reconciliation and limitations](evidence/hosted-capacity-billing-review-2026-10-24.md), [local issue](../issues/MIM-S010.md).

## Recorded owner decision

Retain the current Google-authenticated allowlist, at most two observers and three-minute staging sessions, one authoritative SQLite writer, paused archived pulse 64, existing backup policy, and USD 0.15 cumulative S010 ceiling. No audience or availability expansion is proposed now. The residual allocation is not a new spending authorization.

Before reconsidering expansion: obtain sufficiently attributable billing evidence or explicitly decide how to accept the documented uncertainty; resolve the genuine hosted token-expiry/refresh gap under a separately bounded plan; and define the intended operating workload and availability envelope. Existing exports are disabled, so any export setup requires a separate scoped decision. Do not infer approval from this document or mark S010 complete merely because the rehearsal passed.

The owner authorized recording this limited-staging disposition, preparation of a bounded hosted refresh plan, and local issue reconciliation. No new live run, spending, deployment, infrastructure, billing configuration or access change is authorized. The USD 0.15 ceiling is retained, not reset.

Follow-up: [hosted token-expiry and refresh plan](hosted-token-refresh-verification-plan.md), tracked under [MIM-S008](../issues/MIM-S008.md). [MIM-E002](../issues/MIM-E002.md) retains the financial and wider-access gates. PR 320 merged the billing review; all 76 full local checks passed for its exact source, including a documented successful rerun after a timing-sensitive fixture failure.
