# MIM-S010 collector repair and bounded retry — 2026-10-24

Status: **live acceptance failed; recovery verified; further retry held at the cost gate**. Changes remain local and uncommitted. [Structured measurements](hosted-capacity-retry-2026-10-24.json) distinguish the timed rehearsal from eventual safe cleanup.

## Repairs and collection

Delayed Cloud Logging cannot supply current counters: a sampled row was 14.425 seconds old even after increasing emission frequency. A temporary wrapper around the same pinned bridge image now exposes a fixed stats-only HTTPS probe, protected by a per-run random key and absolute expiry. It returns counters/resource measurements only; missing/wrong/expired keys fail closed. The key stays out of diagnostic output and is removed with exact service rollback and candidate deletion. Logging remains supporting evidence. No Firebase audience, allowlist or IAM changes were made.

A pre-established read-only IAP collector samples VM CPU, available memory and upstream sockets every second, periodically checking SQLite integrity/history, the single writer, paused pulse 64 and backup health. It has a bounded lifetime and an owned stop marker. Cloud-clock uncertainty and response-receipt timing regressions preserve the fifteen-second freshness limit. Browser clients have both a parent deadline and host-side abort watcher.

## Attempts and measured result

Eight temporary candidates were created across preparation and retries. Attempts 1, 3, 4 and 7 did not start load; readiness, startup coordination or freshness failed. Attempts 2, 5 and 6 stopped early on collector errors. Attempt 8 completed the full **120.043-second** browser window with two live observer frames, no recorded UI errors and peak direct counts of two requests/two streams. It observed 125 samples through T+144.989, with maximum gap 1.248 seconds.

**Attempt 8 did not pass.** After client closure the bridge reported zero requests/streams, but the VM still had eight ordinary pooled HTTP connections. The controller missed its final-zero deadline and independent rollback did not complete by T+180. A later authenticated operator restored the exact original service spec/traffic and confirmed all eight owned revisions absent. A subsequent independent VM audit verified zero upstream sockets, integrity, unchanged history, one writer, healthy backups and paused pulse 64. Late cleanup is not an in-window pass.

Observed peaks were bridge CPU 20.70%, bridge memory 92,889,088 bytes of 512 MiB, VM CPU 60.89% and VM memory 53.86%. These are maxima within the collected interval, not proof of complete 180-second resource coverage or broader capacity. The simulation stayed paused; no pulses, provider calls, VM restart, archive publication or audience expansion occurred.

## Cleanup repair after attempt 8

The local temporary wrapper now closes non-stream private upstream HTTP connections instead of retaining idle pools; SSE requests keep their existing cancellation path. A real local backend with a 72-second keepalive reproduces two streams plus five ordinary reads and verifies all sockets drain within one second. The rollback watchdog records fixed HTTP status and renews the documented operator credentials once on HTTP 401; mocked renewal/cleanup checks pass. An expired credential was not proven to be the cause of the earlier watchdog failure. These latest fixes have **not** been retried live.

## Cost boundary

Fresh public on-demand tables and live inventory informed a conservative five-scope allocation; no free-tier credit was assumed. The last preflight declared USD 0.097787807, including a USD 0.035 prior-attempt reserve. Later Monitoring reconciliation counted 1,190.383 billed instance-seconds across temporary revisions. This is an aggregate usage measurement, not complete attributable billing or proof that the earlier reserve covered every scope. Actual billing and the cumulative network/logging/background allocation remain unresolved.

The reusable cost builder now requires an explicitly verified prior-attempt upper bound and includes it in the same USD 0.10 ceiling. Unknown prior allocation fails closed; USD 0.04 of prior allocation plus the existing conservative repair/run envelope exceeds the ceiling. **No ninth candidate or load run was started**, because sufficient cumulative headroom could not be verified. Do not reset the allowance per retry, lower quantity assumptions merely to pass, or label pending billing zero. MIM-S010 remains open and no expansion decision is authorized.

Price references: [Cloud Run](https://cloud.google.com/run/pricing), [Compute](https://cloud.google.com/products/compute/pricing/general-purpose?hl=en), [block storage](https://cloud.google.com/products/block-storage?hl=en), [Cloud Storage](https://cloud.google.com/storage/pricing), [Logging](https://cloud.google.com/products/observability/pricing), [network](https://cloud.google.com/vpc/network-pricing).

## Automated verification

The targeted observer rehearsal command passed with local socket permissions: bounded stream tests, 11 capacity/cost cases after the cumulative-cost repair, 13 collector/cleanup cases, 19 browser-harness cases and 24 controller cases. The initial restricted-sandbox invocation could not establish the local streams; it was an environment failure and the permitted rerun passed. Full local verification is recorded separately in its run summary; it is not a substitute for a successful hosted retry.

Full local verification passed all 76 steps with unchanged source identity, including the new collector/cost checks and desktop/mobile connected history/launcher checks. Summary: `.tmp/verification/2026-10-24T05-56-15-399Z/summary.json`. The subsequent documentation and issue-only updates receive separate link/content/whitespace checks; no tested executable source changed afterward.
