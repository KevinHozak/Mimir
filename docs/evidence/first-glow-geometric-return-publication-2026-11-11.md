# Geometric return-route publication — 2026-11-11

Implemented and verified locally; uncommitted and unpublished. [Structured results](first-glow-geometric-return-publication-2026-11-11.json). Compare the [preceding sharing-admission window](first-glow-bounded-sharing-admission-2026-11-11.md). The motivating recorded-history diagnosis remains under `.tmp/publication-diagnosis-p6cKnJ/findings.json`.

## Fresh policy and preserved gates

Fresh constructors may explicitly select `geometricReturnPublication: true`, recorded as `geometric-return-publication-v1`. Initialization supplies route patterns and their Wild Cache choice prerequisite if absent. Other policies remain separately selected. Default startup/reset and absent-policy histories retain their rules; unknown versions, missing route-pattern state and initialization against recorded histories reject.

The policy changes only artifact creation's return-route query. At a real surveyed-shard completion, it checks current traversable geometry while ignoring reservations on the recorded return cache. It never changes the actual reservation table, admits a trip, starts a probe or grants resources. Missing/non-cache targets and runtime blockers still fail the query. Actual cache selection/admission continues using the original contact-aware query.

Valid probe/origin/completion evidence, actual shard location, one artifact per creator, the 64-artifact limit and physical later encounter remain authoritative. Publication still occurs only in the actual completion pulse; there is no deferred-publication backlog or retroactive artifact creation. Care, charge/readiness accounting, source/action bounds, fair admission, valid contact ownership and retry rules are unchanged. A public route is not a promise of immediate access or benefit.

## Six ordinary histories

Raw recordings: `.tmp/route-patterns-return-publication-ordinary-Q55iuZ`. All six start from unmodified fresh constructors with seed 2, populations 1/8/12, current/review bundles, twelve explicit policies and **360 pulses**. Fetch is blocked; zero provider calls. Controlled tests and older-history comparisons below are separate from these fresh runs.

| Bundle | Sparks | Public patterns | Later encounters | Guided uses |
| --- | ---: | ---: | ---: | ---: |
| Current | 1 | 1 | 0 | 0 |
| Current | 8 | 5 | 10 | 0 |
| Current | 12 | 5 | 10 | 0 |
| Review | 1 | 1 | 0 | 0 |
| Review | 8 | 4 | 6 | 0 |
| Review | 12 | 2 | 1 | 0 |
| **Total** | | **18** | **27** | **0** |

The preceding window had **18 completed survey goals but 16 public patterns**, with 22 encounters and zero guided uses. The new window has **18 completed survey goals and 18 public patterns**, with **three goals still unfinished**. Every completed goal in this window has a public artifact referencing its actual survey and completion.

The two diagnosed publication losses are recovered at their real completion pulses:

- **Current/12, Spark 1 at 194:** publishes from its pulse-98 survey and pulse-194 completion while Spark 9 legitimately retains the cache contact. Previously this completion produced no artifact, and the world's first public pattern was at 293.
- **Review/12, Spark 2 at 229:** publishes from its pulse-121 survey and pulse-229 completion while Spark 9 retains the cache contact. Previously the first public pattern was Spark 10's at 298; that later artifact remains present.

Across all six histories, cutoff charge/deficit/readiness, positions, activity/travel plans, runtime objects and reservations match the preceding window. Survey goal timings, outcomes and recovery-action counts also match. This is improved publication fidelity, not extra physical completion or inferred resource/travel savings. Maximum combined originating/post-probe preparation count remains **21/64**.

Review/12 still has three unfinished goals at 360: Spark 1 committed its shard leg at 357 and remains traveling; Sparks 5/9 remain in rest preparation/deferred with combined counts 17/11. The publication policy does not finish those journeys.

All **27 later encounters** follow the reader's own successful survey. All **21 cache choices** are probes; there are no conservations or committed guided retries. The existing already-surveyed refusal remains correct. These histories do not demonstrate natural useful guided reuse, social benefit or sustained interest. S001 remains **OPEN** for remaining timely completion, useful natural reuse and independent human review. No further gameplay fix is selected here.

## Verification

- Full four-package build passed; the existing Vite chunk-size advisory remains.
- **219 root tests** passed, including **eight publication-policy checks**: optional/fresh/version boundaries; read-only geometric query with actual admission still blocked; real completion, occupied-contact ownership, exact evidence and balanced costs; original absent-policy behavior after contact release; no fabricated completion; source/location gates; runtime-blocked topology; per-creator and 64-artifact limits. The saturated-store cap control is synthetic unit data, not an ordinary history.
- **13 state/SQLite checks** passed, including pre-completion and published checkpoints with intact cache ownership, exact survey/completion references, unknown-version rejection and five equal continuation pulses after normalization.
- **70 older checkpoints** continue byte-identically for five pulses against the pre-change compiled engine. **Two additional diagnosed completion checkpoints** continue byte-identically for **12 pulses**, past cache release, retaining their original missing-publication outcomes. Thus 72 older checkpoints are compared without retagging or backfilling artifacts.
- All six new final states validate and continue equally after SQLite normalization for five pulses. Shared action bounds hold; no duplicate contact owners or stranded reservations exist at the cutoff.
- Controlled fresh-policy WAL/bundle-inclusive backup and restore preserve **two checkpoints** (before completion and actual publication with the cache still reserved), **eight bundle files** and five equal continuation pulses per checkpoint. This is controlled persistence evidence, not ordinary-history evidence.
- Source hashes, JSON, whitespace and local documentation links checked. No commit, publication, default opt-in, bundle edits, provider calls or existing-history upgrades.
