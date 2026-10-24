# MIM-S009 automated rollback and final-zero acceptance — 2026-10-23

Result: **the full bounded rehearsal passed in run 27**, including cold archive replay, retained live recovery, timed state/writer/backup attestation, exact service rollback, per-process final-zero records and automatic owned-revision deletion. The final cleanup completed at **T+161.056**, within the approved 180-second limit. Operator implementation remains local and uncommitted; hosting assets and the pinned bridge image did not change.

## Repairs

- Stop the initial original stream while its document remains alive, then make an unauthenticated request that must return 401 before moving traffic. This lets the serving process finish cancellation while it is still scheduled. Readiness now requires that original process's real zero counters in addition to the actual candidate route and candidate stream. No counter reset, synthetic zero, or instance-retirement substitution is used.
- Restore the **complete** saved service spec as part of independent recovery. Preserve the real saved template revision, which differs from the serving traffic revision, while validating the project, original traffic and immutable image. Deletion refuses the original/protected revision and requires verified rollback first.
- Launch a bounded read-only recovery audit when restart is requested, overlapping SSH startup with VM boot. It retries SSH/health readiness within its absolute window and verifies SQLite integrity, exact timeline/checkpoint/event/interpretation hashes, one writer, no orphaned journals, paused pulse 64 and backup health. No remote write or owner command is added.
- Keep the independent worker alive after controller exit. Once clients close, wake the original process with another denied request and collect all observed live-request/stream processes, including failed live requests. Require zero active requests/upstream streams and a calibrated post-restart original stream record. Only then delete and independently GET-verify absence of the unused owned candidate. Deadline fallback cleans up safely but records a failed gate when evidence is missing.
- Accept delayed browser observation only when authoritative route, stream and VM-stop records were made before T+30. Late records still fail. The phase runner immediately closes clients on success or failure; phase transitions and cleanup no longer wait for an operator decision.

## Preparation and unchanged boundaries

Fresh off-VM backups restored independently with eight manifest bundle files. Recovery permissions, unchanged Hosting version `cdf29343210a5da7` and exact asset names, pinned bridge image, original service configuration and paused history were rechecked. Anonymous requests and a deliberately invalid-signature/unapproved-identity probe returned 401; the latter warms only public verification keys without creating an account, credential fixture or IAM grant. A fresh diagnostic tag avoided stale warm-up routing, while original normal traffic stayed at 100% before the clock.

The world remains archived and paused at pulse 64. No simulation pulse, writer upgrade, provider call, archive publication, audience expansion, force-off or skipped guest shutdown occurred. Credentials, auth headers and private response payloads were not exported. The existing empty history pane was used temporarily and restored afterward.

## Measured successful run

| Gate | Local elapsed | Limit/result |
| --- | ---: | --- |
| Original final-zero, candidate route and stream proven | T+28.921 | Before T+30 |
| Graceful VM stop requested | T+29.139 | Before T+30 |
| VM observed TERMINATED | T+81.644 | Recorded |
| Both checksum-verified checkpoints complete | T+87.220 | Pulses 64/48; fresh TERMINATED reads before and after each scene |
| Independent restart request | T+88.571 | **59.432 seconds after stop**, under 80 |
| Complete original spec/traffic and VM recovery confirmed | T+102.209 | Passed |
| Fresh successful live stream and identical retained view | T+137.692 | Before T+160 |
| Both clients automatically closed | T+137.808 | Before T+165 |
| Read-only integrity/history/writer/backup audit complete | T+141.125 | Before T+160 |
| All process counters zero, owned candidate absent | **T+161.056** | **Before T+180** |

The two checkpoint requests were uncached and rendered verified local replay with recorded outcomes. The archive observer made no bridge/backend API request during playback. The recovered live view retained Spark 6, Follow, explanatory presentation, zoom and all six event identities without duplication. The successful live request began after restart; the serving original process is identified independently by its stream-open record. VM RUNNING alone is not the recovery assertion.

## Cleanup and evidence scope

All three observed process sessions have direct zero active-request and upstream-stream records: initial original, replacement and recovered original. The parser also accounts for live requests that never opened an upstream stream. It rejects missing records, stale zeros followed by new activity and truncated log pages. These are process-scoped observations for this bounded private run, not a claim about every possible Cloud Run instance or unbounded audiences.

The worker restored the exact original full service spec and 100% original traffic, removed the owned candidate/tag and independently verified revision absence. Final read-only API checks confirm VM RUNNING and all three candidates from runs 25–27 absent. Successful local process inventory found zero owned controller, watchdog or audit workers. The existing history pane is restored, with no test observer tabs left. Recovery copies are retained privately under ignored runtime storage.

The timed audit confirms a single writer (PID 567), unchanged hashes for all four history tables, valid SQLite integrity, no orphaned journals, healthy backup timers/status and paused pulse 64. Structured evidence includes the current operator-source hashes, exact phase records, calibrated clock samples and all final process counters.

## Earlier attempts retained honestly

Run 25 captured the previously missing original final-zero record and requested stop at T+29.637. A late browser observation redundantly aborted it; the independent audit passed by T+145 and rollback/deletion completed by T+175.840, but replay/recovery acceptance failed. The handoff regression was fixed afterward.

Run 26 reached TERMINATED about 76.8 seconds after stop, leaving insufficient time for two replay proofs within the 80-second VM budget. The watchdog restarted instead of extending the limit. Its audit started too late and timed out; browser observation also missed its recovery deadline. Full rollback/deletion still completed by T+174.322 with actual zero counters. That cycle is not a pass. Boot-overlapped audit and automatic phase cleanup were tested before run 27. The earlier [T+197 cleanup failure](hosted-outage-readiness-fix-2026-10-23.md) remains historical evidence rather than being relabeled successful.

## Automated verification and delivery

Passing automated checks: **19 browser-harness/phase-runner tests, 24 Python controller/watchdog/audit tests**, rehearsal stop-threshold checks, HTTP/2 cancellation, bridge counter lifecycle and the browser auth/session/outage suite, including desktop/mobile archive behavior. No live cloud action occurs in those local regression tests.

The full root `verify:local` suite was not rerun for this change set; it remains required before publishing a PR. This report establishes bounded live acceptance, not a new hosted deployment or merged source delivery. MIM-S009 is ready for local review; broader access and availability remain a separate MIM-S010 decision.
