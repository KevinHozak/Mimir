# Philosophy World: Scene, Tile, Collision, and Navigation Plan

Date: 2026-09-06

Status: Approved direction; implementation phases below are planned, not completed.

Implementation ledger (updated 2026-09-06): phases 1, 3, 4, and the core of 5 are implemented in the current working tree and covered by engine, server, build, and browser checks. Phase 6 now has per-tick travel, persisted destinations, arrival-gated activities, and a deterministic serialize/restart test. Phase 2 now includes a validated normalized parser, a Tiled JSON importer, a checked-in authored map source with provisional tile mappings, and deterministic world fingerprints; final licensed tileset art provenance remains open. Phase 7 now has a persisted runtime blocker overlay, an owner endpoint for changing object blocking, red blocked-object rendering, and integration coverage proving a runtime blocker survives branching.

Companion documents: [Web Development Plan](2026-09-06_Web_Development_Plan.md) and [Simulation Game Plan](2026-09-06_Simulation_Game_Plan.md).

## 1. Decision and intended outcome

Keep Phaser for the village view, React for the observer interface, and the TypeScript server as the authoritative simulation. Use Tiled to author terrain and reusable world objects. Defer Godot; section 7 describes when to reconsider it.

The world must describe what exists, where it is, where villagers may travel, and what they can do upon arrival. Adding or moving a building should normally be a content edit followed by validation, without changing movement code. Adding a new kind of behavior may still require engine code.

The first milestone is a small village containing a house, tree, water, bridge, and functioning granary. Prove that these parts work together before rebuilding the entire illustrated map or expanding the world.

## 2. Current implementation and gaps

The current prototype displays `village-backdrop.png` beneath a transparent Phaser canvas. The buildings and water in that image have no simulation equivalents. The engine stores named location coordinates and chooses nearby destination offsets. Its `routeBetween()` function moves horizontally, then vertically, without consulting terrain or obstacles.

Each simulation tick assigns the destination and applies activity effects immediately; the browser subsequently animates the recorded route. The current tests establish deterministic results and distinct destination positions, but do not establish collision handling, reachability, or arrival before interaction.

Relevant implementation entry points:

- `packages/engine/src/index.ts`: world initialization, location anchors, route creation, and activity effects.
- `packages/web/src/main.tsx`: Phaser scene creation and villager animation.
- `packages/web/src/styles.css`: illustrated background and viewport sizing.
- `packages/server/src/index.ts`: persisted state, normalization, timeline operations, and simulation advancement.

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

Deliverables:

- Define validated schemas for terrain, object definitions, object instances, maps, runtime spatial state, and immutable bundle references.
- Establish stable IDs, schema versions, content hashes, and simulation-version fields before new spatial state is persisted.
- Define the movement time unit and relationship between movement steps, social decisions, and season duration. Browser playback speed must never alter simulation outcomes.
- Define the initial actor footprint and terrain traversal rules. Start with a one-cell occupancy model and positive integer travel costs.
- Specify a compatibility path for existing checkpoints: retain the legacy backdrop and movement interpretation for old history; start the new spatial model on a new timeline by default.
- Create a minimal hand-authored fixture to test spatial queries before connecting the map editor.

Acceptance gate: the same fixture loads in server and browser code, invalid IDs/coordinates fail validation, and legacy snapshots can still be read without being silently rewritten.

### Phase 2: Author tiles and reusable objects in Tiled

Deliverables:

- Select a coherent licensed tileset and record asset provenance. Keep the generated backdrop as an art reference and legacy asset.
- Create ground and surface layers, object placement layers, and explicit foreground visuals where required.
- Define templates for a house, tree, granary, and bridge. Each template includes its solid footprint and any accessible interaction slots; decorative foliage and roofs do not automatically become blocking areas.
- Author a small map with grass, a preferred road, impassable water, a bridge crossing, and validated spawn points.
- Build a deterministic importer that resolves template inheritance and tileset references into the shared bundle. Preserve stable instance IDs across edits.
- Validate bounds, referenced assets, supported transforms, required properties, and conflicting object placement. Model the bridge's walkable surface explicitly above water rather than treating all visual overlap as an error.

Acceptance gate: moving a house or placing a second tree changes the imported world without edits to engine or renderer logic. Repeated imports of unchanged source produce the same content hash.

### Phase 3: Render the structured scene in Phaser

Deliverables:

