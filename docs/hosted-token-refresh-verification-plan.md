# Bounded hosted token-expiry and refresh verification plan

Prepared 2026-10-24 for [MIM-S008](../issues/MIM-S008.md). **Plan only; execution is not approved or performed.** The [recorded readiness decision](hosted-observer-readiness-decision.md) retains limited staging and holds expansion.

## Purpose and evidence boundary

Prove genuine Firebase-issued token refresh against the existing hosted bridge, observer continuity, and cleanup. Existing synthetic transport/Chromium coverage proves local behavior, not real Firebase clock-driven refresh. S007 proves genuine expired-token denial separately; S009 proves hosted recovery and final-zero cleanup separately. Do not relabel those as this missing integrated journey.

Firebase ID tokens normally last one hour ([Firebase session documentation](https://firebase.google.com/docs/auth/admin/manage-sessions)). A fresh token cannot naturally expire during a three-minute observer session. Preparation must age a real token without keeping an observer stream open. SDK proactive refresh can occur before expiry; forced refresh and automatic refresh are different cases and must be reported separately.

## Fixed scope and admission gates

- Existing approved Google/Firebase Mimir identity and unchanged allowlist, IAM and hosted endpoints only. No new account, temporary signer, test project, public endpoint, bridge revision, deployment or VM disruption.
- One observer client per trial, never more than two total concurrent observers including any existing user session. At most 120 seconds of active observation and **180 seconds overall per admitted trial**, including cleanup. Use an independent monotonic hard cutoff that survives navigation. No automatic retry or second trial after a failed gate.
- The **USD 0.15 cumulative ceiling includes all earlier S010 work**. Carry USD 0.1469663581 conservative allocation and only USD 0.0030336419 unreleased headroom. Do not transfer this experiment into a new budget to evade that cap. No live execution until fresh attributable billing or a defensible all-in upper bound proves preparation, both proposed cases, telemetry, networking, requests, idle resources and cleanup fit the remaining allowance. Unknown quantities remain reserved. Do not assume credits or free tier. Current cost admission is **NOT VERIFIED**.
- Verify exact deployed frontend/bridge revisions and that production observer refresh/rotation code is actually present before running. Merged main is not proof of deployment. If absent, stop and prepare a separately authorized deployment; do not silently update it.
- Verify read-only operator telemetry, clock uncertainty, direct per-process stream/request counts and existing baseline sessions. If deployed counters cannot establish closure without a temporary revision or extra access, stop and report the instrumentation prerequisite.
- Establish unchanged paused pulse-64 history/checkpoint hashes, one writer, integrity and independent-backup health. Limit any baseline/cleanup reads and price them. No pulses, provider calls, archive publication or history writes.

## Credential preparation without an observer session

Use a dedicated isolated local browser context with the existing approved user, normal sign-in, and memory-only Firebase persistence. This context is distinct from the user's signed-in tab; never sign that tab out. Do not copy existing browser tokens, export cookies, persist token fixtures, print JWTs/claims/headers, or record auth request/response bodies, HAR, video or traces containing credentials. Evidence records only relative expiry timing, token-changed boolean, status codes, counts and non-secret revision identifiers.

Harness preparation must use the real SDK through supported APIs, with no forged signature, changed clock, patched expiry, intercepted auth response or token revocation. A captured genuine token may age only in harness memory while observer data/SSE requests are disabled. Set a finite proposed preparation cap of 75 minutes and destroy the isolated context on timeout. Include any SDK background refresh requests in cost accounting and the final approval; this plan authorizes none of them now. Verify in local dry runs that the hour-long preparation cannot accidentally open a hosted observer stream or reset a trial cutoff.

## Two separately reported cases

1. **Naturally expired credential, real forced refresh.** Retain one genuine originally valid token in harness memory until its actual expiry plus verified verifier clock allowance. In a reviewed harness using the production read-only transport and genuine Firebase SDK, send that original token for one protected read; expect 401 with no private body, followed by exactly one forced SDK refresh and a successful retry. Never inject a synthetic 401. This deliberately supplies a stale initial credential and proves the real forced-refresh path, not automatic SDK refresh. Open one stream with the real refreshed credential, verify baseline identity and close it. Report this harness result separately from deployed UI acceptance.
2. **Real SDK refresh and deployed UI continuity.** With the unchanged deployed observer, admit a short observation window only when a genuine SDK refresh boundary can be observed within that window. Use supported SDK observation in an isolated browser harness; do not assume a fixed refresh lead time or reset the clock/cutoff. Capture a real token-change/refresh event and replacement authenticated stream while preserving Spark selection, Follow, presentation, zoom, timeline/pulse and event identity. If the SDK already refreshed during preparation or the boundary cannot be admitted safely, return blocked/inconclusive rather than extending the session. A manual `getIdToken(true)` is optional separately labeled diagnostic evidence and cannot pass automatic-refresh acceptance.

Implementation must resolve the supported deployed-SDK observation hook and trigger timing locally before approval. Standalone SDK/transport harness and independent browser supervisor are now implemented and locally tested; the deployed-UI observation and live integration bindings remain unverified. Never create an authenticated automation backdoor in the hosted app.

## Proposed trial timeline and assertions

T+0 begins before the first protected observer request. Establish protected baseline by T+30; complete the intended refresh/reconnect by T+90; close all owned observer clients by T+120; establish direct zero counts for every observed process and independent recovery/baseline readback by T+160; finish context/worker disposition by T+180. Automatic close must occur even on driver death or navigation. Failure of a deadline, private-data boundary, auth check, duplication check, cost bound or resource invariant stops the trial; cleanup still runs and an incomplete proof remains failed.

Require no UI errors, no duplicated committed event identities, no unauthorized private response on denial, no mutations, bounded transient overlap (never above the two-observer ceiling), and zero owned streams/retry timers after closure. Do not assume an already-open SSE stream is revalidated at JWT expiry: measure the behavior and distinguish request-time auth from token-change-driven rotation. No security-policy change is part of this plan.

## Recovery, cleanup and approval packet

No cloud configuration is intended to change, so rollback means closing owned clients and workers, discarding the isolated credential context, verifying observed process counters return to their baseline (zero owned streams; do not cancel unrelated sessions), and confirming exact service/traffic/revision, paused world, history, one writer and backups remain unchanged. Any unexpected mutation fails the run and needs a scoped recovery decision; never delete or reset a live database.

Before requesting execution approval, provide: reviewed automated harness and local failure/deadline tests; exact deployed versions and observation method; verified real-token aging/refresh timing; bounded all-in cost calculation under the existing cumulative cap; operator/account boundary; process-aware baseline/cleanup proof; and exact trial/preparation schedule. The owner then approves a specific run, not an indefinite monitoring session. Today only this plan and issue updates are recorded.

## Completion criteria

- [ ] Real expired-token 401 followed by genuine Firebase forced refresh and successful protected retry.
- [ ] Automatic real SDK token-change/stream rotation on the deployed UI, with retained observer state.
- [ ] Direct cleanup and unchanged recovery invariants within each 180-second window.
- [ ] Cumulative conservative cost remains within USD 0.15; final attribution and uncertainty recorded honestly.
- [ ] Redacted evidence distinguishes forced, automatic, local, deployed and blocked cases.


## Implementation and readiness update — 2026-10-24

See [local harness/read-only readiness evidence](evidence/hosted-refresh-preparation-2026-10-24.md) and the [blocked approval packet](hosted-token-refresh-approval-packet.md). No real-token/live run occurred, and the completion criteria above remain unchecked. The SDK adapter uses supported [Firebase Auth APIs](https://firebase.google.com/docs/reference/js/auth), including in-memory persistence and token-change observation. Local clock simulation is confined to synthetic tests; live clocks/tokens are never patched.
