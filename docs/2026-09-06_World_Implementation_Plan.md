# Mimir: A Light of Our Own — Scene, Tile, Collision, and Navigation Plan

Date: 2026-09-06

Status: Reviewed against implementation at commit `2c0ab82` on 2026-09-06. All seven phases remain partial against their full deliverables and acceptance gates.

Review convention: `[x]` means the entire listed requirement is implemented; `[ ]` means incomplete, partially implemented, or not yet verified. Partial progress and evidence are recorded below each phase. Acceptance gates are separate checklist items and are not implied by passing general smoke tests.

Implementation handoff: section 9 expands every remaining phase into bounded work packages, exact rework targets, default behavior, and verification cases for GPT 5.6 Luna at Medium reasoning. These are instructions for future implementation, not claims of completed work. Read section 9.0 before starting any package; do not implement the entire document in one unreviewed change.

Implementation assessment: shared world types, content fingerprints, a minimal Tiled importer, procedural structured rendering, deterministic A*, persisted destinations, basic arrival gating, and runtime blockers exist. The previous ledger overstated completion: strict validation, Tiled templates/assets/surfaces, scene modules and overlays, capability-based destinations, cost-aware movement, safe dynamic changes, and version-preserving replay still have gaps.

Validation during this review: engine tests passed; engine and server TypeScript compilation passed; the compiled legacy snapshot compatibility test passed. Direct schema probes confirmed the ID/coordinate gaps noted in Phase 1. The initial tsx invocation of the legacy test encountered an esbuild spawn permission error; running its freshly compiled JavaScript passed. Server integration and browser tests were inspected but not rerun; visual behavior, asset-inclusive restore, and twelve-villager profiling are not claimed as verified.

Companion documents: [Web Development Plan](2026-09-06_Web_Development_Plan.md) and [Simulation Game Plan](2026-09-06_Simulation_Game_Plan.md).

## 1. Decision and intended outcome

Keep Phaser for the village view, React for the observer interface, and the TypeScript server as the authoritative simulation. Use Tiled to author terrain and reusable world objects. Defer Godot; section 7 describes when to reconsider it.

The world must describe what exists, where it is, where villagers may travel, and what they can do upon arrival. Adding or moving a building should normally be a content edit followed by validation, without changing movement code. Adding a new kind of behavior may still require engine code.

The first milestone is a small village containing a house, tree, water, bridge, and functioning granary. Prove that these parts work together before rebuilding the entire illustrated map or expanding the world.

## 2. Original prototype baseline and intended changes

The original prototype described when this plan was written displays `village-backdrop.png` beneath a transparent Phaser canvas. The buildings and water in that image have no simulation equivalents. The engine stores named location coordinates and chooses nearby destination offsets. Its `routeBetween()` function moves horizontally, then vertically, without consulting terrain or obstacles.

Each simulation tick assigns the destination and applies activity effects immediately; the browser subsequently animates the recorded route. The current tests establish deterministic results and distinct destination positions, but do not establish collision handling, reachability, or arrival before interaction.

Relevant implementation entry points:

- `packages/engine/src/index.ts`: world initialization, location anchors, route creation, and activity effects.
- `packages/web/src/main.tsx`: Phaser scene creation and villager animation.
- `packages/web/src/styles.css`: illustrated background and viewport sizing.
- `packages/server/src/index.ts`: persisted state, normalization, timeline operations, and simulation advancement.

Review note: this section preserves the original baseline, not the current implementation assessment. See the phase checklists below for current status.

This plan replaces those spatial shortcuts while preserving server authority and recorded history. A browser-only collision fix would leave simulation outcomes inconsistent with the displayed world.

## 3. World data and ownership

```text
Tiled maps + tilesets + object templates
                    |
          Import and validate
                    |
       Immutable world definition bundle
              /             \
     Server simulation     Phaser scene
     movement and actions  rendering and interpolation
              |
       Persisted runtime state and history
```

Tiled source files are the editable source of truth for map placement and template properties. The import pipeline resolves templates, external tilesets, tile IDs, and supported transforms into a normalized bundle. Neither the server nor the viewer should independently interpret raw Tiled semantics. Generated bundles must not be edited manually.

| Data | Responsibility |
|---|---|
| Terrain definitions | Movement permissions, positive traversal costs, and visual references for grass, roads, water, and other terrain |
| Object definitions | Reusable appearance, blocking footprint, entrance/work slots, capacity, and supported interaction identifiers |
| Object instances | Stable ID, definition reference, map position, supported orientation, and instance overrides |
| World definition | Map dimensions, cell size, layers, instances, spawn positions, and definition/asset versions |
| Runtime object state | Open doors, inventory, construction state, depletion, and other mutable properties |
| Villager movement state | Current cell, destination object/slot, remaining route, travel progress, and movement status |
| Recorded history | Definition bundle reference, simulation version, movement progress, object changes, and committed activity outcomes |

Use a shared world-data package for schema validation, normalized types, and pure spatial queries. Keep Phaser imports out of this package and the simulation engine. Organize map sources, tilesets, templates, and generated output in dedicated directories; choose exact package and directory names during phase 1.

Start with finite orthogonal maps and four-direction grid movement. Use integer cell coordinates in simulation and a single cell-to-pixel transform in rendering. Explicitly define object origins, sprite foot anchors, and supported rotations. Reject unsupported map features during import instead of silently approximating them.

## 4. Implementation phases

### Phase 1: Establish the world contract and compatibility boundary

