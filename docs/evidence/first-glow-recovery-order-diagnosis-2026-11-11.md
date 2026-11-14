# Recovery order and lost reuse — investigation, 2026-11-11

Recommendation only. No engine, test, server or ordinary-run script edits; no commits, publication, live databases or provider calls. Follows the [post-probe continuation results](first-glow-post-probe-continuation-2026-11-11.md). [Structured trace, comparison and conditional budgets](first-glow-recovery-order-diagnosis-2026-11-11.json). S001 remains open.

## Finding

The goals survive, but the recovery planner repeatedly rejects the order required by its current care filter. Once carried charge becomes nonzero and deficit clears, care below 90 forces **rest first** on every new decision. The bounded planner considers at most two recovery stops. In the measured pool snapshots, neither rest directly followed by the shard nor rest→charge→shard can meet the full shard budget and care departure threshold. It therefore defers the goal and falls back to ordinary shelter recovery. After resting, the Spark returns to the pool; clearing current deficit triggers the same care-first rejection before enough charge has been accumulated for a funded care-and-shard itinerary.

This is a recovery-order bottleneck, not lost survey evidence, exhausted preparation bounds, an empty source or a broken charge ledger. Queue waits and sharing contribute, but the same restriction appears with a free immediate draw contact and no zero-charge companion demanding a share. Removing every care restriction is neither necessary nor recommended.

## Exact recorded recovery costs

Fresh reconstructions of review/12 and review/8 match the entire recorded pulse-360 states exactly. Every active post-probe pulse also satisfies the carried-charge balance: starting charge + actual draws + receipts − actual transfers − consumption = ending charge.

Review/12, measured after each actual survey through pulse 360:

| Spark | Starting charge / readiness | Actual draws | Actual rests / readiness recovered | Moving pulses | Wait-event pulses | Charge given / received | Actual carried-charge consumption | Ending charge / deficit / readiness |
| --- | --- | --- | --- | ---: | ---: | --- | ---: | --- |
| 2 | 37 / 73 | 8, totaling 64 charge | 14 / 140 | 148 | 71 | 13 / 12 | 100 | 0 / 0 / 65 |
| 3 | 27 / 74 | 6, totaling 48 charge | 11 / 110 | 116 | 80 | 2 / 1 | 74 | 0 / 6 / 68 |

The recorded rest gains are almost entirely spent on travel strain: `73 + 140 − 148 = 65` and `74 + 110 − 116 = 68`. Neither visits the surveyed shard or takes the old unrelated marking detour. Both keep cycling between recovery sites. Wait counts include all emitted waits, not just queue admission. Consumption counts actual held charge spent; movement without charge also records deficit under the existing rules.

Only the 8/6 draws appear in their post-goal action lists. These rests occur while the preparation goal is deferred and ordinary current-need recovery is executing. That is the current distinction between independent recovery and goal preparation, not missing rest effects: readiness really changes and real travel really spends it. Combined goal counts are 19/16 at cutoff, so the 64-action limit is not the current blocker.

Review/8's former creator Spark 1 shows the same inefficiency without donating any charge after its survey: **112 drawn, 49 received, zero given, 155 consumed, 213 moving pulses and 19 rests**, ending with 8 charge and deficit 5. Sharing cannot be the sole explanation for its failure to produce its former artifact.

## A measured decision that exposes the restriction

At **review/12 pulse 245**, Spark 2 is already at a pool contact, with **16 charge, zero deficit, 83 readiness**, source stock **464**, and no empty-charge companion to preempt planning. It has just finished its second draw of that visit. Its immediate preference is rest because care requires 90. The goal becomes `deferred: no currently feasible funded shard itinerary or contact`, and ordinary seek-shelter is selected.

In a **copied planning query**, omitting only the first-phase restriction selects charging at `draw-east`. The goal, source, reservations, remaining action allowance, route costs and required **90 readiness at shard departure** are unchanged. This query is not an executed history and is not legal under the current v1 care-first scheduling rule.

