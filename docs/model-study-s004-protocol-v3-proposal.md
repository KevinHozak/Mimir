# S004 protocol revision 3 — proposal

Prepared 2026-11-08 following the [zero-opportunity investigation](evidence/model-study-zero-opportunities-2026-11-08.md). Original proposal; subsequently implemented and verified offline. See the [active v3 protocol](model-study-protocol.md) and [verification](evidence/model-study-v3-verification-2026-11-08.md). This proposal document itself remains non-executable and grants no provider access. Machine-readable [proposal](model-study-s004-protocol-v3-proposal.json). This document does not replace [archived revision 2](evidence/model-study-protocol-v2-2026-11-08.txt) or change its manifest.

## Question and retained controls

Retain the S002 question: does bounded model assistance improve an observer's explanation and recall of a Spark's recorded choices/consequences versus matched rules-only choices? Retain the four-point immediate explanation rubric, ten-minute delayed recall, interest 1–5, evidence-location time, exploratory paired decision rule and all privacy/authority/replay gates. No philosophy or choice is the designated winner.

Keep seeds 2/4/8, six ordinary Sparks, First Glow RC1, no natural Heroes, 80 authoritative pulses, checkpoints 0/16/40/80, the same authored bundle and paired initial states. Keep at most 24 outbound attempts total, eight per seed, concurrency one, zero retries, 16 KiB wire input, 128 output tokens, ten-second request/evaluator deadlines, 30-minute generation window, and a proposed USD 1 cumulative all-in ceiling. No provider/model/account/region is newly approved. Retain full uncertain reservations and all existing stop/retention controls.

## Changes proposed from pilot evidence

| Dimension | Revision 2 | Proposed revision 3 |
| --- | --- | --- |
| RC admission | Look for an already-created actor/pulse slot that the runner never produces | Request/record RC admission on the natural eligible event, in the authoritative transaction, before considering provider dispatch |
| Suppression | Throw inside provider callback, producing generic provider-error fallback | Dedicated RC/cadence/duplicate suppression before provider invocation; zero attempts and zero provider failures |
| Focal Spark | Spark 1 | Spark 6 in every arm/seed |
| Review checkpoint | 40 | 80, with an exact link back to the admitted natural event if one exists |
| Coverage gate | No minimum successful exposure check | Offline integrated preflight must show at least one natural admissible focal-Spark opportunity per seed; live results separately record whether a real valid response occurred |

These choices are explicitly informed by the offline pilot, not by unseen live outputs. Retain every seed; do not select a different Spark after reading model results. Spark 6 is selected because the same actor has the only late candidate in all three retained seeds. Pulse 80 is already in the frozen checkpoint set and follows those candidate events. No larger sample, invented encounter, increased RC or extra attention opportunity is proposed.

## Required admission integration before a new freeze

The implementation prerequisite is one server-owned RC admission stage shared by both arms, with provider eligibility as the sole treatment difference. Do not call the intention evaluator as a shortcut: it can create/interrupt intentions and would add a separate intervention. Do not pre-populate scheduler records or reinterpret counterfactual audit output as canonical history.

1. After ordinary authoritative actions, collect genuine supported event contexts in deterministic pulse/event/actor order. Preserve the existing meaningful-event classifier; routine activity does not become an AI trigger.
2. For a context passing the retained attention gate, consult the one persisted RC scheduler. Enforce the assignment's per-Spark/day capacity, global cap, duplicate-event/actor-slot protection, original cadence and no catch-up debt. Reuse an already owned slot at most once; otherwise request a new slot on that natural event. Do not consume another slot for a second context in the same opportunity.
3. Record the decision and a stable encounter/slot link in the same authoritative state/history boundary in both arms. A denied slot keeps a deterministic rules-only result with an explicit suppression reason and does not invoke the provider. Attention accounting must not hide denied scheduler decisions as failed network calls.
4. Only a model-arm admitted opportunity may reach the existing wire-level reservation/worker path. The rules arm must use identical scheduling/staging/recording but zero provider requests. The server validates every effect before commit, including duplicate social-state rejection.
5. New histories need explicit policy/version provenance and compatibility behavior. Do not migrate, relabel or continue a v2 checkpoint under changed admission semantics. Select the exact simulation/policy boundary during implementation and freeze source, compiled output, bundle and initial hashes after offline verification. This proposal does not invent an implemented engine version.

