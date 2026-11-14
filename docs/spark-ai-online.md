# S021 online pilot preparation — 2026-11-13

Status: **NOT ACTIVATED**. The owner authorized S021 continuation under the original USD 5 AI allocation and an additional USD 2 hosting ceiling for a 24-hour owner-only pilot. Local implementation and qualification are in progress; activation still requires the gates below. Historical S008 attribution remains separate.

## Proposed deployment

Use the existing `mimir-realm` private Compute VM (`mimir-staging`, `us-central1-a`) as the only writer, with a new database under `/var/lib/mimir/online/` and a separate allocation ledger in that directory. Keep the pulse-64 archived database and its bundle-inclusive snapshots intact. Use a pinned release directory and retain the prior service configuration for rollback. The attached VM identity already has Vertex AI access; use metadata credentials without copying a desktop SDK account or key file.

The observer remains at `https://mimir-realm.web.app`, through its authenticated read-only Cloud Run bridge. Deploy Hosting only from a clean checkout of merged `origin/main` using `npm run deploy:hosting`, which verifies the live index and every hashed asset. Pin and verify the bridge image/revision separately; Hosting verification does not qualify a backend deployment.

For a 24-hour pilot, the proposed cadence is one pulse every four minutes, ending at the earlier of the fixed UTC deadline or pulse 360. No automatic season reset, new timeline, allocation renewal, or continuation is authorized. A seven-day selection requires a corresponding explicit cadence/continuation decision before activation.

## New local controls

- A separate SQLite exclusive lock admits one server process per world database. OS cleanup releases the lock after a crash; never delete the lock database while a writer might be alive.
- The world stores a fixed run ID, UTC end time and allocation identity. Restarts cannot extend or remove that contract. Expiry prevents new pulses and scheduler resume. An already admitted pulse may finish its bounded provider operation.
- `spark-online` pins Gemini 3.5 Flash-Lite in `mimir-realm`/US and uses bounded metadata-authenticated workers. Requests retain the existing fictional Spark projection, wire/token limits, temporary $0.50 in-flight/unknown-cost hold, timeout and failure stop.
- The original USD 5 ledger retains its identity and all receipts. Explicit audited adoption uses 2× recorded token-cost estimates plus a USD 0.10 allocation reserve. Pending, uncertain or missing-cost attempts retain their full holds. An audited handoff permanently retires the desktop writer and binds the exported ledger to one online run; no second USD 5 pool is created.
- Online snapshots include a checksum-pinned `.ai-budget.db` sidecar after the world snapshot. Recovery checks allocation identity, retained reservations and recorded goal receipts. Off-host archives must include that sidecar and immutable world bundles.
- Health exposes deadline expiry, stalled clock progress and independently saved backup status. Owner stop and allocation exhaustion must be qualified in the deployed configuration before the clock starts.

## Current infrastructure evidence

Read-only checks found Node v22.14.0, the old archived `main` timeline paused at pulse 64, a 30-GiB standard persistent disk, and enabled daily offsite plus hourly backup-health timers. The current bridge traffic target is `mimir-observer-bridge-p5-h2b-596163`, with one vCPU, 512 MiB, 900-second request timeout and maximum 20 instances. That existing scaling configuration is not a bounded pilot selection.

## Selected funding and access

The owner selected **the original USD 5 AI budget**, **USD 2 additional hosting**, a **24-hour pilot**, and owner-only access. The buffered guard was applied to the existing ten completed requests: USD 0.008844 recorded estimate, USD 0.117688 guarded, USD 4.882312 guarded headroom. This changes admission accounting; it does not erase reservations, renew the cap, or imply an invoice. The desktop ledger remains stopped pending its audited handoff. Genuine Firebase natural-expiry/SDK-refresh qualification remains open; synthetic reconnect tests do not close it.

The hosting watchdog reads the owned revision's full DELTA billable-instance-time and sent-byte series, including pagination. Its USD 0.90 cutoff values instance time at two CPUs plus 512 MiB (including startup contingency) and outbound bytes at USD 1/GB. It retains maximum observed totals across restarts, stops on three failed observations, verifies owned traffic before restricting ingress, and stops the VM. A cutoff timer begins final stopped-writer backup and ingress closure two minutes before the independent hard shutdown at the 24-hour deadline. Reserve USD 0.25 for VM/disk, USD 0.25 for deployment, USD 0.10 for storage/backup and USD 0.50 for delayed usage/other charges: total USD 2. The bridge must use one maximum instance, one CPU and 512 MiB, at most two streams, 120 authenticated reads per minute, an 8-MiB non-stream response bound and a 96-MiB/minute outgoing byte bound. The selected online scheduler cannot be accelerated below four minutes per pulse. The pilot can stop early at a cost cutoff; continuous viewing is not promised for all 24 hours.

Current official list prices were retrieved on 2026-11-13: [E2 pricing](https://cloud.google.com/products/compute/pricing/general-purpose) lists us-central1 e2-micro at $0.008376428/hour. [Disk pricing](https://cloud.google.com/compute/disks-image-pricing) lists standard provisioned space at $0.000054795/GiB-hour above free allowance. Gross 24-hour VM plus 30-GiB disk is about $0.241 before free allowances, taxes, backups, bridge, network and deployment costs. [Cloud Run pricing](https://cloud.google.com/run/pricing) bills active streaming requests: continuous viewing must be budgeted separately and cannot be assumed free. [Vertex pricing](https://cloud.google.com/model-garden/pricing) lists non-global Gemini 3.5 Flash-Lite at $0.33/million input tokens and $2.75/million output tokens. Reservation totals are conservative admission limits, not final invoices.

A world lease limits simulation/provider admission; it does not stop infrastructure billing. Select and verify an infrastructure shutdown/rollback deadline and observer concurrency/viewing limits within the hosting allocation. Delayed billing cannot establish a real-time hard dollar cap.

## Activation gates

1. Finish local implementation, exact-source full verification and source review; publish the required dependency changes.
2. Record approved allocation, audience, run window, cadence, season boundary, observer limits and gross infrastructure estimate.
3. Capture current service/revision/source identities and fresh off-host recovery proof. Prepare rollback to the retained archived database without overwriting the new history or allocation.
4. Install the pinned backend release initially paused. Verify world identity, writer exclusion, restart, budget stop/exhaustion, read-only access and genuine Firebase refresh/reconnect; preserve selected Spark on return.
5. Take and independently restore a fresh world + bundles + allocation snapshot. Compare latest checkpoints, goals, decisions, history hashes and retained reservations without provider calls.
6. Deploy and byte-verify Hosting; verify exact bridge revision and read-only allowlist. Arm the operational deadline before starting the clock.
7. Record first committed online pulses and Spark decisions/outcomes, backup health, conservative reservations and estimated token usage. Report final cloud billing only when available.

History metrics, bundle-reference scans and recovery hashes stream checkpoints. Recovery hashing preserves the previous JSON-row hash format using sorted small primary-key prefixes. The pilot removes only its newly created local snapshot unit after both offsite uploads are verified; existing snapshots are preserved.

The standalone backup worker includes `backup-file-hash.js` and `spark-ai-accounting.js` beside its four backup modules. Full database and archive digests use bounded read buffers.

The backup CLI resolves project paths from its module location regardless of working directory and rejects missing referenced bundles. S021 corrected the narrower S020 default-runtime supplement's external-asset evidence; see its retained audit note. The small VM writer and offsite workers use explicit heap limits with streamed checkpoints.
