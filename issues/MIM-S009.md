---
depends_on: ["MIM-S006"]
id: "MIM-S009"
parent: ["MIM-E002"]
priority: "medium"
schema_version: 1
status: "in_review"
title: "Verify bridge restart and archive replay during VM outage"
type: "enhancement"
---
## Outcome

Bounded bridge reconnect, cold archive replay while the VM is terminated, retained live recovery, timed state attestation and automatic rollback/cleanup are verified within the approved two-observer/180-second envelope. Cold-start evidence alone is not continuity proof, and no broader access or availability claim follows.

## Source and scope

docs/hosted-observer-runbook.md

## Acceptance

- [x] Use isolated automated fault tests before any live outage rehearsal.
- [x] Verify explicit reconnect behavior across bridge restart.
- [x] Verify authorized archive replay during a bounded VM outage and preserve recovery evidence.
- [x] Complete all approved recovery/readiness attestations and full rollback/process cleanup within the bounded rehearsal deadlines.

## Implementation and automated verification

The browser harness owns a navigation-independent cutoff and at most two observers. Readiness requires a complete event baseline, original-process final-zero record, actual replacement routing/stream and a fresh independent watchdog. Original stream cancellation happens before traffic moves; a denied request keeps the original process scheduled to finish cancellation. Late browser delivery cannot reject a stop already recorded before T+30, while late gate/stop records still fail.

The independent worker restores the exact full service spec, overlaps its read-only audit with VM boot, accounts for all observed live requests/streams, requires direct zero counters and a calibrated post-restart original stream, and deletes only the verified unused owned candidate. The phase runner closes clients automatically on success or failure. Local tests cover protected-revision refusal, stale/missing zero evidence, controller death, deadline fallback, audit/history mismatches and delayed handoffs.

Passing checks: 19 browser-harness/phase-runner tests, 24 controller/watchdog/audit tests, rehearsal stop thresholds, HTTP/2 cancellation, bridge lifecycle and the browser auth/session/outage suite. Isolated process-crash/restart proof remains distinct from hosted immutable revision replacement; no public kill endpoint or in-flight Cloud Run crash claim is introduced.

## Verified hosted acceptance — 2026-10-23

[Complete measured evidence](../docs/evidence/hosted-outage-cleanup-2026-10-23.md) and [structured results](../docs/evidence/hosted-outage-cleanup-2026-10-23.json) record successful run 27:

- Readiness at T+28.921 and graceful stop request at T+29.139.
- Two checksum-verified cold scenes (pulses 64/48), bracketed by fresh TERMINATED VM reads, complete at T+87.220.
- Restart requested 59.432 seconds after stop, within the approved 80 seconds.
- Identical live Spark/Follow/presentation/zoom/event state recovered at T+137.692; clients closed automatically at T+137.808.
- Integrity/history/single-writer/backup attestation passed at T+141.125, before T+160.
- Full-spec rollback, all three observed process sessions at zero, and owned-revision deletion/absence verified automatically at T+161.056, before T+180.

The world remains archived and paused at pulse 64 with unchanged history hashes. Original configuration/traffic is restored, all three candidates from this task are absent, no owned recovery/audit workers remain, and the existing history pane is restored. Fresh independent recovery backups restore with eight bundle files. No provider call, simulation pulse, writer upgrade, new IAM grant, audience expansion or archive publication occurred.

## Earlier evidence and delivery boundary

[Initial readiness attempts](../docs/evidence/hosted-outage-readiness-2026-10-23.md), [failed original VM budget](../docs/evidence/hosted-outage-retry-2026-10-23.md), [80-second preparation](../docs/evidence/hosted-outage-80s-retry-2026-10-23.md) and [functional replay with late cleanup](../docs/evidence/hosted-outage-readiness-fix-2026-10-23.md) remain historical evidence. Their failures and later clock correction are preserved, not relabeled as passes.

Status is in_review: operator code and evidence remain local and uncommitted. The full local verifier is required before PR publication and was not rerun for this change set. Hosted frontend assets and the pinned bridge image are unchanged. [MIM-S010](MIM-S010.md) remains the separate audience/capacity/cost decision.
