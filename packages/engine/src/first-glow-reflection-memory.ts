import type { FirstGlowState } from "./structured.js";

export const FIRST_GLOW_REFLECTION_MEMORY_VERSION = "lived-memory-v1" as const;
export const FIRST_GLOW_REFLECTION_MEMORY_DEFAULT_LIMIT = 8 as const;
export const FIRST_GLOW_REFLECTION_MEMORY_SUMMARY_LIMIT = 160 as const;

export type FirstGlowReflectionMemoryKind = "witnessed-fact" | "received-report" | "subjective-inference" | "prior-consequence";

export interface FirstGlowReflectionMemory {
  id: string;
  kind: FirstGlowReflectionMemoryKind;
  sourceEventId: string;
  evidenceEventIds: string[];
  pulse: number;
  summary: string;
  provenance: "objective-witness" | "communicated-claim" | "uncertain-inference" | "recorded-decision";
  retention: "bounded-summary";
  retentionVersion: typeof FIRST_GLOW_REFLECTION_MEMORY_VERSION;
  sourceSparkId?: string;
}

export interface FirstGlowReflectionMemoryContext {
  version: typeof FIRST_GLOW_REFLECTION_MEMORY_VERSION;
  sparkId: string;
  memories: FirstGlowReflectionMemory[];
  omittedCount: number;
  reconstruction: { knowledgeSchemaVersion: number; historySchemaVersion: number; spawnedPulse?: number; eventIds: string[] };
}

const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const uniqueSorted = (values: string[]) => [...new Set(values)].sort(compare);
const summary = (value: string, limit: number) => value.length <= limit ? value : `${value.slice(0, Math.max(0, limit - 1))}…`;

export function buildFirstGlowReflectionMemoryContext(state: FirstGlowState, sparkId: string, options: { maxMemories?: number; summaryLimit?: number } = {}): FirstGlowReflectionMemoryContext {
  const maxMemories = Number.isInteger(options.maxMemories) && (options.maxMemories ?? 0) > 0 ? options.maxMemories! : FIRST_GLOW_REFLECTION_MEMORY_DEFAULT_LIMIT;
  const summaryLimit = Number.isInteger(options.summaryLimit) && (options.summaryLimit ?? 0) > 0 ? options.summaryLimit! : FIRST_GLOW_REFLECTION_MEMORY_SUMMARY_LIMIT;
  const knowledge = state.social.knowledge.find(item => item.sparkId === sparkId);
  if (!knowledge) throw new Error(`unknown Spark memory ${sparkId}`);
  const memories: FirstGlowReflectionMemory[] = [];
  const events = new Map(state.events.filter(event => (event.pulse ?? state.pulse) <= state.pulse).map(event => [event.id, event]));
  for (const fact of knowledge.witnessedFacts) {
    const event = events.get(fact.eventId);
    if (event) memories.push({ id: `memory-witnessed-${fact.eventId}`, kind: "witnessed-fact", sourceEventId: fact.eventId, evidenceEventIds: [fact.eventId], pulse: fact.witnessedPulse, summary: summary(event.message, summaryLimit), provenance: "objective-witness", retention: "bounded-summary", retentionVersion: FIRST_GLOW_REFLECTION_MEMORY_VERSION });
  }
  for (const claim of knowledge.communicatedClaims) memories.push({ id: `memory-report-${claim.id}`, kind: "received-report", sourceEventId: claim.eventId, evidenceEventIds: uniqueSorted(claim.evidenceEventIds), pulse: claim.communicatedPulse, summary: summary(claim.claim, summaryLimit), provenance: "communicated-claim", retention: "bounded-summary", retentionVersion: FIRST_GLOW_REFLECTION_MEMORY_VERSION, sourceSparkId: claim.sourceSparkId });
  for (const inference of knowledge.uncertainInferences) memories.push({ id: `memory-inference-${inference.id}`, kind: "subjective-inference", sourceEventId: inference.aboutEventId, evidenceEventIds: uniqueSorted(inference.evidenceEventIds), pulse: state.pulse, summary: summary(inference.inference, summaryLimit), provenance: "uncertain-inference", retention: "bounded-summary", retentionVersion: FIRST_GLOW_REFLECTION_MEMORY_VERSION });
  for (const decision of state.history?.decisions.filter(item => item.sparkId === sparkId && item.pulse <= state.pulse) ?? []) memories.push({ id: `memory-consequence-${decision.id}`, kind: "prior-consequence", sourceEventId: decision.resultingEventId, evidenceEventIds: uniqueSorted(decision.evidenceEventIds), pulse: decision.pulse, summary: summary(`Recorded ${decision.source} choice: ${decision.selectedAlternative ?? "none"}.`, summaryLimit), provenance: "recorded-decision", retention: "bounded-summary", retentionVersion: FIRST_GLOW_REFLECTION_MEMORY_VERSION });
  const ordered = memories.sort((a, b) => a.pulse - b.pulse || compare(a.id, b.id));
  const retained = ordered.slice(Math.max(0, ordered.length - maxMemories));
  const spark = state.settlements.flatMap(settlement => settlement.sparks).find(item => item.id === sparkId);
  return { version: FIRST_GLOW_REFLECTION_MEMORY_VERSION, sparkId, memories: retained, omittedCount: Math.max(0, ordered.length - retained.length), reconstruction: { knowledgeSchemaVersion: state.social.schemaVersion, historySchemaVersion: state.history?.schemaVersion ?? 1, ...(spark?.spawnedPulse === undefined ? {} : { spawnedPulse: spark.spawnedPulse }), eventIds: uniqueSorted(retained.flatMap(memory => [memory.sourceEventId, ...memory.evidenceEventIds])) } };
}