The same post-draw restriction occurs at review/12 pulses **235, 245, 300, 330 and 342** while readiness remains at least 70. Review/8 has nine analogous sampled post-draw cases. Separate cases at readiness 62/65 also admit charge-first mathematical forecasts, but those are **urgent-rest cases and are excluded from the recommendation**. A feasible rest itinerary merely waiting for a busy contact is also excluded: waiting is not resource infeasibility.

The owning code is explicit: `chooseAutonomousActivities` passes `immediate: "rest"` for current care preference; `selectPostProbeContinuation` forwards it; `selectCachePreparation` executes `if (immediate && phase !== immediate) continue`. After the goal defers, the selector falls back to independent ordinary recovery. The current goal stores its objective/actions, not an executable sequence that can overrule this new per-decision filter.

## Conditional budgets, with care still required

Independent enumeration using the existing recovery/moving/activity arithmetic finds the following resource-feasible charge→rest→shard itineraries. **No rest-first itinerary in the existing two-stop search qualifies** at these snapshots. This is a statement about that bounded search, not a proof that every longer rest-first itinerary is impossible.

| Actual snapshot | Current charge / readiness; source stock | Additional actual draws / rests | Current stock spent | Readiness after charging | At shard departure: charge / deficit / readiness | After shaping: charge / deficit / readiness | Recovery plus shard duration with immediate access |
| --- | --- | --- | ---: | ---: | --- | --- | ---: |
| Review/12 Spark 3, 235 | 16 / 76; 448 | 3 / 3 | 24 | 76 | 26 / 0 / 92 | 7 / 0 / 73 | 38 pulses |
| Review/12 Spark 2, 245 | 16 / 83; 464 | 2 / 2 | 16 | 83 | 19 / 0 / 90 | 0 / 0 / 71 | 35 pulses |
| Review/8 Spark 1, 131 | 12 / 80; 336 | 3 / 3 | 24 | 80 | 23 / 0 / 97 | 4 / 0 / 78 | 37 pulses |

Each selected first draw contact is free in the actual snapshot; it is not guaranteed to remain free after earlier queued admissions. Charging is at the current pool contact and does not lower readiness below the existing urgent-rest floor. Each plan includes **real rest before the shard**, reaches at least 90 at discretionary departure, uses only currently present source stock, stays within the remaining shared bound, and funds the full final leg. For Spark 2, the projected combined action count is 19 (15 already spent + 4 additional), below 64.

These forecasts do not reserve later contacts or guarantee access, stock, unchanged social circumstances, artifact creation or a completion pulse. A new policy would need actual admission, repeated rechecks and real action execution. No forecast was advanced as a replacement history, and no earlier artifact or restored reuse is claimed from it.

## Why guided reuse disappeared in the six-run window

The aggregate comparison is **11 patterns / 27 encounters / 2 guided uses** before post-probe continuation versus **5 / 2 / 0** afterward. These are different fresh policy trajectories, not upgrades to the same saved history.

The prior useful-reuse run was review/8:

- Previous creators Spark 2, Spark 3 and Spark 1 left patterns at **154, 198 and 218**. In the new run, all three remain in post-probe recovery at 360 and create none. The resource-order restriction is directly measured in these former creators' new histories.
- Previously, Spark 4 conserved at **101**, encountered Spark 1's pattern at **243**, departed on its authorized retry at **324** and probed at **344**. In the new run it still conserves at 101 but **never encounters a pattern** by 360. The later-information authorization is therefore absent, not improperly rejected.
- Previously, Spark 7 conserved at **193**, encountered that pattern at **294** and committed its retry at **348**. Its new trajectory instead **probes at 206 and becomes the only creator at 311**. It cannot encounter its own artifact, and previously probed caches do not acquire another retry automatically.
- The new review/8 artifact has **zero later encounters**, compared with 12 across the three previous artifacts. Its sole creator arriving at the shard does not count as somebody else reading it.

