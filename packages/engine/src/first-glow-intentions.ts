import { canonicalize, sha256, type FirstGlowActivity } from "@mimir/world-data";
import type { FirstGlowState, StructuredEvent } from "./structured.js";
import { canFirstGlowReach } from "./structured.js";
import { buildFirstGlowReflectionMemoryContext, type FirstGlowReflectionMemoryContext } from "./first-glow-reflection-memory.js";
import { requestFirstGlowReflection, type FirstGlowReflectionDecision } from "./first-glow-reflection-capacity.js";
import { appendFirstGlowIntention, type FirstGlowIntentionHistoryRecord } from "./first-glow-history.js";

export const FIRST_GLOW_INTENTION_VERSION = "rule-executed-v1" as const;
export const FIRST_GLOW_INTENTION_ACTIVITIES: FirstGlowActivity[] = ["seek-charge", "draw-charge", "explore", "mark-trace", "seek-shelter", "meet", "shape-pattern", "scavenge-cache", "idle"];
export type FirstGlowIntentionStatus = "active" | "completed" | "invalidated" | "interrupted";
export type FirstGlowIntentionSource = "rules" | "ai";

export interface FirstGlowIntention {
  version: typeof FIRST_GLOW_INTENTION_VERSION;
  id: string;
  sparkId: string;
  activity: FirstGlowActivity;
  createdTick: number;
  source: FirstGlowIntentionSource;
  contextHash: string;
  evidenceEventIds: string[];
  causalEventIds: string[];
  status: FirstGlowIntentionStatus;
  summary: string;
  completedTick?: number;
  reason?: string;
}

export interface FirstGlowIntentionContext {
  version: typeof FIRST_GLOW_INTENTION_VERSION;
  sparkId: string;
  tick: number;
  triggerEventId?: string;
  candidateActivities: FirstGlowActivity[];
  readiness: number;
  charge: number;
  chargeDeficit: number;
  knownEvidenceEventIds: string[];
  reflectionMemory: FirstGlowReflectionMemoryContext;
  contextHash: string;
}

export interface FirstGlowIntentionProposal { activity: string; summary: string; evidenceEventIds: string[]; causalEventIds?: string[]; }
export interface FirstGlowIntentionProvider { readonly providerId: string; propose(context: FirstGlowIntentionContext): Promise<unknown>; }
export interface FirstGlowIntentionBudget { limit: number; reserved: number; used: number; }
export interface FirstGlowIntentionRecord { id: string; tick: number; sparkId: string; contextHash: string; source: FirstGlowIntentionSource; proposal?: FirstGlowIntentionProposal; status: FirstGlowIntentionStatus; reason?: string; reflection?: FirstGlowReflectionDecision; }
export interface FirstGlowIntentionEvaluationOptions { provider?: FirstGlowIntentionProvider; budget?: FirstGlowIntentionBudget; historicalPlayback?: boolean; recorded?: FirstGlowIntentionRecord[]; timeoutMs?: number; triggerEvent?: StructuredEvent; }

const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const sortedUnique = (values: string[]) => [...new Set(values)].sort(compare);
const stableJson = (value: unknown) => JSON.stringify(canonicalize(value));

function findSpark(state: FirstGlowState, sparkId: string) { return state.settlements.flatMap(settlement => settlement.sparks).find(spark => spark.id === sparkId); }
function findSettlement(state: FirstGlowState, sparkId: string) { return state.settlements.find(settlement => settlement.sparks.some(spark => spark.id === sparkId)); }

export function buildFirstGlowIntentionContext(state: FirstGlowState, sparkId: string, triggerEvent?: StructuredEvent): FirstGlowIntentionContext | null {
  const spark = findSpark(state, sparkId);
  const settlement = findSettlement(state, sparkId);
  if (!spark || !settlement) return null;
  const candidateActivities = FIRST_GLOW_INTENTION_ACTIVITIES.filter(activity => canFirstGlowReach(settlement, spark, activity));
  const reflectionMemory = buildFirstGlowReflectionMemoryContext(state, sparkId);
  const withoutHash = { version: FIRST_GLOW_INTENTION_VERSION, sparkId, tick: state.tick, triggerEventId: triggerEvent?.id, candidateActivities, readiness: spark.readiness, charge: spark.carriedCharge, chargeDeficit: spark.chargeDeficit, knownEvidenceEventIds: sortedUnique(spark.knownEvidenceEventIds), reflectionMemory };
  return { ...withoutHash, contextHash: `sha256-${sha256(stableJson(withoutHash))}` };
}

