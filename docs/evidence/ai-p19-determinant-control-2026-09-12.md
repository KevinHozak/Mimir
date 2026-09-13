# AI-P19 determinant control

This evidence is produced by `scripts/first-glow-ai-p19-determinant-review.mjs`
with the private, bounded Vertex provider. It compares readiness-tier and age-day
profiles over the same fixed seeds, encounters, cadence rules, staging path,
and replay checks.

The two current mappings both produce the same budget vector, `2, 4, 8, 16`.
Therefore the control validates the comparison machinery and safety boundaries
but cannot select readiness over age. A determinant-varying fixture is required
before selection.

Readiness produced 29 recorded interpretations, 15 useful staged changes, 15
changed choices, 103 downstream staging changes, 38 provider calls, and $0.0030403
of cost. Age produced 31 recorded interpretations, 17 useful staged changes, 17
changed choices, 98 downstream staging changes, 39 provider calls, and $0.0030561
of cost. Both preserved cadence spacing, avoided universal dominance by the
highest-budget Spark, and passed provider-free replay and authority checks.

Cost correction: the report's `costCents` values are cents, not dollars.
The combined reported estimate is 0.60964 cents = $0.0060964 (about $0.0061),
or 0.60964% of the $1.00 cap. This is report telemetry, not a reconciled invoice.
The numeric JSON cost fields remain unchanged.

The static matched profiles do not establish a causal advantage for age or
readiness. Downstream counts include persistent differences in cumulative
staged state; they are not independent effects attributable to each Spark.

The user selected world-age Reflection capacity for future implementation:
First Glow RC 2, rare Hero Sparks RC 4; personal experience informs memories
without directly increasing RC. This supersedes personal-age budget growth.
It is a design decision, not a winner established by this experiment.
See the [RC development plan](../reflection-capacity-plan.md).