The diagnostic shadow scheduler suggests one available Spark 6 event per seed at 52/48/52. It does not prove the integrated result: changed bookkeeping may affect later contexts, and other authoritative consumers may own a slot. Integration must share the actual scheduler rather than create an independent model allowance.

## Offline preflight and fail/defer rules

Run fresh isolated rules-only and synthetic-model pairs under the revised integration, with all provider network paths disabled. No changes to the normal local world or hosted world. Preserve immutable journals, source identity, all candidate/suppression reasons, slot ownership, attempts, usage and accepted/rejected transitions. Use all three original seeds; retain failed and quiet histories.

Before live admission, require:

- At least one naturally admitted focal-Spark opportunity in each retained seed on the rules-only preflight. Verify the shadow prediction against actual records; list drift instead of assuming 52/48/52. If any seed still has none, defer this proposal without silently extending it.
- Deterministic repeatability of the rules-only path and paired opening identity. With a synthetic provider returning the exact rules baseline proposal, objective choices/effects should match; explicitly account for expected provider/usage provenance differences rather than equating full checkpoint hashes.
- Per-Spark RC1/day and global ceilings, slot deduplication across events/consumers/restart, and deterministic scheduling across both arms. Test pulse 4 suppression, a late natural candidate, repeated actor/pulse candidates and a day boundary. No implicit catch-up or forced encounter.
- Actual adapter/guard/supervisor regression checks, including privacy fail-stop, malformed output, no retries, missing usage, crash reservations, operator loss and independent deadline cleanup.
- Identical read-only World/Follow/Chronicle presentation of the saved study histories through the existing public projection. Private checkpoint JSON must not be shown directly to reviewers. Verify selected Spark 6, checkpoint 80, exact evidence scene, saved rules-only Chronicle, source labels, and provider-free replay. New narration/images are excluded.

A real run with no valid model response is treatment-not-delivered/inconclusive, not evidence that a model lacks benefit. Record every fallback and completed/missing outcome under intention-to-treat; do not rerun a seed or buy replacement calls to obtain a difference. Identical accepted choices in both arms are a valid result. A real response may differ from the rules baseline only within supported alternatives and knowledge; privacy, authority or accounting violations stop the study.

## Human procedure amendment

Keep seed order 2/4/8 and first-arm order rules/model/rules, opaque A/B mapping, reviewer consent and operator-bias disclosure. Both arms follow Spark 6 at checkpoint 80. Within the original eight-minute review window: World -> select Spark 6 -> Follow -> checkpoint 80 -> personal Chronicle -> exact cited choice/event -> return to the same study Spark. The historical/live labels must make the paused study endpoint explicit.

Use the same immediate four tasks, delayed recall after ten minutes without the history, interest rating and evidence-location timing. All primary/secondary metrics, thresholds and independent-review requirements are retained. At least one independent reviewer completes every pair. Do not coach only the model arm or make rejected proposals appear to be committed outcomes. Report zero/unchanged/absent consequences honestly.

## Approval and execution packet

Implementation and offline integrated verification precede any execution approval request. S001 review, S002 provider/account/region/model/privacy/current-pricing admission, a source-bound v3 manifest, reviewer arrangements, an all-in budget bound, kill/recovery receipts and a bounded execution window remain prerequisites. The owner must approve that concrete packet before any real provider interaction. No usable live approval file or credentials are created here.

The recommended next step is offline scheduler-admission integration and feasibility verification, not a live study or a wider seed search. A different duration, focal rule, endpoint, provider or increased allowance requires another recorded proposal and decision.
