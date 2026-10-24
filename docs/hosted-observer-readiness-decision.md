# Hosted observer readiness decision — prepared 2026-10-24

**Recommendation: HOLD expansion; retain existing limited staging.** This is a prepared recommendation, not approval to widen access. MIM-S010 remains in progress and its separate approval criterion remains unchecked.

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

## Decision proposed for the owner

Retain the current Google-authenticated allowlist, at most two observers and three-minute staging sessions, one authoritative SQLite writer, paused archived pulse 64, existing backup policy, and USD 0.15 cumulative S010 ceiling. No audience or availability expansion is proposed now. The residual allocation is not a new spending authorization.

Before reconsidering expansion: obtain sufficiently attributable billing evidence or explicitly decide how to accept the documented uncertainty; resolve the genuine hosted token-expiry/refresh gap under a separately bounded plan; and define the intended operating workload and availability envelope. Existing exports are disabled, so any export setup requires a separate scoped decision. Do not infer approval from this document or mark S010 complete merely because the rehearsal passed.

**Owner decision: pending.** No access, deployment, infrastructure or billing configuration changed during preparation.
