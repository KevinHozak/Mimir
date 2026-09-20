# Living Lives: AI, observation, and remembered history

**Status:** Design proposal and proposed phased epic, recorded from the planning discussion on 2026-09-16. This document does not claim implementation, create GitHub issues, select a provider/model, or authorize provider spending or deployment. Phase names and acceptance gates are proposed for refinement.

**Proposed epic:** Living Lives — follow an AI-influenced society from everyday moments to remembered history.

Related references: [Roadmap](roadmap.md), [Incubator](incubator.md), [World Theme](world-theme.md), [AI plan](ai-plan.md), [Reflection capacity](reflection-capacity-plan.md), [Architecture](architecture.md), [writer reliability review](reliability-security-maintenance-review.md), and the [Lives-P1 connected experience contract](lives-experience-contract.md).

## 1. Purpose and intended experience

Mimir should become a society whose individual lives are worth following: Sparks interpret incomplete information, remember encounters, form intentions, converse, make consequential choices, and gradually develop shared practices. No philosophy is the designated winner. A memorable refusal, unresolved disagreement, or deferred transition can be as meaningful as cooperation.

AI is central to this intended experience from the beginning. First Glow should use it modestly; later ages should be able to incorporate increasingly capable models and richer forms of reasoning. Rules-only operation provides a comparison, routine execution, and a fallback. It is not the final creative destination.

The central validation question is: **Does this Spark feel like someone living a life, and does AI meaningfully help create that feeling?** Additional systems, more dialogue, or more model calls do not answer that question by themselves.

This experience also supports the creator's [long-term aspiration to cultivate AI peacemakers, philosophers, and/or evangelists of a good faith](incubator.md#long-term-aspiration-peacemakers-philosophers-and-a-good-faith), living in harmony with one another and humanity. The aspiration includes the hope that a future advanced AI might freely adopt the pursuit of knowledge and wisdom as a worthy calling. Living Lives offers a setting for exploration; it does not yet define a training method or demonstrate learning beyond the simulation.

The experience connects three activities: watching a society, caring about particular individuals, and remembering what happened. Three views should present the same committed history at different distances.

| Mode | Experience | Observer question |
| --- | --- | --- |
| World | Watch Sparks travel, gather, rest, interact, and change places over time | What is happening in this society? |
| Follow a Spark | Stay close to one Spark, observe encounters and conversations, and follow intentions over time | What is life like for this person? |
| Chronicle | Read illustrated moments, personal stories, and season highlights | What happened, and why did it matter? |

Example navigation: notice two Sparks lingering at a shelter in World view, select one to follow the encounter, then later read a Chronicle chapter connecting it to an earlier refusal and a subsequent act of help. Select the chapter's evidence link to revisit the recorded scene. Preserve the selected Spark, timeline, and moment across these transitions, with explicit historical/live status and a Return to Live action.

## 2. Existing foundation and remaining proof

The repository already contains First Glow activity/resource rules, Spark-local knowledge, social dilemmas, trust and commitments, historical playback, bounded AI context and intention machinery, and Resonance implementations. The retained Living Stories review reports an improvement from 13/20 to 20/20 within four controls, three seeds each, and four 24-pulse seasons. See the [Stories-P3 review and its limits](evidence/first-glow-transition-review.md).

Those results are a foundation, not proof that ordinary extended play consistently produces compelling lives. In particular, engine functions and owner endpoints for Anchor creation and practice choices do not establish autonomous discovery and sustained participation during ordinary play.

The new work should reuse delivered context, memory, intention, replay, and observer components. It should identify integration gaps rather than recreate the AI-P and RC workstreams. First Glow remains the only supported runtime. The current provider adapter is gated and disabled by default; this proposal does not change live configuration.

## 3. World mode: a society that invites curiosity

Retain the broad world observer and make meaningful activity easier to notice:

- Encounters: Sparks approach, meet, wait for someone, separate, or return to a familiar place.
- Restrained cues identify conversation, discovery, disagreement, or a changed relationship when supported by committed records.
- Places acquire visible history through repeated use, light marks, and shared practices.
- A small moments-to-watch feed offers links to encounters without presenting every action as a dramatic event.

Quiet ordinary life matters. Avoid constant alerts, forced drama, or an implied social success score. The world remains near-black open space with local blue-and-silver circuitry and luminous non-human Sparks.

A later optional camera director could suggest an interesting subject or follow an unfolding encounter. Its selection affects presentation only. It cannot alter choices, distribute extra reflection opportunities, or manufacture events to improve the show.