- Extract scene responsibilities from the React entry point into focused scene, asset-loading, and villager-rendering modules.
- Render terrain and objects from the normalized bundle using one world coordinate system. Remove dependence on the CSS backdrop for the new map.
- Establish terrain, ground decoration, object/actor depth sorting, and foreground/roof rendering. Sort appropriate objects and actors by their ground-contact position so villagers can pass visually behind a canopy or building.
- Use the Phaser camera and viewport sizing for consistent map zoom and coordinate conversion.
- Add a developer overlay for grid cells, stable object IDs, blocking footprints, entrances, interaction slots, and spawns.

Acceptance gate: visuals and debug footprints remain aligned while resizing and zooming; villagers appear in front of or behind objects correctly. Verify visually in the browser in addition to automated checks.

### Phase 4: Enforce collision and traversability on the server

Deliverables:

- Implement shared queries such as whether an actor may occupy a cell or traverse an adjacent edge.
- Compose base terrain, walkable surfaces such as bridges, solid object footprints, and mutable blockers such as doors using documented precedence rules.
- Validate spawn points and interaction slots against actor clearance and map boundaries.
- Enforce movement validity in the engine for every movement step. Rendering consumes these results rather than independently deciding authoritative collision outcomes.
- Extend the overlay to show effective traversability and the reason a cell is blocked.

Acceptance gate: actors cannot occupy water, solid building cells, or out-of-bounds cells; they can cross a bridge and reach an accessible entrance. A tree trunk blocks movement while its decorative canopy does not.

### Phase 5: Add deterministic navigation and destination selection

Deliverables:

- Replace horizontal-then-vertical routing with four-direction A* using terrain travel costs and a compatible heuristic.
- Fix neighbor ordering and tie-breaking so identical inputs produce identical routes.
- Resolve activity destinations through object capabilities and reachable entrance/work slots, replacing hardcoded location coordinates and arbitrary offsets.
- Reserve destination slots in a deterministic actor order. Return explicit outcomes for no route, no free slot, or an invalid destination.
- Define intermediate crowding behavior separately from solid-world collision. Initially allow villagers to pass through one another while reserving interaction slots; physical pushing and corridor traffic are deferred.
- Track navigation revisions when blocking state changes. Revalidate affected movement and replan from the current valid position, with bounded retries and a wait or alternate destination when necessary.

Acceptance gate: routes go around buildings, prefer cheaper roads when appropriate, and use the bridge to cross water. Closing the crossing produces a valid alternate route or an explicit failure, never a route through blocked terrain. Repeated runs produce identical route and slot choices.

### Phase 6: Make travel, arrival, and interaction part of simulation time

Deliverables:

- Introduce movement/action states such as choosing, traveling, waiting, interacting, and idle.
- Advance along routes according to the movement time model from phase 1. Preserve unfinished travel across ticks and server restarts.
- Gate location-dependent effects on arrival at a valid interaction slot. For example, collecting food requires reaching the granary and satisfying its resource/capacity rules.
- Keep destination intent distinct from current location in the inspector. Evaluate encounters using actual presence, not merely matching intended activities.
- Audit production and consumption accounting so any remaining global seasonal effects are explicit and are not incorrectly attributed to villagers still traveling.
- Replace delayed route tweens with presentation of authoritative movement progress. On history seek, cancel old animation and display the requested recorded state; on live updates, interpolate only valid committed movement.

Acceptance gate: a villager cannot collect food before arrival; a blocked route does not award the activity outcome; restart during travel preserves progress. Different browser playback speeds and two simultaneous viewers produce the same authoritative results.

### Phase 7: Verify history, dynamic changes, and expansion workflow

Deliverables:

- Complete end-to-end storage and retrieval of immutable map/object/asset bundles. Backups must include referenced bundles as well as the database.
- Replay old timelines using their original definitions and assets. Refuse unsupported continuation versions clearly; require an explicit migration or new timeline rather than applying new rules silently.
- Record dynamic object changes with runtime state and navigation revision updates. Do not allow placement of a new blocker to strand an actor inside solid geometry without a defined transition rule.
- Rebuild the six initial village locations using the proven templates and navigation model.
- Document the authoring loop: edit a template or map, import, validate, inspect overlays, run route checks, and create a new version for new timelines.
- Add automated map checks for required-location reachability, blocked or invalid spawns, missing assets, and malformed interaction slots. Include relevant engine, server persistence, and browser replay checks.

Acceptance gate: move a building, add another building instance, and change a bridge state without coordinate-specific code changes. Restore a backup and replay both legacy and structured-map timelines correctly. Profile the actual twelve-villager scene before pursuing larger-world optimizations.

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
