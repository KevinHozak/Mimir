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

The scheduled backup in `render.yaml` is a local disk copy only. It is not an independent disaster-recovery backup until a separate storage destination is configured and restoration is tested. Manual and scheduled backups share the same bundle-inclusive implementation and manifest format, but neither should be treated as off-host protection without an external copy.

Authoring and release commands from a checkout are:

```powershell
npm run world:import -- assets/world/first-winter.tiled.json
npm run world:validate -- assets/world/generated/<sha256>/world.json
npm run build
npm test
npm run test:integration --workspace @mimir/server
npm run test:e2e --workspace @mimir/web
npm run backup --workspace @mimir/server -- backup <backup.db>
npm run backup --workspace @mimir/server -- restore <backup.db> <restored.db>
node scripts/profile-world.mjs
```
