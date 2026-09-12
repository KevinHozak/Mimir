import { FIRST_GLOW_ATTENTION_GLOBAL_PER_DAY, createFirstGlowAttentionBudget, requestFirstGlowAttention, type FirstGlowAttentionBudgetState, type FirstGlowAttentionPolicyOptions } from "./first-glow-attention.js";
import { createRulesOnlyFirstGlowInterpretation, evaluateFirstGlowInterpretation, type FirstGlowInterpretationBudget, type FirstGlowInterpretationContext, type FirstGlowInterpretationProvider, type FirstGlowInterpretationRecord } from "./first-glow-interpretations.js";
import { firstGlowDecisionRecord } from "./first-glow-fake-provider.js";
import type { FirstGlowDecisionRecord } from "./first-glow-history.js";
import type { StructuredEvent } from "./structured.js";

export type FirstGlowRuntimeMode = "rules-only" | "bounded-internal-pilot";

export interface FirstGlowHybridRuntimeOptions {
  runtimeMode?: FirstGlowRuntimeMode;
  provider?: FirstGlowInterpretationProvider;
  attentionBudget?: FirstGlowAttentionBudgetState;
  interpretationBudget?: FirstGlowInterpretationBudget;
  attentionPolicy?: FirstGlowAttentionPolicyOptions;
  historicalPlayback?: boolean;
  recorded?: FirstGlowInterpretationRecord[];
}

export interface FirstGlowHybridRuntimeOutcome {
  attention: ReturnType<typeof requestFirstGlowAttention>;
  interpretation: FirstGlowInterpretationRecord;
  usage: Awaited<ReturnType<typeof evaluateFirstGlowInterpretation>>["usage"];
  decision: FirstGlowDecisionRecord;
}

export interface FirstGlowHybridRuntimeResult {
  outcomes: FirstGlowHybridRuntimeOutcome[];
  attentionBudget: FirstGlowAttentionBudgetState;
  interpretationBudget: FirstGlowInterpretationBudget;
}

/**
 * Evaluate bounded interpretations without giving a provider access to canonical
 * state. The server can persist the returned records after its own transaction
 * has committed the authoritative transition.
 *
 * The default is rules-only. A provider is eligible only when the explicit
 * P11 bounded-internal-pilot mode is selected, and replay always ignores it.
 */
export async function runFirstGlowHybridRuntime(
  contexts: FirstGlowInterpretationContext[],
  options: FirstGlowHybridRuntimeOptions = {}
): Promise<FirstGlowHybridRuntimeResult> {
  const attentionBudget = options.attentionBudget ?? createFirstGlowAttentionBudget(options.attentionPolicy);
  const interpretationBudget = options.interpretationBudget ?? {
    limit: FIRST_GLOW_ATTENTION_GLOBAL_PER_DAY,
    reserved: 0,
    used: 0,
    telemetry: []
  };
  const pilotEnabled = options.runtimeMode === "bounded-internal-pilot" && !options.historicalPlayback && Boolean(options.provider);
  const provider = pilotEnabled ? options.provider : undefined;
  const outcomes: FirstGlowHybridRuntimeOutcome[] = [];
  const priorEvents: StructuredEvent[] = contexts.map(context => ({ ...context.event, tick: context.tick } as StructuredEvent));

  for (const [index, context] of contexts.entries()) {
    const attention = requestFirstGlowAttention(
      { ...context.event, tick: context.tick } as StructuredEvent,
      attentionBudget,
      { ...options.attentionPolicy, historicalPlayback: options.historicalPlayback },
      priorEvents.slice(0, index)
    );
    const shouldUseProvider = Boolean(provider && attention.created);
    const shouldReplay = Boolean(options.historicalPlayback);
    const evaluation = shouldReplay || shouldUseProvider
      ? await evaluateFirstGlowInterpretation(context, {
          provider,
          budget: interpretationBudget,
          timeoutMs: options.attentionPolicy?.timeoutMs,
          historicalPlayback: options.historicalPlayback,
          recorded: options.recorded
        })
      : {
          record: createRulesOnlyFirstGlowInterpretation(context),
          usage: {
            requestId: `rules-${context.encounterId}`,
            encounterId: context.encounterId,
            contextHash: context.contextHash,
            outcome: "rules-only" as const,
            reservedUnits: 0,
            usedUnits: 0
          }
        };
    outcomes.push({
      attention,
      interpretation: evaluation.record,
      usage: evaluation.usage,
      decision: firstGlowDecisionRecord(
        context,
        attention,
        evaluation.record,
        evaluation.usage,
        shouldUseProvider && evaluation.record.source === "ai" ? provider?.providerId : undefined
      )
    });
  }

  return { outcomes, attentionBudget, interpretationBudget };
}
