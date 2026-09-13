# Hosted-P14 authenticated live observer evidence

Date: 2026-09-13

## Delivered boundary

The hosted React surface keeps Google sign-in as the outer gate and offers two authenticated views:

- live observer reads use Firebase ID-token bearer authentication;
- the independent protected history archive remains at `?view=history`.

The hosted live build hides owner controls and never exposes `OWNER_TOKEN` to browser requests. The server remains the single writer.

## Deployment configuration

Build Firebase Hosting with:

```
VITE_LIVE_API_URL=https://<authenticated-live-observer-origin>
```

This is a public build-time URL, not a secret. The bridge must enforce Firebase ID-token verification and the approved-email boundary from Hosted-P11. No token or credential belongs in this repository.

If the variable is absent, a signed-in user gets a clear configuration state and can still open history playback. The deployed archive-only site therefore remains honest until the bridge ingress is configured and redeployed.

## Verification plan

Record deployment identity, approved/rejected sign-in outcomes without tokens, initial live state plus a subsequent SSE update, forced reconnect and VM restart equivalence, archive playback, API/SSE traffic, Firebase quota/cost observations, and Storage retry outcome.

No deployment or VM mutation was performed by this change.