function fallbackProposal(context: FirstGlowIntentionContext): FirstGlowIntentionProposal | undefined {
  const activity = context.candidateActivities[0];
  return activity ? { activity, summary: `Rules-only continuation selects the first feasible ${activity} activity.`, evidenceEventIds: context.knownEvidenceEventIds.slice(0, 1), causalEventIds: context.triggerEventId ? [context.triggerEventId] : [] } : undefined;
}

function checkedProposal(value: unknown, context: FirstGlowIntentionContext): FirstGlowIntentionProposal | undefined {
  if (!value || typeof value !== "object") return undefined;
  const proposal = value as Record<string, unknown>;
  if (typeof proposal.activity !== "string" || typeof proposal.summary !== "string" || !Array.isArray(proposal.evidenceEventIds) || proposal.summary.trim().length === 0 || proposal.summary.length > 240) return undefined;
  if (!context.candidateActivities.includes(proposal.activity as FirstGlowActivity)) return undefined;
  const evidence = sortedUnique(proposal.evidenceEventIds.filter((item): item is string => typeof item === "string"));
  if (evidence.length === 0 || evidence.some(id => !context.knownEvidenceEventIds.includes(id))) return undefined;
  const causal = Array.isArray(proposal.causalEventIds) ? sortedUnique(proposal.causalEventIds.filter((item): item is string => typeof item === "string")) : [];
  if (causal.some(id => !context.knownEvidenceEventIds.includes(id) && id !== context.triggerEventId)) return undefined;
  return { activity: proposal.activity, summary: proposal.summary, evidenceEventIds: evidence, causalEventIds: causal };
}

function deterministicId(context: FirstGlowIntentionContext) { return `intention-${context.tick}-${context.sparkId}-${context.contextHash.slice(-12)}`; }
function budgetAvailable(budget: FirstGlowIntentionBudget): boolean { return Number.isInteger(budget.limit) && budget.limit >= 0 && budget.used + budget.reserved < budget.limit; }

export async function evaluateFirstGlowIntention(state: FirstGlowState, sparkId: string, options: FirstGlowIntentionEvaluationOptions = {}): Promise<{ context: FirstGlowIntentionContext | null; record?: FirstGlowIntentionRecord; proposal?: FirstGlowIntentionProposal; }> {
  const context = buildFirstGlowIntentionContext(state, sparkId, options.triggerEvent);
  if (!context || !state.reflectionCapacity) return { context };
  const existing = findSpark(state, sparkId)?.intention;
  if (existing?.status === "active") { if (state.history) appendFirstGlowIntention(state.history, { id: existing.id, sparkId, createdTick: existing.createdTick, activity: existing.activity, source: existing.source, contextHash: existing.contextHash, evidenceEventIds: existing.evidenceEventIds, status: existing.status, causalEventIds: existing.causalEventIds, reason: "intention-continues" }); return { context, record: { id: existing.id, tick: state.tick, sparkId, contextHash: existing.contextHash, source: existing.source, status: "active", reason: "intention-continues" } }; }
  const reflection = requestFirstGlowReflection(state.reflectionCapacity, sparkId, state.tick, options.historicalPlayback === true);
  const id = deterministicId(context);
  const recorded = options.recorded?.find(item => item.id === id && item.contextHash === context.contextHash);
  if (options.historicalPlayback) return { context, record: recorded ?? { id, tick: state.tick, sparkId, contextHash: context.contextHash, source: "rules", status: "invalidated", reason: "historical-replay", reflection } };
  if (!reflection.created) return { context, record: { id, tick: state.tick, sparkId, contextHash: context.contextHash, source: "rules", status: "interrupted", reason: `reflection-${reflection.reason}`, reflection } };
  const budget = options.budget ?? { limit: 4, reserved: 0, used: 0 };
  if (!options.provider || !budgetAvailable(budget)) { const proposal = fallbackProposal(context); return { context, record: { id, tick: state.tick, sparkId, contextHash: context.contextHash, source: "rules", status: proposal ? "active" : "invalidated", reason: options.provider ? "intention-budget-exhausted" : "provider-unavailable", reflection }, proposal }; }
  budget.reserved += 1; budget.reserved -= 1; budget.used += 1;
  let proposal: FirstGlowIntentionProposal | undefined;
  try {
    const result = await Promise.race([options.provider.propose(context), new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), options.timeoutMs ?? 1000))]);
    proposal = checkedProposal(result, context);
  } catch { proposal = undefined; }
  const selected = proposal ?? fallbackProposal(context);
  return { context, proposal: selected, record: { id, tick: state.tick, sparkId, contextHash: context.contextHash, source: proposal ? "ai" : "rules", status: selected ? "active" : "invalidated", reason: proposal ? undefined : "provider-invalid-or-timeout", reflection } };
}

