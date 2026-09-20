import { recordFirstGlowCommunication } from "./first-glow-social.js";
import type { FirstGlowState, StructuredEvent } from "./structured.js";

export const FIRST_GLOW_CONVERSATION_SCHEMA_VERSION = 1 as const;
export const FIRST_GLOW_CONVERSATION_MAX_TURNS = 2 as const;
export type FirstGlowConversationStatus = "completed" | "refused" | "interrupted";
export type FirstGlowConversationEffect = { kind: "communicated-claim"; recipientSparkId: string; eventId: string; claim: string; };

export interface FirstGlowConversationTurn { id: string; speakerSparkId: string; recipientSparkId: string; quote: string; evidenceEventIds: string[]; accepted: boolean; }
export interface FirstGlowConversationRecord {
  schemaVersion: typeof FIRST_GLOW_CONVERSATION_SCHEMA_VERSION;
  id: string;
  pulse: number;
  encounterEventId: string;
  speakerSparkIds: string[];
  turns: FirstGlowConversationTurn[];
  status: FirstGlowConversationStatus;
  effects: FirstGlowConversationEffect[];
  promptVersion: "first-glow-conversation-v1";
  contextVersion: "spark-local-context-v1";
}

const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const sortedUnique = (values: string[]) => [...new Set(values)].sort(compare);

export function validateFirstGlowConversation(record: FirstGlowConversationRecord, sparkIds: string[]): void {
  const ids = new Set(sparkIds);
  if (record.schemaVersion !== FIRST_GLOW_CONVERSATION_SCHEMA_VERSION || !record.id || !record.encounterEventId || !Number.isInteger(record.pulse) || record.pulse < 0 || record.speakerSparkIds.length !== 2 || record.speakerSparkIds[0] === record.speakerSparkIds[1] || record.speakerSparkIds.some(id => !ids.has(id)) || record.turns.length < 1 || record.turns.length > FIRST_GLOW_CONVERSATION_MAX_TURNS || record.promptVersion !== "first-glow-conversation-v1" || record.contextVersion !== "spark-local-context-v1") throw new Error(`invalid First Glow conversation ${record.id}`);
  const turnIds = new Set<string>();
  for (const turn of record.turns) {
    if (!turn.id || turnIds.has(turn.id) || !ids.has(turn.speakerSparkId) || !ids.has(turn.recipientSparkId) || turn.speakerSparkId === turn.recipientSparkId || !turn.quote.trim() || turn.quote.length > 240 || !turn.evidenceEventIds.length || sortedUnique(turn.evidenceEventIds).length !== turn.evidenceEventIds.length) throw new Error(`invalid conversation turn ${turn.id}`);
    turnIds.add(turn.id);
  }
  for (const effect of record.effects) if (effect.kind !== "communicated-claim" || !ids.has(effect.recipientSparkId) || !effect.eventId || !effect.claim.trim()) throw new Error(`invalid conversation effect ${record.id}`);
}

export function createFirstGlowConversation(state: FirstGlowState, event: StructuredEvent): FirstGlowConversationRecord | null {
  if (event.kind !== "meet" || !event.participants || event.participants.length !== 2) return null;
  const speakerSparkIds = sortedUnique(event.participants);
  const sparkIds = state.settlements.flatMap(settlement => settlement.sparks.map(spark => spark.id));
  if (speakerSparkIds.length !== 2 || speakerSparkIds.some(id => !sparkIds.includes(id))) return null;
  const [sourceSparkId, recipientSparkId] = speakerSparkIds;
  const evidenceEventIds = sortedUnique([event.id, ...(event.evidenceEventIds ?? [])]);
  const claim = "I found a shared contact site here; we can meet again at this light.";
  const record: FirstGlowConversationRecord = {
    schemaVersion: FIRST_GLOW_CONVERSATION_SCHEMA_VERSION, id: `conversation-${event.id}`, pulse: event.pulse ?? state.pulse, encounterEventId: event.id, speakerSparkIds,
    turns: [
      { id: `utterance-${event.id}-1`, speakerSparkId: sourceSparkId, recipientSparkId, quote: claim, evidenceEventIds, accepted: true },
      { id: `utterance-${event.id}-2`, speakerSparkId: recipientSparkId, recipientSparkId: sourceSparkId, quote: "I heard you. I will remember this place.", evidenceEventIds, accepted: true }
    ], status: "completed", effects: [{ kind: "communicated-claim", recipientSparkId, eventId: event.id, claim }], promptVersion: "first-glow-conversation-v1", contextVersion: "spark-local-context-v1"
  };
  validateFirstGlowConversation(record, sparkIds);
  return record;
}

export function applyFirstGlowConversation(state: FirstGlowState["social"], record: FirstGlowConversationRecord): FirstGlowState["social"] {
  const next = structuredClone(state);
  for (const effect of record.effects) recordFirstGlowCommunication(next, { id: record.turns[0].id, eventId: effect.eventId, sourceSparkId: record.turns[0].speakerSparkId, recipientSparkId: effect.recipientSparkId, claim: effect.claim, evidenceEventIds: record.turns[0].evidenceEventIds, pulse: record.pulse });
  return next;
}
