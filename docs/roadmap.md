# Mimir Current Roadmap

**Current runtime:** The Living Circuit / **The First Glow**. This is the only supported runtime: schema-3 world bundles, `mimir-sim-v3-first-glow`, and `structured-v2`. Sparks—not villagers—explore charge pools, shelter niches, traces, and informal cooperation. The removed village prototype, Hearthmere, First Winter, food economy, and old save paths are historical; do not revive, relabel, or migrate them.

This is the current delivery order. It complements the dated planning documents rather than rewriting their history. Completed functionality is grouped in the [Changelog](changelog.md). For selected setting and visual direction, read [World Theme](world-theme.md); for implemented behavior, read [Current Architecture](architecture.md).

## Current delivery position

Reconciled on 2026-10-04 against GitHub `main` at `f25cd2d7075b02f41771dc9f00a060e850130a3e`. Writer hardening (#218), Living Lives (#228), public repository hygiene (#274/#278), and generator path hygiene (#289) are delivered. PR #288 merges the mobile observer zoom correction; PR #293 repairs audio scheduling and test runtime; PR #290 delivers owner-token bypass and backup status aliasing. Observer-P7 (#272) delivers the bounded audience rehearsal harness and operational limits evidence. Current unfinished work includes Observer Readiness final disposition (#253/#257) and documentation reconciliation (#258). The earlier September 27 issue inventory is historical and does not describe the current queue.

Completed AI-P1 through AI-P20, RC-P1 through RC-P5, Resonance, hosted work, and writer hardening belong in the [Changelog](changelog.md), with their dated evidence and limits. The latest Living Lives phase evidence is recorded below.

The implemented AI path is an explicitly gated internal Vertex pilot with rules-only defaults, deterministic server authority, and provider-free replay. The original AI-P1 deferral was followed by authorized bounded evaluations and implementation; it is not the current delivery queue. The selected First Glow capacity is world-age RC 1 with explicit test Heroes at RC 2; natural Hero generation remains disabled. See the [AI plan](ai-plan.md), [Reflection capacity plan](reflection-capacity-plan.md), and [bounded rollout runbook](ai-p14-rollout-runbook.md).

## Living Lives workstream

The [Living Lives design and phased plan](living-lives-plan.md) records completed epic [#228](https://github.com/KevinHozak/Mimir/issues/228), delivered through all six phase issues [#229–#234](https://github.com/KevinHozak/Mimir/issues/229). The connected experience now includes Follow a Spark, persisted consequential conversations, and an evidence-linked Chronicle.

Lives-P5 completed its six-run offline fake-provider study, but deferred a live-model benefit claim and independent human review. Lives-P6 delivered versioned age/model progression and a matched offline comparison; its diagnostic fixture did not assess benefit. See the [P5 study](evidence/first-glow-lives-p5-study-2026-09-20.md) and [P6 comparison](evidence/first-glow-lives-p6-comparison-2026-09-20.md). Neither phase authorizes new provider calls or changes First Glow defaults.

The current delivery priority is Observer Readiness: complete #272 within an explicitly approved audience cap/window (delivered in [Observer-P7 evidence](evidence/observer-p7-audience-rehearsal-2026-10-04.md)), verify merged mobile controls in the authorized hosted environment (#271), and consolidate #257. A bounded live-model/human-review study remains deferred. First Glow remains the only supported runtime.

## Writer-hardening closeout

The First Glow server remains a single authoritative SQLite writer, with serialized pulse/backup operations, fail-closed owner authentication for hosted and public binds, append-only committed history, and provider-free replay. The original review is preserved as historical evidence in the [reliability/security review](reliability-security-maintenance-review.md), with the dated post-merge status and implementation links there.

On 2026-10-03, merged PR #266 at `d1aa17e` was deployed with the guarded clean-main workflow to Hosting version `2b0287700b57d854`; exact live index and both hashed assets matched. Desktop and mobile-sized core rendering succeeded and all five required authenticated bundle SVGs returned 200. Mobile zoom controls remain clipped, so this is not an unqualified usability pass. Single-session request/cache/transfer measurements, bridge/VM CPU and bridge memory, Compute quotas, and September project/service billing are recorded in the [dated deployment evidence](evidence/hosted-p18-p4-deployment-2026-10-03.md). At that October 3 deployment checkpoint, audience/window approval, recovery verification, and stream-cleanup evidence were outstanding. Recovery and process-scoped cleanup evidence have since been delivered; the remaining rehearsal still requires explicit audience/window approval and hosted mobile verification. #257/#253 stay open; #201 remains the historical closeout with limitations. P2/P3 closed-as-not-planned status is not acceptance evidence. No capacity, availability, or browser-attributable cost claim follows.

The October 3 [Observer-P4 recovery audit](evidence/observer-p4-recovery-identities-2026-10-03.md) freshly verified the retained known Hosting rollback row/action, bridge traffic and immutable revision identities, the authoritative VM service/checkpoint, all manifest-listed files in its latest local recovery unit, and metadata availability of the historical independent recovery object. The Hosting API still returns 403; existing console access supplies release availability. After explicit user approval, the historical independent archive was downloaded into ignored local storage and its database plus all seven manifest-listed bundle files passed hash verification. A fresh locked build of recovery source `e5b5b114a7b2990bd6dfb305364079a29aad9aae` matches all 36 deployed backend JavaScript files and the package/lock manifests (one documented CRLF-only difference). This identifies a reproducible backend recovery source without claiming the original deployment command or a successful restore. Issue #269 is completed with merged recovery evidence; #272 rehearsal and #257 disposition retain their separate operational gates.

## Gates before widening hosted access

[Hosted-P14](https://github.com/KevinHozak/Mimir/issues/190) is delivered. [Hosted-P17](https://github.com/KevinHozak/Mimir/issues/201) is closed with explicit limitations. Hosted-P18 (#253) was created to revisit operational evidence: P1 (#254) is completed, while P2 (#255) and P3 (#256) are closed as not planned and their acceptance cases remain unverified. P4 ([#257](https://github.com/KevinHozak/Mimir/issues/257)) has not established readiness. Firebase-authenticated observation through the Cloud Run bridge to one private SQLite-writing VM remains limited staging. The [operational evidence](evidence/hosted-p17-operational-closeout-2026-09-14.md) records the bounded closeout, not production readiness.

Do not widen access or make availability, capacity, or cost claims based on Hosted-P18-P4. Its rehearsal is blocked until a safe window and rollback identity are established, and P2/P3 gaps remain. The dated [P4 readiness review](evidence/hosted-p18-p4-readiness-2026-09-28.md) contains the bounded plan and current unknowns. The remaining validation includes:

- Expired, wrong-project, and unapproved-user token rejection cases; missing and malformed cases have dated passing evidence.
- Authenticated SSE reconnect and token refresh, plus a bridge process restart. Observer-P5 now records bounded single-client clean closure; VM restart continuity and bridge-to-VM recovery do not establish the remaining cases.
- Authenticated archive playback during live unavailability. Merged archive replay and multi-checkpoint publication do not prove outage independence operationally.
- A real multi-viewer rehearsal, remaining service quotas, and attributable current billing. The [Observer-P5 evidence](evidence/observer-p5-stream-cleanup-2026-10-03.md) and [Observer-P7 evidence](evidence/observer-p7-audience-rehearsal-2026-10-04.md) establish active-stream cleanup, rehearsal stop thresholds, and bounded two-client rehearsal validation. #257/#253 remain open for final evidence-backed disposition. These measurements establish bounded limits, not arbitrary audience capacity or unconstrained hosting cost.

## Gates before further AI or world expansion

Any further provider evaluation or rollout requires a selected scope and explicit provider, account, data/retention, budget, kill-switch, and telemetry controls. Retained private batches are historical evidence, not authorization for new calls. A larger RC policy, natural Hero rarity, richer RC visuals, and the Hearth Circuit require separate design and implementation decisions; First Glow remains the sole runtime.

## Non-negotiable gates

- The server alone commits outcomes; browser animation and art never invent state.
- Fixed inputs produce the same committed history. Objective events, Spark-local knowledge, and interpretations remain separate records.
- Edit authored Tiled sources or importer code, then regenerate and validate bundles. Hash-named bundles are immutable, including for historical replay.
- Treat SQLite runtime data, backups, and test outputs as isolated artifacts. Hosted operation remains single-writer until persistence architecture changes deliberately.
