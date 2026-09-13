import { createFirstGlowAttentionBudget, requestFirstGlowAttention, type FirstGlowAttentionBudgetState, type FirstGlowAttentionDecision, type FirstGlowAttentionPolicyOptions } from "./first-glow-attention.js";
import { createRulesOnlyFirstGlowInterpretation, evaluateFirstGlowInterpretation, type FirstGlowInterpretationBudget, type FirstGlowInterpretationContext, type FirstGlowInterpretationProvider, type FirstGlowInterpretationRecord, type FirstGlowInterpretationUsage } from "./first-glow-interpretations.js";
import type { FirstGlowDecisionRecord } from "./first-glow-history.js";

export type FirstGlowFakeProviderBehavior = "personality-aware" | "malformed-output" | "invalid-reference" | "unsupported-claim" | "timeout" | "provider-error";
export interface FirstGlowFakeProviderOptions { behavior?: FirstGlowFakeProviderBehavior; providerId?: string; }
export interface FirstGlowOfflineHybridOptions { provider?: FirstGlowInterpretationProvider; attentionBudget?: FirstGlowAttentionBudgetState; interpretationBudget?: FirstGlowInterpretationBudget; attentionPolicy?: FirstGlowAttentionPolicyOptions; historicalPlayback?: boolean; recorded?: FirstGlowInterpretationRecord[]; }
export interface FirstGlowOfflineHybridOutcome { attention: FirstGlowAttentionDecision; interpretation: FirstGlowInterpretationRecord; usage: FirstGlowInterpretationUsage; decision: FirstGlowDecisionRecord; }
export interface FirstGlowOfflineHybridResult { outcomes: FirstGlowOfflineHybridOutcome[]; attentionBudget: FirstGlowAttentionBudgetState; interpretationBudget: FirstGlowInterpretationBudget; }

export function createFirstGlowFakeProvider(options: FirstGlowFakeProviderOptions = {}): FirstGlowInterpretationProvider {
  const behavior = options.behavior ?? "personality-aware";
  const providerId = options.providerId ?? "local-fake";
  return {
    providerId,
    interpret: async (context) => {
      if (behavior === "malformed-output") return {};
      if (behavior === "invalid-reference") return { alternativeId: context.supportedAlternatives[0], claim: "plausible-choice", summary: "The fixture returned an unearned evidence reference.", evidenceEventIds: ["hidden-event"] };
      if (behavior === "unsupported-claim") return { alternativeId: "invented-alternative", claim: "plausible-choice", summary: "The fixture proposed an unavailable alternative.", evidenceEventIds: [context.event.id] };
      if (behavior === "provider-error") throw new Error("local fake provider failure");
      if (behavior === "timeout") return new Promise<never>(() => undefined);
      const firstTendency = context.personalityProfile.valueTendencies[0];
      const firstAlternative = firstTendency === "care" || firstTendency === "caution" || firstTendency === "patience";
      const alternativeId = context.supportedAlternatives[firstAlternative ? 0 : 1] ?? context.supportedAlternatives[0];
      return { alternativeId, claim: "plausible-choice", summary: `The local fixture weighs ${firstTendency} within the bounded alternatives.`, evidenceEventIds: context.witnessedEvidenceEventIds.slice(0, 1) };
    }
  };
}

function usageOutcome(usage: FirstGlowInterpretationUsage): FirstGlowDecisionRecord["usage"]["outcome"] { return usage.outcome === "recorded" ? "recorded" : usage.outcome === "fallback" ? "fallback" : usage.outcome === "historical-replay" ? "historical-replay" : "rules-only"; }
export function firstGlowDecisionRecord(context: FirstGlowInterpretationContext, attention: FirstGlowAttentionDecision, interpretation: FirstGlowInterpretationRecord, usage: FirstGlowInterpretationUsage, providerId?: string): FirstGlowDecisionRecord {
  return { id: `decision-${context.tick}-${context.event.id}-${context.contextHash.slice(-8)}`, tick: context.tick, sparkId: context.actorSparkId, eventId: context.event.id, trigger: attention.trigger ?? "ordinary-rules-only", candidates: context.supportedAlternatives.slice(), selectedAlternative: interpretation.alternativeId, source: interpretation.source, providerId, profileVersion: interpretation.personalityProfileVersion, evidenceEventIds: interpretation.evidenceEventIds.slice(), contextHash: interpretation.contextHash, validation: interpretation.fallbackReason ? "invalid" : "valid", fallbackReason: interpretation.fallbackReason, latencyMs: usage.latencyMs, usage: { requestId: usage.requestId, outcome: usageOutcome(usage), reservedUnits: usage.reservedUnits, usedUnits: usage.usedUnits, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, latencyMs: usage.latencyMs }, resultingEventId: context.event.id };
}

export async function runFirstGlowOfflineHybrid(contexts: FirstGlowInterpretationContext[], options: FirstGlowOfflineHybridOptions = {}): Promise<FirstGlowOfflineHybridResult> {
  const attentionBudget = options.attentionBudget ?? createFirstGlowAttentionBudget(options.attentionPolicy);
  const interpretationBudget = options.interpretationBudget ?? { limit: 4, reserved: 0, used: 0, telemetry: [] };
  const provider = options.provider ?? createFirstGlowFakeProvider();
  const outcomes: FirstGlowOfflineHybridOutcome[] = [];
  const priorEvents = contexts.map(context => ({ ...context.event, tick: context.tick }));
  for (const [index, context] of contexts.entries()) {
    const attention = requestFirstGlowAttention({ ...context.event, tick: context.tick }, attentionBudget, { ...options.attentionPolicy, historicalPlayback: options.historicalPlayback }, priorEvents.slice(0, index));
    const shouldEvaluate = options.historicalPlayback || attention.created;
    const evaluation = shouldEvaluate ? await evaluateFirstGlowInterpretation(context, { provider, budget: interpretationBudget, timeoutMs: options.attentionPolicy?.timeoutMs, historicalPlayback: options.historicalPlayback, recorded: options.recorded }) : { record: createRulesOnlyFirstGlowInterpretation(context), usage: { requestId: `rules-${context.encounterId}`, encounterId: context.encounterId, contextHash: context.contextHash, outcome: "rules-only" as const, reservedUnits: 0, usedUnits: 0, inputTokens: 0, outputTokens: 0, latencyMs: 0 } };
    outcomes.push({ attention, interpretation: evaluation.record, usage: evaluation.usage, decision: firstGlowDecisionRecord(context, attention, evaluation.record, evaluation.usage, shouldEvaluate ? provider.providerId : undefined) });
  }
  return { outcomes, attentionBudget, interpretationBudget };
}
