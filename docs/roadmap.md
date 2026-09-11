# Mimir Current Roadmap

**Current runtime:** The Living Circuit / **The First Glow**. This is the only supported runtime: schema-3 world bundles, `mimir-sim-v3-first-glow`, and `structured-v2`. Sparks—not villagers—explore charge pools, shelter niches, traces, and informal cooperation. The removed village prototype, Hearthmere, First Winter, food economy, and old save paths are historical; do not revive, relabel, or migrate them.

This is the current delivery order. It complements the dated planning documents rather than rewriting their history. Completed functionality is grouped in the [Changelog](changelog.md). For selected setting and visual direction, read [World Theme](world-theme.md); for implemented behavior, read [Current Architecture](architecture.md).

## Next non-hosting delivery sequence

No non-hosting implementation gate is currently scheduled. Resonance-P1 through P5 are merged with their fixed evidence and recorded in the [Changelog](changelog.md). The Hearth Circuit remains a future transition contract, not a second active runtime; selecting a later First Glow workstream requires an explicit new delivery decision.

## Next hosted-observer sequence

Hosted-P1 through Hosted-P4 are complete and recorded in the [Changelog](changelog.md). The remaining hosted-observer work is intentionally separate from First Glow feature selection:

| Phase | Issue | Status |
| --- | --- | --- |
| Hosted-P5 | [Validate independent hosted backup and recovery](https://github.com/KevinHozak/Mimir/issues/117) | In review; independent bucket, keyless access boundary, hosted transfer, fresh restore, and integrity failure evidence are recorded. |
| Hosted-P6 | [Validate durable hosted-observer readiness after local seasons are compelling](https://github.com/KevinHozak/Mimir/issues/53) | In review; private hosted-observer readiness, restart continuity, token protection, and short-season evidence are recorded. Public exposure and durable production hosting remain unproven. |

## Non-negotiable gates

- The server alone commits outcomes; browser animation and art never invent state.
- Fixed inputs produce the same committed history. Objective events, Spark-local knowledge, and interpretations remain separate records.
- Edit authored Tiled sources or importer code, then regenerate and validate bundles. Hash-named bundles are immutable, including for historical replay.
- Treat SQLite runtime data, backups, and test outputs as isolated artifacts. Hosted operation remains single-writer until persistence architecture changes deliberately.

## Historical context

The retired Simulation Game Plan and Web Development Plan described the original village-era proposal, including villagers, food, Hearthmere, First Winter, and paths no longer supported. Their essential intent is preserved in [Project History](history.md). Use this roadmap, the [Changelog](changelog.md), [World Theme](world-theme.md), and [Current Architecture](architecture.md) for ongoing work.
