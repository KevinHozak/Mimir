---
depends_on: ["MIM-S006"]
id: "MIM-S008"
parent: ["MIM-E002"]
priority: "medium"
schema_version: 1
status: "open"
title: "Verify token refresh and observer stream reconnection"
type: "enhancement"
---
## Outcome

Seamless in-flight refresh/reconnect without reload remains unverified. Test expected behavior and resource cleanup without changing simulation authority.

## Source and scope

docs/hosted-observer-runbook.md

## Acceptance

- [ ] Automate expiration, refresh, reconnect and tab-close journeys.
- [ ] Verify bounded stream cleanup and no duplicated committed outcomes.
- [ ] Document unsupported cases or implement and verify a selected remedy.
