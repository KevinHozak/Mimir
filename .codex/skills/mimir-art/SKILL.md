---
name: mimir-art
description: Route Mimir world art from editable, provenance-recorded sources through Tiled import, immutable bundle validation, and desktop/mobile review artifacts.
---

# Mimir art production

Use this skill for First Glow art, world-asset authoring, visual review, or later-age art that must remain compatible with the Living Circuit pipeline.

## Guardrails

- Read `docs/world-theme.md`, `docs/art-production.md`, and the relevant provenance guide before proposing or changing an asset.
- Treat editable files under `assets/world/assets/` and their metadata as source. Never edit a `sha256-*` directory by hand.
- Art must not imply a route, collision, entrance, interaction slot, or resource outcome that is absent from Tiled/world data.
- Do not add copied, unlicensed, or unrecorded generated imagery. If an asset is not repository-authored, stop and request provenance and license details.
- Request design input when a change affects theme, Spark identity, world geometry, interaction semantics, or an active asset's provenance. Proceed independently for mechanical source validation, inventories, and review artifacts.

## Standard path

From the repository root in PowerShell:

```powershell
npm run art:check
npm run art:inventory
npm run world:import -- assets/world/maps/first-glow.tiled.json
npm run world:validate -- assets/world/generated/<sha256>/world.json
npm run art:review -- --bundle assets/world/generated/<sha256>/world.json
```

`art:check` validates source metadata, dimensions, paths, provenance, active references, bundle assets, and orphaned active entries. `art:inventory` writes disposable inventory/contact-sheet files under `.tmp/art-review/`. `art:review` runs the check and import-path validation, then writes responsive desktop/mobile review HTML and SVG frames under the same ignored directory. It does not mutate server state.

For a new asset, add the editable source, one metadata entry in `assets/world/art-production/assets.json`, and a provenance entry in `assets/licenses/first-glow-assets.md`; then run the standard path. Keep historical bundles in place.
