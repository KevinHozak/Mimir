# Mimir: A Light of Our Own — Current Architecture

Date: 2026-09-20
Status: Current implementation reference for the local and single-instance hosted First Glow observer.

This document describes what is implemented in the repository today. Dated plans contain proposals and historical implementation notes; they do not establish runtime support.

The First Glow observer's follow mode is browser-local presentation state. Its selected Spark, live/history view, camera tracking, presentation style, and recovery state are derived from committed snapshots and history responses. Following, manual camera movement, and returning to World never call owner routes, advance the scheduler, allocate reflection capacity, invoke a provider, or write canonical history. Historical follow views retain the timeline and pulse identity supplied by the server, while unavailable Spark/checkpoint states remain explicit rather than being invented.

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

`advanceWorld()` and `runPulses()` return deterministic rules-only interpretation records for selected First Glow social encounters. Normal First Glow pulses also resolve witnessed dilemma events into bounded social state before explanation records are appended, so trust, commitments, and Spark-local knowledge can affect later autonomous activity selection. `first-glow-interpretations.ts` defines the bounded provider adapter contract, context hashing, evidence/knowledge validation, budget telemetry, and deterministic fallbacks. No live or paid model provider is connected; provider proposals are review-harness inputs only. Sharing is an explicit deterministic First Glow action.

The P3 conversation slice records a co-present `meet` event as a deterministic, two-turn exchange. The first accepted utterance adds a witnessed communicated claim to the recipient's local memory, making the exchange consequential without granting either speaker hidden or future facts. Refusal/interruption, provider timeouts, budget exhaustion, kill-switch behavior, and unrestricted dialogue remain outside this deterministic slice; live-provider evidence is not implied.

The P4 Chronicle surface is served by `GET /api/chronicle` and regenerated explicitly through the owner-only `POST /api/owner/chronicle/regenerate`. The server assembles only committed events, interpretations, and checkpoint history at or before the requested pulse, validates the edition before persistence, and links observer reading back to `/api/history` scenes. Chronicle text is not Spark knowledge and does not change world state, Spark capacity, or provider budgets.

The versioned First Glow personality profile is materialized from authored Spark cards into each interpretation context and its hash, then recorded on the interpretation. It carries value tendencies, practical needs, relevant relationship tendencies, and the authored knowledge boundary; it is separate from mutable Spark-local knowledge and never exposes another Spark's private knowledge.

The product decision for AI-P1 is to defer any external provider runtime role. The local fake provider and matched review harness are offline evaluation tools only; they do not transmit data, require credentials, or establish provider readiness. The rules-only resolver remains the normal-operation product path and the simulation authority. Historical playback never requests a provider, and invalid or unsupported proposals, unavailable evaluation inputs, timeouts, and budget exhaustion use the deterministic fallback.

AI-P7 through AI-P9 have now established the bounded path for AI-assisted play. AI-P8 proved that retained validated alternatives can produce downstream social diffs through the existing deterministic social transition in disposable staging. AI-P9 verified the four-per-Spark and sixteen-global budget boundary, rules-only fallback, and provider-free replay under a local rehearsal plus retained model outcomes. AI-P10 proceeds with implementing this path behind the server-owned attention gate, deterministic transition adapter, explicit budget controls, and replay-safe decision records. This remains a narrow internal runtime pilot boundary: the provider supplies proposals only, the server commits consequences, and the public observer and historical playback remain provider-free.



AI-P11 now records the bounded live provider contract in [AI-P11 evidence](evidence/ai-p11-bounded-live-provider-contract-2026-09-12.md). The selected route is Vertex AI with Gemini 2.5 Flash-Lite in the previously authorized `mimir-realm` project, with a privately recorded hard spending cap for AI-P11, superseding the smaller AI-P6 evaluation cap, four-per-Spark and sixteen-global daily limits, one-second timeout, zero retries, explicit privacy/retention review, and a disabled-by-default kill switch. This authorizes implementation of the boundary, not a live request: the provider may propose only a validated interpretation, deterministic server transitions commit consequences, rules-only fallback is immediate, and historical playback/public observation remain provider-free.