Execution details: [work package W1](#91-w1-contract-validation-and-compatibility).

Deliverables:

- [ ] Define validated schemas for terrain, object definitions, object instances, maps, runtime spatial state, and immutable bundle references.
- [x] Establish stable IDs, schema versions, content hashes, and simulation-version fields before new spatial state is persisted.
- [x] Define the movement time unit and relationship between movement steps, social decisions, and season duration. Browser playback speed must never alter simulation outcomes.
- [x] Define the initial actor footprint and terrain traversal rules. Start with a one-cell occupancy model and positive integer travel costs.
- [ ] Specify a compatibility path for existing checkpoints: retain the legacy backdrop and movement interpretation for old history; start the new spatial model on a new timeline by default.
- [x] Create a minimal hand-authored fixture to test spatial queries before connecting the map editor.

- [ ] Acceptance gate: the same fixture loads in server and browser code, invalid IDs/coordinates fail validation, and legacy snapshots can still be read without being silently rewritten.

Review evidence: [`world.ts`](../packages/engine/src/world.ts) provides shared pure types, version fields, deterministic hashes, `MOVEMENT_MODEL`, and `createFixtureWorld()`. [`index.ts`](../packages/engine/src/index.ts) and the scenario define tick-based decisions and season limits; browser speed changes tween timing only. Positive costs exist for traversable grass/road; water is impassable. The shared module lives in the engine package rather than a dedicated world-data package.

Remaining: validation is not a complete schema for definitions or runtime state. A direct review probe confirmed that duplicate instance IDs and fractional object positions are accepted after recomputing the hash. Origins, orientations, cell size, and spawns are not represented in the world contract. [`state.test.ts`](../packages/server/src/state.test.ts) verifies legacy metadata and missing-world preservation, but the viewer draws fallback grass instead of the old backdrop and old timelines can still continue under current engine rules. The full compatibility/validation gate is therefore open.

### Phase 2: Author tiles and reusable objects in Tiled

Execution details: [work package W2](#92-w2-tiled-authoring-and-import).

Deliverables:

- [ ] Select a coherent licensed tileset and record asset provenance. Keep the generated backdrop as an art reference and legacy asset.
- [ ] Create ground and surface layers, object placement layers, and explicit foreground visuals where required.
- [ ] Define templates for a house, tree, granary, and bridge. Each template includes its solid footprint and any accessible interaction slots; decorative foliage and roofs do not automatically become blocking areas.
- [ ] Author a small map with grass, a preferred road, impassable water, a bridge crossing, and validated spawn points.
- [ ] Build a deterministic importer that resolves template inheritance and tileset references into the shared bundle. Preserve stable instance IDs across edits.
- [ ] Validate bounds, referenced assets, supported transforms, required properties, and conflicting object placement. Model the bridge's walkable surface explicitly above water rather than treating all visual overlap as an error.

- [ ] Acceptance gate: moving a house or placing a second tree changes the imported world without edits to engine or renderer logic. Repeated imports of unchanged source produce the same content hash.

Review evidence: [`first-winter.tiled.json`](../assets/world/first-winter.tiled.json) contains terrain and object layers for grass, road, water, house, tree, granary, and bridge. `importTiledMap()` in [`world.ts`](../packages/engine/src/world.ts) uses explicit GID/type mappings and stable `tiled-<id>` instance IDs; fingerprints are deterministic. Reusable footprints and slots currently live in TypeScript definitions. The backdrop asset is retained.

Remaining: no final licensed tileset, Tiled template files, external tileset resolution, surface/foreground layers, or authored validated spawns. The importer reads only the first terrain/object layers, ignores unsupported orientation/rotation/template semantics, and does not validate conflicting placement or asset references. Bridge cells are painted road instead of composing a surface above water. The runtime still calls `createDefaultWorld()` rather than loading this imported map, so content edits do not yet drive the running scene. See [`assets/world/README.md`](../assets/world/README.md).

### Phase 3: Render the structured scene in Phaser

Execution details: [work package W3](#93-w3-scene-modules-rendering-and-overlays).

Deliverables:

- [ ] Extract scene responsibilities from the React entry point into focused scene, asset-loading, and villager-rendering modules.
- [x] Render terrain and objects from the normalized bundle using one world coordinate system. Remove dependence on the CSS backdrop for the new map.
- [ ] Establish terrain, ground decoration, object/actor depth sorting, and foreground/roof rendering. Sort appropriate objects and actors by their ground-contact position so villagers can pass visually behind a canopy or building.
- [x] Use the Phaser camera and viewport sizing for consistent map zoom and coordinate conversion.
- [ ] Add a developer overlay for grid cells, stable object IDs, blocking footprints, entrances, interaction slots, and spawns.

- [ ] Acceptance gate: visuals and debug footprints remain aligned while resizing and zooming; villagers appear in front of or behind objects correctly. Verify visually in the browser in addition to automated checks.

Review evidence: `VillageCanvas` in [`main.tsx`](../packages/web/src/main.tsx) draws normalized terrain and object footprints on a 24-pixel grid; the structured scene no longer depends on the CSS backdrop. Phaser camera bounds, zoom, drag panning, and CSS canvas scaling are implemented.

Remaining: scene creation, assets, and villagers still live in the React entry point. Only actors receive Y-based depth; object rectangles remain at default depth, with no canopy/roof/foreground system. Grid strokes and blocker colors are not the required developer overlay: IDs, slots, entrances, spawns, and blocked-cell reasons are absent. Scene creation captures the initial world/runtime and does not redraw object changes or settlement maps on subsequent props. Browser tests cover history labels and mobile overflow, not depth ordering or debug alignment; the visual acceptance gate remains unverified.

### Phase 4: Enforce collision and traversability on the server

Execution details: [work package W4](#94-w4-traversability-and-step-validation).

Deliverables:

- [x] Implement shared queries such as whether an actor may occupy a cell or traverse an adjacent edge.
- [ ] Compose base terrain, walkable surfaces such as bridges, solid object footprints, and mutable blockers such as doors using documented precedence rules.
- [ ] Validate spawn points and interaction slots against actor clearance and map boundaries.
- [ ] Enforce movement validity in the engine for every movement step. Rendering consumes these results rather than independently deciding authoritative collision outcomes.
- [ ] Extend the overlay to show effective traversability and the reason a cell is blocked.

- [ ] Acceptance gate: actors cannot occupy water, solid building cells, or out-of-bounds cells; they can cross a bridge and reach an accessible entrance. A tree trunk blocks movement while its decorative canopy does not.

Review evidence: `isWalkable()` and `findRoute()` in [`world.ts`](../packages/engine/src/world.ts) enforce bounds, terrain, solid footprints, runtime blockers, and cardinal route neighbors. Fixture tests cover water, building avoidance, an open crossing, and a blocked bridge.

Remaining: bridge-over-water surface precedence is missing because terrain is checked first. Spawns have no validation contract; interaction slots are checked for bounds but not clearance. In [`advanceWorld()`](../packages/engine/src/index.ts), the normal path selects up to two route cells, but crowding fallbacks check only destination occupancy and can select non-cardinal offsets without validating the intervening edge. There is no effective-traversability/reason overlay or separate decorative canopy representation. Existing endpoint-walkability assertions do not establish every-step collision safety.

### Phase 5: Add deterministic navigation and destination selection

Execution details: [work package W5](#95-w5-destinations-reservations-and-replanning).

Deliverables:

- [x] Replace horizontal-then-vertical routing with four-direction A* using terrain travel costs and a compatible heuristic.
- [x] Fix neighbor ordering and tie-breaking so identical inputs produce identical routes.
- [ ] Resolve activity destinations through object capabilities and reachable entrance/work slots, replacing hardcoded location coordinates and arbitrary offsets.
- [ ] Reserve destination slots in a deterministic actor order. Return explicit outcomes for no route, no free slot, or an invalid destination.
- [ ] Define intermediate crowding behavior separately from solid-world collision. Initially allow villagers to pass through one another while reserving interaction slots; physical pushing and corridor traffic are deferred.
- [ ] Track navigation revisions when blocking state changes. Revalidate affected movement and replan from the current valid position, with bounded retries and a wait or alternate destination when necessary.

- [ ] Acceptance gate: routes go around buildings, prefer cheaper roads when appropriate, and use the bridge to cross water. Closing the crossing produces a valid alternate route or an explicit failure, never a route through blocked terrain. Repeated runs produce identical route and slot choices.

Review evidence: `findRoute()` in [`world.ts`](../packages/engine/src/world.ts) implements four-direction A* with positive terrain costs, Manhattan heuristic, fixed neighbor order, and priority/cell-key tie-breaking. Legacy snapshots retain `routeBetween()` as a fallback. Engine tests cover deterministic repeated runs and failure when the fixture bridge is blocked.

Remaining: [`advanceWorld()`](../packages/engine/src/index.ts) still chooses `LOCATION_TILES` plus `destinationOffsets`, rather than object capabilities and interaction slots. Target reservation follows array order and falls back to the first offset when none qualify; no-route collapses to the current position rather than an explicit navigation outcome. Intermediate cells are reserved, contrary to the planned pass-through policy. Routes are recomputed each tick, but navigation revisions, bounded retries, and explicit wait/alternate-destination states are absent. Thus the full deterministic route-and-slot acceptance gate remains open.

### Phase 6: Make travel, arrival, and interaction part of simulation time

Execution details: [work package W6](#96-w6-simulation-time-actions-and-replay).

Deliverables:

- [ ] Introduce movement/action states such as choosing, traveling, waiting, interacting, and idle.
- [ ] Advance along routes according to the movement time model from phase 1. Preserve unfinished travel across ticks and server restarts.
- [ ] Gate location-dependent effects on arrival at a valid interaction slot. For example, collecting food requires reaching the granary and satisfying its resource/capacity rules.
- [ ] Keep destination intent distinct from current location in the inspector. Evaluate encounters using actual presence, not merely matching intended activities.
- [ ] Audit production and consumption accounting so any remaining global seasonal effects are explicit and are not incorrectly attributed to villagers still traveling.
- [ ] Replace delayed route tweens with presentation of authoritative movement progress. On history seek, cancel old animation and display the requested recorded state; on live updates, interpolate only valid committed movement.

- [ ] Acceptance gate: a villager cannot collect food before arrival; a blocked route does not award the activity outcome; restart during travel preserves progress. Different browser playback speeds and two simultaneous viewers produce the same authoritative results.

Review evidence: [`index.ts`](../packages/engine/src/index.ts) persists `destination`, `intendedActivity`, and `targetLocation`; activity is `travel` until coordinate arrival. Collection/sharing are arrival-gated at those coordinates. [`index.test.ts`](../packages/engine/src/index.test.ts) includes JSON serialize/resume equivalence during travel and collection assertions. These are useful partial implementations, not completion of slot-based interaction.

Remaining: no explicit choosing/waiting/interacting state machine; travel advances two cells regardless of terrain cost and does not persist cost progress or a remaining route. Arrival is not checked against object slots/capacity, and resource allocation is not reserved per actor. The inspector lacks destination intent; encounters filter `activity === "meet"` rather than testing actual proximity. Production is still global each tick and consumption/distribution accounting needs the planned audit. [`main.tsx`](../packages/web/src/main.tsx) still uses delayed route tweens; single-point routes do not snap existing actors to recorded positions on seek. Existing two-viewer tests check timeline isolation, not playback-speed equivalence or exact scene replay. A real server restart during travel and the full blocked-arrival gate remain unverified.

### Phase 7: Verify history, dynamic changes, and expansion workflow

Execution details: [work package W7](#97-w7-dynamic-state-bundles-and-expansion).

Deliverables:

- [ ] Complete end-to-end storage and retrieval of immutable map/object/asset bundles. Backups must include referenced bundles as well as the database.
- [ ] Replay old timelines using their original definitions and assets. Refuse unsupported continuation versions clearly; require an explicit migration or new timeline rather than applying new rules silently.
- [ ] Record dynamic object changes with runtime state and navigation revision updates. Do not allow placement of a new blocker to strand an actor inside solid geometry without a defined transition rule.
- [ ] Rebuild the six initial village locations using the proven templates and navigation model.
- [ ] Document the authoring loop: edit a template or map, import, validate, inspect overlays, run route checks, and create a new version for new timelines.
- [ ] Add automated map checks for required-location reachability, blocked or invalid spawns, missing assets, and malformed interaction slots. Include relevant engine, server persistence, and browser replay checks.

- [ ] Acceptance gate: move a building, add another building instance, and change a bridge state without coordinate-specific code changes. Restore a backup and replay both legacy and structured-map timelines correctly. Profile the actual twelve-villager scene before pursuing larger-world optimizations.

Review evidence: checkpoints embed world definitions and runtime blocker IDs. The owner endpoint persists blocker changes, and [`integration.test.ts`](../packages/server/src/integration.test.ts) checks that they survive branching. [`backup.ts`](../packages/server/src/backup.ts) copies/restores the database. Additional workshop, field, meeting-hall, watchtower, and shelter definitions/instances exist in [`world.ts`](../packages/engine/src/world.ts).

Remaining: no immutable versioned asset store or asset-inclusive backup; no simulation-version continuation guard or faithful legacy renderer. Blocker updates overwrite the current tick checkpoint without a navigation revision, change event, or occupied-cell transition check; the settlement runtime copy and mounted scene can also retain old blocker state. Additional instances do not complete the six-location conversion while destinations still use hardcoded anchors. The authoring notes lack an executable edit/import/validate/overlay/route/version workflow. Required-location reachability, spawn/slot/asset validation, backup replay of both models, and profiling of the actual twelve-villager scene remain unverified.

## 5. Delivery order and first complete slice

Implement phases 1–6 against the small fixture map before converting the full village in phase 7. Versioning and compatibility begin in phase 1; phase 7 verifies the complete preservation workflow rather than introducing it late.

The first complete slice is: choose the granary, reserve an accessible slot, travel around a house and across a bridge, arrive, collect food, and replay that journey. Repeat with the bridge unavailable and verify a meaningful failure or alternate route.

Keep reviewable changes separated into world contracts/importing, scene rendering, collision queries, routing, and simulation integration. Runtime and schema changes need meaningful tests; content changes need validation and visual inspection. Do not describe an intermediate rendering-only phase as a completed collision fix.

## 6. Scope boundaries

Defer arbitrary polygon navigation, continuous physics, pushing crowds, vehicles, swimming, large procedural worlds, streamed regions, multi-floor interiors, and an in-browser world editor. The initial outdoor model can represent entering a building through an entrance interaction; a later interior can become a separately defined map with explicit portal connections.

Future procedural generation should produce the same validated world definition format as hand-authored maps. Runtime construction should instantiate known definitions and pass the same placement checks. Neither feature should introduce another unrelated representation of terrain and objects.

## 7. When to reconsider Godot

Godot is not required to solve the current obstacle and authoring problems. Tiled provides visual content authoring while the shared world model supplies authoritative movement and interaction rules.

Revisit Godot if the product shifts toward directly controlled gameplay with substantial real-time physics, complex interactive scenes and animation tooling, extensive scene-based interiors, or native desktop/mobile game releases. Also reconsider it if maintaining custom scene tooling becomes a demonstrated recurring cost. Additional maps or buildings alone are not a migration trigger.

At that point, prototype one representative scene in Godot and compare authoring effort, browser/native delivery, performance, inspector integration, and deterministic replay with the existing implementation. Godot supplies tile, collision, and navigation tooling, but its own tilemap navigation has documented limitations; adopting the engine does not remove the need to define interaction semantics and simulation authority.

Prefer evaluating Godot first as an alternate viewer of the versioned world/state contract. Moving the authoritative simulation into Godot would be a separate architecture decision requiring a headless-server strategy, persistence compatibility, and determinism testing. Avoid two independently authoritative movement systems.

The current browser-oriented observer benefits from the existing TypeScript/React integration. Godot web exports introduce WebAssembly/WebGL requirements and platform considerations that should be measured in the prototype if migration becomes relevant.

## 8. Reference documentation

These sources informed the 2026-09-06 assessment; architecture and phase choices above are project recommendations.

- [Tiled object layers and object properties](https://doc.mapeditor.org/en/stable/manual/objects/)
- [Tiled reusable templates and instance overrides](https://doc.mapeditor.org/en/stable/manual/using-templates/)
- [Tiled JSON format](https://doc.mapeditor.org/en/stable/reference/json-map-format/)
- [Godot TileSets, including physics and navigation](https://docs.godotengine.org/en/stable/tutorials/2d/using_tilesets.html)
- [Godot TileMaps and navigation considerations](https://docs.godotengine.org/en/stable/tutorials/2d/using_tilemaps.html)
- [Godot browser export requirements](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)

## 9. Detailed implementation handoff

### 9.0 Working rules and dependency order

This section makes implementation choices where the earlier phases were underspecified. Use these defaults unless a later user decision changes them. Names described as proposed files or APIs do not exist yet. Verify the checkout before editing: this review's code baseline is `2c0ab82`. Preserve later changes and existing databases; never reset a user's timeline just to make a test pass.

Implement in this order: W1 contract and compatibility; W4 pure spatial queries; W2 importer and small fixture content; W5 navigation; W6 engine travel/actions; W3 rendering and W6 replay; W7 persistence integration and full village. W4 needs W1 types; W2 validation needs W4; W3 overlays need W4; W7 blocker persistence uses W5 revisions and W6 tick commits. Define bundle references in W1 and the storage format in W2, then complete durable storage and backup in W7. Keep the current application buildable between packages with explicit legacy adapters, not silent defaults.

Use one work package per implementation task, splitting its numbered steps further if needed. At the start, read its target files and tests; at the end, report changed files, commands/results, and unresolved acceptance cases. Check off an original deliverable only when all its clauses pass. A partial implementation keeps the original checkbox empty. Keep passing functionality while changing the specified semantics; do not copy old incorrect expected values into new tests.

During intermediate packages, exercise v2 through injected fixtures and isolated test timelines. Enable v2 as the default for user-created timelines only after its W1/W4/W5/W6 engine slice and W2 content loading pass together. Never stamp a checkpoint `mimir-sim-v2` while still executing the old movement/accounting rules. Read-only compatibility remains available throughout. The resource-transfer choices in W6 are intentional proposed rule corrections and must be documented with the version change, not applied retroactively to v1.

Keep the simulation pure: no Phaser, HTTP, filesystem access, clock reads, or unseeded randomness in its rule functions. Put file loading in importer/server adapters. Preserve social/dilemma/weather/regional features outside the corrections identified here. Any change to outcomes, movement, or resource rules requires the new simulation version from W1. Avoid performance rewrites until the final twelve-villager profile identifies a measured problem.

Rework map:

| Current code | Required replacement or correction |
|---|---|
| `packages/engine/src/world.ts` loose casts and shallow validation | W1 runtime parsers and shared world-data package; W2 importer adapter; W4 spatial queries |
| `createDefaultWorld()` and painted road crossings | Imported bundle for new timelines; bridges overlay water through surface definitions |
| `LOCATION_TILES`, `destinationOffsets`, `occupiedTargets`, `occupiedNextPositions` in `advanceWorld()` | W5 capability/slot selection; no intermediate actor collision in the new model |
| `fullRoute[Math.min(2, ...)]` and neighbor fallback jumps | W6 cost-budgeted traversal that validates every cardinal edge |
| `location` strings and `activity === "meet"` as presence | Object/slot identity plus actual position and settlement checks |
| Global `foodProduced`, `consumed`, per-villager collection against the same reserve | W6 explicit ledger entries and sequential allocation from one canonical store |
| `VillageCanvas` mount-only closure, delayed tweens, selected villager object | W3 updateable scene; W6 snapshot-aware playback and selected ID lookup |
| `normalizeState()` generating missing structured data | Versioned read adapter; reject missing required new-model state |
| Owner blocker endpoint overwriting the current checkpoint | W7 durable next-tick commands and transactional immutable checkpoints |
| Top-level and settlement world/runtime copies | Settlement state canonical for the new version; derived compatibility fields only |
| Database-only manual/scheduled backups | W7 consistent database plus every referenced bundle and asset |

### 9.1 W1: Contract, validation, and compatibility

Targets: `packages/engine/src/world.ts`, `packages/engine/src/index.ts`, `packages/server/src/state.ts`, server startup/tick/continue/branch handlers, and web snapshot decoding. Add proposed `packages/world-data/` with `src/types.ts`, `validation.ts`, `canonical.ts`, `spatial.ts`, and `index.ts`. Use `@mimir/world-data`; retain engine re-exports temporarily to avoid unnecessary consumer churn. Add workspace dependencies and TypeScript build references so world-data builds before engine/server/web. Keep Node hashing/file APIs out of its browser entry point.

1. Introduce schema/bundle version 2, `spatialModel: "structured-v2"`, and `simulationVersion: "mimir-sim-v2"`. Retain readers for `legacy-backdrop-v0` and the existing `structured-v1`; do not relabel their saved state. Define read support separately from continuation support. Initially only v2 continues: unsupported versions remain viewable, and tick, scheduler, continue, and blocker commands return an explicit unsupported-version error. Branching an older timeline may preserve it for viewing but must not make it eligible for continuation. Reset creates a new v2 timeline and preserves its parent.
2. Define a normalized bundle containing dimensions, `cellSizePx` (initially 24), terrain definitions/grid, surface instances, object definitions/instances, visual layers, named spawns, and an asset manifest. Use string definition IDs validated by reference lookup rather than expanding the current hardcoded union whenever content adds a template. An object has stable instance ID, definition ID, integer origin cell, orientation, and validated overrides. A definition has blocking offsets, named slot offsets, capabilities, capacity, visual asset/frame references, and ground-contact anchor. Start with orientation 0 only; reject other rotations and tile flips explicitly. Origins are top-left grid cells; slot and footprint offsets are relative to that origin; sprite ground-contact anchors are pixel offsets relative to the same origin.
3. Give every interaction slot a stable local ID and capacity 1. An object's concurrent capacity must be an integer from 1 through its usable slot count when it supports interactions. Correct current definitions such as a capacity-12 meeting hall with only two slots. Decorative objects may have no slots/capabilities and capacity 0. Allow slots on non-solid work surfaces, but never inside an effective solid cell. Define stable spawn IDs and settlement entrance spawn IDs; store actor spawn assignments, not array-index coordinate formulas.
4. Parse `unknown` by checking object/array/scalar shapes before accessing nested values. Reject missing fields, duplicate/empty IDs, non-finite/fractional coordinates, out-of-bounds cells, unknown terrain/definition/asset references, malformed or duplicate offsets/slots, invalid capacities, unsupported versions, and non-positive walkable costs. Reject unknown semantic fields in authored properties so typos cannot silently change behavior. Impassable terrain has no payable traversal cost. Validate runtime blockers against existing objects and reject duplicate IDs. W4 supplies clearance/conflict checks after structural parsing.
5. Canonicalize object keys recursively and sort collections whose order has no semantics by stable ID. Preserve terrain row order and declared rendering-layer order. Include all rule/visual data and the asset manifest in the bundle hash; exclude the hash field itself and timestamps. Use SHA-256 for new bundle identity with one implementation that works in the importer and browser verification path (an asynchronous Web Crypto boundary is acceptable). Keep the old FNV fingerprint only in the v1 reader. Asset manifest entries include relative path, byte hash, media type, and version/provenance reference. Changing a visual asset must change bundle identity.
6. Define v2 runtime state per settlement: bundle reference, object state, navigation revision, store inventory, actor movement/reservations, and pending action state. Movement includes status, destination object/slot IDs, intended activity, remaining cells, remaining cost of the next edge, and planned navigation revision. Validate routes as cardinal, in-bounds sequences; verify reservations refer to a real actor, destination, and slot. Runtime reachability is revalidated after blocker changes rather than silently deleting a destination during deserialization.
7. Split persisted-state decoding from presentation defaults. `normalizeState()` must not manufacture a current world when a structured checkpoint lacks one. New-model corruption is a readable error, not an upgrade. Read legacy snapshots through a separate adapter without writing changes to SQLite. New snapshots use settlement data as authority; derive any old top-level API fields from the home settlement in one serializer, never update both independently.
8. Add a legacy rendering branch using the retained backdrop and recorded coordinates/routes; do not run the new simulation to reproduce old history. Keep a separate v1 structured renderer/adapter for embedded definitions. Archive a small example snapshot of each existing format in test fixtures before reworking types. If original legacy artwork cannot be resolved, display a specific missing-asset message and leave its visual gate unchecked.

Verification: unit cases for duplicate IDs and fractional positions must now fail even with a valid recomputed hash. Also test NaN/null/missing arrays, bad versions, invalid slots/costs, asset changes affecting hashes, and canonical equivalence under harmless object-key reordering. Load the same v2 fixture through server and browser decoders. Read old checkpoints, compare stored `state_json` before/after, and assert no change. Exercise both manual and scheduled unsupported continuation; a branch must not bypass the guard. New-timeline creation must leave existing snapshots intact.

### 9.2 W2: Tiled authoring and import

Targets: current `importTiledMap()` and `assets/world/first-winter.tiled.json`. Add proposed `scripts/import-world.mjs`, `assets/world/maps/`, `templates/`, `tilesets/`, and `generated/`. Keep pure normalization/validation in world-data; provide external-file resolution from the Node script. Move the existing map with references updated, or retain it as a v1 test fixture with an explicit name.

1. Select one redistributable tileset covering grass/road/water and basic village objects. Verify the original download/license source at implementation time. Save license text, author, original URL, retrieval date, version, and attribution requirements under `assets/licenses/`; include visible attribution where required. Do not invent provenance or treat provisional colors as licensed finished artwork. Keep provisional artwork runnable if a usable set cannot be obtained, but leave the art deliverable unchecked with the exact missing asset recorded.
2. Author a finite orthogonal small map with distinct named ground, walkable-surface, object, foreground, and spawn layers. Put water beneath the entire bridge span; the bridge supplies the crossing. Place the house between a spawn and granary so a route must detour, and put the granary across the water. Add sufficient accessible granary slots for the slice actors. Record layer roles as explicit properties; do not infer the first layer of a given type as authoritative.
3. Create external JSON templates for house, tree, granary, and bridge. Their properties supply W1 definition data; a tree trunk blocks one cell while its canopy is visual only. Granary exposes `collect` and `share`; house exposes `rest`; bridge exposes a walkable surface. Instantiate two trees with distinct IDs to exercise reuse. An instance may override only the documented properties (for example label and supported capability parameters); validate overrides after template resolution.
4. Resolve map-relative template and tileset paths, template-relative dependencies, template inheritance, instance overrides, `firstgid`/local tile IDs, and asset files. Detect missing files and reference cycles. Keep all resolved paths inside the configured source/asset roots. Maintain an explicit supported-format list: finite orthogonal, uncompressed JSON tile arrays, grid-aligned rectangle/point placements, orientation 0. Reject infinite/chunked/isometric maps, unsupported group/layer types, compressed data, flipped GIDs, rotation, polygons, or other unimplemented semantics with file/layer/object context. Add support only with tests; do not silently skip such data.
5. Preserve Tiled object IDs under a stable map namespace; moving an object keeps its ID, duplicating it gives a new one. Normalize layers and definitions, run W1/W4 validation, then generate an immutable bundle directory keyed by hash. Reimporting identical sources must produce identical manifest/content bytes. An existing hash directory is verified and reused, never overwritten with different bytes. Generated output includes the assets needed to render it, not paths back to mutable source files.
6. Add `npm run world:import -- <map-path>` and `npm run world:validate -- <bundle-path>` scripts with documented arguments and nonzero exit on any validation error. Make new-timeline creation resolve a configured imported bundle; adapt `createWorld()` to receive validated content instead of reading files. Tests can inject `createFixtureWorld()`. Remove the runtime dependency on `createDefaultWorld()` for v2; never replace content for an existing timeline when a new import becomes available.

Verification: import the actual checked-in map twice and compare hashes/bytes; then move the house and add a tree in a temporary copy, import, and assert changed placements/hash without code edits. Cover template overrides, external tileset `firstgid`, invalid transforms, missing assets, and conflicting solids. Assert that the bridge's base cell is still water while effective traversal succeeds. Start a temporary new timeline from the imported bundle and verify both API and scene use its ID/hash.

### 9.3 W3: Scene modules, rendering, and overlays

Targets: `packages/web/src/main.tsx`, `styles.css`, and browser tests. Proposed modules under `packages/web/src/village/`: `VillageCanvas.tsx` (React lifecycle only), `VillageScene.ts`, `assets.ts`, `coordinates.ts`, `villagers.ts`, and `debugOverlay.ts`. Separate legacy rendering from v2. Keep one exported cell-to-pixel and inverse camera-pointer transform based on bundle cell size.

1. Extract existing scene code before adding graphics. Replace the mount-only closure with a scene controller that accepts a complete snapshot identity: timeline, tick, settlement, bundle hash, runtime revision, and live/history mode. A changed bundle/settlement rebuilds terrain and objects; a runtime revision updates affected visuals and debug cells; actor changes update existing actor nodes. Clean up listeners, tweens, containers, textures owned by the scene, and React StrictMode mount/unmount resources. Preserve pan/zoom for updates to the same map and refit on map switches.
2. Load only resolved manifest assets, using hash-qualified Phaser texture keys so two bundle versions cannot share an incorrect cached texture. Render terrain and walkable surfaces in layer order, then ground decorations, then objects/actors by ground-contact Y with a stable ID tie-break. Do not sort by sprite top edge or only actor destination Y. Render canopy/roof visuals according to their declared depth/foreground role; their pixel coverage must not imply collision. Provide fixtures showing one actor behind and then in front of a tree/building.
3. Implement a toggleable developer overlay with cells, object IDs, solid offsets, named entrances/slots, spawns, surfaces, reservations, and blocked-cell reasons from W4's query. Use distinct colors and a legend. Pointer inspection shows cell coordinates, effective cost, blocking reason/object ID, and relevant slot IDs. Recompute it after a runtime change and a history/settlement switch. Keep labels legible at zoom levels; overlay coordinates must use the same transform as terrain and actors.
4. Preserve existing fit/drag/zoom controls. Handle viewport resizing through Phaser scale/camera updates or a documented fixed internal resolution with CSS scaling; inverse pointer conversion must account for the rendered canvas bounds. Clamp camera bounds after resizing. Do not conflate zoom with simulation speed.

Verification: add browser cases switching between differently shaped maps, applying/opening a blocker, seeking before/after the change, and rapidly mounting/unmounting. Assert scene bundle/revision and actor positions via a read-only test hook where pixel assertions are insufficient. Visually inspect and save screenshots at desktop and 390px mobile widths, fit/1x/2x zoom, with overlays on. Verify canopy depth, footprint/slot alignment, and no stale object colors. Existing text-label E2E checks are not evidence for these cases.

### 9.4 W4: Traversability and step validation

Targets: world-data `spatial.ts`, current `isWalkable()`/`findRoute()`, fixture terrain, and engine step execution. Reuse A* unless tests reveal a defect; give it the new effective-cost query rather than duplicating collision logic.

1. Implement `queryCell(world, runtime, cell)` returning either walkable plus positive integer cost, or a reason such as `out-of-bounds`, `terrain`, `solid-object`, or `runtime-blocker`, including related IDs. Precedence: invalid/out-of-bounds fails; effective solid objects/runtime blockers fail; an enabled walkable surface supplies its cost over base terrain; otherwise use terrain walkability/cost. A disabled bridge removes its surface and prevents use of that crossing; opening it must not remove unrelated solid footprints. Reject ambiguous overlapping movement surfaces in authored content initially.
2. Implement `canTraverse(from, to)` requiring valid integer cells, Manhattan distance exactly one, and both endpoints occupiable. Waiting is a separate operation, not a zero-length edge. `findRoute()` calls this function and uses a Manhattan heuristic scaled by the minimum allowed traversal cost (1 is safe for the initial model). Test start-equals-goal separately from unreachable. Use locale-independent ID ordering for cross-environment determinism.
3. Validate authored spawn clearance and all interaction slots using the fully composed default runtime state. Reject overlapping solid footprints; allow decorative visual overlap and a bridge over water. Validate each required capability is reachable from at least one configured spawn in its settlement, and each spawn can reach the map's required locations. Do not demand every decorative object be reachable. Return actionable diagnostics naming map, object/slot/spawn, cell, and reason.
4. Remove v2 fallback movements based on `destinationOffsets`. During W6 movement, check every edge immediately before committing it, including the intermediate cell when two road edges are taken. If an edge fails, remain at the last valid cell and enter W5 replanning/wait behavior; never substitute the goal or an unchecked nearby cell. Invalid loaded actor occupancy is a state error, not permission to teleport; W7 prevents new blockers from causing it.

Verification: a route cannot jump diagonally, cross a solid intermediate cell, enter water/off-map, or walk from an invalid start. Test bridge-over-water open/closed, trunk versus canopy, non-solid work surfaces, invalid spawns, blocked slots, and overlapping solids. Check every committed movement segment, not just its final endpoint. Reuse the same query in the overlay and assert its reported reason agrees with the engine.

### 9.5 W5: Destinations, reservations, and replanning

Targets: activity destination logic in `advanceWorld()`; proposed engine `navigation.ts`; shared runtime types. Keep decision policy (which activity an actor wants) separate from spatial resolution (where it can legally perform that activity).

1. Resolve candidates from objects in the actor's current settlement whose capability includes the intended activity. Map the six initial location labels in content: Homes/house/rest; Granary/granary/collect+share; Workshop/workshop/craft; Meeting Place/meeting-hall/meet; Fields/field/work; Woodland/tree or woodland-work-area/gather. Add accessible gather slots beside trunks. Labels are presentation only. Watchtower and shelter are optional additional objects, not substitutes for one of these six destinations.
2. Return a tagged result: `reserved` with object/slot IDs and route/cost; `invalid-destination` for missing capability/invalid requested identity; `no-free-slot` when usable slots are reserved; `no-route` when free slots exist but none is reachable. Try every eligible free slot before deciding no-route. Sort successful candidates by total route cost, then object ID, then slot ID using a locale-independent comparator. For explicit saved intent, keep its slot while valid rather than switching opportunistically every tick.
3. Process actor decisions in stable actor-ID order, independent of array layout. Keep each actor's own reservation while traveling and through its interaction tick; release it after interaction, canceled intent, departure, or invalidation, making it available on the following tick. Respect both slot capacity 1 and object capacity. Preserve/reconstruct reservations from serialized movement state and validate uniqueness after restart. Other actors may pass through occupied route cells; remove v2 final-position uniqueness requirements from old tests and replace them with slot/capacity assertions.
4. Initialize settlement `navigationRevision` at zero. Increment only when effective walkability/cost changes. Store each route's planned revision; on mismatch revalidate its remaining edges/slot and costs, keep it if still valid and costs are unchanged, otherwise replan from the committed current cell and reset partial-edge cost progress. Make at most one full candidate search per actor per tick. On failure enter `waiting` with a reason and retry no sooner than next tick; revision changes trigger a new check next tick. An alternate reachable object can satisfy the same activity after the previous reservation is released. Waiting is not successful arrival and awards no location-dependent effect.
5. Validate intent again when the actor reaches the slot: matching settlement, object, capability, slot, reservation, and occupancy. A stale target coordinate alone is insufficient. Preserve independent regional travel: on departure release local reservations; on arrival use the destination settlement's authored entrance spawn and resume local decisions. Replace the current literal `{ x: 95, y: 95 }` placement for v2, and do not freeze every non-home villager at `rest`.

Verification: place two granaries with different reachable costs; block the nearer one and choose the other deterministically. Test all-slots-full, unreachable free slot, removed/invalid target, actor-array reordering, reservation restart, and multiple actors passing through the same corridor. Move a building in source and rerun without touching coordinate code. Closing the only crossing yields `waiting/no-route`; reopening it resumes valid movement. Closing a different crossing keeps an unaffected route valid.

### 9.6 W6: Simulation time, actions, and replay

Targets: `advanceWorld()`, `Villager`/runtime state, food/event accounting, selected-villager inspector, scene playback, and engine/server/browser tests. Proposed engine modules: `movement.ts` and `actions.ts`. Preserve activity vocabulary but add an explicit movement/action status instead of treating `travel` as the only state indicator.

1. Implement states `choosing`, `traveling`, `waiting`, `interacting`, and `idle`. At each tick: apply queued world commands; validate/replan destinations and allocate slots in ID order; advance movement; execute at most one arrival-dependent action per actor; apply explicit global accounting/social effects; commit resulting state/events. An actor that arrives during a tick may interact once in that same tick. Do not choose a second destination/action within that tick. Persist status transitions and intent; idle or waiting produces no work/collection reward.
2. Use a v2 movement model with two cost units per simulation tick, rather than calling them two unconditional cells. Entering road costs 1 and grass costs 2; cost belongs to the destination cell's effective terrain/surface. Debit the next edge's remaining cost; commit its cell only when fully paid. Retain unpaid cost and remaining route across ticks/restarts. Example: two road edges finish in one tick; two grass edges take two ticks; a road then grass uses one unit on the grass edge and finishes it next tick. Position stays in the last occupied integer cell until an edge completes. Never accumulate unused budget while idle/waiting. Discard partial edge progress only when that edge is invalidated, documenting this deterministic rule.
3. Record the actual committed cell sequence for this tick, including intermediate corners, separately from the remaining future route. The committed sequence begins at the previous position and ends at the new position; an unchanged actor has a one-cell sequence. Record movement cost progress for inspector/restart use. The browser may interpolate committed edges only, never project an unfinished edge into an uncommitted cell.
4. Execute collection only after W5 validates arrival and the store has food. Default quantity is `min(2, remainingStoreFood)`; debit exactly that amount and credit exactly that amount to the actor, allocating in stable actor-ID order. Multiple granaries in one settlement reference the same canonical settlement store initially; do not create a duplicate reserve per building. No-route/full-slot/resource-empty results award zero food and identify the reason. Define `share` as a transfer of up to one unit from the arriving actor's own food into that settlement store; credit cooperation/trust only on a positive transfer. Keep grant/loan/trade/dilemma consequences as explicitly recorded separate transfers, not phantom actor collection.
5. Replace implicit accounting with a per-tick ledger of production, transfers, consumption, and authored adjustments. Preserve current scheduled background production amounts initially but label them `global-production` with no worker credit; this is an explicit scenario source, not an arrival reward. Remove the global reserve debit based merely on the number of empty-handed actors. Consume at most one unit from each actor's carried food per tick, including during travel, and compute hunger effects from actual consumption. Record weather/dilemma adjustments as separate named entries. Shared-store contribution/distribution counters count transferred units, not actor counts. Clamp debits to available stock and record the actual amount; never hide a negative inventory with a final `Math.max(0, ...)`. Add per-settlement stores to the new model and derive old home reserve display fields from them.
6. Rest/craft/work/gather/meet effects that currently change rest, trust, or beliefs must require validated arrival at their capability slot. Do not invent new crafting inventory or production systems as part of this slice. Encounters require at least two actors actually interacting at the same meeting object in the same settlement during the tick; record object and participant IDs. Regional travelers cannot participate remotely. Keep spontaneous non-location social changes explicitly labeled as such.
7. Store `selectedVillagerId` in React, then derive the selected actor from the displayed snapshot each render. Show current settlement/cell, current interaction object if any, destination object/slot, intended activity, status, wait reason, and travel progress. Do not display stale `location` as proof of presence. Separate current location from destination in readable text; hide raw debug IDs outside developer mode when labels suffice.
8. Replace per-step delayed tweens with one controlled playback sequence per actor. On history seek, nonconsecutive tick, timeline/settlement/bundle switch, or return-to-live: cancel movement and idle tweens as appropriate, snap every actor including one-cell routes to the requested state, and reset interpolation baseline. For consecutive live ticks in the same scene, interpolate recorded committed edges in order; on interruption snap to the prior authoritative endpoint before starting the next sequence. Playback rate affects presentation duration only. Discard stale history responses with request sequencing/abort logic; live events must not replace a pinned historical snapshot.

Verification: exact road/grass tick counts and partial-edge serialization; no reward before arrival or on failed navigation; one interaction maximum per tick; last food allocated without duplication; conservation of food across stores and actors after named production/consumption/adjustments. Update tests tied to the old food formula with justified new expected values. Start a temporary server, advance into partially paid travel, stop it, restart with the same database, and compare the next state/events with an uninterrupted control run. Test two viewers at different playback rates against the same committed ticks, comparing authoritative state and displayed endpoints. Seek to tick 0 and across a turning route, and verify sprite coordinates, not just timeline labels.

### 9.7 W7: Dynamic state, bundles, and expansion

Targets: server owner endpoint/commit loop/storage, `backup.ts`, scheduled backups, world-data runtime validation, imported full village content, and authoring/runbook documents. Split this package into dynamic commands, bundle/backup preservation, and full-map acceptance changes so failures are localized.

1. Replace immediate blocker mutation with a durable pending command. Require settlement ID, object ID, desired blocked state, and an idempotency key; infer the home settlement only for the old endpoint adapter. Validate owner, active/continuable timeline, object existence, and proposed effective occupancy. Return 409 with affected actor IDs when closing would cover any currently occupied cell. Never teleport actors or silently accept stranding. A pending partial edge's destination is not occupied until committed, so closing it invalidates/replans that edge.
2. Store accepted commands with server-assigned ordering and target tick `currentTick + 1` in SQLite; return 202 with command ID/effective tick. A paused simulation keeps the command pending until its next manual/scheduled tick. Revalidate at application time in command order, emit applied/rejected events, and atomically commit command status, revised runtime, navigation revision, actor progress, events, and the new checkpoint. Only publish live updates after commit. Failed transactions leave in-memory state and pending commands unchanged. No-op blocker commands do not increment navigation revision. Never use `INSERT OR REPLACE` to rewrite historical checkpoints.
3. Persist pending commands across restart; idempotent retries return the original result without duplicating commands. Branches inherit committed history/runtime through the selected tick, but not pending future commands from the parent. Update integration tests currently expecting an immediate blocker response: advance the effective tick, then verify branch/history/restart and overlay results. Route hazards must target explicit settlement/object references in content and use the same safe mutation rule; a regional road status flag alone must not be presented as a local bridge closure. If an occupied crossing prevents closure, record that the local closure was deferred/rejected and retry through a later explicit command rather than stranding an actor.
4. Store immutable bundles at a configured content-addressed root, one hash directory containing manifest, normalized world, provenance/license references, and copied assets. Verify hashes on registration/load; refuse missing/mismatched referenced content instead of falling back to the newest map. Save the exact reference in each new checkpoint/timeline, register the bundle before committing its first reference, and expose a read-only hash-qualified retrieval endpoint for the browser. Validate path containment and return 404 for missing assets rather than serving the SPA shell. Preserve old bundle directories when importing new versions.
5. Unify manual and scheduled backups behind one implementation. Create a consistent SQLite snapshot while preventing concurrent mutation or using SQLite's supported consistent backup mechanism; then gather every bundle/asset referenced by all included timelines, including archived ones. Write a backup manifest with checksums, database version, and bundle hashes. Stage into a temporary output and mark it complete only after every file is copied/verified; exclude incomplete outputs from restore discovery. Include pending commands in the database snapshot. Retain required legacy backdrop assets and v1 embedded definitions. Restore to a new directory/database, verify checksums and references before startup, and never overwrite the running database as a test.
6. Convert all six initial destinations from W5's mapping into the full authored village. Provide twelve validated actor spawns and both settlements' regional entrance spawns. Make all required capabilities reachable under default state. Use enough explicit slots for each template's capacity; do not reinstate offsets around arbitrary anchors. Demonstrate another instance of a building sharing its definition and another imported version with a moved building. New timelines select the new bundle; old timelines retain their original layout/assets.
7. Expand `assets/world/README.md` and the hosted runbook with exact commands: edit map/template, import, validate, read errors, open temporary new timeline, toggle overlays, run required route checks, register bundle, and select it for a new timeline. Explain supported Tiled features, ID stability, provenance, generated-file policy, version bump rules, missing-bundle recovery, pending command behavior, and backup/restore. Update stale architectural statements about the backdrop and spatial package only after code changes land.
8. Run a twelve-villager full-map profile with overlays off and on. Record hardware/browser, map dimensions/object count, build mode, seed, tick count, engine tick timings (median/p95), browser frame timings, and any long tasks or memory growth observed. Compare at least two consecutive runs and save results under `docs/`; do not report smoke-test duration as a scene profile or claim an unmeasured performance target. Optimize only measured bottlenecks, rerunning determinism and relevant route tests after an algorithm change.

Verification: block/reopen an unoccupied bridge, reject a closure under an actor, restart with a pending command, retry the same idempotency key, and branch before/after the effective tick. Confirm parent snapshots are byte-unchanged and settlement/API/scene agree. Back up timelines containing legacy, v1, and two v2 bundles; restore in a clean temporary directory with no access to the original asset root, then replay each and continue only supported versions. Remove/corrupt an asset in a backup copy and require a clear restore failure. Finally run the granary slice across a bridge, with the bridge blocked, and after moving the house/adding a building through import alone.

### 9.8 Validation commands and completion evidence

Run checks against isolated temporary databases with `AUTO_TICK=false` and dedicated ports. The repository contains SQLite/WAL files that may belong to live work; never delete them by glob. Integration/browser tests currently create timestamped databases; preserve that isolation. After adding new suites, wire them into package scripts so these commands actually execute the new cases.

Current baseline commands from the repository root:

```powershell
npm run build
npm test
node packages/server/dist/state.test.js
npm run test:integration --workspace @mimir/server
npm run test:e2e --workspace @mimir/web
git diff --check
git status --short
```

`npm run build` must succeed before tests that launch `packages/server/dist/index.js`; otherwise they may test stale compiled code. Add the world-data build/test scripts and explicit dependencies in W1; do not assume workspace iteration will discover the new dependency order automatically. Root `npm test` currently runs only the engine suite, so expand its orchestration or explicitly run world-data tests. The legacy state test has no package script at the reviewed baseline; its compiled invocation above is intentional. If `tsx` hits the known esbuild spawn error, freshly compile and run the emitted JavaScript from the package's expected working directory; do not claim a blocked test passed.

For each package, record: baseline/commit, original deliverables covered, changed files, tests run and exact outcome, and any remaining visual/manual checks. For W2/W7 include source/bundle hashes; for W3/W6 include screenshot paths and scene assertions; for W7 include backup/restore locations and profile results. No full-phase checkbox is earned by source inspection alone when its gate explicitly requires browser verification, restart, or restore. At final review, rerun the seven acceptance gates and retain empty boxes for unresolved work.

## Implementation progress after `cfeef4f`

This ledger records verified work packages without overstating phase completion. The original phase and acceptance-gate checkboxes remain empty where the gate still requires migration, browser evidence, restart, restore, or profiling.

| Package | Commit | Verified evidence | Still open |
|---|---|---|---|
| W1 contract boundary | `53d81a1` plus follow-up | Added `@mimir/world-data` with strict v2 types, recursive canonicalization, portable SHA-256 bundle identity, runtime checks, and compiled validation tests for duplicate IDs, fractional coordinates, and surface precedence. Browser verification found and fixed the Node-only crypto leak. | Engine/server/web are not yet fully decoded through the package; legacy/v1 continuation guards, fixture archive, runtime-state migration, and browser decoder parity remain open. |
| W2 importer | `1eb898e`, `55278a4`, `75ed322` plus route correction | Added deterministic importer/validator scripts, four template files, strict authored spatial diagnostics, and preserved immutable bundles. The route-corrected expanded authored village is `sha256-1f24c63c9168eb2e8d6a76be1b1d42c12b601ef9f3955a34a9cf25d4d2854564`; it contains six capability destinations, eight object instances, twelve first-village spawns, and a Riverbend entrance. Engine/server compatibility, restart, and backup tests use the new hash while prior bundle directories remain preserved. | Licensed art/provenance, external tileset/template resolution, asset manifest population, conflict diagnostics beyond current spatial checks, and moved-house/add-tree import regression remain open. |
| W4 traversability | `b6760df` | Engine `queryCell()`/`canTraverse()` now share bounds, terrain, solid/runtime blocker, surface precedence, and cardinal-edge logic with A*. Fresh engine compilation succeeds. | Full spawn/slot/overlap validation, effective-reason overlay, and replacement of all unsafe legacy step fallbacks remain open. |
| W5 destinations | `af99890` | Added pure deterministic capability/slot resolver with explicit reserved/no-free-slot/no-route/invalid-destination outcomes and stable cost/object/slot ordering. | `advanceWorld()` still uses legacy anchors and does not yet persist/reconstruct reservations or navigation revisions. |
| W6 movement/replay | `1641903`, `a9dc757`, `017cce9` plus follow-up | Added compiled cost-budgeted movement and structured-v2 simulation with explicit statuses, remaining route/cost, committed cell sequence, stable reservations, arrival-gated collection/share, deterministic full-slot reservation coverage, explicit per-tick `global-production` ledger entries, and cumulative conservation coverage. The server now routes structured-v2 ticks through this simulation and dedicated restart equivalence passes. | Full authored adjustment/social action effects and authoritative browser playback sequencing remain open. |
| W3 web primitives | `4ec532f` plus follow-up | Added shared coordinate/inverse-coordinate helpers, debug legend types, ID-derived selected-villager lookup, depth-aware object rendering, dev overlay IDs/slots, one-cell snapping, and update-triggered scene rebuilds. Browser E2E passed; visual evidence: `docs/2026-09-06-world-desktop-overlay.png`, `docs/2026-09-06-world-mobile.png`; mobile width remained 390px. | Full v2 scene adapter, reservation/reason overlays, historical playback sequencing, and visual assertions across map switches remain open. |
| W7 dynamic/bundle slice | `496bc18` plus follow-up, `e56064a`, `e73f503`, `40c4174` | Blocker changes queue durable idempotent next-tick commands and apply transactionally; structured-v2 blocker/reopen behavior updates runtime navigation revision; compiled integration passes. Manual and scheduled backups share bundle-inclusive copying and manifests. Hash-qualified retrieval, `/api/owner/reset-v2`, restart equivalence, deliberate corruption failure, the full authored village, and a two-run 12-villager profile are verified. | Continuation guards, final clean replay across legacy/v1/v2, overlay-on performance comparison, runbook expansion, and complete all-sevens acceptance review remain open. |

| Browser structured-v2 adapter | `6910c91`, `5ba4f27` | The web app derives a renderable scene definition from the authoritative structured bundle, renders fresh structured timelines, and exposes an explicit `Show IDs`/`Hide IDs` developer overlay. Rebuilt browser E2E passes live ticks, history seek, settlement switching, mobile overflow, and overlay state transition. | Exact sprite-coordinate assertions across history turns and controlled committed-edge playback remain open. |

Validation note: the initial `tsx`/Vite attempts hit the known Windows `EPERM` child-process restriction. The world-data tests and legacy compatibility tests must therefore be run from freshly compiled JavaScript when the restriction is present. The elevated full build passed; the long-running legacy engine suite was not counted as passed until its runtime is isolated. No phase acceptance gate is earned by the partial package commits above.
