# Surveyed-shard follow-up diagnosis — 2026-11-11

Investigation and one recommendation only. No runtime implementation, commits, publication, live database access or provider calls. Follows the [initial cache preparation evidence](first-glow-initial-cache-preparation-2026-11-11.md). [Structured trace and forecasts](first-glow-shard-follow-up-diagnosis-2026-11-11.json). S001 remains open.

## Finding

Review/12 produces two successful cache surveys, but neither surveying Spark ever selects or completes shape-pattern by pulse 360. Immediate shelter preference interrupts the one-decision cache follow-up. After recovery, that special priority has expired, so unrelated trace marking comes before the surveyed shard. Those marking journeys exhaust the remaining charge and trigger further charge/rest/sharing cycles.

The fact is retained; the follow-up's priority is not. The initial expedition goal is already terminal after the probe, and no public pattern exists to activate pattern-reader preparation. Ordinary discretionary selection checks current need/reachability without budgeting a full shard journey. Both post-survey choices therefore fall between the two existing preparation lifecycles.

This is a **delay beyond the window**, not a permanently broken creation predicate: an unchanged continuation from the recorded pulse-360 state creates the first public pattern at **440**. That later completion is not part of the original 360-pulse result and does not make that result successful retroactively.

## Actual histories and choices

| Evidence | Spark 2 | Spark 3 |
| --- | --- | --- |
| Successful probe | 135 | 156 |
| Resources after probe/arrival: charge / deficit / readiness | 37 / 0 / 73 | 27 / 0 / 74 |
| Next decision | 136: seek shelter, waiting | 157: seek shelter, waiting |
| Shelter preference | Care score 7 and readiness below 90 | Care score 7 and readiness below 90 |
| Surveyed shard at that decision | Free, reachable; cost 16 | Free, reachable; cost 16 |
| First actual shelter recovery | 161 | 183 |
| First later decision without current charge/shelter need | 269 | 209 |
| Resources at that discretionary decision | 1 / 0 / 95 | 4 / 0 / 91 |
| Selected activity | mark-trace | mark-trace |
| Surveyed shard then | Free, reachable; cost 40 | Free, reachable; cost 39 |
| Trace marking completes | 293; 0 charge, deficit 24, readiness 70 | 233; 0 charge, deficit 21, readiness 66 |
| Shape-pattern by 360 | Never selected or completed | Never selected or completed |
| Resources at 360 | 32 / 0 / 49; waiting for shelter | 7 / 0 / 30; traveling to shelter |

The shelter decisions at 136/157 are genuine current preferences, not failed shard access. Both readiness values exceed the generic 70 threshold, but the social care score toward Spark 1 is 7, which prefers shelter below 90. Each then waits for real recovery admission. Sharing also consumes time and charge; no legitimate contact reservation is stranded at the final checkpoint. This diagnosis does not propose suppressing care, sharing or the common recovery queue.

In `chooseAutonomousActivities`, the explicit cache follow-up enters the priority list only while `wildCacheChoice.pulse === state.pulse`, meaning the first decision after that arrival. Charge and shelter priorities precede it. After that decision, it expires even if the selected recovery leg is still waiting or traveling. Generic mark-trace then precedes generic shape-pattern. Both Sparks retain their actual survey's route fact, and neither had previously learned mark-trace or shape-pattern at the measured discretionary choice.

The first discretionary choice is not another cache retry: it concerns completing the already surveyed route at `tiled-104`. Initial preparation is disabled after a cache choice; pattern preparation requires an encountered public artifact. Neither prepares this remaining shard leg.

## Creation gates and the pulse window

No public pattern is being silently rejected after these Sparks complete shaping: they never generate a shape completion by 360. The region's only earlier shape completion is Spark 12 at **114**, before either successful survey and without the required cache route fact; it correctly creates no surveyed-route artifact. Zero patterns is well below the 64-artifact cap, and navigation revision remains 0.

An **unmodified**, offline continuation from the actual pulse-360 state first creates `route-pattern-spark-3-440`. Its source references are the actual **156 survey** and **440 shape completion**. This confirms that the fact survives and that the existing creation rule can succeed later. Spark 3 finishes that later activity with **zero charge, deficit 11 and readiness 78**. It is a real recorded artifact, but not evidence that the later journey was fully supplied or that another Spark reused it. No new policy or resource was inserted into that continuation.

## Why priority alone is insufficient

