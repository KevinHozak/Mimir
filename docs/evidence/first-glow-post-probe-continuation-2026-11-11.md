# Bounded post-probe continuation — local, 2026-11-11

Implemented and verified locally; uncommitted and unpublished. No providers, live database changes, deployment or history upgrades. Follows the [surveyed-shard diagnosis](first-glow-shard-follow-up-diagnosis-2026-11-11.md). [Structured results](first-glow-post-probe-continuation-2026-11-11.json). S001 remains open.

## Implemented behavior

Fresh callers can explicitly enable `{ postProbeContinuation: true }`, persisting `post-probe-continuation-v1`. Missing policy preserves old transitions; unknown versions, malformed survey/goal/pin state and altered preceding budgets reject. Initialization refuses recorded histories. Default server startup/reset remain unchanged. The initializer supplies validated completion, initial cache choice and recovery admission when absent; it does not require a public pattern or invent an encounter, survey or retry.

An **actual successful survey**, in its recorded arrival pulse, creates one retained goal for that surveyed shard/cache/navigation revision. It survives care, recovery and sharing rather than losing its priority after one decision. At a discretionary choice it resumes before unrelated marking. Sharing, current charge needs and the existing social care preference still take priority.

The shared search now also supports the final shard objective. It budgets actual moving pulses and one completion/activity pulse, requiring zero deficit, enough charge for the entire final leg, positive projected readiness afterward, and departure readiness of at least 70 or **90 when care prefers shelter**. Search remains bounded to 32 draws/11 rests per stop. Real preceding initial preparation, or the actual pattern-guided preparation that produced a later successful survey, counts against the **same 64-action allowance**. A probe does not reset the allowance. Recovery legs still use ordinary charge-deficit/strain rules; this is not a promise that every trip toward a recovery site can avoid need. Deficit must clear before funded shard departure.

Recovery uses the same waiting-age/ID admission queue as ordinary consumers. Only the immediate free contact is reserved; future contacts and stock are not promised. Occupied/unreachable shard access defers the goal without evicting anyone. Admission recomputes the plan against preceding admissions. Source stock, actual draws/rests, readiness cap and care preferences remain authoritative. Independent current-need recovery can still occur when preparation defers; it is not a grant of free preparation.

Dispatch rechecks the actual pin, shard, navigation, full final-leg budget and care threshold before recording one committed shard journey. Arrival checks require at least one charge, zero deficit and two readiness before paying the final activity/movement pulse, so completion cannot itself create deficit or zero readiness. Resource loss can interrupt the attempt. Changed navigation invalidates it and clears only its own plan. Valid sharing pauses retain partial progress. Completed/interrupted commitments do not authorize a new shard attempt or cache retry. Actual shard completion is recorded separately from public-pattern creation, whose existing gates remain unchanged.

## Verification

- Full four-package build passed; Vite retains its existing large-chunk advisory. Final engine/test sources also compiled in the passing root suite.
- **184 root world-data/engine tests passed**, zero failures, including **12 new continuation checks**. These cover actual survey capture, real recovery/charge conservation, full funded shard costing, care readiness/rest priority, changed dispatch resources, occupied contacts, empty/refilled source, remaining shared action bound, malformed/truncated budgets and orphan pins, stale navigation before/during travel, changed actual arrival resources, sharing pauses, stable queue age/ownership, and both first-use and retry pattern-guided budget provenance.
- **Nine server state/SQLite checks passed**, including continuation snapshots at 46/80/101/118/119, five equal continuation pulses per restored snapshot, unknown policy rejection and preceding-budget tamper rejection. Comparisons normalize JSON semantics rather than mistaking property insertion order for a simulation difference.
- **46 absent-policy checkpoints** match the captured pre-change compiled engine byte-for-byte for five further pulses each. They include the six previous initial-preparation final histories and 40 older policy/control histories. No recorded state was opted into the new marker.
- All six new final ordinary states passed SQLite normalization and five equal continuation pulses, with valid traveling/interacting contact owners, no duplicate contacts, and no goal above its shared action allowance.
- The supplied backup CLI took a **WAL snapshot and bundle-inclusive restore** of real surveyed/pending/completed checkpoints at 46/101/119. Each restored checkpoint continued equally for five pulses; the current bundle and eight bundle files were retained. These are isolated SQLite/CLI checks, not a new HTTP or live deployment claim.
- JSON/totals, local documentation links, new-file whitespace and `git diff --check` passed. No tests, binaries, databases or runtime outputs were staged.

Harnesses/logs and the captured baseline are under `.tmp/post-probe-continuation/`; backup artifacts are under `.tmp/post-probe-backup-*`. Early verification corrected controlled fixture assumptions (existing trust records and the five shelter contacts) and a disposable report parser's text encoding. The final passing results above supersede those harness iterations.

## Ordinary histories — 360-pulse window

