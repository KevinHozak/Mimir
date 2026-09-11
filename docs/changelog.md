# Mimir Changelog

This is a functional record of meaningful delivered changes. It groups related work instead of mirroring every commit, pull request, or implementation detail. For the earlier design evolution, see [Project History](history.md); for current and upcoming work, see the [Roadmap](roadmap.md).

## 2026-09 — First Glow foundation

### A readable social simulation

- Added authored First Glow social scenarios and Spark cards, then exposed them in the observer.
- Established deterministic Spark-local knowledge, trust, commitments, bounded dilemmas, and durable consequences.
- Made choices explainable through committed evidence, local knowledge, decisions, and outcomes in live and historical views.
- Added fixed-seed season review and an offline, fixture-based bounded-interpretation comparison. No external AI provider is authoritative or connected to normal runtime decisions.

  - Through [PR #62](https://github.com/KevinHozak/Mimir/pull/62), [PR #64](https://github.com/KevinHozak/Mimir/pull/64), [PR #65](https://github.com/KevinHozak/Mimir/pull/65), [PR #67](https://github.com/KevinHozak/Mimir/pull/67), [PR #68](https://github.com/KevinHozak/Mimir/pull/68), [PR #70](https://github.com/KevinHozak/Mimir/pull/70), and [PR #75](https://github.com/KevinHozak/Mimir/pull/75).

### A validated Living Stories gate

- Expanded the fixed-seed review from one 24-tick season to four 24-tick seasons, preserving controls, histories, replay inputs, observer artifacts, and scorecards.
- Used the resulting 13/20 partial baseline to add only an evidence-supported autonomous social-choice loop, then reran the review with deterministic replay and cross-seed variation checks.
- Recorded a positive 20/20 transition review without treating care, autonomy, exploration, or cooperation as the designated winner.
- Made Resonance-P1 candidate patterns observable without adding Anchor state or changing play.

  - Through [PR #102](https://github.com/KevinHozak/Mimir/pull/102), [PR #106](https://github.com/KevinHozak/Mimir/pull/106), [PR #108](https://github.com/KevinHozak/Mimir/pull/108), and [PR #84](https://github.com/KevinHozak/Mimir/pull/84).

### A completed Resonance arc

- Formed the Shelter Loom only from committed, thresholded evidence at its authored rest niche, preserving exact evidence IDs and safe failure paths.
- Added its bounded yield-or-hold practice, where both witnessed choices make durable readiness, charge, trust, and evidence consequences visible without selecting a correct philosophy.
- Added the contrasting Crossing of Voices Anchor and its follow-or-hold choice, so its different consequences remain replayable and auditable.
- Defined, but did not activate, Hearth Circuit eligibility and carry-forward. A deferred transition remains a valid First Glow story; no second runtime, institutions, markets, or credits were created.

  - Through [PR #86](https://github.com/KevinHozak/Mimir/pull/86), [PR #109](https://github.com/KevinHozak/Mimir/pull/109), [PR #110](https://github.com/KevinHozak/Mimir/pull/110), and [PR #111](https://github.com/KevinHozak/Mimir/pull/111).

### Durable observation and readiness evidence

- Added the dedicated First Glow History & scenarios viewer at `?view=history`. It browses recorded timelines and checkpoints with parent lineage and simulation/spatial/bundle identity, preserves objective events and interpretations without fresh replay generation, and gives explicit empty, unavailable, and incompatible-history states.
- Verified local bundle-inclusive backup and restore, including referenced bundle recovery and integrity failure behavior. Independent external disaster-recovery storage remains unconfigured.
- Captured a production-preview profile with fixed First Glow inputs and desktop/mobile evidence. The mobile DPR2 result remains a documented performance limitation, not a broad readiness claim.
- Established the Google Cloud staging guardrails, including the selected project, billing connection, small VM shape, and $10 budget alert.
- Provisioned the private IAP-only, single-writer staging observer with same-origin web serving and persistent state. It is not public or durable production hosting.

  - Through [PR #112](https://github.com/KevinHozak/Mimir/pull/112), [PR #113](https://github.com/KevinHozak/Mimir/pull/113), [PR #114](https://github.com/KevinHozak/Mimir/pull/114), [PR #118](https://github.com/KevinHozak/Mimir/pull/118), and [PR #119](https://github.com/KevinHozak/Mimir/pull/119).

### A safe, cohesive visual production path

- Defined the First Glow art bible: near-black space, local blue-and-silver circuitry, luminous non-human Sparks, color-independent state cues, and reduced-motion direction.
- Added reusable art production guidance, provenance records, source metadata, validation, review artifacts, and immutable bundle safeguards.
- Hardened the art pipeline with actual observer review evidence, source-to-bundle traceability, isolated negative fixtures, and historical recovery coverage.

  - Through [PR #71](https://github.com/KevinHozak/Mimir/pull/71), [PR #73](https://github.com/KevinHozak/Mimir/pull/73), and [PR #77](https://github.com/KevinHozak/Mimir/pull/77).

### A polished First Glow observer

- Delivered the graphics vertical slice, distinctive Spark readability, restrained atmosphere and event effects, and a unified dark-mode observer UI.
- Validated art performance, accessibility, reduced motion, and bundle recovery for the completed visual work.

  - Through [PR #78](https://github.com/KevinHozak/Mimir/pull/78), [PR #79](https://github.com/KevinHozak/Mimir/pull/79), [PR #80](https://github.com/KevinHozak/Mimir/pull/80), [PR #81](https://github.com/KevinHozak/Mimir/pull/81), [PR #82](https://github.com/KevinHozak/Mimir/pull/82), and [PR #83](https://github.com/KevinHozak/Mimir/pull/83).

### A complete First Glow audio pass

- Established silent-by-default, browser-safe audio controls with persisted master, music, and effects preferences.
- Defined the provenance-recorded First Glow palette, then attached effects only to committed, observer-visible events.
- Added sparse place-aware ambience and optional score without using sound to imply hidden state, reachability, or uncommitted outcomes.
- Validated mute-first readability, keyboard controls, replay/reconnect behavior, performance, and desktop/mobile evidence.

  - Through [PR #95](https://github.com/KevinHozak/Mimir/pull/95), [PR #96](https://github.com/KevinHozak/Mimir/pull/96), [PR #98](https://github.com/KevinHozak/Mimir/pull/98), [PR #103](https://github.com/KevinHozak/Mimir/pull/103), [PR #104](https://github.com/KevinHozak/Mimir/pull/104), [PR #105](https://github.com/KevinHozak/Mimir/pull/105), and [PR #107](https://github.com/KevinHozak/Mimir/pull/107).

### Project clarity

- Consolidated current First Glow direction into the roadmap, world theme, architecture, history, incubator, and art references.
- Preserved the retired village-era proposal as history while keeping the Living Circuit / First Glow runtime as the sole supported experience.

  - Through [PR #66](https://github.com/KevinHozak/Mimir/pull/66) and the documentation work that followed it.

## Earlier project direction

- Mimir began as a broader village-simulation concept and evolved into an observer simulation about Sparks, values, relationships, cooperation, conflict, and consequences in the Living Circuit.
- The First Glow was selected as the opening age: a quiet, sparse world of charge pools, shelter niches, traces, exploration, and informal cooperation before formal institutions or known Originators.
