# Reflection capacity development plan

Selected direction recorded in [PR #167](https://github.com/KevinHozak/Mimir/pull/167).
These are planned mechanics, not a claim that the full loop is implemented.

## Design

RC-P1 implementation status: the versioned First Glow policy and deterministic scheduler are now implemented in `@mimir/engine`. The initial policy is explicit-test-only for Heroes, with natural generation disabled until a later phase selects and verifies a deterministic rarity policy.

RC-P2 implementation status: reflection contexts now derive a bounded `lived-memory-v1` projection from persisted Spark knowledge and decision history. Objective witnesses, received claims, subjective inferences, and prior consequences retain separate provenance; only known records at or before the current tick are supplied. Spawn ticks are recorded for new Sparks, while legacy Sparks keep an unknown spawn time rather than receiving invented history.

RC-P3 implementation status: eligible reflections can now produce a bounded, feasibility-checked `rule-executed-v1` intention. Intentions continue without provider calls, execute through existing movement and arrival contracts, and persist causal completion/interruption records for restart and provider-free replay.

RC-P4 deterministic-control status: the matched evaluation harness now exercises four fixed seeds across all-RC-2, rotating RC-4 Hero, diagnostic RC-2/4/8/16, and young-Hero/experienced-ordinary memory conditions for four days. It records cap contention, suppression, fallbacks, encounter-level evidence, direct effects, intention completion, divergence, and provider-free replay in [`docs/evidence/rc-p4-matched-evaluation-2026-09-13.md`](evidence/rc-p4-matched-evaluation-2026-09-13.md). The private Vertex quality batch remains a separately gated, opt-in step; this control run does not select a higher default or authorize broader deployment.

World development age sets **Reflection capacity (RC)**. First Glow baseline
is RC 1; rare Hero Sparks initially receive RC 2, calculated as
`ceil(world RC * 1.5)`. A reflection is an opportunity
to choose or reconsider an intention. Hero status grants frequency, not superior
judgment, attributes, or outcomes. Rarity and deterministic assignment require
an explicit versioned policy in RC-P1; no probability is selected yet.

Personal age and lived experience affect memories, not the RC allowance.
Only known events, learned reports, relationships, and remembered consequences
can inform a Spark's reflection. An older Spark need not know more than a younger
one that has experienced more. Readiness remains the rest/activity attribute.
This supersedes the earlier proposal to raise budgets at personal ages 0/2/4/8.

Later world ages raise the baseline to the world-age number, with Heroes at
`ceil(world RC * 1.5)`. Later values and the maximum supported tier remain provisional;
this plan does not enable a new runtime or an automatic world-age transition.

Space opportunities by configured day ticks divided by RC: a 64-tick fixture
gives 64-tick intervals at RC 1 and 32 at RC 2. Persist deterministic offsets,
usage, and reasons for suppression. Changes must not create bursts or debt.
Global provider and financial limits still apply; unused RC is not a guaranteed
call or a resource reward. A continuing intention may need no fresh AI call.

AI proposes an intention from feasible alternatives. Rules determine movement,
resource/attribute costs, arrival, interactions, and consequences across ticks.
Record the exact context and validated result for provider-free history.

## Delivery order

| Phase | Outcome | Depends on |
| --- | --- | --- |
| [RC-P1](https://github.com/KevinHozak/Mimir/issues/168) | Versioned world-age RC, Hero exception, scheduling and persistence | P19 review/merge |
| [RC-P2](https://github.com/KevinHozak/Mimir/issues/169) | Bounded individual memories inform reflections | RC-P1 |
| [RC-P3](https://github.com/KevinHozak/Mimir/issues/170) | Persistent intentions executed through authoritative rules | RC-P2 |
| [RC-P4](https://github.com/KevinHozak/Mimir/issues/171) | Fair multi-day comparison of RC, Heroes and memory | RC-P3 |
| [RC-P5](https://github.com/KevinHozak/Mimir/issues/172) | Bounded integration and observer visibility | RC-P4 |

RC-P1 is the first implementation step. Evaluate all-RC-1 groups versus one RC-2
Hero, rotating identities across matched scenarios. As later world-age fixtures are
added, test the direct integer progression (RC 1, 2, 3, 4, 5, 6, and onward)
without substituting personal age or a binary budget ladder. Cross memory histories
independently of capacity. Show rules choice, AI choice, direct effects, and
accumulated state differences separately. Assess coherence and consequences rather
than rewarding mere divergence from rules or assuming frequent reflection proves
dominance.

## P19 evidence boundary

P19 assigned identical static budget vectors to readiness and personal-age arms;
it did not test development-age progression, Hero rarity, or evolving memory.
The recorded downstream metric includes accumulated state differences and
cannot attribute independent effects to a Spark. Its reported cost totals
0.60964 cents = $0.0060964, an estimate rather than a reconciled invoice.
Retain the original experiment result; the RC direction is a user design choice.
