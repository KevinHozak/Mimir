# MIM-S010 immutable-journal retry - 2026-10-24

**The bounded load, recovery and cleanup checks passed.** The conservative cumulative cost envelope is within the newly approved USD 0.15 ceiling. Final attributable billing and full measured-quantity reconciliation remain pending, so no wider-access decision is ready or authorized. [Structured evidence](hosted-capacity-journal-retry-2026-10-24.json) includes cost components, source hashes, measured bounds and explicit unknowns. Earlier [cost correction and failed attempt](hosted-capacity-cost-reconciliation-2026-10-24.md) remain historical evidence.

## Approval and preparation

The user raised the cumulative ceiling to **USD 0.15**, keeping two authenticated read-only clients, a 120-second observation window and a 180-second overall limit. No VM disruption, simulation pulse, provider call, IAM/allowlist change, permanent image/Hosting update or audience expansion was authorized or performed.

Fresh read-only inventory reconfirmed the private e2-micro, 30 GiB standard disk, 247,071,080 Cloud Storage bytes, three supported buckets, the pinned bridge image and no paid VPC connector. Prior usage was refreshed before execution: the previous attempt's bridge usage had posted further, rising from 217.871 to 273.487 total instance-seconds across its candidate and original revision. That supersedes the earlier provisional usage totals without rewriting their dated record. Logging usage for that window is now present at 103,457 bytes; missing Hosting transfer stays unknown.

The new model carries **USD 0.105** for all prior work and unresolved charges, **USD 0.004327456** for current preparation and **USD 0.037638902** for the retry. Its cumulative upper bound is **USD 0.146966358**. The original bridge is priced at its fully boosted two-vCPU rate for the entire 270-second allocation, plus overlap reserve; startup boost cannot be omitted as in the previous preflight. Temporary candidate boost is disabled. Fixed VM/storage allocation and network/logging/operations reserves are retained. No free-tier credit is assumed.

The temporary same-image collector had min/max one instance, an absolute 270-second repair lease measured from creation, a 90-second preparation cutoff, 24 MiB bridge response cap, 32 MiB VM wire-counter cap and 64 MiB aggregate network allocation. Independent rollback was armed before the revision was created. A steady 15-second direct-zero baseline, healthy paused world and actual candidate routing were verified before opening either observer. The parent harness began on an anonymous denial page, avoiding an extra application observer before the two frames opened.

The repaired source controller wrote each measurement into an exclusive immutable file. Its mocked full-lifecycle test passed before execution, in addition to the actual Windows held-reader regression. No repeatedly replaced live observation snapshot was used.

## Measured bounded run

| Check | Result |
| --- | ---: |
| Browser client window | 120.039 seconds |
| Directly observed two-stream hold, conservative lower bound | 116.419 seconds |
| Peak active requests / upstream streams | 2 / 2 |
| Successful SSE responses | 2 HTTP 200 |
| Received bytes per SSE client | 838,148 / 838,148 |
| Expected CORS preflights | 2 HTTP 204 |
| Recorded UI errors | 0 |
| Immutable direct samples | 108 |
| Maximum direct sample gap | 1.191 seconds |
| Direct zeros and fresh recovery attestation | T+124.777 seconds |
| Exact service restoration and candidate deletion | T+135.466 seconds |
| Collector exit and final cleanup disposition | T+139.090 seconds |

Both frames rendered pulse 64 and the selected Spark. Network evidence was not truncated; both SSE requests were cancelled at the planned client deadline, with no premature EOF or unexpected stream status. The two HTTP 204 requests were preflight exchanges, not extra observer streams. One process session was observed throughout the direct probe series.

After closure, fresh VM attestation matched the baseline history hashes and verified integrity, one writer, paused pulse 64 and healthy independent backups. Direct bridge request/stream counts and VM upstream sockets reached zero. The independent watchdog restored the full original service spec/traffic and verified the owned candidate absent; a later independent API read confirmed both. The VM collector exited with code zero after removing its owned stop marker. The temporary test tab was closed. Late bookkeeping was not substituted for an in-window gate.

## Resource evidence

Maximum observed bridge CPU was **24.98%**, bridge memory **17.55%**, VM CPU **62.00%** and VM memory **49.95%**, below the 80% observed-headroom gates. Direct probe CPU peaked at approximately 15.7%; delayed per-second logs provide the more conservative 24.98% value above.

Delayed logs contain 198 available resource samples for the same process, with no unavailable-resource rows. Their maximum in-window gap is 1.002 seconds and calibrated coverage extends through retirement at approximately T+135.582. VM sampling continues through T+137.998. Minute-level platform metrics are supporting evidence, not instantaneous maxima or proof of concurrency between successive revision transitions. During the live window the candidate's sampled instance count is one; the original's idle/rollback lifecycle is separately included in the cost reserve. These paused-world observations do not establish capacity while pulses or providers are running, or with a wider audience.

## Cost closeout

All collected counter/inventory checks are within the allocated limits. The bridge emitted 17,358,336 response bytes over 407 counted HTTP requests. VM wire-counter growth was 17,898,507 bytes. Posted platform records report 183.008 temporary and 4.302 original billable instance-seconds, 17,522,506 bridge egress bytes, 18,045,752 VM egress bytes, 120,232 ingested log bytes and 4 storage operations. Polling after ingestion delay returned the same bridge totals; the VM total includes small additional background traffic within the allocated interval.

The **USD 0.146966358** cumulative upper bound is retained rather than releasing uncertain reserves. Current Hosting transfer has no usable series; it remains reserved and unknown, not zero. Final attributable billing, complete per-component actual quantities and any eventual credits have not been verified. Thus the bounded operational run and allocated-cost check pass, while the full cost-reconciled readiness/expansion decision remains pending. This distinction preserves the stricter `evaluateCapacityEvidence` contract; no invented `measuredQuantity` values were supplied to force that evaluator to pass.

## Verification and remaining boundary

`npm run test:observer-rehearsal` passed before the live run: the audience runner, 12 capacity/cost cases, 19 collector/controller-entry cases, 19 browser-harness cases and 24 Python controller cases. The reusable controller's full mocked lifecycle, journal persistence under a Windows reader lock, absolute expiry, final-zero handoffs and safe diagnostics are covered. The earlier 76-step full local verifier result belongs to earlier source; it was not rerun for the latest operational changes. Documentation and local issue updates receive separate link/content/whitespace checks. No commit, PR or permanent deployment was made.

MIM-S010 remains in progress for the separate readiness decision. Genuine hosted Firebase expiration/refresh and human engagement are not established by this two-minute paused-world run. No new client run or audience expansion is implied by its success.

Pricing and semantics: [Cloud Run](https://cloud.google.com/run/pricing), [startup CPU boost](https://docs.cloud.google.com/run/docs/configuring/services/cpu), [Compute](https://cloud.google.com/products/compute/pricing/general-purpose?hl=en), [storage](https://cloud.google.com/storage/pricing), [Firebase Hosting](https://firebase.google.com/pricing), [network](https://cloud.google.com/vpc/pricing), [Logging](https://cloud.google.com/products/observability/pricing).
