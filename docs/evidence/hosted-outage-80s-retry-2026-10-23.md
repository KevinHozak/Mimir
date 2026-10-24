# MIM-S009 approved 80-second retry — 2026-10-23

Result: **readiness aborted safely; no VM stop or start was requested**. MIM-S009 live outage/replay acceptance remains open. The user approved the [revised limits](../hosted-outage-follow-up-proposal.md); neither attempt widened them.

## Preparation and limits

Same hosted assets (Hosting `cdf29343210a5da7`), original bridge revision and pinned image as the [previous measured retry](hosted-outage-retry-2026-10-23.md). Recovery permissions passed. A fresh off-VM backup was independently downloaded, checksum verified and restored with all eight manifest bundle files. The CLI receipt transfer timed out; the existing keyless recovery identity completed the download through the storage API. No new IAM grant, credential export, provider call, writer upgrade, simulation pulse or archive publication occurred.

The controller now stops immediately after all readiness gates, by T+30; the watchdog restarts on completed replay, abort, stale controller, ten seconds after observed termination, 80 seconds after stop request, or T+110. Browser clients retain their T+165 cutoff, two-client maximum and 180-second outer limit. Targeted tests passed: 11 browser harness/driver tests, 12 controller/watchdog tests, and the existing rehearsal stop-threshold tests. The initial restricted loopback run failed before elevated execution passed. The full suite was not rerun for these timing changes; the earlier 74-check pass belongs to the prior source.

## Measured attempts

| Attempt | Original ready/controller baseline | Actual candidate routing proven | Result | Original traffic recovery | Clients closed |
| --- | ---: | ---: | --- | ---: | ---: |
| run-15 | T+2.091 | T+28.932 | Readiness abort T+30.941; no VM stop | T+33.350 | T+42.507 |
| run-16, same candidate warmed with anonymous-denial probes | T+4.913 | T+19.383 | Readiness abort T+30.318; no VM stop | T+40.358 | T+50.083 |

In run-16, the reloaded observer retained Spark 6, Follow, explanatory presentation, zoom and event identities, with the archive catalog ready. The raw candidate stream timestamp minus the local lease was T+33.534. Subsequent clock calibration showed an approximately 11–12-second cloud/local offset; the browser received that stream at local T+22.179. The claim that the stream itself was late is withdrawn; the required positive proof was not recorded by T+30. See the [clock correction and repaired retry](hosted-outage-readiness-fix-2026-10-23.md). Candidate routing alone and a rendered retained scene were insufficient to authorize stopping the VM. The independent watchdog completed both rollbacks without a VM start request.

## Recovery, rollback and cleanup

Read-only post-audit verifies VM RUNNING, the same single writer PID 566, integrity, healthy independent backup timers/status, archived paused pulse 64, and exact equality of all four timeline/history table hashes. Complete original service spec and 100% original traffic were restored and independently compared. The owned candidate `mimir-observer-bridge-s009-1792807203`, including its temporary warm-up tag, was removed and its absence independently verified. Both task tabs are closed; successful read-only process inventory found zero owned controller/watchdog workers. Recovery copies remain preserved under ignored private runtime storage.

**Strict stream-disconnect acceptance is not proven.** Four opened process sessions lack final-zero lifecycle records; their last logged counters are nonzero. Independent Cloud Monitoring shows zero active and idle candidate instances at 02:06 UTC and zero active/one idle original instance at 02:07 UTC. These corroborate candidate retirement and absence of active original requests at those later samples; they do not prove every process emitted final-zero telemetry or met the bounded disconnect deadline. Resource cleanup and lifecycle-log proof are separate results.

## Remaining gate

The 80-second VM budget was implemented and locally tested but never exercised live because the unchanged 30-second readiness gate failed twice. Cold replay while TERMINATED and bounded live UI recovery remain unverified. Use calibrated timestamps when diagnosing readiness-proof delay; do not silently extend readiness or overall limits.
