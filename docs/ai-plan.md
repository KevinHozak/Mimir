# Mimir AI Plan

This is a future implementation plan for selective AI-assisted First Glow decisions. It does not activate an external provider, add credentials, or change the current runtime. The rules-only engine remains the normal-operation product path until a separately authorized evaluation proves that the hybrid model improves the observer experience.

## Direction

Use Gemini 2.5 Flash-Lite as the planned external evaluation model. The intended system is hybrid:

- routine activity remains deterministic and rules-based;
- significant events create bounded attention opportunities;
- Flash-Lite proposes a choice from server-provided alternatives;
- the server validates the proposal;
- the deterministic engine commits all movement, resource, relationship, and knowledge consequences;
- every committed move and decision is retained for the historical viewer.

This creates a two-speed Spark pattern: familiar travel, rest, and repeated work happen on autopilot, while novelty, uncertainty, scarcity, or social consequence can demand attention.

## Attention policy

The attention trigger itself is deterministic. The provider must not decide whether it is allowed to run.

Potential attention events include:

- discovering a new object, route, resource, or trace;
- meeting another Spark unexpectedly;
- observing a weakening or unexpectedly empty charge pool;
- witnessing help, refusal, promise, breach, or a contested mark;
- reaching a new relationship or knowledge threshold;
- repeated failure of a routine activity;
- facing a meaningful risk or scarcity tradeoff.

Routine movement along a known route, ordinary route replanning, rest, charge gathering, and waiting without a meaningful alternative remain rules-only.

The initial budget proposal is four attention calls per Spark per simulated day, replenished rather than permanent. Each event may call at most once, repeated equivalent events receive a cooldown, and a global daily cap remains in force. The per-Spark limit can be tuned by evaluation evidence; increasing it must not remove the event gate, timeout, or global cap.

## Personality-aware context

The attention context should represent the acting Spark as an individual without exposing facts outside that Spark's knowledge boundary. It should include:

- stable Spark identity and name;
- ordered authored value tendencies, such as care, caution, curiosity, independence, patience, and reciprocity;
- practical needs and authored personality description;
- the Spark's opening question or characteristic concern;
- relevant relationship tendencies and committed relationship state;
- current charge, readiness, activity, route, and other feasibility state;
- witnessed facts, communicated claims, and clearly marked uncertain inferences;
- the current event and the allowed alternatives;
- an explicit list of what the Spark does not know.

The model may use values to choose among permitted alternatives, but values never override feasibility. A caring Spark cannot take an unreachable route, spend unavailable charge, or act on another Spark's private observation. Personality is a tendency, not a scripted answer.

The current authored personality material lives in `packages/engine/src/design.ts`, while the runtime Spark state is defined in `packages/engine/src/structured.ts`. A future implementation must version and materialize the relevant authored profile in the context rather than relying on an implicit lookup that could change historical meaning.

## Bounded provider contract

The provider receives a structured context and may return only:

- one alternative from the server-supplied list;
- one bounded claim type;
- a short explanation;
- evidence IDs that are present in the Spark's witnessed evidence.

The provider cannot create events, move a Spark, modify charge or readiness, change relationships, reveal knowledge, select an arbitrary activity, or write directly to persistence. Invalid output, unsupported alternatives, hidden evidence references, timeout, provider failure, or budget exhaustion immediately use the deterministic rules-only fallback.

## Recording and historical playback

Recording is a first-class requirement. The system should retain canonical committed records, not animation frames or private model chain-of-thought.

Every committed movement record should contain:

- timeline and tick;
- Spark ID;
- committed start/end cells and traversed cells for that tick;
- route/navigation revision;
- movement cost and resource effects;
- triggering decision or activity ID;
- resulting event ID.

Every decision record should contain:

- timeline, tick, Spark ID, and deterministic trigger ID;
- candidate alternatives presented by the server;
- selected alternative and whether it came from rules or AI;
- authored personality/profile version used;
- current state inputs needed to understand the choice;
- witnessed and communicated evidence IDs plus uncertainty markers;
- context hash and prompt/schema version;
- provider/model/SKU metadata when AI was used;
- token usage, budget reservation, latency, fallback reason, and validation result;
- resulting objective event, ledger, relationship, knowledge, and explanation IDs.

Do not store hidden chain-of-thought. Store the bounded returned summary, structured choice, evidence references, validation result, and usage metadata needed for audit and replay.

The historical viewer reads these persisted records. It never asks Gemini to reconstruct a past decision. A replayed timeline uses the recorded decision and objective consequences; a branch copies the parent records through its branch point and appends new records. Browser interpolation may animate committed movement, but animation must never become evidence or create an outcome.

## Evaluation plan

The local offline hybrid loop and its 20-encounter fake-provider harness prove adapter boundaries, attention gating, fallback recording, and replay suppression, not real-model effectiveness. A future evaluation should compare matched rules-only and Flash-Lite runs across a larger, blinded sample.

Measure:

- evidence-grounded observer understanding;
- whether choices produce more meaningful downstream stories;
- personality consistency without deterministic repetition;
- valid-output and fallback rates;
- hidden-knowledge leakage, which must remain zero;
- simulation-authority violations, which must remain zero;
- p95 latency and per-Spark/global budget adherence;
- historical replay equivalence and zero provider calls during playback;
- token usage and actual cost per attention event.

Fluent narration alone is not a success. Flash-Lite earns a later implementation phase only if it produces a meaningful improvement over rules-only on observer understanding or plausible downstream choices while preserving all evidence, privacy, determinism, and cost boundaries.

## Cost and authorization

Google AI Pro is not itself an API key or a blanket authorization for billable Gemini API or Vertex AI usage. Any evaluation requires a separately identified Google project/account, an explicitly selected channel, a price snapshot, an isolated hard budget cap, data-minimization and retention rules, usage telemetry, and an operator kill switch.

The current planning estimate for Gemini 2.5 Flash-Lite is $0.10 per million input tokens and $0.40 per million output tokens for standard text usage. At 2,000 input tokens and 150 output tokens per attention event, that is approximately $0.00026 per event, $0.005 for 20 events, $0.26 for 1,000 events, and $2.60 for 10,000 events. These are token-only estimates; retries, reasoning usage, caching, tools, infrastructure, taxes, and operator time are additional. See the [roadmap cost and effectiveness envelope](roadmap.md#google-cost-and-effectiveness-envelope) and recheck Google's first-party [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) and [Google Cloud pricing](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing) immediately before spending.

## Delivery order

1. Keep current rules-only behavior and historical playback unchanged.
2. Materialize versioned personality profiles in the bounded context.
3. Add deterministic attention-trigger and per-Spark/global budget state.
4. Extend event and decision records for movement, personality, provider metadata, and validation results.
5. Add a Flash-Lite evaluation adapter behind explicit configuration and an operator kill switch.
6. Run the matched evaluation and review evidence before considering any normal-operation provider use.
7. Define and prove an allowlisted downstream-effects adapter in an isolated staging timeline; the server remains authoritative and canonical/public paths remain rules-only.
8. Run the limited isolated hybrid staging pilot with recorded state diffs, replay suppression, budgets, and kill-switch evidence.
9. Make a separate adopt, defer, or retire decision before any broader hybrid runtime use.
