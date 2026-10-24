# MIM-S010 cost reconciliation and cleanup retry - 2026-10-24

Status: **cleanup verified within the approved limit; full 120-second rehearsal still failed**. [Structured evidence and cost components](hosted-capacity-cost-reconciliation-2026-10-24.json) preserve the earlier [failed cleanup](hosted-capacity-retry-2026-10-24.md). All source changes remain local and uncommitted; no audience expansion is authorized.

## Cost reconciliation and correction

Delayed Monitoring for the earlier 04:44-06:15 UTC operational window now reports 1,468.482 bridge instance-seconds: 1,190.383 on temporary instance-billed revisions and 278.099 on the original request-billed revision. The full window includes 34,543,489 bridge egress bytes, 35,845,856 VM egress bytes, 3,408 Hosting bytes, 1,187 storage egress bytes, seven storage API operations and 1,517,853 ingested log bytes. Complete metric pagination was required. These are usage records, not an invoice.

The refreshed inventory verifies a private e2-micro, 30 GiB standard disk, 247,071,080 stored Cloud Storage bytes, the same pinned bridge image and no paid VPC connector. Retained Hosting storage metrics peak at 814,658,344 bytes. Bounds allocate one GiB each to Cloud Storage and Hosting, including existing storage; no free-tier credit is assumed. VM and storage fixed allocation covers the earlier operational window and a separate 20-minute current preparation allowance, rather than charging the idle gap between tasks as a new rehearsal.

The retry was launched using a declared **USD 0.099216458** cumulative bound: prior allocation 0.063730100, current preparation 0.004327456, retry reserve 0.031158902. It used a 270-second absolute temporary-resource lease, preparation cutoff, a 24 MiB bridge response cap, a 32 MiB VM wire-counter cap, and 64 MiB aggregate network allocation. Client and overall limits stayed 120/180 seconds. The temporary revision stayed on the same pinned image with min/max one instance; the model also reserved the original instance and extra overlap capacity.

**The preflight estimate was incomplete.** The original revision enables startup CPU boost. Four earlier starts consumed 3,257.842 ms of startup latency, requiring a conservative extra 44 vCPU-seconds including the ten-second tails. Adding that omitted charge raises the original worst-case envelope to **USD 0.100272458**, slightly above the approved ceiling. The declared preflight must not be presented as a verified compliant envelope. Two current starts add a further 21.959 extra vCPU-seconds, conservatively rounded up in completed reconciliation. Startup-boost accounting now has an explicit regression that rejects unknown configuration/usage.

The completed short attempt consumed less than its reservation. Current posted records report 151.319 temporary and 66.552 original billable instance-seconds, 15,547,699 bridge egress bytes, 16,011,652 VM egress bytes, 362 bridge requests and five storage operations. Rounded-up usage bounds, startup boost, retained overlap reserve and nonzero reserves for unavailable current Hosting/logging data give a **completed cumulative allocated upper bound of USD 0.086280958**. Actual attributable billing remains pending; absent time series are unknown, never zero. This is a conservative allocation, not a final invoice or a claim that every usage category has posted.

Remaining allocated headroom is **USD 0.013719042**. Another attempt using the existing conservative reserve of USD 0.031158902 does not fit, even before additional preparation. No tenth candidate or client run was started. Do not reset the ceiling per attempt or silently reduce assumptions to obtain approval.

## Retry outcome

Two authenticated read-only live observers opened after fresh zero baselines and actual candidate routing. Both rendered pulse 64 and Spark six with no recorded UI error. Direct stream/request counts never exceeded two. At about T+87.6 the measurement controller aborted; the browser watcher closed both observers by **T+93.382**, before the required 120-second window completed.

A valid next sample remained in an unpublished `.next` file while the controller recorded a RuntimeError. Its stream/transfer counts were within bounds; the shared writer raises that category after repeated permission failures replacing the existing status file. This points to a local Windows snapshot-replacement failure, not an established application outage. The original RuntimeError text and exact lock owner were not retained; this limitation is preserved.

The upstream pool cleanup fix worked during abort recovery:

| Gate | Elapsed seconds |
| --- | ---: |
| Both observers closed | 93.382 |
| Direct bridge request/stream zero and VM upstream sockets zero | 98.427 |
| Exact original service spec/traffic restored and owned candidate absent | 111.301 |
| Collector exited; final cleanup complete | 116.754 |

The fresh post-close VM attestation matches baseline history and verifies integrity, one writer, paused pulse 64 and healthy independent backups. An independent API read reconfirms exact original service restoration. The VM was not stopped/restarted, no pulses or provider calls occurred, and no IAM, allowlist or permanent image/Hosting deployment changed. The temporary browser tab is closed. These results establish timely abort cleanup, not successful steady-window acceptance.

## Local repair and verification

The reusable `observer-capacity-controller.py` now journals each sample into an exclusive immutable file and writes a final aggregate separately. It does not repeatedly replace a snapshot that Windows readers may hold open. Fixed failure categories retain the handoff error while arbitrary response/credential text is discarded. A Windows native file-lock regression verifies new samples persist while the old snapshot is held open, and prior samples cannot be overwritten. A mocked executable-controller check exercises direct probing and missing-baseline refusal without cloud access.

`npm run test:observer-rehearsal` passes the bounded audience runner, 12 capacity/cost cases, 18 collector/controller-entry cases, 19 browser-harness cases and 24 Python controller cases. Earlier full local verification passed 76 steps on the previous source; it has not been rerun for these latest local-only changes. Documentation/issue links and whitespace receive separate checks. The journal repair is not live verified. MIM-S010 stays in progress, with full-window acceptance and the separate expansion decision unchecked.

## Primary pricing and metric references

- [Cloud Run prices and billable-instance-time behavior](https://cloud.google.com/run/pricing)
- [Startup CPU boost and its ten-second tail](https://docs.cloud.google.com/run/docs/configuring/services/cpu)
- [Compute e2-micro on-demand pricing](https://cloud.google.com/products/compute/pricing/general-purpose?hl=en)
- [Persistent Disk pricing](https://cloud.google.com/products/block-storage?hl=en)
- [Cloud Storage pricing](https://cloud.google.com/storage/pricing)
- [Firebase Hosting pricing](https://firebase.google.com/pricing)
- [Network pricing](https://cloud.google.com/vpc/pricing)
- [Logging ingestion pricing](https://cloud.google.com/products/observability/pricing)
- [Cloud Run metric definitions](https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z)
