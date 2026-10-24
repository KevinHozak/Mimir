# MIM-S009 follow-up rehearsal — approved revised timing

Status: **approved by the user on 2026-10-23; all gates verified in run 27, including automated cleanup**. This changes the VM-operation budget in the [previously approved plan](hosted-outage-rehearsal-plan.md). [Measured retry evidence](evidence/hosted-outage-retry-2026-10-23.md) records the failed timing gate and successful recovery.

The previous window allowed 30 seconds from stop request to restart, with recovery starting by T+80. The actual graceful stop took approximately 57.4 seconds before Compute Engine permitted a start. The watchdog began recovery before the deadline but could not start a VM still in `STOPPING`. The earlier T+168.4 stream-log comparison mixed cloud and local clocks and does not establish post-cutoff arrival; that attempt still lacked verified in-window UI recovery. Guest service journal checks found no timed-out units; shortening the writer's service timeout is not justified by that evidence.

## Approved limits

- Keep the same VM, pinned bridge image, original rollback revision, Google identity, and access controls. No writer upgrade, force-off, skipped guest shutdown, new IAM grant, provider call, simulation pulse, or archive publication.
- Keep **two observer clients maximum**, **180 seconds total**, and an absolute browser cutoff at **T+165**.
- Require original-client readiness, actual replacement routing, a replacement-process stream, archive catalog readiness, and a fresh independent backup/restore by **T+30**. Abort without VM disruption if those gates are late.
- Request one graceful VM stop immediately after those gates, no later than T+30. Allow up to **80 seconds from stop request to restart request**, replacing the previous 30-second limit.
- Once `TERMINATED` is observed, allow at most ten seconds for two fresh, checksum-verified archive checkpoints. Start immediately after those checks, on failure, or at **T+110**, whichever comes first. An independent watchdog must enforce that restart deadline even if browser/controller execution fails. If Compute Engine still reports `STOPPING`, fail acceptance and continue emergency recovery as soon as a start is possible.
- Restore original bridge traffic independently of VM boot completion. Require a fresh successful live stream, healthy committed data, retained observer state, one writer, and unchanged history by **T+160**. VM `RUNNING` alone is not application recovery.
- Close clients at T+165 and account for each observed stream process by T+180. Report final-zero telemetry and independently corroborated instance retirement separately; never invent a final-zero record for a retired process.

The executable controller and independent watchdog enforce these approved revised phase budgets; targeted deadline and controller-death regression tests pass. A successful follow-up must include cold replay while the VM is actually `TERMINATED`; replay while it is merely `STOPPING` does not satisfy acceptance.

The [80-second retry evidence](evidence/hosted-outage-80s-retry-2026-10-23.md) records both safe aborts, verified rollback and the unresolved stream-lifecycle proof. The revised VM budget has not yet been exercised live.

The [latest repair/retry](evidence/hosted-outage-readiness-fix-2026-10-23.md) exercised the 80-second VM budget successfully (60.477 seconds) and verified cold replay/recovery. Full rollback verification/deletion completed at T+197, and process-disposition/in-window audit gates remain open. This is not an overall rehearsal pass or approval to widen deadlines.

## Verified completion

[Run 27](evidence/hosted-outage-cleanup-2026-10-23.md) passed this approved envelope, including original/candidate/recovered-process final-zero records, cold replay, timed audit and exact rollback/owned-revision removal at T+161.056. Earlier failed attempts above are retained as historical context. This does not widen the approved audience or authorize future unattended faults.
