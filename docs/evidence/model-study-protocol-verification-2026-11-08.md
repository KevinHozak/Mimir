# S003 offline verification — 2026-11-08

Scope: [preregistration](../model-study-protocol.md), [manifest](../model-study-protocol.json), standalone budget guard and owned-worker supervisor. Based on main `b5f6997` plus the manifest-hashed local study files. Earlier S015/S002 documentation drafts were preserved. No live credentials or endpoints were used.

- `npm run build`: passed all four packages including web type checking. Vite reported its existing large-chunk advisory; build exited 0.
- `node --test scripts/model-study-guard.test.mjs packages/engine/dist/first-glow-context.test.js packages/engine/dist/first-glow-history.test.js packages/engine/dist/first-glow-hybrid-runtime.test.js packages/engine/dist/first-glow-staging-effects.test.js packages/engine/dist/first-glow-interpretations.test.js`: 21 tests passed, 0 failed. Coverage includes durable reservation-before-dispatch, failed-charge retention, attempt/budget caps, concurrency, UTF-8 size, timeout/kill, privacy, replay and server-authoritative effects.
- `node --test scripts/model-study-supervisor.test.mjs`: 2 tests passed, 0 failed. A separate parent deadline terminated a worker with a blocked event loop; operator stop terminated the owned worker.
- `node scripts/model-study-protocol.mjs`: checked source fingerprints, content-addressed bundle, matched initial identities and repeated all twelve rules-only checkpoint hashes. The freeze occurred before any model or human outputs. No historical report was overwritten.

Limits: all transport failures are synthetic. No real model arm, human review, provider prices/terms, billing reconciliation, live adapter integration or supervisor-parent-loss handling was verified. Cooperative abort is not proof that a remote provider stops billing. The persistent lock blocks automatic restart, including after clean closure; no resume/reset tool is provided. Existing engine synthetic scenario tests do not establish current browser acceptance. S001 and S002 approval gates remain.

No publication or deployment was performed. The standalone controls must be integrated and tested against the actual S004 execution path before live admission; the protocol documents those checks explicitly.


## Integration follow-up — 2026-11-08

The earlier standalone-control limitations above describe revision 1. Revision 2 integrates the actual Vertex adapter wire request with durable cost reservation and a separate watchdog-owned transport worker. All execution in this follow-up uses synthetic transport; no real fetch branch was selected. The original revision-1 manifest is retained separately.

The initial six-arm integration exposed a duplicate same-pulse commitment ID, rejected only at the next pulse by the old runtime. The staging boundary now validates the complete candidate social state before it can be accepted. Its regression proves rejection preserves the existing commitment and trust. A subsequent review found a comparison confound: disabling the baseline evaluator while enabling it for the model arm varied staging as well as provider use. Both final arms therefore enable the same evaluator and vary provider eligibility only. Vanilla engine checkpoints remain separate deterministic reference fixtures, not predicted scored-arm outcomes. Earlier successful runs before this correction do not certify the final comparison.

The full four-package build, complete world-data/engine suite, server AI-runtime tests and seven verification-runner regressions passed after the engine repair. Restart testing initially failed at readiness; a diagnostic proved the local server listened but the sandbox rejected loopback health fetch with EACCES. The isolated restart-equivalence test passed with narrowly elevated localhost permissions, AI disabled and disposable databases. Initial sandbox failures are not application assertions or claimed passes.

Synthetic adapter checks passed for reservation-before-dispatch, complete wire size, missing live admission, missing/excessive usage, hidden evidence, malformed response, crash/timeout without retry, operator stop, prior allocations, and runner-process loss. Parent loss left one reserved attempt on disk, killed the owned worker and prevented reopening the same run. Real prices, account-specific terms, human engagement and remote billing behavior remain unmeasured. The final six-arm matched-path result is recorded after completion below.


### Matched-path and RC result

The RC-aligned full suite passed 15 tests on protocol revision 2 fingerprint `e653539846f99dc86b31747daff45d3b137957febfb43ac07a4c3b548bb092bc`. Six histories completed all 480 authoritative pulses, with twelve frozen engine-reference checkpoints independently repeated. The completed private report is `.tmp/model-study-integration/run-isqhm2/report.json`.

There were **zero eligible synthetic model requests** in the natural sample and nine recorded RC suppressions. The model-labeled arm therefore contains no real treatment contrast; no model quality or benefit conclusion is possible. No seeds, pulses, opportunities or Heroes were changed to obtain a more favorable sample. The real adapter serialization and worker transport were tested through separately labeled injected synthetic contexts. This feasibility finding is carried forward in S004 before any live approval.

A final non-simulation tightening retains observed usage and latency receipts without claiming settled billing, and stops admission immediately on an invalid evidence boundary. The source/compiled-runtime manifest is refrozen at `00c9fd5080421b7edb8b8de71bc4b5a71641e15373a85589c1a71436d2e8f823`; seeds, metrics, authority and RC behavior are unchanged. The final receipt/privacy checks also rerun the natural histories; their completion is recorded below.


### Final source acceptance

Final revision-2 protocol hash: `00c9fd5080421b7edb8b8de71bc4b5a71641e15373a85589c1a71436d2e8f823`.

The final fault/integration rerun passed **16 tests, 0 failures**, including all six ordinary-play histories and the stricter immediate privacy stop/usage receipts. The test-name filter also included the ordinary-play case, so its final source was exercised through all 480 pulses again; it was not merely inferred from the earlier run. Elapsed test time was 385.761 seconds. The final report retains zero synthetic model requests and nine RC suppressions, consistent with the previous RC-aligned sample. The request adapter's observed usage and latency were verified separately using injected synthetic contexts; settled billing remains explicitly unknown and reservations are never released automatically.

Build and server runtime checks passed after the study-only timeout option; restart equivalence passed again with narrowly elevated localhost access. The normal server default remains one second. Seven verification-runner regressions passed, and the new `test:model-study` entry is included in future full local verification. No browser UI changed; no new human review or hosted acceptance is claimed. The full browser/operational `verify:local` suite was not run for publication because no publication was requested.

S003 is closed locally for technical readiness. S004 remains gated on review of the zero-request feasibility result, S001 human review, current provider/account/privacy/pricing admission, and explicit owner execution approval. No real provider calls, spending, cloud mutation, Git publication or deployment occurred.

Final private run receipt: `.tmp/model-study-integration/run-HcFeAg/report.json`.
