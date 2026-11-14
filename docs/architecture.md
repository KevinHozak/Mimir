# Mimir: A Light of Our Own â€” Current Architecture

## Cost-bounded observer polling — 2026-11-14

Hosted read-only sessions use `observer-polling.ts` instead of the SSE/15-second refresh pair. A refresh completes before the next four-minute delay begins; hidden tabs pause, visibility changes cannot bypass the interval, and page disposal aborts requests. Failed reads retain committed data and retry at the same cadence. Existing authenticated fetch/401 refresh behavior and selection/history sequencing remain. `VITE_OBSERVER_ENDS_AT` optionally stops frontend requests at the selected deadline; Hosting builds explicitly select polling.

The bridge supports `OBSERVER_POLLING_ONLY=1` (authenticated `/api/live` returns 405 without an upstream stream), `OBSERVER_GZIP=1`, a separate `OBSERVER_MAX_WIRE_RESPONSE_BYTES`, `OBSERVER_READ_TIMEOUT_MS` and `OBSERVER_ENDS_AT`. Raw decoded size and transmitted compressed size have separate caps. Minute accounting counts actual wire bytes. Token validation, read-only routes and upstream authority remain unchanged; no compression is applied to SSE in legacy mode.

`online-polling-watchdog.mjs` aggregates the original and polling revisions with nondecreasing counters and an explicit legacy floor. For the existing pilot it retains the USD 2 cap, USD 0.95 other reserves and USD 1.05 hard bridge ceiling. At USD 1.00 conservative bridge valuation it closes observer ingress and keeps the private simulation running; the remaining USD 0.05 bridge margin covers cutoff/ingestion tail. It validates the exact polling image, serving revision, ingress, scaling and deployed response/time bounds. This source delivery does not itself prove live deployment or final billing.

## Incremental checkpoint chart projection — 2026-11-14

`checkpoint-metrics.ts` validates the First Glow chart projection rather than replaying spatial/history validation for every chart sample. `/api/metrics` retains its response fields. A single-active-timeline cache refreshes the mutable head and appends committed checkpoints; changing active timeline discards that cache. Only compact immutable numeric samples are retained. Unsupported versions and malformed measured values fail; full `normalizeState` validation is unchanged for load and historical playback. The original unbounded repeated validation could block the server at a 151-checkpoint online history. [Operating evidence](spark-ai-online.md).


## S021 repaired-run admission — 2026-11-14

The private US Vertex route uses a run-owned Private Service Connect endpoint with early-deadline and guest-shutdown cleanup. The endpoint/model/location and original AI/hosting caps remain pinned. Audited `resumeAfterRecovery` retains uncertain holds and creates a `budget_recoveries` record carrying the run, attempt boundary, all uncertain IDs, guarded totals, authorization and evidence hash. Only the new failure window resets; original uncertain contexts remain non-retriable. Backups carry the complete ledger including this additive audit table. Normal unresolved-attempt resume stays closed, and pending attempts cannot recover. Provider diagnostics persist only bounded stage/status codes. [Operating and verification boundaries](spark-ai-online.md).


## Current online operation — 2026-11-14

The owner-authorized bounded S021 pilot is active under the original USD 5 AI allocation and USD 2 hosting ceiling. The deployed writer uses Node 22.23.5, a fixed deadline, one spending ledger and an independent paired offsite backup worker. Older local-only/preparation sections retain their dated scope. [Current operating record](spark-ai-online.md) and [deployment evidence](evidence/spark-online-2026-11-14.md) distinguish activation from remaining qualification.

## Expanded First Glow frontier — S020, local 2026-11-13

Fresh server worlds now select `first-glow-frontier-v1` (`sha256-1ee5c0af5f365d8dee6aaef585dcc986d4286074c84f24a88ec4e77fcb0a079e`): a 64×40 authored map with Charge Reach, Quiet Fold and Shard Verge, 19 sites, limited crossings, four charge-pool locations, four conventional shelter niches, three two-contact rendezvous traces, five discovery/cache sites and two trace weaves. Charge pools still draw from the existing shared regional source ledger; their access differs by geography/contact availability, not separate invented stocks. Assets reuse the recorded repository-authored SVGs.

The optional bundle/checkpoint policy `local-frontier-v1` is initialized only for fresh authored-frontier worlds. It records per-Spark nearby object discovery (five-cell Manhattan radius), actual region visits and bounded project contributions. Fresh frontier worlds select validated activity completion; old bundles/checkpoints remain untouched. New goal contexts expose only noticed sites and one locally visible unfamiliar trace target, with actual route costs and discovery evidence. They never include the full region geometry or another Spark's private discoveries. Goals bind their destination through travel/recovery and require matching arrival evidence; stored trace targets are typed and bounded. A superseded contribution goal ends after the completed site becomes locally observable. `follow-trace` explores a local trace; `explore-contribute` pays one charge at an owned weave contact after a real shape arrival. Normal activity sustenance remains an additional accounted cost.

Each weave needs two distinct Sparks, each contributing once. Completion improves rest at that exact site by six readiness, capped at 100; the base recovery is ten. Contributions and completion survive replay/restoration and are objective events, not AI claims. Project credit persists independently of completion witnesses, who must actually be co-present. Repeating a contribution cannot farm progress. Real rendezvous requires two independently arriving Sparks with separate authored contacts at the same cell; no companion is fabricated. Existing goal timeout and resource/recovery rules continue to apply.

`npm run start:frontier` opens a separate paused goal world at `http://127.0.0.1:4178/`, database `data/local/mimir-frontier.db`, with AI spending disabled. Existing databases keep their bundle/history. Whole-map zoom reaches 0.5×; the observer displays region names and weave progress. Goal admission skips Sparks with continuing work before constructing routes, and goal checkpoints retain immutable bundle identity to preserve navigation caches.

## Bounded local goal context — 2026-11-13 (local)

New goal decisions use `bounded-local-goal-v1`: at most six memories (140-character summaries), six outgoing trust records, four own resolved commitments, two supporting references per record and sixteen local evidence IDs. Current trust values and commitment outcomes are retained; omitted-record/reference counts make truncation explicit. Selection uses stable recency/ID ordering, filters future and nonlocal relationship records, and hashes the projected input. Saved contexts, hashes, receipts and histories are never rewritten or silently compacted on replay.

The provider still enforces the 16 KiB wire cap. Oversized or invalid projections fail before reservation with `goal-context-too-large` or `goal-context-invalid`; status counts local rejections separately from provider failures, and sanitized goal summaries expose fallback reasons. This changes neither the model/token envelope nor the allocation ledger.

## Sharing-safe fresh goal setup and audited continuation — 2026-11-13

Fresh `initializeFirstGlowGoals` now enables `sharing-route-continuation-v1` if it is absent. The shared pause/restore mechanism retains valid routes and owned contacts, cancels only invalid owner plans, and leaves arrival/resource effects to actual execution. Existing checkpoints without the sharing marker retain their original continuation; validation/loading does not add it. Normal non-goal creation remains unchanged.

`SparkAIBudget.resume(expectedRemainingMicrousd, authorization)` is an operator-only library operation, not a public endpoint or reset button. It transactionally requires a stopped profile, exact remaining allocation and no non-completed attempts; records an audit in `budget_resumptions`; and clears only the stop bit. The original identity, USD 5 cap and every reservation/receipt remain intact. Uncertain/in-flight or exhausted allocations cannot be resumed through it.

The authorized corrected run uses `data/local/mimir-ai-goals-sharing.db`, preserving the prior goal database. A genuine two-option AI goal completed and survived backup/replay, with no stranded choosing routes in all 361 checkpoints. Seven later multi-option contexts exceeded 16 KiB before reservation because relationship evidence grows with history. This earlier gap was repaired by bounded-local-goal-v1 and requalified in the subsequent [context run](evidence/first-glow-goal-context-live-2026-11-13.md); the wire bound is unchanged. See [run evidence](evidence/first-glow-goal-sharing-live-2026-11-13.md).

## Bounded AI goal admission — local S019 integration, 2026-11-13

Fresh servers may explicitly select `MIMIR_SPARK_GOALS=true`. During `commitPulseExclusive`, the goal runtime evaluates eligible Sparks in stable ID order before social interpretations. Both consume the same persisted Reflection capacity; goal selection cannot create a second allowance. The candidate goal state is committed even when there are no social interpretations, and selection events enter the same SQLite checkpoint/event transaction and post-commit SSE broadcast. Reads of history and `GET /api/goals` never evaluate providers.

`FirstGlowServerAIRuntime.evaluateGoals` uses `requestFirstGlowGoal` with the existing `createSparkLiveProvider` adapter. Goal and social requests share one USD 5 allocation, in-flight guard, durable USD 0.50 reservations, usage validation, receipts and persistent stop. Completed receipts are reused on transaction retry/restart; uncertain requests never retry. Receipt identity includes purpose, a persisted per-database world UUID, timeline and context hash. Backup/restore retains that UUID. This distinguishes independent worlds whose timelines are both named `main` without sending operator identity to the model.

Goal context adds the Spark's authored values, needs, local memory, outgoing trust and own commitments. Feasible alternatives include explore/mark, explore/shard examination, and explore/meet/mark when real contacts permit it. Only multiple feasible alternatives may invoke AI; a single alternative, absent provider, stopped/exhausted allocation or invalid output yields recorded rules fallback. Choices, context, alternatives, rationale, usage receipt and later physical consequences persist. Old goal contexts without the new optional personality/relationship fields remain valid and are not rewritten.

The provider uses the existing broker/model/token envelope. A 9.5-second outer deadline sits behind the broker's nine-second worker cutoff; timeout retains the reservation, persistently stops spending and ignores late output. Two consecutive uncertain failures now stop spending across restarts, using durable ledger state. The engine's ten-second deadline remains the final fallback. Neither defaults nor the allocation are increased.

`npm run start:ai:goals` is a prepared, paused local launcher using `data/local/mimir-ai-goals.db`, API 8891 and observer 4176, sharing `data/local/spark-ai-budget.db`. Startup refuses to retrofit goals onto a recorded non-goal world. The older `start:ai` world and normal startup retain their existing configuration. S019 has synthetic verification and a later bounded live local run. The live run accepted one social response but admitted no paid goal choices: all eleven goal contexts had one feasible alternative. Sharing-related retained contacts constrained admission. AI goal qualification, expanded authored regions and hosting remain unfinished; see [live evidence](evidence/first-glow-goal-ai-live-2026-11-13.md).

## Persistent Spark goal loop — local foundation, 2026-11-13

`first-glow-goals.ts` adds a fresh-only `spark-goal-loop-v1` opt-in through `{ goalLoops: true }` on `createWorldV3`/`createWorldFromBundle`. It enables validated activity completion without retagging old histories or changing normal server startup/reset. Cache-preparation executors cannot be combined with this goal executor; one controller owns activity selection.

