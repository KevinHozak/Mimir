# Hosted observer runbook

The pre-hosting slice is ready for a single-instance Render deployment. `render.yaml` defines one paid Node web service, serves the built Vite client from Fastify, and places the SQLite database and scheduled local copies on the mounted persistent disk.

## Google Cloud pre-provisioning snapshot

Last verified: 2026-09-11.

- Google account: `khozak@gmail.com`
- Dedicated project: **Mimir** (`mimir-realm`, project number `487827684488`)
- Region under consideration: `us-central1`
- Billing: enabled on the verified Mimir billing account
- Enabled services: `compute.googleapis.com`, `storage.googleapis.com`, and `billingbudgets.googleapis.com`
- Monthly budget alert: `$10 USD`, scoped to `mimir-realm`, with current-spend thresholds at 50%, 75%, 90%, and 100%
- Budget resource ID: `6b5b23a7-494e-4ef6-9a1e-e09eec716a5f`
- `us-central1` quota was empty during audit: 0 instances, 0 E2 CPUs, and 0 external addresses in use
- No VM, persistent disk, public IP, or Cloud Storage bucket has been created yet

This budget is an alert, not a hard spending cap. The existing Codex Realm project remains separate from Mimir hosting. Local Application Default Credentials still use a different quota project; align that before application-level cloud calls if needed.

The planned low-cost shape is one small Compute Engine VM running the existing single-writer Node/SQLite service, a persistent disk for runtime state, and a separately isolated Cloud Storage backup destination. Runtime provisioning, external backup storage, and deployment still require explicit authorization.

## Provisioning boundary

Before creating the service, verify the current Render plan and disk pricing. The `starter` plan and 1 GB disk are configuration defaults, not a price claim. Keep the service private or protect owner operations with a long random `OWNER_TOKEN`.

The first hosted service is intentionally one simulation writer. Do not scale it horizontally while SQLite remains the authoritative store. A later multi-process deployment should migrate the persistence boundary to PostgreSQL or another coordinated database.

## Required checks after deploy

1. Open `/health` and verify the service reports `ok: true` and the expected database path under `/var/data`.
2. Open `/` and verify the browser client loads from the same origin.
3. Enter the owner token and verify pause, tick, branch, archive, continue, and reset.
4. Let a short test season advance, restart the service, and verify the latest checkpoint and timeline remain available.
5. Create a backup, copy it to the selected independent destination, restore it into a fresh isolated path, and replay the restored timeline before treating the deployment as durable. The manifest must list every bundle referenced by included checkpoints, including archived timelines; corrupting `world.json` must make restore fail before startup. The selected destination is an encrypted, versioned object-storage bucket in a separate account or project from the hosted service, with lifecycle retention of at least 30 daily copies and 12 monthly copies. Access is limited to the deployment backup identity for writes and a separate operator recovery identity for reads/restores; both identities require MFA or workload identity, and bucket deletion/version-purge requires a separate administrator role. Do not describe the service disk or a same-host directory as independent protection.
6. For a structured timeline, verify `/api/world` reports `spatialModel: "structured-v2"`, the expected bundle hash is present in `structuredState`, and a queued `/api/owner/world/object` command returns 202 with an effective next tick. Retry its idempotency key and verify no duplicate command is created.
7. For a First Glow timeline, verify `/api/world` reports `simulationVersion: "mimir-sim-v3-first-glow"`, `themeId: "living-circuit"`, and `ageId: "first-glow"`. Use `/api/owner/reset-v3` with the schema-3 bundle hash; do not relabel or rewrite an older timeline. A clean bundle-inclusive restore must replay the supported First Glow checkpoint and fail before startup when referenced assets are missing or checksum-mismatched.

The scheduled backup in `render.yaml` is a local disk copy only. It is not an independent disaster-recovery backup until the selected object-storage destination is configured and restoration is tested from that copy. Manual and scheduled backups share the same bundle-inclusive implementation and manifest format, but neither should be treated as off-host protection without an external copy. Storage-provider selection, credentials, bucket creation, and deployment wiring remain separate authorized work.

## Independent-backup validation evidence

The dated local validation record is [hosted-backup-recovery-2026-09-11.md](evidence/hosted-backup-recovery-2026-09-11.md). It verifies the bundle-inclusive manifest, fresh restore, latest First Glow checkpoint recovery, one continued tick from the restored database, and pre-startup failure when a referenced asset is missing. The test uses an isolated disposable staging directory as a stand-in for the transfer boundary; it does not claim that an external object-storage copy is configured or that the hosted service is durable.

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
