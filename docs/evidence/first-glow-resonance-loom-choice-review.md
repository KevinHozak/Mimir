# First Glow Resonance-P3 review

This fixed-seed engine fixture uses seed `7` and the authored `tiled-107:rest` Shelter Loom at tick `3`. Two co-present Sparks witness `evidence-1` and can choose either path:

- `yield-rest` costs the actor one charge (or one charge deficit when empty), lowers actor readiness by 2, raises the beneficiary readiness by 10, and records a granted priority.
- `hold-rest` records a refusal, raises actor readiness by 4, lowers beneficiary readiness by 5, and preserves the limited slot for the actor.

Both choices append a deterministic adjustment ledger entry, reciprocal bounded trust evidence, a `shelter-loom-choice` objective event, and a durable decision record. Advancing the resulting states keeps the readiness difference, so the turning point remains visible in later deterministic choices. Private or out-of-place evidence is rejected before any mutation.

The executable review is `packages/engine/src/resonance-loom-choice.test.ts`; it runs through the `@mimir/engine` test command.
