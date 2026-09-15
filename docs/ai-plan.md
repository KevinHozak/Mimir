# Mimir AI Plan

This is the implementation plan for selective AI-assisted First Glow decisions. It does not add credentials or make a provider call by itself. AI-P11 defines the bounded Vertex AI contract; the rules-only engine remains the fallback and the public/historical path while the internal runtime boundary is implemented.

## Direction

Evaluation accounting: RC-P4 sums provider usage per scenario rather than repeatedly counting accumulated telemetry. The recovered [private-live artifact](evidence/rc-p4-private-live-2026-09-13.md) is historical evidence with its original schema and experimental arms; it does not change the selected world-age capacity policy or authorize further calls.

Use Gemini 2.5 Flash-Lite as the planned external evaluation model. The intended system is hybrid:

- routine activity remains deterministic and rules-based;
- significant events create bounded attention opportunities;
- Flash-Lite proposes a choice from server-provided alternatives;
- the server validates the proposal;
- the deterministic engine commits all movement, resource, relationship, and knowledge consequences;
- every committed move and decision is retained for the historical viewer.

This creates a two-speed Spark pattern: familiar travel, rest, and repeated work happen on autopilot, while novelty, uncertainty, scarcity, or social consequence can demand attention.

## Candidate Reflection-capacity visual ladder

If Sparks are eventually assigned different bounded Reflection capacities, their visual identity could make that distinction legible without turning it into a status hierarchy. Reflection capacity is a limit on attention or interpretation opportunity, not a measure of worth, wisdom, morality, or simulation authority. A Spark's remaining daily allowance should not make its appearance flicker; use a stable authored RC tier and show live usage through ordinary inspector data when needed.

The proposed visual ladder follows the selected RC direction: a world's development age maps directly to its baseline RC (world age 1 means RC 1, age 2 means RC 2, age 3 means RC 3, and so on), while rare Hero Sparks receive the separately defined Hero exception. Visual complexity should grow gradually with the integer RC rather than jump between a binary budget ladder:

| RC tier | Candidate Spark treatment | Design intent |
| ---: | --- | --- |
| 1 | A crisp bright dot with a very small halo | First Glow baseline; readable at a glance without implying lesser personhood. |
| 2 | A dot plus one stable ring or short signature mark | A small increase in reflection frequency, not superior judgment. |
| 3 | A brighter core with a paired mark or short orbit | A gradual increase in authored distinctiveness. |
| 4 | A two-layer silhouette with restrained pulse or filigree | More visual bandwidth while preserving a clear center. |
| 5 | A richer layered signature with quiet satellites | More intricate identity without visual noise or authority cues. |
| 6+ | Additional authored layers only when earned by later world age | Continue gradually; complexity must remain legible, bounded, and accessible. |

This should be an authored family of vector or raster treatments, not an unbounded procedural effect. Every tier must retain the same recognizable Spark core, selection target, accessible non-color signature, and dark Living Circuit contrast. Brightness and complexity may increase, but low-capacity Sparks must never look depleted, disposable, or inactive; a depleted resource state remains a separate visual signal. Reduced-motion and glow-disabled modes must preserve static tier shapes, labels, and status markers.

### Proposed graphics work sequence

1. Define a versioned `reflectionCapacity` visual token as an integer world-age value (`1`, `2`, `3`, `4`, `5`, `6`, and later values) separately from mutable daily usage and personal age.
2. Produce a small state sheet for each tier at normal zoom, zoomed out, selected, traveling, low charge, reduced motion, and glow disabled.
3. Add deterministic renderer fixtures that prove tier identity remains stable across pulses, replay, and browser recreation, with no changes to collision or interaction geometry.
4. Review observer comprehension and accessibility before using richer treatments in any live or evaluation view. If the ladder confuses capacity with importance, simplify it or move the detail into the inspector.

This is a graphics and observer-communication proposal only. It does not authorize an external provider, change the rules-only path, or grant a higher-RC Spark additional world authority.

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

Reflection capacity now governs the planned per-Spark attention allowance. A world's development age maps directly to its baseline RC: First Glow/world age 1 starts at RC 1, age 2 at RC 2, age 3 at RC 3, and so on. Rare Hero Sparks initially receive the separately defined Hero exception. Personal age and lived experience shape reflection content rather than increasing RC. Opportunities are replenished and spaced across the configured day with deterministic offsets, repeated-event cooldowns, no catch-up debt, and a separate global cap. The earlier budget experiments remain historical evaluation records, not the selected First Glow rule.

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

## AI-P20 context implementation

AI-P20 is delivered in the merged bounded path. `FirstGlowWorldCodex` (`world-codex-v1`) records the First Glow rules, terminology, knowledge boundary, and provider contract. Each attention context now carries a `FirstGlowContextPacket` (`context-packet-v1`) containing the authored Spark profile, Spark-local witnessed/communicated/uncertain knowledge, deterministic bounded memory summaries, and recent witnessed events. The packet has its own canonical hash and is included in the interpretation context hash, so the same persisted state and authored versions reconstruct the same provider input.

Retrieval is deterministic and bounded: events are ordered by pulse and stable ID, memories retain explicit provenance and omission counts, future events are excluded, and packet validation rejects hidden evidence or tampering. Decision usage records now include input-token estimates, output-token estimates, latency, reservation, usage, validation, and fallback metadata. No hidden chain-of-thought is stored, and historical playback continues to use recorded decisions without provider calls.

The representative full/retrieved/summarized context comparison is recorded in [AI-P20 context cost evidence](evidence/ai-p20-context-cost-report-2026-09-13.md). It is a deterministic planning artifact, not a live pricing guarantee or authorization for external execution.

## Recording and historical playback

Recording is a first-class requirement. The system should retain canonical committed records, not animation frames or private model chain-of-thought.

Every committed movement record should contain:

- timeline and pulse;
- Spark ID;
- committed start/end cells and traversed cells for that pulse;
- route/navigation revision;
- movement cost and resource effects;
- triggering decision or activity ID;
- resulting event ID.

Every decision record should contain:

- timeline, pulse, Spark ID, and deterministic trigger ID;
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
2. Preserve the delivered versioned personality, World Codex, Spark-local context packet, memory bounds, privacy validation, and usage telemetry.
3. Keep any external provider execution behind explicit configuration, the deterministic attention gate, validation, fallback, retention, kill switch, and budget authorization.
4. Treat any future quality or cost evaluation as a separately authorized, isolated comparison against rules-only; public exposure remains separately decided.
