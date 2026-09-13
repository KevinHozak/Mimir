# AI-P19 determinant review runbook

AI-P19 compares two deterministic ways to assign the First Glow powers-of-two
decision budget: readiness/capacity and age/progression. Neither determinant is
chosen by provider output.

## Control run

```text
npm run ai-p19:determinant-review
npm run ai-p19:determinant-review:test
```

The default run uses the local fake provider, fixed seeds `2`, `4`, `8`, and
`16`, 32 encounters per seed, and a 64-tick day. It compares both profiles,
records cadence gaps and suppression reasons, stages proposals against the
rules-only baseline, checks per-Spark downstream effects, and verifies
provider-free replay. Results are written under `.tmp/`.

The current fixture maps both candidates to the same ladder (`2`, `4`, `8`,
`16`). A control result that reports behavioral equivalence must defer selecting
a determinant until a later fixture varies determinant state rather than
pretending the matched result proves one model superior.

## Live Vertex arm

The live arm is private, operator-authorized, and disabled by default. It uses
the existing Vertex/Gemini 2.5 Flash-Lite contract, the 16-global interpretation
budget, the $1.00 aggregate hard cap, the enabled kill switch, Spark-local
context only, and review-artifact retention. Set the runtime-only configuration
and `MIMIR_AI_P19_LIVE=true` before execution; never commit credentials or the
machine-readable per-encounter report.

The live report must include per-Spark opportunities, cadence gaps, suppression
reasons, recorded interpretations, fallbacks, useful interpretations,
downstream changes, latency, cost, fairness indicators, and provider-free
replay. It must end in determinant selection, defer, or stop. No public or
unbounded calls, canonical AI writes, deployment, or historical replay calls
are permitted.

## Selected next direction: Reflection capacity (planned)

World development age sets Reflection capacity (RC): First Glow has baseline
RC 2, with rare Hero Sparks at RC 4. Personal age does not increase RC; lived
memories influence reflection content. Readiness remains the rest attribute.
This supersedes the earlier personal-age growth proposal. See the selected
[Reflection capacity plan](reflection-capacity-plan.md) and RC-P1 through RC-P5.

Space opportunities across the configured day using day ticks divided by
budget. On a tier change, schedule future windows without granting a burst
or catch-up debt. Preserve deterministic offsets, global caps, and replay.
AI chooses an intention; deterministic rules execute actions and attribute,
resource, and social effects. This broader intention loop remains planned.

Validate staggered births, world-age transitions, Hero exceptions, and save/replay
across multiple days. Compare all-RC-2 groups with one RC-4 Hero, rotating the
Hero identity; use fixed budgets 2/4/8/16 as diagnostics. Record rules choice, AI choice, direct effects,
and later accumulated differences separately; assess coherent behavior and
cost rather than treating disagreement alone as improvement.

Selected vocabulary: **Reflection capacity (RC)** for the daily choice allowance
and **reflection** for an opportunity to choose or reconsider an intention.
