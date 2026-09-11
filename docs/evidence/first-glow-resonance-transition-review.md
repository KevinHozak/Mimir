# First Glow Resonance-P5 transition review

This review validates the design contract for a future Hearth Circuit transition. It does not activate a Hearth
Circuit runtime, formal institutions, markets, credits, or a new server endpoint.

## Fixed evidence

The engine test uses deterministic First Glow inputs and a fixed world seed (`11`) for carry-forward inspection.
Two 24-tick maintenance windows preserve both active Anchor kinds: Shelter Loom and Crossing of Voices. Each window
contains three objective evidence event IDs and one recorded practice decision. The resulting six evidence events,
two decisions, and two maintained seasons produce an `eligible` result without ranking either practice as morally
correct.

The same evaluator with one active Anchor and one window produces `deferred`. That is still a valid First Glow
story, with no penalty or fabricated failure state.

## Carry-forward boundary

The schema-1 candidate carries source world and timeline IDs, simulation/spatial versions, content-addressed bundle
hashes, Sparks and their current resource/readiness values, relationships, commitments, objective and interpretation
records, Anchor places and evidence, and unresolved tensions. These references keep replay grounded in committed
source state. A future implementation proposal must define any active Hearth Circuit runtime separately.
