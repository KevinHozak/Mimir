# Mimir Current Roadmap

**Current runtime:** The Living Circuit / **The First Glow**. This is the only supported runtime: schema-3 world bundles, `mimir-sim-v3-first-glow`, and `structured-v2`. Sparks—not villagers—explore charge pools, shelter niches, traces, and informal cooperation. The removed village prototype, Hearthmere, First Winter, food economy, and old save paths are historical; do not revive, relabel, or migrate them.

This is the current delivery order. It complements the dated planning documents rather than rewriting their history. Completed functionality is grouped in the [Changelog](changelog.md). For selected setting and visual direction, read [World Theme](world-theme.md); for implemented behavior, read [Current Architecture](architecture.md).

## Next non-hosting delivery sequence

No non-hosting implementation gate is currently scheduled. Resonance-P1 through P5 are merged with their fixed evidence and recorded in the [Changelog](changelog.md). The Hearth Circuit remains a future transition contract, not a second active runtime; selecting a later First Glow workstream requires an explicit new delivery decision.

### AI-P1 decision: defer external interpretation

The bounded external-interpretation adapter is deferred. The completed comparison established a useful deterministic rules-only baseline and a local-fake-provider harness, but it did not establish that a provider improves observable choices or evidence-grounded understanding enough to justify runtime complexity, privacy exposure, reliability risk, or spend. The rules-only baseline therefore remains the product path and the only normal-operation path.

The local fake provider is an offline evaluation fixture, not an external service and not evidence of provider readiness. Historical playback remains provider-free, and deterministic fallback remains mandatory for invalid or unsupported proposals, timeouts, budget exhaustion, and unavailable evaluation inputs.

Reconsidering this decision requires a separately authorized, isolated evaluation only: no credentials or paid calls by implication; an explicit provider/model, privacy and retention review; a hard experiment budget cap; operator kill switch and usage telemetry; and a preregistered matched comparison against rules-only. The provider would need to improve a defined observer-facing measure of evidence-grounded understanding and change plausible downstream choices, not merely produce more fluent narration, without violating Spark knowledge boundaries or replay determinism. Until that evidence exists, no later provider implementation phase is scheduled.

## Next hosted-observer sequence

Hosted-P1 through Hosted-P6 are complete and recorded in the [Changelog](changelog.md). The private, single-writer staging observer has independently recovered a bundle-inclusive backup and completed a restart-continuity season; it is not public or durable production hosting. The following sequence must preserve that boundary until its explicit decision and validation gates pass:

| Phase | Issue | Status |
| --- | --- | --- |
| Hosted-P7 | [Define the public observer operating contract](https://github.com/KevinHozak/Mimir/issues/122) | Selected decision gate. It defines a public-access model or explicitly defers it; it creates no public resource or credential. |
| Hosted-P8 | [Automate independent bundle-inclusive backup replication and freshness checks](https://github.com/KevinHozak/Mimir/issues/123) | Follows the P7 operating contract; preserves keyless, separate-project recovery and proves freshness by restore evidence. |
| Hosted-P9 | [Implement the approved public read-only observer boundary](https://github.com/KevinHozak/Mimir/issues/124) | Requires P7 approval. It cannot expose owner operations, put an owner secret in the browser, or add a second writer. |
| Hosted-P10 | [Validate the limited public observer release and durable operations](https://github.com/KevinHozak/Mimir/issues/125) | Requires P8 automated recovery evidence and P9's approved public boundary before a production-readiness decision. |

## Non-negotiable gates

- The server alone commits outcomes; browser animation and art never invent state.
- Fixed inputs produce the same committed history. Objective events, Spark-local knowledge, and interpretations remain separate records.
- Edit authored Tiled sources or importer code, then regenerate and validate bundles. Hash-named bundles are immutable, including for historical replay.
- Treat SQLite runtime data, backups, and test outputs as isolated artifacts. Hosted operation remains single-writer until persistence architecture changes deliberately.

## Historical context

The retired Simulation Game Plan and Web Development Plan described the original village-era proposal, including villagers, food, Hearthmere, First Winter, and paths no longer supported. Their essential intent is preserved in [Project History](history.md). Use this roadmap, the [Changelog](changelog.md), [World Theme](world-theme.md), and [Current Architecture](architecture.md) for ongoing work.
