# AI-P19 determinant control

This evidence is produced by `scripts/first-glow-ai-p19-determinant-review.mjs`
with the local deterministic provider. It compares readiness-tier and age-day
profiles over the same fixed seeds, encounters, cadence rules, staging path,
and replay checks.

The two current mappings both produce the same budget vector, `2, 4, 8, 16`.
Therefore the control validates the comparison machinery and safety boundaries
but cannot select readiness over age. A live Vertex arm remains separately
authorized, and a determinant-varying fixture is required before selection.

Both arms produced 39 recorded control interpretations, 19 useful staged
changes, 19 changed choices, and 100 downstream staging changes. Both preserved
cadence spacing, avoided universal dominance by the highest-budget Spark, and
passed provider-free replay and authority checks.
