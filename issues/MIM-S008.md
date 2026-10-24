---
depends_on: ["MIM-S006"]
id: "MIM-S008"
parent: ["MIM-E002"]
priority: "medium"
schema_version: 1
status: "in_progress"
title: "Verify token refresh and observer stream reconnection"
type: "enhancement"
---
## Outcome

Local automated lifecycle coverage and selected recovery fixes are implemented. Genuine hosted Firebase expiry/refresh remains unverified. Hosted cleanup was subsequently verified under S009 and S010; simulation authority and the private audience ceiling are unchanged.

## Source and scope

docs/hosted-observer-runbook.md

## Acceptance

- [x] Automate expiration, refresh, reconnect and tab-close journeys.
- [x] Verify bounded stream cleanup and no duplicated committed outcomes.
- [x] Document unsupported cases or implement and verify a selected remedy.

- [ ] Verify naturally expired genuine credentials and a real Firebase forced-refresh retry under an approved bounded plan.
- [ ] Verify automatic genuine SDK token change and deployed UI stream rotation with retained selection and process-aware cleanup.

## Local implementation and verification

Authenticated reads force-refresh once after 401; token notifications rotate the stream; clean EOF and network failures reconnect. Cancellation releases readers and stops retry timers. Synthetic Chromium journeys and failure-path checks run in the full local verifier; the signed-in observer browser test checks preserved zoom at five widths.

See [dated local evidence and unsupported live cases](../docs/evidence/observer-session-lifecycle-2026-10-23.md). The local full verifier passed all 71 steps on 2026-10-23. Live Firebase refresh and Cloud Run cleanup remain explicit acceptance limits; publication does not claim a hosted deployment or live Firebase acceptance.


## Status reconciliation — 2026-10-24

Original local implementation merged in PR 316; the current exact-source full suite passed 76 steps for PR 320. Local acceptance stays checked. Reopened to in_progress for the explicitly unchecked genuine hosted follow-up above; synthetic proof does not close it. S009/S010 subsequently verified hosted process cleanup, superseding only that earlier limitation. The [bounded plan](../docs/hosted-token-refresh-verification-plan.md) is prepared, not executed or approved for execution. Cost admission, deployed-code parity and supported SDK observation remain prerequisites; the existing USD 0.15 cumulative ceiling and access limits are unchanged.


## Standalone harness and blocked live packet — 2026-10-24

Implemented production-transport harness with memory-only isolated SDK adapter, fixed approval/origin/cumulative-cost admission, bounded preparation, actual-expiry forced-refresh case, automatic-notification stream rotation and fixed-schema redacted reports. Independent IPC watchdog closes only the task browser on driver loss or absolute lease expiry. Eight synthetic harness tests and two supervisor tests plus TypeScript pass; new checks are wired into the full local verifier. Full-suite result is reported separately after execution.

[Fresh static/control-plane readiness](../docs/evidence/hosted-refresh-preparation-2026-10-24.md) found original bridge/private VM metadata but different deployed JS, no fresh direct-process/recovery attestation and no verified cost admission. The [live approval packet](../docs/hosted-token-refresh-approval-packet.md) is NOT READY. Supported deployed-UI observation and exact integration-driver bindings remain prerequisites. No real SDK sign-in, token aging, live observer, deployment, access change or provider call occurred. Both genuine hosted acceptance boxes stay unchecked. USD 0.15 remains cumulative; USD 0.0030336419 headroom is not released or new approval.
