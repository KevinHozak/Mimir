---
depends_on: ["MIM-S002"]
id: "MIM-S003"
parent: ["MIM-E001"]
priority: "medium"
schema_version: 1
status: "closed"
title: "Build a reproducible matched observer study protocol"
type: "enhancement"
---
## Outcome

Prepare fixtures and evaluation measures that separate navigation correctness from engagement or model benefit. Automate technical acceptance; keep subjective human outcomes explicitly unmeasured unless a separate review is performed.

## Source and scope

docs/living-lives-plan.md; docs/evidence/first-glow-lives-p5-study-2026-09-20.md

## Acceptance

- [x] Freeze seeds, checkpoints, comparable inputs and evaluation metrics before runs.
- [x] Automate identity, evidence, privacy, determinism and provider-free replay gates.
- [x] Document how technical results differ from engagement and real-model benefit.

## Offline protocol and controls — 2026-11-08

Frozen [protocol](../docs/model-study-protocol.md) and [machine manifest](../docs/model-study-protocol.json) identify the current authored bundle, source-file fingerprints, three matched openings, twelve rules-only checkpoints, focal Spark, reviewer order/tasks and scoring. No injected events or changed RC allowances are used in these fixtures.

Validation: full four-package build passed; 21 guard/engine regression tests passed for reservations, limits, identity, privacy, determinism, provider-free replay and authority; two independent worker-stop tests passed. The machine manifest checker repeated the frozen checkpoint hashes. See [verification record](../docs/evidence/model-study-protocol-verification-2026-11-08.md).

Offline planning criteria are satisfied. Keep in progress pending upstream S002 approval and actual S004 runner admission: these standalone controls are not connected to the real provider, and end-to-end wire/cost enforcement and supervisor-parent-loss recovery are not verified. No live provider calls, reviewer results, model-benefit finding or execution approval is implied. Preserve uncertainty reservations and fail closed on restart.

## Integrated controls completed locally — 2026-11-08

The user authorized integration and completion of the remaining technical checks without provider calls. The study now uses the existing Vertex adapter's actual wire serialization behind persistent reservations, independent absolute-deadline request workers, complete input/output validation, usage/latency receipts and fail-closed restart handling. A privacy-boundary rejection stops further dispatch immediately; other malformed/transport failures stop after two consecutive failures. Full worst-case reservations remain allocated regardless of adapter telemetry or missing final billing.

Both arms use the same server interpretation/staging path, with the same study-only ten-second evaluator limit. Normal application timeout defaults remain unchanged. Model requests must reuse recorded RC1 slots, at most once per Spark per 64-pulse day; suppressions are explicit and never manufacture encounters or capacity. Per-pulse journals preserve accepted/rejected transitions and interpretations, including incomplete histories.

The final matched-path/RC integration suite passed 16 tests, including all six seed/arm histories through pulse 80, audit receipts and immediate privacy-stop enforcement. The natural sample had zero eligible model requests and nine RC suppressions; it cannot support a treatment-benefit conclusion. Full build, engine/world-data suite, server runtime and localhost-enabled restart equivalence passed. The source manifest was reviewed and refrozen as revision 2; revision 1 is retained as historical evidence. See the [verification record](../docs/evidence/model-study-protocol-verification-2026-11-08.md).

Closed for offline technical readiness. S002's owner approval and account/model/privacy/pricing admission, S001 human review and the S004 execution decision remain outstanding. This closure grants no live access, calls, spend, rollout, commit, push or deployment. Changes remain local and uncommitted.

## Readiness correction from S004 investigation — 2026-11-08

[Follow-up evidence](../docs/evidence/model-study-zero-opportunities-2026-11-08.md) shows the ordinary runner never produces the RC records consumed by its passive gate. The transport/fault-control tests and zero-call historical results stand, but describing the overall RC integration as ready for a real comparison was too broad. S004 tracks a proposed shared scheduler-admission repair and new offline validation before any live admission. This correction does not rewrite the frozen v2 evidence or claim that the repair exists.
