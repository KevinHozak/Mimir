# Mimir Current Roadmap

**Current runtime:** The Living Circuit / **The First Glow**. This is the only supported runtime: schema-3 world bundles, `mimir-sim-v3-first-glow`, and `structured-v2`. Sparks—not villagers—explore charge pools, shelter niches, traces, and informal cooperation. The removed village prototype, Hearthmere, First Winter, food economy, and old save paths are historical; do not revive, relabel, or migrate them.

This is the current delivery order. It complements the dated planning documents rather than rewriting their history. Completed functionality is grouped in the [Changelog](changelog.md). For selected setting and visual direction, read [World Theme](world-theme.md); for implemented behavior, read [Current Architecture](architecture.md).

## Next non-hosting delivery sequence

No non-hosting implementation gate is currently scheduled. Resonance-P1 through P5 are merged with their fixed evidence and recorded in the [Changelog](changelog.md). The Hearth Circuit remains a future transition contract, not a second active runtime; selecting a later First Glow workstream requires an explicit new delivery decision.

## Next hosted-observer sequence

Hosted-P1 through Hosted-P6 are complete and recorded in the [Changelog](changelog.md). The private, single-writer staging observer has independently recovered a bundle-inclusive backup and completed a restart-continuity season; it is not public or durable production hosting. The following sequence must preserve that boundary until its explicit decision and validation gates pass:

| Phase | Issue | Status |
| --- | --- | --- |
| Hosted-P7 | [Define the public observer operating contract](https://github.com/KevinHozak/Mimir/issues/122) | **Decision: defer public exposure.** Keep the staging observer private and create no public resource or credential. |
| Hosted-P8 | [Automate independent bundle-inclusive backup replication and freshness checks](https://github.com/KevinHozak/Mimir/issues/123) | Next actionable phase. It improves private-hosting durability while preserving keyless, separate-project recovery and proving freshness by restore evidence. |
| Hosted-P9 | [Implement the approved public read-only observer boundary](https://github.com/KevinHozak/Mimir/issues/124) | Deferred until a later explicit go decision. If reopened, it must expose only bounded reads, no owner operations or browser-held owner secret, and no second writer. |
| Hosted-P10 | [Validate the limited public observer release and durable operations](https://github.com/KevinHozak/Mimir/issues/125) | Deferred with P9; requires P8 recovery evidence and a later approved public boundary before any production-readiness decision. |

### Hosted-P7 decision

As of 2026-09-11, Mimir defers public exposure. The intended future audience is a limited, read-only observer, but there is not yet enough operational evidence to justify making the staging VM public or creating another public hosting surface. The current private IAP-only observer remains the supported hosted experience.

P8 may proceed because independent, bundle-inclusive recovery strengthens the private deployment regardless of whether public access is later approved. P9 and P10 remain deferred until a future decision rechecks pricing, free-tier eligibility, privacy, support capacity, and the recovery evidence, then explicitly authorizes a bounded public read-only model.

## Non-negotiable gates

- The server alone commits outcomes; browser animation and art never invent state.
- Fixed inputs produce the same committed history. Objective events, Spark-local knowledge, and interpretations remain separate records.
- Edit authored Tiled sources or importer code, then regenerate and validate bundles. Hash-named bundles are immutable, including for historical replay.
- Treat SQLite runtime data, backups, and test outputs as isolated artifacts. Hosted operation remains single-writer until persistence architecture changes deliberately.

## Historical context

The retired Simulation Game Plan and Web Development Plan described the original village-era proposal, including villagers, food, Hearthmere, First Winter, and paths no longer supported. Their essential intent is preserved in [Project History](history.md). Use this roadmap, the [Changelog](changelog.md), [World Theme](world-theme.md), and [Current Architecture](architecture.md) for ongoing work.
