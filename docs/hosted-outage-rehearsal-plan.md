# MIM-S009 bounded live rehearsal â€” approval proposal

Status: approved execution was retried after browser/routing readiness repairs. The final attempt reached a graceful VM stop but exceeded the 30-second VM-operation and T+80 restart limits. Recovery and rollback were verified; cold replay and timely UI recovery remain unaccepted. See [retry evidence](evidence/hosted-outage-retry-2026-10-23.md) and the subsequently approved [revised timing proposal](hosted-outage-follow-up-proposal.md). This original plan is historical; [final acceptance](evidence/hosted-outage-cleanup-2026-10-23.md) verifies all gates under the revised limits. Earlier [readiness evidence](evidence/hosted-outage-readiness-2026-10-23.md) records preparation aborts before VM disruption.

## Targets and scope

Read-only control-plane checks on 2026-10-23 confirmed:

- Project `mimir-realm`, operator account `khozak@gmail.com` selected per command without changing global configuration.
- VM `mimir-staging`, zone `us-central1-a`, was `RUNNING`. The intended data baseline is the separately verified archived, scheduler-paused `main` timeline at pulse 64; recheck it immediately before approval is exercised.
- Cloud Run service `mimir-observer-bridge`, region `us-central1`, origin `https://mimir-observer-bridge-mah4b2udkq-uc.a.run.app`.
- Serving revision `mimir-observer-bridge-p5-h2b-596163` receives 100% traffic. Its pinned image is `us-central1-docker.pkg.dev/mimir-realm/mimir/mimir-observer-bridge@sha256:9b50923271ad57435d45ccbcab850b7d1bcb250519a3a3636209c94e19124d2a`.
- Firebase observer `https://mimir-realm.web.app/`, with protected archive checkpoints 0, 16, 32, 48 and 64 recorded in prior publication evidence. Revalidate current catalog and bytes before disruption.

Approval would cover deploying the merged observer containing the S008/S009 fixes, a same-image bridge replacement revision with the serving revision's configuration, one controlled VM stop/start, and restoration of original bridge traffic. No writer upgrade, pulses, provider calls, access expansion, IAM/allowlist changes, new project/VM, or archive publication/deletion is included. Normal charges on existing resources continue; this proposal does not promise zero cost.

## Readiness gates before starting the clock

1. Deliver and verify the intended source through the normal PR workflow first. Record exact merged source and Hosting assets, previous Hosting release, current bridge traffic/configuration fingerprints and pinned image. Use the deployment skill for Hosting. Preserve configuration privately; never emit raw authenticated CLI configuration or token-bearing output.
2. Confirm archived/paused pulse 64, exact timeline and history/bundle hashes, healthy backup timers, a fresh independent off-VM recovery receipt, verified archive checksum, and an isolated successful restore. Refuse a backup behind the writer or an unresolved WAL/journal condition. Keep one SQLite writer throughout.
3. Confirm current operator permissions, IAP recovery access and an approved Google browser identity. Reuse an approved signed-in browser context without exporting auth state/tokens. Verify missing-token denial before connecting. No temporary fixture provisioning is implied by this approval.
4. Prepare the replacement revision without traffic from the **serving revision's** pinned image and explicit private configuration. Do not inherit `latestReadyRevisionName` or the latest service template: readback showed these can refer to a different fixture revision. Preserve HTTP/2, timeout, ingress, scaling and allowlist settings. Verify anonymous denial before routing observers there.
5. Arm and test an independent local recovery watchdog before stopping the VM. It must start the VM by T+80 seconds even if the observer automation fails, restore original bridge traffic, and close test clients at T+180. The operator keeps an independent recovery shell available. A failed watchdog dry run or unavailable recovery authority blocks the rehearsal.

The existing audience runner aborts on any 5xx and is not a fault-rehearsal driver. Do not disable that safety policy globally. The live controller must record an explicit expected-fault interval and accept only the expected outage responses there; outside it, its normal stop rules remain strict. Validate its watchdog and phase handling with local fakes before using it live. This live controller/watchdog is an execution prerequisite, not claimed as implemented by the local browser regression.

## Proposed 180-second window

At most **two concurrent observer tabs**: one live observer and one cold archive viewer. No additional load generators or uncontrolled retries.

| Time | Action and required observation |
| --- | --- |
| T+0â€“30 | Establish authenticated baseline through Hosting and the direct bridge. Record pause/pulse/hash and redacted per-process stream counters. Open one live observer. |
| T+30â€“50 | Route to the verified same-image replacement revision, deliberately close the old client stream and reconnect to the new revision. Verify the new process/revision identity, retained observer state, no duplicate displayed outcomes and cleanup. Keep the original revision for rollback. |
| T+50â€“80 | Stop `mimir-staging` once using `gcloud compute instances stop mimir-staging --project mimir-realm --zone us-central1-a --account khozak@gmail.com --quiet`. Start it again within 30 seconds; independent watchdog starts it by T+80. During the stopped interval verify explicit live unavailability and cold protected archive playback at two checkpoints. |
| T+80â€“140 | Verify VM `RUNNING`, exactly one healthy writer, archived/paused pulse 64 and unchanged history/bundle hashes. Confirm automatic live reconnect, no duplicated outcomes and retained selection/presentation. Restore original bridge revision to 100% and verify it. |
| T+140â€“180 | Close both tabs, verify bounded upstream cleanup and backup health, verify original traffic/configuration, and stop the measurement window. |

Cloud Run revision replacement plus a deliberate client reconnect is **not an in-flight container crash test**. The local child-process regression proves that case in isolation. Do not report a live process crash as passed unless a separately reviewed supported termination mechanism is selected; no diagnostic kill endpoint is proposed.

Cold replay must use fresh network reads from protected archive storage with cache disabled; successful old DOM or cached bytes do not establish outage acceptance. Assert zero simulation API requests from the archive tab, rendered checkpoint/scene and recorded outcomes, intact manifest/chunk checksums, no owner controls or provider calls, and missing-token denial. Observe actual VM `TERMINATED` state during the replay sample; a stopped backend service alone is not proof of VM-outage acceptance.

## Stop, rollback and evidence

- Immediately abort the experiment on auth regression, more than two observers, any unexpected status/leak, changed timeline/history hash, a second writer, failed cold replay, failed recovery gate or deadline breach. Expected connection loss/502 is allowed only in the declared fault phase. No reset/continue/pulse command is a recovery action.
- Always start the VM, restore original bridge traffic and close clients on failure. Verify actual restored state rather than inferring success from a command exit. Preserve journals and diagnostics; never restore over live state automatically. If recovery exceeds the 180-second measurement window, stop acceptance and continue emergency recovery, recording the overrun as failure.
- If the observer deploy regresses, restore the captured previous Hosting release. Keep old bridge revision/image/configuration intact; do not delete revisions during the rehearsal.
- Retain redacted timestamps, exact source/assets/revisions, phase/status counts, sampled process and upstream cleanup counters, independent storage network evidence, before/after state/history/bundle hashes, backup receipt validation, and rollback readback. Store credentials and private recovery material outside Git. Report local, live and unsupported cases separately.

Approval requested: the bounded operations above, after all readiness gates pass. Any different disruption mechanism, new credential/IAM setup, spend scope, source or audience requires a revised proposal.
