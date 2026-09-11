# Hosted observer runbook

The pre-hosting slice remains compatible with a single-instance Render deployment, but Hosted-P4 now also has a private Google Cloud staging observer. `render.yaml` defines one paid Node web service, serves the built Vite client from Fastify, and places the SQLite database and scheduled local copies on the mounted persistent disk.

## Google Cloud pre-provisioning snapshot

Last verified: 2026-09-11.

- Google account: `khozak@gmail.com`
- Dedicated project: **Mimir** (`mimir-realm`, project number `487827684488`)
- Target region: `us-central1` (Iowa), selected because it is an eligible US region for the Compute Engine free tier and keeps the runtime and planned bucket in the same location
- Billing: enabled on billing account `billingAccounts/01E836-7FDB98-C1FD83`
- Enabled services: `compute.googleapis.com`, `storage.googleapis.com`, `billingbudgets.googleapis.com`, and `iap.googleapis.com`
- Monthly budget alert: `$10 USD`, scoped to `mimir-realm`, with current-spend thresholds at 50%, 75%, 90%, and 100%
- Budget resource ID: `6b5b23a7-494e-4ef6-9a1e-e09eec716a5f`
- `us-central1` quota during audit: 24 instances, 24 E2 CPUs, 4,096 GB total disks, and 8 external addresses allowed; current usage was 0 for each relevant resource
- Hosted-P4 staging resources: `mimir-staging` in `us-central1-a`, one `e2-micro`, and one 30 GB standard persistent disk; the VM has no external address and no backup bucket has been created
- A separate existing project named `mimir-20260911` is not part of this plan; only `mimir-realm` is the Mimir hosting project

This budget is an alert, not a hard spending cap. The existing Codex Realm project remains separate from Mimir hosting. Local Application Default Credentials still use a different quota project; align that before application-level cloud calls if needed.

The planned low-cost shape is one small Compute Engine VM running the existing single-writer Node/SQLite service, a standard persistent disk for runtime state, and a separately isolated Cloud Storage backup destination. Hosted-P4 provisioned and tested the private staging VM, and Hosted-P5 has now provisioned and recovery-tested the independent backup destination. Public/durable readiness remains a later phase.

## Google Cloud cost and eligibility decision

The 2026-09-11 pricing check supports `e2-micro` in `us-central1` as the first staging shape, subject to account eligibility and monthly free-tier limits:

| Component | Current published basis | Mimir decision |
| --- | --- | --- |
| Compute Engine | `e2-micro` on-demand list price is `$0.008376428/hour`, approximately `$6.11` for 730 hours before credits/free tier. The Always Free allowance covers one non-preemptible `e2-micro` equivalent of the month's hours in one supported US region, including `us-central1`, for eligible accounts. | Use one non-preemptible `e2-micro`; do not rely on free-tier eligibility as a spending cap. |
| Boot/runtime disk | Standard persistent disk list price is `$0.04/GiB-month`; the Always Free allowance includes 30 GB-months. | Start with a 30 GB standard persistent disk; size increases require a cost review. |
| Public IPv4 | An external IPv4 address in use by a standard VM is `$0.005/hour`, approximately `$3.65` for 730 hours; the network free tier only covers one hour per month. | Prefer a single ephemeral external IPv4 only if public browser access is required; do not reserve an unused static address. Recheck this charge immediately before provisioning. |
| Egress | Compute Engine Always Free includes 1 GB/month of outbound transfer from North America to eligible destinations. | Keep the first deployment a small observer/staging service and treat traffic above that allowance as billable. |
| Backup storage | Cloud Storage Standard in `us-central1` is `$0.000027397/GiB-hour`, approximately `$0.02/GiB-month`; Always Free includes 5 GB-months in supported US regions, plus limited operations and North America transfer. | Use a Standard bucket in an independent backup project, with lifecycle retention and a size cap reviewed before creation. |

An eligible account staying within the documented allowances could keep the initial VM and 30 GB disk at approximately `$0` in service charges, but the public IPv4, overage traffic, backup retention, operations, logging, and any ineligible-account usage can still bill. The `$10/month` alert is therefore a warning threshold, not a hard cap. Pricing and free-tier terms are drift-prone and must be rechecked immediately before provisioning.