The two remaining encounters are elsewhere. Current/8 Spark 4 encounters at **291**, is accepted into pattern preparation, performs four preparation actions, and defers because its selected preparation/cache contact becomes unavailable. Current/12 Spark 1 encounters at **359**, starts charge preparation at 360 and has no recovery action yet. Neither is denied because retry authorization broke. This also means fixing source formation alone cannot guarantee that every reader will have a funded, admitted retry before the window ends.

The first artifact is not later everywhere: current/8's first creation moves from **202 to 138**, and current/12's from **300 to 183**. Current/8 nevertheless falls from 15 encounters to one. Earlier first publication alone therefore does not repair the channel: the other Sparks must still physically reach the shard, and their unfinished recovery prevents much of that traffic.

More expensive funded final legs, repeated recovery travel and fewer completed creators reduce shard traffic and later information encounters. The records do not support fixing the reuse counter directly, making patterns globally known, granting extra retries or weakening the final arrival checks.

## One focused recommendation

Add an **explicit fresh-policy, bounded charge→rest fallback for post-probe goals when nonurgent care-first planning is resource-infeasible**:

- Keep rest-first when it has a feasible funded itinerary, including when its contact is currently busy and should be queued.
- When readiness is in the existing nonurgent-care range (at least 70 but below the care target), and that bounded rest-first search fails, allow a charge→rest itinerary whose charging phase stays above the urgent-rest floor and whose actual discretionary departure still requires the care target of 90.
- Keep urgent rest, sharing, real source draws/rests, the existing shared action bound, fair atomic admission, full shard budget and actual arrival gates. The fallback grants neither a contact nor a retry; stop/replan if actual resources, navigation or social circumstances invalidate it.

This **intentionally changes v1's nonurgent care scheduling**: care remains a required rest outcome before the shard, while a short bounded charging step can fund that outcome. It does not lower care readiness or justify bypassing urgent rest. It must be a fresh opt-in/version, not a silent change to existing histories. Restrict the focused change to the measured post-probe objective; cache/pattern-reader scheduling has separate contracts and is not implicitly changed by this recommendation.

Acceptance should execute real recovery from fresh histories, test the measured nonurgent dead ends, reject fallback for urgent-rest and merely-busy feasible-rest cases, preserve both care/final-leg budgets and queue ownership, and rerun all six 360-pulse windows. The goal is to stop the measured recovery cycle; whether earlier source artifacts yield useful later encounters and completed retries must be observed, not promised. Broader reliability and human sustained-interest review remain separate S001 gates. **No fix was implemented.**

## Verification and provenance

- Exact review/12 and review/8 pulse-360 JSON-state hash matches, using unmodified constructors, seed 2, the same world IDs/bundles and eight existing opt-ins. Hashes and per-pulse balance assertions are in the structured evidence.
- Seven owning source hashes match the preceding implementation evidence; no gameplay, test or server source changed in this investigation.
- Original histories: `.tmp/route-patterns-post-probe-ordinary-G9zWI9/`; seven-policy comparison: `.tmp/route-patterns-initial-preparation-ordinary-s8wAMU/`.
- Trace, snapshots and conditional budgets: `.tmp/recovery-progress-qFUG25/`; disposable harnesses `.tmp/recovery-progress-diagnosis.mjs` and `.tmp/recovery-progress-budget.mjs`.
- Owning sources: `first-glow-actions.ts` care/current-need selection and fallback; `first-glow-pattern-preparation.ts` first-phase filter, bounded two-stop search and accounting; `first-glow-post-probe-continuation.ts` retained goal and final care/funding requirements; `first-glow-route-patterns.ts` physical encounters; `first-glow-pattern-retry.ts` later-information authorization.
- JSON/summary consistency, source hashes, conditional-budget bounds, local links, new-file whitespace and `git diff --check` passed. No fresh application test-suite run is claimed because application source is unchanged.