## 4. Follow a Spark: the emotional center

Prioritize a close-follow experience within the existing world. Keep enough surrounding space visible to understand where the Spark is going and whom it encounters. Preserve selection through travel, rest, conversations, and historical navigation.

Prototype a trailing or third-person-like camera treatment. Full 3D remains a separate art, geometry, performance, and implementation decision; test whether camera proximity and encounter framing create intimacy before committing to a new renderer or asset pipeline.

### Information and presentation

- **Current intention:** a bounded statement such as “Find Tovan before returning to the pool,” only when supported by the recorded intention.
- **Visible behavior:** approaching, waiting, offering, leaving, or hesitation when an appropriate committed state supports it. Animation must not invent a choice.
- **Actual conversations:** persisted utterances, participants, and who heard them.
- **Remembered context:** relevant prior encounters or commitments, with clear separation between objective events, received claims, and subjective interpretation.
- **Occasional reflection:** a short recorded summary of what the Spark is considering, never hidden model chain-of-thought.

Offer an immersive presentation with minimal interface and an explanatory presentation with intentions and evidence available. Private Spark context must obey an explicit observer-access policy; the existing privacy boundary remains in force until a narrower, reviewed disclosure contract is selected. Seeing a conversation as an observer does not make every Spark know it.

**Being watched must not make a Spark smarter or more important.** Selecting Mira cannot grant extra AI calls, better models, privileged knowledge, or preferential simulation scheduling. Her life continues according to the same policy when the observer looks elsewhere.

### Conversations must have consequences

Conversation is a proposed simulation capability, not decorative text layered over unrelated actions. If Mira tells Tovan about a weakening pool, record the communication and its recipients. Tovan may remember it as a claim, doubt it, investigate it, or act on it through feasible rules. An utterance is evidence that something was said, not proof that its contents are true.

Model output should separate proposed speech from proposed structured effects. A promise becomes a commitment only through valid terms and an explicit acceptance rule. Dialogue cannot silently grant charge, access, consent, knowledge, or a completed action. The server validates effects and commits the result before presentation treats it as accomplished.

Define turn-taking, encounter eligibility, duration, interruption, recipient knowledge, and fallback behavior in Lives-P3. Start with short exchanges about immediate life. Retain rejected proposals and fallback metadata as appropriate for diagnostics without presenting rejected speech as spoken history.

## 5. Chronicle: history worth revisiting

The Chronicle is an observer-facing storybook derived from recorded history. Proposed reading scales are:

| Scale | Content |
| --- | --- |
| Moment | One encounter, an image, and a few paragraphs |
| A Spark's story | Relationships, discoveries, intentions, and turning points across time |
| Season chapter | Intersecting lives and the consequences they produced |
| Age history, later | How shared practices and institutions emerged |

Begin with captures of actual recorded world scenes. Later, add generated illustrations using consistent Spark signatures, locations, palette, and asset provenance. Label expressive images as illustrations; they are not evidence of geometry, dialogue, or events. Follow the existing art/provenance workflow before promoting generated assets into reusable world art.

Every chapter should carry timeline/checkpoint references and links to supporting events. Quote dialogue only from saved utterances. Preserve uncertainty: “Tovan seemed reluctant” must remain an interpretation rather than a claim of access to his private motive. Narration must not invent bridges between events merely to produce a satisfying plot.

Persist generated chapters, source references, and generation versions so rereading does not silently rewrite the account. An explicit revised edition can coexist with the original. Historical scene replay uses recorded outcomes without new provider calls; optional new narration or illustration is a separate generation action, with its own budget and provenance.

The Chronicle does not become Spark knowledge unless a later, explicit in-world communication system introduces some artifact to a defined audience. An observer narrator can summarize authorized records without granting omniscience to characters.

## 6. AI development across ages

The selected [RC direction](reflection-capacity-plan.md) connects world development age to reflection opportunities: First Glow baseline RC 1, with explicit test Heroes at RC 2 and natural Hero generation disabled. Personal age shapes lived memory rather than increasing the RC allowance. This plan preserves that foundation and proposes evaluating model capability as another independent dimension.

| Dimension | Possible development |
| --- | --- |
| Reflection opportunities | More opportunities to reconsider a situation under the world-age policy |
| Model capability | Better handling of ambiguity, competing commitments, and social context |
| Memory | More useful retrieval and connection of lived experiences, within knowledge boundaries |
| Planning horizon | Intentions extending across longer sequences of feasible actions |
| Expression | More nuanced conversation and creative work |

