# Mimir: A Light of Our Own

Mimir is an observer simulation of the Living Circuit during the First Glow. Watch luminous Sparks explore charge pools, shelter niches, traces, relays, and one another while the server commits deterministic history.

The active runtime is a schema-3 world bundle with `themeId: living-circuit`, `ageId: first-glow`, `simulationVersion: mimir-sim-v3-first-glow`, and `spatialModel: structured-v2`.

## Run locally

```powershell
npm ci
npm run build
npm start
```

Open the URL printed by the launcher. The server owns simulation outcomes, SQLite stores committed history, and the browser renders the current or replayed First Glow state.
