# First Glow world assets

The fresh-world frontier source is [`maps/first-glow-frontier.tiled.json`](maps/first-glow-frontier.tiled.json). The earlier [`maps/first-glow.tiled.json`](maps/first-glow.tiled.json) remains editable historical source. Generate its immutable schema-3 bundle with:

```powershell
npm run world:import -- assets/world/maps/first-glow-frontier.tiled.json
npm run world:validate -- assets/world/generated/<sha256>/world.json
```

The bundle is explicitly `themeId: living-circuit`, `ageId: first-glow`, `simulationVersion: mimir-sim-v3-first-glow`, and `spatialModel: structured-v2`. Persisted object, Spark, route, and asset IDs are stable identifiers; labels and artwork may evolve independently.

Do not edit generated hash directories by hand. Add or change authored Tiled data, templates, or assets, regenerate, validate, and retain existing First Glow bundles referenced by checkpoints.

See [`docs/first-glow-art-bible.md`](../../docs/first-glow-art-bible.md) and run `npm run art:bible:check` before visual review. Run `npm run art:review -- --bundle assets/world/generated/<sha256>/world.json` for actual desktop/mobile observer captures, including reduced-motion and glow-disabled frames. All outputs remain disposable under `.tmp/`.

## Art production source boundary

Editable vectors and raster originals live under `assets/world/assets/`; their machine-readable metadata is `assets/world/art-production/assets.json`. Review-only inventories, contact sheets, and running-observer captures are generated under `.tmp/art-review/` and are never bundle source. Run `npm run art:check` before import to catch missing dimensions, metadata, provenance, active template references, orphaned active assets, and missing assets in retained generated bundles. See [`docs/art-production.md`](../../docs/art-production.md) for the complete PowerShell workflow.

The frontier source includes explicit `frontier` metadata: version `local-frontier-v1`, non-overlapping region bounds partitioning the map, and bounded weave project contracts referencing authored object IDs. Its trace surface is entirely authored in the surface layer; the legacy importer convenience surfaces for the old map are not injected. The new rendezvous/trace-weave templates reuse existing licensed assets and declare their real contacts/capabilities in editable JSON. Never retrofit the new policy onto a recorded world.
