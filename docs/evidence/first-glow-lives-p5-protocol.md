# First Glow Lives-P5 Study Protocol

Protocol date: 2026-09-20

This preregistration predates the study outputs. It evaluates whether ordinary First Glow play produces understandable, memorable individuals and whether an authorized bounded AI arm improves that experience relative to a matched rules-only control.

## Fixed design

- Runtime: First Glow only, schema 3, structured-v2, one explicitly recorded generated world bundle
- Seeds: 2, 4, and 8
- Conditions: dependable supply and scarcity
- Population: six Sparks
- Duration: four 64-pulse cycles per run
- Arms: rules-only and deterministic fake-provider AI control; live provider execution is a separate authorization gate
- Matched inputs: the same seed, bundle, event schedule, population, and environmental inputs are supplied to both arms
- Watched comparison: watched and unwatched runs receive identical recorded inputs and the same attention/model policy
- Replay: every AI run is replayed from recorded interpretations with a provider that fails if called
- Review: at least one reviewer must be independent of implementation and story generation; human responses are required for engagement claims

## Thresholds and decision rules

- Integrity gate: 100% valid context hashes, no hidden/future evidence, no provider calls during replay, no resource/state mutation by provider, and complete run manifests
- Accounting gate: no run exceeds its configured per-Spark or global attention cap; all calls, fallbacks, latency, and cost fields are recorded
- Repeatability gate: same-record replay and restart/recovery must reproduce the same sanitized outcome
- Benefit gate: not assessed by this offline fixture. It requires an authorized live AI batch and independent human review across World, Follow, and Chronicle
- Decision: report `proceed` only for one evidence-supported improvement, `one-scoped-improvement` when exactly one bounded improvement is justified, otherwise `defer`

## Exclusions and stop conditions

Exclude incomplete or corrupted manifests from benefit scoring but retain them in the disposition table. Stop a run on integrity failure, uncapped provider use, hidden evidence, or a failed replay. Do not inject social decisions, select attractive chapters, add Anchors, grant watching an intelligence advantage, or infer human engagement from synthetic scores.

## Budget and authorization

The checked-in study uses a local deterministic fake provider and zero paid-provider budget. Any live provider run must record provider, account, model, retention/data scope, kill switch, and hard cap before execution. No live provider or hosted recruitment is authorized by this protocol.
