# Hosted backup replication contract evidence

Date: 2026-09-11

Status: **Pass for the automated replication contract and isolated recovery regression; live VM rollout remains a separate deployment action.**

Hosted-P8 adds an optional scheduled path controlled by `BACKUP_GCS_URI`, `BACKUP_INTERVAL_MS`, and `BACKUP_FRESHNESS_MAX_AGE_MS`. Each scheduled local bundle-inclusive backup is archived as one temporary object containing the SQLite database, its manifest, and every referenced immutable bundle directory. The service uploads through `gcloud storage` using the attached VM identity, verifies remote object size and MD5 metadata, removes the temporary archive, and exposes the result through `/api/backup/status` and `/health`.

The automated path does not create or accept service-account keys. The runtime writer is expected to have object-create, object-read, and metadata-read access only. The separate recovery identity remains responsible for downloads and restores; object deletion and bucket administration remain outside the runtime identity.

## Verification

```text
npm run test:backup-replication --workspace @mimir/server
Backup replication contract passed

npm run test:backup-restore --workspace @mimir/server
First Glow bundle-inclusive backup/restore passed
First Glow hash-qualified asset serving passed
```

The replication contract test uses the real archive tool and verifies that the generated artifact contains the database, manifest, and bundle directory. It also verifies remote metadata comparison and cleanup after a simulated upload failure. The existing isolated restore suite verifies bundle-inclusive recovery, continued First Glow pulseing, missing-asset failure before startup, and hash-qualified asset serving.

The first backup/restore attempt in the restricted Windows sandbox stopped before application assertions because child-process creation returned `spawn EPERM`; the same unchanged suite passed when rerun with the required elevated execution.

## Operator response

Inspect `/api/backup/status` or the `backupReplication` object in `/health`. A `stale` or failed state requires checking the service log, attached VM identity, bucket URI, and least-privilege permissions. Preserve the local backup unit, correct the cause, and then use the separate recovery identity to download one object into a fresh isolated path and run the documented restore plus continued First Glow pulse. A local copy alone is never independent recovery evidence.
