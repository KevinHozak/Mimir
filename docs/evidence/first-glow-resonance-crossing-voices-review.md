# First Glow Resonance-P4 review

The fixed-seed review uses seed `11` and the authored relay crossing `tiled-103` at tick `16`. The contrasting candidate is formed only from three ordered objective records (`meet`, `mark-trace`, and `explore`) involving at least three Sparks, with four or more charge cost and a bounded tick span.

At the formed Anchor, the witnessing Spark has two defensible paths:

- `follow-signal` spends one charge (or records one deficit), lowers readiness by two, and changes the next intended activity to exploration.
- `hold-course` spends the same explicit practice cost, raises readiness by two, and changes the next intended activity to seeking charge on the known course.

The engine fixture verifies both paths remain deterministic and durable while preserving objective evidence and the local knowledge boundary. The observer renders the formation evidence, the Anchor's tension, and each committed aftermath without selecting a winning value system.

Executable review: `packages/engine/src/resonance-crossing.test.ts`.
