# Mimir Current Roadmap

**Current runtime:** The Living Circuit / **The First Glow**. This is the only supported runtime: schema-3 world bundles, `mimir-sim-v3-first-glow`, and `structured-v2`. Sparks—not villagers—explore charge pools, shelter niches, traces, and informal cooperation. The removed village prototype, Hearthmere, First Winter, food economy, and old save paths are historical; do not revive, relabel, or migrate them.

This is the current delivery order. It complements the dated planning documents rather than rewriting their history. Completed functionality is grouped in the [Changelog](changelog.md). For selected setting and visual direction, read [World Theme](world-theme.md); for implemented behavior, read [Current Architecture](architecture.md).

## Next non-hosting delivery sequence

**Resonance-P4** is the current bounded First Glow delivery gate. It must preserve the completed evidence boundaries. Finished Audio, Living Stories, and Resonance-P1 work is recorded in the [Changelog](changelog.md).

The following **Resonance** workstream turns durable, repeated social patterns into evidence-first places only after the Living Stories gate supports it. Resonance-P5 is now the active bounded gate; its transition contract is design-only and deferred transitions remain valid First Glow stories.

| Phase | Current work | Status |
| --- | --- | --- |
| Resonance-P2 | [Introduce the Shelter Loom as the first real Anchor](https://github.com/KevinHozak/Mimir/issues/86) | In review; authored placement, server-committed Anchor record, and deterministic failure paths are implemented. |
| Resonance-P3 | [Give the Shelter Loom a bounded social possibility and tension](https://github.com/KevinHozak/Mimir/issues/87) | In review; server-committed yield/hold rest choices now produce distinct durable resource, trust, and readiness consequences. |
| Resonance-P4 | [Validate a contrasting Anchor without a designated winner](https://github.com/KevinHozak/Mimir/issues/88) | In review; the authored relay crossing now forms a distinct Crossing of Voices Anchor with witnessed follow/hold consequences. |
| Resonance-P5 | [Earn the Hearth Circuit transition through maintained Anchors](https://github.com/KevinHozak/Mimir/issues/89) | In review; replayable eligibility and carry-forward design only, not a new active runtime. |

Hosted-observer work remains intentionally separate from this sequence: [Hosted-P1](https://github.com/KevinHozak/Mimir/issues/3) is complete, [Hosted-P2](https://github.com/KevinHozak/Mimir/issues/18) has production-preview evidence in [the dated profile](evidence/2026-09-11-first-glow-production-profile.md) and is in review, and [Hosted-P3](https://github.com/KevinHozak/Mimir/issues/53) remains deferred until the user explicitly chooses to resume hosting.

## Non-negotiable gates

- The server alone commits outcomes; browser animation and art never invent state.
- Fixed inputs produce the same committed history. Objective events, Spark-local knowledge, and interpretations remain separate records.
- Edit authored Tiled sources or importer code, then regenerate and validate bundles. Hash-named bundles are immutable, including for historical replay.
- Treat SQLite runtime data, backups, and test outputs as isolated artifacts. Hosted operation remains single-writer until persistence architecture changes deliberately.

## Historical context

The retired Simulation Game Plan and Web Development Plan described the original village-era proposal, including villagers, food, Hearthmere, First Winter, and paths no longer supported. Their essential intent is preserved in [Project History](history.md). Use this roadmap, the [Changelog](changelog.md), [World Theme](world-theme.md), and [Current Architecture](architecture.md) for ongoing work.