`requestFirstGlowGoal` returns a candidate checkpoint with a Spark-local context/hash, reflection admission, selected goal, source/provider identity and fallback reason. Goals continue without further adapter calls, check real need/care and travel budgets at activity boundaries, and advance only from authoritative exploration, co-present encounter and mark events. An explore/mark alternative is available when no two-contact meeting site exists. Meeting wait retains only the owner's actual contact, with lifetime and resource/care release bounds. Tagged meeting participants each pay activity costs once.

Checkpoints retain up to 64 goals, 64 dispatches per goal, a 128-pulse lifetime and 16 adapter attempts. These are offline foundation bounds, **not a paid-provider budget**. Source changes during asynchronous evaluation reject stale proposals. Invalid versions, corrupt contexts and malformed progress fail validation. Both transitions deep-clone goal progress; server normalization and bundle-inclusive recovery preserve it. Goal event/summary projections carry actual evidence while omitting private contexts and proposal prose.

`npm run review:goal-loop` runs a network-disabled fixture, writing summaries, checkpoints, events and ledgers under `.tmp/goal-loop-review-*`. The fixture supplies two same-cell contacts, high initial charge and a one-pulse reflection cadence; it is not an active authored bundle or ordinary emergence finding. `npm run test:goals --workspace @mimir/server` checks closed/reopened SQLite and bundle-inclusive restore with equal continuation, and is included in the full local verifier. The initial S018 foundation had no server admission or paid adapter; S019 above now connects those paths. Authored map expansion and deployment remain unfinished. See [S018](../issues/MIM-S018.md), [AI integration](../issues/MIM-S019.md), and [world expansion](../issues/MIM-S020.md).

## Fresh-history Wild Cache choice (local, opt-in)

The engine exports `initializeWildCacheChoice(firstGlowState)`, restricted to pulse-zero histories without events or explanations. Alternatively, pass `{ wildCacheChoice: true }` as the fifth argument to `createWorldV3` or `createWorldFromBundle`. This stores the explicit `choice-before-probe-v1` rule marker. Untagged histories retain their original probe and social-label behavior; normal server creation defaults are unchanged. No existing recording or frozen study fixture is migrated.

At validated cache contact, the tagged rule records the decision before effects. Each Spark's bounded choice record stores its alternative, evidence IDs, follow-up goal and (only after probing) a surveyed Pattern Shard route with navigation revision. The normal need and reachability checks take precedence next pulse. Actual follow-up goals are linked as consequence evidence; planned goals are not successful arrivals. The deterministic threshold rule does not use a scored personality contest (the legacy explanation score fields remain neutral).

See [offline verification](evidence/first-glow-cache-choice-2026-11-09.md). This engine opt-in does not enable AI, create or advance a running observer, or update previously generated Chronicle editions.

## Owner-selected live Spark pilot — 2026-11-08

The owner selected real Spark AI with a **USD 5 total pilot allocation**, replacing privacy-paperwork admission for this local pilot. [The live pilot guide](spark-ai-local.md) and [verification](evidence/spark-ai-live-2026-11-08.md) describe the implemented path. One real response was validated and committed; the observer is paused. This is operational pilot evidence, not completion of the matched S004 study or independent S001 human review. Earlier study requirements and no-call statements below describe their dated study scope; the frozen v4 manifest is retained unchanged and is not the current live application's source fingerprint.


Date: 2026-11-08 (study integration verified locally; no fresh hosted verification)
Status: Current implementation reference for the local and single-instance hosted First Glow observer.

This document describes what is implemented in the repository today. Dated plans contain proposals and historical implementation notes; they do not establish runtime support.

## S004 v4 isolated adapter and accounting (local, 2026-11-08)

The study path now uses `scripts/model-study-v4.mjs` rather than the normal application Gemini adapter. It serializes one minimized text/JSON request to the pinned `gemini-3.5-flash-lite` US multi-region `.rep.googleapis.com` endpoint, with explicit `MINIMAL` thinking and no ineffective sampling overrides. The generation worker rechecks endpoint/project/model and payload restrictions before its live branch; synthetic workers forbid network access. Normal server provider defaults are unchanged.

The study guard persists overhead, prior allocation, a fixed full request reservation and the tighter funded-attempt allowance. It protects initial funding for seeds 2/4/8 and never releases reservation differences from usage alone. Prompt, candidate, reasoning, total and included-cache usage are checked before accepting a bounded proposal; unknown categories, identity/accounting mismatches and privacy breaches stop immediately. The active v4 manifest binds fresh `study-v4-seed-*` histories and the study source; the old v3 manifest/guide/controls are byte-preserved. [V4 protocol](model-study-s004-protocol-v4.md) keeps unknown live bounds, account/privacy evidence, independent review and owner approval blocking. Synthetic prices/token maxima remain fixtures, not a provider guarantee.

Prior-allocation limitation: the guard accepts prior dollars but initializes an empty attempt list; it does not import historical total/per-seed attempt counts. If the owner declares any outside attempt, those counts require reconciliation and enforcement before execution, not merely a nonzero dollar field. The [owner decision sheet](model-study-s004-owner-decisions.md) keeps unknown prior history blocking. The [offline bound audit](evidence/model-study-v4-offline-bound-investigation-2026-11-08.md) reconstructs three recorded pre-treatment wires with exact ledger hashes; it is not a runtime payload allowlist or a complete live-path/token proof.

[V4 offline verification](evidence/model-study-v4-verification-2026-11-08.md) records 27 study tests, six complete histories, a 240-pulse integrated rules repeat and exact admitted-event observer navigation at desktop/mobile widths for all six histories. Canonical review hashes remained unchanged; services used only derived test databases with AI/pulsing disabled. This establishes local technical behavior, not provider qualification, paid reconciliation or human engagement.

The First Glow observer's follow mode is browser-local presentation state. Its selected Spark, live/history view, camera tracking, presentation style, and recovery state are derived from committed snapshots and history responses. Following, manual camera movement, and returning to World never call owner routes, advance the scheduler, allocate reflection capacity, invoke a provider, or write canonical history. Historical follow views retain the timeline and pulse identity supplied by the server, while unavailable Spark/checkpoint states remain explicit rather than being invented.

## Delivery evidence boundary

