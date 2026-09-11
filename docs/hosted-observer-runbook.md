# Hosted observer runbook

The pre-hosting slice is ready for a single-instance Render deployment. `render.yaml` defines one paid Node web service, serves the built Vite client from Fastify, and places the SQLite database and scheduled local copies on the mounted persistent disk.

## Provisioning boundary

Before creating the service, verify the current Render plan and disk pricing. The `starter` plan and 1 GB disk are configuration defaults, not a price claim. Keep the service private or protect owner operations with a long random `OWNER_TOKEN`.

The first hosted service is intentionally one simulation writer. Do not scale it horizontally while SQLite remains the authoritative store. A later multi-process deployment should migrate the persistence boundary to PostgreSQL or another coordinated database.

## Required checks after deploy

1. Open `/health` and verify the service reports `ok: true` and the expected database path under `/var/data`.
2. Open `/` and verify the browser client loads from the same origin.
3. Enter the owner token and verify pause, tick, branch, archive, continue, and reset.
4. Let a short test season advance, restart the service, and verify the latest checkpoint and timeline remain available.
5. Create a backup, copy it outside the service disk, restore it into a fresh test path, and replay the restored timeline before treating the deployment as durable. The manifest must list every bundle referenced by included checkpoints, including archived timelines; corrupting `world.json` must make restore fail before startup.
6. For a structured timeline, verify `/api/world` reports `spatialModel: "structured-v2"`, the expected bundle hash is present in `structuredState`, and a queued `/api/owner/world/object` command returns 202 with an effective next tick. Retry its idempotency key and verify no duplicate command is created.
7. For a First Glow timeline, verify `/api/world` reports `simulationVersion: "mimir-sim-v3-first-glow"`, `themeId: "living-circuit"`, and `ageId: "first-glow"`. Use `/api/owner/reset-v3` with the schema-3 bundle hash; do not relabel or rewrite an older timeline. A clean bundle-inclusive restore must replay the supported First Glow checkpoint and fail before startup when referenced assets are missing or checksum-mismatched.

The scheduled backup in `render.yaml` is a local disk copy only. It is not an independent disaster-recovery backup until a separate storage destination is configured and restoration is tested. Manual and scheduled backups share the same bundle-inclusive implementation and manifest format, but neither should be treated as off-host protection without an external copy.

Authoring and verification commands from a checkout are:

```powershell
npm run world:import -- assets/world/maps/first-glow.tiled.json
npm run world:validate -- assets/world/generated/<sha256>/world.json
npm run build
npm test
npm run test:first-glow-commands --workspace @mimir/server
npm run test:first-glow-restart --workspace @mimir/server
npm run test:backup-restore --workspace @mimir/server
npm run test:first-glow --workspace @mimir/web
npm run backup --workspace @mimir/server -- backup <backup.db>
npm run backup --workspace @mimir/server -- restore <backup.db> <restored.db>
npm run profile:first-glow
```

The current First Glow bundle is `sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e`. Start a new First Glow timeline with an owner-authenticated request such as:

```powershell
$headers = @{ "x-owner-token" = $env:OWNER_TOKEN; "content-type" = "application/json" }
Invoke-RestMethod http://127.0.0.1:$env:PORT/api/owner/reset-v3 -Method Post -Headers $headers -Body '{"bundleHash":"sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e","seed":31,"sparkCount":12}'
```

For local runs, the default database is `data/local/mimir.db` and scheduled backups default to `data/backups/`. When testing a restored database, point `WORLD_BUNDLE_ROOT` at `<restored.db>.bundles`. The server validates each persisted bundle asset before listening and serves only the hash-qualified, manifest-referenced paths.