At pulse 209, Spark 3 has 4 charge for a 20-pulse shard leg (19 prior moving pulses plus the arrival/activity pulse). At 269, Spark 2 has 1 charge for the same 20 charged/strained pulses. A direct priority swap, without more recovery, projects **16 and 19 new deficit**, respectively. Those are arithmetic projections, not executed alternative histories. Making the artifact appear earlier by ignoring that shortfall would not demonstrate resource-aware continuation.

Diagnostic resource forecasts from the **actual** pre-detour snapshots find a bounded alternative for each: four real pool draws (32 stock) followed by three real rests, then the surveyed shard. Forecasts use existing movement, draw, rest, deficit and once-per-pulse activity accounting. No future stock production, gifts, readiness above 100 or free movement is assumed.

| Conditional forecast | Spark 3 at 209 | Spark 2 at 269 |
| --- | ---: | ---: |
| Current source stock | 416 | 544 |
| Additional recovery actions | 7 | 7 |
| Drawn from current stock | 32 | 32 |
| Projected shard departure: charge / deficit / readiness | 19 / 0 / 94 | 19 / 0 / 98 |
| Projected shape completion: charge / deficit / readiness | 0 / 0 / 75 | 0 / 0 / 79 |
| Recovery plus shard travel time, with immediate access | 51 pulses | 51 pulses |
| Initial actions already spent | 10 | 11 |

These fit within the remaining original 64-action allowance in both cases. With immediate access the projected completion pulses would be 259 and 319, inside the window. **These are conditional feasibility forecasts, not executed histories or promised completion dates.** Future recovery contacts, shard access, source competition, sharing and the creation-time cache gate remain authoritative. The diagnostic treats recovery occupancy conditionally, exactly as existing recovery forecasting does; it reserves nothing. The readiness-at-departure criterion of 90 respects the observed care preference and is a diagnostic funding criterion, not a claim that shaping currently has a new readiness gate.

## One focused recommendation

Add a **fresh-versioned, bounded survey-to-shard continuation phase**, rather than ending all expedition planning at the successful probe. Bind it to the actual survey, its specific shard and navigation revision. Retain that objective through current-need recovery and sharing; when it can proceed, resume it before unrelated discretionary trace marking. Use real, bounded recovery to fund the remaining shard leg instead of merely changing the priority order. Recheck actual resources, navigation and free contacts at dispatch; defer when access or a bounded itinerary is unavailable.

This is one lifecycle extension of the expedition goal, not a general priority reorder or a resource bonus. Preserve the current care/charge priorities, actual accounting, queue fairness, cache probe gates, separate pattern-retry authorization, and authoritative shard completion/creation checks. Do not reserve future contacts, invent a route fact or retroactively shape a pattern. Terminate on actual validated completion, explicit invalidation or the finite preparation bound; a forecast is not success. Existing histories must retain their selected policy, and a changed lifecycle must be an explicit fresh opt-in, not an in-place reinterpretation of `initial-cache-preparation-v1`.

The next implementation's acceptance should measure actual post-probe recovery and shard completion from fresh constructors, including contention and sharing, unchanged absent-policy continuations, and all six ordinary windows. It should retain explicit deferral for infeasible trips and keep natural reuse/human review separate. This investigation does not claim that such a planner already exists or that either forecast would execute unchanged in the shared world.

## Verification and sources

- Fresh, unmodified review/12 reconstruction with the same seed, world ID, immutable bundle and seven opt-ins matches the entire recorded pulse-360 JSON-state SHA-256 exactly: `5c6df989bdaacf19bd71a21f541f88ac8bd30ba2325895e55be4ebc68f4c241b`.
- Six owning source hashes match the preceding implementation evidence. No engine, test, server or ordinary-run script was edited for this investigation.
- Original raw history: `.tmp/route-patterns-initial-preparation-ordinary-s8wAMU/review-12.json`.
- Replay, actual pre-detour snapshots and conditional budgets: `.tmp/shard-follow-up-N4h6h0/`; harnesses `.tmp/shard-follow-up-diagnosis.mjs` and `.tmp/shard-follow-up-budget.mjs`.
- Unchanged later continuation: `.tmp/shard-follow-up-extension.json`, stopped at the first pattern at 440.
- Owning behavior: `first-glow-actions.ts` current-need and one-decision follow-up priorities; `first-glow-initial-cache-preparation.ts` terminal probe outcome; `first-glow-pattern-preparation.ts` pattern-bound preparation and resource math; `first-glow-route-patterns.ts` actual survey-plus-shard creation; `structured.ts` contacts, authoritative arrival and movement; `first-glow-social.ts` care score.

Investigation checks cover replay equality, unchanged source hashes, structured result consistency, local links, new-file whitespace and `git diff --check`. No fresh application test-suite run is claimed because gameplay source is unchanged.
