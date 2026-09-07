# World map sources

`first-winter.tiled.json` is the initial authored orthogonal map source for the structured world pipeline. Import it with `npm run world:import -- assets/world/first-winter.tiled.json`; validate a generated bundle with `npm run world:validate -- assets/world/generated/<sha256>/world.json`.

It uses a 24-pixel grid and the following provisional tile mappings used by the importer:

- GID 1: grass
- GID 2: water
- GID 3: road

The map contains a house, tree, granary, and bridge object layer. The importer resolves those into a content-addressed generated bundle. Reimporting unchanged source must preserve the hash and bytes; moving an object or adding an instance must produce a new hash. Generated bundles are immutable and must not be edited manually.

The current renderer uses normalized object definitions and procedural placeholder colors while final licensed tileset art is selected. No redistributable tileset has been selected yet, so the art/provenance deliverable remains open. Keep source, templates, and eventual license text together when the art is replaced. Supported source features are finite orthogonal JSON maps, named uncompressed tile/object layers, grid-aligned rectangle/point objects, and orientation 0. Unsupported transforms, compressed/chunked data, polygons, and unknown layers must fail with context.
