# Hosted observer readiness evidence

Date: 2026-09-11

Status: **Private hosted-observer readiness validated; public exposure and durable production hosting remain unproven.**

## Readiness decision

The local First Glow evidence is compelling enough to justify a private hosted observer for continued observation. The autonomous 96-pulse review covers four fixed-control stories across three seeds each, preserves same-seed deterministic replay, and records material seed variation while keeping objective events, Spark-local knowledge, explanations, and consequences separate. It does not claim that the simulation is complete, universally representative, or ready for public production.

Primary local evidence:

- [First Glow autonomous story review](first-glow-autonomous-story-review.md): same-seed replay and material seed variation passed for abundance, scarcity, information-gap, and promise-breach scenarios.
- [First Glow long-season review](first-glow-long-story-review.md): four 24-pulse seasons preserve checkpoints and durable records, while documenting the earlier controlled-intervention limitations.
- [First Glow season review](first-glow-season-review.md): fixed-control baseline and evidence boundaries remain available for comparison.

## Acceptance checks

| Gate | Result | Evidence |
| --- | --- | --- |
| Hosting and persistence-disk pricing verified | Pass | Dated Google Cloud pricing snapshot and actual `e2-micro` plus 30 GB `pd-standard` shape in the [hosted observer runbook](../hosted-observer-runbook.md). |
| Local seasons justify a hosted observer | Pass with scope limit | Autonomous 96-pulse review shows deterministic replay and material seed variation; the reports retain known story and observer limitations. |
| Service survives restart without duplicate or partial pulses | Pass | Hosted service advanced from pulse 4 to pulse 28 through 24 authenticated pulses; after restart it remained at pulse 28 on the same timeline with 29 checkpoints and 330 events. |
| Independent recovery has dated evidence | Pass | [Hosted backup and recovery evidence](hosted-backup-recovery-2026-09-11.md) records the independent GCS transfer, fresh restore, continued pulse, and missing-asset failure. Local same-disk copies are not treated as disaster recovery. |
| Owner operations are token-protected | Pass | Unauthenticated hosted pulse returned HTTP 401; authenticated requests used the configured owner token. The VM environment file is `600 root:root` and was never printed. |
| Short hosted test season completes | Pass | 24 authenticated owner pulses returned HTTP 200, advancing the First Glow timeline from pulse 4 to pulse 28; `/api/report` recorded the expected active timeline, checkpoints, events, and First Glow summary before and after restart. |
| Deployed, tested, and unproven claims are separated | Pass | This report and the hosted runbook distinguish the private VM and tested recovery path from automatic cloud upload, exact post-cycle billing, public availability, multi-writer durability, and horizontal scaling. |

## Hosted test details

The private VM was `mimir-staging` in `mimir-realm`, `us-central1-a`, running Node 22, First Glow, `structured-v2`, and the `living-circuit` theme behind IAP. It had no external address. The scheduler was paused and the owner pulse endpoint was used so the test had an exact 24-pulse boundary.

Observed before restart:

```text
unauthenticated POST /api/pulse: 401
authenticated pulse requests: 24 × 200
timeline: timeline-689eb2a0-6926-471a-95ab-30dec9d81c02
pulse: 28
checkpoints: 29
events: 330
interpretations: 98
social mode: rules-only
```

After restarting `mimir-staging.service`, the same timeline remained active at pulse 28 with the same checkpoint and event counts. The service health endpoint returned `ok: true` and retained `schedulerPaused: true`.

## Remaining limits

- The service remains a private, single-writer SQLite staging observer. No public owner surface, multi-writer deployment, or production availability objective is approved by this issue.
- Cloud backup transfer is validated, but automatic upload and monitoring are not wired into the service.
- The `$10` budgets are alert thresholds, not hard spending caps; exact billed cost remains pending billing-cycle data.
- The local story evidence supports continued observation but does not establish universal behavior, completed narrative design, or a designated winning philosophy.