For Google specifically, Google AI Pro is a consumer subscription and is not the runtime's billing or authorization boundary. Gemini Developer API and Google Cloud Vertex/Agent Platform usage must be treated as separately metered channels with their own project, credentials, quotas, billing mode, and hard cap. Planning estimates for representative standard text models are documented in the [AI-P1 Google cost and effectiveness envelope](roadmap.md#google-cost-and-effectiveness-envelope); the runtime must not infer free API access from a user's subscription. A Google experiment would remain evaluation-only and would record the selected channel, model/SKU, price snapshot, token usage, and cap decisions alongside its blinded quality results.

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

- `GET /health` — service health, current pulse, scheduler state, active timeline, database path, and social configuration.
- `GET /api/world` — current state; `?pulse=` retrieves a stored checkpoint.
- `GET /api/events` — objective events for the active timeline.
- `GET /api/interpretations` — persisted social interpretations.
- `GET /api/history` — persisted timeline/checkpoint history plus canonical movement and decision records from the selected historical state. The viewer reads these records directly; it does not reconstruct them through AI.
- `GET /api/metrics` — checkpoint-derived charge, readiness, deficit, travel, and collection metrics.
- `GET /api/report` — current timeline and season summary.
- `GET /api/design` — Living Circuit/First Glow identity and `FIRST_GLOW_DESIGN` cards, event prompts, opening question, and knowledge boundary under `firstGlow`; legacy card/dilemma arrays are empty and the shared store is omitted.
- `GET /api/resonance` — the authored Resonance observation-rule fixture review and its evidence projection, plus the live First Glow objective-event count. It is an observer diagnostic, not a state-changing Anchor endpoint.
- `GET /api/resonance/anchors` — the active timeline's persisted Resonance candidates and Anchors.
- `GET /api/region` — settlement metadata and retained route/trade/weather/hazard envelope fields. These fields do not establish an active market, trade network, or weather simulation.
- `GET /api/timelines` — available timeline metadata.
- `GET /api/history` — a bounded historical-view response for one timeline and checkpoint, including lineage, version identity, recorded objective events, and recorded interpretations. Empty timelines, missing checkpoints, and incompatible checkpoints return explicit states; no replay or new interpretation is generated.
- `GET /api/live` — Server-Sent Events stream with the current state and committed pulse updates.

Firebase Hosting serves the observer page; its active build requests API/SSE directly from the existing `mimir-observer-bridge` Cloud Run service. The bridge requires an approved, verified Google ID token, forwards only the read/SSE allowlist to the private VM, and never forwards owner or mutation routes. Hosted auth is forced by the guarded deployment command. The bridge uses h2c behind Cloud Run TLS termination to propagate cancellation. Opt-in process-scoped stdout gauges distinguish authenticated live handlers from successful SSE bodies; no public telemetry endpoint exists. Hosting rewrites remain configured but failed prompt disconnect propagation in the dated [Observer-P5 observation](evidence/observer-p5-stream-cleanup-2026-10-03.md). Previously cached bundles require fresh navigation. Hosting is not simulation authority.

### Owner operations

State-changing operations require the configured `OWNER_TOKEN`, supplied through the `x-owner-token` header:

