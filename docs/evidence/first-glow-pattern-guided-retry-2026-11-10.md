# One pattern-guided retry after conservation - local, 2026-11-10

## Implementation and compatibility

Fresh engine callers explicitly pass patternGuidedRetry:true. The persisted firstGlowState.patternGuidedRetry version is pattern-guided-retry-v1; route patterns initialize if needed. Completion remains a separate opt-in. Missing retry policy preserves pre-retry choice/resolution/order/fallback behavior. Unknown versions reject, and initialization refuses recorded histories. Default constructors and live server startup/reset do not opt in or retrofit histories.

A retry requires conservation at the same identified cache, followed strictly later by a physical encounter with a current/reachable pattern. A previous survey or unknown/different cache identity does not qualify. Charge and shelter priorities can defer use without consuming the allowance. Commitment consumes one retry per reader/cache across artifacts, even if interrupted. Selection and arrival share recorded authorization; arrival still requires at least three charge, zero deficit, 75 readiness and a reachable surveyed-shard route before probing. Stale navigation can lead to conservation, never a forced probe. Direct unauthorized repeated resolution rejects before changing state.

New-policy route decisions commit before physical transitions, including same-pulse arrivals. Each attempt stores the original conservation, pattern/encounter/use references, later choice if reached, and arrival/interruption outcome. Original evidence is retained when the current choice advances. Retry-tagged uses and attempts validate together; removing the attempt, policy or pending active use fails rather than resetting the allowance.

## Verification

- Four-package build passed with the usual Vite chunk warning.
- Root npm test passed: 128 reported world-data/engine tests, zero failures. Twelve retry checks cover both guards, real subsequent movement/arrival from a declared controlled prior-choice fixture, retained first conservation, absent/unknown policy, retrofit rejection, need deferral, arrival resources, prior survey, encounter ordering, unknown cache identity, stale/unavailable route, one retry across artifacts, interruption, malformed duplicate attempts, lost policy/authorization, and same-pulse arrival.
- Server state/normalization checks passed, including committed-retry SQLite restart through arrival with both choices retained and duplicate/unknown policy rejection. Chronicle persistence checks passed.
- Sixteen saved pre-retry checkpoints (original ordinary, controlled-route and completion-policy histories) continued byte-for-byte identically to a preserved pre-retry engine for five pulses each. This is sampled compatibility evidence, not exhaustive equivalence.
- All six final ordinary pulse-360 states passed current validation and SQLite normalization/continuation equality for five further pulses.

The ordinary run exposed an additional bypass: when no proposed activity was reachable, selection retained a stale scavenge-cache activity and dispatched another unauthorized arrival. The retry policy now selects idle/waiting in that case. This is gated to the new policy; old histories retain their fallback. A regression verifies no extra cache decision, no original-choice replacement and no extra retry; the captured failing pulse 298 was also replayed successfully after repair. Earlier failed/partial runs remain disposable artifacts; the table below comes from the completed final matrix only.

## Ordinary fresh-history rerun

Six unmodified fresh starts, fixed seed 2, 360 pulses each, 1/8/12 Sparks on the same two bundles; routePatterns:true, activityCompletion:true and patternGuidedRetry:true. No repositioning, resource boosts, paid models or provider calls. These are deterministic bounded examples, not independent random samples.

| Bundle | Sparks | Probes | Patterns | Uses | Conservation retries |
| --- | ---: | ---: | ---: | ---: | ---: |
| current | 1 | 0 | 0 | 0 | 0 |
| current | 8 | 1 | 0 | 0 | 0 |
| current | 12 | 1 | 1 | 3 | 2 |
| review | 1 | 0 | 0 | 0 | 0 |
| review | 8 | 1 | 0 | 0 | 0 |
| review | 12 | 0 | 0 | 0 | 0 |

Current is the server-default bundle sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e; review is the earlier controlled-review bundle sha256-591d53ab30c749f531d0b322609bbfe88096abc8f18b08977ca4d50296d873ca.

In current/12, Spark 1 surveys at 114 and creates the pattern at 122. Spark 6 conserves initially at 72, encounters at 178, defers for charge at 179, commits its retry at 230, and arrives/conserves at 244. Spark 2 conserves initially at 38, encounters at 243, declines for unavailable/unreachable target at 244, retries at 327, and arrives/conserves at 359. Both original decisions remain in their attempt records. Spark 9 encounters at 204 and uses at 205 for a first visit, arriving/conserving at 212; that use is not counted as a retry.

All three recorded uses reach the cache, but none probes on that visit. The changed rule permits later knowledge to reopen a journey after conservation without granting resources or guaranteeing useful outcomes. Resource preparation and sustained-interest acceptance remain unresolved; S001 stays open. No new human acceptance judgment is inferred.

Reproduce after building: node scripts/first-glow-route-patterns-ordinary-review.mjs --retry. Fetch is blocked by the harness. [Machine-readable results, attempt records, source hashes and compatibility results](first-glow-pattern-guided-retry-2026-11-10.json). Final raw data: .tmp/route-patterns-retry-ordinary-Xg5Wkb. Verification logs are in .tmp/retry-fix/. Existing recordings were not rewritten. No commit, push, PR or deployment.