Repository delivery was reconciled against local and remote `main` at `b5f6997` on 2026-11-07. Connected observer repairs (#309/#310), follow-up verification (#312), session recovery (#316), outage coverage/recovery (#317/#318), capacity tooling (#319), limited-staging decisions (#320/#321), and refresh preparation (#322) are merged. Historical check counts apply only to their recorded source revisions; this documentation review does not rerun or certify them against a new revision.

Merged source is distinct from deployed assets and live operational acceptance. The dated [hosted update](evidence/hosted-outage-readiness-2026-10-23.md) and [refresh preparation](evidence/hosted-refresh-preparation-2026-10-24.md) describe their own observed environments. No fresh deployment or cloud inspection was performed for this reconciliation. [S001](../issues/MIM-S001.md) retains independent human review; [E002](../issues/MIM-E002.md) retains financial attribution, genuine hosted refresh and wider-access gates.

## 1. System overview

Mimir is a single-authoritative-server simulation with a browser observer client:

```text
                         HTTP / SSE
    React + Phaser  <-------------------->  Fastify server
    packages/web                            packages/server
         |                                        |
         |                                        +-- SQLite checkpoints/events
         |                                        +-- scheduler and owner commands
         |                                        |
         +-------------------------------  @mimir/engine
                                                  |
                                           deterministic world rules
                                           world data and pathfinding
                                           @mimir/world-data contracts
```

The server owns canonical world state. The browser renders state and requests historical snapshots; it does not decide movement, resource outcomes, social consequences, or timeline mutations.

The current deployment target is one Node web service with one SQLite writer and a persistent disk. Horizontal scaling is not supported by the current persistence model.

### Rendering technology boundary

Phaser remains the renderer for the browser observer, with Tiled as the visual world-authoring tool and the shared world-data contract as the authority for geometry, movement, and interactions. More maps or buildings alone are not a reason to change engines.

Reconsider Godot if Mimir shifts toward directly controlled gameplay, substantial real-time physics, complex interactive scenes and animation tooling, extensive scene-based interiors, native desktop/mobile releases, or if maintaining custom scene tooling becomes a demonstrated recurring cost. Evaluate that choice with one representative prototype comparing authoring effort, browser and native delivery, performance, inspector integration, and deterministic replay.

An initial Godot experiment should consume the versioned world/state contract as an alternate viewer. Moving the authoritative simulation into Godot is a separate architecture decision that requires a headless-server strategy, persistence compatibility, and determinism testing; Mimir must retain only one authoritative movement system.

## 2. Repository structure

```text
packages/world-data/  Shared schema-3 bundle types, canonical hashing, spatial queries, validation
packages/engine/      Deterministic First Glow actions, Spark state, charge/readiness rules
packages/server/      Fastify API/SSE, scheduler, SQLite timelines, owner commands, backups
packages/web/         React panels, Phaser scene, opt-in Web Audio presentation, Vite build, browser E2E tests
assets/world/         Authored Tiled source, templates, fixtures, immutable generated bundles
assets/audio/         First Glow palette, review-candidate media, and audio provenance inputs
assets/licenses/      Active First Glow asset provenance
data/                 Ignored local databases, settings/game state, and backup output
.tmp/                 Ignored disposable test/profile output
scripts/              Local launcher, world importer/validator, and profiling harnesses
docs/                 Current references, dated plans, runbooks, and evidence
```

The root npm workspace builds four packages in dependency order: world-data, engine, server, then web. The local launcher builds when required, starts the server, and starts the Vite preview client on port 4173.

## 3. Engine architecture

The engine package is TypeScript-only and has no browser or Fastify dependency. Its public model includes:

- `WorldState`: First Glow world identity, seed, pulse, schema-3 simulation version, structured-v2 spatial model, and `firstGlowState`.
- `Spark`: charge, charge deficit, readiness, activity, position, route/contact state, and bounded local knowledge.
- `FirstGlowSocialState`: Spark-local witnessed facts, communicated claims, uncertain inferences, bounded relationship trust, and resolved commitments. It is serialized inside the schema-3 First Glow checkpoint; checkpoints without this state fail explicitly rather than being invented.
- `FirstGlowReflectionMemoryContext`: a bounded, deterministic projection of one Spark's lived records. It keeps witnessed facts, received reports, subjective inferences, and prior recorded consequences distinct, includes retention and reconstruction provenance, excludes future/private evidence, and is included in the interpretation context hash so provider-free replay can reconstruct the exact input.
- `FirstGlowWorldCodex` and `FirstGlowContextPacket`: versioned authored First Glow rules, terminology, provider limits, Spark profile, bounded local memory, and recent witnessed events. The canonical packet hash makes persisted-state reconstruction auditable; hidden evidence and tampering fail closed. Token estimates, output usage, and latency are retained with the decision usage record without storing hidden chain-of-thought.
- `FirstGlowIntention`: a versioned Spark-local proposal that reuses an existing First Glow activity, persists its evidence/context hash and causal IDs, and transitions through active, completed, invalidated, or interrupted states under the authoritative pulse executor.
- `FirstGlowExplanation`: deterministic, committed choice rationale with scored need, values, local knowledge, trust, commitments, cost, and risk factors plus evidence and consequences. It is serialized with the First Glow checkpoint for live and historical observer reads.
- `WorldEvent`: objective First Glow events such as pulses, movement, drawing charge, sharing, and world-object changes.
- `SocialInterpretation`: a retained record type with source, summary, event reference, and evidence event IDs. Selected ambiguous First Glow events also produce deterministic rules-only baseline records with Spark-local evidence, stable context hashes, and no world-state authority.
- `FirstGlowReflectionCapacityState`: the persisted `world-age-v1` First Glow RC policy and scheduler. First Glow supplies RC 1; an explicitly designated test Hero receives `ceil(RC * 1.5)` (RC 2 in First Glow). Hero natural generation is disabled, personal age/readiness do not assign RC, and assignments retain provenance. The 64-pulse scheduler records deterministic phase offsets, windows, suppression, usage, global contention, and provider-free historical playback. Promotion preserves prior usage and schedules only future windows, so it cannot create a burst or catch-up debt. Legacy schema-3 checkpoints initialize this metadata without changing existing history or decisions.
- `FirstGlowAttentionDecision`: a deterministic, auditable policy record that identifies novelty, encounters, scarcity, conflict, relationship events, or repeated routine failure as possible attention triggers while keeping travel, replanning, rest, familiar charge gathering, and ordinary waiting rules-only. Planned per-Spark allowances are governed by versioned world-age Reflection capacity (RC): world age maps directly to integer RC, with First Glow baseline RC 1 and rare Hero Sparks initially at RC 2; later world ages and natural Hero generation remain separate design gates. Historical cadence experiments retain their recorded profiles, while active RC scheduling uses deterministic intervals, stable Spark phase offsets, scheduled window indexes, next eligible pulses, and explicit cadence suppression reasons. A separate global daily cap, duplicate-event protection, repeated-event cooldowns, timeout configuration, and historical-playback suppression remain policy state; none can change simulation authority.
- `FirstGlowHistory`: canonical checkpoint history for committed movement, decision, intention, and bounded conversation records. Movement records preserve traversed cells, route revision, cost, resource effects, and the resulting event. Decision records preserve candidates, selection, rules/provider source, profile version, evidence IDs, context hash, validation, fallback, latency, and usage metadata without storing hidden model reasoning or animation frames. Meeting conversations are limited to two validated utterances, retain stable encounter/utterance IDs, pulse, participants, quoted text, evidence, prompt/context versions, and accepted effects; only witnessed evidence may become recipient memory, and duplicate or malformed records fail closed.
- `ChronicleEdition`: immutable observer artifact built from an authorized timeline checkpoint. The deterministic baseline emits moment, personal, and season chapters with bounded paragraphs, exact saved utterance quotes, source event/utterance references, selected Sparks, source snapshot hash, narrator version, and historical-scene capture provenance. Editions are stored in SQLite separately from canonical simulation state; rereading is provider-free and explicit regeneration increments a retained revision.
- `FirstGlowOfflineHybrid`: an evaluation-only local fake-provider loop that passes bounded personality/evidence contexts through the deterministic attention gate and interpretation validator. It can exercise accepted proposals, malformed or invalid outputs, unsupported claims, timeout, provider failure, budget exhaustion, and historical replay without granting the provider world-state authority.
- `FirstGlowWorldBundle`: schema-3 bundle metadata, map geometry, object definitions/instances, interaction slots, spawns, and asset manifests.
- `WorldRuntimeState`: mutable navigation revision, object blocking state, and reservations.

`createWorldFromBundle()` creates the deterministic schema-3 initial world. `advanceWorld()` advances exactly one committed simulation pulse and returns the next state, objective events, and interpretations. First Glow action selection is deterministic and uses stable IDs, bundle geometry, and stored simulation state. The world records a seed, but the current advance path does not pass it to action selection. No ambient randomness or live AI is used.

The engine currently contains deterministic First Glow creation/advance, charge pools and charge accounting, shelter niches, traces, exploration, drawing, rest/readiness, sharing, structured object footprints, contacts/reservations, navigation revisions, runtime blockers, and bounded event records. Legacy creation entry points remain explicit failures or compatibility-shaped fields; they are not supported new timelines.

`advanceWorld()` and `runPulses()` return deterministic rules-only interpretation records for selected First Glow social encounters. Normal First Glow pulses also resolve witnessed dilemma events into bounded social state before explanation records are appended, so trust, commitments, and Spark-local knowledge can affect later autonomous activity selection. `first-glow-interpretations.ts` defines the bounded provider adapter contract, context hashing, evidence/knowledge validation, budget telemetry, and deterministic fallbacks. Normal engine pulses remain rules-only. The server can separately invoke the explicitly gated Spark AI runtime described above; default startup remains provider-disabled. Sharing is an explicit deterministic First Glow action.

The P3 conversation slice records a co-present `meet` event as a deterministic, two-turn exchange. The first accepted utterance adds a witnessed communicated claim to the recipient's local memory, making the exchange consequential without granting either speaker hidden or future facts. Refusal/interruption, provider timeouts, budget exhaustion, kill-switch behavior, and unrestricted dialogue remain outside this deterministic slice; live-provider evidence is not implied.

The P4 Chronicle surface is served by `GET /api/chronicle` and regenerated explicitly through the owner-only `POST /api/owner/chronicle/regenerate`. The server assembles only committed events, interpretations, and checkpoint history at or before the requested pulse, validates the edition before persistence, and links observer reading back to `/api/history` scenes. Chronicle text is not Spark knowledge and does not change world state, Spark capacity, or provider budgets.

The offline observer carries an explicit Spark selection through `?view=history`,
the personal chapter, and evidence links to an exact timeline/pulse/event. The history
viewer renders that checkpoint's immutable bundle and committed Spark positions, and
keeps the original live Spark, Follow mode, and presentation as a separate return target.
Unavailable checkpoints and absent Sparks remain explicit. Hosted archive navigation
continues to use its separate authenticated archive viewer.

`GET /api/chronicle` accepts `sparkId`; editions retain that selection and use a
selection-aware source identity/cache lookup. Revision numbers remain unique per
timeline/cutoff, and existing editions are retained unchanged. New public event rows
preserve `actorId`, `participants`, and `structuredKind` alongside their coarse event
category. For older rows, the read projection joins the exact event ID and pulse to
the original checkpoint's structured events. Missing attribution stays missing; no
saved checkpoint or event row is rewritten or inferred from message text.

`npm run test:history --workspace @mimir/web` includes the connected offline browser
regression: three six-Spark cohorts, 80 pulses each, archived and earlier evidence,
quiet cutoffs, desktop/mobile navigation, the live return target, unchanged simulation
history hashes, and zero provider calls. Chronicle tests cover selected-edition
persistence and read-only attribution recovery.

The versioned First Glow personality profile is materialized from authored Spark cards into each interpretation context and its hash, then recorded on the interpretation. It carries value tendencies, practical needs, relevant relationship tendencies, and the authored knowledge boundary; it is separate from mutable Spark-local knowledge and never exposes another Spark's private knowledge.

The product decision for AI-P1 is to defer any external provider runtime role. The local fake provider and matched review harness are offline evaluation tools only; they do not transmit data, require credentials, or establish provider readiness. The rules-only resolver remains the normal-operation product path and the simulation authority. Historical playback never requests a provider, and invalid or unsupported proposals, unavailable evaluation inputs, timeouts, and budget exhaustion use the deterministic fallback.

AI-P7 through AI-P9 have now established the bounded path for AI-assisted play. AI-P8 proved that retained validated alternatives can produce downstream social diffs through the existing deterministic social transition in disposable staging. AI-P9 verified the four-per-Spark and sixteen-global budget boundary, rules-only fallback, and provider-free replay under a local rehearsal plus retained model outcomes. AI-P10 proceeds with implementing this path behind the server-owned attention gate, deterministic transition adapter, explicit budget controls, and replay-safe decision records. This remains a narrow internal runtime pilot boundary: the provider supplies proposals only, the server commits consequences, and the public observer and historical playback remain provider-free.



AI-P11 now records the bounded live provider contract in [AI-P11 evidence](evidence/ai-p11-bounded-live-provider-contract-2026-09-12.md). The selected route is Vertex AI with Gemini 2.5 Flash-Lite in the previously authorized `mimir-realm` project, with a privately recorded hard spending cap for AI-P11, superseding the smaller AI-P6 evaluation cap, four-per-Spark and sixteen-global daily limits, one-second timeout, zero retries, explicit privacy/retention review, and a disabled-by-default kill switch. This authorizes implementation of the boundary, not a live request: the provider may propose only a validated interpretation, deterministic server transitions commit consequences, rules-only fallback is immediate, and historical playback/public observation remain provider-free.

For Google specifically, Google AI Pro is a consumer subscription and is not the runtime's billing or authorization boundary. Gemini Developer API and Google Cloud Vertex/Agent Platform usage must be treated as separately metered channels with their own project, credentials, quotas, billing mode, and hard cap. Provider evaluation and spending boundaries are documented in the [AI plan](ai-plan.md); the runtime must not infer free API access from a user's subscription. A Google experiment would remain evaluation-only and would record the selected channel, model/SKU, price snapshot, token usage, and cap decisions alongside its blinded quality results.

The proposed future hybrid behavior and recording contract are documented in the [AI plan](ai-plan.md). Routine First Glow activity remains rules-only; deterministic attention triggers may request a bounded Gemini 2.5 Flash-Lite proposal that includes a versioned Spark personality profile and Spark-local evidence. The server validates and commits the outcome, records committed movement and decision metadata, and historical playback reads those records without provider calls. This is not current runtime behavior.

Resonance-P1's `resonance-observation.ts` is a separate, pure observer-facing evaluator. It derives qualifying, near-miss, conflicting, or unresolved candidate status from ordered objective-evidence fixtures, while excluding Spark-private knowledge. It does not mutate First Glow state or create an Anchor.

Resonance-P2 adds the first bounded stateful Anchor: `resonance-anchor.ts` validates an explicit pending candidate against the authored Shelter Loom object and rest slot, its required capability and walkable placement, and sorted committed evidence. A successful creation records a schema-1 `resonance` candidate/Anchor state inside the checkpoint, emits an objective world-object event, and preserves a bounded shared-rest possibility and access tension. The creation path is deterministic and rejects incomplete, invalid, already-created, or uncommitted-evidence candidates without creating an Anchor.

Resonance-P3 adds `resonance-loom-choice.ts`, a pure server-invoked transition for that Anchor's one bounded social possibility. Two explicit, defensible choices are available when both Sparks are co-present at the authored rest slot and the actor can witness the supplied evidence: `yield-rest` grants the beneficiary readiness while costing the actor charge/readiness, while `hold-rest` keeps the priority and gives the beneficiary a readiness setback. Both paths write an adjustment ledger entry, reciprocal bounded trust evidence, a durable `ShelterLoomDecisionRecord`, and a `shelter-loom-choice` objective event. The owner endpoint commits the whole state transactionally; the observer renders the decision and evidence without fabricating gameplay.

Resonance-P4 adds `resonance-crossing-rule.ts` and `resonance-crossing.ts` for a substantively different Anchor at the authored `relay-crossing` object (`tiled-103`). A candidate must contain plural `meet`, `mark-trace`, and `explore` evidence from at least three Sparks, with explicit charge and pulse-span thresholds. Once formed, the Crossing of Voices offers a witnessed `follow-signal` or `hold-course` choice: the former spends charge/readiness and changes the actor toward exploration, while the latter preserves readiness and the known-course activity. Both are durable, replayable objective consequences; neither is treated as the winning philosophy.

Resonance-P5 adds `resonance-transition.ts` as a pure eligibility and carry-forward contract for a future Hearth Circuit age. It requires two distinct active Anchor kinds, two maintained season windows, objective evidence, and recorded practice decisions from committed First Glow history; unresolved tensions remain evidence rather than disqualifiers. Carry-forward preserves Sparks, relationships, commitments, objective and interpretation records, Anchor places/evidence, source timeline and bundle hashes, and explicit schema/runtime identifiers. A deferred result is still a valid First Glow story. This does not activate a Hearth Circuit runtime, institutions, markets, or credits.

## 4. World-data pipeline

The implemented source-of-truth boundary is:

```text
Tiled JSON source
        |
        v
scripts/import-world.mjs + validateWorldBundle()
        |
        v
schema-3 FirstGlowWorldBundle
        |                         |
        v                         v
server pathfinding          Phaser rendering
and interaction rules       and interpolation
```

The checked-in active source is `assets/world/maps/first-glow.tiled.json`. It imports the schema-3 First Glow bundle with stable object, Spark, route, and asset identifiers. Generated hash directories are immutable and include the normalized world, manifest, and referenced assets. The active observer renders the dark Living Circuit scene with manifest-qualified First Glow assets; the removed village backdrop is not part of the current runtime.

## 5. Server responsibilities

The Fastify server is the sole live simulation writer. At startup it:

1. Opens or creates the configured SQLite database.
2. Creates the timeline, checkpoint, event, interpretation, and runtime-metadata tables when needed.
3. Loads the active timeline's newest checkpoint.
4. Requires the First Glow simulation version, structured-v2 spatial model, and valid `firstGlowState`; incompatible checkpoints fail. It then supplies defaults for auxiliary envelope fields without migrating a village save.
5. Starts the optional scheduler.

The server commits a pulse inside a SQLite transaction. It calculates the next engine state first, then writes the checkpoint and all returned events and interpretations, commits the transaction, updates in-memory state, and broadcasts the committed result to connected SSE clients.

The scheduler can be paused, resumed, or assigned a bounded interval. Manual pulseing uses the same commit path as scheduled pulseing.

All state-changing owner requests use the server writer gate, including scheduler changes, pending world-object commands, resonance mutations, archive/continue, branch, and reset operations. Scheduled bundle-inclusive backups acquire the same gate, and pulses queue through it as well. The gate is the single-instance serialization boundary: a writer must finish before another writer or backup snapshot can begin, and failed transactions release the gate without publishing in-memory state. Future owner routes that write SQLite or authoritative state must use this boundary rather than opening a competing transaction.

### Persistence model

The current database stores:

- `timelines`: timeline identity, parent relationship, status, and archive time.
- `timeline_checkpoints`: serialized state snapshots by timeline and pulse.
- `timeline_events`: serialized objective events by timeline and pulse.
- `timeline_interpretations`: serialized social interpretations by timeline and pulse.
- `pending_commands`: durable idempotent next-pulse world-object commands.
- `runtime_metadata`: active timeline selection.

The initial checkpoint is stored at pulse 0. Each successful pulse stores another complete serialized state snapshot. Branching copies checkpoint, event, and interpretation history through the selected source pulse, then activates a new child timeline. `reset-v3` archives the active timeline and creates a new schema-3 First Glow world with a new seed and Spark count.

Public archive export uses a read-only SQLite connection and writes one immutable JSON chunk per selected checkpoint. A publication requires at least three ordered checkpoints including pulse 0, validates every chunk against its manifest checksum and First Glow schema, stages objects before the catalog commit, and emits a dated publication record containing the source backup label, timeline IDs, checkpoint pulses, retention, chunk policy, quarantine, and rollback guidance. This path does not write canonical history or participate in the live scheduler.

SQLite WAL checkpoints and scheduled local database copies are supported. The scheduled copies remain on the same disk; Hosted-P5 also validated an operator transfer to, and recovery from, an independent Google Cloud Storage destination. Automatic cloud-upload scheduling is not yet wired into the service.

## 6. HTTP and live-update surface

### Observer reads

- `GET /health` â€” service health, current pulse, scheduler state, active timeline, database path, and social configuration.
- `GET /api/world` â€” current state; `?pulse=` retrieves a stored checkpoint.
- `GET /api/events` â€” objective events for the active timeline.
- `GET /api/interpretations` â€” persisted social interpretations.
- `GET /api/history` â€” persisted timeline/checkpoint history plus canonical movement and decision records from the selected historical state. The viewer reads these records directly; it does not reconstruct them through AI.
- `GET /api/metrics` â€” checkpoint-derived charge, readiness, deficit, travel, and collection metrics.
- `GET /api/report` â€” current timeline and season summary.
- `GET /api/design` â€” Living Circuit/First Glow identity and `FIRST_GLOW_DESIGN` cards, event prompts, opening question, and knowledge boundary under `firstGlow`; legacy card/dilemma arrays are empty and the shared store is omitted.
- `GET /api/resonance` â€” the authored Resonance observation-rule examples and their fixture evidence, labeled `source: resonance-contract-fixtures`. It excludes live pulse/event counts; missing fixtures return an empty, unavailable example projection. The observer labels the panel and evidence as examples, separately from committed events and Anchors. It is not a state-changing Anchor endpoint.
- `GET /api/resonance/anchors` â€” the active timeline's persisted Resonance candidates and Anchors.
- `GET /api/region` â€” settlement metadata and retained route/trade/weather/hazard envelope fields. These fields do not establish an active market, trade network, or weather simulation.
- `GET /api/timelines` â€” available timeline metadata.
- `GET /api/history` â€” a bounded historical-view response for one timeline and checkpoint, including lineage, version identity, recorded objective events, and recorded interpretations. Empty timelines, missing checkpoints, and incompatible checkpoints return explicit states; no replay or new interpretation is generated.
- `GET /api/live` â€” Server-Sent Events stream with the current state and committed pulse updates.

Firebase Hosting serves the observer page; its active build requests API/SSE directly from the existing `mimir-observer-bridge` Cloud Run service. The bridge requires an approved, verified Google ID token, forwards only the read/SSE allowlist to the private VM, and never forwards owner or mutation routes. Hosted auth is forced by the guarded deployment command. The bridge uses h2c behind Cloud Run TLS termination to propagate cancellation. Opt-in process-scoped stdout gauges distinguish authenticated live handlers from successful SSE bodies; no public telemetry endpoint exists. Hosting rewrites remain configured but failed prompt disconnect propagation in the dated [Observer-P5 observation](evidence/observer-p5-stream-cleanup-2026-10-03.md). Previously cached bundles require fresh navigation. Hosting is not simulation authority.

### Owner operations

State-changing operations require the configured `OWNER_TOKEN`, supplied through the `x-owner-token` header:

- `POST /api/pulse` â€” commit one pulse.
- `POST /api/scheduler` â€” pause/resume the scheduler or change pulse interval.
- `POST /api/owner/archive` â€” archive the active timeline.
- `POST /api/owner/continue` â€” reactivate the active timeline.
- `POST /api/owner/branch` â€” branch from a selected checkpoint.
- `POST /api/owner/reset-v3` â€” archive the current timeline and create a schema-3 First Glow world.
- `POST /api/owner/world/object` â€” change runtime blocking for a known world object.
- `POST /api/owner/resonance-anchor` â€” create the Shelter Loom only from a complete, server-validated candidate whose evidence IDs are already committed on the active timeline.
- `POST /api/owner/resonance-choice` â€” commit one witnessed Shelter Loom `yield-rest` or `hold-rest` choice, with explicit eligibility, resource deltas, durable consequence, and objective evidence.
- `POST /api/owner/resonance-crossing-anchor` â€” create the contrasting Crossing of Voices only from a complete candidate whose committed evidence meets the relay-crossing rule.
- `POST /api/owner/resonance-crossing-choice` â€” commit one witnessed `follow-signal` or `hold-course` decision with explicit resource, activity, and evidence consequences.

Owner authentication is required whenever `SERVE_WEB=true`, `MIMIR_HOSTED=true`, or the server binds to a non-loopback host. Startup fails closed if that configuration has no `OWNER_TOKEN`, and state-changing requests must supply the matching `x-owner-token` header. Only explicit loopback local development may run tokenless. A configured token provides owner authentication, not a multi-user account or role system.

## 7. Browser architecture

The web package uses React for application state and panels, Phaser for the First Glow canvas, and Vite for development/build/preview.

The browser:

- Loads current world, event, interpretation, metric, design, and regional data through HTTP.
- Subscribes to `/api/live` for committed updates.
- Maintains a live state and an independently selected historical state.
- Requests historical checkpoints through `/api/world?pulse=`.
- Displays First Glow nodes and Sparks, routes, event history, interpretations, charge/readiness metrics, bundle assets, and owner controls.
- Animates committed movement for presentation; the authoritative route and outcome come from the server.
- Supports playback rate, map zoom, timeline scrubbing, Return to Live, settlement selection, and mobile-width layout checks.
- Provides a separate `?view=history` History & scenarios entry point. The history viewer lists recorded timelines and checkpoints, labels the selected state as historical, shows parent lineage plus simulation/spatial/bundle identity, and keeps recorded facts separate from readings. Empty, unavailable, and incompatible-history states are explicit and link back to the live observer.
- Displays persisted Resonance Anchors with their authored location, bounded possibility and tension, access rule, and objective evidence IDs.
- Provides optional First Glow audio controls. Browser-local preferences govern master, music, effects, ambience, mute, and opt-in session activation; they do not affect server state or a timeline.

Historical playback reads persisted interpretation records and does not call an AI provider.

### Audio presentation boundary

First Glow audio is a browser-only presentation layer. It starts only after an observer gesture, remains silent by default, and the observer remains readable with every channel muted. The event ledger maps only newly received committed event IDs to effects, preventing cues from initial snapshots, historical scrubbing, replay, or SSE reconnect batches. Selection feedback is an explicit observer action; place-aware ambience and optional score derive only from rendered, visible selection context (open space, charge pool, shelter niche, or quiet route). Audio never supplies simulation inputs, hidden knowledge, predicted travel, or evidence of an uncommitted outcome.

Repository-authored procedural Web Audio provides the baseline effects, ambience, and score fallback. The optional music and SFX files in the web public directory are review candidates whose external origins and redistribution rights remain unverified; their provenance is tracked separately and they must not be promoted as approved public-release assets without that verification.

## 8. Local and hosted runtime

### Local development

```text
npm start
  -> npm run build (only when required output is missing)
  -> Node packages/server/dist/index.js on 127.0.0.1:8888
  -> Vite preview on 127.0.0.1:4173
```

The server can also run independently with `npm run dev:server`, and the browser can run with `npm run dev:web`.

The local launcher supplies the exact loopback preview origin as `OBSERVER_ORIGIN`
unless explicitly overridden, including custom `WEB_PORT` values. Empty overrides
retain denial of cross-origin reads. Preview uses a strict port so it cannot silently
move away from the allowed origin. Direct server startup keeps the server's default
deny policy. `npm run test:local-observer` exercises the real launcher, CORS reads and
preflight, explicit overrides, example provenance, and desktop/mobile rendering on
isolated ports/databases; the complete local verifier runs it after the browser checks.
Launcher builds prefer npm's supplied entry point and support Windows/Unix installation
layouts when started directly through Node.

### Hosted configuration

`render.yaml` defines one Node web service with:

- `SERVE_WEB=true` for same-origin static browser serving.
- SQLite at `/var/data/mimir.db`.
- A mounted persistent disk.
- Fifteen-second default pulses.
- Daily local backup copies under `/var/data/backups`.
- An externally supplied `OWNER_TOKEN`.

On 2026-10-03, merged PR #266 at `d1aa17e` was deployed with the guarded clean-main workflow to Hosting version `2b0287700b57d854`; exact live index and both hashed assets matched. Desktop and mobile-sized core rendering succeeded and all five required authenticated bundle SVGs returned 200. Mobile zoom controls remain clipped, so this is not an unqualified usability pass. Single-session request/cache/transfer measurements, bridge/VM CPU and bridge memory, Compute quotas, and September project/service billing are recorded in the [dated deployment evidence](evidence/hosted-p18-p4-deployment-2026-10-03.md). Those recovery and absent-telemetry gates describe the October 3 deployment checkpoint. Completed #269 recovery evidence and #270 process-scoped cleanup evidence now supersede them. The rehearsal still needs explicit audience/window approval and authenticated hosted mobile verification of merged PR #288. #257/#253 stay open; #201 remains the historical closeout with limitations. P2/P3 closed-as-not-planned status is not acceptance evidence. No capacity, availability, or browser-attributable cost claim follows.

### Hosted replay and release verification

The hosted browser supports authenticated archive selection and interactive checkpoint replay independently of live-state rendering. Hosted-P16 exports ordered multi-checkpoint archives from read-only SQLite, validates immutable chunks, and publishes the catalog last. Operational replay during a live outage remains unverified.

The October 23 bounded operation published the archived pulse-64 world at checkpoints 0, 16, 32, 48, and 64; actual cloud bytes and authenticated replay were verified. Only the VM backup library was updated to the current `VACUUM INTO` snapshot implementation, with the remainder of the backend retaining its prior recovery source. Fresh backup/restore matched the archived history after restart. Automatic off-VM replication is now enabled through a separate daily systemd worker, with hourly freshness/failure checks and durable receipts uploaded beside each archive. The worker uses scoped keyless writer impersonation; a separate read-only identity verified an isolated download/restore. The older simulation backend was not restarted or upgraded for this operation. Its in-process replication status remains distinct from the dedicated worker status. See [automatic backup evidence](evidence/automatic-offsite-backups-2026-10-23.md). See [dated operational evidence](evidence/hosted-bounded-history-2026-10-23.md).

`npm run deploy:hosting` checks a clean merged `origin/main`, builds with `VITE_FIREBASE_AUTH_ENABLED=true`, deploys Hosting, and verifies served HTML and hashed assets. Hostname enforcement also requires auth at `mimir-realm.web.app`. See [the hosted runbook](hosted-observer-runbook.md).

The dated Hosted-P17 closeout records Hosting version `82cc93e9b9470f8e` from `fbd4eb8` on 2026-09-15. Missing/malformed token rejection, observer-only UI, VM continuity, bridge-to-VM recovery, and synthetic/quota evidence were recorded. Expired/wrong-project/unapproved tokens, authenticated SSE refresh/reconnect/closure, bridge process restart, outage replay, and real audience/billing telemetry remain unverified. The 2026-09-26 console recheck mapped a displayed release suffix to this retained version and found it behind `origin/main`; it did not provide a current source/build linkage. No fresh deployment or readiness is implied.

## 9. Verification architecture

The web package runs `npm run typecheck --workspace @mimir/web` before Vite bundling. React/Vite declarations and ES2022 browser library contracts are explicit. Geometry is a browser projection of the canonical First Glow bundle, not a second simulation contract. The local verifier also runs the observer zoom, owner header/layout, item chooser, pulse gate, owner authentication, security-P4/P5, and Chronicle checks.

Dependency maintenance keeps the React plugin on its Vite-8-compatible 5.2 line so npm does not install a separate Vite 6 peer. The root override pins `@grpc/grpc-js` to 1.14.5 across Firebase client/Admin dependency paths to address certificate-validation and error-disclosure advisories; revisit the override when upstream dependency ranges include patched versions. The refreshed Google Storage dependency chain no longer requires the vulnerable UUID 9 package. Use `npm ci` and `npm audit` to verify the locked graph; a clear audit is not a substitute for server and browser acceptance checks.

The 2026-10-22 lockfile refresh used npm 10.9.9. npm 11.11.1 successfully installs and audits this lockfile but can report the forced Firebase gRPC dependency as invalid in `npm ls`; npm 10.9.9 recognizes the override. Check the installed versions and compatibility tests rather than downgrading gRPC to satisfy that reporting discrepancy.

All changes to `main`, including documentation, require a pull request. Verification is local-only: run `npm run verify:local` before creating or updating a PR and stop on failed or blocked checks. The automatic GitHub test workflow is disabled and the required CI status rule has been removed; pull-request, force-push, and branch-deletion protections remain active.

`scripts/verify-local.mjs` builds once and runs the former CI build/test checks sequentially, including the connected-history, dedicated history-viewer, and real-launcher browser tests. It records actual exit codes, logs, and start/end source identities under `.tmp/verification/`; source changes invalidate the result. A failure stops subsequent checks. Launcher tests use disposable ports and databases, and the runner restores its freshly built web output afterward so a custom local preview keeps its API target.

Recognized credential-shaped child output is redacted before console and log writes and fails verification. Complete-line buffering handles split chunks, private-key bodies are withheld, and overlong lines fail closed. These patterns are an additional diagnostic guard, not proof that arbitrary output contains no secrets; authenticated CLI account/configuration JSON must still be reduced to allowlisted non-secret fields before printing.

Affected local browser and server integration tests allocate temporary loopback ports, await child exit (including signal-only exits), and use isolated databases. Browser captures default to `.tmp`; explicitly selected evidence destinations are used for publication. The ambient-audio regression waits through delayed ambience/score scheduling and fails on browser runtime errors.

The repository includes these verification layers:

- Engine tests for deterministic seeds, First Glow actions, charge/readiness accounting, sharing, bundle validation, routing, and persistence boundaries.
- Engine interpretation tests for stable context hashes, evidence-scoped validation, deterministic fallbacks, budget telemetry, historical replay without provider calls, and a matched 20-encounter rules-only/AI-on review harness using a local fake provider.
- Engine attention-policy tests for deterministic trigger classification, auditable suppression reasons, replenishing per-Spark/global caps, duplicate-event and cooldown handling, timeout configuration, powers-of-two cadence intervals, phase offsets, day rollover, cap contention, and historical playback without opportunity creation.
- AI-P18 control runners compare readiness-tier and age-day budget profiles across fixed seeds with provider-free replay. The private Vertex quality evidence is retained separately; it does not make the provider part of the normal runtime.
- Engine Resonance-observation tests for deterministic fixture evaluation, distinct candidate statuses, objective-evidence ordering, and private-knowledge exclusion.
- Engine Resonance tests cover deterministic Shelter Loom and Crossing of Voices creation, knowledge-boundary rejection, distinct durable choice paths, and near-miss/invalid-placement candidates; server backup coverage includes the current Anchor-capable world bundle.
- The fixed-control season-review runner for abundance, scarcity, information-gap, and promise-breach seasons, with preserved matched-seed reports and representative evidence chains.
- The production-profile harness measures two deterministic engine runs and built-preview desktop/mobile observer views with an explicit bundle, seed, workload, and isolated runtime. Its 2026-09-11 evidence records desktop results and the current mobile DPR2 limitation rather than claiming general device readiness.
- Server tests for First Glow commands, restart equivalence, bundle-inclusive backups, asset validation, state normalization (`test:state`), and gated AI runtime configuration (`test:ai-runtime`).
- `npm run test:public-archive` validates archive contracts; `npm run test:hosted-auth-boundary --workspace @mimir/web` covers hosted frontend auth enforcement. RC-P4 evaluation tests also run the synthetic per-scenario telemetry-accounting regression.
- Browser checks for First Glow live/history observers, manifest assets, overlays, playback rates, mobile layout, and audio P5's opt-in behavior, persisted controls, muted-event readability, history silence, and desktop/mobile evidence.

Use the current package scripts for verification; this documentation update does not establish a fresh build or test result. Running tests and the Vite build requires child-process creation for `tsx`, esbuild, and Playwright; restricted environments may fail those commands with `spawn EPERM` before application assertions execute.

## 10. Current architectural boundaries and gaps

Implemented boundaries:

- Server authority over simulation outcomes.
- Deterministic engine inputs and reproducible historical checkpoints.
- Separation of objective events from social interpretations.
- Separate live and historical observer state.
- Timeline lineage through archive, branch, continue, and reset.
- Shared world-data contracts used by simulation and rendering.
- Capability-filtered interaction slots, reservations, and arrival-gated First Glow actions.
- Content-addressed generated bundles with asset manifests and bundle-inclusive backup/restore tooling.
- First Glow writer hardening: serialized pulse and backup writes, fail-closed owner authentication for hosted/public binds, safe reset-route boundaries, append-only resonance history, a typed server entry point, and the reconciled reflection route with CI coverage. See the [Security hardening closeout](reliability-security-maintenance-review.md#post-merge-hardening-status-2026-09-20).
- Observer reflection capacity is implemented in the engine and exposed by the replay-safe `/api/reflection` writer projection. The route returns public capacity, schedule, intention, and committed-outcome data plus bounded AI runtime metadata; it never returns private reflection memory or provider prompt material. The hosted observer bridge and UI consume this same contract.

## AI-P14 bounded rollout

AI-assisted First Glow evaluation is server-owned and disabled by default. The bounded internal pilot is enabled only when the operator explicitly supplies the runtime, rollout, provider-access, data-scope, retention, kill-switch, and $1.00 hard-cap gates described in [docs/ai-p14-rollout-runbook.md](ai-p14-rollout-runbook.md). Routine activity remains rules-only; the browser never calls a provider. The server records bounded, explainable outcomes and telemetry, while playback and branching continue to use persisted records without fresh provider calls.

Still open:

- Authorization and operational validation of any further provider run or wider rollout. The implemented Vertex adapter is disabled by default; retained private evaluations do not establish current live configuration or authorize additional calls.
- Extensions to the existing capability-based slot selection, reservations, and arrival-gated interactions, if selected in future design work.
- Further asset-version recovery hardening: bundle directories are copied by backup/restore and restored world JSON is validated, but the backup manifest checksums world JSON rather than every copied asset. Independent recovery remains a separate operational requirement.
- Any future art expansion or replacement. The current minimal repository-authored SVG set already has provenance in `assets/licenses/first-glow-assets.md`; final-art ambitions are design proposals.
- Confirmation of external origin and redistribution rights before the current music and SFX review candidates can be promoted for a public release.
- Hosted-P8 adds optional scheduled replication and freshness status for independent backups through the attached VM identity and `BACKUP_GCS_URI`; it still requires a separate recovery identity and fresh isolated restore evidence before recovery is trusted.
- Wider distribution and production readiness beyond limited authenticated staging. Hosted-P17 closed with unverified token classes, authenticated SSE behavior, bridge process restart, outage replay, and audience/billing limits. Observer-P5 established process-scoped stream cleanup and baseline return, while Observer-P7 delivered the bounded rehearsal runner and stop-threshold validation within a two-session cap. Observer-P8 concluded Epic #253 with an explicit operational boundary (at most 2 concurrent sessions, at most 180 seconds) and reconciled residual gaps (#255/#256); broader audience capacity, 24/7 SLA, and multi-writer durability remain unverified.
- Human incarnation, multi-user control leases, and shared-world alpha operations.
- Migration from a single SQLite writer if the project scales beyond one hosted process.
- The 2026-09-15 [reliability, security, and maintenance review](reliability-security-maintenance-review.md) remains historical evidence. Its seven writer-hardening findings were delivered through Security-P1â€“P7; remaining deployment, audience, and independent-recovery checks are operational validation gaps, not claims that those code findings remain open.

## AI-P15 through AI-P18 evaluation procedures

The private hosted Vertex rehearsal and its deterministic control arm are documented in [docs/ai-p15-rehearsal-runbook.md](ai-p15-rehearsal-runbook.md). AI-P15's successful private rehearsal is recorded in [AI-P15 evidence](evidence/ai-p15-private-hosted-vertex-2026-09-12.md): Vertex proposals remained staged, changed bounded choices and downstream social state, and made no canonical runtime changes.

AI-P16 extends that path with a four-seed repeatability runner documented in [docs/ai-p16-repeatability-runbook.md](ai-p16-repeatability-runbook.md). Both live arms remain explicitly gated by runtime-only provider access, private-hosted boundary confirmation, the $1.00 hard cap, the kill switch, and approved data/retention settings. The public observer and historical playback remain provider-free.

AI-P18 extends the attention policy with the versioned powers-of-two cadence contract documented in [the AI-P18 runbook](ai-p18-cadence-review-runbook.md). The deterministic control compares readiness-tier and age-day profiles, spaces opportunities across a 64-pulse day, and verifies no-burst, cap, authority, and provider-free replay behavior. AI-P19 completed the matched determinant review, and RC-P1 through RC-P5 subsequently delivered the selected world-age capacity, lived-memory, intention, evaluation, and observer-integration sequence. AI-P20 now supplies the versioned World Codex and reconstructible Spark-local context packet; external provider execution remains separately gated and disabled by default.

## 11. Architectural invariants

Future changes should preserve these rules:

1. Only the authoritative server may commit world-state changes.
2. Browser animation must never create an outcome that is absent from committed state.
3. Objective events and interpretations remain separate records.
4. Historical playback must use recorded results and must not invoke live AI.
5. Timeline branching must preserve the parent history without rewriting it.
6. New world definitions must be validated before entering simulation state.
7. Any persistence-schema or rules change must declare compatibility behavior for old checkpoints.
8. Scaling beyond one simulation writer requires a deliberate persistence architecture change.

## Hosted authentication verification boundary

`npm run test:observer-bridge-auth` includes the isolated RSA/canary harness regressions. `npm run check:hosted-auth` is a separate explicit live operation: full mode requires private absolute-path fixture files, verifies genuine Firebase signatures using Google's certificates, then performs sequential read-only requests with valid controls. Reports retain fixed public results rather than tokens, claims, or private response bodies. Baseline mode covers only missing/malformed credentials; local tests do not prove genuine expired/wrong-project rejection. See the [fixture setup proposal](hosted-auth-fixture-setup.md).

The separately authorized October 23 [live fixture run](evidence/hosted-auth-live-fixtures-2026-10-23.md) passed with genuine Google-signed tokens and verified temporary-access removal. That dated acceptance does not turn ordinary local RSA tests into live IAM evidence or authorize future cloud provisioning implicitly.

### Observer session lifecycle

`packages/web/src/observer-session.ts` owns authenticated GET/HEAD retry and one active SSE connection. Concurrent 401 responses share a forced refresh; a second rejection is returned without another immediate retry. Firebase ID-token notifications rotate the stream without remounting the application. Clean closure and failures reconnect after three seconds; cancellation releases the reader and stops timers. The server remains the sole outcome writer. [Local lifecycle evidence](evidence/observer-session-lifecycle-2026-10-23.md) distinguishes synthetic browser coverage from live Firebase and Cloud Run acceptance.

### Isolated restart and outage acceptance

`observer-outage.test.ts` exercises the production bridge in a separate loopback child process, real backend stop/restart against isolated SQLite history, and cold hosted archive rendering through independent synthetic protected storage. Archive and historical explanation panels never fetch live reflection state; only the live observer renders its authenticated projection. These checks are included in the full local verifier. [Evidence and live boundaries](evidence/observer-outage-2026-10-23.md) distinguish process faults from genuine hosted VM/Cloud Run acceptance.


## Bounded hosted fault tooling

`hosted-outage-browser-harness.mjs` owns a temporary same-origin parent deadline and at most two observer frames. `hosted-outage-browser-driver.mjs` runs inside Browser Use with its origin-scoped diagnostic handle; per-run clock/path/cursor state and atomic files connect it to separately authenticated Python controller/watchdog processes. The controller requires data-plane revision evidence, an actual replacement stream and a fresh watchdog heartbeat before one VM stop. The watchdog restores traffic and attempts recovery independently of browser/controller failure. VM control-plane recovery and successful application-stream recovery are separate gates. No diagnostic kill endpoint, auth export, simulation writer change or public access expansion is introduced.

`npm run test:observer-rehearsal` includes the existing audience-runner tests, browser-harness/driver regressions and a Node entry point for fake Python watchdog/controller tests. These checks perform no live cloud operations and are part of `npm run verify:local`. The [measured hosted retry](evidence/hosted-outage-retry-2026-10-23.md) remains distinct from local success; its graceful VM transition exceeded the approved operational budget.

The [readiness repair](evidence/hosted-outage-readiness-fix-2026-10-23.md) requires a complete pulse-64 event baseline, allows cached immutable startup assets while disabling HTTP cache for cold replay, and uses short positive-proof polls. Replay state survives short diagnostic calls. An initial RUNNING state after a stop request is not restart evidence; the independent watchdog has early request margins. Hosted cold replay and retained-UI recovery are now measured, while that attempt still lacked integrated full-spec rollback/deletion and timed audit/process disposition; its post-run cleanup was not an overall-limit pass. The completed acceptance below resolves those gaps.

The [completed bounded acceptance](evidence/hosted-outage-cleanup-2026-10-23.md) adds exact snapshot-based full-spec rollback, an independent `hosted-outage-recovery-audit.py` worker launched during restart, and automatic final-zero/deletion cleanup before the overall cap. The audit uses fixed read-only SSH/SQLite/process/health checks and an absolute result deadline; it cannot advance the world. Process accounting includes failed live requests, rejects stale zeros and requires a calibrated post-restart original stream. An original-process cancellation/wake barrier and positive zero record precede VM disruption. Safe deadline fallback can remove an unused test revision while recording failed acceptance; it never fabricates zero counters. Browser phase transitions close clients automatically on either success or failure. Run 27 satisfied all gates; earlier late-cleanup evidence remains historical. These operator sources and evidence merged in PR #318; [MIM-S009](../issues/MIM-S009.md) is closed. This does not establish a permanent deployment of current main.


## Bounded capacity and cost preparation

`observer-rehearsal.mjs` restricts read-only SSE clients to two and a client deadline of at most 165 seconds, records simultaneous hold time and per-client bytes, rejects premature EOF/non-SSE/redirect responses, and supports external cancellation. `observer-capacity.mjs` supplies bounded read-only measurement adapters and evaluates complete direct process accounting, upstream cleanup, resource maxima, recovery invariants and fresh conservative five-scope cost bounds. Delayed attributable billing blocks a separate decision gate; no result grants audience expansion. The [S010 rehearsal proposal](hosted-capacity-rehearsal-plan.md) distinguishes local adapter tests from still-required hosted collection and approval. Tests are included in `test:observer-rehearsal` and the full local verifier.

Capacity collector repair adds an expiring stats-only probe around the pinned bridge, direct cgroup resources, persistent read-only VM sampling and an independent exact rollback guard. Ordinary upstream reads close pooled HTTP connections in the temporary wrapper; SSE cancellation is retained. Retry cost allocation requires verified cumulative prior usage. These local tools do not establish permanent deployment or hosted acceptance. See [dated retry evidence](evidence/hosted-capacity-retry-2026-10-24.md).

The local `observer-capacity-controller.py` uses immutable per-sample files beneath `.tmp/` to avoid replacing Windows-reader-held snapshots. Absolute collector expiry is based on resource creation, not cold-start completion. Cost reconciliation includes startup CPU boost as well as request/instance billing modes. [Measured reconciliation](evidence/hosted-capacity-cost-reconciliation-2026-10-24.md) verifies timely abort cleanup while retaining failed full-window acceptance.

[Attempt 10](evidence/hosted-capacity-journal-retry-2026-10-24.md) now verifies immutable-journal measurement live, two authenticated streams for 120.039 seconds, direct zero/recovery and full cleanup by T+139.090. The approved cumulative allocation ceiling is USD 0.15; the retained bound is USD 0.146966358 with the original CPU priced fully boosted. Final attributable billing and complete measured-quantity reconciliation remain separate from operational success; access expansion is not authorized.


## Hosted refresh verification harness

The standalone `hosted-refresh-harness.ts` reuses production observer transport, enforces approval/cost/origin/deadline gates, ages credentials in memory without observer requests, and separately reports forced versus automatic transport observations. `hosted-refresh-firebase.ts` uses a separate named in-memory Firebase app. `hosted-refresh-supervisor.mjs` and its IPC watchdog close only the task-owned browser independently of driver/page progress; the observer lease cannot be rearmed. The harness is not imported by the shipped observer and introduces no hosted diagnostic endpoint. Synthetic browser and supervisor tests run in the full local verifier. [Current approval packet](hosted-token-refresh-approval-packet.md) explicitly blocks live use until deployed observation, direct telemetry/recovery, cost admission and specific approval are resolved.


## Isolated model-study execution controls

The S003 study tooling is separate from the running server and hosted observer. `model-study-execute.mjs` advances isolated First Glow histories through `advanceWorld` and `FirstGlowServerAIRuntime`; both comparison arms use the same interpretation/staging path, with only model eligibility changed. Private JSON checkpoints and fsynced outcome journals retain events, interpretations, transition rejections and RC suppressions. The study provider must reuse a recorded RC1 actor/pulse opportunity, at most once per Spark per 64-pulse day; it cannot grant extra reflection capacity. Study evaluators use a bounded ten-second interpretation option for both arms; normal server startup retains its existing one-second default. They are not automatically installed as browser timelines.

`model-study-runner.mjs` wraps the existing Vertex adapter at its actual serialized request boundary. It verifies the frozen source and compiled-runtime fingerprints, checks complete wire size/output settings, and durably reserves conservative integer cost bounds before dispatch. The run-wide guard retains all reservations, including failed/ambiguous requests, counts attempts across seeds and refuses automatic restart. Provider telemetry estimates are not used to release the study allowance.

Each request has a separate watchdog-owned worker. The worker makes one request, rejects redirects, bounds response bytes and never retries; its absolute deadline includes watchdog/worker startup and the live fetch also has a matching abort deadline. the watchdog terminates it on deadline, operator cancellation or runner IPC loss. Credentials are supplied only in memory and private IPC; inherited worker environments are allowlisted. Synthetic mode does not execute fetch. Live API admission requires an exact-protocol, run-directory and time-window approval packet with verified identity/privacy/pricing and prior allocations. No live approval is shipped; the command-line entry point is synthetic-only.

The integrated ordinary-play check exposed duplicate same-pulse commitment IDs at the social staging boundary. The engine now validates the complete candidate social state and rejects an invalid transition before the server can commit it; valid histories and recorded checkpoints are not rewritten. See [protocol](model-study-protocol.md) and [verification](evidence/model-study-protocol-verification-2026-11-08.md). Synthetic transport tests cannot establish real provider behavior, current pricing or human engagement.


### Earlier v2 RC integration gap — 2026-11-08 (resolved for opt-in v3 below)

[The S004 audit](evidence/model-study-zero-opportunities-2026-11-08.md) corrects the scope of the study integration above: RC state is initialized, but `advanceWorld`, the server evaluator and the then-current v2 study executor do not call the RC scheduler. The passive study eligibility filter therefore has no recorded slots to consume. The intention evaluator can request reflection, but its current callers are tests and a standalone evaluation script, not this runtime path. Guard/transport tests do not establish natural model eligibility. The [v3 proposal](model-study-s004-protocol-v3-proposal.md) describes an event-first shared admission stage; that stage was not implemented at the time of that audit. The local v3 implementation below supersedes this study limitation; it is not a deployment.


### Opt-in shared event RC admission — S004 v3

`first-glow-event-admission.ts` initializes `event-rc-v1` only on fresh pulse-zero histories. It records event/actor/pulse ownership against the existing RC scheduler, enforcing cadence, per-Spark/day capacity, global limits and already-owned slots. The policy also persists the original event-attention ledger so restart cannot clear its cooldowns or duplicate accounting. Slot-end handling cannot grant another event slot after capacity exhaustion. New policy records are validated on checkpoint load.

`FirstGlowServerAIRuntime` clones the candidate state before evaluating the deterministic event-ID order. When explicitly configured for the new policy, both rules and provider-eligible arms request the same RC admission before provider selection. Denied slots remain rules-only with specific recorded reasons. Repeated events cannot rewrite an existing committed decision. Replay consumes no new slots or provider calls. The default server does not enable this policy; tagged histories require an explicit matching `advanceWorld` dispatch option, while the default server can read their saved states but rejects continuing or applying Resonance mutations under legacy semantics.

The isolated v3 study saves exact admitted-event checkpoints, journals admissions/suppressions and retains private source histories. `VITE_STUDY_OBSERVER=true` reuses the existing read-only observer controls for local study review; normal local configuration is unchanged. Separate derived databases support exact Spark 6/pulse-80 Chronicle navigation without altering source artifacts. [Offline verification](evidence/model-study-v3-verification-2026-11-08.md) records six complete histories, three synthetic requests, deterministic repeats and desktop/mobile checks. Real provider access, human evaluation and hosted deployment remain separately gated.


## Fresh-history persistent route patterns (local, 2026-11-10)

`createWorldV3(bundle, seed, worldId, sparkCount, { routePatterns: true })` and `createWorldFromBundle` explicitly enable `persistent-route-pattern-v1`, including Wild Cache choice v1. `initializeRoutePatterns` rejects recorded or already initialized histories. The default creation path remains untagged; existing recordings are not retrofitted.

`first-glow-route-patterns.ts` owns bounded artifact/provenance state, physical encounters, later use/decline and actual arrival/interruption. State is deeply cloned and validated across transitions and server normalization. A route target pin uses the same authoritative navigation planner. Limits are one artifact per creator and 64 per history, one encounter and use per reader/artifact, and one recorded decline that can later be reconsidered. Explicit artifact creation replaces its source completion's legacy post-action public/private social label and produces no automatic trust reward.

Route-pattern `WorldEvent` records preserve `evidenceEventIds` through JSON/SQLite history. Other event serialization remains unchanged. New Chronicle editions use `chronicle-route-pattern-v4`; their lasting-pattern entry follows public lifecycle references at or before the selected checkpoint, stopping before creator-private source evidence. Existing cached editions remain intact.

After building, `node scripts/first-glow-route-patterns-review.mjs` produces four fresh 24-pulse histories and an isolated observer database under a unique `.tmp/route-patterns-review-*` directory. The harness blocks fetch, uses controlled pulse-zero conditions, checks SQLite checkpoint restart and a matched decision counterfactual. It is not a live provider runner. See [dated evidence](evidence/first-glow-route-patterns-2026-11-10.md).


### Validated activity completion (local, 2026-11-10)

Fresh engine callers can explicitly pass `{ activityCompletion: true }` to `createWorldV3` / `createWorldFromBundle`. The persisted `firstGlowState.activityCompletionVersion` is `validated-activity-completion-v1`. Validated structured arrivals emit exploration, trace-mark and pattern-shaping completion once, including same-cell arrivals; the wrapper accounts knowledge and per-pulse activity costs from these events. New-policy movement records include the final per-pulse resource effects. Missing marker preserves legacy transitions/accounting; unknown markers fail validation/normalization. Initialization is fresh-history-only. Default constructors and server reset/startup are not automatically opted in; existing histories are never upgraded.


### Pattern-guided cache retry - local, 2026-11-10

Fresh engine creation can explicitly pass `{ patternGuidedRetry: true }`; this initializes route patterns if needed and persists `firstGlowState.patternGuidedRetry.version = pattern-guided-retry-v1`. Completion opt-in remains separate. A new physical encounter after conservation can authorize one committed retry per reader/cache; prior surveys and unknown/different cache identities do not qualify. Needs and current navigation/reachability remain higher constraints. The new policy records pattern decisions before physical movement, so even same-pulse arrivals require a committed authorization. Arrival resolution rechecks authorization, route and unchanged resource gates; unauthorized repeated resolution fails closed.

Each retry stores original conservation, encounter/use references, optional later choice, and final arrival/interruption reference. The original choice is retained when the current choice advances. A retry is consumed at use commitment, including interrupted journeys; need deferral consumes none. Marked retry uses and attempt records validate together across load/restart. Absent policy retains prior selection/resolution/order; unknown versions reject and initialization refuses recorded histories. Default creation/startup/reset do not opt in or upgrade saves.

Under pattern-guided-retry-v1, if no proposed activity is reachable, selection clears a stale cache activity to idle/waiting rather than implicitly dispatching it again. This closes an unapproved repeat-arrival path found by ordinary-run verification; absent-policy histories retain their previous fallback.


### Versioned pattern-trip preparation - local, 2026-11-10

Fresh engine callers can pass `{ patternPreparation: true }`, persisting `pattern-resource-preparation-v1` in `firstGlowState.patternPreparation`; retry/routes initialize if needed, while activity completion remains separately opted in. Missing policy retains prior behavior and unknown versions reject. Persisted per-Spark goals bind the known pattern/encounter to charging, resting, readiness, deferral or committed use, with real recovery event references and a 64-action bound.

The planner uses shared route candidates and exact moving-pulse resource projection. It searches direct travel and bounded one/two-stop charge/rest itineraries using current source stock and free contacts, at most 32 draws or 11 rests per recovery stop. Preparation does not reserve a cache contact. The selected immediate contact is pinned and revalidated at dispatch; actual cache path/resources are checked again before use/one-retry commitment, including same-pulse arrival. Failed availability or funding leaves the allowance unspent. Resource, sharing, navigation and reservation changes invalidate previous feasibility; an impossible/currently unavailable itinerary defers. Arrival checks remain authoritative.

New-policy route decisions commit per actor at validated dispatch rather than before all actors, so contact conflicts cannot consume a retry without an admitted departure. Objective pattern-preparation events preserve encounter, real action and use references through WorldEvent/SQLite boundaries. A goal is not an invented successful journey or a promise that recovery sites will remain available. Default startup/reset do not opt in or upgrade existing histories.


### Sharing-safe route continuation - local, 2026-11-10

Fresh engine callers can explicitly pass `{ sharingRouteContinuation: true }`, persisting `firstGlowState.sharingRouteContinuationVersion = sharing-route-continuation-v1`. Missing marker retains the prior sharing/status behavior; unknown versions reject and initialization refuses recorded histories. Default startup/reset and older recordings are not upgraded.

A sharing pause snapshots participant activities, then restores execution after the transfer phase (including zero/aborted transfers). Valid retained object/cell plans resume traveling or interacting; unchanged navigation preserves pending edge cost. Changed navigation follows normal authoritative replanning. Invalid/canceled plans clear destination, route, pending cost and only that actor's reservations together. No arrival effects run merely because sharing ended, and legitimate other travelers keep their reservations. Transfer/sustenance accounting and preparation/retry budgets are unchanged. Objective sharing-continuation records retain actual share references when present through WorldEvent/SQLite serialization.

### Recovery waiting and admission - local, 2026-11-11

Fresh engine callers may explicitly pass `{ recoveryAdmission: true }`, persisting `firstGlowState.recoveryAdmission = { version: "recovery-admission-v1", requests: [...] }`. This independent policy applies to ordinary recovery consumers as well as pattern preparation. Missing policy retains prior behavior; unknown versions and malformed queue ownership/ages reject. Initialization refuses recorded histories. Default server startup/reset do not opt in or upgrade saves.

`first-glow-recovery-admission.ts` retains at most one waiting request per Spark, ordered by request pulse then stable Spark ID. Changed/canceled activities discard obsolete requests; admission removes the request, so a returning consumer joins at a new age. Before movement, admission rechecks actual routes and free contacts and installs each immediate destination/reservation atomically. It does not evict valid travelers, advance their routes, grant resources or reserve later stops. Contacts released during the movement/action pass become available at the next pulse's admission pass.

With both preparation and admission enabled, recovery occupancy is ignored only in a conditional itinerary forecast; real source stock, navigation, bounded draw/rest counts, arrival budgets and the immediate charge/rest preference remain enforced. Feasible free first contacts are preferred, and preparation is recomputed against earlier admissions before dispatch. A feasible but occupied immediate stop waits for access while retaining the goal and unspent retry. No future release time or access is promised. A stale/infeasible pattern does not prohibit independent ordinary recovery. Cache dispatch still follows the existing funded-use commitment path and actual arrival guards. Queue ages, goals and reservations persist across SQLite normalization/restart. See the [local verification and ordinary rerun](evidence/first-glow-recovery-admission-2026-11-11.md).

### Initial cache expedition preparation - local, 2026-11-11

Fresh engine callers can explicitly pass `{ initialCachePreparation: true }`, persisting `firstGlowState.initialCachePreparation = { version: "initial-cache-preparation-v1", goals: [...] }`. Its initializer enables validated activity completion, the initial cache choice and recovery admission if absent; it does not require or invent public patterns, encounters, guided uses or retries. Route-pattern creation, guided retries, pattern preparation and sharing continuation remain their own opt-ins. Default startup/reset remain unchanged. Initialization rejects recorded histories; absent policy preserves old transitions, and unknown/malformed policy or orphan initial destination pins reject at validation/normalization.

`first-glow-initial-cache-preparation.ts` stores at most one target/exploration-evidence goal per Spark, with navigation revision, real recovery references, a 64-action budget, committed departure and initial outcome. `selectCachePreparation` shares the existing deterministic route/resource search with pattern readers, while initial search also constrains planned actions to the remaining allowance. Separate `initialPreparedDestination` pins carry no fabricated pattern provenance. Atomic recovery admission recomputes immediate pins against preceding admissions. Dispatch rechecks the actual selected cache contact, navigation and full arrival budget before recording the one initial departure. Actual probe gates remain authoritative; interruption retains the spent initial commitment, and no new retry is granted. Valid sharing pauses retain the committed route. Objective initial-preparation records preserve exploration/action/departure/outcome references through WorldEvent and SQLite boundaries. See [local verification](evidence/first-glow-initial-cache-preparation-2026-11-11.md).

### Post-probe shard continuation - local, 2026-11-11

Fresh callers may explicitly pass `{ postProbeContinuation: true }`, persisting `firstGlowState.postProbeContinuation` with version `post-probe-continuation-v1`. Initialization supplies validated completion, initial cache choice and recovery admission if absent, but fabricates no survey or public artifact. Initial preparation, public patterns, guided retry, pattern preparation and sharing continuation remain separately selected policies. Default server startup/reset do not enable it, and recorded histories cannot be initialized into it. Unknown/malformed policies, mismatched survey provenance, truncated preceding budgets and orphan destination pins reject at normalization.

`first-glow-post-probe-continuation.ts` captures an actual survey in its arrival pulse, binding one goal per Spark to that survey, cache, shard and navigation revision. Prior real preparation references carry the originating initial/pattern-use budget forward; new recovery actions cannot exceed the remaining 64-action allowance. Separate `postProbeDestination` pins integrate with the existing atomic recovery queue, which re-evaluates each request against earlier admissions. The shared planner accepts a shard objective with exact moving/activity-pulse costing and dynamic care readiness, while old cache projections retain their selected rules. Geometry reuse remains local to each synchronous forecast.

Structured dispatch validates actual resources, selected shard/contact, navigation and care before committing the one shard leg. New-policy actual arrival requires enough charge/readiness to pay the completion pulse without deficit or zero readiness. Sharing pauses retain valid travel; stale navigation releases only that Spark's plan and invalidates continuation. Completion and interruption preserve the spent commitment. Objective `post-probe-continuation` events carry survey, recovery, departure and actual completion references through WorldEvent/SQLite serialization. Shard completion and public pattern creation remain separate outcomes. See [verification and ordinary histories](evidence/first-glow-post-probe-continuation-2026-11-11.md); the six-run window still has no review/12 pattern and no guided use.

### Bounded care recovery fallback - local, 2026-11-11

Fresh callers may select `{ careRecoveryFallback: true }`, persisted as `careRecoveryFallbackVersion: "care-recovery-fallback-v1"`. Only a resource-infeasible nonurgent care-first post-probe itinerary can select bounded charge then rest. Actual rest evidence and the 90-readiness departure obligation persist across social changes and normalization; urgent rest below 70 and admission-time rechecks remain authoritative. The common planner and queue retain source/action bounds and valid ownership. Defaults and older histories are unchanged; 52 older checkpoints retain byte-identical continuation. See [local verification and six ordinary histories](evidence/first-glow-care-recovery-fallback-2026-11-11.md).

### Geometric shard routes - local, 2026-11-11

Fresh callers may explicitly pass `{ geometricShardRoutes: true }`, recording `geometricShardRoutesVersion: "geometric-shard-routes-v1"`. Initialization supplies the Wild Cache choice prerequisite if absent, without enabling other policies or creating evidence. Defaults and recorded histories retain their rules; unknown policy versions reject at normalization.

`first-glow-geometric-shard.ts` provides a conditional topology view that ignores only Pattern Shard reservations. Cache surveys and initial/pattern preparation forecasts use that view for route facts and future shard feasibility. Post-probe recovery can continue while its shard is busy; a funded ready objective records waiting without committing departure. Real dispatch still queries the authoritative runtime, preserves the current owner, and rechecks care, resources, navigation and contact availability. No topology view is used to admit an interaction or award completion. See [verification and six ordinary histories](evidence/first-glow-geometric-shard-routes-2026-11-11.md).

### Bounded sharing admission - local, 2026-11-11

Fresh callers may explicitly select `{ boundedSharingAdmission: true }`, persisted as `boundedSharingAdmissionVersion: "bounded-sharing-admission-v1"`. It enables no other policy. Unknown versions and initialization against recorded histories reject; defaults and absent-policy histories retain their rules.

`first-glow-sharing-admission.ts` assesses a proposed donor before autonomous selection and again before either participant is paused. Current deficit, insufficient charge for the gift/upkeep plus a remaining unit, and urgent rest below 70 refuse sharing. Ordinary care rest remains prior when no active expedition budget applies. For recorded active initial, pattern-reader or surveyed-shard goals, scratch selectors expose a synchronous witness for the selected itinerary. The witness must remain funded after subtracting the gift and donor upkeep, without adding recovery actions, source draws or another itinerary. Shared preparation allowances and care/rest requirements remain part of that forecast. Witnesses and scratch pins are never persisted or used as contact admission.

A refusal records an objective `sharing-admission` event and continues normal selection; unrelated movement or recovery can still incur its actual costs. Admitted transfers retain the original gift and both participants' sustenance accounting. No source charge, queue age, contact ownership, retry authorization or history is created by assessment. Actual recovery and shard dispatch continue to use their existing authoritative gates. See [local verification and ordinary histories](evidence/first-glow-bounded-sharing-admission-2026-11-11.md).

### Geometric return-route publication - local, 2026-11-11

Fresh callers may explicitly pass `{ geometricReturnPublication: true }`, recorded as `geometricReturnPublicationVersion: "geometric-return-publication-v1"`. Initialization supplies route patterns and their Wild Cache choice prerequisite if absent; other policies remain independently selected. Unknown versions, missing route-pattern state and initialization against recorded histories reject. Defaults and absent-policy histories retain their rules.

`first-glow-geometric-return-publication.ts` provides a publication-only geometry query. At the actual shard-completion pulse, `updateRoutePatterns` may ignore reservations on the recorded return cache while checking its traversable route. The query changes no runtime ownership or resources and still respects blockers and valid target capabilities. Valid probe/origin/completion evidence, actual shard location, one artifact per creator, the 64-artifact cap and encounter rules remain authoritative. `canReachRoutePatternTarget` and real trip selection/admission retain their existing contact-aware behavior. No deferred publication or historical artifact is invented. See [local verification and ordinary histories](evidence/first-glow-geometric-return-publication-2026-11-11.md).


## S021 bounded online preparation (local, not activated)

The optional `spark-online` server mode uses the existing bounded Spark projections and a portable Node worker authenticated by VM metadata, pinned to `mimir-realm` / US / Gemini 3.5 Flash-Lite. It requires an explicit allocation ID, absolute separate world/ledger paths, an explicitly identified unchanged allocation, including the audited original USD 5 handoff, kill switch and fixed online lease. The world and ledger must be created or restored together, except the first world attached to its run-bound original-ledger handoff. AI-disabled restarts retain the event-RC policy and perform rules-only goal selection. Neither historical reads nor backup recovery invokes the provider.

`online_run_contract` persists run ID, allocation ID and UTC deadline; restart cannot replace or extend it. A separate SQLite exclusive-lock database prevents concurrent server writers and releases automatically after process death. Scheduler pause and owner AI stop persist in runtime metadata. Health reports deadline state, stalled progress and independently saved offsite status.

Paired online backups add a checksum-pinned `.ai-budget.db` sidecar to the existing world database, manifest and immutable bundles. The ledger snapshot follows the world snapshot and conservatively includes later reservations. Restore checks allocation identity, retained reservations and goal/social decision receipts. Offsite archives and recovery comparison include the sidecar and run contract. Existing offline backup manifests remain supported. The authenticated bridge admits read-only goals, history and AI-status routes. Spark selection/follow context survives live reload and return visits, while explicit deep links take precedence. See the [online preparation packet](spark-ai-online.md) for unresolved activation and funding gates; these local changes do not establish hosted readiness.

S021 also serializes observer reconnect attempts and leaves a bounded transport-drain interval after stream cancellation, including SDK token rotation. Local tests retain the single-stream and context-preservation assertions; genuine hosted refresh remains unqualified. The offsite backup worker remains a standalone Node-only package; its packaging check rejects accidental workspace dependencies.


### S021 original-allocation continuation — 2026-11-13

The owner authorized recorded-cost accounting with a reasonable buffer, continuation under the original USD 5 AI cap, and USD 2 hosting for a 24-hour owner-only pilot. The original ten receipts remain intact: USD 0.008844 token-cost estimate, USD 0.117688 guarded after a 2× multiplier and USD 0.10 reserve, and USD 4.882312 guarded headroom. Pending/uncertain or missing-cost calls keep full USD 0.50 holds. An audited ledger handoff retires the desktop writer before the target writer resumes; it does not create another allocation. The hosting watchdog and independent shutdown deadline preserve the selected window and conservative hosting cutoff. These are implementation/preparation records, not a deployed-readiness claim; see [the online packet](spark-ai-online.md). The standalone backup worker now also requires `spark-ai-accounting.js`.
