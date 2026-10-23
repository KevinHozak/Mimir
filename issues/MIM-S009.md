---
depends_on: ["MIM-S006"]
id: "MIM-S009"
parent: ["MIM-E002"]
priority: "medium"
schema_version: 1
status: "open"
title: "Verify bridge restart and archive replay during VM outage"
type: "enhancement"
---
## Outcome

Cold-start evidence does not establish in-flight continuity or archive availability while the VM is stopped. Live disruption requires a separately approved window.

## Source and scope

docs/hosted-observer-runbook.md

## Acceptance

- [ ] Use isolated automated fault tests before any live outage rehearsal.
- [ ] Verify explicit reconnect behavior across bridge restart.
- [ ] Verify authorized archive replay during a bounded VM outage and preserve recovery evidence.
