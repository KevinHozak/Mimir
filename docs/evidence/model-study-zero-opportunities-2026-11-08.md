# Why the S003 sample had zero model requests

Date: 2026-11-08. Scope: read-only investigation and a separate proposed S004 revision; no provider calls, world changes or live admission.

## Observed evidence

The final S003 private artifact set is `.tmp/model-study-integration/run-HcFeAg/`, tied to frozen protocol hash `00c9fd5080421b7edb8b8de71bc4b5a71641e15373a85589c1a71436d2e8f823`. The [machine audit](model-study-opportunity-audit-2026-11-08.json) records input-file hashes and verifies all 24 reported checkpoint hashes. All six histories finished 80 pulses. The model arms contain nine legacy attention candidates, zero RC decisions and zero created RC slots. This is not evidence that all nine candidates were inherently too early for RC.

| Seed | Spark 5 discovery | Spark 6 discovery | Spark 6 Wild Cache | Recorded RC slots | Shadow admissible event |
| --- | --- | --- | --- | ---: | --- |
| 2 | pulse 4 | pulse 4 | pulse 52 | 0 | Spark 6 at 52 |
| 4 | pulse 4 | pulse 4 | pulse 48 | 0 | Spark 6 at 48 |
| 8 | pulse 4 | pulse 4 | pulse 52 | 0 | Spark 6 at 52 |

RC1 phase offsets are 26/27/28/29/30/31 for Sparks 1–6. The early discoveries occur before the acting Sparks' offsets. Wild Cache occurs after Spark 6's phase 31 and before day end 63; the existing scheduler helper would admit it if called on that natural candidate, provided its slot is otherwise unused.

## Root cause and owning boundary

`createFirstGlowState` initializes RC metadata. `advanceWorld` advances ordinary actions and `FirstGlowServerAIRuntime.evaluate` applies the older event-attention path; neither calls the RC scheduler. `studyEligibility` is a passive consumer that requires a created scheduler record for the exact actor/pulse. Its condition is therefore unreachable in this runner. `requestFirstGlowReflection` is called by `evaluateFirstGlowIntention`, but repository call-site search finds that evaluator only in intention tests and the standalone RC evaluation script, not the normal pulse or current study execution path.

Thus a longer run of this same wiring would not cure the missing record producer. This conclusion follows from the call graph; no larger seed search or extended simulation was run. S003's transport, reservation and shutdown tests remain valid, but the earlier description of the study using an already operational RC path overstated what had been integrated. Live comparison readiness was not established.

The nine RC suppressions also appear as generic `provider-error` fallbacks because the eligibility check lives inside the provider callback. These were not failed network requests. A revision must give scheduler suppression its own pre-provider admission record and keep it out of attempted-call/error counters.

There is a second design mismatch: the old review follows Spark 1 at checkpoint 40, while all candidates involve Sparks 5/6 and the potentially admissible events are at 48/52. Reviewing at 40 cannot assess consequences of those later events.

## Counterfactual feasibility, not a repaired runtime

`model-study-opportunity-audit.mjs` replays only the nine already-recorded candidate identities through disposable copies of the original RC state. It enforces at most one use per Spark/day before consulting the existing scheduler helper. It never alters a checkpoint, actor, event, intention, RC policy or provider budget. Six early candidates remain cadence-suppressed; three later candidates would create a slot. These are shadow results, not newly recorded world opportunities.

This does not demonstrate successful end-to-end scheduling, a useful provider response, a visible downstream difference or model benefit. Scheduling records and suppression bookkeeping can affect later contexts; the proposed integration must be validated in fresh isolated offline paired histories before a new execution manifest is frozen. Identical model/rules choices remain valid findings; no extra calls may be used to force a difference.

## Verification

- `node --test scripts/model-study-opportunity-audit.test.mjs`: two tests passed. They cover no mutation of source RC state, same-day duplicate suppression, next-day availability and an early candidate remaining suppressed.
- `node scripts/model-study-opportunity-audit.mjs .tmp/model-study-integration/run-HcFeAg docs/evidence/model-study-opportunity-audit-2026-11-08.json`: 24 checkpoint hashes verified; nine candidates traced; zero historical slots and three counterfactual admissions reported. Output creation is exclusive and historical artifacts are read-only.
- Static call-site inspection used current source plus the compiled scheduler hash pinned by the v2 manifest. This is local source/artifact evidence, not a live deployment check.

[Proposed S004 revision 3](../model-study-s004-protocol-v3-proposal.md) keeps the sample size and resource ceilings, repairs the admission design, and moves the focal review to Spark 6 at pulse 80. It is not executable or approved. The frozen v2 manifest and controls remain unchanged.
