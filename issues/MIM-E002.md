---
depends_on: []
id: "MIM-E002"
parent: []
priority: "medium"
schema_version: 1
status: "open"
title: "Verify hosted observer behavior before wider access"
type: "epic"
---
## Outcome

Resolve the explicitly retained hosting limitations through five bounded phases. Current supported envelope remains at most two observers for three minutes; preserve the single SQLite writer.

## Source and scope

docs/roadmap.md; docs/hosted-observer-runbook.md

## Acceptance

- [ ] Verify every linked phase before proposing broader access.
- [ ] Keep unverified cases and operational limits explicit; do not infer continuous availability.

## Child stories

- [MIM-S006 - Define the next hosted verification envelope](MIM-S006.md)
- [MIM-S007 - Verify expired and wrong-project tokens against live IAM](MIM-S007.md)
- [MIM-S008 - Verify token refresh and observer stream reconnection](MIM-S008.md)
- [MIM-S009 - Verify bridge restart and archive replay during VM outage](MIM-S009.md)
- [MIM-S010 - Rehearse and decide whether hosted access can widen](MIM-S010.md)
