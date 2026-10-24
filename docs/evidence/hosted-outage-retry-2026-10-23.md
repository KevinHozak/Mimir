# MIM-S009 hosted retry — 2026-10-23

**Result: readiness passed; live acceptance failed the VM-operation and cold-replay timing gates.** The VM was recovered, original bridge configuration/traffic restored, and temporary resources removed. MIM-S009 remains open.

The measured window began at `2026-10-24T00:50:17.361000+00:00` (2026-10-23 in America/Chicago). Hosting remained version `cdf29343210a5da7`, source `6e66395`; the replacement used the original pinned image and configuration. No writer upgrade, IAM/allowlist change, auth-state export, credential-fixture provisioning, provider call, simulation pulse, or archive publication was performed. The operational tooling remains local and uncommitted; the deployed runtime source was unchanged.

## Readiness repairs and proof

- Separate authenticated watchdog/controller preparation from the measurement clock. Activate their immutable, atomically written lease only after the original browser is ready. A fresh independent watchdog heartbeat is required before VM stop.
- Keep the absolute client deadline in a same-origin diagnostic parent, outside the navigated observer frames. A hosted dry run verified that it survives child navigation and closes clients automatically. The wrapper and both children were temporary; no hosted HTML or auth state was exported or changed.
- Keep each run's clock, directory and network cursor in an explicit driver context. Complete normal Browser Use document observations before raw diagnostics, including documents that start loading asynchronously.
- Verify data-plane routing with a bounded anonymous 401 probe and projected request-log revision labels before reconnecting. A traffic-setting response alone was insufficient: earlier reconnects still reached the original revision. Then require actual replacement-process stream telemetry and retained Spark 6, Follow mode, explanatory presentation, zoom and six unique event IDs.
- Preserve strict auth and required-data status checks. The older backend returns a fixed authenticated 404 for optional `/api/reflection`; its public rejection remains 401. The UI already skips that optional projection. This capability gap is recorded, not presented as a backend upgrade.
- Fresh independent off-VM backup/receipt/restore, source/assets, recovery IAM, one writer, paused pulse 64, unchanged history and healthy backup timers were revalidated before the final attempt. Eleven browser-harness and eleven controller/watchdog regression tests passed. Full local verification is recorded separately for the final source.

After the recorded run, the controller was repaired to recognize Compute Engine `PROVISIONING`/`STAGING` transitions. Cold-replay proof was also tightened to require a VM request initiated after checkpoint rendering, rather than reusing a pre-render sample. These branches are locally regression-tested; no additional live VM cycle was performed.

Earlier attempts were fail-closed preparation/arming attempts, with no VM stop. Their redacted outcomes accompany the [structured record](hosted-outage-retry-2026-10-23.json).

## Measured final attempt

| Event | Seconds from browser clock |
| --- | ---: |
| Actual replacement route verified | 11.419 |
| Replacement-process stream verified | 23.973 |
| Graceful VM stop requested | 50.339 |
| Cold replay deadline missed; controller abort | 79.114 |
| Watchdog start request, once VM was `TERMINATED` | 107.732 |
| VM `RUNNING` | 120.987 |
| Control-plane recovery confirmed | 121.044 |
| Automatic browser cutoff | 165.023 |
| Last observed upstream stream closed to zero | 176.394 |

The stop-to-start interval was **57.393 seconds**, exceeding the approved 30 seconds and T+80 restart deadline. The watchdog was active earlier, restored original traffic, and kept retrying safe recovery while Compute Engine reported `STOPPING`; it could not start the VM until that transition completed. Neither a force-off nor skipped guest shutdown was used.

The archive viewer was ready but did not fetch or render checkpoints while the VM was `TERMINATED` before its deadline. The first successful post-recovery upstream stream opened at T+168.376, after the T+165 browser cutoff, and closed at T+176.394. This is not proof that the original visible UI completed automatic recovery within its deadline. VM `RUNNING` and restored routing are distinct from application recovery.

## Recovery, rollback and cleanup

- Read-only post-recovery audits verified identical hashes of timelines, checkpoints, events and interpretations; archived/paused pulse 64; exactly one new writer process; SQLite integrity `ok`; no orphaned journals; and healthy independent-backup status/timers. The fresh off-VM recovery copy remains preserved.
- The complete original service specification and 100% original traffic were compared with the saved snapshot. All four owned temporary revisions were independently confirmed absent. The original revision/image, archives, IAM, allowlist and runtime source were preserved.
- Both observer frames closed automatically at T+165.023. Owned browser tabs and recovery workers were independently confirmed closed/exited. A sandbox-blocked process inventory was rejected as unverified and repeated successfully outside that restriction.
- The replacement process logged final zero at T+93.150, and the later original process at T+176.394. The earlier original process lacked a final-zero log. Aggregate Monitoring showed zero active and idle original-revision instances at T+102.639, supporting retirement. The metric describes the number of existing instances by state. Aggregate retirement evidence and per-process final-zero telemetry are reported separately; strict final-zero logging for every process remains unproven.
- Read-only previous-boot journal inspection found no timed-out units. The longest observed service stop was about eight seconds; the writer's configured timeout remained 90 seconds. This does not establish that the writer timeout caused the approximately 57-second Compute Engine transition.

## Remaining approval gate

The [revised timing proposal](../hosted-outage-follow-up-proposal.md) keeps two clients and the 180-second outer limit but requests a larger graceful VM-operation budget and an earlier stop after readiness. It is **not approved or executed**. The current executable retains the earlier approved limits. Cold replay during a confirmed terminated interval and timely retained-UI recovery remain unaccepted.

## Later clock-calibration correction

The [readiness repair evidence](hosted-outage-readiness-fix-2026-10-23.md) establishes an approximately 11–12-second cloud/local offset. Stream lifecycle times in this report derived by subtracting the local lease from cloud log timestamps are uncalibrated and cannot prove that a stream opened after the local client cutoff. Original UI recovery remains unverified for this attempt; controller/watchdog VM-operation durations are measured on the local clock and remain valid.
