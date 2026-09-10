import { canonicalize, sha256 } from "@mimir/world-data";
import type { SocialInterpretation } from "./index.js";
import type { FirstGlowState, StructuredEvent } from "./structured.js";

export const FIRST_GLOW_INTERPRETATION_SCHEMA_VERSION = 1 as const;
export const FIRST_GLOW_REVIEW_ENCOUNTER_COUNT = 20 as const;
export type FirstGlowInterpretationFallbackReason = "malformed-output" | "invalid-reference" | "unsupported-claim" | "timeout" | "budget-exhausted" | "provider-error";
export type FirstGlowInterpretationDilemma = "weakening-pool-report" | "shelter-or-trace" | "public-or-private-mark" | "wild-cache-risk";
export type FirstGlowInterpretationAlternative = "reveal-pool" | "withhold-pool" | "help-shelter" | "continue-exploration" | "make-mark-public" | "keep-mark-private" | "enter-wild-cache" | "stay-on-trace";

export interface FirstGlowInterpretationContext {
  schemaVersion: typeof FIRST_GLOW_INTERPRETATION_SCHEMA_VERSION;
  encounterId: string;
  contextHash: string;
  tick: number;
  event: Pick<StructuredEvent, "id" | "kind" | "actorId" | "participants" | "message" | "evidenceEventIds">;
  dilemmaId: FirstGlowInterpretationDilemma;
  supportedAlternatives: FirstGlowInterpretationAlternative[];
  actorSparkId: string;
  targetSparkId?: string;
  witnessedEvidenceEventIds: string[];
  communicatedEvidenceEventIds: string[];
  uncertainInferenceEvidenceEventIds: string[];
}

export interface FirstGlowInterpretationProposal {
  alternativeId: string;
  claim: "plausible-choice" | "ambiguous-social-reading";
  summary: string;
  evidenceEventIds: string[];
}

export interface FirstGlowInterpretationRecord extends SocialInterpretation {
  schemaVersion: typeof FIRST_GLOW_INTERPRETATION_SCHEMA_VERSION;
  encounterId: string;
  contextHash: string;
  dilemmaId: FirstGlowInterpretationDilemma;
  alternativeId: FirstGlowInterpretationAlternative;
  claim: FirstGlowInterpretationProposal["claim"];
  confidence: "rules-baseline" | "provider-proposed" | "deterministic-fallback";
  fallbackReason?: FirstGlowInterpretationFallbackReason;
  requestedSource: "rules" | "ai";
  plausibleChoiceChanged: boolean;
}

export interface FirstGlowInterpretationUsage {
  requestId: string;
  encounterId: string;
  contextHash: string;
  outcome: "recorded" | "fallback" | "historical-replay";
  reason?: FirstGlowInterpretationFallbackReason;
  reservedUnits: number;
  usedUnits: number;
}

export interface FirstGlowInterpretationBudget {
  limit: number;
  reserved: number;
  used: number;
  telemetry: FirstGlowInterpretationUsage[];
}

export interface FirstGlowInterpretationProvider {
  readonly providerId: string;
  interpret(context: FirstGlowInterpretationContext): Promise<unknown>;
}

const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const sortedUnique = (values: string[]) => [...new Set(values)].sort(compare);
const alternatives: Record<FirstGlowInterpretationDilemma, FirstGlowInterpretationAlternative[]> = {
  "weakening-pool-report": ["reveal-pool", "withhold-pool"],
  "shelter-or-trace": ["help-shelter", "continue-exploration"],
  "public-or-private-mark": ["make-mark-public", "keep-mark-private"],
  "wild-cache-risk": ["enter-wild-cache", "stay-on-trace"]
};
const mapping: Record<string, FirstGlowInterpretationDilemma> = {
  draw: "weakening-pool-report",
  idle: "shelter-or-trace",
  wait: "shelter-or-trace",
  explore: "public-or-private-mark",
  "mark-trace": "public-or-private-mark",
  "shape-pattern": "public-or-private-mark",
  meet: "public-or-private-mark",
  "wild-cache": "wild-cache-risk"
};

function stableJson(value: unknown): string { return JSON.stringify(canonicalize(value)); }
function fallbackAlternative(context: FirstGlowInterpretationContext): FirstGlowInterpretationAlternative {
  const index = parseInt(context.contextHash.slice(-2), 16) % context.supportedAlternatives.length;
  return context.supportedAlternatives[index];
}