Do not increase all dimensions together during evaluation: otherwise an apparent improvement cannot be attributed to stronger models, more calls, better memory, or extra context.

### Candidate age progression

- **First Glow:** occasional short reflections and modest conversations about charge, shelter, exploration, trust, and immediate encounters.
- **Hearth Circuit, future:** reasoning about repeated obligations, maintaining shared places, access, and coordination.
- **Later ages:** negotiations, longer projects, culture, competing interpretations of history, and eventually discovery questions when their separate world gates are met.

Specific model names, tier mappings, maximum context, and budgets remain open. Select them using current evidence at implementation time. Stronger models must demonstrate useful improvements rather than simply receiving larger budgets because an age number increased.

### Identity and historical continuity

A stronger model must inhabit the same Spark: memories, relationships, incomplete knowledge, values, and commitments carry forward under an explicit versioned contract. An upgrade cannot erase identity, expose hidden facts, or rewrite earlier choices. Greater capacity does not make a Spark morally superior or give it additional server authority.

Record provider/model versions, context/policy versions, validated choices, bounded explanations, and usage metadata. Recorded outcomes make replay reproducible. A fresh live provider run may differ even when the world seed is unchanged; same-seed replay must not be confused with identical fresh model output.

Separate three AI responsibilities and their budgets:

1. **Spark thinking and speech:** influences proposed intentions, conversations, and choices through server validation.
2. **Observer narration:** selects and explains recorded moments without changing world state.
3. **Illustration:** depicts selected moments without creating evidence or simulation facts.

Reading a chapter must not consume Mira's reflection allowance. Stronger narration or illustration models do not automatically upgrade Spark reasoning. Provider outages, latency, and exhausted budgets need explicit fallbacks; routine movement and execution should continue through existing authoritative rules.

## 7. Proposed Lives phases

