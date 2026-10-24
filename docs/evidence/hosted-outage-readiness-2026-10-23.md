# Hosted outage readiness and rollback — 2026-10-23

**Result: readiness aborted; no VM stop was issued and no VM-outage acceptance passed.** The user approved the bounded proposal, conditional on all readiness gates. Browser cleanup-deadline integration did not pass, so MIM-S009 remains open.

## Verified preparation

- Deployed merged observer `6e663954a8b0f6889c46fe9bf89638f4d3871dbd` from a fresh isolated checkout through the deployment skill. Firebase Hosting version `cdf29343210a5da7` passed exact index and both hashed-asset comparisons. Previous version `048f3555d2424baf` was retained as the rollback point; the verified approved deployment remains live.
- Took a fresh independent off-VM backup and used the existing read-only recovery identity to verify its exact receipt/archive and a complete isolated restore. No live state was replaced. VM checks confirmed one writer, archived/paused pulse 64, no orphaned journal handles and healthy backup timers.
- Read-only IAM checks verified VM start/stop/get and bridge get/update authority. No IAM/allowlist change, fixture provisioning, provider call or new VM was issued. Current official [Cloud Run pricing](https://cloud.google.com/run/pricing), [network pricing](https://cloud.google.com/vpc/network-pricing) and [free-tier conditions](https://docs.cloud.google.com/free/docs/free-cloud-features) were rechecked; billing is enabled, the VM has no external address, and remaining free-tier allowance was unavailable. No zero-cost claim is made.
- Prepared a zero-traffic revision from the original serving revision's exact pinned specification, transport, allowlist and scaling settings. Anonymous world/stream reads were denied. Protected catalog, manifest and pulse-64 playback were verified before any outage using cache-disabled fresh storage responses and checksum-valid rendering. This was preflight, not outage evidence.

## Failed readiness and protective aborts

The first arming attempt encountered an unsupported navigation-persistent CDP script command and a Windows atomic heartbeat replacement failure. The independent watchdog restored original traffic. The heartbeat handoff was changed to immutable heartbeat markers, and the private controller tests covered Windows sharing retries, controller death, phase-aware status rules and the two-session/180-second bounds (four tests passed).

A second arming attempt routed the same-image replacement, but the live browser cleanup-deadline command timed out. The replacement-browser gate was not satisfied. The controller aborted at approximately 50.8 seconds and confirmed recovery at 60.4 seconds without issuing a VM stop. The watchdog also completed recovery. A short page-local timer worked in isolation, but that does not establish a durable guard across the complete live browser journey. Two further arming attempts also aborted before VM stop (recovery confirmed at 53.4 and 64.5 seconds). A final browser-only preparation timed out waiting for World even though diagnostics reported a visible matching control; no controller was started for that preparation. The browser/controller gate remains unreliable. None of these attempts establishes a successful bounded outage rehearsal or a verified in-flight bridge crash.

## Rollback and cleanup

Original service specification and 100% traffic to `mimir-observer-bridge-p5-h2b-596163` were restored and compared with the private snapshot. The temporary diagnostic tag and both unused candidate revisions created by this task were removed after abort. Original revisions, IAM, allowlist, archives and recovery copies were preserved. Both temporary browser tabs and the owned deployment checkout were closed/removed; independent recovery processes exited. Final cleanup again compared the complete original service specification, verified deletion of the second candidate, and repeated the fixed read-only VM audit after all attempts.

Final telemetry showed zero requests/upstream streams in the newest two original-revision process samples and all sampled second-candidate processes. An older original-revision process and one deleted first-candidate process retained last samples of one request/upstream, with no later zero sample established. Both candidates were independently confirmed deleted. All-process final-zero and bounded client-disconnect cleanup acceptance remain unproven; revision deletion does not substitute for that evidence.

A fixed, read-only VM audit independently verified unchanged hashes of timelines, checkpoints, events and interpretations, unchanged writer PID, pulse 64, archived/paused state, and healthy backup status/timers. The VM last-start timestamp was unchanged. An initial reuse of a local sudo script was rejected by automatic review because read-only effects were not fully established; the replacement used explicit SELECT/status/health reads. Windows SSH quoting/stdin errors were resolved using the SDK's JSON flags-file format.

## Remaining gate

Validate a durable browser/controller deadline integration before another disruption window. Then verify live revision reconnect, fresh authorized replay while the VM is actually `TERMINATED`, exact VM recovery and bounded all-process cleanup. The single-writer and two-observer/180-second limits are unchanged. Redacted [structured results](hosted-outage-readiness-2026-10-23.json) accompany this record; private configuration, receipts, credentials and diagnostics remain outside Git.
