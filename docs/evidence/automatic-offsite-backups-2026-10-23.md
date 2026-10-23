# Automatic independent backups — 2026-10-23

[MIM-S017](../../issues/MIM-S017.md) enables the existing independent backup destination without restarting, advancing, or replacing the hosted simulation. The world remains archived and paused at pulse 64, in rules-only mode. The older backend's own uploader remains disabled; the separate systemd backup worker is the active path.

## Verified configuration

- The private VM has an attached keyless compute identity with cloud-platform scope. A narrow Token Creator binding on the existing backup writer lets it impersonate that writer only; no key or operator login was installed.
- The independent bucket remains in the separate backup project. It has versioning, uniform access, seven-day soft delete, and 395-day lifecycle deletion for live/noncurrent objects. These are retention controls, not proof of a year of retained daily copies.
- The writer has object Creator and Viewer, with no delete/admin grant. The separate recovery account has Viewer only, and the VM has no grant to impersonate it. Automated IAM assertions found no public bucket bindings.
- The daily timer runs at 06:30 UTC with up to ten minutes of jitter and persistent catch-up. An hourly timer runs the status command, which exits nonzero on stale, failed, interrupted, or corrupt status. Both units passed systemd validation and enabled/active checks. This exposes failures locally through systemd; no external alert channel was added.

## Automated backup and recovery

The worker took a consistent snapshot using the repaired `VACUUM INTO` implementation, checked that it was not behind the live writer, verified database integrity and bundle inclusion, and uploaded an archive plus its recovery receipt. Remote size and MD5 matched for both uploads before durable success was saved. Source and deployed worker fingerprints were compared. The simulation process stayed unchanged, and no schema/engine/backend upgrade was performed.

Outside the VM, the separate read-only recovery identity downloaded the independent receipt and its exact archive. The automated recovery command verified archive SHA-256 and size, safely extracted into a new directory, and ran the standard restore CLI. The restored data matched the receipt:

| Record | Verified result |
| --- | --- |
| Timeline | `main`, archived |
| Latest pulse | 64 |
| Checkpoints | 65 |
| Events | 710 |
| Interpretations | 127 |
| Referenced world bundle files | 8, all manifest checks passed |
| Database integrity | `ok` |

Per-table content hashes, archive identity, retention settings, and safe deployment fingerprints are in the [machine-readable evidence](automatic-offsite-backups-2026-10-23.json). Bucket/account names, private receipt URIs, database contents, credentials, and recovery artifacts remain outside Git.

## Regression coverage and limits

The local replication suite covers size/hash mismatch and missing checksum, writer impersonation, upload failure, receipt-upload failure, persisted/reloaded status, stale/future/malformed timestamps, interrupted attempts, snapshots behind the writer, and missing referenced bundles. Recovery tests exercise a real archive/restore, refuse existing destinations, detect corrupt archive hashes and changed history, and reject traversal, absolute paths, and links. These checks are included in `npm run verify:local` through the server replication script.

This is recovery verification, not a live disaster cutover or a human engagement review. No live state was replaced. Timers are configured and an initial execution was verified; future daily runs still need the normal operational status check. See the [runbook](../hosted-observer-runbook.md#automatic-independent-backups--2026-10-23) for installation, health, recovery, and rollback.

## Local verification result

`npm run verify:local` passed all 69 command steps, including desktop/mobile, connected histories, server persistence, and backup/recovery regressions. The summary is retained under `.tmp/verification/2026-10-23T15-10-20-181Z/summary.json`. After that full-suite snapshot, the recovery receipt parser was hardened to reject stale/invalid timestamps and Windows wrapper metacharacters in object URIs; the focused automated recovery suite was rerun and passed, and the independently downloaded live receipt passed the new input guard. Local issue closure and this verification record are subsequent documentation-only updates. Run the full local verifier for the exact source again before any PR publication, as required by repository policy.