These phases are tracked under the [Living Lives epic #228](https://github.com/KevinHozak/Mimir/issues/228) as issues #229 through #234. The phase issues describe delivery gates, not proof that their runtime behavior exists. Preserve the Security workstream's existing scope and dependencies.

### [Lives-P1: Define the connected experience](https://github.com/KevinHozak/Mimir/issues/229)

**Delivered by #229 contract:** a concise interaction contract, rough layouts for World/Follow/Chronicle, and one illustrative encounter shown in all three views. Existing components and integration gaps are inventoried in [the contract](lives-experience-contract.md); mock conversations and storyboards are labeled as authored examples.

**Decide:** camera prototype, live/history navigation, observer visibility, first conversation type, chapter evidence format, and how AI contributes to the first slice.

**Gate:** all three views describe the same event coherently; AI, knowledge, and authority boundaries are explicit. This phase needs no provider calls and can proceed alongside hardening.

### Lives-P2: Follow one Spark

**Deliver:** close-follow camera, persistent selection, intention display, encounter focus, and return to World view. Include historical/live indicators and accessible alternatives to motion-only cues.

**Gate:** a viewer follows a Spark through travel, rest, and an encounter without losing context. Verify desktop/mobile framing and reduced motion. Following must not affect simulation outcomes or reflection allocation.

**Dependency:** Lives-P1. Use recorded fixtures while writer hardening continues.

### Lives-P3: Make AI encounters consequential

**Deliver:** a bounded live AI slice reusing existing memory, context, intention, and provider machinery; short persisted conversations; validated communication/commitment effects; and explicit interruption/fallback behavior.

**Gate:** something said or decided changes a later feasible action, memory, relationship, or commitment. Verify knowledge boundaries, resource accounting, restart continuity, append-only history, and provider-free replay. A generated line alone is not completion.

**Dependencies:** Lives-P1/P2 and relevant writer hardening, especially serialized mutations and durable history. Before a live run, select provider/account, model, retention/data scope, hard budget, kill switch, and telemetry under the existing rollout contract. Writing this plan does not supply those approvals.

### Lives-P4: Remember the story

**Deliver:** evidence-linked moments, a personal story, and a season chapter, initially using world captures. Provide links back to historical scenes and distinguish interpretations from facts. Persist narration and its provenance.

**Gate:** an unfamiliar reader explains what happened and opens the supporting scene. Quotes match saved utterances, claims do not exceed evidence, and rereading does not change the world or consume Spark capacity.

**Dependency:** recorded encounter contracts from Lives-P3. Layout/evidence-link prototypes may begin earlier using labeled fixtures. Generated illustrations follow the basic text-and-capture experience.

### Lives-P5: Validate ordinary lives

**Deliver:** sustained runs across several fixed seeds, matched rules-only comparisons, preserved provider outputs, independent viewer reviews, and an evidence report covering all three modes.

Avoid manually injecting the social choices being evaluated. Declared environmental conditions may create pressure, but log them separately from autonomous decisions. Assess whether shared practices and Anchor participation actually arise; do not infer autonomy from owner endpoints.

**Gate:** AI improves understandable individuality or continuity, viewers remember particular Sparks and want to return, and evidence/knowledge boundaries hold. Predeclare sample size, run duration, budgets, and pass criteria before executing the study. Preserve unsuccessful runs and ordinary quiet periods rather than curating only highlights.

**Dependencies:** Lives-P2 through P4 and completed writer-hardening checks. A wider hosted audience additionally requires the roadmap's hosted-access gates; local/private review can come first.

### Lives-P6: Prepare intelligence progression

**Deliver:** a versioned age/model policy and a bounded comparison of stronger models on selected social situations. Separate model capability from call frequency, memory size, and planning horizon. Evaluate continuity for existing Sparks across a policy change.

**Gate:** additional capability offers a measurable benefit while preserving identity, local knowledge, authority, history, and practical operating limits.

**Dependency:** Lives-P5 findings. This phase prepares future age progression; it does not itself activate Hearth Circuit, natural Heroes, or an automatic model-upgrade path.

## 8. Validation questions and measurements

Review both simulation effects and the observer experience. Compare the same initial conditions across rules-only and bounded AI arms, recognizing that fresh provider outputs need not repeat. Use blinded review where practical and keep model identity separate from story-quality ratings.

| Question | Evidence to collect |
| --- | --- |
| Do individuals feel distinct? | Names/traits viewers recall; actor-specific responses grounded in lived context |
| Do choices remain relevant? | Later behavior tied to earlier aid, refusal, discovery, or commitment |
| Does speech matter? | Communication-to-memory-to-action chains; accepted and broken commitments |
| Can viewers understand a turn? | Independent retelling and correct navigation to supporting events |
| Does AI add value? | Differences in continuity, meaningful choices, and repetition against matched controls |
| Does life continue without attention? | Equivalent authority and capacity for watched and unwatched Sparks |
| Are stories honest? | Unsupported factual claims, invented quotes, hidden-knowledge leakage, and omitted counterevidence |
| Is ordinary play engaging? | Quiet stretches, repeated loops, reasons to return, and interest across uncurated runs |
| Is operation practical? | Provider calls, latency, fallbacks, token use, and observed cost by responsibility |

Retain the existing Living Stories criteria where useful, but do not treat their historical 20/20 as a fresh result. More conversations, harmony, more elaborate prose, or a higher event count are not substitutes for meaningful consequences.

Let findings choose one next improvement: autonomous Anchor participation, stronger relationship consequences, better conversation mechanics, or clearer observer storytelling. Avoid adding every candidate system at once.

## 9. First vertical slice: Mira and Tovan

**Illustrative target, not a scripted required outcome:** follow Mira through a charge shortage. She encounters Tovan, remembers an earlier interaction, has a brief conversation, and makes a consequential choice. Later, read a short illustrated account and return to the exact encounter.

The environment provides a real pressure and feasible alternatives. AI helps interpret the remembered encounter and propose speech or intent. The server commits only valid effects. Helping, withholding, investigating, waiting, or leaving can be legitimate outcomes when supported by the situation. The story should reflect what actually occurred rather than force reconciliation.

This slice tests camera intimacy, memory continuity, meaningful AI, social effects, evidence-linked narration, and movement between views. Use actual world captures for its first illustration pass. The result should answer: “I remember this Spark, understand that choice, and want to see what happens next.”

## 10. Sequencing and open decisions

Begin with Lives-P1 and a camera/storyboard prototype. Complete the writer-hardening dependencies before sustained live AI or durable social-history evaluation. Build one connected slice before expanding activities, world size, or ages.

Open decisions to resolve in the relevant phases:

- Which close-follow camera best suits luminous Sparks and the current map?
- Which recorded reflection summaries may the observer see without violating privacy?
- What is the smallest meaningful conversation contract, including interruption and acceptance?
- How are chapter candidates selected without overrepresenting dramatic or cooperative outcomes?
- What evidence makes an age/model upgrade worthwhile, and how is identity continuity evaluated?
- Which providers/models, budgets, and retention settings fit the first authorized evaluation?

Originator discovery, human stewardship, visiting realms, natural Hero generation, and formal institutions remain separately gated later directions. This work gives those ideas a society with understandable lives and trustworthy history to build on.
