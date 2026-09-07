# First Glow world assets

The active authored source is [`maps/first-glow.tiled.json`](maps/first-glow.tiled.json). Generate its immutable schema-3 bundle with:

```powershell
npm run world:import -- assets/world/maps/first-glow.tiled.json
npm run world:validate -- assets/world/generated/<sha256>/world.json
```

The bundle is explicitly `themeId: living-circuit`, `ageId: first-glow`, `simulationVersion: mimir-sim-v3-first-glow`, and `spatialModel: structured-v2`. Persisted object, Spark, route, and asset IDs are stable identifiers; labels and artwork may evolve independently.

Do not edit generated hash directories by hand. Add or change authored Tiled data, templates, or assets, regenerate, validate, and retain existing First Glow bundles referenced by checkpoints.
