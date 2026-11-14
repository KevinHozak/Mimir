# Sharing continuity repair and live goal rerun — 2026-11-13

**Result:** contact continuity is repaired for fresh goal worlds, and a genuine AI-selected goal completed. Sustained S019 qualification remains open because seven later contexts exceeded the existing 16 KiB wire limit and fell back locally before spending.

[Structured evidence](first-glow-goal-sharing-live-2026-11-13.json). [Earlier live run](first-glow-goal-ai-live-2026-11-13.md). [S019](../../issues/MIM-S019.md).

## Repair and verification

`initializeFirstGlowGoals` now selects the existing `sharing-route-continuation-v1` prerequisite for **fresh** goal worlds. After a sharing pause, valid recorded routes/contact ownership resume; invalid plans release only their own reservation. Arrival effects and costs remain authoritative. Normal non-goal defaults and recorded goal histories without the marker keep their earlier behavior. No saved world was upgraded.

An offline 80-pulse check used six Sparks, seed 2, the real default bundle, normal resources and normal RC. Four distinct Sparks received both `explore-mark` and `explore-shape` as feasible choices; a real mark completed. Its injected provider was explicitly fake, with zero remote calls. The gameplay fingerprints matched the subsequent live run.

Validation passed: full build, **229 root tests**, **18 provider/runtime/persistence checks**, and the isolated HTTP/restart regression. New regressions cover ordinary sharing without stranded choosing routes, legacy-history continuation, exact remaining-allocation authorization, durable resumption audit, retained receipts/cap, and refusal to resume unresolved attempts. An initial HTTP startup timeout under concurrent load was addressed with a bounded startup allowance and a successful sequential rerun; no application assertion was bypassed.

## Authorized allocation continuation

The owner requested the repaired rerun using the remaining USD 4.00. The same previously approved fictional payload and Google Vertex destination were retained. The existing manual stop was lifted through `SparkAIBudget.resume`, inside a transaction requiring:

- the unchanged original USD 5 profile/cap;
- an exact USD 4.00 remaining balance;
- spending already stopped and every existing attempt completed;
- an explicit bounded authorization note, retained in `budget_resumptions`.

No reservation, receipt or counter was reset. In-flight/uncertain attempts and exhausted balances cannot be released through this operation. The prior world's file hash and both original receipt rows are unchanged.

## Live setup and outcome

The fresh world is `data/local/mimir-ai-goals-sharing.db`, distinct from the preserved first run. It used the unchanged server-default bundle, seed 2, six Sparks, normal starting resources/RC, fresh sharing-continuation provenance and the existing bounded AI runtime. It reached **360 pulses** within the declared twenty-minute simulation bound; the controller completed in approximately 760 seconds including backup. No map edits, injected encounters, resource grants, fresh-history retagging or deployment occurred.

All **361 checkpoints** were inspected: none contained a Spark in `choosing` with a retained object destination and nonempty route. The previous stranded-contact signature did not recur.

| Live model decision | Recorded intent/reading | Observed outcome |
| --- | --- | --- |
| **Sel / Spark 6, pulse 55** | Chose `explore-mark` from both mark and shard alternatives. Its stated rationale balanced practical help with keeping options open. | Exploration completed at **100**, light mark at **127**. Goal `goal-55-spark-6-5` completed with actual events and receipt **3**. |
| **Rill / Spark 2, pulse 118** | Social interpretation favored `stay-on-trace` to protect readiness and a predictable return. | The interpretation differed from the rules alternative. The cache probe was already the triggering event; this does not prove that AI prevented it or saved resources. |
| **Sel / Spark 6, pulse 303** | Social interpretation favored `enter-wild-cache`, citing independence and the uncertain signal. | The interpretation differed from the rules alternative. It is distinct from the earlier completed goal and is not proof of AI causing the already-recorded probe. |

Sel's goal references `event-100-spark-6-explore` and `event-127-spark-6-mark-trace`. During its active window it consumed 41 charge, drew 48 charge, recovered 78 readiness and moved during 59 pulses. These are observed window totals, not a counterfactual cost attributable solely to AI. Completing a mark does not establish another Spark's use or social benefit.

Across all **18** goals: **6 completed, 7 expired, 5 remained active**. One was AI-selected and seventeen used rules. Mark/shard loops may repeat known activities; they are not automatically novel discoveries. No meeting or new authored region is claimed.

## Remaining context-size gap

There were eight multi-option goal contexts across five Sparks: one accepted AI goal and **seven local pre-reservation rejections**. Reconstructing the saved contexts through the actual wire builder confirms `Spark goal context exceeds wire limit` for every later rejected context. None has a provider receipt, and no remote call or reservation was made for those failures.

The raw contexts were approximately **17–33 KiB**; outgoing relationship material alone grew from roughly **12.5–28.1 KiB** as evidence accumulated. The current 16,384-byte wire cap is working. The context builder needs a bounded relationship/evidence projection; raising the cap or weakening evidence/knowledge checks is not selected work here. Generic `provider-failed-or-timeout` fallback labels currently obscure this local rejection reason.

Consequently, the repair and first live end-to-end goal path passed, while **S019 remains in progress for sustained bounded context construction and clear local rejection telemetry**. These findings do not establish comparative model benefit, population-wide usefulness or human acceptance.

## Reservations, usage and final controls

| Item | Value |
| --- | --- |
| Authorized remaining allocation | USD 4.00 |
| New inference attempts | **3 completed**, no uncertain attempts |
| New retained reservations | **USD 1.50** |
| Allocation remaining unused | **USD 2.50** |
| Recorded usage | 5,774 input tokens; 270 output tokens; zero reasoning tokens reported |
| Application token-cost estimate | **USD 0.002649**, not a final invoice |
| Original allocation cap | USD 5.00, unchanged |
| Cumulative reservations / attempts | USD 2.50 / five completed attempts |
| Final state | Spending stopped; server shut down; no automatic resumption |

Each new inference used the existing token preflight and generation envelope. Reservations are conservative application allocation accounting, not final provider charges or an account-level billing cap. Unused headroom remains behind the persistent stop and requires another explicit authorized continuation.

## Recovery and provenance

Bundle-inclusive backup/restore preserved all **361 checkpoints**, **356 interpretation records**, both real AI social responses, the completed AI goal/receipt, and world receipt scope. Normalized offline continuation matched. An AI-disabled restored server replayed the final history without changing allocation rows.

The original run's world file and first two receipt rows retain their prior hashes. The resumption audit records the exact USD 4.00 authorization, USD 1.00 already reserved and two prior attempts. All **178** frozen source-file fingerprints matched before/after the paid run. No source repair occurred during that run.

Raw plan, source freeze, complete receipts, analysis, context-size diagnosis, backup and restore checks are under `.tmp/s019-sharing-live-qualification-aEzTAt/`; offline feasibility evidence is under `.tmp/s019-sharing-natural-So6TOw/`. No commit, push, hosted deployment or human-review acceptance occurred. S020's larger authored world and S023's deferred finalization remain separate work.
