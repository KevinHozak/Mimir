# Observer-P8: Validation evidence consolidation and epic disposition — October 4, 2026

Issue: [#257](https://github.com/KevinHozak/Mimir/issues/257).
Branch: `feat/257-observer-epic-disposition`.
Parent Epic: [#253](https://github.com/KevinHozak/Mimir/issues/253).
Depends On: [#272](https://github.com/KevinHozak/Mimir/issues/272) (closed), [#269](https://github.com/KevinHozak/Mimir/issues/269) (closed), [#270](https://github.com/KevinHozak/Mimir/issues/270) (closed), [#271](https://github.com/KevinHozak/Mimir/issues/271) (closed).
Blocks: [#253](https://github.com/KevinHozak/Mimir/issues/253) epic closeout.

---

## 1. Final Epic #253 disposition

The **Observer Readiness** workstream (Epic [#253](https://github.com/KevinHozak/Mimir/issues/253)) is concluded with an **evidence-backed limited operational disposition**:

1. **Approved Operational Boundary**: The Mimir First Glow observer is validated and approved for **limited Google-authenticated staging observation** with an explicit operational ceiling of **at most two concurrent observer sessions** over an observation window of **no more than three minutes (180 seconds)**.
2. **Single-Writer Authority Invariant**: The runtime strictly preserves one authoritative SQLite writer on the private Compute Engine VM (`mimir-staging.service`) reached via IAP. No second writer, secondary scheduler, public VM exposure, database mutation, or paid external infrastructure was introduced.
3. **Explicit Residual Limitations**: In accordance with project policy, this disposition **does not authorize general public audience access, unconstrained multi-viewer scaling, or an unqualified production-readiness claim**. Historical closeout [#201](https://github.com/KevinHozak/Mimir/issues/201) (Hosted-P17) remains the historical limited baseline.
4. **Epic Closeout Approval**: With the consolidation of evidence across [#269](#2-recovery-and-rollback-evidence-269), [#270](#3-active-stream-cleanup-and-resource-release-270), [#271](#4-hosted-asset-delivery-and-responsive-controls-271), [#272](#5-audience-rehearsal-and-operational-limits-272), and the reconciliation of waived cases [#255]/[#256](#6-reconciliation-of-waived-tasks-255-and-256), the acceptance gate for **Issue [#257](https://github.com/KevinHozak/Mimir/issues/257)** and parent **Epic [#253](https://github.com/KevinHozak/Mimir/issues/253)** is satisfied.

---

## 2. Recovery and rollback evidence (#269)

Delivered in merged [PR #269 / Observer-P4 evidence](observer-p4-recovery-identities-2026-10-03.md):

- **Firebase Hosting Rollback**: Verified current release `2b0287700b57d854` (Oct 3 deployment) and prior known-good fallback release `82cc93e9b9470f8e` (Sep 14 P17 closeout). Console action menu retains Rollback. (Note: prior release lacks #266 bundle asset fixes; stopping rehearsal is preferred over blind rollback).
- **Cloud Run Bridge Rollback**: Serving revision `mimir-observer-bridge-p5-h2b-596163` (digest `sha256:9b50923271ad57435d45ccbcab850b7d1bcb250519a3a3636209c94e19124d2a`) with 100% traffic, h2c, and opt-in stream telemetry. Documented fallback revision is `mimir-observer-bridge-00004-qff` (digest `sha256:d97d41d6874dbc2855966daadfcf407af8385a69885b57c1ae52fc5bd3238660`).
- **Authoritative VM & Local Recovery Unit**: Active systemd unit `mimir-staging.service` (PID 562, single Node process). Working directory `/opt/mimir`, database `/var/lib/mimir/mimir.db` (read-only SQLite check passed), port 8888, scheduler paused at pulse 0. Latest local recovery unit manifests verified.
- **Independent Backup Verification**: Historical GCS recovery archive verified by hash comparison: database and all 7 manifest-listed world bundle files matched. Deployed backend source matched commit `e5b5b114a7b2990bd6dfb305364079a29aad9aae` across all 36 deployed JavaScript files and package/lock manifests.

---

## 3. Active-stream cleanup and resource release (#270)

Delivered in merged [PR #281](https://github.com/KevinHozak/Mimir/pull/281), [PR #282](https://github.com/KevinHozak/Mimir/pull/282), and [PR #285](https://github.com/KevinHozak/Mimir/pull/285) / [Observer-P5 evidence](observer-p5-stream-cleanup-2026-10-03.md):

- **Transport & Route Architecture**: Cloud Run HTTP/1.1 does not propagate client disconnect events to containers. Resolved by adopting HTTP/2 (`h2c`) container protocol on Cloud Run and routing frontend browser requests directly to the authenticated bridge URL (`https://mimir-observer-bridge-mah4b2udkq-uc.a.run.app`), bypassing the 60-second Firebase Hosting rewrite limit.
- **Measured Client Cleanup**: 
  - Startup baseline: 0 active requests / 0 active streams.
  - Connection: 1/1 at `03:36:27.171Z`.
  - Tab closure: `03:37:13.535Z`.
  - Bridge closure event: `client-close` emitted at `03:37:24.724Z`, returning gauges to 0/0.
  - Measured cleanup lag: **11.19 seconds**.
  - Handler duration: 57,558 ms (confirming active client cancellation, not 5-minute timeout expiry).
- **VM Socket Baseline**: Port 8888 established TCP sockets returned to 0 at `03:38:22.192Z` (68.66 seconds after client closure, draining HTTP keep-alives).

---

## 4. Hosted asset delivery and responsive controls (#271)

Delivered in merged [PR #266](https://github.com/KevinHozak/Mimir/pull/266), [PR #288](https://github.com/KevinHozak/Mimir/pull/288), and [PR #293](https://github.com/KevinHozak/Mimir/pull/293):

- **Required Authenticated SVGs**: Charge pool, shelter niche, shelter loom, relay crossing, and pattern shard return HTTP 200 at desktop (1650 × 874) and mobile (390 × 844) viewports.
- **Mobile Zoom Controls**: Corrected right-edge clipping on narrow viewports by removing flex-wrapping and establishing a unified 36px row flex basis in `@mimir/web`.
- **Viewport Verification**: Zero document horizontal overflow, full panel containment, and valid hit target reachability verified across 320, 375, 390, 800, and 1280 CSS px viewports (`npm run test:observer-zoom`).
- **Live Deployed Site**: Hosted at `https://mimir-realm.web.app/` with clean ETag, strict transport security, and direct bridge CORS preflight (HTTP 204).

---

## 5. Audience rehearsal and operational limits (#272)

Delivered in merged [PR #294 / Observer-P7 evidence](observer-p7-audience-rehearsal-2026-10-04.md):

- **Rehearsal Harness**: Created `scripts/observer-rehearsal.mjs` with comprehensive test suite `scripts/observer-rehearsal.test.mjs`.
- **Safety Stop Thresholds**: Immediate client abort triggered on:
  - Auth rejection (HTTP 401/403)
  - Stream or HTTP 5xx errors
  - Active stream concurrency exceeding approved cap (> 2)
  - Window timeout (> 180 seconds)
- **Telemetry Redaction**: Zero credential leakage verified via automated `assertRedacted` assertions across all rehearsal logs.
- **Operational Boundaries**: Bounded concurrent rehearsal verified clean ramp-up (0 → 2 streams) and return-to-zero within 2 seconds of test window completion.

---

## 6. Reconciliation of waived tasks (#255 and #256)

Issues [#255](https://github.com/KevinHozak/Mimir/issues/255) and [#256](https://github.com/KevinHozak/Mimir/issues/256) were closed as **not planned**. In accordance with the acceptance criteria of #257, their residual cases are explicitly reconciled below:

| Issue | Waived Case | Reconciliation / Operational Status | Residual Limitation & Disposition Impact |
| --- | --- | --- | --- |
| **#255** | Expired, wrong-project, unapproved-user token rejection | Missing and malformed tokens have passing evidence in Hosted-P17. Unapproved token rejection was validated in P5/P7 harness tests (HTTP 401 with `approved Google account required`). | Real expired and wrong-project Google tokens were not exercised against live GCP IAM endpoints. Retained as a staging boundary; unauthenticated access fails closed. |
| **#255** | Authenticated SSE token refresh & reconnect continuity | Stream cancellation and client cleanup were measured in P5 (11.2s lag). | Transparent mid-stream token refresh and seamless reconnect without viewer page reload are **unverified**. Observer must reload or re-authenticate if token expires during session. |
| **#256** | Cloud Run bridge restart during active observation | Bridge revision switching and cold-start health checks verified in P4/P5. | In-flight stream survival across bridge container termination is **unsupported**. Stream will terminate and client must reconnect. |
| **#256** | Outage-time archive replay during live VM unavailability | Local archive validation and immutable GCS catalog publication verified in Hosted-P12/P16. | Replay while the authoritative VM is offline was not live-simulated by stopping the staging VM. Archive playback remains structurally independent in GCS/Hosting, but operational independence during VM outage remains an unverified limitation. |
| **#256** | Writer safety during live unavailability | VM systemd unit `mimir-staging.service` is serialized and append-only. Backup status aliasing (#290) verified. | Preserved single-writer invariant. No multi-writer failover exists or is planned. |

**Disposition Impact**: None of these residual limitations threaten writer safety or system integrity. They are accepted as defined operational characteristics of the staging deployment.

---

## 7. Consolidated evidence: Measurements vs. Estimates vs. Unknowns

| Category | Telemetry / Signal | Status & Source | Value / Recorded Boundary |
| --- | --- | --- | --- |
| **Measured** | Maximum Approved Concurrency | Measured (Harness + Policy) | Exactly **2 concurrent observer sessions** |
| **Measured** | Maximum Observation Window | Measured (Harness + Policy) | At most **180 seconds (3 minutes)** |
| **Measured** | Active Bridge Stream Cleanup | Measured (P5 Hosted Observation) | 11.19 seconds after browser close |
| **Measured** | VM TCP Socket Release | Measured (P5 Hosted Observation) | 68.66 seconds after client close |
| **Measured** | Narrow Viewport Layout | Measured (P6 Test Suite) | Clean fit at 320, 375, 390, 800, 1280 CSS px |
| **Measured** | Authenticated Asset Status | Measured (P4 Hosted Deployment) | HTTP 200 on all 5 required SVG assets |
| **Estimated** | Cloud Monitoring Telemetry Lag | GCP Monitoring Ingestion | 60–180 seconds latency; not real-time |
| **Estimated** | Infrastructure Utilization | GCP Cloud Monitoring (P4/P5) | Bridge CPU 0.15%–1.65%; VM CPU 1.66%–9.18% |
| **Historical** | Infrastructure Service Costs | GCP Billing Export (Sept 2026) | USD 0.081 project total (observer portion negligible) |
| **Unknown** | Real-time Attributable Billing | Billing Export Ingestion Delay | Exact per-session October network egress cost is unknown |
| **Prohibited** | Arbitrary Audience Capacity | Extrapolation | **UNSUPPORTED**: Do not extrapolate beyond 2 sessions |
| **Prohibited** | 24/7 Production Availability | Staging Environment SLA | **UNSUPPORTED**: Staging environment, single VM, no SLA |

---

## 8. Public safety and privacy boundary

- **Zero Secret Leakage**: Public evidence, transcripts, and commit records omit account emails, GCP project numbers, bucket names, billing account IDs, and specific budget figures.
- **Single-Writer Security**: The private VM SQLite database remains append-only and strictly isolated behind IAP.
- **Owner Surface Isolation**: Owner endpoints (`/api/owner/*`) and `OWNER_TOKEN` are protected from public observer access and bypass public proxying.

---

## 9. Conclusion and next steps

- **Observer Readiness Epic [#253](https://github.com/KevinHozak/Mimir/issues/253)**: Fully reconciled and ready for closeout.
- **Documentation**: `docs/roadmap.md`, `docs/architecture.md`, `docs/changelog.md`, and `docs/hosted-observer-runbook.md` updated to reflect this final disposition.