export function commitFirstGlowIntention(state: FirstGlowState, context: FirstGlowIntentionContext, proposal: FirstGlowIntentionProposal, source: FirstGlowIntentionSource = "rules"): FirstGlowIntention {
  const spark = findSpark(state, context.sparkId);
  const settlement = findSettlement(state, context.sparkId);
  if (!spark || !settlement || !context.candidateActivities.includes(proposal.activity as FirstGlowActivity)) throw new Error("infeasible First Glow intention");
  const evidenceEventIds = sortedUnique(proposal.evidenceEventIds);
  if (evidenceEventIds.some(id => !context.knownEvidenceEventIds.includes(id))) throw new Error("First Glow intention references hidden evidence");
  const intention: FirstGlowIntention = { version: FIRST_GLOW_INTENTION_VERSION, id: `intention-${context.tick}-${context.sparkId}-${context.contextHash.slice(-12)}`, sparkId: context.sparkId, activity: proposal.activity as FirstGlowActivity, createdTick: context.tick, source, contextHash: context.contextHash, evidenceEventIds, causalEventIds: sortedUnique(proposal.causalEventIds ?? []), status: "active", summary: proposal.summary };
  spark.intention = intention;
  spark.intendedActivity = intention.activity;
  spark.status = "choosing";
  spark.waitReason = undefined;
  const history: FirstGlowIntentionHistoryRecord = { id: intention.id, sparkId: intention.sparkId, createdTick: intention.createdTick, activity: intention.activity, source: intention.source, contextHash: intention.contextHash, evidenceEventIds: intention.evidenceEventIds, status: intention.status, causalEventIds: intention.causalEventIds };
  state.history ??= { schemaVersion: 1, movements: [], decisions: [], intentions: [] };
  appendFirstGlowIntention(state.history, history);
  return intention;
}

export function continueFirstGlowIntention(state: FirstGlowState): void { for (const spark of state.settlements.flatMap(settlement => settlement.sparks).sort((a, b) => compare(a.id, b.id))) if (spark.intention?.status === "active" && !spark.destinationObjectId && !spark.destinationCell && (spark.status === "choosing" || spark.status === "waiting" || spark.status === "idle")) { spark.intendedActivity = spark.intention.activity; spark.waitReason = undefined; } }

export function finalizeFirstGlowIntentions(state: FirstGlowState): void {
  for (const spark of state.settlements.flatMap(settlement => settlement.sparks).sort((a, b) => compare(a.id, b.id))) {
    const intention = spark.intention;
    if (!intention || intention.status !== "active") continue;
    const completionKinds: Partial<Record<FirstGlowActivity, string>> = { "seek-charge": "draw", "draw-charge": "draw", "seek-shelter": "idle", "scavenge-cache": "wild-cache" };
    const completed = state.events.find(event => event.actorId === spark.id && (event.kind === intention.activity || event.kind === completionKinds[intention.activity]));
    const failed = spark.waitReason === "invalid-destination" || spark.waitReason === "no-route" || spark.waitReason === "no-free-slot";
    if (completed) { intention.status = "completed"; intention.completedTick = state.tick; intention.causalEventIds = sortedUnique([...intention.causalEventIds, completed.id]); }
    else if (failed) { intention.status = "interrupted"; intention.reason = spark.waitReason; }
    if (state.history) appendFirstGlowIntention(state.history, { id: intention.id, sparkId: intention.sparkId, createdTick: intention.createdTick, activity: intention.activity, source: intention.source, contextHash: intention.contextHash, evidenceEventIds: intention.evidenceEventIds, status: intention.status, causalEventIds: intention.causalEventIds, completionTick: intention.completedTick, reason: intention.reason });
  }
}

export function interruptFirstGlowIntention(state: FirstGlowState, sparkId: string, reason: string): void { const spark = findSpark(state, sparkId); const settlement = findSettlement(state, sparkId); if (!spark?.intention || spark.intention.status !== "active") return; spark.intention.status = "interrupted"; spark.intention.reason = reason; spark.intendedActivity = "idle"; spark.destinationObjectId = undefined; spark.destinationSlotId = undefined; spark.destinationCell = undefined; spark.remainingRoute = []; spark.remainingCost = 0; spark.status = "waiting"; if (settlement) settlement.runtime.reservations = settlement.runtime.reservations.filter(item => item.actorId !== sparkId); if (state.history) appendFirstGlowIntention(state.history, { id: spark.intention.id, sparkId, createdTick: spark.intention.createdTick, activity: spark.intention.activity, source: spark.intention.source, contextHash: spark.intention.contextHash, evidenceEventIds: spark.intention.evidenceEventIds, status: "interrupted", causalEventIds: spark.intention.causalEventIds, reason }); }
