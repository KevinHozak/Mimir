# Mimir: A Light of Our Own

Mimir is an observer simulation of the Living Circuit during the First Glow. Watch luminous Sparks explore charge pools, shelter niches, traces, relays, and one another while the server commits deterministic history.

The active runtime is a schema-3 world bundle with `themeId: living-circuit`, `ageId: first-glow`, `simulationVersion: mimir-sim-v3-first-glow`, and `spatialModel: structured-v2`.

The village prototype is historical and no longer supported. First Glow is the only active runtime; old village saves are rejected rather than relabeled or migrated.

See the [current roadmap](docs/roadmap.md), [functional changelog](docs/changelog.md), [project history](docs/history.md), [World theme](docs/world-theme.md), [Current architecture](docs/architecture.md), and the [GitHub development workflow](docs/github-workflow.md).

## Run locally

```powershell
npm ci
npm run build
npm start
```

Open the URL printed by the launcher. The local API listens on `127.0.0.1:8888` by default, and the browser preview is served at `127.0.0.1:4173`. The server owns simulation outcomes, SQLite stores committed history, and the browser renders the current or replayed First Glow state. Override the API port with `PORT` when needed.

The writer binds to loopback by default and may run without `OWNER_TOKEN` for local development. Set `HOST` to a non-loopback address, set `SERVE_WEB=true`, or use `npm run start:hosted` only with an `OWNER_TOKEN`; those configurations fail closed without one. Cross-origin requests are denied unless the exact `OBSERVER_ORIGIN` is configured.

## Local data

Mutable local runtime data lives under `data/` and is ignored by Git:

- `data/local/` — the default SQLite database and future local settings/game-state files.
- `data/backups/` — local backup databases, manifests, and bundle sidecars.
- `.tmp/` — disposable test and profiling artifacts.

Authored maps, templates, fixtures, immutable generated bundles, and provenance remain under `assets/`.