export function buildFirstGlowInterpretationContext(state: FirstGlowState, event: StructuredEvent): FirstGlowInterpretationContext | null {
  const dilemmaId = mapping[event.kind];
  if (!dilemmaId) return null;
  const sparks = state.settlements.flatMap(settlement => settlement.sparks).slice().sort((a, b) => compare(a.id, b.id));
  const actor = sparks.find(spark => spark.id === event.actorId);
  if (!actor) return null;
  const targetSparkId = event.participants?.slice().sort(compare).find(id => id !== actor.id) ?? sparks.find(spark => spark.id !== actor.id)?.id;
  const knowledge = state.social.knowledge.find(item => item.sparkId === actor.id);
  if (!knowledge) return null;
  const evidenceEventIds = sortedUnique([event.id, ...(event.evidenceEventIds ?? [])]);
  const witnessedEvidenceEventIds = evidenceEventIds.filter(id => knowledge.witnessedFacts.some(fact => fact.eventId === id));
  const communicatedEvidenceEventIds = knowledge.communicatedClaims.flatMap(claim => claim.evidenceEventIds).filter(id => evidenceEventIds.includes(id));
  const uncertainInferenceEvidenceEventIds = knowledge.uncertainInferences.flatMap(inference => inference.evidenceEventIds).filter(id => evidenceEventIds.includes(id));
  const contextWithoutHash = { schemaVersion: FIRST_GLOW_INTERPRETATION_SCHEMA_VERSION, encounterId: `encounter-${state.tick}-${event.id}`, tick: state.tick, event: { id: event.id, kind: event.kind, actorId: event.actorId, participants: event.participants?.slice().sort(compare), message: event.message, evidenceEventIds }, dilemmaId, supportedAlternatives: alternatives[dilemmaId], actorSparkId: actor.id, targetSparkId, witnessedEvidenceEventIds: sortedUnique(witnessedEvidenceEventIds), communicatedEvidenceEventIds: sortedUnique(communicatedEvidenceEventIds), uncertainInferenceEvidenceEventIds: sortedUnique(uncertainInferenceEvidenceEventIds) };
  return { ...contextWithoutHash, contextHash: `sha256-${sha256(stableJson(contextWithoutHash))}` };
}

export function rulesOnlyFirstGlowInterpretation(context: FirstGlowInterpretationContext): FirstGlowInterpretationProposal {
  return { alternativeId: fallbackAlternative(context), claim: "plausible-choice", summary: `Rules-only baseline keeps ${context.actorSparkId}'s interpretation bounded to the witnessed encounter.`, evidenceEventIds: context.witnessedEvidenceEventIds.slice().sort(compare) };
}

function validProposal(value: unknown, context: FirstGlowInterpretationContext): FirstGlowInterpretationProposal | FirstGlowInterpretationFallbackReason {
  if (!value || typeof value !== "object") return "malformed-output";
  const proposal = value as Record<string, unknown>;
  if (typeof proposal.alternativeId !== "string" || typeof proposal.claim !== "string" || typeof proposal.summary !== "string" || !Array.isArray(proposal.evidenceEventIds)) return "malformed-output";
  if (!context.supportedAlternatives.includes(proposal.alternativeId as FirstGlowInterpretationAlternative)) return "unsupported-claim";
  if (proposal.claim !== "plausible-choice" && proposal.claim !== "ambiguous-social-reading") return "unsupported-claim";
  if (!proposal.summary.trim() || proposal.summary.length > 240) return "malformed-output";
  if (proposal.evidenceEventIds.some(item => typeof item !== "string")) return "malformed-output";
  const evidence = sortedUnique(proposal.evidenceEventIds as string[]);
  if (evidence.length === 0 || evidence.some(id => !(context.event.evidenceEventIds ?? []).includes(id) || !context.witnessedEvidenceEventIds.includes(id))) return "invalid-reference";
  return { alternativeId: proposal.alternativeId, claim: proposal.claim, summary: proposal.summary, evidenceEventIds: evidence };
}

function reserve(budget: FirstGlowInterpretationBudget): boolean {
  if (!Number.isInteger(budget.limit) || budget.limit < 0 || budget.used + budget.reserved >= budget.limit) return false;
  budget.reserved += 1;
  return true;
}

function recordUsage(budget: FirstGlowInterpretationBudget, usage: FirstGlowInterpretationUsage): void { budget.telemetry.push(usage); budget.telemetry.sort((a, b) => compare(a.requestId, b.requestId)); }

