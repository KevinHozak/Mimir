# Mimir Current Roadmap

**Current runtime:** The Living Circuit / **The First Glow**. This is the only supported runtime: schema-3 world bundles, `mimir-sim-v3-first-glow`, and `structured-v2`. Sparks—not villagers—explore charge pools, shelter niches, traces, and informal cooperation. The removed village prototype, Hearthmere, First Winter, food economy, and old save paths are historical; do not revive, relabel, or migrate them.

This is the current delivery order. It complements the dated planning documents rather than rewriting their history. Completed functionality is grouped in the [Changelog](changelog.md). For selected setting and visual direction, read [World Theme](world-theme.md); for implemented behavior, read [Current Architecture](architecture.md).

## Current delivery position

Reconciled on 2026-09-27 against GitHub `main` at `100089f2335c8eee88c9be9ddb2b0552c7685135`. Security: Harden the First Glow writer epic (#218) and Living Lives epic (#228) are complete; all six Lives phase issues (#229–#234) are closed. The current issue search found no open issues, and PRs [#250](https://github.com/KevinHozak/Mimir/pull/250) and [#251](https://github.com/KevinHozak/Mimir/pull/251) are merged. PR #250 updates Fastify to the security-fixed 5.12.5 and `@types/node` to 26.6.1. The local review checkout remains behind GitHub `main`; use the verified remote source as the documentation/code baseline.

Completed AI-P1 through AI-P20, RC-P1 through RC-P5, Resonance, hosted work, and writer hardening belong in the [Changelog](changelog.md), with their dated evidence and limits. The latest Living Lives phase evidence is recorded below.

The implemented AI path is an explicitly gated internal Vertex pilot with rules-only defaults, deterministic server authority, and provider-free replay. The original AI-P1 deferral was followed by authorized bounded evaluations and implementation; it is not the current delivery queue. The selected First Glow capacity is world-age RC 1 with explicit test Heroes at RC 2; natural Hero generation remains disabled. See the [AI plan](ai-plan.md), [Reflection capacity plan](reflection-capacity-plan.md), and [bounded rollout runbook](ai-p14-rollout-runbook.md).

## Living Lives workstream

The [Living Lives design and phased plan](living-lives-plan.md) records completed epic [#228](https://github.com/KevinHozak/Mimir/issues/228), delivered through all six phase issues [#229–#234](https://github.com/KevinHozak/Mimir/issues/229). The connected experience now includes Follow a Spark, persisted consequential conversations, and an evidence-linked Chronicle.

Lives-P5 completed its six-run offline fake-provider study, but deferred a live-model benefit claim and independent human review. Lives-P6 delivered versioned age/model progression and a matched offline comparison; its diagnostic fixture did not assess benefit. See the [P5 study](evidence/first-glow-lives-p5-study-2026-09-20.md) and [P6 comparison](evidence/first-glow-lives-p6-comparison-2026-09-20.md). Neither phase authorizes new provider calls or changes First Glow defaults.

No new implementation phase is selected. The next decision is whether to authorize a bounded live-model/human-review study or prioritize the remaining hosted operational validation. First Glow remains the only supported runtime.

## Writer-hardening closeout

The First Glow server remains a single authoritative SQLite writer, with serialized pulse/backup operations, fail-closed owner authentication for hosted and public binds, append-only committed history, and provider-free replay. The original review is preserved as historical evidence in the [reliability/security review](reliability-security-maintenance-review.md), with the dated post-merge status and implementation links there.

On 2026-10-03, merged PR #266 at `d1aa17e` was deployed with the guarded clean-main workflow to Hosting version `2b0287700b57d854`; exact live index and both hashed assets matched. Desktop and mobile-sized core rendering succeeded and all five required authenticated bundle SVGs returned 200. Mobile zoom controls remain clipped, so this is not an unqualified usability pass. Single-session request/cache/transfer measurements, bridge/VM CPU and bridge memory, Compute quotas, and September project/service billing are recorded in the [dated deployment evidence](evidence/hosted-p18-p4-deployment-2026-10-03.md). The multi-viewer rehearsal remains blocked by no approved audience cap or safe window, incomplete rollback/recovery verification, and absent server active-stream cleanup telemetry. #257/#253 stay open; #201 remains the historical closeout with limitations. P2/P3 closed-as-not-planned status is not acceptance evidence. No capacity, availability, or browser-attributable cost claim follows.

The October 3 [Observer-P4 recovery audit](evidence/observer-p4-recovery-identities-2026-10-03.md) freshly verified the retained known Hosting rollback row/action, bridge traffic and immutable revision identities, the authoritative VM service/checkpoint, all manifest-listed files in its latest local recovery unit, and metadata availability of the historical independent recovery object. The Hosting API still returns 403; existing console access supplies release availability. Exact VM source linkage and fresh independent manifest-content verification remain unresolved, and no rollback or restore was performed. Issue #269 remains open; #272 rehearsal and #257 disposition stay gated.

## Gates before widening hosted access

[Hosted-P14](https://github.com/KevinHozak/Mimir/issues/190) is delivered. [Hosted-P17](https://github.com/KevinHozak/Mimir/issues/201) is closed with explicit limitations. Hosted-P18 (#253) was created to revisit operational evidence: P1 (#254) is completed, while P2 (#255) and P3 (#256) are closed as not planned and their acceptance cases remain unverified. P4 ([#257](https://github.com/KevinHozak/Mimir/issues/257)) has not established readiness. Firebase-authenticated observation through the Cloud Run bridge to one private SQLite-writing VM remains limited staging. The [operational evidence](evidence/hosted-p17-operational-closeout-2026-09-14.md) records the bounded closeout, not production readiness.

Do not widen access or make availability, capacity, or cost claims based on Hosted-P18-P4. Its rehearsal is blocked until a safe window and rollback identity are established, and P2/P3 gaps remain. The dated [P4 readiness review](evidence/hosted-p18-p4-readiness-2026-09-28.md) contains the bounded plan and current unknowns. The remaining validation includes:

- Expired, wrong-project, and unapproved-user token rejection cases; missing and malformed cases have dated passing evidence.
- Authenticated SSE reconnect, clean closure, and token refresh, plus a bridge process restart. VM restart continuity and bridge-to-VM recovery do not establish these results.
- Authenticated archive playback during live unavailability. Merged archive replay and multi-checkpoint publication do not prove outage independence operationally.
- A real multi-viewer rehearsal, server active-stream cleanup telemetry, remaining service quotas, and attributable current billing. The 2026-10-03 single-session and cloud measurements establish neither audience capacity nor browser-attributable cost.

## Gates before further AI or world expansion

Any further provider evaluation or rollout requires a selected scope and explicit provider, account, data/retention, budget, kill-switch, and telemetry controls. Retained private batches are historical evidence, not authorization for new calls. A larger RC policy, natural Hero rarity, richer RC visuals, and the Hearth Circuit require separate design and implementation decisions; First Glow remains the sole runtime.

## Non-negotiable gates

- The server alone commits outcomes; browser animation and art never invent state.
- Fixed inputs produce the same committed history. Objective events, Spark-local knowledge, and interpretations remain separate records.
- Edit authored Tiled sources or importer code, then regenerate and validate bundles. Hash-named bundles are immutable, including for historical replay.
- Treat SQLite runtime data, backups, and test outputs as isolated artifacts. Hosted operation remains single-writer until persistence architecture changes deliberately.
