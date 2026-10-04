# Hosted observer runbook

The supported hosted experience is limited Google-authenticated observation at [mimir-realm.web.app](https://mimir-realm.web.app/), through Firebase Hosting and the Cloud Run bridge to one private Compute Engine VM and SQLite writer. `render.yaml` remains an alternative single-instance configuration, not evidence of a live Render deployment.

## Current disposition — 2026-10-03

Hosted-P14 through Hosted-P16 are delivered; Hosted-P17 is closed with explicit limitations. The historical 2026-09-15 validation records Firebase Hosting version `82cc93e9b9470f8e` from merged commit `fbd4eb8`. Missing/malformed tokens were rejected, the authenticated observer hid owner controls, and VM continuity, bridge-to-VM recovery, synthetic traffic, and Compute Engine quota evidence were recorded. See [Hosted-P17 operational evidence](evidence/hosted-p17-operational-closeout-2026-09-14.md).

On 2026-10-03, merged PR #266 at `d1aa17e` was deployed with the guarded clean-main workflow to Hosting version `2b0287700b57d854`; exact live index and both hashed assets matched. Desktop and mobile-sized core rendering succeeded and all five required authenticated bundle SVGs returned 200. Mobile zoom controls remain clipped, so this is not an unqualified usability pass. Single-session request/cache/transfer measurements, bridge/VM CPU and bridge memory, Compute quotas, and September project/service billing are recorded in the [dated deployment evidence](evidence/hosted-p18-p4-deployment-2026-10-03.md). The multi-viewer rehearsal remains blocked by no approved audience cap or safe window, incomplete rollback/recovery verification, and absent server active-stream cleanup telemetry. #257/#253 stay open; #201 remains the historical closeout with limitations. P2/P3 closed-as-not-planned status is not acceptance evidence. No capacity, availability, or browser-attributable cost claim follows.

The October 3 [Observer-P4 recovery audit](evidence/observer-p4-recovery-identities-2026-10-03.md) freshly verified the retained known Hosting rollback row/action, bridge traffic and immutable revision identities, the authoritative VM service/checkpoint, all manifest-listed files in its latest local recovery unit, and metadata availability of the historical independent recovery object. The Hosting API still returns 403; existing console access supplies release availability. After explicit user approval, the historical independent archive was downloaded into ignored local storage and its database plus all seven manifest-listed bundle files passed hash verification. A fresh locked build of recovery source `e5b5b114a7b2990bd6dfb305364079a29aad9aae` matches all 36 deployed backend JavaScript files and the package/lock manifests (one documented CRLF-only difference). This identifies a reproducible backend recovery source without claiming the original deployment command or a successful restore. Issue #269 evidence is complete pending PR merge; #272 rehearsal and #257 disposition retain their separate operational gates.

## Google Cloud pre-provisioning snapshot

Last verified: 2026-09-11.

- Dedicated project: **Mimir** (`mimir-realm`)
- Target region: `us-central1` (Iowa), selected because it is an eligible US region for the Compute Engine free tier and keeps the runtime and planned bucket in the same location
- Enabled services: `compute.googleapis.com`, `storage.googleapis.com`, `billingbudgets.googleapis.com`, and `iap.googleapis.com`
- `us-central1` quota during audit: 24 instances, 24 E2 CPUs, 4,096 GB total disks, and 8 external addresses allowed; current usage was 0 for each relevant resource
- Hosted-P4/P6 staging resources: `mimir-staging` in `us-central1-a`, one `e2-micro`, and one 30 GB standard persistent disk; the VM has no external address. Hosted-P5's independent bucket is recorded below in the backup boundary and evidence sections.
- A separate existing project named `mimir-20260911` is not part of this plan; only `mimir-realm` is the Mimir hosting project

The existing Codex Realm project remains separate from Mimir hosting. Local Application Default Credentials still use a different quota project; align that before application-level cloud calls if needed.

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

An eligible account staying within the documented allowances could keep the initial VM and 30 GB disk at approximately `$0` in service charges, but the public IPv4, overage traffic, backup retention, operations, logging, and any ineligible-account usage can still bill. Pricing and free-tier terms are drift-prone and must be rechecked immediately before provisioning.

Without applicable free-tier credit, the simple 730-hour baseline is approximately `$10.96/month` before backup storage, egress, logging, or operations (`$6.11` VM + `$1.20` for 30 GiB-months of disk + `$3.65` IPv4). Therefore, Hosted-P4 must not provision a continuously public VM under the selected private spending envelope until free-tier eligibility or a revised budget is explicitly confirmed.

Pricing sources checked on 2026-09-11: [Compute Engine general-purpose VM pricing](https://cloud.google.com/products/compute/pricing/general-purpose), [Google Cloud Free Tier limits](https://cloud.google.com/free/docs/free-cloud-features), [VPC network pricing](https://cloud.google.com/vpc/network-pricing), and [Cloud Storage pricing](https://cloud.google.com/storage/pricing).

The first provisioning envelope is: one non-preemptible `e2-micro`, one 30 GB standard persistent disk, one private IAP-only firewall path for staging HTTP, no load balancer, no Cloud NAT, no GPU, no external IPv4 address, and no second runtime writer. SSH administration uses IAP; the staging observer is reached through a temporary local IAP tunnel. Public owner endpoints remain protected by `OWNER_TOKEN` and are not exposed as an unauthenticated control surface.

## Hosted-P7 public observer contract (historical decision)

Decision recorded 2026-09-11: **defer public exposure**. The intended future model is a limited, read-only observer for people who want to watch a First Glow history, but the current evidence does not justify exposing the staging VM or creating a second public service. That decision was subsequently followed by authorized authenticated distribution in Hosted-P9 through Hosted-P14. The VM remains private and IAP-administered; approved observers use the Firebase entry point.

The boundary for any future public model is explicit:

- Public clients may receive observer reads only: the rendered application, current committed observer state, recorded events, and explicitly supported historical reads.
- Owner operations remain private and authenticated. The `OWNER_TOKEN` must never be shipped to the browser, placed in a public URL, or accepted through an unauthenticated public route.
- The server remains the sole simulation writer. A public client cannot pulse, reset, branch, archive, continue, or otherwise create outcomes, and the deployment remains one SQLite writer unless a separate persistence decision is made.
- No public deployment, endpoint, credential, service account, load balancer, external IPv4 address, or other billable resource is created by this phase.
- Before reconsidering the decision, recheck current Google Cloud prices and free-tier eligibility, privacy/support expectations, traffic and egress assumptions, backup freshness evidence, and privately held spending controls. An alert is not a spending cap.

Hosted-P8 through Hosted-P16 are complete through their merged implementation and validation work. Hosted-P17 is now closed as a bounded staging closeout with explicit limitations; the current hosted boundary and unverified follow-up risks are recorded below.

## Hosted-P11 through Hosted-P16 implementation and dated deployment

Hosted-P11 established the authenticated read-only observer bridge. Google ID tokens are validated server-side, and approved clients may read current state, recorded history/events, and the SSE stream. Owner operations, mutation routes, `OWNER_TOKEN`, browser-held owner credentials, and any second simulation writer remain outside the public surface.

Hosted-P12 established immutable archive publication and retention. Published archives are validated before release, quarantined when invalid, and retained independently of the live VM to support provider-free historical playback without the live VM. The deployed outage-time path remains operationally unverified.

Hosted-P16 archives are exported from a read-only SQLite connection as an ordered selection of complete checkpoint chunks. Use "--timeline <id> --pulses 0,32,64 --source-backup <label>" when publishing a bounded timeline set; every published archive must contain at least three strictly increasing checkpoints beginning at pulse 0. The exporter records the source backup label and checkpoint pulses in each manifest. Chunk and manifest sizes and SHA-256 values are immutable; storage growth is approximately the sum of those complete JSON chunks plus one manifest per timeline.

Publication uploads chunks and manifests to a staging prefix first, validates the complete local set, then copies the verified objects and dated "publications/run-*.json" record to their final prefixes. The catalog copy is the final commit point, so a failed or incomplete upload is not selectable by the Hosted UI. Re-running the same export is idempotent with respect to canonical history; it creates a new publication record/run prefix while preserving content-addressed archive bytes. Use "--quarantine <archive-id>" to remove an invalid archive from the next catalog, retain the old catalog for rollback, and restore that catalog only after verifying its referenced objects. Keep publication records with the selected backup/timeline and pulse list so retention and replay coverage can be audited.

Hosted-P13 retained the bounded scale decision: Firebase remains the public web/auth surface and one SQLite-writing VM remains the authoritative runtime for limited authenticated observation. This is not a high-concurrency or production-availability claim. See the dated [Hosted-P13 scale-boundary evidence](evidence/hosted-scale-boundary-2026-09-13.md).

The 2026-09-13 Hosted-P14 deployment established limited authenticated staging at `https://mimir-realm.web.app/`. Firebase Hosting rewrites `/api/**` to the `mimir-observer-bridge` Cloud Run service in `us-central1`; revision `mimir-observer-bridge-00004-qff` was verified. The bridge validates an approved, verified Google ID token and forwards only observer reads and SSE to the private `mimir-staging` VM. It has no service-account key, does not receive `OWNER_TOKEN`, and rejects owner/mutation routes.

In that 2026-09-13 sample, the unauthenticated `GET /api/world` check returned HTTP 401 with `approved Google account required`. An authenticated browser check using an existing approved identity loaded the live First Glow observer at pulse 28 with 12 Sparks and 7 sites; owner controls were absent. The hosted frontend build, restart-equivalence, and queued-command/idempotency checks passed. Those were initial P14 measurements. Later archive implementation and P17 validation supersede parts of that initial gate list; the remaining limits are listed in the current disposition above. See [P14 deployment evidence](evidence/hosted-live-observer-2026-09-13.md).

## Independent backup boundary

The backup destination is intentionally separate from the runtime project. Hosted-P5 provisioned an independently administered encrypted object-storage destination in US-CENTRAL1. Private project numbers, bucket identities, billing identifiers, and spending controls are omitted from this public guide.

The configured backup controls are:

- at least 30 daily and 12 monthly retained copies through bucket lifecycle rules;
- object versioning and the provider's recoverable-deletion/soft-delete protection where available;
- Standard storage with Google-managed encryption at rest, uniform bucket-level access, seven-day soft delete, and 395-day deletion lifecycle rules for live and noncurrent objects;
- separate keyless writer and recovery service accounts, with no service-account key copied to the VM; the writer can create/read objects but cannot delete them, while recovery is read-only.
- a deployment backup identity that can create new backup objects but cannot delete or purge versions;
- a separate recovery identity that can read and restore but is not used by the running service;
- bucket/project administration and retention-policy changes reserved for a separate administrator identity; and
- no long-lived service-account key committed to the repository or copied into the VM image.

Historical backup validation is recorded in the dated [Hosted-P5 backup evidence](evidence/hosted-backup-recovery-2026-09-11.md). Hosted-P8 adds optional scheduled replication without changing the single-writer runtime. When `BACKUP_GCS_URI` is configured, each existing `BACKUP_INTERVAL_MS` backup is packaged as one temporary archive containing the database, manifest, and referenced bundle directory, uploaded with `gcloud storage cp`, and verified with `gcloud storage objects describe`. The VM must use its attached keyless writer identity; no service-account key is accepted by this path.

The operator-visible status is available at `/api/backup/status` (which requires owner authentication) and is also summarized in `/health`. For authenticated owner requests (`x-owner-token`), `/health` reports `databasePath` and full backup replication details (destination, freshness threshold, timestamps, last object URI, archive hash/size, consecutive failures, and `stale` flag). For unauthenticated callers or public observers, `/health` suppresses internal `databasePath` and sanitizes backup replication details to `{ enabled: boolean, stale: boolean }`, preventing internal file path or GCS destination exposure. A stale or failed replication does not make the process pretend that local disk is independent recovery: investigate the recorded error, verify the bucket and attached identity, and perform a fresh isolated restore before declaring the backup path healthy.

## Google Cloud API key and public surface restrictions

For the public client and Firebase Hosting deployment, the web app configuration in `packages/web/src/firebase-auth.ts` references the Firebase Web Client API key (`AIzaSyDTsAPI1fEcvsLA-KyTcaYfo6ot9kySPC8`) for project `mimir-realm`.

Because client-side API keys are embedded in public web bundles, the key must be strictly constrained in the Google Cloud Console (**APIs & Services > Credentials**):

1. **Application restrictions (HTTP referrers):**
   - Restricted to authorized Mimir origins and local development loopbacks:
     - `https://mimir-realm.web.app/*`
     - `https://mimir-realm.firebaseapp.com/*`
     - `http://localhost:*`
     - `http://127.0.0.1:*`
2. **API restrictions:**
   - Explicitly restricted to only the APIs needed by the observer client:
     - **Identity Platform** / **Firebase Authentication API** (for Google ID token sign-in)
     - **Cloud Storage for Firebase** / **Google Cloud Storage JSON API** (for client-side archive asset reads)
   - All other GCP APIs (notably **Vertex AI**, **Generative Language API**, **Compute Engine**, and resource management APIs) are explicitly blocked from using this key, preventing unauthorized access or quota/billing consumption.

## Hosted-P3 verification record (historical pre-provisioning audit)

The 2026-09-11 pre-provisioning audit confirmed the selected project was active, billing was enabled on `billingAccounts/REDACTED-BILLING-ACCOUNT`, and relevant services were enabled. Private operator and spending details are omitted. The then-empty resource listing is historical; Hosted-P4/P5/P6 provisioning and validation are recorded above and below.

The following claims remain unproven: the account's actual Free Tier eligibility, exact billed amount after continued traffic, billing-alert delivery timing, public availability, durable multi-writer operation, and horizontal scaling. Hosted-P3 did not create an owner token. Hosted-P4 created a staging-only owner token in root-only secret configuration; Hosted-P6 verified that the live VM token file is root-owned mode `600` and did not print or commit it.

## Hosted-P4 staging evidence

The private staging observer was provisioned on 2026-09-11 from verified commit `792dab516b61b4ce7698545963c33e6da9b52609`. It runs the First Glow production build with the scheduler paused, one SQLite writer, authenticated owner operations, no public address, and IAP-only access. Controlled reset/pulse, unauthenticated rejection, clean restart, checkpoint recovery, and post-restart pulse checks passed. The dated resource, behavior, and cost record is [hosted-staging-2026-09-11.md](evidence/hosted-staging-2026-09-11.md).

## Hosted-P6 readiness evidence

The dated [Hosted-P6 readiness report](evidence/hosted-readiness-2026-09-11.md) records the private VM's 24-pulse First Glow test, unauthenticated rejection, restart continuity, owner-token protection, and the local-season decision. It validates a private hosted observer for continued observation. It does not authorize public exposure, owner-operation exposure, a multi-writer deployment, or a claim of production durability.

## Provisioning boundary

Before creating or changing hosted resources, verify the current Google Cloud Compute Engine, persistent-disk, IPv4, network-egress, and Cloud Storage prices and recheck the account's free-tier eligibility. The figures above are a dated planning snapshot, not a price lock. Keep the service private during staging where possible, and protect all owner operations with a long random `OWNER_TOKEN` supplied through deployment secret configuration. P6 validates this VM as a private observer for continued testing; it must not be described as publicly available, production-durable, or horizontally scalable.

The first hosted service is intentionally one simulation writer. Do not scale it horizontally while SQLite remains the authoritative store. A later multi-process deployment should migrate the persistence boundary to PostgreSQL or another coordinated database. Hosted-P6 validates the private observer gate, not public or multi-writer production readiness.

## Required checks after deploy

For Firebase Hosting releases, use `npm run deploy:hosting` from a clean checkout at
`origin/main`. The command fetches and checks the merged revision, builds all
workspaces, deploys only the `mimir-realm` Hosting site, and compares the live
`index.html` and hashed assets with the build it just deployed. A successful
Firebase command alone is not sufficient evidence that the intended checkout is
live. The build explicitly enables `VITE_FIREBASE_AUTH_ENABLED=true`, and the
frontend also enforces auth when served from `mimir-realm.web.app`.

### Private runtime checks

Run these checks against a private operator connection and an isolated test or restored timeline. They include mutations and are not checks to run through the read-only Firebase observer. The Compute Engine deployment uses `/var/lib/mimir/mimir.db`; `/var/data/mimir.db` belongs to the Render configuration.

1. Open `/health` and verify the service reports `ok: true`. With an owner token (`x-owner-token`), verify it reports the expected configured `databasePath` and full `backupReplication` details; without the owner token, verify internal file paths and GCS destinations are suppressed.
2. Open `/` and verify the browser client loads from the same origin.
3. Enter the owner token and verify pause, pulse, branch, archive, continue, and reset.
4. Let a short test season advance, restart the service, and verify the latest checkpoint and timeline remain available.
5. Create a backup, copy it to the selected independent destination, restore it into a fresh isolated path, and replay the restored timeline before treating the deployment as durable. The manifest must list every bundle referenced by included checkpoints, including archived timelines; corrupting `world.json` must make restore fail before startup. The selected destination is an encrypted, versioned object-storage bucket in a separate account or project from the hosted service, with lifecycle retention of at least 30 daily copies and 12 monthly copies. Access is limited to the deployment backup identity for writes and a separate operator recovery identity for reads/restores; both identities require MFA or workload identity, and bucket deletion/version-purge requires a separate administrator role. Do not describe the service disk or a same-host directory as independent protection.
6. For a structured timeline, verify `/api/world` reports `spatialModel: "structured-v2"`, the expected bundle hash is present in `structuredState`, and a queued `/api/owner/world/object` command returns 202 with an effective next pulse. Retry its idempotency key and verify no duplicate command is created.
7. For a First Glow timeline, verify `/api/world` reports `simulationVersion: "mimir-sim-v3-first-glow"`, `themeId: "living-circuit"`, and `ageId: "first-glow"`. Use `/api/owner/reset-v3` with the schema-3 bundle hash; do not relabel or rewrite an older timeline. A clean bundle-inclusive restore must replay the supported First Glow checkpoint and fail before startup when referenced assets are missing or checksum-mismatched.

The scheduled backup in `render.yaml` remains a local disk copy unless the hosted environment additionally supplies `BACKUP_GCS_URI`. Hosted-P5 separately validated an operator transfer of a bundle-inclusive backup from the private staging VM to the configured Cloud Storage destination and a recovery download using the read-only identity. Hosted-P8 automates the upload and remote metadata verification, but recovery still requires the separate read-only identity and a fresh isolated restore. Manual and scheduled backups share the same bundle-inclusive implementation and manifest format.

For the configured bucket, set `BACKUP_GCS_URI` to a `gs://` bucket/prefix and optionally set `BACKUP_FRESHNESS_MAX_AGE_MS`; the default is twice the backup interval, or 48 hours when the interval is unset. Keep `BACKUP_INTERVAL_MS` bounded and nonzero. The attached VM service account needs object-create, object-read, and metadata-read access only; it must not have object-delete or bucket-admin access. Do not add a service-account key to the VM image, environment, repository, or deployment secret configuration.

The response path is: inspect `/api/backup/status`, preserve the failed local backup unit, check the service log and VM identity/bucket permissions, retry only after correcting the cause, then download the selected object with the recovery identity and run the documented fresh restore plus continued First Glow pulse. A missing, stale, checksum-invalid, or failed upload remains an operational failure even when the local copy exists.

## Independent-backup validation evidence

### Observer stream lifecycle diagnostics

The bridge supports opt-in `OBSERVER_STREAM_TELEMETRY=1` JSON records on its existing stdout. Enabling this on a hosted revision requires separate deployment/configuration authorization. It adds no HTTP endpoint or logging service. Each record contains a UTC timestamp, revision, random process-session identity, event, and process-local counts. `activeRequests` counts authenticated GET `/api/live` handlers, including pending upstream headers; `activeUpstreamStreams` counts successful upstream SSE bodies until pipeline settlement. HEAD, rejected identities, regular API reads, completed Cloud Run requests, and container counts are different measures.

For hosted disconnect propagation, enable `OBSERVER_HTTP2=1` together with Cloud Run's `--use-http2` container protocol. The bridge then accepts cleartext HTTP/2 (h2c) behind Cloud Run's TLS termination. These two settings must move together; do not send h2c to the HTTP/1 server or vice versa. [Cloud Run documents that HTTP/1.1 client disconnects are not propagated to containers](https://docs.cloud.google.com/run/docs/troubleshooting#client-disconnect-does-not-propagate-to-cloud-run). `npm run test:observer-bridge-http2` verifies authenticated h2c delivery and cancellation releasing the upstream. The authoritative VM continues using private HTTP; it does not become public or gain another writer. Firebase Hosting's [60-second rewrite request limit](https://firebase.google.com/docs/hosting/cloud-run) remains a separate SSE transport constraint.

Records include startup baseline, 30-second samples, opens, and closes. Close records carry a bounded reason and total handler duration in milliseconds; this duration is not client-close-to-VM-release latency. Records omit bearer tokens, identity claims, URLs, and raw errors. Counters and timers settle when the body pipeline ends, including client closure, upstream failure, and timeout. `npm run test:observer-bridge-lifecycle` checks local counters alongside actual upstream socket closure.

Before claiming a hosted baseline, inventory every serving revision and process session during a timestamped window, verify log access and sampling coverage, and account for processes that terminate without close records. These are process-local gauges, not an atomic all-instance total; missing logs cannot establish zero streams. For one separately approved observer client, correlate connect/close timestamps, bridge counts returning to the prior baseline, and VM-side connection release. The October 3 authorized [Observer-P5 measurement](evidence/observer-p5-stream-cleanup-2026-10-03.md) observed 0 → 1 → 0 with client-close cleanup and VM TCP baseline recovery. It supersedes the earlier absent-telemetry gate, but does not complete #272/#257.

The active Hosting build connects API/SSE directly to `https://mimir-observer-bridge-mah4b2udkq-uc.a.run.app`, preserving the existing Google token validation and allowed Hosting origin. Hosting rewrites retained streams after tab closure even with h2c enabled. `npm run deploy:hosting` selects the exact direct bridge by default and rejects conflicting `VITE_LIVE_API_URL` or `VITE_API_URL` values; `npm run test:deploy-hosting-config` verifies this boundary. Use a fresh navigation or hard reload after deployment: cached previous bundles can still use the rewrite and retain bounded tails. The user-facing page remains `https://mimir-realm.web.app/`.

The automated replication contract and operator response path are recorded in the dated [Hosted-P8 replication evidence](evidence/hosted-backup-replication-2026-09-11.md).

The dated validation record is [hosted-backup-recovery-2026-09-11.md](evidence/hosted-backup-recovery-2026-09-11.md). It verifies the actual independent object-storage transfer, bundle-inclusive manifest, fresh restore, latest First Glow checkpoint recovery, one continued pulse from the restored database, and pre-startup failure when a referenced asset is missing. It does not claim automatic cloud upload, public availability, durable multi-writer operation, or final production readiness.

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
