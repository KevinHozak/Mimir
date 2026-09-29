# Hosted-P18-P4 readiness and rehearsal plan — 2026-09-28

## Disposition

**Not ready for a hosted audience rehearsal; measurements not collected.** This review used repository evidence and local GitHub issue status only. It did not open authenticated production pages, send hosted requests, change access, create paid resources, or touch the live writer. No capacity, availability, or cost claim follows from this review.

The GitHub issue sequence records P1 (#254) completed and P2 (#255) and P3 (#256) closed as not planned. Their stated acceptance work is consequently not demonstrated by completed evidence. In particular, #255's token rejection and authenticated SSE cases and #256's bridge restart, outage replay, writer verification, and rollback identity remain prerequisites to safely evaluating the P4 hosted audience path. Issue status is planning metadata; this document records evidence gaps, not successful behavior.

The latest retained console evidence is [Hosted observer live status — 2026-09-26](hosted-live-status-2026-09-26.md). It mapped the displayed Hosting release suffix to retained version `82cc93e9b9470f8e` and source commit `fbd4eb8`, which was behind `origin/main` at the review time. It recorded bridge revision and traffic from a read-only console view, with no source/build linkage and no populated seven-day metrics. It did not test desktop/mobile rendering or authenticated assets in a fresh browser session. Those values are dated observations, not current service identity or load measurements.

## Rehearsal plan for a separately authorized safe window

Use only the existing approved authenticated observer and its existing isolated client sessions. Do not create identities, widen access, change deployment, or exercise owner/mutation routes as part of this rehearsal. Before starting, record the current release/source identity, bridge revision and traffic, rollback identity, observation window, operator, and the approved cleanup path. If rollback identity or an isolated environment cannot be verified, stop before generating traffic.

1. In desktop and mobile-sized authenticated browser sessions, capture successful page rendering and required asset requests. Record viewport, timestamp, route/status, asset bytes, and cache headers; redact identity details.
2. Within the approved audience limit and a fixed observation window, add viewers in small increments. Observe request totals, active SSE streams, statuses, transferred bytes, cache behavior, bridge/VM CPU and memory, service quotas, and billing telemetry. Record each source and timestamp.
3. Stop adding viewers on any auth regression, elevated error rate, unexpected writer/scheduler/database activity, resource threshold breach, or loss of rollback confidence. Close every client session, verify stream count returns to baseline, and record cleanup and final service/writer identity.
4. Report values as measured only when a timestamped console/export or client capture supports them. Mark absent telemetry as unknown; do not extrapolate a capacity ceiling or projected bill from this bounded sample.

No test plan can substitute for the issue's required bounded window and cleanup evidence. P4 remains open until that rehearsal is authorized and its results, including dated public-safe documentation updates and a traceable disposition of Hosted-P17 (#201) and parent #253, are recorded.

## Values at this review

| Measure | Result | Evidence status |
| --- | --- | --- |
| Desktop/mobile rendering and authenticated assets | Not rechecked | Unknown |
| Audience rehearsal / active streams | Not run | No sample |
| Request counts, statuses, bytes, cache | Not measured | No sample |
| Bridge/VM load and quotas | No populated current telemetry retained | Unknown |
| Observed billing | No billing observation retained | Unknown; no estimate made |
| Rollback identity for a new rehearsal | Not established in this review | Required before test |

Public evidence intentionally omits account email, project number, bucket identity, billing identifiers, and budget details.
