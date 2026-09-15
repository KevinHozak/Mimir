# Hosted-P17 operational closeout — 2026-09-14

## Disposition

**Closed with explicit limitations.** The corrected authenticated frontend was deployed and the safe boundary, VM continuity, synthetic rehearsal, quota snapshot, and Cloud Run recovery evidence were recorded. The checks that require separately issued Google test tokens, a coordinated outage window, or audience/billing telemetry remain unperformed and are not represented as passed. This closeout does not declare production readiness or broader public release.

## Observation window and release identity

- Observation: 2026-09-15T00:24Z UTC, one read-only request sample against `https://mimir-realm.web.app/` and its observer routes.
- Hosting root: HTTP 200, `Content-Type: text/html; charset=utf-8`, `Cache-Control: max-age=3600`, 168 bytes.
- Served assets: `index-Dj_yIGVd.js` (1,787,381 bytes) and `index-B9Vgy_eZ.css`.
- Current Firebase release: `afe5fb3c3374b96e`, previously verified `FINALIZED`.
- Current source identity for that release: merged PR #209, commit `3adc5ec`.
- Rollback identity: Firebase release `d1a6be7cfc72aa62`, the immediately preceding verified Hosting release.

## Boundary checks

| Request | Result |
| --- | --- |
| `GET /api/world` without Authorization | HTTP 401, `approved Google account required` |
| `GET /api/metrics` without Authorization | HTTP 401, `approved Google account required` |
| `GET /api/live` without Authorization | No body was received during the bounded 20-second client window; the stream must be retested with an explicit short timeout after the frontend fix |
| Served bundle contains Google sign-in gate | No |
| Served bundle contains owner-operation UI | Yes |

The bridge-side read boundary is working, but the UI boundary is not. No owner credential, database, archive, or mutation request was transmitted during this audit.

## Measurements and limitations

The one-request sample measured no audience, concurrent viewers, SSE throughput, archive growth, CDN cache-hit rate, Hosting transfer, VM CPU/memory, quota utilization, or observed billing. Firebase CLI did not expose an audience report, and the installed Cloud SDK lacked the optional quota component. These values remain unmeasured rather than estimated.

The following acceptance work remains open: missing, malformed, expired, wrong-project, and unapproved-user token captures; authenticated reconnect and clean SSE closure; token refresh; bridge and VM restart continuity; archive replay during live unavailability; required authenticated asset paths; and a bounded multi-viewer/traffic rehearsal. No public VM exposure, second scheduler, second database, or paid resource was introduced by this audit.

## Corrective action

The follow-up change makes `mimir-realm.web.app` require hosted auth by hostname and makes the deployment script build with `VITE_FIREBASE_AUTH_ENABLED=true`. It adds a regression test and is intended to be deployed through the verified Hosting workflow before this issue is closed.

## Supplemental verification — 2026-09-15

The merged frontend correction was deployed to Firebase Hosting as version `77e6939867b124c9` from merged PR #211, commit `1eaa0bea99f08892403c2546f619eec0721fe088`. The live root served the corrected `index-TfeZcMin.js` asset.

| Check | Result |
| --- | --- |
| `GET /` | HTTP 200; `Cache-Control: max-age=3600`; 168-byte HTML shell |
| Corrected JavaScript asset | HTTP 200; 1,816,510 bytes |
| `GET /api/world` without Authorization | HTTP 401, `approved Google account required` |
| `GET /api/metrics` without Authorization | HTTP 401, `approved Google account required` |
| Authenticated browser observer | Loaded as `khozak@gmail.com`; hosted auth bar and observer controls visible |
| Owner/play controls on hosted page | Absent |
| Unauthenticated `/api/live` | No body within a bounded 5-second client window; SSE requires authenticated retest |

Focused `test:hosted-auth-boundary` passed, and the elevated full build passed for world-data, engine, server, and web. Vite reported only the existing large-chunk warning. The Windows deployment-script follow-up is tracked in PR #212; it has not yet been merged, so the automated deployment path still needs one post-merge verification.

