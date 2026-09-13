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
changed choices, 103 downstream staging changes, 38 provider calls, and $0.30403
of cost. Age produced 31 recorded interpretations, 17 useful staged changes, 17
changed choices, 98 downstream staging changes, 39 provider calls, and $0.30561
of cost. Both preserved cadence spacing, avoided universal dominance by the
highest-budget Spark, and passed provider-free replay and authority checks.
