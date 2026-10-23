---
depends_on: ["MIM-S006"]
id: "MIM-S009"
parent: ["MIM-E002"]
priority: "medium"
schema_version: 1
status: "in_progress"
title: "Verify bridge restart and archive replay during VM outage"
type: "enhancement"
---
## Outcome

Cold-start evidence does not establish in-flight continuity or archive availability while the VM is stopped. Live disruption requires a separately approved window.

## Source and scope

docs/hosted-observer-runbook.md

## Acceptance

- [x] Use isolated automated fault tests before any live outage rehearsal.
- [x] Verify explicit reconnect behavior across bridge restart.
- [ ] Verify authorized archive replay during a bounded VM outage and preserve recovery evidence.

## Local implementation and pending live acceptance

The first two acceptance items are verified by isolated automated browser/process tests, not hosted disruption. Tests cover process SIGKILL/restart, real backend loss/recovery, retained outcomes/zoom, no duplicate event IDs, cold protected archive replay on desktop/mobile, corrupt/unauthorized rejection and zero backend replay requests. A live reflection request in shared historical explanations was removed; the live observer uses its existing authenticated projection.

[Local evidence](../docs/evidence/observer-outage-2026-10-23.md) and [bounded live proposal](../docs/hosted-outage-rehearsal-plan.md). The live VM-outage acceptance item remains pending approval and execution. The proposal records fresh control-plane reads and requires source delivery, backup/restore, signed-in observer and independent recovery-watchdog gates before disruption; revision replacement does not prove an in-flight Cloud Run crash. Full local verification is required before delivery.