Without applicable free-tier credit, the simple 730-hour baseline is approximately `$10.96/month` before backup storage, egress, logging, or operations (`$6.11` VM + `$1.20` for 30 GiB-months of disk + `$3.65` IPv4). Therefore, Hosted-P4 must not provision a continuously public VM under the `$10` plan until free-tier eligibility or a revised budget is explicitly confirmed.

Pricing sources checked on 2026-09-11: [Compute Engine general-purpose VM pricing](https://cloud.google.com/products/compute/pricing/general-purpose), [Google Cloud Free Tier limits](https://cloud.google.com/free/docs/free-cloud-features), [VPC network pricing](https://cloud.google.com/vpc/network-pricing), and [Cloud Storage pricing](https://cloud.google.com/storage/pricing).

The first provisioning envelope is: one non-preemptible `e2-micro`, one 30 GB standard persistent disk, one private IAP-only firewall path for staging HTTP, no load balancer, no Cloud NAT, no GPU, no external IPv4 address, and no second runtime writer. SSH administration uses IAP; the staging observer is reached through a temporary local IAP tunnel. Public owner endpoints remain protected by `OWNER_TOKEN` and are not exposed as an unauthenticated control surface.

## Independent backup boundary

The backup destination is intentionally separate from the runtime project. Hosted-P5 provisioned project `mimir-realm-backups` (`172815598347`) under billing account `01E836-7FDB98-C1FD83`, with bucket `gs://mimir-realm-backups-uscentral1-172815598347` in `US-CENTRAL1`. A separate `$10/month` project-scoped budget alert (`3d88a91f-0b28-4997-9a8c-2955e73e1923`) covers this project; the existing `mimir-realm` alert does not cover it.

The configured backup controls are:

- at least 30 daily and 12 monthly retained copies through bucket lifecycle rules;
- object versioning and the provider's recoverable-deletion/soft-delete protection where available;
- Standard storage with Google-managed encryption at rest, uniform bucket-level access, seven-day soft delete, and 395-day deletion lifecycle rules for live and noncurrent objects;
- separate keyless writer and recovery service accounts, with no service-account key copied to the VM; the writer can create/read objects but cannot delete them, while recovery is read-only.
- a deployment backup identity that can create new backup objects but cannot delete or purge versions;
- a separate recovery identity that can read and restore but is not used by the running service;
- bucket/project administration and retention-policy changes reserved for a separate administrator identity; and
- no long-lived service-account key committed to the repository or copied into the VM image.

The project ID, bucket name, identities, retention settings, and budget must be re-read after creation and recorded as dated evidence. This phase defines the boundary only; it does not create the backup project, bucket, credentials, or runtime.

## Hosted-P3 verification record

The 2026-09-11 audit used the active `gcloud` account `khozak@gmail.com` and project `mimir-realm`. It confirmed the project is `ACTIVE`, billing is enabled on `billingAccounts/01E836-7FDB98-C1FD83`, the relevant Compute Engine, Cloud Storage, and Billing Budgets services are enabled, and the project-scoped `$10` budget has 50%, 75%, 90%, and 100% current-spend thresholds. Resource listings returned no Compute Engine instances, persistent disks, external addresses, or Cloud Storage buckets.

The following claims remain unproven until a separately authorized follow-up phase: the account's actual Free Tier eligibility, the final globally available bucket name, the final backup-project ID, the exact billed amount after public access and traffic, billing-alert delivery timing, and a successful external backup/restore. Hosted-P3 did not create an owner token. Hosted-P4 created a staging-only owner token in root-readable secret configuration and did not print or commit it.

## Hosted-P4 staging evidence

The private staging observer was provisioned on 2026-09-11 from verified commit `792dab516b61b4ce7698545963c33e6da9b52609`. It runs the First Glow production build with the scheduler paused, one SQLite writer, authenticated owner operations, no public address, and IAP-only access. Controlled reset/tick, unauthenticated rejection, clean restart, checkpoint recovery, and post-restart tick checks passed. The dated resource, behavior, and cost record is [hosted-staging-2026-09-11.md](evidence/hosted-staging-2026-09-11.md).

## Provisioning boundary

Before creating or changing hosted resources, verify the current Google Cloud Compute Engine, persistent-disk, IPv4, network-egress, and Cloud Storage prices and recheck the account's free-tier eligibility. The figures above are a dated planning snapshot, not a price lock. Keep the service private during staging where possible, and protect all owner operations with a long random `OWNER_TOKEN` supplied through deployment secret configuration. The current P4 VM is intentionally private and must not be described as durable or public-ready until P5/P6 gates pass.

The first hosted service is intentionally one simulation writer. Do not scale it horizontally while SQLite remains the authoritative store. A later multi-process deployment should migrate the persistence boundary to PostgreSQL or another coordinated database.

## Required checks after deploy

1. Open `/health` and verify the service reports `ok: true` and the expected database path under `/var/data`.
2. Open `/` and verify the browser client loads from the same origin.
3. Enter the owner token and verify pause, tick, branch, archive, continue, and reset.
4. Let a short test season advance, restart the service, and verify the latest checkpoint and timeline remain available.
5. Create a backup, copy it to the selected independent destination, restore it into a fresh isolated path, and replay the restored timeline before treating the deployment as durable. The manifest must list every bundle referenced by included checkpoints, including archived timelines; corrupting `world.json` must make restore fail before startup. The selected destination is an encrypted, versioned object-storage bucket in a separate account or project from the hosted service, with lifecycle retention of at least 30 daily copies and 12 monthly copies. Access is limited to the deployment backup identity for writes and a separate operator recovery identity for reads/restores; both identities require MFA or workload identity, and bucket deletion/version-purge requires a separate administrator role. Do not describe the service disk or a same-host directory as independent protection.
6. For a structured timeline, verify `/api/world` reports `spatialModel: "structured-v2"`, the expected bundle hash is present in `structuredState`, and a queued `/api/owner/world/object` command returns 202 with an effective next tick. Retry its idempotency key and verify no duplicate command is created.
7. For a First Glow timeline, verify `/api/world` reports `simulationVersion: "mimir-sim-v3-first-glow"`, `themeId: "living-circuit"`, and `ageId: "first-glow"`. Use `/api/owner/reset-v3` with the schema-3 bundle hash; do not relabel or rewrite an older timeline. A clean bundle-inclusive restore must replay the supported First Glow checkpoint and fail before startup when referenced assets are missing or checksum-mismatched.

The scheduled backup in `render.yaml` remains a local disk copy. Hosted-P5 separately validated an operator transfer of a bundle-inclusive backup from the private staging VM to the configured Cloud Storage destination and a recovery download using the read-only identity. Manual and scheduled backups share the same bundle-inclusive implementation and manifest format. Automatic cloud-upload wiring remains separate work, so the service must not yet be described as continuously protected by the bucket.

## Independent-backup validation evidence

The dated validation record is [hosted-backup-recovery-2026-09-11.md](evidence/hosted-backup-recovery-2026-09-11.md). It verifies the actual independent object-storage transfer, bundle-inclusive manifest, fresh restore, latest First Glow checkpoint recovery, one continued tick from the restored database, and pre-startup failure when a referenced asset is missing. It does not claim automatic cloud upload, public availability, durable multi-writer operation, or final production readiness.

Authoring and verification commands from a checkout are:

```powershell
npm run world:import -- assets/world/maps/first-glow.tiled.json
npm run world:validate -- assets/world/generated/<sha256>/world.json
npm run build
npm test
npm run test:first-glow-commands --workspace @mimir/server
npm run test:first-glow-restart --workspace @mimir/server
npm run test:backup-restore --workspace @mimir/server
npm run test:first-glow --workspace @mimir/web
npm run backup --workspace @mimir/server -- backup <backup.db>
npm run backup --workspace @mimir/server -- restore <backup.db> <restored.db>
npm run profile:first-glow
```

The current First Glow bundle is `sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e`. Start a new First Glow timeline with an owner-authenticated request such as:

```powershell
$headers = @{ "x-owner-token" = $env:OWNER_TOKEN; "content-type" = "application/json" }
Invoke-RestMethod http://127.0.0.1:$env:PORT/api/owner/reset-v3 -Method Post -Headers $headers -Body '{"bundleHash":"sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e","seed":31,"sparkCount":12}'
```

For local runs, the default database is `data/local/mimir.db` and scheduled backups default to `data/backups/`. When testing a restored database, point `WORLD_BUNDLE_ROOT` at `<restored.db>.bundles`. The server validates each persisted bundle asset before listening and serves only the hash-qualified, manifest-referenced paths.
