---
depends_on: ["MIM-S006"]
id: "MIM-S008"
parent: ["MIM-E002"]
priority: "medium"
schema_version: 1
status: "in_review"
title: "Verify token refresh and observer stream reconnection"
type: "enhancement"
---
## Outcome

Local automated lifecycle coverage and selected recovery fixes are implemented. Genuine hosted Firebase refresh and Cloud Run cleanup acceptance remain unverified; simulation authority and the private audience ceiling are unchanged.

## Source and scope

docs/hosted-observer-runbook.md

## Acceptance

- [x] Automate expiration, refresh, reconnect and tab-close journeys.
- [x] Verify bounded stream cleanup and no duplicated committed outcomes.
- [x] Document unsupported cases or implement and verify a selected remedy.

## Local implementation and verification

Authenticated reads force-refresh once after 401; token notifications rotate the stream; clean EOF and network failures reconnect. Cancellation releases readers and stops retry timers. Synthetic Chromium journeys and failure-path checks run in the full local verifier; the signed-in observer browser test checks preserved zoom at five widths.

See [dated local evidence and unsupported live cases](../docs/evidence/observer-session-lifecycle-2026-10-23.md). The local full verifier passed all 71 steps on 2026-10-23. Live Firebase refresh and Cloud Run cleanup remain explicit acceptance limits; publication does not claim a hosted deployment or live Firebase acceptance.
