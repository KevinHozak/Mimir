# S022 comparison of recorded ordinary-play histories

At the same pulse cutoff, the online pilot recorded 35 completed goals and three distinct physical meetings credited to goals. Each of the three prior six-Spark S019 histories recorded three to six completed goals and zero goal-linked meetings. The online pilot also had four active goals with no completed steps. This comparison describes what happened in the recorded worlds. It cannot isolate what the model contributed.

The comparison includes all three documented S019 ordinary-play goal histories from November 13, including the first run with no accepted AI goal selections. Each stored world used seed 2 and has a checkpoint at pulse 293. The common cutoff keeps later local activity out of the comparison. The local runs' published pulse-360 totals are shown separately. The local records used different goal policies, and the online pilot added Sparks and changed operating policies during its run.

| History at pulse 293 | Sparks | Goals | Completed | Active | Active with zero completed steps | Interrupted | Distinct goal-linked meetings |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| [Initial S019](first-glow-goal-ai-live-2026-11-13.md) | 6 | 11 | 3 | 4 | 2 | 4 | 0 |
| [Sharing-safe S019](first-glow-goal-sharing-live-2026-11-13.md) | 6 | 17 | 6 | 6 | 2 | 5 | 0 |
| [Compact-context S019](first-glow-goal-context-live-2026-11-13.md) | 6 | 18 | 5 | 6 | 3 | 7 | 0 |
| [Recovered online pilot](s022-pulse-293-offline-evaluation-2026-11-20.md) | 12 | 44 | 35 | 6 | 4 | 3 | 3 |

The common-cutoff AI-selected goal counts are 0, 1, 3, and 24, respectively. All four histories include rules-selected goals. The prior local histories still contained unfinished and expired goals at pulse 360. Their completed, active and expired totals were respectively **3 / 4 / 4**, **6 / 5 / 7**, and **6 / 6 / 7**. The pilot stopped at pulse 293.

“Active with zero completed steps” marks a lack of completed steps by the cutoff. A Spark can still be preparing, traveling or recovering. All interruptions in the local histories at pulse 293 were recorded as goal expirations. The online pilot had one goal expiration, one meeting-window expiration, and one interruption after observing a project already complete. Those distinct outcomes matter when deciding whether a goal failed to find a partner, ran out of time, or became unnecessary.

The three pilot meeting events occurred at pulses 101, 211, and 287. Their recorded event IDs are `event-101-spark-4-meet-spark-5`, `event-211-spark-2-meet-spark-6`, and `event-287-spark-10-meet-spark-9`. Four goal-step receipts refer to those three unique events. Counting the receipts directly would double-count a meeting. The earlier histories had zero meetings **credited as goal steps**. This measure does not cover every form of social contact or cooperation.

All four databases passed SQLite quick checks in read-only mode. The analysis read each exact checkpoint, counted stored goal statuses, and checked every completed step against its timeline event ID and pulse. The online ledger reconciliation and the remaining charge uncertainty are documented in the pulse-293 report. The local reads added no spend.

The comparison is descriptive. Equal seeds and cutoffs do not match the bundle, population across time, goal rules, or AI admission and availability. Model-benefit testing remains a separate question. The owner elected to skip the S023 human review, so this evaluation records no new human acceptance or interest result.

Related records [S022](../../issues/MIM-S022.md) and [S023](../../issues/MIM-S023.md).
