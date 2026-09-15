# Hosted-P17 operational closeout — 2026-09-14

## Disposition

**Not complete.** The bounded live checks found that the bridge rejects unauthenticated observer requests, but the currently served frontend bundle was built without the hosted-auth flag. It therefore renders owner-operation controls on the public Hosting page even though the API rejects those calls. Hosted-P17 remains open until the corrected frontend is deployed and the remaining authenticated, restart, archive, and traffic checks are captured.

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
