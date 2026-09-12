# Mimir Current Roadmap

**Current runtime:** The Living Circuit / **The First Glow**. This is the only supported runtime: schema-3 world bundles, `mimir-sim-v3-first-glow`, and `structured-v2`. Sparks—not villagers—explore charge pools, shelter niches, traces, and informal cooperation. The removed village prototype, Hearthmere, First Winter, food economy, and old save paths are historical; do not revive, relabel, or migrate them.

This is the current delivery order. It complements the dated planning documents rather than rewriting their history. Completed functionality is grouped in the [Changelog](changelog.md). For selected setting and visual direction, read [World Theme](world-theme.md); for implemented behavior, read [Current Architecture](architecture.md).

## Next non-hosting delivery sequence

No non-hosting implementation gate is currently scheduled. Resonance-P1 through P5 are merged with their fixed evidence and recorded in the [Changelog](changelog.md). The Hearth Circuit remains a future transition contract, not a second active runtime; selecting a later First Glow workstream requires an explicit new delivery decision.

### AI-P1 decision: defer external interpretation

The bounded external-interpretation adapter is deferred. The completed comparison established a useful deterministic rules-only baseline and a local-fake-provider harness, but it did not establish that a provider improves observable choices or evidence-grounded understanding enough to justify runtime complexity, privacy exposure, reliability risk, or spend. The rules-only baseline therefore remains the product path and the only normal-operation path.

The local fake provider is an offline evaluation fixture, not an external service and not evidence of provider readiness. Historical playback remains provider-free, and deterministic fallback remains mandatory for invalid or unsupported proposals, timeouts, budget exhaustion, and unavailable evaluation inputs.

Reconsidering this decision requires a separately authorized, isolated evaluation only: no credentials or paid calls by implication; an explicit provider/model, privacy and retention review; a hard experiment budget cap; operator kill switch and usage telemetry; and a preregistered matched comparison against rules-only. The provider would need to improve a defined observer-facing measure of evidence-grounded understanding and change plausible downstream choices, not merely produce more fluent narration, without violating Spark knowledge boundaries or replay determinism. Until that evidence exists, no later provider implementation phase is scheduled.

#### Google cost and effectiveness envelope

Google AI Pro is a consumer Gemini subscription. It should not be treated as an API key, Vertex AI entitlement, or authorization to create billable cloud usage. Google AI Studio may expose a free developer tier, but its limits, model availability, and data-use terms differ from paid Gemini API and Google Cloud/Vertex AI projects. Any Mimir experiment must use a separately identified project/account, confirm the active billing mode, and set an operator-controlled hard cap before sending data.

The following representative Google prices are per 1 million tokens for standard text usage, recorded as planning estimates rather than a spending authorization. They are based on Google's [Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing), [Gemini 3 model guide](https://ai.google.dev/gemini-api/docs/gemini-3), and [Google Cloud Agent Platform pricing](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing). Prices and model availability are drift-prone and must be rechecked immediately before an experiment. The Gemini Developer API and Vertex/Agent Platform may expose different SKUs, tiers, quotas, or promotional pricing; select one channel explicitly.

| Google model | Input | Output, including reasoning where applicable | Likely Mimir role | Expected effectiveness |
| --- | ---: | ---: | --- | --- |
| Gemini 2.5 Flash-Lite | $0.10 | $0.40 | Cheapest screening arm | Low-to-moderate; likely adequate for strict structured proposals, weakest candidate for subtle social distinctions |
| Gemini 2.5 Flash | $0.30 | $2.50 | Best first evaluation arm | Moderate; good cost/latency balance for bounded interpretation, but still must prove evidence-grounded uplift |
| Gemini 2.5 Pro | $1.25 | $10.00 | Quality comparison or judge | Moderate-to-high reasoning potential, but likely excessive for four fixed dilemmas and short output |
| Gemini 3.1 Flash-Lite | $0.25 | $1.50 | Newer low-cost comparison arm | Moderate expected quality with better reasoning than a minimal model; preview stability and pricing require review |
| Gemini 3 Flash preview | $0.50 | $3.00 | Stronger comparison arm | Moderate-to-high expected quality; preview behavior and changing price reduce governance confidence |
| Gemini 3.1 Pro preview | $2.00 | $12.00 | Upper-bound quality judge only | Highest likely interpretation quality, but poor value unless cheaper arms fail and the improvement is material |

For a comparable Mimir evaluation request of 2,000 input tokens and 150 output tokens, 20 encounters would cost approximately $0.005, $0.020, $0.080, $0.015, $0.029, and $0.116 respectively in the table's model order. Ten thousand encounters would cost approximately $2.60, $9.75, $40.00, $7.25, $14.50, and $58.00. These figures exclude retries, cached-context storage, grounding/tools, taxes, service infrastructure, and operator time; reasoning tokens may increase output usage.

The recommended evaluation sequence is Flash-Lite as a cheap screening arm, Flash as the primary quality/cost comparison, and Pro only as a small adjudication or upper-bound arm. The likely benefit is improved observer-facing explanation and uncertainty calibration, not new simulation authority. A model should advance only if blinded reviewers show a meaningful improvement in evidence-grounded understanding and plausible downstream choices over rules-only, with zero knowledge leakage, zero authority changes, complete replay without provider calls, and acceptable latency and fallback rates.

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
