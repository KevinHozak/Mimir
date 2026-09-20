# Mimir Current Roadmap

**Current runtime:** The Living Circuit / **The First Glow**. This is the only supported runtime: schema-3 world bundles, `mimir-sim-v3-first-glow`, and `structured-v2`. Sparks—not villagers—explore charge pools, shelter niches, traces, and informal cooperation. The removed village prototype, Hearthmere, First Winter, food economy, and old save paths are historical; do not revive, relabel, or migrate them.

This is the current delivery order. It complements the dated planning documents rather than rewriting their history. Completed functionality is grouped in the [Changelog](changelog.md). For selected setting and visual direction, read [World Theme](world-theme.md); for implemented behavior, read [Current Architecture](architecture.md).

## Current delivery position

Reconciled on 2026-09-15 against merged `main` at `b646770` and GitHub issue state. The issue search returned no open issues; no new implementation phase is selected here. Completed AI-P1 through AI-P20, RC-P1 through RC-P5, Resonance, and hosted work belong in the [Changelog](changelog.md), with their dated evidence and limits.

The implemented AI path is an explicitly gated internal Vertex pilot with rules-only defaults, deterministic server authority, and provider-free replay. The original AI-P1 deferral was followed by authorized bounded evaluations and implementation; it is not the current delivery queue. The selected First Glow capacity is world-age RC 1 with explicit test Heroes at RC 2; natural Hero generation remains disabled. See the [AI plan](ai-plan.md), [Reflection capacity plan](reflection-capacity-plan.md), and [bounded rollout runbook](ai-p14-rollout-runbook.md).

## Living Lives workstream

The [Living Lives design and phased plan](living-lives-plan.md) records the active epic [#228](https://github.com/KevinHozak/Mimir/issues/228): AI-influenced lives presented through connected World, Follow a Spark, and Chronicle views. The six phase issues are now tracked as [#229](https://github.com/KevinHozak/Mimir/issues/229) through [#234](https://github.com/KevinHozak/Mimir/issues/234). Lives-P1 is a documentation contract in [lives-experience-contract.md](lives-experience-contract.md); it does not claim runtime delivery.

Experience design and camera prototypes can proceed alongside writer hardening. Sustained live AI and durable conversation/history work depend on the relevant [writer reliability fixes](reliability-security-maintenance-review.md); provider execution and wider hosted access retain their separate gates. P2 uses fixtures, P3 depends on the relevant merged writer fixes, P5 requires the Security epic checks, and P6 follows P5 evidence. First Glow remains the only supported runtime.

## Gates before widening hosted access

[Hosted-P14](https://github.com/KevinHozak/Mimir/issues/190) is delivered. [Hosted-P17](https://github.com/KevinHozak/Mimir/issues/201) is closed with explicit limitations. Firebase-authenticated observation through the Cloud Run bridge to one private SQLite-writing VM remains limited staging. The [operational evidence](evidence/hosted-p17-operational-closeout-2026-09-14.md) records the bounded closeout, not production readiness.

Reopen or supersede Hosted-P17 before widening access or making availability, capacity, or cost claims. Its remaining validation includes:

- Expired, wrong-project, and unapproved-user token rejection cases; missing and malformed cases have dated passing evidence.
- Authenticated SSE reconnect, clean closure, and token refresh, plus a bridge process restart. VM restart continuity and bridge-to-VM recovery do not establish these results.
- Authenticated archive playback during live unavailability. Merged archive replay and multi-checkpoint publication do not prove outage independence operationally.
- A real multi-viewer rehearsal, cache/transfer and load measurements, remaining service quotas, and observed billing. The retained synthetic requests and Compute Engine quota snapshot do not establish audience capacity or billed cost.

## Gates before further AI or world expansion

Any further provider evaluation or rollout requires a selected scope and explicit provider, account, data/retention, budget, kill-switch, and telemetry controls. Retained private batches are historical evidence, not authorization for new calls. A larger RC policy, natural Hero rarity, richer RC visuals, and the Hearth Circuit require separate design and implementation decisions; First Glow remains the sole runtime.

## Non-negotiable gates

- The server alone commits outcomes; browser animation and art never invent state.
- Fixed inputs produce the same committed history. Objective events, Spark-local knowledge, and interpretations remain separate records.
- Edit authored Tiled sources or importer code, then regenerate and validate bundles. Hash-named bundles are immutable, including for historical replay.
- Treat SQLite runtime data, backups, and test outputs as isolated artifacts. Hosted operation remains single-writer until persistence architecture changes deliberately.
