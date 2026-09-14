# Stories-P2: Autonomous choice variation

Status: implemented as a bounded First Glow rules change for issue [#100](https://github.com/KevinHozak/Mimir/issues/100).

## P1 finding that authorizes this loop

The Stories-P1 report records a 13/20 partial gate. Its failed criteria are Spark distinctiveness and variation with integrity: the review harness injected dilemma choices, and different fixed seeds did not produce materially different stories. The exact report is [`first-glow-long-story-review.md`](evidence/first-glow-long-story-review.md), generated from the schema-3 bundle `sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601`.

This P2 slice addresses only those two findings. It does not add institutions, personalities, human stewardship, Hero Sparks, Anchors, Originators, AI authority, or a preferred philosophy.

## Rule

Normal First Glow pulses already resolve witnessed dilemma events through the rules-only action score. P2 adds the recorded world seed to that deterministic resolver in two bounded ways:

1. The seed selects among eligible non-actor Spark beneficiaries when an event has no participant-specific target. This changes whose relationship and local knowledge record receives the outcome, without inventing a hidden fact.
2. The seed supplies a small `-1..1` circumstance pressure to the existing action score. The score remains the primary reason for the alternative; the pressure only resolves a close boundary and is recorded through the existing explanation and evidence chain.

The server/world transition passes `WorldState.seed` into the engine. Direct First Glow callers default to seed `0`, preserving existing deterministic fixtures.

## Evidence boundary

Objective facts remain the event and ledger records. Spark-local knowledge remains witnessed facts, communicated claims, and uncertain inferences. The observer explanation continues to cite the objective event and show the bounded rules score; the seed is a replay input, not an interpretation or public Spark knowledge.

## Feasible alternatives and consequences

The existing dilemmas remain the only alternatives: reveal or withhold a weakening pool; help shelter or continue exploration; make a mark public or keep it private; enter a Wild Cache or stay on the trace. Positive and withholding choices remain valid outcomes. Their existing effects are unchanged: commitments, trust, claims or inferences, charge/readiness costs, and evidence references are explicit in committed state.

## Non-goals

- No new activity, resource, map object, route, interaction slot, schema version, or save migration.
- No AI/provider call and no browser-created outcome.
- No automatic moral ranking. Seed pressure is bounded and cannot override a strongly evidenced action score.
- No claim that seed variation alone completes the Living Stories gate. Stories-P3 must revalidate the exact autonomous scenarios and confirm that the variation is legible to an independent observer.

## Revalidation set

Stories-P3 should rerun the four P1 controls (`abundance-baseline`, `supply-scarcity`, `information-gap`, and `promise-breach`) at seeds `1101–1103`, `1201–1203`, `1301–1303`, and `1401–1403`, with autonomous social resolution enabled. It must compare same-seed replay, beneficiary/alternative variation, ledger conservation, local-knowledge boundaries, explanation evidence, and observer retellability. Resonance-P1 remains Backlog until that revalidation is positive.
