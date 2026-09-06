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
5. Create a backup, copy it outside the service disk, restore it into a fresh test path, and replay the restored timeline before treating the deployment as durable.

The scheduled backup in `render.yaml` is a local disk copy only. It is not an independent disaster-recovery backup until a separate storage destination is configured and restoration is tested.