P17 remains **not complete**. The missing/malformed/expired/wrong-project/unapproved token matrix, authenticated SSE reconnect/closure/token refresh, bridge and VM restart continuity, archive replay during live unavailability, bounded traffic rehearsal, and quota/cost/load measurements remain open.

## Validation pass — 2026-09-15

The deployed release was rechecked after the verified Hosting deployment of Firebase version `82cc93e9b9470f8e` from `origin/main` commit `fbd4eb8dbdbf94c78c482030fd5609011de88bab`.

| Route/check | Missing token | Malformed token |
| --- | ---: | ---: |
| `/api/world` | 401 | 401 |
| `/api/metrics` | 401 | 401 |
| `/api/design` | 401 | 401 |
| `/api/resonance` | 401 | 401 |
| `/api/region` | 401 | 401 |
| `/api/events` | 401 | 401 |
| `/api/interpretations` | 401 | 401 |
| `/api/live` | 401 | 401 |

The bridge returned 404 for `/api/resonance/anchors`, `/api/timelines`, and `/api/history` in both forms because those paths are not exposed by the deployed bridge route surface. No request mutated the world. The authenticated browser continued to load as `khozak@gmail.com` with the hosted auth bar, observer controls, and no owner/play controls.

This pass confirms the missing and malformed rejection cases and the deployed observer boundary. It does not satisfy expired, wrong-project, or unapproved-user token cases because no test tokens for those identities were available. Authenticated SSE reconnect/closure and token refresh, bridge/VM restart continuity, archive replay during live unavailability, and traffic/quota/cost/load measurements remain open.

## Cloud Run telemetry follow-up — 2026-09-15

Read-only Cloud Logging query for `mimir-observer-bridge` covered `2026-09-15T00:46:55Z` through `2026-09-15T01:26:09Z` UTC and returned 978 HTTP request records. The status breakdown was 926 HTTP 200, 31 HTTP 401, 7 HTTP 404, and 14 HTTP 502. Recorded request latencies ranged from 1.09 ms to 301.22 s; the upper end includes long-lived SSE behavior and is not a normal read latency.

The 14 HTTP 502 responses clustered at `01:15:23Z` through `01:15:49Z`, during the staging VM reset. Subsequent authenticated observer reads returned HTTP 200, and the VM health endpoint again reported the preserved `main` timeline at pulse 0 with the scheduler paused. This is evidence of a bounded bridge-to-VM interruption and recovery, not a capacity or availability guarantee.

The log sample is synthetic/operator traffic plus the authenticated browser session, not an audience rehearsal. Cloud Run logs do not establish active viewer count, CDN cache-hit rate, Hosting transfer, VM CPU/memory, quotas, or billed cost; those remain unmeasured.

## Synthetic Hosting rehearsal and quota snapshot — 2026-09-15

A bounded read-only rehearsal sent 20 requests to the Firebase Hosting root. All 20 returned HTTP 200 with the 168-byte HTML shell. Observed response time ranged from 97 ms to 283 ms, with a 121.75 ms mean. This is a connectivity and cache-serving sample, not evidence of supported concurrent audience capacity.

The `us-central1` Compute Engine quota snapshot showed 1 of 24 instances, 1 of 200 CPUs, 30 of 4,096 GB total disks, 1 of 200 internal addresses, and 0 of 8 external addresses in use. This is infrastructure quota headroom only; Cloud Run quotas, Firebase Hosting transfer/cache metrics, VM CPU/memory under load, and billed cost were not available from this read-only check.

The live browser remained authenticated as `khozak@gmail.com` after the rehearsal and the VM restart. Expired, wrong-project, and unapproved-user token tests, authenticated SSE reconnect/token refresh, bridge process restart, archive replay during live unavailability, and a real multi-viewer rehearsal remain open.
