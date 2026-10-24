---
depends_on: []
id: "MIM-E002"
parent: []
priority: "medium"
schema_version: 1
status: "in_progress"
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


## Current disposition — 2026-10-24

The owner recorded [retain limited staging / HOLD expansion](../docs/hosted-observer-readiness-decision.md). S006/S007 are closed; S009 is closed on merged timed recovery evidence; S010 is closed with the no-expansion decision. S008 is in progress for genuine hosted expiry/refresh under the [bounded plan](../docs/hosted-token-refresh-verification-plan.md). The epic remains in progress; child closure does not imply broad readiness.

### Outstanding gates

- [ ] Resolve or explicitly disposition final rehearsal-attributable billing and missing quantities; rounded project totals and disabled exports do not establish actual S010 cost. Retain all uncertainty reserves and the cumulative USD 0.15 ceiling.
- [ ] Complete S008 genuine hosted automatic refresh/expiry follow-up with separately approved cost and timing admission.
- [ ] Define intended workload/availability and obtain a new explicit decision before proposing any access expansion.

Current limits and single-writer policy are unchanged. No new live trial, provider use, deployment, billing configuration or access change is authorized by this reconciliation.
