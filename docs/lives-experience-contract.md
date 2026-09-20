# Living Lives: connected experience contract

**Status:** Lives-P1 design contract for [#229](https://github.com/KevinHozak/Mimir/issues/229), prepared from the current `main` implementation and the selected First Glow design. This document is a handoff contract, not a production implementation. The authored examples below are labeled and must not be persisted as simulation facts.

**Scope:** Define how the existing World observer, a future Follow-a-Spark mode, and a future Chronicle connect one committed First Glow history. This phase adds no runtime behavior, provider call, dialogue, renderer, world mechanic, or real narrative content.

## 1. Contract at a glance

The three views are projections of one committed record, not three stories that can drift apart:

```text
World observation
  -> selected Spark + encounter/event reference
  -> Follow presentation of the same timeline and pulse
  -> Chronicle moment/chapter backed by the same event IDs
  -> historical scene at the cited timeline and pulse
  -> Return to Live on the same timeline's newest available state
```

The minimum identity carried by every transition is:

```ts
type LivesNavigationState = {
  view: "world" | "follow" | "chronicle";
  timelineId: string;
  mode: "live" | "history";
  selectedSparkId?: string;
  encounterId?: string;
  eventIds: string[];
  pulse?: number;
  returnTarget?: {
    view: "world" | "follow" | "chronicle";
    timelineId: string;
    mode: "live" | "history";
    pulse?: number;
    selectedSparkId?: string;
    encounterId?: string;
  };
};
```

`timelineId`, `pulse`, and source IDs are evidence identity. `view`, camera framing, selected presentation, and playback speed are browser-local presentation state. No navigation state may cause a pulse, reserve reflection capacity, call a provider, reveal private context, or write canonical history.

## 2. Current implementation inventory and integration gaps

### Reuse directly

| Existing component | Verified responsibility | Lives use | Owner |
| --- | --- | --- | --- |
| `packages/web/src/main.tsx` | React shell, Phaser world canvas, committed Spark positions, selection, live SSE, history loading, timeline controls, and observer read routes | World shell, future mode switch, navigation state, and selected-Spark handoff | `@mimir/web` |
| `packages/web/src/first-glow.tsx` | First Glow inspector, explanations, reflection projection, evidence labels, and public/private boundary copy | Follow explanatory panel and authorized evidence links | `@mimir/web` |
| `packages/web/src/first-glow-scene.ts` | Shared map geometry, cell queries, blocked summaries, depth, and object interaction presentation | Close/trailing camera framing and encounter context without changing navigation rules | `@mimir/web` |
| `packages/web/src/first-glow-playback.ts` | Playback step timing | Historical scene playback; animation remains subordinate to committed positions | `@mimir/web` |
| `packages/web/src/history-sequencing.ts` | Prevents stale asynchronous history responses from replacing the requested state | Required for timeline, pulse, reconnect, and Return to Live races | `@mimir/web` |
| `packages/engine/src/first-glow-observer.ts` | Server projection of capacity, intention, reflections, evidence IDs, and committed causes | Follow's authorized intention/effect summary | `@mimir/engine` |
| `packages/engine/src/first-glow-intentions.ts` | Bounded feasible intentions, evidence validation, authoritative commit, interruption, completion, and replay behavior | Follow's intention state; P2 must not invent conversation fields | `@mimir/engine` |
| `packages/engine/src/first-glow-context.ts` | Versioned World Codex/context packet and hidden-evidence validation | P3 speaker context only; never an observer disclosure endpoint | `@mimir/engine` |
| `packages/engine/src/first-glow-reflection-memory.ts` | Bounded memories with witnessed, received-report, inference, and recorded-decision provenance | P3 input contract and P2's safe summary labels | `@mimir/engine` |
| `packages/server/src/index.ts` | Read routes, SSE, timeline metadata, checkpoint history, event/interpretation reads, branching, archive/continue, and single-writer commit | Source of timeline/live/history truth | `@mimir/server` |
| `packages/engine/src/first-glow-history.ts` and `packages/server/src/backup-lib.ts` | Recorded decision/movement history and bundle-inclusive recovery boundary | P3/P4 persistence and replay requirements | `@mimir/engine`, `@mimir/server` |

### Actual gaps this contract resolves

1. Existing UI selection is an entity selection (`spark:<id>` or object), not a durable World/Follow/Chronicle navigation contract.
2. Existing history has timeline and pulse identity, but the cross-view return target and explicit live/history mode need a single browser-local state shape.
3. Existing objective events, interpretations, intentions, and memory records have different provenance. No future view may flatten them into one undifferentiated story field.
4. Current First Glow records do not implement persisted conversations, utterances, Chronicle chapters, or narrator editions. P3 and P4 must add those contracts only after this phase; this document names proposed interfaces and does not claim schemas exist.
5. Existing history playback is provider-free. Chronicle rereading must use the same rule and must not silently become a new generation request.
6. Existing observer projections intentionally omit private memory contents. Follow explanatory mode must preserve that omission until a narrower access policy is explicitly reviewed.

## 3. View contracts and rough layouts

The first prototype uses the existing 2D Phaser world and a bounded trailing camera. The camera follows the selected Spark's committed position with a clamped offset that keeps the Spark and the nearest interaction slots visible. It does not introduce 3D, new geometry, or a cinematic director that changes simulation. Manual pan/zoom temporarily suspends tracking; an explicit `Resume Follow` restores it. At map edges, the camera clamps before the Spark leaves the readable viewport.

### World

Purpose: answer “What is happening in this society?” It is broad, quiet, and read-only.

Desktop wireframe:

```text
+------------------------------------------------------------------+
| MIMIR / WORLD       LIVE  timeline: main  pulse: 42   [Chronicle] |
|                                                                  |
|                 [dark Living Circuit map]                        |
|        Spark Mira *       route / pool / shelter                  |
|                         Spark Tovan *                             |
|                                                                  |
| [moments to watch]                                               |
|  pulse 42  Mira + Tovan near pool  [Follow Mira] [Open moment]    |
|  pulse 39  trace discovered             [Open moment]             |
+------------------------------------------------------------------+
```

Mobile wireframe:

```text
+---------------------------+
| WORLD   LIVE  p42  [≡]    |
|                           |
|       [map]               |
|   Mira *   Tovan *        |
|                           |
| [moment] Mira + Tovan     |
| [Follow] [Open]           |
| [timeline/history]        |
+---------------------------+
```

World links carry the selected Spark, event/encounter reference, timeline, and pulse. A quiet or empty feed says “No recorded moments to highlight” rather than manufacturing drama.

### Follow a Spark

Purpose: answer “What is life like for this person?” It is a presentation mode over the same map and records.

Desktop wireframe:

```text
+------------------------------------------------------------------+
| FOLLOW / MIRA       LIVE  p42  [World] [Chronicle] [Return Live]  |
|                                                                  |
|     [trailing 2D camera: Mira + nearby context]                  |
|              Mira * ---- Tovan *                                 |
|                                                                  |
| Mira                                           [Immersive|Explain]|
| intention: seek charge                         recorded at p42    |
| encounter: encounter-...                       [Open Chronicle]  |
| evidence: event-17, event-21                   [Resume Follow]   |
| private memory: not shown                       [History: p42]    |
+------------------------------------------------------------------+
```

Mobile wireframe:

```text
+---------------------------+
| FOLLOW MIRA  LIVE p42     |
| [World] [Chronicle]       |
|                           |
|       [close map]         |
|        Mira *             |
|                           |
| Intention: seek charge   |
| Encounter at pulse 42    |
| Evidence (2)             |
| [Explain] [Return Live]  |
+---------------------------+
```

Immersive mode reduces chrome but never hides live/history status, selected identity, or the accessible alternative. Explanatory mode can show recorded intention summaries, objective events, authorized interpretations, and source IDs. It cannot show hidden model context, chain-of-thought, or another Spark's private memories.

### Chronicle

Purpose: answer “What happened, and why did it matter?” The first implementation reads saved moments and chapters backed by actual captures. Generated illustrations are a later labeled extension.

Desktop wireframe:

```text
+------------------------------------------------------------------+
| CHRONICLE       HISTORICAL  main / p42  [World] [Follow Mira]     |
|                                                                  |
|  Mira and Tovan at the weakening pool                            |
|  Moment 1 of 3  |  source: encounter-17, p42                     |
|                                                                  |
|  [captured scene from the recorded checkpoint]                   |
|  “The pool is weakening.”  Mira -> Tovan  [utterance: future]    |
|  Interpretation: Tovan seemed reluctant [interpretation, not fact]|
|                                                                  |
| [Open source scene] [Previous] [Next] [Return to Live]            |
+------------------------------------------------------------------+
```

Mobile wireframe:

```text
+---------------------------+
| CHRONICLE  HISTORICAL p42 |
| [World] [Follow]          |
|                           |
| Mira and Tovan            |
| [scene capture]           |
| source: encounter-17      |
|                           |
| quote / interpretation   |
| [Open scene] [Live]      |
+---------------------------+
```

Every quoted line must point to a saved utterance once P3 exists. Before P3, a fixture quote must be visibly labeled `Authored example - not a recorded utterance`, or omitted from the production projection.

## 4. Navigation, selection, and failure behavior

### State transitions

| Action | Required state change | Must not happen |
| --- | --- | --- |
| Select Spark in World | Set `selectedSparkId`; retain timeline/mode/pulse; offer Follow | No simulation call, AI call, or knowledge grant |
| Follow selected Spark | Set `view=follow`, preserve source event and return target | No reselection on SSE updates |
| Open encounter/event | Set `encounterId` and `eventIds`; use source pulse | No inferred participants or invented event |
| Open Chronicle source | Set `view=chronicle`, `mode=history`, exact timeline/pulse, and return target | No new narration or world mutation during read |
| Back | Restore the previous complete navigation state | No implicit jump to newest pulse |
| Return to Live | Select newest supported checkpoint on the current active timeline, set `mode=live`, clear historical pulse only, preserve Spark if present | No branch, archive, or pulse mutation |
| Manual history scrub | Set `mode=history` and selected pulse on the selected timeline | No live SSE payload replacing the requested historical view |
| Select another Spark | Replace only `selectedSparkId`; preserve timeline/pulse and view | No private context exposure |
| Open archived branch | Use explicit branch timeline metadata and history state | No assumption that an archived branch is live |

### Empty and unavailable states

| Condition | Visible response | Recovery |
| --- | --- | --- |
| Missing Spark ID | “This Spark is not present in this checkpoint.” | Return to World or choose a Spark from the checkpoint |
| Spark exists in live but not selected historical pulse | “Mira had not entered this history yet.” | Open the Spark's first available pulse or return to Live |
| Missing event/encounter source | “This moment is unavailable; no source record was found.” | Back, World, or Return to Live |
| Incompatible checkpoint | “This checkpoint cannot be read by this First Glow viewer.” | Choose a supported checkpoint; do not migrate or invent |
| Empty timeline | “This branch has no supported checkpoint.” | Return to parent timeline or World |
| Stale history response | Keep current view and show a non-blocking “history changed; reload” state | Re-request through `HistoryRequestSequencer` |
| Archived timeline | Show `ARCHIVED` and preserve read-only behavior | Return to Live on active timeline or continue reading archive |
| No moments/chapters | “No recorded chapter is available yet.” | Continue observing; no synthetic highlight |

## 5. Visibility and provenance matrix

The observer can see a projection only when its source record is committed, its visibility rule allows it, and its referenced timeline/checkpoint is available. Viewer access is not Spark knowledge.

| Field | Source of truth | Observer visibility | Empty/denied state | Owner |
| --- | --- | --- | --- | --- |
| Objective event | `timeline_events.event_json`, returned by `/api/events` or `/api/history` | Public if the event's observer projection is allowed | “No objective event recorded” | Server/engine |
| Event participants | Committed event participant/actor IDs | Public IDs/names only when the event projection includes them | “Participant not identified in this record” | Server/engine |
| Witnessed speech | Proposed P3 `utterances` record accepted and committed atomically | Public only if observer policy permits the utterance; show speaker, intended/actual recipients, quote, pulse, provenance | “Speech was not recorded or is not available to this observer” | Server/engine |
| Communicated claim | Spark-local knowledge `communicatedClaims` plus P3 source reference | Observer may see the communication record, but must distinguish claim from truth | “Claim unavailable; do not infer outcome” | Engine/server |
| Private memory | `first-glow-reflection-memory.ts` bounded Spark-local context | Never exposed by default; P2 shows only authorized public outcome/evidence | “Private Spark context is not shown” | Engine privacy boundary |
| Intention | `FirstGlowIntention` and history intention records | Show bounded summary, activity/status, source, evidence IDs, and causal IDs when observer projection allows | “No active or recorded intention” | Engine observer projection |
| Reflection summary | `first-glow-observer.ts` projection | Show capacity/usage and recorded summary, never hidden reasoning or private memory contents | “No reflection was committed at this pulse” | Engine/server |
| Narrator interpretation | Existing `interpretations` for current First Glow; future P4 chapter narration separately persisted | Mark as interpretation, include source/evidence IDs, and never present it as objective fact | “Interpretation unavailable” | Server/P4 narrator boundary |
| Proposed speech/effect | P3 provider or rules proposal before validation | Never show as spoken or completed history; diagnostics may show rejected/fallback metadata to authorized operators only | “Proposal rejected or not committed” | Engine/server |
| Accepted structured effect | P3 validated committed effect and resulting objective event/ledger/relationship record | Public only through its observer projection, with exact effect source and pulse | “No accepted effect was committed” | Server/engine |
| Chronicle quote | P4 chapter reference to an accepted utterance | Exact saved text only; no paraphrase presented as quote | “Quote source unavailable” | P4/server |
| Illustration | P4 capture or separately versioned labeled illustration | Label `world capture` versus `illustration`; never use it as geometry or event evidence | “No image available; text and source scene remain authoritative” | P4/web/art workflow |

## 6. Authored Mira/Tovan storyboard

The following is an **authored example**, not a scripted outcome, recorded event, or fixture that may be mistaken for implementation.

### Shared setup

Mira and Tovan are at a charge pool whose weakening is an objective world condition. Mira has a prior recorded encounter with Tovan. The viewer notices the encounter in World at `timeline-main`, pulse 42, selects Mira, and enters Follow. The same source references remain attached throughout.

### Outcome A: report, investigation, and later help

1. World shows Mira and Tovan co-present near the pool with a moments-to-watch link to `encounter-42`.
2. Follow shows Mira's bounded current intention and the authorized weakening-pool evidence. A future P3 exchange could record Mira's report to Tovan.
3. Tovan receives the claim as a claim, not a fact. He investigates through a feasible First Glow action. The server commits the accepted communication and later investigation event.
4. Chronicle displays the moment, exact accepted quote, the investigation event, and a later help event only if those records exist. The narrator may say “Tovan investigated after hearing Mira's report,” but may not claim private certainty.
5. The evidence link opens the historical checkpoint containing `encounter-42`; Return to Live returns to the newest pulse without changing the world.

### Outcome B: refusal and departure

1. World and Follow begin identically, preserving the same evidence and selection state.
2. Tovan declines the proposed exchange or leaves the pool when the recorded rules permit departure. A refusal is an authored example here until P3 supplies the actual persisted contract.
3. The committed outcome is a departure/refusal event, with no accepted promise, charge transfer, consent, or trust improvement unless an explicit later rule records one.
4. Chronicle states that the encounter ended without agreement and links to the departure event. It does not frame cooperation as the correct ending.
5. The viewer can open the exact scene and return to Live. The two outcomes are legitimate branches of the same bounded situation, not morality scores.

## 7. Minimum P3 and P4 interfaces

These are **proposed interfaces**, not implemented schemas. P3 and P4 must version them, validate every reference, and record compatibility behavior before use.

### P3 conversation contract

```ts
type ProposedConversation = {
  version: "conversation-proposal-v1";
  id: string;
  timelineId: string;
  pulse: number;
  encounterId: string;
  speakerSparkId: string;
  intendedRecipientSparkIds: string[];
  candidateUtterance: { text: string; evidenceEventIds: string[] };
  proposedEffects: Array<{
    kind: "communicate-claim" | "propose-commitment" | "propose-intention";
    payload: unknown;
    evidenceEventIds: string[];
  }>;
  provider?: { account: string; model: string; promptVersion: string; contextVersion: string };
  fallback?: { reason: string; rulesPath: string };
};

type AcceptedConversation = {
  version: "conversation-record-v1";
  id: string;
  timelineId: string;
  pulse: number;
  encounterId: string;
  speakerSparkId: string;
  intendedRecipientSparkIds: string[];
  actualRecipientSparkIds: string[];
  quote: string;
  evidenceEventIds: string[];
  provenance: "rules" | "authorized-provider" | "deterministic-fallback";
  acceptedEffects: Array<{ kind: string; effectId: string; resultingEventIds: string[] }>;
  contextVersion: string;
  schemaVersion: string;
};
```

Required rules: stable IDs; timeline/pulse; eligibility and location; speaker and intended/actual recipients; bounded text and turn count; interruption and timeout; evidence and knowledge references; proposed versus accepted effects; explicit acceptance for commitments; duplicate/idempotency key; provider/budget/fallback metadata; atomic append with consequences; recipient memory as a received claim; replay without provider calls. A rejected proposal is never an accepted quote.

### P4 Chronicle contract

```ts
type ChronicleEdition = {
  version: "chronicle-edition-v1";
  id: string;
  timelineId: string;
  edition: number;
  sourceChapterIds: string[];
  sourceReferences: Array<{
    kind: "checkpoint" | "event" | "encounter" | "spark" | "utterance" | "interpretation";
    id: string;
    timelineId: string;
    pulse: number;
  }>;
  chapters: Array<{
    id: string;
    scale: "moment" | "spark-story" | "season";
    title: string;
    body: string;
    quoteReferences: string[];
    interpretationReferences: string[];
    illustration?: { kind: "world-capture" | "labeled-illustration"; assetId: string; provenance: string };
  }>;
  generation: { source: "authored-fixture" | "deterministic-template" | "authorized-narrator"; version: string; provider?: string; model?: string };
};
```

P4 must preserve prior editions, reject future or cross-timeline source references, distinguish facts/claims/interpretations, ensure every quote resolves to an accepted utterance, and separate reread from explicit regeneration. A Chronicle is observer history; it does not write Spark knowledge.

## 8. Decisions and unresolved choices

### Selected for this contract

- First Glow remains the only runtime and the only world shown.
- The prototype is bounded 2D trailing/close-follow camera using existing Phaser geometry.
- World, Follow, and Chronicle share `timelineId`, `pulse`, Spark identity, encounter/event IDs, and explicit live/history mode.
- Observer reads are read-only; watching does not alter model, reflection, knowledge, scheduling, or outcomes.
- Evidence links open exact recorded checkpoints; Return to Live is explicit.
- Rules-only behavior and provider-free replay remain the safe fallback and comparison path.
- World captures are the first Chronicle illustration source; generated images are deferred and must be labeled.
- Authored storyboard text is example material, not a required outcome or fact.

### Unresolved, phase-owned choices

| Choice | Owner phase | Required decision/evidence |
| --- | --- | --- |
| Follow camera offset, zoom bounds, and edge treatment | #230 | Desktop/mobile captures, keyboard/touch, reduced motion |
| Exact public visibility policy for speech and interpretations | #230/#231 | Privacy review against Spark-local knowledge and hosted observer boundary |
| Conversation turn order, duration, interruption, and eligibility | #231 | Versioned P3 contract and deterministic tests |
| Commitment acceptance and structured effect vocabulary | #231 | Validated effects, atomic history, restart/branch/replay evidence |
| Storage tables/records for utterances and Chronicle editions | #231/#232 | Compatibility, backups, append-only semantics, missing-source states |
| Narrator provider/account/model, retention, budget, and kill switch | #232 | Explicit authorized rollout contract; no inference from this design |
| Illustration generation and asset provenance | #232 | Separate art decision and labeled evidence boundary |
| Chapter selection and season aggregation | #232 | Traceability and reviewer comprehension, not dramatic-event frequency |
| Benefit gate and human review protocol | #233 | Pre-registered matched rules-only/AI study |
| Age/model progression | #234 | P5 evidence and explicit policy; no automatic upgrade |

## 9. P1-to-successor checklist

### P1 (#229)

- [x] Connected identity contract covers view, live/history, timeline, pulse, Spark, encounter, events, and return target.
- [x] Existing component inventory and integration gaps are recorded with file pointers and package owners.
- [x] Desktop/mobile wireframes cover World, Follow, and Chronicle.
- [x] Camera choice and non-goals are explicit.
- [x] Visibility matrix names source, rule, empty state, and owner for each visible field.
- [x] Mira/Tovan storyboard includes cooperation/investigation and refusal/departure as legitimate authored outcomes.
- [x] P3 conversation and P4 Chronicle interfaces distinguish proposed versus implemented schemas.
- [x] Decisions, unresolved choices, verification, and successor handoffs are recorded.

### Handoff to P2 (#230)

- Implement browser-local navigation and explicit World/Follow mode.
- Preserve selection across SSE, history scrubbing, reconnect, timeline changes, and manual camera intervention.
- Use existing committed positions and observer projections; fixtures must be labeled.
- Verify missing Spark/checkpoint recovery, keyboard/touch, mobile, reduced motion, and watched/unwatched equality.

### Handoff to P3 (#231)

- Implement the proposed conversation record as a versioned server/engine contract.
- Reuse context packet and reflection memory boundaries; do not expose them to the observer by accident.
- Persist accepted exchange and effects atomically; feed recipient knowledge as a claim.
- Verify refusal/departure, malformed/hidden evidence, duplicate, timeout, budget, kill switch, restart, branch, and provider-free replay.

### Handoff to P4 (#232)

- Build moments and chapters only from committed source references.
- Preserve quote exactness, interpretation labels, prior editions, missing-source states, and Return to Live.
- Keep narration/illustration budgets separate from Spark reflection capacity.
- Verify desktop/mobile/keyboard reading and independent retelling with evidence.

### Handoff to P5/P6 (#233/#234)

- P5 must compare ordinary AI lives to matched rules-only controls without treating narration quality as agent quality.
- P6 may recommend a future policy only after P5 evidence; it must not activate a new age, model, or automatic upgrade.

## 10. Verification and scope limits

This phase is Markdown-only. Verification is therefore:

1. Read this contract against `docs/living-lives-plan.md`, `docs/world-theme.md`, `docs/ai-plan.md`, `docs/reflection-capacity-plan.md`, and `docs/ai-p14-rollout-runbook.md`.
2. Confirm the file pointers exist and the API claims match `packages/server/src/index.ts`, `packages/web/src/main.tsx`, `packages/web/src/history-sequencing.ts`, and the named engine modules.
3. Check all local Markdown links and terminology with `rg`; inspect the focused diff and run `git diff --check`.
4. Do not run or claim simulation, browser, provider, deployment, human-review, or live-quality evidence. Those belong to later phases.

No provider call, runtime behavior change, real dialogue, full 3D renderer, Hearth Circuit activation, human contact, model training, new world mechanic, or production deployment is authorized by this contract.
