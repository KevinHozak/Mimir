# Pattern-guided resource preparation investigation - 2026-11-10

Replayed the same ordinary current/12 history offline: seed 2, 360 pulses, server-default bundle sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e, route patterns + completion + retry policies enabled. Logged resources before/after each relevant pulse, objective events, ledger effects, source charge and recovery reachability. Every captured route-pattern lifecycle message matched its pulse/actor in the retained recording. No gameplay code, existing recordings, provider calls or live services changed. [Machine-readable trace summary](first-glow-pattern-resource-preparation-2026-11-10.json); raw trace/scripts in .tmp/resource-preparation/.

## Measured cause

Resources are charge / deficit / readiness. Arrival values are immediately before the arrival pulse: code moves and resolves the choice before movement strain/sustenance, so these are also the resources used for the choice in these uninterrupted, non-sharing travel cases. Minimum departure values hold the observed path/moving pulses fixed, assume no intervening transfers and require the existing pre-probe gates (3 charge, no deficit, readiness 75). They are diagnostic lower bounds, not alternative policies or forecasts of unobserved routes.

| Spark | Use -> arrival | Departure | At probe decision | Minimum departure for observed route |
| --- | --- | --- | --- | --- |
| spark-9 | 205 -> 212 | 0 / 20 / 20 | 0 / 27 / 13 | 10 / 0 / 82 |
| spark-6 | 230 -> 244 | 29 / 0 / 0 | 15 / 0 / 0 | 17 / 0 / 89 |
| spark-2 | 327 -> 359 | 16 / 0 / 0 | 0 / 16 / 0 | 35 / 0 / 107 |

All three were already below 75 readiness before leaving; both retrying readers had zero readiness. Spark 6 had enough charge throughout but no readiness. Spark 9 departed despite both unmet charge and shelter needs: neither recovery contact was reachable/free at that moment, while the cache was. Spark 2 departed with positive charge and no deficit, but its 33 moving pulses spent 16 charge and added 16 deficit before the last arrival pulse; it also lacked readiness from departure. The arrival pulse then spends another unit of sustenance/strain after conservation.

Source charge was 280, 352 and 640 for Sparks 9, 6 and 2 at departure respectively. These journeys were not explained by an empty settlement source. Recovery access and budgeting were missing: Spark 9 and Spark 6 had no available/reachable charge or shelter contact at departure; Spark 2 could reach charge but not shelter. Reachability is a Boolean combining route and slot availability; the trace does not separate those causes.

Preparation was incomplete, not universally absent. Between encounter and use, Spark 6 drew 48 charge across six draw events but recovered no readiness; its intervening activity incurred 46 movement strain. Spark 2 drew 64 across eight draws, recovered ten readiness once, incurred 55 movement strain, and transferred 17 charge in sharing events (with normal sustenance accounted separately). Neither has a persistent preparation goal tied to the future cache trip.

## Code mechanism

chooseAutonomousActivities checks current need (zero carried charge or positive deficit; readiness below 70 or a social-care condition), then picks the first reachable activity. A reachable cache can win when recovery activities have no candidate, even with unmet immediate needs. Positive current charge is treated as sufficient regardless of distance. Readiness selection thresholds are also different from the 75 readiness required to probe at arrival. Traversing Sparks do not reselect on resource exhaustion.

firstGlowCandidates selects an available contact by route cost and deterministic tie-breaking, without predicting charge/readiness at that contact. Travel has a two-navigation-unit pulse budget; sustenance/strain depend on actual movement-event pulses, not simply Manhattan distance, cells or total navigation units. The resolver correctly conserves when arrival gates fail. Lowering that guard would hide the preparation defect.

## Recommended focused fix (proposal only)

Add a fresh-history-versioned pattern-trip preparation policy for both first-use and retry journeys. Before recording use or consuming the retry, select the actual target/contact/path using the shared deterministic planner and project resources through its movement schedule to the cache choice. Admit departure only if predicted charge >= 3, deficit = 0 and readiness >= 75, with a reachable shard route; account for the probe and arrival pulse costs too. Use the actual selected contact and recheck after reservation conflicts rather than forecasting one path and taking another. Do not claim later shard completion from a funded cache probe.

When short, retain a bounded preparation goal referencing the encountered pattern and perform real existing charge draws and shelter rests. Continue those actions until the forecast for the remaining itinerary qualifies, not merely until current charge becomes positive or readiness crosses 70. Project the recovery legs as well: going to charge after rest can undo readiness, and rest after charging spends charge. Re-evaluate after draws/rest, sharing, navigation/slot changes and immediately before commitment. Sharing remains an actual choice/cost and can invalidate the budget; do not assume future gifts or automatic resource refills. No cache-slot reservation should be held throughout preparation.

Unmet needs with no feasible recovery access must defer/wait rather than fall through into spending the pattern use/retry. If the known recovery itinerary cannot satisfy the projection, record a specific deferred reason and keep the unspent allowance. Bound preparation/no-progress attempts and reconsider when relevant conditions change; do not create an endless charge/rest loop. Existing arrival checks remain authoritative if conditions change during travel.

The observed Spark 2 route requires 107 readiness at departure, beyond the 100 cap. An affordable alternative contact/itinerary or real intermediate recovery is necessary; more resting at the same departure point cannot solve it. A focused preparation policy should truthfully defer when no supported itinerary is feasible. New recovery infrastructure, movement-cost rebalance, relaxed probe thresholds and guaranteed successful patterns are separate scope.

Verify exact zero-distance/traveled resource projections against real transitions, exact-threshold admission and one-short deferral, repeated paid draws/rests, unavailable recovery contacts, sharing/replanning invalidation, readiness-cap impossibility, unspent retry while preparing, once-only commitment, restart equivalence and unchanged older-policy continuation. Then rerun the same ordinary matrix, recording preparations/deferred trips as well as use/arrival/probe. Zero probes is still a valid measured outcome.

S001 stays open. Recommendation only; no gameplay implementation, provider calls, commit or publication.