function makeRecord(context: FirstGlowInterpretationContext, proposal: FirstGlowInterpretationProposal, confidence: FirstGlowInterpretationRecord["confidence"], requestedSource: "rules" | "ai", fallbackReason: FirstGlowInterpretationFallbackReason | undefined, baseline: FirstGlowInterpretationProposal): FirstGlowInterpretationRecord {
  return { id: `interpretation-${context.tick}-${context.event.id}-${context.contextHash.slice(-12)}`, tick: context.tick, eventId: context.event.id, sparkId: context.actorSparkId, source: requestedSource, summary: proposal.summary, evidenceEventIds: proposal.evidenceEventIds, schemaVersion: FIRST_GLOW_INTERPRETATION_SCHEMA_VERSION, encounterId: context.encounterId, contextHash: context.contextHash, dilemmaId: context.dilemmaId, alternativeId: proposal.alternativeId as FirstGlowInterpretationAlternative, claim: proposal.claim, confidence, fallbackReason, requestedSource, plausibleChoiceChanged: proposal.alternativeId !== baseline.alternativeId };
}

export function createRulesOnlyFirstGlowInterpretation(context: FirstGlowInterpretationContext): FirstGlowInterpretationRecord {
  const baseline = rulesOnlyFirstGlowInterpretation(context);
  return makeRecord(context, baseline, "rules-baseline", "rules", undefined, baseline);
}

export async function evaluateFirstGlowInterpretation(context: FirstGlowInterpretationContext, options: { provider?: FirstGlowInterpretationProvider; budget: FirstGlowInterpretationBudget; timeoutMs?: number; historicalPlayback?: boolean; recorded?: FirstGlowInterpretationRecord[] }): Promise<{ record: FirstGlowInterpretationRecord; usage: FirstGlowInterpretationUsage }> {
  const baseline = rulesOnlyFirstGlowInterpretation(context);
  const recorded = options.recorded?.find(item => item.encounterId === context.encounterId && item.contextHash === context.contextHash);
  if (options.historicalPlayback) {
    let replayRecord = recorded;
    let reason: FirstGlowInterpretationFallbackReason | undefined;
    if (replayRecord) { try { validateFirstGlowInterpretationRecord(replayRecord, context); } catch { replayRecord = undefined; reason = "malformed-output"; } }
    const record = replayRecord ?? makeRecord(context, baseline, "deterministic-fallback", "rules", reason ?? "provider-error", baseline);
    const usage = { requestId: `replay-${context.encounterId}`, encounterId: context.encounterId, contextHash: context.contextHash, outcome: "historical-replay" as const, ...(reason || !replayRecord ? { reason: reason ?? "provider-error" as const } : {}), reservedUnits: 0, usedUnits: 0 };
    recordUsage(options.budget, usage);
    return { record, usage };
  }
  const requestId = `request-${context.encounterId}-${context.contextHash.slice(-12)}`;
  if (!options.provider || !reserve(options.budget)) {
    const reason: FirstGlowInterpretationFallbackReason = options.provider ? "budget-exhausted" : "provider-error";
    const record = makeRecord(context, baseline, "deterministic-fallback", "rules", reason, baseline);
    const usage = { requestId, encounterId: context.encounterId, contextHash: context.contextHash, outcome: "fallback" as const, reason, reservedUnits: 0, usedUnits: 0 };
    recordUsage(options.budget, usage);
    return { record, usage };
  }
  options.budget.reserved -= 1;
  options.budget.used += 1;
  let reason: FirstGlowInterpretationFallbackReason | undefined;
  let proposal: FirstGlowInterpretationProposal | undefined;
  try {
    const timeout = options.timeoutMs ?? 1000;
    const result = await Promise.race([options.provider.interpret(context), new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), timeout))]);
    const checked = validProposal(result, context);
    if (typeof checked === "string") reason = checked; else proposal = checked;
  } catch (error) { reason = error instanceof Error && error.message === "timeout" ? "timeout" : "provider-error"; }
  const record = proposal ? makeRecord(context, proposal, "provider-proposed", "ai", undefined, baseline) : makeRecord(context, baseline, "deterministic-fallback", "rules", reason, baseline);
  const usage = { requestId, encounterId: context.encounterId, contextHash: context.contextHash, outcome: proposal ? "recorded" as const : "fallback" as const, reason, reservedUnits: 1, usedUnits: 1 };
  recordUsage(options.budget, usage);
  return { record, usage };
}

export function validateFirstGlowInterpretationRecord(record: FirstGlowInterpretationRecord, context: FirstGlowInterpretationContext): void {
  if (record.schemaVersion !== FIRST_GLOW_INTERPRETATION_SCHEMA_VERSION || record.contextHash !== context.contextHash || record.eventId !== context.event.id || record.encounterId !== context.encounterId) throw new Error("invalid First Glow interpretation context");
  if (record.source === "ai" && record.confidence !== "provider-proposed") throw new Error("invalid First Glow provider interpretation");
  if (record.evidenceEventIds.some(id => !context.witnessedEvidenceEventIds.includes(id))) throw new Error("First Glow interpretation references hidden evidence");
}
