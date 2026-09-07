# Mimir: A Light of Our Own — Current Architecture

Date: 2026-09-07
Status: Current implementation reference for the local and single-instance hosted First Glow observer.

This document describes what is implemented in the repository today. Dated plans contain proposals and historical implementation notes; they do not establish runtime support.

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
                                           social interpretation fallback
```

The server owns canonical world state. The browser renders state and requests historical snapshots; it does not decide movement, resource outcomes, social consequences, or timeline mutations.

The current deployment target is one Node web service with one SQLite writer and a persistent disk. Horizontal scaling is not supported by the current persistence model.

## 2. Repository structure

```text
packages/world-data/  Shared schema-3 bundle types, canonical hashing, spatial queries, validation
packages/engine/      Deterministic First Glow actions, Spark state, charge/readiness rules
packages/server/      Fastify API/SSE, scheduler, SQLite timelines, owner commands, backups
packages/web/         React panels, Phaser scene, Vite build, browser E2E test
assets/world/         Authored Tiled source, templates, fixtures, immutable generated bundles
assets/licenses/      Active First Glow asset provenance
data/                 Ignored local databases, settings/game state, and backup output
.tmp/                 Ignored disposable test/profile output
scripts/              Local launcher, world importer/validator, and profiling harnesses
docs/                 Current references, dated plans, runbooks, and evidence
```

The root npm workspace builds four packages in dependency order: world-data, engine, server, then web. The local launcher builds when required, starts the server, and starts the Vite preview client on port 4173.

## 3. Engine architecture

The engine package is TypeScript-only and has no browser or Fastify dependency. Its public model includes:

- `WorldState`: First Glow world identity, seed, tick, schema-3 simulation version, structured-v2 spatial model, and `firstGlowState`.
- `Spark`: charge, charge deficit, readiness, activity, position, route/contact state, and bounded local knowledge.
- `WorldEvent`: objective First Glow events such as ticks, movement, drawing charge, sharing, and world-object changes.
- `SocialInterpretation`: a separate interpretation record with source, confidence, belief category, trust delta, summary, and evidence event IDs.
- `FirstGlowWorldBundle`: schema-3 bundle metadata, map geometry, object definitions/instances, interaction slots, spawns, and asset manifests.
- `WorldRuntimeState`: mutable navigation revision, object blocking state, and reservations.

`createWorldFromBundle()` creates the deterministic schema-3 initial world. `advanceWorld()` advances exactly one committed simulation tick and returns the next state, objective events, and interpretations. First Glow action selection is deterministic and based on stable IDs, bundle geometry, stored state, seed, and tick; no ambient randomness or live AI is used.

The engine currently contains deterministic First Glow creation/advance, charge pools and charge accounting, shelter niches, traces, exploration, drawing, rest/readiness, sharing, structured object footprints, contacts/reservations, navigation revisions, runtime blockers, and bounded event records. Legacy creation entry points remain explicit failures or compatibility-shaped fields; they are not supported new timelines.

The social layer is currently rules-only by default. The adapter can validate a supplied interpretation and use a deterministic fallback, but no paid model provider is connected.

## 4. World-data pipeline

The intended source-of-truth boundary is:

```text
Tiled JSON source
        |
        v
importTiledMap() + validateWorldDefinition()
        |
        v
normalized WorldDefinition
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
4. Normalizes older or incomplete state shapes for compatibility.
5. Starts the optional scheduler.

The server commits a tick inside a SQLite transaction. It calculates the next engine state first, then writes the checkpoint and all returned events and interpretations, commits the transaction, updates in-memory state, and broadcasts the committed result to connected SSE clients.

The scheduler can be paused, resumed, or assigned a bounded interval. Manual ticking uses the same commit path as scheduled ticking.

### Persistence model

The current database stores:

- `timelines`: timeline identity, parent relationship, status, and archive time.
- `timeline_checkpoints`: serialized state snapshots by timeline and tick.
- `timeline_events`: serialized objective events by timeline and tick.
- `timeline_interpretations`: serialized social interpretations by timeline and tick.
- `pending_commands`: durable idempotent next-tick world-object commands.
- `runtime_metadata`: active timeline selection.

The initial checkpoint is stored at tick 0. Each successful tick stores another complete serialized state snapshot. Branching copies checkpoint, event, and interpretation history through the selected source tick, then activates a new child timeline. `reset-v3` archives the active timeline and creates a new schema-3 First Glow world with a new seed and Spark count.

