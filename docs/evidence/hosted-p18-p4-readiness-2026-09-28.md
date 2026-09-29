# Hosted-P18-P4 readiness and rehearsal plan — 2026-09-28

## Disposition

**Not ready for a hosted audience rehearsal; measurements not collected.** The initial desk review used repository evidence and local GitHub issue status; the supplemental check below performed one read-only authenticated page visit. No multi-viewer load, configuration/access change, paid resource creation, or writer operation was performed. No capacity, availability, or cost claim follows from these checks.

The GitHub issue sequence records P1 (#254) completed and P2 (#255) and P3 (#256) closed as not planned. The parent issue #253 marks #255 and #256 complete, while both child issues are closed as not planned with unchecked acceptance lists and the retained P2 evidence records remaining cases; this is a planning/status mismatch, not proof those cases passed. In particular, #255's token rejection and authenticated SSE cases and #256's bridge restart, outage replay, writer verification, and rollback identity remain prerequisites to safely evaluating the P4 hosted audience path.

Hosted-P17 (#201) remains the historical closeout with explicit limitations. Parent #253 supersedes its remaining operational gates through the ordered #254–#257 follow-ups. Keep #201 closed as a historical record; keep #253 open until #257 and its parent disposition are complete. This is a traceable disposition, not a production-readiness decision.

The latest retained console evidence is [Hosted observer live status — 2026-09-26](hosted-live-status-2026-09-26.md). It mapped the displayed Hosting release suffix to retained version `82cc93e9b9470f8e` and source commit `fbd4eb8`, which was behind `origin/main` at the review time. It recorded bridge revision and traffic from a read-only console view, with no source/build linkage and no populated seven-day metrics. It did not test desktop/mobile rendering or authenticated assets in a fresh browser session. Those values are dated observations, not current service identity or load measurements.

## Rehearsal plan for a separately authorized safe window

Proposed upper bound: two concurrent authenticated observer sessions for at most three minutes, using only existing approved identity or identities. If both sessions use one identity, report that this covers concurrent clients but not distinct-user behavior. Do not create identities, widen access, change deployment, or exercise owner/mutation routes. Before starting, record the current release/source identity, bridge revision and traffic, rollback identity, actual observation start/end, operator, and cleanup path. If rollback identity, approved audience limit, or an isolated environment cannot be verified, stop before generating traffic.

1. In desktop and mobile-sized authenticated browser sessions, capture successful page rendering and required asset requests. Record viewport, timestamp, route/status, asset bytes, and cache headers; redact identity details.
2. Within the approved audience limit and a fixed observation window, add viewers in small increments. Observe request totals, active SSE streams, statuses, transferred bytes, cache behavior, bridge/VM CPU and memory, service quotas, and billing telemetry. Record each source and timestamp.
3. Stop adding viewers on any auth regression, elevated error rate, unexpected writer/scheduler/database activity, resource threshold breach, or loss of rollback confidence. Close every client session, verify stream count returns to baseline when telemetry permits, and record cleanup and final service/writer identity.
4. Report values as measured only when a timestamped console/export or client capture supports them. Mark absent telemetry as unknown; do not extrapolate a capacity ceiling or projected bill from this bounded sample.

No test plan can substitute for the issue's required bounded window and cleanup evidence. P4 remains open until that rehearsal is authorized and its results, including dated public-safe documentation updates and a traceable disposition of Hosted-P17 (#201) and parent #253, are recorded.

## Values at this review

| Measure | Result | Evidence status |
| --- | --- | --- |
| Desktop rendering | Visually checked at 1635 × 916 | Pass; no per-request asset status/byte capture |
| Mobile rendering | Not rechecked | Unknown |
| Audience rehearsal / active streams | Not run; proposed cap is two sessions for three minutes | No sample |
| Request counts, statuses, bytes, cache | Not measured | No sample |
| Bridge/VM load and quotas | No populated current telemetry retained | Unknown |
| Observed billing | No Mimir-hosting bill attributed | Unknown; unrelated project detail excluded; no estimate made |
| Rollback identity for a new rehearsal | Not established in this review | Required before test |

Public evidence intentionally omits account email, project number, bucket identity, billing identifiers, and budget details.

## Supplemental read-only browser check — 2026-09-28 19:57 CDT

The authenticated live observer at `https://mimir-realm.web.app/` reached its connected state in an existing browser session. At a 1635 × 916 desktop viewport, the First Glow identity, light-mark image, world canvas, observer controls, Spark detail panel, recorded-choice panel, and Spark cards/dilemmas were visibly rendered. The page showed pulse 0, 12 Sparks, and 7 sites. No observer or owner control was activated and no simulation mutation was requested. The inspection tab was closed afterward; server-side stream release was not observable. This is a desktop visual smoke pass only; the browser view did not expose per-request status codes or transferred-byte/cache measurements.

Mobile viewport rendering was not verified. The Mimir VM Observability page opened read-only, but its chart area displayed no metrics, so current VM CPU/memory could not be recorded. No multi-viewer traffic was generated and no billing value was attributed to the hosted service. The inspected billing detail was not attributable to the Mimir hosting resources and is excluded. The page's signed-in identity is intentionally omitted.

## Updated acceptance status

| Acceptance area | Current evidence |
| --- | --- |
| Desktop rendering | Visual smoke pass at 1635 × 916; no request-level asset status/byte capture |
| Mobile rendering | Not verified |
| Multi-viewer window and cleanup | Proposed cap of two sessions for three minutes; actual observation window and cleanup not performed |
| Request, stream, status, transfer, and cache measurements | Not collected |
| Bridge/VM load and relevant quotas | Current VM chart blank; bridge/VM load unknown |
| Observed billing | No Mimir-hosted-service billing value attributable from available view |
| Rollback identity | Not established for a new rehearsal |
