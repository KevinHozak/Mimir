# Mimir Changelog

This is a functional record of meaningful delivered changes. It groups related work instead of mirroring every commit, pull request, or implementation detail. For the earlier design evolution, see [Project History](history.md); for current and upcoming work, see the [Roadmap](roadmap.md).

## 2026-10-04 — Observer-P7 bounded rehearsal and limits

- Delivered the automated rehearsal runner (`scripts/observer-rehearsal.mjs`) and test suite (`scripts/observer-rehearsal.test.mjs`) for bounded multi-client observation.
- Validated incremental connection ramp-up within the approved two-session cap, immediate abort threshold enforcement on auth rejection (HTTP 401) or stream errors, and active stream/socket return to zero on window expiration.
- Verified absence of credential leakage in rehearsal telemetry outputs (`assertRedacted`).
- Recorded rehearsal prerequisites, stop thresholds, cleanup verification, and measured limits in [Observer-P7 evidence](evidence/observer-p7-audience-rehearsal-2026-10-04.md), handing findings to #257 for epic disposition.

## 2026-10-04 — Observer controls and validation

- Merged [PR #288](https://github.com/KevinHozak/Mimir/pull/288) keeps the narrow read-only observer's audio and zoom rows inside one compact panel. Local regression and public-safe captures cover 320–1280px; hosted authentication/assets and post-deployment bounds remain separate #271 gates.
- Local audit follow-up (pending publication): corrected delayed Web Audio gain scheduling and added browser error coverage for enabled ambience and score. Frontend type checking now gates the web build, with explicit React/Vite types and canonical First Glow bundle types.
- The local audit follow-up adds CI coverage for observer/owner layout and writer security contracts. Affected tests allocate loopback ports, await signalled process exits, use a cooperative social fixture, and preserve historical captures by writing test output under `.tmp`.

## 2026-10-03 — Observer stream cleanup measured

- Delivered awaited stream cleanup, bounded full-body deadlines, private process-scoped lifecycle telemetry, and cancellation regressions in [PR #281](https://github.com/KevinHozak/Mimir/pull/281). [PR #282](https://github.com/KevinHozak/Mimir/pull/282) adds h2c cancellation support without changing observer authentication or the private single writer.
- Authorized bridge and exact clean-main Hosting deployments now use the existing direct authenticated API route. One approved fresh client showed 0 → 1 → 0 streams with client-close cleanup about 11.2 seconds after tab closure; VM TCP connections returned to baseline. Failed rewrite attempts and cached-client limits are preserved in [dated evidence](evidence/observer-p5-stream-cleanup-2026-10-03.md).
- Guarded Hosting builds default to the exact direct bridge and reject conflicting API origins, with regression coverage. Multi-viewer capacity and broader readiness remain separate #272/#257 gates.

## 2026-10-03 — Authenticated bundle assets deployed

- Deployed merged [PR #266](https://github.com/KevinHozak/Mimir/pull/266) with guarded clean-main Hosting verification: version `2b0287700b57d854`, exact index and both hashed assets matched.
- Verified five required bundle SVGs return 200 in authenticated desktop and mobile-sized observation. Retained client transfer/cache data, read-only load/quota measurements, and historical service billing in [dated evidence](evidence/hosted-p18-p4-deployment-2026-10-03.md).
- Mobile zoom clipping and the multi-viewer/rollback/stream-cleanup gates remain open; this does not complete #257/#253 or establish production readiness.

## 2026-09-20 — Lives-P4 evidence-linked Chronicle baseline

- Added immutable, versioned Chronicle editions with moment, personal, and season chapters derived from committed First Glow records at an explicit timeline/pulse cutoff. Each chapter carries a source snapshot hash, evidence references, selected Sparks, narrator provenance, and historical-scene illustration provenance.
- Added deterministic evidence selection and validation. Saved utterance quotes are rendered exactly, future/cross-timeline evidence is rejected, interpretations remain distinct from facts, and missing evidence produces an explicit quiet/unavailable result rather than invented narrative.
- Added SQLite persistence and read/regenerate routes. Rereading selects the latest saved edition without provider calls or world mutation; explicit owner regeneration creates a new revision and preserves earlier editions. Added local Chronicle navigation, evidence links, and recorded-scene links with responsive reader styling.
- Verification covers exact quote grounding, unsupported quote rejection, edition revision retention across restart, the existing history sequencing test, and the browser history viewer. No live provider, image generation, spending, or hosted deployment is implied.

## 2026-09-20 — Lives-P3 bounded conversation foundation

- Added a deterministic, co-present two-turn First Glow conversation record with stable encounter and utterance IDs, pulse, participants, quoted text, witnessed evidence, prompt/context versions, accepted effects, and recipient-memory propagation.
- Added strict participant/evidence/length validation, duplicate suppression, checkpoint validation, history/API exposure, and focused hidden-evidence and duplicate-turn regression tests. Historical replay remains provider-free and no unrestricted chat or live provider run is enabled.

## 2026-09-20 — Lives-P2 follow mode

- Added a browser-local World/Follow presentation path for First Glow Sparks. A viewer can follow a selected Spark through committed movement and rest updates, inspect its recorded intention and encounter records, switch between immersive and explanatory presentation, manually pan or zoom, resume tracking, and return to World view.
- Preserved the selected Spark across live updates and history requests, with explicit unavailable-checkpoint recovery text and Return to Live behavior. Follow camera actions remain read-only and do not schedule pulses, reflections, provider calls, or world mutations.
- Added focused navigation and missing-target regression coverage. Full Playwright visual verification remains environment-limited in this worktree because the browser harness hung after the isolated services started.

## 2026-09-20 — First Glow writer-hardening closeout

- Completed the Security: Harden the First Glow writer epic ([issue #218](https://github.com/KevinHozak/Mimir/issues/218)). The server now serializes pulses and bundle-inclusive backups, fails closed on missing owner tokens for hosted/public binds, rejects unsupported legacy resets, preserves resonance history, uses a typed writer entry point, and serves the reconciled reflection contract with CI coverage.
- Delivery evidence: [PR #226](https://github.com/KevinHozak/Mimir/pull/226), [PR #227](https://github.com/KevinHozak/Mimir/pull/227), [PR #235](https://github.com/KevinHozak/Mimir/pull/235), [PR #236](https://github.com/KevinHozak/Mimir/pull/236), [PR #237](https://github.com/KevinHozak/Mimir/pull/237), [PR #238](https://github.com/KevinHozak/Mimir/pull/238), and [PR #239](https://github.com/KevinHozak/Mimir/pull/239).
- The original 2026-09-15 reliability/security review remains historical evidence. Deployment, audience, SSE, bridge-restart, outage-replay, billing, and isolated-recovery validation gaps remain explicit and are not represented as fixed by this code closeout.

## 2026-09-13 through 2026-09-15 — Authenticated hosted observation

- Delivered Google-authenticated live observation through Firebase Hosting and the Cloud Run bridge to the private single-writer VM. Hosted API reads use the page origin; owner controls and mutation routes stay outside the hosted surface. Added the local light mark, loading animation, and refined observer/audio controls.
- Delivered authenticated, interactive archive replay and ordered multi-checkpoint publication with immutable chunk validation, staged catalog commit, dated publication records, and quarantine/rollback guidance. Outage-time archive replay remains operationally unverified.
- Added a clean-main Hosting deployment workflow that enables hosted auth during the build and compares served HTML and hashed assets with the deployed build. Corrected the hosted-auth omission and Windows command launching.
- Closed Hosted-P17 with explicit limits. The 2026-09-15 evidence records Firebase version `82cc93e9b9470f8e` from commit `fbd4eb8`, missing/malformed token rejection, observer-only UI, VM continuity, bridge-to-VM recovery, synthetic requests, and a Compute Engine quota snapshot. Remaining token classes, authenticated SSE refresh/reconnect/closure, bridge process restart, outage replay, and real audience/billing telemetry remain unverified.

  - Delivery: [PR #194](https://github.com/KevinHozak/Mimir/pull/194), [PR #195](https://github.com/KevinHozak/Mimir/pull/195), [PR #202](https://github.com/KevinHozak/Mimir/pull/202), [PR #207](https://github.com/KevinHozak/Mimir/pull/207), [PR #210](https://github.com/KevinHozak/Mimir/pull/210), [PR #211](https://github.com/KevinHozak/Mimir/pull/211), and [PR #212](https://github.com/KevinHozak/Mimir/pull/212).
  - Evidence: [initial deployment](evidence/hosted-live-observer-2026-09-13.md), [operational closeout](evidence/hosted-p17-operational-closeout-2026-09-14.md), and [closeout disposition PR #216](https://github.com/KevinHozak/Mimir/pull/216). These are dated results, not a fresh deployment check.

## 2026-09 — First Glow foundation

### Recovered evaluation accounting and evidence

- RC-P4 evaluation now counts only each scenario's provider telemetry, including actual token totals, avoiding repeated cumulative costs. A synthetic regression check runs with the existing RC-P4 evidence test.
- Preserved the [historical private RC-P4 batch](evidence/rc-p4-private-live-2026-09-13.md) separately from the deterministic control, restored the dated Hosted-P17 continuity note, and completed the AI-P8 evidence summary. No new provider run or deployment is implied.

### Reflection capacity is visible at the observer boundary

- Added a server-owned, replay-safe reflection projection and First Glow observer panel showing world-age baseline RC, explicit Hero capacity, per-Spark usage/remaining opportunities, next scheduled window, current intention, and committed reflection outcomes.
- Kept Spark-local memory private, provider-free historical playback intact, and operator status limited to bounded non-secret mode, cap, kill-switch, fallback, and usage metadata.
- Merged through [PR #182](https://github.com/KevinHozak/Mimir/pull/182). This implementation record does not establish a deployment.

### A readable social simulation

- Added authored First Glow social scenarios and Spark cards, then exposed them in the observer.
- Established deterministic Spark-local knowledge, trust, commitments, bounded dilemmas, and durable consequences.
- Made choices explainable through committed evidence, local knowledge, decisions, and outcomes in live and historical views.
- Added fixed-seed season review and an offline, fixture-based bounded-interpretation comparison. No external AI provider is authoritative or connected to normal runtime decisions.

  - Through [PR #62](https://github.com/KevinHozak/Mimir/pull/62), [PR #64](https://github.com/KevinHozak/Mimir/pull/64), [PR #65](https://github.com/KevinHozak/Mimir/pull/65), [PR #67](https://github.com/KevinHozak/Mimir/pull/67), [PR #68](https://github.com/KevinHozak/Mimir/pull/68), [PR #70](https://github.com/KevinHozak/Mimir/pull/70), and [PR #75](https://github.com/KevinHozak/Mimir/pull/75).

- Added the AI-P20 versioned First Glow World Codex and reconstructible context packet. Contexts now combine authored profile data with deterministic, Spark-local retrieved memories and recent witnessed events, hash the complete packet, reject hidden evidence, and record input/output token estimates and latency alongside bounded decision usage. The provider-free cost comparison is retained in the [AI-P20 evidence report](evidence/ai-p20-context-cost-report-2026-09-13.md).

### A validated Living Stories gate

- Expanded the fixed-seed review from one 24-pulse season to four 24-pulse seasons, preserving controls, histories, replay inputs, observer artifacts, and scorecards.
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
- Verified local bundle-inclusive backup and restore, including referenced bundle recovery and integrity failure behavior, then transferred a hosted bundle-inclusive backup to independent Cloud Storage and restored it with a separate recovery identity.
- Added optional Hosted-P8 scheduled replication of the complete bundle-inclusive backup unit to Cloud Storage with remote size/checksum verification and operator-visible freshness/failure status. The path uses the VM's attached keyless identity and preserves the separate recovery identity; it does not create public access or replace isolated restore validation.
- Captured a production-preview profile with fixed First Glow inputs and desktop/mobile evidence. The mobile DPR2 result remains a documented performance limitation, not a broad readiness claim.
- Established the Google Cloud staging guardrails, including the selected project, billing connection, small VM shape, and privately recorded spending guardrails.
- Provisioned the private IAP-only, single-writer staging observer with same-origin web serving and persistent state, then verified 24 authenticated pulses, restart continuity, and owner-token protection. It is not public or durable production hosting.

  - Through [PR #112](https://github.com/KevinHozak/Mimir/pull/112), [PR #113](https://github.com/KevinHozak/Mimir/pull/113), [PR #114](https://github.com/KevinHozak/Mimir/pull/114), [PR #118](https://github.com/KevinHozak/Mimir/pull/118), [PR #119](https://github.com/KevinHozak/Mimir/pull/119), [PR #120](https://github.com/KevinHozak/Mimir/pull/120), and [PR #121](https://github.com/KevinHozak/Mimir/pull/121).

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

### A bounded hybrid runtime implementation path

- Completed AI-P7 through AI-P9 as bounded evaluation gates: quality review, isolated downstream-effects staging, and a limited budget/replay pilot.
- Confirmed that validated model-shaped choices can produce bounded social differences through existing deterministic transitions without changing canonical runtime authority.
- Proceeded with the next implementation steps toward AI-assisted play: provider proposals remain bounded and validated, while deterministic server transitions commit all consequences.
- Implemented versioned personality contexts, deterministic attention budgets, recorded decision history, the offline hybrid loop, and the bounded Vertex adapter. AI-P11 through AI-P14 added the explicit live contract, internal pilot, and disabled-by-default server rollout with recovery procedures.

  - Through [PR #138](https://github.com/KevinHozak/Mimir/pull/138), [PR #139](https://github.com/KevinHozak/Mimir/pull/139), [PR #141](https://github.com/KevinHozak/Mimir/pull/141), [PR #142](https://github.com/KevinHozak/Mimir/pull/142), and [PR #157](https://github.com/KevinHozak/Mimir/pull/157).

- Kept the implementation boundary internal and controlled: explicit provider/model authorization, per-Spark and global caps, privacy/retention review, cost telemetry, kill switch, rules-only fallback, and provider-free replay remain required.
- Preserved public observation and historical playback as provider-free paths until a separate bounded runtime pilot is complete.

- Completed AI-P15's private hosted Vertex rehearsal with 8/8 recorded bounded interpretations, 3 changed choices, 29 downstream staged changes, zero canonical runtime changes, and provider-free replay under the $1.00 cap. The result supports a repeatability evaluation, not public or unbounded rollout.

  - Evidence: [AI-P10 hybrid runtime implementation path](evidence/ai-p10-hybrid-runtime-decision-2026-09-12.md).
  - Follow-up: [PR #159 / AI-P15](https://github.com/KevinHozak/Mimir/pull/159); [AI-P15 evidence](evidence/ai-p15-private-hosted-vertex-2026-09-12.md).

- AI-P18 adds a versioned Spark decision-budget ladder of 2, 4, 8, and 16 with deterministic spacing across a 64-pulse day, stable phase offsets, no catch-up debt, and recorded cadence/suppression metadata. Its control runner compares readiness-tier and age-day profiles without changing canonical authority.
- The authorized private Vertex quality rerun covered 128 fixed-seed encounters: 28 recorded interpretations, 14 useful interpretations, 14 changed choices, 113 downstream staging changes, four categorized fallbacks, and 0.27085 cents of provider usage under the $1.00 cap. Private-boundary, cap, deterministic-authority, and provider-free replay checks passed; no public deployment or canonical AI writes were introduced.

  - Follow-up: [PR #165 / AI-P18](https://github.com/KevinHozak/Mimir/pull/165); [AI-P18 cadence control](evidence/ai-p18-cadence-control-2026-09-12.md); [AI-P18 Vertex rerun](evidence/ai-p18-vertex-rerun-2026-09-12.md).

- Completed AI-P19's matched determinant review in private, bounded controls and a separately gated Vertex arm. The static fixture gave readiness/capacity and personal-age profiles identical 2/4/8/16 vectors, so it did not establish a causal winner or fairness advantage; the reported 0.60964 cents ($0.0060964) remains an estimate rather than a reconciled invoice.
- Delivered RC-P1 through RC-P5: world-age capacity, lived-memory context, rule-executed intentions, matched evaluation, and bounded observer integration. First Glow remains the only supported runtime and no public provider path was enabled.
- Implemented RC-P3's bounded `rule-executed-v1` intentions: feasible AI proposals and deterministic fallbacks now persist on Sparks, continue across ordinary pulses, execute through existing First Glow action contracts, and record causal completion/interruption for restart-safe, provider-free replay.
- Added RC-P4's deterministic matched evaluation harness and evidence artifact: four fixed seeds, rotating RC-4 Hero, diagnostic RC-2/4/8/16 arms, independent lived-memory conditions, multi-day cap telemetry, encounter ledgers, intention completion, divergence accounting, and provider-free replay checks. The recovered [private Vertex batch](evidence/rc-p4-private-live-2026-09-13.md) is a separate historical artifact with its original experimental arms and accounting; it does not select a new default or enable a public provider path.
- Reflection slots now guarantee an unused reflection on the slot's final pulse, including while a Spark is following a habitual intention. The active intention is interrupted with auditable provenance before the replacement is evaluated through existing bounded rules and provider paths.

  - Follow-up: [PR #167 / AI-P19](https://github.com/KevinHozak/Mimir/pull/167); [AI-P19 determinant control](evidence/ai-p19-determinant-control-2026-09-12.md); [Reflection capacity plan](reflection-capacity-plan.md).


## Earlier project direction

- Mimir began as a broader village-simulation concept and evolved into an observer simulation about Sparks, values, relationships, cooperation, conflict, and consequences in the Living Circuit.
- The First Glow was selected as the opening age: a quiet, sparse world of charge pools, shelter niches, traces, exploration, and informal cooperation before formal institutions or known Originators.
