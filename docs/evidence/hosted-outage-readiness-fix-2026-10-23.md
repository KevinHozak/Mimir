# MIM-S009 stream-readiness repair and bounded replay — 2026-10-23

Result: **replacement readiness, cold archive replay and automatic live recovery passed; the full rehearsal remains incomplete because cleanup exceeded T+180 and one older process lacks final-zero evidence**. These are local, uncommitted operator-tool changes; the hosted observer and pinned bridge image were not upgraded.

## Confirmed causes and repairs

- The first SSE scene can render before `/api/events` finishes. Capturing that empty event list as the baseline made the eventual six-event scene fail equality forever. Readiness now requires the complete pulse-64 list, valid camera zoom, expected Spark/Follow/presentation and no refresh error before capturing the baseline.
- Disabling all HTTP cache during full-document reconnect repeated immutable app startup work. Static startup assets can now use cache; cold archive replay explicitly disables HTTP cache before selecting any checkpoint. Recorded replay responses were uncached.
- Routing configuration alone does not identify the serving process. Reconnect still waits for actual candidate routing proof, then requires a candidate stream-open record. Log requests use two-second timeouts and short polling gaps; transport timeouts mean unverified, while permission errors still abort.
- Explicit child `pagehide` is dispatched before navigation/removal to let the owned stream stop while its document exists. A short offline toggle was tested and rejected because this browser kept the established stream open. Early reconnect before route propagation was also rejected because it could remain on the original revision. Neither experiment remains in final source.
- An asynchronous stop may still initially report RUNNING. That state is no longer mistaken for restart without positive restart evidence. Replay progress persists across short browser calls, avoiding the automation tool timeout. The watchdog starts recovery early (T+108, stop+78, or observed termination+8) to leave request margin inside approved limits; abort, stale controller and completed replay also trigger recovery.

## Clock correction

Three cloud HTTP-Date samples bounded cloud minus local clock between approximately **11.35 and 12.05 seconds**. Browser receipt times and controller/watchdog deadlines use the local clock; raw cloud event timestamps must not be subtracted from the browser lease to classify lateness. In the previous run-16 evidence, the candidate stream response was received at local T+22.179; its raw cloud timestamp minus the local lease produced T+33.534. The earlier claim that this proved an actually late stream is withdrawn. The readiness-proof deadline still failed in that attempt. No system clock or account settings were changed.

## Preparation and automated checks

Exact existing Hosting version `cdf29343210a5da7` and asset names were reverified. Same VM, original rollback revision, pinned image, operator identity and access controls were retained. Fresh independent off-VM backups after recovery restored successfully with all eight bundle files. One warm-up status was unexpected and blocked arming; repeat anonymous probes returned 401 for both world and live endpoints before retry. No credential values/headers were exported, no IAM change or writer upgrade occurred, and no simulation pulse, provider call or archive publication was made.

Passing automated checks: 15 browser-harness/driver tests, 14 controller/watchdog tests, rehearsal stop-threshold checks, HTTP/2 cancellation, stream-counter lifecycle, and the web auth/session/outage suite (including desktop/mobile cold replay). The full root verifier was not rerun for this source and the prior 74-check result is not reused.

## Live attempts

Runs 17–21 and 23 aborted before VM disruption while refining readiness or handling a proof-API timeout. Run 22 passed readiness and stopped the VM, but exposed the RUNNING-after-stop race and lost browser execution to a tool timeout. The watchdog restored traffic and recovered the VM; its restart request was approximately 80.49 seconds after stop, exceeding the 80-second gate. That attempt is a failure. Its browser deadline still closed both children at T+165.025. The transition and short-call fixes were tested before the next VM cycle.

Final run **24**:

| Gate | Local elapsed | Result |
| --- | ---: | --- |
| Actual candidate routing proven | T+13.735 | Passed |
| Candidate stream process proven | T+24.750 | Passed |
| VM stop requested | T+24.972 | Within T+30 |
| VM observed TERMINATED | T+76.481 | Recorded |
| Pulse 64 rendered and checksum-verified | T+80.924 | Fresh terminated reads before/after |
| Pulse 48 rendered and checksum-verified | T+83.896 | Fresh terminated reads before/after |
| Two-checkpoint proof complete | T+84.701 | Within ten-second replay window |
| Independent restart request | T+85.449 | Stop-to-restart **60.477 seconds**, within 80 |
| VM running / original traffic recovery confirmed | T+101.811 | Passed |
| Fresh successful live stream and exact retained UI | T+139.978 | Before T+160 |
| Both observers closed | T+147.793 | Before T+165 |
| Complete original service spec and owned-revision absence verified | **T+197.301** | **Exceeded 180-second total** |

Archive manifest/chunk responses were HTTP 206 from protected Firebase Storage, with disk cache/service-worker flags false. App checksum/schema/bundle checks passed for both scenes. The archive observer made no bridge/backend API request during playback. Spark 6, Follow, explanatory presentation, zoom and all six event identities survived recovery without duplicates. A successful stream request initiated after the watchdog's restart request was required; VM RUNNING alone was insufficient.

## Recovery, rollback and cleanup

Post-run read-only audit verifies archived paused pulse 64, unchanged hashes for timelines/checkpoints/events/interpretations, one writer PID 566, integrity, no orphaned journals, and healthy off-VM backup timers/status. Original full service spec and 100% original traffic are restored; both owned candidate revisions from this task are absent. Zero owned watchdog/controller workers remain. Task-created tabs are closed and the pre-existing empty history pane is restored. Recovery copies are retained privately under ignored runtime storage.

Candidate stream and recovered-original process have zero final counters. The initial original-process stream lacks a final-zero lifecycle event. Later platform metrics show no active original-revision requests and no candidate instances, but do not prove that older process emitted final zero or was accounted for by T+180. Do not treat aggregate metrics as a fabricated per-process close record.

Post-run integrity/writer/history attestations were collected after the bounded window. They verify recovered state, but do not establish that those attestations completed by T+160.

## Remaining work

The functional replay/recovery gate is now proven. Complete full-spec rollback, unused-revision deletion timed world/writer/history attestations and process-disposition collection **inside** the independent bounded controller/watchdog rather than as a slower post-run operator step, then validate that cleanup against the same 180-second limit. Keep MIM-S009 open for that gate. No further live cycle was run after final cleanup.
