# Mimir Current Roadmap

**Current runtime:** The Living Circuit / **The First Glow**. This is the only supported runtime: schema-3 world bundles, `mimir-sim-v3-first-glow`, and `structured-v2`. Sparks—not villagers—explore charge pools, shelter niches, traces, and informal cooperation. The removed village prototype, Hearthmere, First Winter, food economy, and old save paths are historical; do not revive, relabel, or migrate them.

This is the current delivery order. It complements the dated planning documents rather than rewriting their history. For selected setting and visual direction, read [World Theme](world-theme.md); for implemented behavior, read [Current Architecture](architecture.md).

| Gate | Current work | Status |
| --- | --- | --- |
| 1 | [Author First Glow social scenarios and Spark cards](https://github.com/KevinHozak/Mimir/issues/48) | Done — merged in [PR #62](https://github.com/KevinHozak/Mimir/pull/62). |
| 1a | [Present First Glow social scenarios in the observer](https://github.com/KevinHozak/Mimir/issues/63) | Done — merged in [PR #64](https://github.com/KevinHozak/Mimir/pull/64). |
| 2 | [Model Spark-local knowledge, trust, and commitments](https://github.com/KevinHozak/Mimir/issues/50) | Ready. Deterministic, replayable social state; no hidden knowledge. |
| 3 | [Make choices and consequences explainable in the observer](https://github.com/KevinHozak/Mimir/issues/49) | Ready after Gate 2. Show committed evidence, knowledge, choice, and consequence without exposing private state. |
| 4 | [Establish the season experiment and review loop](https://github.com/KevinHozak/Mimir/issues/51) | Ready after Gates 2–3. Use fixed seeds and preserved evidence to decide what to deepen, simplify, or clarify. |
| 5 | [Evaluate bounded AI interpretation](https://github.com/KevinHozak/Mimir/issues/52) | Backlog. Compare against the rules-only baseline; never make AI the authority for outcomes. |
| 6 | [Validate durable hosted-observer readiness](https://github.com/KevinHozak/Mimir/issues/53) | Backlog. Requires compelling local seasons plus backup/restore and single-writer operational evidence. |
| 7 | [Build reusable art-production tools and skills](https://github.com/KevinHozak/Mimir/issues/61) | Backlog. Establish consistent, inspectable, licensed source-to-render art workflow first. |
| 8 | [Define the First Glow art bible and asset pipeline](https://github.com/KevinHozak/Mimir/issues/55) | Backlog. Lock the blue-and-silver, near-black visual system and provenance conventions. |
| 9 | [Build a polished graphics vertical slice](https://github.com/KevinHozak/Mimir/issues/54) | Backlog. Improve a real First Glow scene while preserving geometry and interaction truth. |
| 10–12 | [Spark readability](https://github.com/KevinHozak/Mimir/issues/57), [atmosphere](https://github.com/KevinHozak/Mimir/issues/56), and [observer UI art pass](https://github.com/KevinHozak/Mimir/issues/58) | Backlog. Add identity, restrained effects, and readable dark-mode UI only after the vertical slice. |
| 13 | [Validate art performance, accessibility, and recovery](https://github.com/KevinHozak/Mimir/issues/59) | Backlog. Test desktop/mobile rendering, reduced motion, and historical bundle recovery. |
| 14 | [Expand through a meaningful second area](https://github.com/KevinHozak/Mimir/issues/60) | Backlog. Add a new First Glow decision space only after the earlier social and visual gates hold. |

## Non-negotiable gates

- The server alone commits outcomes; browser animation and art never invent state.
- Fixed inputs produce the same committed history. Objective events, Spark-local knowledge, and interpretations remain separate records.
- Edit authored Tiled sources or importer code, then regenerate and validate bundles. Hash-named bundles are immutable, including for historical replay.
- Treat SQLite runtime data, backups, and test outputs as isolated artifacts. Hosted operation remains single-writer until persistence architecture changes deliberately.

## Historical context

The retired Simulation Game Plan and Web Development Plan described the original village-era proposal, including villagers, food, Hearthmere, First Winter, and paths no longer supported. Their essential intent is preserved in [Project History](history.md). Use this roadmap, [World Theme](world-theme.md), and [Current Architecture](architecture.md) for ongoing work.