- `POST /api/pulse` — commit one pulse.
- `POST /api/scheduler` — pause/resume the scheduler or change pulse interval.
- `POST /api/owner/archive` — archive the active timeline.
- `POST /api/owner/continue` — reactivate the active timeline.
- `POST /api/owner/branch` — branch from a selected checkpoint.
- `POST /api/owner/reset-v3` — archive the current timeline and create a schema-3 First Glow world.
- `POST /api/owner/world/object` — change runtime blocking for a known world object.
- `POST /api/owner/resonance-anchor` — create the Shelter Loom only from a complete, server-validated candidate whose evidence IDs are already committed on the active timeline.
- `POST /api/owner/resonance-choice` — commit one witnessed Shelter Loom `yield-rest` or `hold-rest` choice, with explicit eligibility, resource deltas, durable consequence, and objective evidence.
- `POST /api/owner/resonance-crossing-anchor` — create the contrasting Crossing of Voices only from a complete candidate whose committed evidence meets the relay-crossing rule.
- `POST /api/owner/resonance-crossing-choice` — commit one witnessed `follow-signal` or `hold-course` decision with explicit resource, activity, and evidence consequences.

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

### Hosted configuration

`render.yaml` defines one Node web service with:

- `SERVE_WEB=true` for same-origin static browser serving.
- SQLite at `/var/data/mimir.db`.
- A mounted persistent disk.
- Fifteen-second default pulses.
- Daily local backup copies under `/var/data/backups`.
- An externally supplied `OWNER_TOKEN`.

On 2026-10-03, merged PR #266 at `d1aa17e` was deployed with the guarded clean-main workflow to Hosting version `2b0287700b57d854`; exact live index and both hashed assets matched. Desktop and mobile-sized core rendering succeeded and all five required authenticated bundle SVGs returned 200. Mobile zoom controls remain clipped, so this is not an unqualified usability pass. Single-session request/cache/transfer measurements, bridge/VM CPU and bridge memory, Compute quotas, and September project/service billing are recorded in the [dated deployment evidence](evidence/hosted-p18-p4-deployment-2026-10-03.md). The multi-viewer rehearsal remains blocked by no approved audience cap or safe window, unverified available rollback/recovery identities, and absent server active-stream cleanup telemetry. #257/#253 stay open; #201 remains the historical closeout with limitations. P2/P3 closed-as-not-planned status is not acceptance evidence. No capacity, availability, or browser-attributable cost claim follows.

### Hosted replay and release verification

The hosted browser supports authenticated archive selection and interactive checkpoint replay independently of live-state rendering. Hosted-P16 exports ordered multi-checkpoint archives from read-only SQLite, validates immutable chunks, and publishes the catalog last. Operational replay during a live outage remains unverified.

`npm run deploy:hosting` checks a clean merged `origin/main`, builds with `VITE_FIREBASE_AUTH_ENABLED=true`, deploys Hosting, and verifies served HTML and hashed assets. Hostname enforcement also requires auth at `mimir-realm.web.app`. See [the hosted runbook](hosted-observer-runbook.md).

The dated Hosted-P17 closeout records Hosting version `82cc93e9b9470f8e` from `fbd4eb8` on 2026-09-15. Missing/malformed token rejection, observer-only UI, VM continuity, bridge-to-VM recovery, and synthetic/quota evidence were recorded. Expired/wrong-project/unapproved tokens, authenticated SSE refresh/reconnect/closure, bridge process restart, outage replay, and real audience/billing telemetry remain unverified. The 2026-09-26 console recheck mapped a displayed release suffix to this retained version and found it behind `origin/main`; it did not provide a current source/build linkage. No fresh deployment or readiness is implied.

## 9. Verification architecture

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
- Wider distribution and production readiness beyond limited authenticated staging. Hosted-P17 closed with unverified token classes, authenticated SSE behavior, bridge process restart, outage replay, and audience/billing limits.
- Human incarnation, multi-user control leases, and shared-world alpha operations.
- Migration from a single SQLite writer if the project scales beyond one hosted process.
- The 2026-09-15 [reliability, security, and maintenance review](reliability-security-maintenance-review.md) remains historical evidence. Its seven writer-hardening findings were delivered through Security-P1–P7; remaining deployment, audience, and independent-recovery checks are operational validation gaps, not claims that those code findings remain open.

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
