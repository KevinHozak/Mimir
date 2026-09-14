# Resonance and Resonance Anchor contract

Status: proposal contract for Resonance-P0. It defines no active First Glow runtime behavior, world object, route, or schema migration. The active runtime remains schema-3, `mimir-sim-v3-first-glow`, and `structured-v2`.

This contract turns the [incubator candidate](incubator.md#candidate-resonance-and-resonance-anchors) into a bounded handoff for Resonance-P1 through P5. It may be implemented only after the Living Stories gate has supplied evidence that the selected pattern creates legible, meaningful seasons.

## Terms and non-goals

**Resonance** is accumulated social and cultural significance produced by repeated, consequential, committed patterns at a real location. It is not charge, currency, raw power, a moral score, a ranking of Sparks, or proof that an interpretation is true. Charge continues to pay immediate activity costs; an Anchor must never mint charge or grant a free buff.

An **Anchor** is the server-committed, durable record and authored world placement that may follow a qualifying candidate. It offers one explicitly bounded social possibility and one explicit tension. A candidate may preserve care, inquiry, resolve, autonomy, repair, or disagreement; the rule never marks one of those patterns as the correct philosophy.

This proposal deliberately does not add a live counter, automatic Anchor creation, new object capability, route, UI effect, or map art. P1 may observe candidates without changing play. P2 must separately select and implement the first actual Anchor.

## Authority and evidence boundary

| Record | Owner and visibility | May establish qualification? |
| --- | --- | --- |
| `ObjectiveResonanceEvent` | Server commits it with the ordinary pulse transaction; observer-readable historical evidence | Yes, when it validates against the rule. |
| `SparkLocalKnowledge` | Serialized per Spark alongside existing witnessed facts and credible communicated claims | No. It limits what a Spark may know or act on. |
| `ResonanceInterpretation` | A bounded, evidence-linked reading; never an authority input | No. It may explain uncertainty but cannot add participants, cost, location, or a qualifying occurrence. |
| `ResonanceCandidate` | Server-derived, deterministic, observer-readable audit record | Yes, only as a proposal awaiting the creation rule. |
| `ResonanceAnchor` | Server commits creation, alteration, or decay with the checkpoint transaction | Yes, only after candidate validation and an authored placement check. |

The browser may group, visualize, and filter committed records but cannot score, create, alter, decay, or relocate an Anchor. A Spark need not know a candidate or Anchor exists merely because an observer can inspect its objective audit trail. No interpretation, communicated claim, or observer annotation is evidence by itself.

## Proposed versioned data shape

The future extension is `resonanceSchemaVersion: 1`, nested under `firstGlowState.resonance` only in a newly declared simulation version (proposed name: `mimir-sim-v4-first-glow-resonance`). It must not be silently inserted into a schema-3 checkpoint. Current schema-3 checkpoints remain supported by the current runtime; a v4 process must either load an explicitly supported schema-3 compatibility reader that exposes **no Resonance state**, or reject it with a clear incompatible-version error. It must never invent events, candidates, Anchors, or Spark knowledge.

```ts
type ObjectiveResonanceEvent = {
  id: string;                 // stable committed event ID
  pulse: number;
  ruleId: string;
  location: { objectId: string; slotId: string };
  participantSparkIds: string[]; // sorted, unique
  evidenceEventIds: string[];    // sorted, unique committed objective IDs
  chargeCost: number;            // non-negative, already recorded in the resource ledger
  visibility: "observer" | "participants";
};

type ResonanceCandidate = {
  id: string;                 // `candidate-${ruleId}-${objectId}-${slotId}-${firstEvidenceId}`
  ruleId: string;
  location: { objectId: string; slotId: string };
  qualifyingEventIds: string[];
  participantSparkIds: string[];
  totalChargeCost: number;
  formedPulse: number;
  status: "pending" | "created" | "failed" | "altered" | "decayed";
  auditEvidenceEventIds: string[];
  failure?: { code: string; evidenceEventIds: string[] };
};

type ResonanceAnchor = {
  id: string;
  candidateId: string;
  anchorKind: string;
  authoredObjectId: string;
  authoredSlotId: string;
  createdPulse: number;
  accessRuleId: string;
  possibility: string;
  tension: string;
  state: "active" | "altered" | "decayed";
  evidenceEventIds: string[];
};
```

All IDs, participant lists, evidence lists, and persisted collections sort lexicographically by stable ID. Invalid references, duplicate IDs, unsorted lists, negative costs, unknown participants, uncommitted evidence, or an unavailable object/slot fail validation and commit nothing.

## Rule and authoring configuration

Rules are authored configuration, not model output. A future `resonanceRules` block has this minimum shape:

```ts
type ResonanceRule = {
  id: string;
  anchorKind: string;
  qualifyingEventKinds: string[];
  requiredOccurrences: number;
  distinctParticipantMinimum: number;
  minimumChargeCost: number;
  maximumPulseSpan: number;
  requiredLocation: { objectId: string; slotId: string };
  accessRuleId: string;
  possibility: string;
  tension: string;
  alteration: { eventKinds: string[]; effect: "altered" | "decayed" };
};
```

`requiredLocation` refers to a location already present in the selected immutable bundle. For a real Anchor, `anchorKind` must separately resolve to an authored object definition, instance footprint, interaction slot, capability, visual asset, and any route/surface/collision behavior. The importer and world validator must produce a new content-addressed bundle. Art alone cannot imply an entrance, walkable route, blocked cell, or new effect. P0 provides no active configuration and does not alter `assets/world/maps/first-glow.tiled.json`.

## Deterministic lifecycle

1. During a server pulse, collect only committed objective events whose IDs, participants, location, resource-ledger costs, and rule kind validate. Sort by `(pulse, id)`.
2. Partition events by `(ruleId, objectId, slotId)`. An event belongs to exactly one candidate group; it cannot be counted twice for the same rule.
3. Within each group, select the earliest contiguous window whose first-to-last pulse is within `maximumPulseSpan`, then require the configured count, distinct participant count, and total recorded charge cost. Ties sort by `ruleId`, object ID, slot ID, then first evidence ID.
4. Create one pending candidate from that window. Additional matching events are audit evidence, not a second candidate, until the first candidate reaches a terminal state or an explicitly versioned renewal rule exists.
5. Creation requires server validation that the authored object/slot is in the active bundle, reachable under shared geometry, available, and compatible with the rule. It records the candidate, Anchor, costs already paid by the qualifying events, and objective creation event in one transaction. No additional automatic resource transfer occurs.
6. Access is evaluated server-side from `accessRuleId` at an arrival-gated authored slot. A refusal, capacity conflict, missing route, removed slot, or incompatible bundle fails with a recorded objective reason; it does not retry through the browser.
7. Alteration or decay is an explicit configured objective event pattern. It records the triggering evidence and resulting state; it never deletes history, retroactively removes a cost, or changes prior interpretation records. A decayed Anchor remains auditable.

Creation failure is deterministic: the first failing check in this order wins—unsupported simulation/schema, invalid evidence, invalid candidate, missing bundle object, missing slot/capability, unreachable or blocked placement, occupied capacity, then access-rule mismatch. The failure code and sorted evidence IDs are persisted. A branch evaluates only the copied parent history plus its own committed events; it never rewrites the parent candidate or Anchor.

## Replay, persistence, and recovery

Candidates and Anchors belong in the serialized checkpoint and objective-event history, not a browser cache. The server writes them in the same SQLite transaction as the pulse and broadcasts only after commit. Replay reads the recorded candidate/Anchor state and audit references; it does not recompute against changed rules or call an AI provider. A branch copies their history through the selected checkpoint and then evaluates its own future events deterministically.

The active bundle hash and any Anchor's authored object/slot must be available in bundle-inclusive backup. Backup and restore preserve the referenced hash-named bundle directory and validate restored `world.json` before the timeline is accepted. If a checkpoint references a missing or incompatible bundle, loading fails safely; it does not remap the Anchor to a visually similar object.

## First prototype proposal

**Proposal: Shelter Loom.** After P1 finds evidence for a recurring, costly shelter-help pattern, the first real Anchor should be a Shelter Loom at one explicitly authored shelter location. Its possibility is a durable shared-rest practice; its tension is who may claim limited access and what help is expected in return. It must not restore readiness for free, override capacity, or turn care into the preferred philosophy.

**Alternative: Witness Array.** If P1 shows that private discovery and evidence-sharing, rather than shelter help, creates more legible stories, prototype a Witness Array at an authored relay or pattern-shard location. Its possibility is a shared inspectable record; its tension is who may add, alter, withhold, or interpret it. This alternative likewise creates no free packets, universal knowledge, or privileged interpretation.

Neither proposal is implemented by this document. Selection occurs only after P1's fixed-seed evidence review.

## Deterministic fixtures

[`resonance-anchor-fixtures.json`](resonance-anchor-fixtures.json) fixes one proposed Shelter Loom rule and four cases: qualifying, near-miss, private knowledge, and conflicting patterns. The fixture is verified by `resonance-anchor-contract.test.ts`; it is a contract regression test, not a runtime evaluator. It proves the intended audit result under fixed inputs and does not establish that the current First Glow world can form an Anchor.
