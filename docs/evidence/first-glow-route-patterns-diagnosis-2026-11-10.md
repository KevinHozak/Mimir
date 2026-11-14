# Exploration completion and cache-arrival diagnosis - 2026-11-10

Offline investigation only; no gameplay edits, provider calls or existing recording changes. Replayed unmodified fresh starts on server-default bundle sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e, seed 2, route-pattern opt-in: one Spark for 8 pulses, eight for 120, twelve for 280. These cover all 12 cache choices previously observed for this bundle through pulse 360. Additional eight-Spark replay recorded cache departures. Raw diagnostic scripts/results remain under .tmp/route-patterns-diagnosis/. [Recorded data](first-glow-route-patterns-diagnosis-2026-11-10.json).

## Confirmed exploration completion gap

The single Spark draws at pulse 5 at (3,5). At pulses 6, 7 and 8 it remains choosing/explore at that same trace cell, with no event, no ledger effect and no learned evidence. firstGlowExploreCandidate selects the nearest trace cell, including the current cell. The structured transition validates that arrival, handles it and clears the plan in the same pulse. However, first-glow-actions.ts only emits exploration/mark/pattern completion when the prior status was traveling or interacting. A choosing-to-interacting-to-choosing transition therefore loses its completion. hasLearned never sees exploration, so autonomous selection repeats it.

A second accounting detail matters to a repair: arrivalActions is collected before the wrapper appends those completion events. Merely broadening the status test would leave same-cell activity costs missing and could mistake unrelated choosing transitions for completion.

## Resources at cache choice

Values below are from immediately before the arrival pulse. Code order establishes that transit changes position before resolving the choice, while movement strain/sustenance are applied afterward; these resource values therefore apply at the cache choice in these traveling, non-sharing cases. The trace separately retains post-pulse resources and ledger effects. Probe requires at least 3 charge, zero deficit and at least 75 readiness, plus a reachable shard route. Every row fails at least one resource condition regardless of route availability.

| Population | Pulse | Spark | Charge | Deficit | Readiness |
| ---: | ---: | --- | ---: | ---: | ---: |
| 8 | 27 | spark-8 | 0 | 24 | 76 |
| 8 | 66 | spark-5 | 0 | 24 | 60 |
| 8 | 94 | spark-6 | 0 | 11 | 76 |
| 8 | 116 | spark-7 | 5 | 0 | 56 |
| 12 | 38 | spark-2 | 0 | 36 | 64 |
| 12 | 63 | spark-6 | 0 | 39 | 70 |
| 12 | 85 | spark-4 | 5 | 0 | 55 |
| 12 | 130 | spark-8 | 0 | 93 | 13 |
| 12 | 164 | spark-5 | 0 | 105 | 43 |
| 12 | 185 | spark-9 | 0 | 99 | 80 |
| 12 | 233 | spark-3 | 0 | 132 | 78 |
| 12 | 274 | spark-7 | 0 | 141 | 72 |

Ten of twelve arrivals have zero charge and positive deficit; the other two have five charge and zero deficit but readiness 56 and 55. All conserve. In the eight-Spark departure trace, Spark 8 starts its cache journey at pulse 6 already at zero charge/deficit 3, despite 24 source charge: reachability checks can reject occupied charge slots and fall through to reachable exploration/cache activity. Other departures begin with 8 charge/92 readiness, 10/97, and 25/76; their journeys exhaust charge or lower readiness below probe eligibility. Activity choice checks current needs and reachability, without budgeting the journey against cache-arrival requirements; traveling Sparks do not reselect merely because resources fall. This explains these observed resource failures, not a proof that all seeds or populations cannot probe.

## Recommended focused fix (proposal, not implemented)

First repair authoritative activity completion. Emit exactly one completion record for explore, mark-trace and shape-pattern at the validated arrival in the structured transition, for both zero-distance and traveled arrivals. Have the wrapper consume that record for knowledge, resource accounting and route-pattern creation rather than inferring success from prior/final status. Calculate activity effects after completion admission; keep movement and activity strain charged once under the existing per-pulse convention. Invalid/canceled arrivals must emit no completion. Preserve event identity/order where possible and explicitly version or fresh-history-gate any changed deterministic outcomes; old checkpoints must not silently change rules.

Verify same-cell exploration completes and advances selection, same-cell mark/shard completion, invalid arrivals, no duplicate completion or resource debit, actual movement arrival, restart equivalence and unchanged legacy-policy replay. Then rerun the ordinary-history matrix. This removes an observed blocker; it does not promise natural route patterns.

Treat cache preparation as a subsequent focused decision informed by that rerun: budget travel against the existing arrival requirements and select achievable charge/rest preparation, or record an explicit deferred/unaffordable exploration goal. Define behavior for unavailable charge slots and interrupted journeys. This may require repeated loading or staging; a feasibility check alone can suppress all cache trips without making any possible. Do not lower probe thresholds, replenish resources for free or force patterns as part of the completion repair.
