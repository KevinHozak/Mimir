# Mimir Current Roadmap

**Current runtime:** The Living Circuit / **The First Glow**. This is the only supported runtime: schema-3 world bundles, `mimir-sim-v3-first-glow`, and `structured-v2`. Sparks—not villagers—explore charge pools, shelter niches, traces, and informal cooperation. The removed village prototype, Hearthmere, First Winter, food economy, and old save paths are historical; do not revive, relabel, or migrate them.

This is the current delivery order. It complements the dated planning documents rather than rewriting their history. Completed functionality is grouped in the [Changelog](changelog.md). For selected setting and visual direction, read [World Theme](world-theme.md); for implemented behavior, read [Current Architecture](architecture.md).

## Current delivery position

Reconciled on 2026-10-04 against GitHub `main` at `26ac5e402308052b739336067ba2637c9accda45` (`26ac5e4`). Writer hardening (#218), Living Lives foundation (#228), public repository hygiene (#274/#278), generator path hygiene (#289), mobile observer zoom (#288), audio scheduling (#293), and owner-token auth (#290) are delivered. Observer Readiness Epic #253 is closed complete via Observer-P8 (#257) with an evidence-backed operational envelope (at most two concurrent sessions for at most 180 seconds). No issues or PRs remain open on GitHub other than documentation reconciliation (#258).

Completed AI-P1 through AI-P20, RC-P1 through RC-P5, Resonance, hosted work, writer hardening, and Observer Readiness (#253) belong in the [Changelog](changelog.md), with their dated evidence and limits. The latest Living Lives phase evidence is recorded below.

The implemented AI path is an explicitly gated internal Vertex pilot with rules-only defaults, deterministic server authority, and provider-free replay. The original AI-P1 deferral was followed by authorized bounded evaluations and implementation; it is not the current delivery queue. The selected First Glow capacity is world-age RC 1 with explicit test Heroes at RC 2; natural Hero generation remains disabled. See the [AI plan](ai-plan.md), [Reflection capacity plan](reflection-capacity-plan.md), and [bounded rollout runbook](ai-p14-rollout-runbook.md).

## Living Lives workstream

The [Living Lives design and phased plan](living-lives-plan.md) records completed epic [#228](https://github.com/KevinHozak/Mimir/issues/228), delivered through all six phase issues [#229–#234](https://github.com/KevinHozak/Mimir/issues/229). The connected experience now includes Follow a Spark, persisted consequential conversations, and an evidence-linked Chronicle.

Lives-P5 completed its six-run offline fake-provider study, but deferred a live-model benefit claim and independent human review. Lives-P6 delivered versioned age/model progression and a matched offline comparison; its diagnostic fixture did not assess benefit. See the [P5 study](evidence/first-glow-lives-p5-study-2026-09-20.md) and [P6 comparison](evidence/first-glow-lives-p6-comparison-2026-09-20.md). Neither phase authorizes new provider calls or changes First Glow defaults.

## Next-workstream decision and priority analysis

With the completion and closeout of Observer Readiness Epic [#253](https://github.com/KevinHozak/Mimir/issues/253) (phases #254–#257, #269–#272) and documentation reconciliation (#258), two candidate priorities were evaluated:

1. **Candidate A: Reliability & Hosting Operational Hardening (beyond Epic #253 boundaries)**
   - *Scope:* Re-opening and verifying the residual staging limitations waived in #255/#256 (expired/wrong-project token rejection against live GCP IAM, seamless in-flight SSE token refresh/reconnect without page reload, container survival across bridge restarts, live VM shutdown during archive replay, or multi-writer durability).
   - *Evaluation:* As documented in the Observer-P8 disposition ([`docs/evidence/observer-p8-epic-disposition-2026-10-04.md`](evidence/observer-p8-epic-disposition-2026-10-04.md)), none of these limitations threaten the single authoritative SQLite writer invariant or system security. Unauthenticated access already fails closed, client stream cleanup is verified (11.19s), and the 2-session / 180-second staging ceiling is adequate for current development needs. Further operational hardening would require dedicated infrastructure expansion, live IAM token simulation, or persistence architecture changes without advancing core simulation value.

2. **Candidate B: Bounded Living Lives Observer Slice (Recommended Next Workstream)**
   - *Scope:* A small, tightly bounded observer refinement to the delivered Living Lives slice (Mira & Tovan encounter / Chronicle integration) to evaluate viewer engagement, narrative coherence, and evidence navigation during ordinary play—prioritizing offline, deterministic fixtures or authorized bounded studies before any live provider rollout.
   - *Evaluation:* The primary creative and research question of Mimir is whether individual Sparks feel like someone living a life and whether AI-influenced encounters produce meaningful, traceable social consequences. With writer security, rehearsal harnesses, and observer baseline rendering stabilized, closing the loop on observer interaction with lived memories and the Chronicle delivers the highest value toward core project goals.

**Decision & Recorded Direction:**
- **Selected Next Workstream:** Candidate B — a bounded Living Lives observer evaluation and slice refinement.
  - *Rationale:* Directly serves the central simulation goals while respecting established single-writer and provider-free replay invariants.
  - *Dependencies:* Delivered Lives-P1 through Lives-P4 contracts, existing Chronicle and Follow mode UI, and the writer-hardening base.
  - *Acceptance Gate:* Verified observer experience across World, Follow, and Chronicle on committed First Glow history, preserving Spark-local knowledge and deterministic fallback behavior, with explicit evidence documentation before considering live provider evaluations.
  - *Deferred Scope:* Candidate A (further hosted audience scaling, live IAM token fuzzing, or multi-writer persistence) is formally deferred until a wider audience or production SLA is explicitly required. First Glow remains the only supported runtime.

## Writer-hardening closeout

The First Glow server remains a single authoritative SQLite writer, with serialized pulse/backup operations, fail-closed owner authentication for hosted and public binds, append-only committed history, and provider-free replay. The original review is preserved as historical evidence in the [reliability/security review](reliability-security-maintenance-review.md), with the dated post-merge status and implementation links there.

On 2026-10-03, merged PR #266 at `d1aa17e` was deployed with the guarded clean-main workflow to Hosting version `2b0287700b57d854`; exact live index and both hashed assets matched. Desktop and mobile-sized core rendering succeeded and all five required authenticated bundle SVGs returned 200. Mobile zoom controls were subsequently corrected in PR #288 and verified locally across 320–1280px viewports. Recovery identities (#269), active stream cleanup (#270), and rehearsal limits within a 2-client cap (#272) are verified. Final epic disposition is recorded in [Observer-P8 evidence](evidence/observer-p8-epic-disposition-2026-10-04.md). Historical closeout #201 remains the historical limited baseline. No unconstrained capacity, 24/7 availability, or browser-attributable cost claim follows.

The October 3 [Observer-P4 recovery audit](evidence/observer-p4-recovery-identities-2026-10-03.md) freshly verified the retained known Hosting rollback row/action, bridge traffic and immutable revision identities, the authoritative VM service/checkpoint, all manifest-listed files in its latest local recovery unit, and metadata availability of the historical independent recovery object. The Hosting API still returns 403; existing console access supplies release availability. After explicit user approval, the historical independent archive was downloaded into ignored local storage and its database plus all seven manifest-listed bundle files passed hash verification. A fresh locked build of recovery source `e5b5b114a7b2990bd6dfb305364079a29aad9aae` matches all 36 deployed backend JavaScript files and the package/lock manifests (one documented CRLF-only difference). This identifies a reproducible backend recovery source without claiming the original deployment command or a successful restore.

## Gates before widening hosted access

[Hosted-P14](https://github.com/KevinHozak/Mimir/issues/190) is delivered. [Hosted-P17](https://github.com/KevinHozak/Mimir/issues/201) is closed with explicit limitations. Observer Readiness Epic #253 is concluded with the [Observer-P8 disposition](evidence/observer-p8-epic-disposition-2026-10-04.md). Firebase-authenticated observation through the Cloud Run bridge to one private SQLite-writing VM remains limited staging.

Do not widen access or make availability, capacity, or cost claims based on Observer-P8 disposition. The measured boundaries and explicit limitations include:

- Expired, wrong-project, and unapproved-user token rejection: missing, malformed, and unapproved cases have verified evidence; expired and wrong-project cases remain unverified against live IAM and fail closed.
- Authenticated SSE reconnect and token refresh: stream cancellation and client cleanup were measured in P5 (11.2s lag), but seamless in-flight reconnect/refresh without page reload remains unverified.
- Bridge restart and archive playback during live VM outage: bridge container cold-start is verified, but in-flight stream continuity across container restarts is unsupported; operational archive playback while the VM is stopped is an unverified staging limitation.
- Audience and cost boundary: bounded rehearsal runner (#272) and stream cleanup (#270) establish a strict operating limit of **at most 2 concurrent sessions** for **at most 3 minutes (180 seconds)**. No claim of arbitrary audience scaling or continuous zero-cost hosting is made.

## Gates before further AI or world expansion

Any further provider evaluation or rollout requires a selected scope and explicit provider, account, data/retention, budget, kill-switch, and telemetry controls. Retained private batches are historical evidence, not authorization for new calls. A larger RC policy, natural Hero rarity, richer RC visuals, and the Hearth Circuit require separate design and implementation decisions; First Glow remains the sole runtime.

## Non-negotiable gates

- The server alone commits outcomes; browser animation and art never invent state.
- Fixed inputs produce the same committed history. Objective events, Spark-local knowledge, and interpretations remain separate records.
- Edit authored Tiled sources or importer code, then regenerate and validate bundles. Hash-named bundles are immutable, including for historical replay.
- Treat SQLite runtime data, backups, and test outputs as isolated artifacts. Hosted operation remains single-writer until persistence architecture changes deliberately.
