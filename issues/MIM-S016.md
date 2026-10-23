---
depends_on: []
id: "MIM-S016"
parent: []
priority: "high"
schema_version: 1
status: "closed"
title: "Repair hosted backup snapshots and verify the latest committed WAL state"
type: "bug"
---
## Outcome

The hosted writer reached archived pulse 64 while external backup connections saw active pulse 61. Inspection found the writer holding deleted WAL/SHM files. Preserve the journal and current history before any restart; install the current consistent-snapshot backup component and verify fresh recovery against live state.

## Scope

packages/server/src/backup-lib.ts; backup snapshot regression; isolated hosted operator recovery. No AI/provider use, human engagement review, wider audience, or automatic replication/IAM change.

## Acceptance

- [x] Preserve and restore all 65 checkpoints through pulse 64, archived status, events, interpretations, and immutable opening checkpoint; retain a verified off-VM recovery copy.
- [x] Add a regression with a pinned WAL reader proving backup includes later committed rows without disturbing the reader or admitting later writes.
- [x] Install and fingerprint the current backup component on the private VM with a single writer and controlled restart; preserve rollback bytes.
- [x] Verify restarted live state and a fresh backup/restore both retain archived pulse 64 and matching history hashes.

## Initial evidence

Ignored operator records under `.tmp/hosted-readiness/` retain the original failed snapshot, rescued journal, recovery copies, and run envelope. The old snapshot is rejected for publication. The exact cause of the pre-existing unlinked sidecars has not been established.

## Completion evidence — 2026-10-23

[Bounded run, recovery, backup repair, and verification](../docs/evidence/hosted-bounded-history-2026-10-23.md). The world remains archived and paused at pulse 64. Human engagement review and wider hosting verification remain outside this completion. Regression and verification evidence accompany this issue.
