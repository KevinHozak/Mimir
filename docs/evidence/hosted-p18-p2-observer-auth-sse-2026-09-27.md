# Hosted-P18-P2 observer auth and SSE verification — 2026-09-27

Status: **Partial; issue #255 remains open.** This record contains a limited live boundary check and local token-policy coverage. It does not claim the missing live token matrix or full SSE lifecycle has passed.

## Setup and safety boundary

- Verification date: **2026-09-27 UTC**.
- Target: the existing Firebase Hosting observer at `https://mimir-realm.web.app/` and its `/api/**` rewrite.
- An already-authenticated observer browser session was used for the page/reconnect check. No token value, account identifier, credential, or response header was recorded.
- HTTP boundary probes used a missing Authorization header or the literal dummy value `Bearer invalid-test-token`; no live token was transmitted by the shell probes.
- The HTTP client cleared proxy variables only in its process because the configured local proxy refused connections. No Windows proxy settings were changed.
- No owner credential, owner operation, successful mutation request, cloud configuration change, new cloud project, or production identity change was used.

## Live outcomes

| Check | Result | Evidence |
| --- | --- | --- |
| Missing token on `GET /api/world` | Rejected with HTTP 401 and `approved Google account required` | Direct HTTP response through Firebase Hosting |
| Dummy malformed bearer on `GET /api/world` | Rejected with HTTP 401 and the same non-sensitive response | Direct HTTP response; dummy value only |
| Dummy malformed bearer on `GET /api/live` | Rejected with HTTP 401 and the same non-sensitive response | Direct HTTP response; no stream opened |
| Owner route `GET /api/owner/world/object` | HTTP 404 `observer route unavailable` | Bridge allowlist did not expose the route |
| Mutation route `POST /api/pulse` | HTTP 405 `read-only observer` | Bridge rejected the method before forwarding; no body was sent |
| Authenticated observer page and reload | Page loaded after reload and displayed pulse 0, 12 Sparks, and 7 sites | Browser-visible observer state before and after reload |
| Client closure | The browser tab was closed after the authenticated page loaded | Client-side closure performed; server-side release was not observable |

These probes did not change simulation state. The visible pulse remained 0 across the authenticated page reload. No request IDs, Cloud Run logs, stream counters, or server-side connection metrics were available in this run.

## Local bridge policy coverage added

`scripts/observer-bridge-auth.mjs` contains the token policy used by the Cloud Run bridge. It requires the configured project audience and issuer, a verified email, and membership in the approved email set. Firebase Admin verification remains responsible for signature and expiry validation; verifier errors fail closed.

`scripts/observer-bridge-auth.test.mjs` covers an approved claim set, absent/non-Bearer credentials, wrong-project audience and issuer, an unapproved verified email, an unverified email, and an expired-token verifier error. It runs with:

```powershell
npm run test:observer-bridge-auth
```

After installing dependencies from the repository lockfile, `npm run build` passed for all four packages and `npm run test:observer-bridge-auth` passed. `git diff --check` also passed.

## Remaining acceptance gaps

- No genuine expired Firebase ID token was presented to the live bridge.
- No genuine ID token issued for a different Firebase project was presented to the live bridge.
- No valid, verified but unapproved identity token was presented to the live bridge.
- Token refresh was not observed; the reload used the browser's existing Firebase session and does not prove an expired token refreshed successfully.
- Reconnect rendered the live page, but stream continuity/reconnect event identity was not measured independently of normal world reads.
- Client closure was initiated, but bridge/upstream cleanup was not confirmed from logs or metrics.
- Observer reads against owner/mutation routes were bounded to one hidden owner route and one rejected POST; this is not a complete endpoint inventory audit.

No evidence in this report authorizes widening the observer allowlist or making an availability/capacity claim.

