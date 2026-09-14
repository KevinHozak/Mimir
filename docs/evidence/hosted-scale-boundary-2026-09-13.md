# Hosted observer scale and boundary review — 2026-09-13

## Decision

**Retain the Firebase-plus-single-VM boundary for the next limited observer envelope.** Firebase Hosting and Storage remain a read-only distribution layer for the authenticated observer and immutable historical archives. The Compute Engine VM and SQLite database remain the sole simulation writer. No migration or horizontal scaling is approved by this review.

This is a bounded go decision for continued limited observation, not a production-availability or high-concurrency claim. The next review is required before publishing a real audience-facing archive, adding a second writer, or introducing a persistent service beyond the current VM.

## Current hosted inventory

The read-only inventory used the authorized Google Cloud/Firebase project account on 2026-09-13:

| Surface | Current observation |
| --- | --- |
| Google Cloud project | `mimir-realm`, project number `487827684488`, `ACTIVE` |
| Firebase project | Display name `Mimir`, project ID `mimir-realm` |
| Firebase Hosting | One site, `mimir-realm`, `https://mimir-realm.web.app` |
| Firebase Storage bucket | `gs://mimir-realm.firebasestorage.app`, location `US-EAST1` |
| Archive objects | One `archives/catalog.json`, 93 bytes; catalog advertises zero archives |
| Budget alert | A Mimir monthly safety alert of `$10` with 50%, 75%, 90%, and 100% current-spend thresholds; this is an alert, not a spending cap |
| Active public audience | None measured; the release remains Google-authenticated staging and has no published history |

The bucket location is `US-EAST1`, so future cost calculations must use that region's current underlying Cloud Storage rate. The earlier `us-central1` planning snapshot in the hosted runbook is not a current bucket-location assertion.

## Representative workload measurements

The dated [First Glow production profile](first-glow-production-profile-2026-09-11.json) is the representative historical-replay measurement. It used the production Vite preview, the First Glow bundle, 12 Sparks, and 120 pulses, with desktop and reduced-motion mobile views:

| Workload | Observed result |
| --- | --- |
| Engine replay, second 120-pulse run | Median 45.29 ms/pulse; p95 75.77 ms; maximum 88.21 ms |
| Desktop observer, 1280x900 | Median frame interval 50.0 ms; p95 50.1 ms; 5 long tasks totaling 403 ms; zero measured heap growth |
| Mobile observer, 390x844, reduced motion | Median frame interval 100 ms; p95 116.7 ms; 118 long tasks totaling 11,182 ms; zero measured heap growth |
| Archive payload baseline | Zero published archives; no chunk transfer or cache-hit rate can be honestly inferred |

The first engine run contained startup/JIT outliers, so the second run is the more useful steady-state reference. The profile runner was also retried on this checkout on 2026-09-13; its browser fixture could not find the First Glow inspector within the timeout after the current hosted changes. That failure is recorded as an environment/regression follow-up, not substituted for the dated profile evidence.

No real concurrent-viewer, SSE-throughput, CDN-cache-hit, Hosting transfer, or archive-growth sample exists yet. The public release has no published history and is intentionally not being presented as a live load test. A later audience rehearsal must capture those values from the live Firebase/VM boundary before widening access.

## Cost, quota, and privacy envelope

Current first-party pricing references checked on 2026-09-13:

- [Firebase pricing](https://firebase.google.com/pricing) currently describes Firebase Hosting as no-cost up to 10 GB of Hosting storage and 360 MB/day of transfer, then `$0.026/GB` storage and `$0.15/GB` transfer on the paid plan. Firebase Storage buckets using `*.firebasestorage.app` receive a 5 GB-month storage and 100 GB/month download no-cost allowance before underlying Cloud Storage pricing applies.
- [Firebase Hosting usage, quotas, and pricing](https://firebase.google.com/docs/hosting/usage-quotas-pricing) states that Hosting quotas are project-level, releases count toward stored content, the CDN is automatic, and budget alerts do not cap charges.
- [Cloud Storage pricing](https://cloud.google.com/storage/pricing) and [Cloud Storage quotas](https://docs.cloud.google.com/storage/quotas) remain the source of truth for the `US-EAST1` bucket's regional storage, operations, transfer, and quota behavior. Quotas are changeable project-level controls, so a console/API snapshot is required before any wider release.

The current CLI inventory verified project/site/bucket identity, archive bytes, and budget-alert configuration. The installed CLI could not query the Cloud Quotas API without installing its optional `alpha` component, and the Firebase CLI did not expose an audience traffic report in this checkout. Therefore current traffic, cache effectiveness, actual billed cost, and quota utilization remain explicitly unmeasured rather than estimated.

Privacy remains bounded by the existing design: Google sign-in gates the observer, Storage Rules deny browser writes/deletes, archive objects are immutable distribution artifacts, and no owner token or simulation mutation route is sent to the browser. A denied verified-account test remains required before any broader audience release.

## Retained boundary and scale limits

- Keep one VM process and one SQLite writer. Do not add a second scheduler, public owner route, or horizontally scaled simulation process.
- Keep historical replay provider-free and read-only. Firebase may distribute catalog, manifest, and chunk objects; it must not become simulation authority.
- Keep the catalog as the archive advertisement commit point. Failed or partial publication must not be advertised.
- Before a wider release, run a bounded rehearsal that records concurrent viewers, archive/chunk sizes, Hosting transfer, Storage operations, CDN/cache behavior, SSE/API traffic, VM CPU/memory, and observed cost.
- Reassess the boundary if the rehearsal shows sustained VM saturation, unacceptable SSE latency, quota headroom below the operator threshold, privacy/support failure, or a cost-alert trajectory that cannot be controlled by reducing audience or transfer.

## Migration gates if scale later requires it

Any replacement of SQLite or addition of another writer needs a separately approved design and evidence for: transactional single-writer equivalence, deterministic pulse ordering, checkpoint and branch lineage, bundle-inclusive backup/restore, provider-free replay compatibility, staged rollback, and a recovery rehearsal against a known-good archive. Until those gates pass, a larger Firebase/CDN audience does not justify changing the simulation persistence boundary.
