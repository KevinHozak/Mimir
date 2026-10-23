---
depends_on: ["MIM-S006"]
id: "MIM-S007"
parent: ["MIM-E002"]
priority: "medium"
schema_version: 1
status: "closed"
title: "Verify expired and wrong-project tokens against live IAM"
type: "enhancement"
---
## Outcome

Automate genuine expired and wrong-project Firebase token rejection against the live observer boundary, using isolated approved fixtures and retaining no credentials or private response bodies.

## Source and scope

docs/roadmap.md; docs/hosted-observer-runbook.md

## Acceptance

- [x] Automate expired and wrong-project token rejection with bounded authorized fixtures.
- [x] Verify failures disclose no private state or credentials.
- [x] Record exact environment and distinguish local mocks from live IAM evidence.

## Delivery evidence - 2026-10-23

All 28 live requests passed through both Cloud Run and Firebase Hosting, including fresh positive controls around the 24 genuine expired/wrong-project rejections. Four further requests proved that the still-fresh fixture lost access after allowlist restoration, before user deletion. Google signatures, natural expiry, and matching isolated identities were verified.

Original serving revision, traffic, audience, pinned image, and remaining runtime settings are restored. Temporary users, conditional signing bindings/accounts, allowlist revision, and local token files are removed. The disposable fixture provider setting is restored and its project is DELETE_REQUESTED. Independent read-back and final focused regressions passed. No world mutation, VM restart, paid provider call, or billing linkage occurred.

[Live evidence](../docs/evidence/hosted-auth-live-fixtures-2026-10-23.md) separates actual cloud acceptance from local RSA/canary tests, the earlier baseline, and preparation failures. [Fixture setup](../docs/hosted-auth-fixture-setup.md) records the approved scope and Windows rollout preflight. The full local verifier passed all 70 steps before cloud execution; final authentication and five operation regressions passed after cleanup. Live acceptance and cleanup are complete; publication uses the full local verifier and PR workflow.
