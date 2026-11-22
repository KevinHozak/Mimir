# Final-backup shutdown coordination — local qualification, 2026-11-15

Local qualification based on merged `6ceaf2f`, completed before source publication. The qualification performed no deployment, cloud operation, paid call or pilot restart. The original budgets and deadline are unchanged. This evidence does not establish Linux systemd scheduling or live cloud shutdown behavior.

## Failure and repair

The recovered pilot journal showed a clean writer stop at pulse 293, followed by a final backup interrupted during shutdown. Its service allowed 180 seconds, but the shutdown caller waited only 70 seconds. Endpoint deletion retries delayed the backup queue, and a regular backup timer later attempted a live-health check against the stopped writer.

The cutoff service is now the sole backup/shutdown coordinator. Ordinary watchdog stops queue it; early network cleanup queues it before endpoint deletion can fail. It stops regular backup/health timers and services, stops the writer, waits up to 185 seconds for the 180-second final-backup service, closes observer ingress and requests shutdown. The enclosing cutoff service allows 300 seconds. Backup failure or deadline truncation is recorded explicitly, and shutdown still proceeds. The remaining original lease bounds the wait and reserves 45 seconds for ingress closure and poweroff; the independent hard-stop unit remains unchanged.

## Verification

- Server TypeScript build passed
- All 11 focused shutdown/watchdog/private-endpoint/CLI-entrypoint regression tests passed
- Integrated `npm run test:online-run --workspace @mimir/server` passed, including existing lease, restart and accounting checks
- Focused failures cover unsuccessful regular-job quiescence, unsuccessful writer stop, failed final backup, near/expired lease and endpoint-independent coordinator admission
- A 101-second virtual backup completion succeeds before mocked shutdown, covering the former 70-second failure
- Unit contracts verify the 180-second backup service, 185-second caller allowance, 300-second enclosing service and unchanged independent hard-stop command

The explicit recovered-data rehearsal copied the actual final world and ledger into a new disposable directory. It used the real paired snapshot, bundle validation, archive, MD5 verification, recovery-receipt upload and restore code. Object storage was replaced by local files; service commands and the clock were injected; network fetches were forbidden. Restoration used the generated archive copied into the local fake object store, rather than the original database or snapshot.

Restored results:

| Check | Result |
| --- | --- |
| Final pulse | 293 |
| Sparks | 12 |
| Complete checkpoints | 294 |
| Bundle files | 8 |
| AI attempt rows | 41, all unchanged |
| Uncertain request IDs | 11 and 12 retained |
| Original AI cap | USD 5 retained |
| Full restored history | All database table evidence matches the completed receipt |
| Final checkpoint | Serialized state matches exactly and passes current normalization/validation |
| Recovered source files | SHA-256 hashes unchanged |
| Writer exclusion | Snapshot rejected while a writer lock was held |
| Cloud/provider calls, simulation advances, real shutdown commands | 0 |

The full local backup/archive/restore qualification took 84,835 ms on the desktop; the simulated service completion used 101,000 ms. Neither measurement establishes backup performance on the former micro VM. The generated archive was 45,555,293 bytes, SHA-256 `731db5f3f9718ab6762d3257ffe021329bfa3e6bdb52ebf0ff85be89e3da12f9`.

The first fixture attempt reached restoration but its verifier compared SQLite row object prototypes with JSON receipt objects. The verifier was corrected to compare their serialized data, and the final run independently restored the archive. An initial junction check was blocked by Windows sandbox permissions; the same local-only checks passed with the required process/junction access. These were qualification-environment/verifier failures, not passing application assertions.

Private input paths and recovered payloads stay outside Git. The full local result was preserved under `data/local/worktree-preservation-20261121/s021-polling/.tmp/shutdown-recovered-p293-archive/result.json`; the [public summary](final-backup-shutdown-local-2026-11-15.json) contains the verification bounds. A [November 21 isolated restore](pulse-293-preserved-archive-restore-2026-11-21.md) independently checked the preserved archive. Reproduce the original qualification with the explicit command in the [runbook](../hosted-observer-runbook.md#coordinated-final-backup-shutdown--2026-11-15-local-implementation).
