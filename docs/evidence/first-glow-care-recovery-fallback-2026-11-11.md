# Bounded care recovery fallback — 2026-11-11

Implemented and verified locally; uncommitted and unpublished. [Structured results](first-glow-care-recovery-fallback-2026-11-11.json). This follows the [recorded recovery-order diagnosis](first-glow-recovery-order-diagnosis-2026-11-11.md).

## Policy and preserved gates

Fresh constructors may explicitly select `careRecoveryFallback: true`, recorded as `care-recovery-fallback-v1`. It supplies post-probe prerequisites if absent; default server startup/reset and recorded histories remain unchanged. Unknown versions and malformed policy/provenance reject. Older checkpoints are never retagged.

For an active surveyed-shard goal, the planner first searches the existing care-first itinerary. Only when that resource-bounded search is infeasible, readiness is at least 70 but below 90, carried charge is positive, and deficit is zero may it search a bounded charge→rest itinerary. A feasible rest itinerary with busy contacts keeps waiting; occupancy alone does not authorize the fallback. The projected charge stop must retain at least 70 readiness. Urgent rest below 70 remains prior to fallback charging, including admission-time rechecks.

Selecting fallback retains a care obligation even if social preferences later change: real rest evidence and at least 90 readiness are required before shard departure. Repeated fallback selection clears prior rest proof. Real draws and rests use the existing source, movement, deficit and readiness accounting. The originating preparation and post-probe goal share the existing 64-action allowance. Queue admission retains waiting-age/ID ordering, valid reservations and atomic immediate-contact ownership; future contacts remain conditional. Actual dispatch and arrival recheck resources and shard/contact validity. Public-pattern creation and later encountered-pattern retry authorization retain their separate gates.

## Six ordinary histories

All six start from unmodified fresh constructors, fixed seed 2, populations 1/8/12, current/review bundles, nine explicit policies, rules only, 360 pulses. Fetch is blocked; zero provider calls. Raw recordings: `.tmp/route-patterns-care-fallback-ordinary-ypeYrk`. Controlled tests below are separate from these histories.

| Bundle | Sparks | Public patterns | Later encounters | Guided uses |
| --- | ---: | ---: | ---: | ---: |
| Current | 1 | 1 | 0 | 0 |
| Current | 8 | 4 | 10 | 1 |
| Current | 12 | 2 | 1 | 0 |
| Review | 1 | 1 | 0 | 0 |
| Review | 8 | 3 | 8 | 0 |
| Review | 12 | 1 | 0 | 0 |
| **Total** | | **12** | **19** | **1** |

The preceding eight-policy window had five patterns, two encounters and zero uses. The earlier seven-policy window had 11 patterns, 27 encounters and two uses, including one successful probe. These windows are deterministic bounded observations, not a general performance claim.

Review/12 Spark 3 retains its pulse-156 survey, records rest at 292, commits shard departure at 293 and creates its public pattern at **311**. Spark 2 remains unfinished at 360: traveling to shelter, 38 charge, zero deficit, 79 readiness, 26 combined preparation actions. Its latest fallback still requires subsequent actual rest; no departure or pattern is invented. Review/8 has three patterns at 207/226/343, plus one committed unfinished shard leg and one uncommitted goal.

Current/8 Spark 2 encounters Spark 1's pattern at 235 and commits its one guided retry at 331. At actual cache arrival at 350 it **conserves**, with 11 charge, zero deficit and 80 readiness. Guided use has returned, but successful probe reuse from the seven-policy window has not been reproduced. No travel saving, social benefit or sustained interest is inferred.

Eight goals select fallback; six have completed by 360, one remains committed toward the shard, and one remains recovering. Maximum combined action count is 26, below 64. Final states have no duplicate contact ownership or stranded reservations.

## Local verification

- Full four-package build passed; existing Vite chunk-size advisory remains.
- 194 root tests passed, including 10 fallback checks for fresh-only initialization, resource feasibility, urgent rest, both occupied shelters, admission rechecks, actual rest/90 readiness, source/action bounds, accounting and malformed evidence.
- Ten server state/SQLite checks passed, including pending fallback, actual rest, committed departure and completed checkpoints with deterministic continuation.
- 52 older checkpoints, including all six preceding post-probe histories, continue byte-identically for five pulses against the pre-change compiled engine.
- All six new final states validate and continue identically after SQLite normalization for five pulses; contact ownership and combined action bounds are checked.
- Controlled fresh-policy WAL backup/restore includes eight bundle files and five checkpoints (setup, fallback, rested, committed, completed), each followed for five equal pulses. This controlled fixture is not ordinary-history evidence.

S001 remains **OPEN** for broader natural completion, successful useful reuse and independent human sustained-interest review. No commit, publication, default opt-in, bundle edit or provider call.