Unmodified fresh constructors, seed 2, rules-only/offline, current/review immutable bundles, populations 1/8/12, all **eight** selected opt-ins enabled from creation. No actor resources, spawns, decisions or saved policies were patched. The harness blocks network fetch.

Raw histories: `.tmp/route-patterns-post-probe-ordinary-G9zWI9/`.

Current: `sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e`.

Review: `sha256-591d53ab30c749f531d0b322609bbfe88096abc8f18b08977ca4d50296d873ca`.

| Bundle / population | Probes / conservations | Completed post-probe goals / captured goals | Public patterns | Later encounters | Guided uses | Additional post-probe recovery actions |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Current / 1 | 1 / 0 | 1 / 1 | 1 | 0 | 0 | 9 |
| Current / 8 | 4 / 2 | 1 / 4 | 1 | 1 | 0 | 42 |
| Current / 12 | 2 / 1 | 1 / 2 | 1 | 1 | 0 | 11 |
| Review / 1 | 1 / 0 | 1 / 1 | 1 | 0 | 0 | 9 |
| Review / 8 | 5 / 1 | 1 / 5 | 1 | 0 | 0 | 56 |
| Review / 12 | 2 / 1 | 0 / 2 | 0 | 0 | 0 | 14 |

These are **five actual funded shard completions/public patterns, two later encounters, zero guided uses and zero retries**. Fifteen real surveys create fifteen goals; ten are unfinished at the cutoff. New post-probe recovery actions total 141 across all Sparks, not per Spark. The largest observed combined originating-plus-post allowance use is 23, below 64. No ordinary goal terminates through forced interruption/invalidation in this window; those cases are controlled regressions.

Completed shard activities/public artifacts occur at:

- Current/1 and review/1: Spark 1, departure 101, completion **119**, after six initial and nine additional recovery actions. The older unbudgeted shard follow-up completed at 54; that earlier result is not replayed under the new policy.
- Current/8: Spark 1, departure 120, completion **138**.
- Current/12: Spark 3, departure 165, completion **183**.
- Review/8: Spark 7, departure 293, completion **311**.

The five completion records retain the real survey and actual shape event. Existing public-pattern creation happens on those same completions in these histories; the goal does not grant it automatically. The single-Spark test additionally checks exact projected versus actual post-completion charge/readiness and explicit total charge conservation.

## Review/12 remains unfinished

The targeted review/12 window still creates **no public pattern by 360**. Both successful survey goals are retained and seek charge rather than taking the old unrelated marking detour:

- Spark 2: eight additional recovery actions, eleven originating actions; waiting for actual charge-contact admission at `(26, 6)`, zero charge/zero deficit/65 readiness. The goal explicitly reports conditional recovery access.
- Spark 3: six additional recovery actions, ten originating actions; traveling toward charge at `(20, 4)`, zero charge/deficit 6/68 readiness. This is ordinary recovery-travel deficit, not a funded shard departure or a completed pattern.

Neither has committed the final shard leg or exhausted the shared bound. Retaining an objective and finding conditional itineraries does not guarantee completion in this shared-resource window. No later continuation is presented as success by 360, and no earlier hypothetical 51-pulse forecast is relabeled as an executed plan.

## Comparison and remaining gate

The preceding seven-opt-in histories produced **11 patterns, 27 encounters and two guided retries**, with one completed natural reuse in review/8. This new eight-opt-in set produces **5 / 2 / 0** and does **not** reproduce that completed natural reuse. The trajectories change because real post-survey preparation, care, contact competition and funded final-leg checks replace unbudgeted shard follow-ups; this result is not proof of improved ordinary throughput or sustained interest.

Keep S001 **OPEN**. The bounded continuation mechanism, its funded completion and compatibility are verified; uneven natural completion, especially review/12, and useful reuse remain unresolved. Human sustained-interest assessment is still independent. No additional behavior fix is selected or implemented here, and nothing has been committed, pushed or published.

## Owning sources

- `packages/engine/src/first-glow-post-probe-continuation.ts`: fresh policy, actual survey capture, retained goal, originating budget, planning/pins, commitment, completion and validation.
- `first-glow-pattern-preparation.ts`: optional shard objective and exact final-leg projection; existing cache behavior remains version-compatible.
- `first-glow-actions.ts`, `structured.ts`, `first-glow-recovery-admission.ts`: care/sharing priorities, cloned persistence, actual contact admission, funded dispatch/arrival and stale-navigation cleanup.
- `packages/engine/src/index.ts`: explicit option and WorldEvent evidence preservation; no server default changes.
- New continuation tests, controlled preparation fixture and server state tests: bounds, budget provenance, care, queue/pause and persistence regressions.
- `scripts/first-glow-route-patterns-ordinary-review.mjs --post-probe-continuation`: the eight-opt-in ordinary set; previous modes retain their options.