SQLite WAL checkpoints and scheduled local database copies are supported. The scheduled copies remain on the same disk until an independent backup destination is provisioned and restore-tested.

## 6. HTTP and live-update surface

### Public reads

- `GET /health` — service health, current tick, scheduler state, active timeline, database path, and social configuration.
- `GET /api/world` — current state; `?tick=` retrieves a stored checkpoint.
- `GET /api/events` — objective events for the active timeline.
- `GET /api/interpretations` — persisted social interpretations.
- `GET /api/metrics` — checkpoint-derived charge, readiness, deficit, travel, and collection metrics.
- `GET /api/report` — current timeline and season summary.
- `GET /api/design` — character cards, dilemmas, and shared-store description.
- `GET /api/region` — settlements, routes, trade history, weather, and hazards.
- `GET /api/timelines` — available timeline metadata.
- `GET /api/live` — Server-Sent Events stream with the current state and committed tick updates.

### Owner operations

State-changing operations require the configured `OWNER_TOKEN`, supplied through the `x-owner-token` header:

- `POST /api/tick` — commit one tick.
- `POST /api/scheduler` — pause/resume the scheduler or change tick interval.
- `POST /api/owner/archive` — archive the active timeline.
- `POST /api/owner/continue` — reactivate the active timeline.
- `POST /api/owner/branch` — branch from a selected checkpoint.
- `POST /api/owner/reset-v3` — archive the current timeline and create a schema-3 First Glow world.
- `POST /api/owner/world/object` — change runtime blocking for a known world object.

This is owner authentication, not a multi-user account or role system.

## 7. Browser architecture

The web package uses React for application state and panels, Phaser for the First Glow canvas, and Vite for development/build/preview.

The browser:

- Loads current world, event, interpretation, metric, design, and regional data through HTTP.
- Subscribes to `/api/live` for committed updates.
- Maintains a live state and an independently selected historical state.
- Requests historical checkpoints through `/api/world?tick=`.
- Displays First Glow nodes and Sparks, routes, event history, interpretations, charge/readiness metrics, bundle assets, and owner controls.
- Animates committed movement for presentation; the authoritative route and outcome come from the server.
- Supports playback rate, map zoom, timeline scrubbing, Return to Live, settlement selection, and mobile-width layout checks.

Historical playback reads persisted interpretation records and does not call an AI provider.

## 8. Local and hosted runtime

### Local development

```text
npm start
  -> npm run build
  -> Node packages/server/dist/index.js
  -> Vite preview on 127.0.0.1:4173
```

The server can also run independently with `npm run dev:server`, and the browser can run with `npm run dev:web`.

### Hosted configuration

`render.yaml` defines one Node web service with:

- `SERVE_WEB=true` for same-origin static browser serving.
- SQLite at `/var/data/mimir.db`.
- A mounted persistent disk.
- Fifteen-second default ticks.
- Daily local backup copies under `/var/data/backups`.
- An externally supplied `OWNER_TOKEN`.

The hosted model is intentionally single-writer. PostgreSQL or another coordinated persistence layer is required before horizontal scaling.

## 9. Verification architecture

The repository includes three verification layers:

- Engine tests for deterministic seeds, First Glow actions, charge/readiness accounting, sharing, bundle validation, routing, and persistence boundaries.
- Server tests for First Glow commands, restart equivalence, bundle-inclusive backups, asset validation, and state normalization.
- Playwright browser tests for First Glow live/history observers, manifest assets, overlays, playback rates, and mobile layout.

The TypeScript engine and server builds currently compile successfully. Running tests and the Vite build requires child-process creation for `tsx`, esbuild, and Playwright; restricted environments may fail those commands with `spawn EPERM` before application assertions execute.

## 10. Current architectural boundaries and gaps

Implemented boundaries:

- Server authority over simulation outcomes.
- Deterministic engine inputs and reproducible historical checkpoints.
- Separation of objective events from social interpretations.
- Separate live and historical observer state.
- Timeline lineage through archive, branch, continue, and reset.
- Normalized world data shared conceptually by simulation and renderer.

Still open:

- Real AI provider integration with budget reservation, timeout handling, and the planned 20-encounter quality review.
- Full object-slot reservation and richer interaction-capability resolution.
- Complete immutable asset-bundle storage and replay across asset versions.
- Final licensed map art and provenance manifest.
- Independent disaster-recovery storage and restoration verification.
- Human incarnation, multi-user control leases, and shared-world alpha operations.
- Migration from a single SQLite writer if the project scales beyond one hosted process.

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
