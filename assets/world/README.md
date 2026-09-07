# World map sources

`first-winter.tiled.json` is the authored orthogonal map source for the structured world pipeline. Import it with `npm run world:import -- assets/world/first-winter.tiled.json`; validate the resulting file with `npm run world:validate -- assets/world/generated/<sha256>/world.json`.

It uses a 24-pixel grid and the following provisional tile mappings used by the importer:

- GID 1: grass
- GID 2: water
- GID 3: road

The map contains reusable house, tree, granary, bridge, workshop, field, and meeting-hall definitions, two tree instances, twelve Hearthmere spawns, and a Riverbend entrance spawn. The importer resolves those into a content-addressed generated bundle. Reimporting unchanged source must preserve the hash and bytes; moving an object or adding an instance must produce a new hash. Generated bundles are immutable and must not be edited manually.

The current renderer uses normalized object definitions and procedural placeholder colors while final licensed tileset art is selected. No redistributable tileset has been selected yet, so the art/provenance deliverable remains open. Keep source, templates, and eventual license text together when the art is replaced. Supported source features are finite orthogonal JSON maps, named uncompressed tile/object layers, grid-aligned rectangle/point objects, and orientation 0. Unsupported transforms, compressed/chunked data, polygons, and unknown layers must fail with context.

## First Glow source

`maps/first-glow.tiled.json` is the schema-3 Living Circuit source. It resolves the external `tilesets/first-glow.json`, reusable First Glow templates, and repository-authored SVGs under `assets/`. Import it with `npm run world:import -- assets/world/maps/first-glow.tiled.json`; the importer copies hash-qualified assets into the immutable generated bundle and records provenance in `manifest.json`. The current bundle is `sha256-92cc5cee6d8859375c046057ef6341fa6844cf6cbe610177d1d81726af0decf3`.

Typical workflow:

1. Edit the Tiled source or a JSON template, keeping stable object IDs and grid alignment.
2. Run the importer for the selected source (`assets/world/first-winter.tiled.json` for village history or `assets/world/maps/first-glow.tiled.json` for new First Glow timelines) and copy the printed SHA-256 hash.
3. Run `npm run world:validate -- assets/world/generated/<sha256>/world.json`; diagnostics identify the object, slot, spawn, cell, and reason.
4. Build the server and open a temporary timeline with `POST /api/owner/reset-v2` for a structured-v2 village bundle or `POST /api/owner/reset-v3` for a schema-3 First Glow bundle. Do not edit an existing bundle or timeline.
5. Use the map toolbar's `Show IDs` control, run the engine tests, and exercise bridge/open/blocked route checks before selecting the bundle for a new timeline.
6. Use the server backup/restore commands for a clean-directory recovery check. Missing or mismatched bundles are restore errors, not fallback requests.
