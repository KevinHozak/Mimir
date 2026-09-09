# First Glow art production workflow

This is the executable handoff for Mimir art work. The selected direction is the Living Circuit: near-black open space, local blue-and-silver circuit structures, bright cyan charge, and non-human luminous Sparks. Art may decorate an authored world, but it cannot invent geometry or simulation outcomes.

## One command path

Run from the repository root in Windows PowerShell:

```powershell
npm run art:check
npm run art:inventory
npm run world:import -- assets/world/maps/first-glow.tiled.json
$bundle = Get-ChildItem assets/world/generated -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 1
npm run world:validate -- (Join-Path $bundle.FullName 'world.json')
npm run art:review -- --bundle (Join-Path $bundle.FullName 'world.json')
```

The checker is content-agnostic and validates all retained generated bundles. It reports missing source files, non-positive SVG dimensions, unsafe paths, missing provenance, invalid license or attribution, incomplete external-source records, active Tiled references without metadata, orphaned active metadata, missing bundle assets, digest mismatches, and broken bundle provenance. The importer remains responsible for canonical hashing and immutable output. A collision or modified hash directory fails rather than overwriting it.

`npm run art:inventory` creates `.tmp/art-review/asset-inventory.json` and `contact-sheet.svg`. `npm run art:review -- --bundle ...` starts an isolated real observer and creates `desktop.png`, `mobile.png`, `desktop-reduced-motion-glow-disabled.png`, `mobile-reduced-motion-glow-disabled.png`, and `review-context.json` under `.tmp/art-review/`. The context records the bundle hash, simulation/theme identity, commit, viewport, device scale factor, zoom, reduced-motion setting, glow setting, and capture date. These are review artifacts only; do not copy them into `assets/world/generated/`.

## Source convention

| Location | Meaning | Retention |
| --- | --- | --- |
| `assets/world/assets/` | Editable SVG/vector or raster original | Authored and reviewed |
| `assets/world/art-production/assets.json` | Stable asset id, path, role, status, format, and provenance link | Authored |
| `assets/world/maps/` and `templates/` | Tiled source and geometry/interaction declarations | Authored source of truth |
| `assets/world/generated/sha256-*` | Imported bundle, normalized world, manifest, copied asset bytes | Immutable historical runtime evidence |
| `.tmp/art-review/` | Contact sheets, inventories, and visual review captures | Disposable |

For a new active asset, record provenance and license first, add metadata, wire it through a Tiled template only if the world data supports its geometry, then run the full path. Do not use copied game art or unrecorded generated imagery. Future-age content may use this workflow, but must not be added to First Glow without an explicit design decision.

## Review checklist

- Source metadata and provenance pass `npm run art:check`.
- Tiled/import/validate pass without editing a hash directory.
- Contact sheet and inventory show the intended source assets.
- Desktop and mobile frames from the running observer are inspected for clear silhouettes, readable labels, restrained glow, and no implied route, collision, entrance, or interaction slot. Inspect the reduced-motion/glow-disabled captures as an explicit accessibility and fallback pass.
- Historical bundles remain present and re-check clean; backup/restore continues to use the bundle-inclusive server tooling.

Ask for design input before changing palette, Spark signatures, world object semantics, interaction geometry, or the provenance/license of an active asset. Mechanical checks and review artifacts do not require new lore or speculative future-world art.
