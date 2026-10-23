# Hosted bounded history and backup repair — 2026-10-23

## Scope and envelope

User-authorized recovery readiness, a bounded rules-only run, recorded-history publication, and repair of the hosted backup component. Human engagement review and paid provider calls are excluded.

The existing private VM and single authoritative SQLite writer are retained. The run cap was 64 manual pulses within 150 seconds, with immediate stop on request failure, unexpected timeline/pulse, loss of rules-only/zero-budget settings, or loss of recovery confidence. Scheduler pause is enforced after the run. Existing observer limits remain two sessions and 180 seconds; no new infrastructure, IAM changes, or wider audience are part of this work.

## Recovery gate and bounded run

- Service initially healthy and paused at pulse zero, rules-only, social budget zero. Backend fingerprints still matched the documented recovery source; the service was not running current main in full.
- Created a fresh bundle-inclusive backup and restored it into a new isolated destination. Database integrity and all seven original bundle files passed; an off-VM recovery copy was downloaded and hash-verified.
- The restored opening checkpoint advanced from pulse zero to one in memory using the deployed engine, without changing live state or starting another server.
- The authoritative run reached pulse 64 within its time gate, then paused and archived the timeline. The opening checkpoint remained byte-identical. Result: 65 checkpoints, 710 events, and 127 interpretations; provider budget remained zero.

## Backup incident and repair

The first post-run backup was rejected: it contained active pulse 61 while the running service reported archived pulse 64. Read-only inspection found the same main database inode but deleted WAL and SHM files still held open by the writer. The exact cause of those pre-existing unlinked sidecars is not established. Updating the backup algorithm alone could not recover rows visible only through that open journal.

Before any restart, the paused writer's main file and open WAL descriptor were preserved into a new isolated recovery set. Hashes remained stable across the copy. SQLite integrity, all 65 checkpoints, archived status, events, interpretations, and the unchanged opening checkpoint were verified. The current supplied backup/restore CLI then produced a verified bundle-inclusive recovery unit from that set. An off-VM copy was downloaded and verified before service changes.

The current `VACUUM INTO` backup library was installed as the only changed runtime component, with rollback bytes retained. A controlled single-writer restart flushed the latest history successfully; no live database replacement was required. After restart, the service remained archived and paused at pulse 64, no deleted journal handles remained, and a fresh backup plus restore matched every timeline, checkpoint, event, and interpretation row of the preserved recovery unit.

Deployed backup library SHA-256: `dd6952f350b742447b6b1b29801b6c708e1a47941ec7dbfae38372edcd7e8bfd`.

## Verification

- New automated regression holds an old WAL reader open, commits later rows, proves checkpoint progress is pinned, and verifies backup contains the committed rows while excluding a subsequent write and preserving the old reader snapshot.
- Backup/restore suite passed, including bundle corruption rejection and hash-qualified asset serving.
- Public archive export/publication contract tests passed.
- Final hosted service readback: healthy, one Node service, archived pulse 64, scheduler paused, rules-only and zero social budget. Unauthenticated catalog access returned HTTP 403.
- Operator artifacts and recovery data remain ignored under `.tmp/hosted-readiness/` locally and the isolated operator directory on the VM. No credentials are included in the recovery archive or report.

## Publication

Five checkpoints (0, 16, 32, 48, 64) were exported read-only from the verified archived recovery unit. Their chunks total 4,271,284 bytes. The prior protected archive catalog was empty and was preserved for rollback. Staged publication completed successfully; the catalog was committed last. Publication record: `run-2026-10-23T05-08-40-335Z-1ec42c2a`. Downloaded catalog, manifest, and every chunk match the verified export byte-for-byte; all five chunks pass current First Glow validation and cutoff checks.

Authenticated browser automation selected all five checkpoints. Each rendered its verified replay scene with one canvas and no alerts after a fresh reload. An initial catalog decoding error cleared on that reload; no source change was needed and the final downloaded bytes are valid JSON. The archive page was left open at pulse 64. No live stream or VM outage was needed for these archive checks.

[Structured verification](hosted-bounded-history-2026-10-23.json) records the recovery, repaired backup, cloud-byte comparison, and browser results. A local screenshot remains under `.tmp/hosted-readiness/hosted-replay-pulse-64.png`.

## Remaining boundaries

Automatic off-VM backup replication remains disabled; the verified off-VM copies here are deliberate operator recovery copies. The rest of the backend remains on its previously documented source, with only the backup library updated. No general availability, outage replay, token-refresh, independent human engagement, or model-benefit claim follows from this bounded run.

## Follow-up mapping

- [Hosted verification envelope](../../issues/MIM-S006.md): the approved audience/window, rules-only budget, recovery gates, and stop conditions are recorded here.
- [Hosted identity cases](../../issues/MIM-S007.md), [refresh and reconnect](../../issues/MIM-S008.md), and [outage/archive resilience](../../issues/MIM-S009.md) remain separate unverified live cases. Successful normal archive replay does not satisfy outage verification.
- [Hosted backup repair](../../issues/MIM-S016.md): recovery preservation, pinned-WAL regression, component fingerprint, restart, and matching fresh restore are verified above. The regression and documentation accompany this verification record.
