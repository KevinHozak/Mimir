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

## Selected next direction: age-based growth (planned)

Use elapsed simulation age to increase each Spark's choice budget through
2, 4, 8, and 16. Persist a birth/spawn tick and derive age from committed ticks;
advance age during the run rather than assigning a fixed age label. Initial
thresholds of 0, 2, 4, and 8 simulation days are candidates for testing, not
final balance values. Readiness remains the existing rest/activity attribute.

Space opportunities across the configured day using day ticks divided by
budget. On a tier change, schedule future windows without granting a burst
or catch-up debt. Preserve deterministic offsets, global caps, and replay.
AI chooses an intention; deterministic rules execute actions and attribute,
resource, and social effects. This broader intention loop remains planned.

Validate staggered births, exact age thresholds, tier changes, and save/replay
across multiple days. Compare the same scenarios at fixed budgets 2/4/8/16
against age-based growth. Record the rules choice, AI choice, direct effects,
and later accumulated differences separately; assess coherent behavior and
cost rather than treating disagreement alone as improvement.

Naming proposal: **reflection capacity** for the daily choice allowance,
**reflection** for an opportunity to choose or reconsider an intention, and
**maturation** for its growth with age. These names await user selection.
