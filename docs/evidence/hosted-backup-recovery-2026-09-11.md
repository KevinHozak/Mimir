# Hosted backup and recovery validation

Date: 2026-09-11

Status: **Pass for hosted independent backup and recovery validation; durable/public readiness remains a later gate.**

## Selected independent destination policy

The configured independent destination is project `mimir-realm-backups` (`172815598347`), billed to the approved billing account `01E836-7FDB98-C1FD83`. The regional Standard bucket is `gs://mimir-realm-backups-uscentral1-172815598347` in `US-CENTRAL1`, with Google-managed encryption at rest, uniform bucket-level access, object versioning, seven-day soft delete, and 395-day lifecycle retention for live and noncurrent objects. A separate `$10/month` budget alert (`3d88a91f-0b28-4997-9a8c-2955e73e1923`) covers the backup project.

The keyless writer identity is `mimir-backup-writer@mimir-realm-backups.iam.gserviceaccount.com`; it has object-create and read/verification access but no object-delete permission. The separate recovery identity is `mimir-backup-recovery@mimir-realm-backups.iam.gserviceaccount.com`; it has object-read access only. No service-account key was created or copied to the VM.

## Procedure and result

The hosted VM produced the backup while its scheduler was paused at First Glow pulse 4. The bundle-inclusive archive was uploaded to:

`gs://mimir-realm-backups-uscentral1-172815598347/daily/2026-09-11/mimir-staging-p5-backup.tar.gz`

The stored archive measured 37,774 bytes. Recovery-identity object read-back reported generation `1789166774423545`, MD5 `JEPmC03DjaLV4eCWB1/Eyw==`, and CRC32C `TA9GsQ==`. The manifest recorded database SHA-256 `a729277e1a348b409bb40ea8e96f6f7a072ff4e2a5a1d5550523c8dd77956d4f`, a 430,080-byte database, and the First Glow bundle `sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e` with all referenced assets.

The application-level regression was also run from the isolated issue worktree:

```powershell
npm ci
npm run build
npm run test:backup-restore --workspace @mimir/server
```

The test created a First Glow source database with two referenced immutable bundle hashes, wrote a bundle-inclusive backup and manifest, restored to a fresh destination, and verified that:

- the manifest preserved both referenced bundles and their files;
- the restored checkpoint retained `mimir-sim-v3-first-glow`, `structured-v2`, `living-circuit`, and `first-glow`;
- the restored server started with the restored bundle root and accepted one subsequent pulse;
- removing a referenced bundle asset caused startup validation to fail before the server became available;
- hash-qualified asset serving rejected an unreferenced asset and path traversal.

The hosted transfer and restore then verified that the recovery identity could download the independent object, restore it into a fresh path, start a validation server with the restored bundle root, and continue the original timeline from pulse 4 to pulse 5. The restored timeline ID remained `timeline-689eb2a0-6926-471a-95ab-30dec9d81c02`, and the restored database reported five checkpoints and 56 events before the continued pulse.

Removing one referenced SVG from the downloaded recovery set caused restore to fail with `backup bundle file missing` and left no restored database behind.

Observed output:

```text
First Glow bundle-inclusive backup/restore passed
First Glow hash-qualified asset serving passed
```

## Recovery procedure for an operator

1. Create a non-overwriting backup with `npm run backup --workspace @mimir/server -- backup <backup.db>` and retain `<backup.db>`, `<backup.db>.manifest.json`, and `<backup.db>.bundles` as one unit.
2. Copy that complete unit to the independent object-storage destination using the writer identity and verify the uploaded object checksums and retention/version state.
3. Download one selected backup into a new isolated recovery directory. Never restore over the live database.
4. Run `npm run backup --workspace @mimir/server -- restore <backup.db> <restored.db>` with the restored bundle root at `<restored.db>.bundles`.
5. Start a validation server with `DATABASE_PATH=<restored.db>` and `WORLD_BUNDLE_ROOT=<restored.db>.bundles`, verify `/health`, inspect `/api/world`, and replay/advance the restored timeline.
6. Record the backup timestamp, manifest hash, bundle hashes, restored checkpoint/pulse, replay result, and any rejected integrity test.

## Remaining limitations

- The service does not yet perform an automatic cloud upload; this phase validates the independent destination and operator transfer procedure using keyless writer impersonation. Scheduled upload wiring remains separate operational work.
- No post-provisioning invoice or billing export was available during the same-day validation. Measured usage was one 37,774-byte upload and one 37,774-byte recovery download, within the documented free-tier storage/transfer envelope; exact billed cost remains pending the billing cycle.
- The bucket is independently configured and recovery-tested, but the service is still a single private SQLite writer. This evidence does not make the deployment durable/public-ready or horizontally scalable.
