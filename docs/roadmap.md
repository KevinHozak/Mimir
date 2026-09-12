# Mimir Current Roadmap

**Current runtime:** The Living Circuit / **The First Glow**. This is the only supported runtime: schema-3 world bundles, `mimir-sim-v3-first-glow`, and `structured-v2`. Sparks—not villagers—explore charge pools, shelter niches, traces, and informal cooperation. The removed village prototype, Hearthmere, First Winter, food economy, and old save paths are historical; do not revive, relabel, or migrate them.

This is the current delivery order. It complements the dated planning documents rather than rewriting their history. Completed functionality is grouped in the [Changelog](changelog.md). For selected setting and visual direction, read [World Theme](world-theme.md); for implemented behavior, read [Current Architecture](architecture.md).

## Next non-hosting delivery sequence

The next non-hosting sequence is the conditional AI plan below. Resonance-P1 through P5 are merged with their fixed evidence and recorded in the [Changelog](changelog.md). The Hearth Circuit remains a future transition contract, not a second active runtime; the AI phases are planning and evaluation gates, not authorization for external model calls.

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

The detailed future hybrid design is in the [AI plan](ai-plan.md). It selects Gemini 2.5 Flash-Lite for planning, uses deterministic attention triggers and rules-based authority, supplies versioned Spark personality context, and records committed movement and decision history for provider-free historical playback. This remains a plan; it does not activate external calls.

| Phase | Issue | Status and dependency |
| --- | --- | --- |
| AI-P2 | [Define versioned Spark personality material](https://github.com/KevinHozak/Mimir/issues/130) | Foundation; follows AI-P1 and adds no provider call. |
| AI-P3 | [Implement deterministic attention triggers and budgets](https://github.com/KevinHozak/Mimir/issues/131) | Follows AI-P2; routine activity remains rules-only. |
| AI-P4 | [Complete movement and decision recording for history](https://github.com/KevinHozak/Mimir/issues/132) | Follows AI-P2 and AI-P3; required before provider evaluation. |
| AI-P5 | [Build the offline hybrid fake-provider loop](https://github.com/KevinHozak/Mimir/issues/133) | Follows AI-P2 through AI-P4; no network, credentials, or paid usage. |
| AI-P6 | [Run the authorized Gemini 2.5 Flash-Lite evaluation](https://github.com/KevinHozak/Mimir/issues/134) | Follows AI-P5 plus separate provider, privacy, retention, and budget authorization. |
| AI-P7 | [Evaluate hybrid choice quality and behavioral value](https://github.com/KevinHozak/Mimir/issues/135) | Follows AI-P6; produces the evidence-based adopt/defer/retire recommendation. |
| AI-P8 | [Apply validated hybrid choices in isolated staging](https://github.com/KevinHozak/Mimir/issues/145) | Follows AI-P7 evidence plus explicit authorization; proves bounded downstream effects without provider authority. |
| AI-P9 | [Run a limited isolated hybrid staging pilot](https://github.com/KevinHozak/Mimir/issues/136) | Conditional on AI-P8; cannot affect the canonical timeline or public observer. |
| AI-P10 | [Plan bounded hybrid runtime implementation](https://github.com/KevinHozak/Mimir/issues/137) | Proceeds toward AI-assisted play behind server-owned authority; no broad deployment is included. |
| AI-P11 | [Define and authorize the bounded live provider contract](https://github.com/KevinHozak/Mimir/issues/149) | Next actionable phase; requires explicit provider/model, privacy, data-scope, budget, kill-switch, and telemetry decisions. |
| AI-P12 | [Implement the bounded live interpretation adapter](https://github.com/KevinHozak/Mimir/issues/150) | Follows AI-P11; provider proposes only, deterministic transitions commit consequences. |
| AI-P13 | [Run the bounded internal hybrid runtime pilot](https://github.com/KevinHozak/Mimir/issues/151) | Follows AI-P12; isolated, fixed-seed, capped, and provider-free on replay. |
| AI-P14 | [Enable bounded AI-assisted First Glow play](https://github.com/KevinHozak/Mimir/issues/152) | Follows AI-P13; operator-controlled rollout, with public exposure still separately decided. |
| AI-P16 | [Validate repeatable bounded Vertex value across fixed-seed rehearsals](https://github.com/KevinHozak/Mimir/issues/160) | Current gate after the successful private AI-P15 rehearsal; requires four fixed seeds before any broader AI integration decision. |
| AI-P17 | [Adjudicate and improve bounded Vertex interpretation quality](https://github.com/KevinHozak/Mimir/issues/162) | Reviews every fixed-seed interpretation and fallback, then reruns the private batch only after the operator authorizes the billable evaluation. |

AI-P15 is complete through [PR #159](https://github.com/KevinHozak/Mimir/pull/159). Its private hosted Vertex rehearsal recorded bounded proposals that changed staged choices and downstream social outcomes while preserving deterministic authority, caps, private hosting, and provider-free replay. AI-P16 is the current follow-up gate: repeat the evaluation across four fixed seeds and distinguish repeatable value from a one-seed signal.

AI-P17 adds the missing quality adjudication layer. It keeps each encounter's bounded interpretation, evidence references, fallback category, staging comparison, and replay result in a review artifact. The deterministic control proves the rubric and reporting path without provider calls; the private Vertex batch remains a separately authorized evaluation because it can create billable usage.

### AI-P10 decision: proceed with bounded hybrid runtime implementation

AI-P7, AI-P8, and AI-P9 establish the safe path needed to make AI-assisted play real: validated proposals can create bounded downstream social changes in isolated staging while preserving rules-only authority, budget caps, and provider-free replay. AI-P10 therefore **proceeds with the next implementation steps**, while keeping the boundary narrow and non-public. The goal is to put AI behind the server-owned attention gate and deterministic transition adapter, so AI can influence selected Spark decisions without becoming simulation authority. The full implementation direction is recorded in [AI-P10 hybrid runtime implementation evidence](evidence/ai-p10-hybrid-runtime-decision-2026-09-12.md).

The next implementation steps are:

- Connect one explicitly authorized, pinned provider/model to the existing bounded interpretation path behind the per-Spark and global daily caps.
- Keep the provider output limited to a validated proposal; let the deterministic adapter commit every world consequence.
- Record provider source, model/version, context hash, validation, fallback, latency, and usage metadata with the committed decision.
- Preserve rules-only fallback for timeout, failure, invalid output, unsupported claims, budget exhaustion, and unavailable provider access.
- Keep historical playback, branching, and the public observer provider-free until a separate bounded runtime pilot is complete.
- Add a kill switch, privacy/retention policy, data-scope review, and cost telemetry before any live provider call.

This is an implementation path toward AI-assisted play, not authorization for broad deployment or uncontrolled spending.
The concrete contract for the next implementation phase is recorded in [AI-P11 bounded live provider contract](evidence/ai-p11-bounded-live-provider-contract-2026-09-12.md). AI-P11 selects Vertex AI with Gemini 2.5 Flash-Lite, the explicit $1.00 hard cap, superseding the smaller AI-P6 evaluation cap, four-per-Spark and sixteen-global limits, explicit privacy/retention controls, and a disabled-by-default live boundary.


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

