# Mimir Current Roadmap

**Current runtime:** The Living Circuit / **The First Glow**. This is the only supported runtime: schema-3 world bundles, `mimir-sim-v3-first-glow`, and `structured-v2`. Sparks—not villagers—explore charge pools, shelter niches, traces, and informal cooperation. The removed village prototype, Hearthmere, First Winter, food economy, and old save paths are historical; do not revive, relabel, or migrate them.

This is the current delivery order. It complements the dated planning documents rather than rewriting their history. Completed functionality is grouped in the [Changelog](changelog.md). For selected setting and visual direction, read [World Theme](world-theme.md); for implemented behavior, read [Current Architecture](architecture.md).

## Current delivery position

Reconciled on 2026-09-20 against merged `main` and GitHub issue state. The Security: Harden the First Glow writer epic ([#218](https://github.com/KevinHozak/Mimir/issues/218)) is complete through [PR #226](https://github.com/KevinHozak/Mimir/pull/226), [PR #227](https://github.com/KevinHozak/Mimir/pull/227), [PR #235](https://github.com/KevinHozak/Mimir/pull/235), [PR #236](https://github.com/KevinHozak/Mimir/pull/236), [PR #237](https://github.com/KevinHozak/Mimir/pull/237), [PR #238](https://github.com/KevinHozak/Mimir/pull/238), and [PR #239](https://github.com/KevinHozak/Mimir/pull/239). Completed AI-P1 through AI-P20, RC-P1 through RC-P5, Resonance, hosted work, and writer hardening belong in the [Changelog](changelog.md), with their dated evidence and limits.

The implemented AI path is an explicitly gated internal Vertex pilot with rules-only defaults, deterministic server authority, and provider-free replay. The original AI-P1 deferral was followed by authorized bounded evaluations and implementation; it is not the current delivery queue. The selected First Glow capacity is world-age RC 1 with explicit test Heroes at RC 2; natural Hero generation remains disabled. See the [AI plan](ai-plan.md), [Reflection capacity plan](reflection-capacity-plan.md), and [bounded rollout runbook](ai-p14-rollout-runbook.md).

## Living Lives workstream

The [Living Lives design and phased plan](living-lives-plan.md) records the active epic [#228](https://github.com/KevinHozak/Mimir/issues/228): AI-influenced lives presented through connected World, Follow a Spark, and Chronicle views. The six phase issues are now tracked as [#229](https://github.com/KevinHozak/Mimir/issues/229) through [#234](https://github.com/KevinHozak/Mimir/issues/234). Lives-P1 is a documentation contract in [lives-experience-contract.md](lives-experience-contract.md); it does not claim runtime delivery.

Experience design and camera prototypes can proceed alongside the completed writer hardening. Living Lives phases that depended on writer checks can use the merged Security-P1–P7 evidence; provider execution and wider hosted access retain their separate gates. First Glow remains the only supported runtime.

## Writer-hardening closeout

The First Glow server remains a single authoritative SQLite writer, with serialized pulse/backup operations, fail-closed owner authentication for hosted and public binds, append-only committed history, and provider-free replay. The original review is preserved as historical evidence in the [reliability/security review](reliability-security-maintenance-review.md), with the dated post-merge status and implementation links there.

The remaining gates are operational rather than unresolved hardening code: fresh deployment validation, the remaining observer-token and authenticated-SSE cases, bridge process restart, outage replay, real audience/billing telemetry, and isolated recovery evidence. This closeout does not widen hosted access, enable a provider, or change the single-writer persistence boundary.

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
