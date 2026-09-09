# First Glow world assets

The active authored source is [`maps/first-glow.tiled.json`](maps/first-glow.tiled.json). Generate its immutable schema-3 bundle with:

```powershell
npm run world:import -- assets/world/maps/first-glow.tiled.json
npm run world:validate -- assets/world/generated/<sha256>/world.json
```

The bundle is explicitly `themeId: living-circuit`, `ageId: first-glow`, `simulationVersion: mimir-sim-v3-first-glow`, and `spatialModel: structured-v2`. Persisted object, Spark, route, and asset IDs are stable identifiers; labels and artwork may evolve independently.

Do not edit generated hash directories by hand. Add or change authored Tiled data, templates, or assets, regenerate, validate, and retain existing First Glow bundles referenced by checkpoints.

See [`docs/first-glow-art-bible.md`](../../docs/first-glow-art-bible.md) and run `npm run art:bible:check` before visual review. The bible's review command writes only disposable `.tmp/first-glow-art-review/` captures.

## Art production source boundary

Editable vectors and raster originals live under `assets/world/assets/`; their machine-readable metadata is `assets/world/art-production/assets.json`. Review-only inventories, contact sheets, and responsive frames are generated under `.tmp/art-review/` and are never bundle source. Run `npm run art:check` before import to catch missing dimensions, metadata, provenance, active template references, orphaned active assets, and missing assets in retained generated bundles. See [`docs/art-production.md`](../../docs/art-production.md) for the complete PowerShell workflow.
