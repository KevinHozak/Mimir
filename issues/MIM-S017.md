---
depends_on: ["MIM-S016"]
id: "MIM-S017"
parent: []
priority: "high"
schema_version: 1
status: "closed"
title: "Enable automatic off-VM backups with verified recovery"
type: "enhancement"
---
## Outcome

Make the existing private hosted world's backups replicate automatically to the independently administered recovery destination, with clear stale/failure status and an automated fresh-restore check. The last verified operation had replication disabled despite a repaired snapshot library.

## Scope

Existing backup destination and keyless identities; scheduled replication and private operator status; isolated automated download/restore verification. Preserve the paused archived world, private VM access, one authoritative writer, backup manifests/bundles, and zero paid-provider calls.

## Acceptance

- [x] Verify the existing independent destination, retention controls, attached writer identity, and separate recovery identity using allowlisted metadata and bounded access checks.
- [x] Enable scheduled replication with an initial verified upload, persistent/recoverable freshness and failure reporting, and automated success/failure/stale checks.
- [x] Automatically download a fresh replicated object with the recovery identity, verify its hashes, restore to a new isolated destination, and compare the latest timeline/pulse, history, and all referenced world assets.

## Operational boundaries

Do not create keys, expose the private VM, replace live state, enable paid AI, delete existing recovery objects, or silently broaden access. Reuse the current daily backup cadence unless evidence requires a change. Resolve any necessary permission changes against the actual existing identity and destination rather than granting broad roles.

## Evidence

[Prior recovery and snapshot repair](../docs/evidence/hosted-bounded-history-2026-10-23.md). Current source and actual cloud configuration must be rechecked before activation.

## Delivery - 2026-10-23

Implemented with a dedicated daily systemd backup worker and hourly status checks, preserving the older simulation backend and its paused archived pulse-64 world without restart. Status survives worker runs and flags stale, interrupted, or failed attempts. The attached keyless identity has only scoped writer impersonation; the separate recovery identity remains read-only.

An independently uploaded receipt and archive were downloaded outside the VM and automatically restored into a new isolated directory. Checks covered integrity, all 65 checkpoints, 710 events, 127 interpretations, and all eight world bundle files. Regression coverage includes upload/receipt failures, checksum mismatch, stale and malformed timestamps, missing bundles, snapshots behind the live writer, corrupted archives, unsafe paths, existing output refusal, and restored-history comparison.

[Operational evidence and verification boundaries](../docs/evidence/automatic-offsite-backups-2026-10-23.md). The backend's existing in-process replication endpoints remain separate from the new worker; use the dedicated private systemd status path documented in the runbook.
