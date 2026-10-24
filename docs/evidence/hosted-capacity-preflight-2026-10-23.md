# MIM-S010 approved rehearsal preflight — 2026-10-23

Result: **aborted before load**. The user authorized two live clients for 120 seconds, a 180-second overall limit and a USD 0.10 ceiling, conditional on verified hosted collectors and fresh pricing. Those prerequisites failed. Zero rehearsal clients were opened; no infrastructure, IAM, traffic, writer, deployment or audience changes occurred. Read-only preparation happened outside the never-started load window.

## Measured collector findings

- The operator can read the original healthy Cloud Run service and private RUNNING e2-micro VM. Original traffic is intact. The latest direct process sample was **3,552.672 seconds old** when checked; both samples in the last hour reported zero, but these are historical observations, not a current-zero proof.
- The bridge source samples every **30 seconds**, already slower than the approved 15-second maximum gap. Request-based CPU allocation can also delay timers while idle; this preflight does not infer current counters from absent events or aggregate instance counts.
- Cloud Monitoring returned bridge CPU/memory/instance and VM CPU series, but **no guest VM memory series**. A fixed read-only IAP audit measured memory at about **52.46%** and zero established upstream port-8888 sockets. That snapshot is not whole-window headroom evidence. The cold SSH audit took **17.322 seconds**, exceeding the adapter's five-second deadline.

## Pricing result

Fresh official [Cloud Run](https://cloud.google.com/run/pricing), [Cloud Storage](https://cloud.google.com/storage/pricing), [Observability](https://cloud.google.com/products/observability/pricing), and [network](https://cloud.google.com/vpc/network-pricing) pages were reviewed. Verified point rates are captured in the [structured report](hosted-capacity-preflight-2026-10-23.json); no discount or free-tier allowance was assumed.

The official Compute general-purpose table could not be retrieved, and the authenticated Cloud Billing SKU catalog returned **HTTP 403**. No API was enabled and no permission or billing setting was changed. More fundamentally, complete conservative quantities across bridge, VM, storage, network and logging are not yet verified. The service allows up to 20 instances, with 1 vCPU/512 MiB per instance; a two-client rehearsal is not itself a verified full-cost upper bound. The USD 0.10 gate is **unverified**, not passed or known exceeded. Actual attributable billing remains unknown; zero load clients does not establish zero preparation/background cost.

## Independent closeout

The final readback confirms the exact Cloud Run service-spec fingerprint is unchanged, original traffic remains intact, and the VM remains RUNNING with no public address. Read-only SQLite integrity passes, history hashes match the S009 baseline, one writer remains authoritative, the scheduler is paused at pulse 64, independent backups report healthy, and upstream sockets are zero. No task-owned cloud resources were created or require deletion. No observer tokens or credentials were exported. Retained local artifacts are private, ignored preparation evidence.

No live capacity pass, timed 180-second rehearsal cleanup pass, current per-process final-zero claim, or expansion decision follows from this preflight. The existing [approved plan](../hosted-capacity-rehearsal-plan.md) and audience limits remain unchanged.

## Next prerequisite work

Provide genuinely fresh per-process sampling and an already connected read-only VM collector; preflight timing and data completeness before another load attempt. Complete official SKU/rate and conservative five-scope quantity bounds. Changes to the bridge image, sampling cadence, CPU allocation, instance limit, service configuration or permissions are outside this no-change rehearsal and require their own reviewed action; none was applied to make this attempt pass.
