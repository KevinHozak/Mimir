# Observer-P7: Bounded audience rehearsal and operational limits — October 4, 2026

Issue: [#272](https://github.com/KevinHozak/Mimir/issues/272).
Branch: `codex/272-audience-rehearsal`.
Parent Epic: [#253](https://github.com/KevinHozak/Mimir/issues/253).
Depends On: [#269](https://github.com/KevinHozak/Mimir/issues/269) (closed), [#270](https://github.com/KevinHozak/Mimir/issues/270) (closed), [#271](https://github.com/KevinHozak/Mimir/issues/271) (closed).
Blocks: [#257](https://github.com/KevinHozak/Mimir/issues/257) final disposition.

---

## 1. Disposition and operational envelope

Observer-P7 establishes the bounded audience rehearsal harness, safety stop thresholds, operational limits, and evidence protocol for the Mimir observer service.

This evidence confirms:
1. **Bounded audience cap**: Upper limit of **two concurrent observer sessions** over an observation window of at most **three minutes** (180 seconds). Any expansion beyond two concurrent sessions remains unapproved and requires explicit separate authorization.
2. **Single-writer preservation**: The server remains one authoritative SQLite writer on the private VM. No second writer, scheduler, public VM exposure, database mutation, or disruptive configuration changes were made.
3. **Verified recovery identities**: Rollback and recovery targets remain verified by [#269](observer-p4-recovery-identities-2026-10-03.md) (Firebase Hosting prior release `82cc93e9b9470f8e`, Cloud Run bridge revision `mimir-observer-bridge-00004-qff` and HTTP/2 revision `mimir-observer-bridge-p5-h2b-596163`, VM local recovery unit `mimir-staging.service`, and independent GCS backup archive).
4. **Automated rehearsal harness**: Dedicated rehearsal runner `scripts/observer-rehearsal.mjs` and test suite `scripts/observer-rehearsal.test.mjs` implement incremental connection ramp-up, stop-threshold enforcement, active stream tracking, client cancellation, and return-to-baseline assertions with verified zero credential leakage.
5. **No unsupported claims**: Measured results are strictly separated from estimates, cloud monitoring ingestion delays, and historical billing. This rehearsal does not claim general public audience capacity, unconstrained scaling, or multi-writer durability.
6. **Operational gate status**: Local harness tooling, stop-threshold enforcement, and loopback regression checks are delivered and verified. In accordance with project policy (AGENTS.md), loopback harness runs do not substitute for live hosted execution; the real multi-viewer hosted rehearsal gate remains open pending an explicitly authorized observation window with approved operator identities.

---

## 2. Rehearsal prerequisites and safety controls

| Parameter | Specification | Verification status |
| --- | --- | --- |
| **Audience cap** | Exactly 2 concurrent authenticated observer sessions | Enforced by harness; stops if cap exceeded |
| **Observation window** | Maximum 180 seconds (3 minutes) | Enforced by timeout timer and client abort controllers |
| **Operator stop thresholds** | Stop immediately on: (a) HTTP 401/403 auth regression, (b) HTTP 5xx / stream errors, (c) active stream count > 2, (d) loss of recovery confidence | Validated in automated test scenarios |
| **Cleanup plan** | Abort all client controllers; wait for bridge in-flight counters to return to 0/0; verify upstream VM socket release | Validated in `scripts/observer-rehearsal.test.mjs` and `observer-bridge-lifecycle.test.mjs` |
| **Rollback identities** | Hosting `82cc93e9b9470f8e`, Bridge `00004-qff` / `p5-h2b-596163`, VM unit `mimir-staging.service` | Verified in [Observer-P4](observer-p4-recovery-identities-2026-10-03.md) |
| **Single writer** | Authoritative SQLite writer on private VM via IAP | Verified; no database mutations or external endpoints added |

---

## 3. UI and asset status verification

Following merged PR [#288](https://github.com/KevinHozak/Mimir/pull/288) (mobile observer zoom control fix) and PR [#293](https://github.com/KevinHozak/Mimir/pull/293) (audio scheduling and test runtime):

- **Live Hosting Site**: `https://mimir-realm.web.app/`
- **Live Assets**:
  - `index-CDJkijgX.js`
  - `index-DIv4q2Uu.css`
  - Live index returned HTTP 200 with matching ETag and strict transport security.
- **Direct Bridge Route**:
  - Direct API target: `https://mimir-observer-bridge-mah4b2udkq-uc.a.run.app`
  - Validated by `npm run test:deploy-hosting-config` and `scripts/deploy-hosting-config.mjs`.
  - CORS preflight returns 204 for `https://mimir-realm.web.app`.
  - Unauthenticated `/api/live` returns HTTP 401 with `approved Google account required`.
- **Observer Zoom Controls**:
  - Verified across 320, 375, 390, 800, and 1280 CSS px viewports via `npm run test:observer-zoom --workspace @mimir/web`. All controls remain within panel bounds with reachable hit targets and zero horizontal document overflow.

---

## 4. Rehearsal harness execution and measured telemetry

The rehearsal harness was evaluated across two core automated test suites:
1. `npm run test:observer-rehearsal` (`scripts/observer-rehearsal.test.mjs`)
2. `npm run test:observer-bridge-lifecycle` (`scripts/observer-bridge-lifecycle.test.mjs`)

### Scenario 1: Bounded concurrent observer sessions (2 clients)
- **Ramp-up**: Incremental connection with 50 ms ramp delay.
- **Requests**: 2 GET `/api/live` requests initiated.
- **Status codes**: 2 × HTTP 200 OK (`text/event-stream`).
- **Active streams**: Stream snapshot rose from `[0, 0]` to `[2, 2]` (`activeRequests` = 2, `activeUpstreamStreams` = 2).
- **Session lifetime**: Bounded observation completed without errors.
- **Cleanup**: Abort controllers signaled on window completion; streams cancelled; bridge snapshot and upstream sockets returned to `[0, 0]` within 2 seconds.
- **Credential privacy**: All emitted telemetry records checked with `assertRedacted`; zero bearer tokens, passwords, secrets, or account identifiers present.

### Scenario 2: Error threshold and auth rejection
- **Test condition**: Unapproved / invalid bearer token supplied to rehearsal runner with `maxErrorThreshold: 0`.
- **Result**: Immediate HTTP 401 response captured; threshold breached; rehearsal runner triggered immediate abort of all connections.
- **Clean exit**: Active clients dropped to 0; bridge returned to baseline `[0, 0]`.

---

## 5. Separation of measurements, estimates, and unknowns

| Metric | Source & Status | Value / Boundary |
| --- | --- | --- |
| **Max Concurrent Rehearsal Clients** | Measured (Local Harness) | 2 sessions |
| **Active Stream Baseline Return** | Measured (Local Harness + P5 Hosted) | 0 active requests, 0 active streams |
| **Stream Cleanup Lag** | Measured in P5 Hosted (`client-close`) | ~11.2 seconds bridge close lag; 68.7s VM socket drain |
| **Cloud Monitoring Ingestion Delay** | Cloud Run / Compute Metrics | Typically 60–180 seconds ingestion latency; not real-time |
| **Compute & Memory Utilization** | Cloud Monitoring (Historical P4/P5) | Bridge mean CPU 0.15%–1.65%, VM CPU 1.66%–9.18% |
| **Current Attributable Billing** | GCP Billing Export | Historical September USD 0.081; real-time October observer billing unknown |
| **Multi-viewer Capacity Ceiling** | Extrapolation | **UNKNOWN / PROHIBITED**: No claim beyond 2 concurrent sessions |
| **Token Refresh & Reconnect Continuity** | Prerequisite #255 / #256 status | Gaps remain explicit; not claimed solved by this rehearsal |

---

## 6. Public safety and privacy boundary

In compliance with project constraints:
- All account emails, project numbers, bucket identities, billing account numbers, and exact budget amounts are omitted from public evidence.
- The single SQLite database remains isolated and append-only on the private VM.
- No public ports or external IPs were added to the staging VM.

---

## 7. Next actions and handoff

This delivery establishes the automated rehearsal harness, stop thresholds, credential redaction, and local loopback operational limits for **Issue [#272](https://github.com/KevinHozak/Mimir/issues/272)**.

The real hosted multi-viewer rehearsal gate remains open pending:
1. Operator authorization of a dedicated live rehearsal window.
2. Participation of approved authenticated observer identities against the live Cloud Run bridge (`mimir-observer-bridge-mah4b2udkq-uc.a.run.app`) and private staging VM.
3. Telemetry capture of live bridge session cleanup and VM socket baseline return under actual hosted conditions.

Once authorized and executed, live rehearsal findings will be handed off to **Issue [#257](https://github.com/KevinHozak/Mimir/issues/257)** (Observer-P8: Consolidate validation evidence and decide epic disposition) for the final disposition of parent Epic **[#253](https://github.com/KevinHozak/Mimir/issues/253)**.
