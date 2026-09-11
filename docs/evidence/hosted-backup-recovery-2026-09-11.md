# Hosted backup and recovery validation

Date: 2026-09-11

Status: **Pass for local bundle-inclusive recovery; hosted durability remains pending external storage configuration.**

## Selected independent destination policy

The intended independent destination is an encrypted, versioned object-storage bucket in a separate account or project from the hosted service. Retention is at least 30 daily copies and 12 monthly copies. The deployment backup identity may write new objects but cannot delete versions; a separate operator recovery identity may read and restore; both use MFA or workload identity, and version deletion requires a separate administrator role.

No bucket, credential, purchase, or deployment change was made by this validation. The disposable staging directory used by the test is not independent disaster-recovery storage; it validates the transfer and restore procedure before external storage is authorized and configured.

## Procedure and result

From the isolated issue worktree:

```powershell
npm ci
npm run build
npm run test:backup-restore --workspace @mimir/server
```

The test created a First Glow source database with two referenced immutable bundle hashes, wrote a bundle-inclusive backup and manifest, restored to a fresh destination, and verified that:

- the manifest preserved both referenced bundles and their files;
- the restored checkpoint retained `mimir-sim-v3-first-glow`, `structured-v2`, `living-circuit`, and `first-glow`;
- the restored server started with the restored bundle root and accepted one subsequent tick;
- removing a referenced bundle asset caused startup validation to fail before the server became available;
- hash-qualified asset serving rejected an unreferenced asset and path traversal.

Observed output:

```text
First Glow bundle-inclusive backup/restore passed
First Glow hash-qualified asset serving passed
```

## Recovery procedure for an operator

1. Create a non-overwriting backup with `npm run backup --workspace @mimir/server -- backup <backup.db>` and retain `<backup.db>`, `<backup.db>.manifest.json`, and `<backup.db>.bundles` as one unit.
2. Copy that complete unit to the independent object-storage destination and verify the uploaded object checksums and retention/version state.
3. Download one selected backup into a new isolated recovery directory. Never restore over the live database.
4. Run `npm run backup --workspace @mimir/server -- restore <backup.db> <restored.db>` with the restored bundle root at `<restored.db>.bundles`.
5. Start a validation server with `DATABASE_PATH=<restored.db>` and `WORLD_BUNDLE_ROOT=<restored.db>.bundles`, verify `/health`, inspect `/api/world`, and replay/advance the restored timeline.
6. Record the backup timestamp, manifest hash, bundle hashes, restored checkpoint/tick, replay result, and any rejected integrity test.

## Remaining limitations

- The external object-storage provider, bucket, credentials, scheduled upload, alerting, and restore drill from that external copy are not configured.
- The local test proves application-level bundle-inclusive recovery, not provider durability, network transfer integrity, access-control enforcement, or recovery-time objectives.
- The runbook must be updated with provider-specific bucket identifiers and a dated external restore result after that separately authorized work.
