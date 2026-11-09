import {
  FIRST_GLOW_ATTENTION_GLOBAL_PER_DAY,
  FIRST_GLOW_ATTENTION_PER_SPARK_PER_DAY,
  FIRST_GLOW_ATTENTION_TIMEOUT_MS,
  appendFirstGlowDecision,
  applyFirstGlowStagingChoice,
  buildFirstGlowInterpretationContext,
  createFirstGlowAttentionBudget,
  createFirstGlowHistory,
  createFirstGlowVertexGeminiPilotProvider,
  runFirstGlowHybridRuntime,
  type FirstGlowInterpretationProvider,
  type FirstGlowInterpretationRecord,
  type FirstGlowInterpretationUsage,
  type FirstGlowState,
  type FirstGlowDecisionRecord,
  type StructuredEvent
} from "@mimir/engine";
import { resolve } from "node:path";
import { createSparkLiveProvider, SPARK_LIVE_MODEL } from "./spark-ai-live.js";

export interface FirstGlowServerAIConfig {
  requested: boolean;
  enabled: boolean;
  runtimeMode: "rules-only" | "bounded-internal-pilot";
  rollout: "off" | "internal";
  providerId: string;
  model: string;
  hardCapCents: number;
  reason: string;
  provider?: FirstGlowInterpretationProvider;
  liveSpark?: boolean;
  budgetStatus?: () => Record<string, unknown>;
  stop?: () => void;
  close?: () => Promise<void>;
}

const disabled = (requested: boolean, reason: string): FirstGlowServerAIConfig => ({
  requested,
  enabled: false,
  runtimeMode: "rules-only",
  rollout: "off",
  providerId: "none",
  model: "none",
  hardCapCents: 100,
  reason
});

export function createFirstGlowServerAIConfig(env: NodeJS.ProcessEnv = process.env): FirstGlowServerAIConfig {
  const requested = env.AI_ENABLED === "true";
  if (!requested) return disabled(false, "operator-disabled");
  if (env.AI_RUNTIME_MODE === "spark-live") {
    if (env.MIMIR_SPARK_AI_BUDGET_USD !== "5" || env.MIMIR_SPARK_AI_KILL_SWITCH !== "enabled") return disabled(true, "live-budget-or-kill-switch-not-selected");
    const provider = createSparkLiveProvider(resolve("data/local/spark-ai-budget.db"));
    return { requested: true, enabled: true, runtimeMode: "bounded-internal-pilot", rollout: "internal", providerId: provider.providerId, model: SPARK_LIVE_MODEL, hardCapCents: 500, reason: "owner-authorized-live-usd5", provider, liveSpark: true, budgetStatus: provider.budgetStatus, stop: provider.stop, close: provider.close };
  }
  if (env.AI_RUNTIME_MODE !== "bounded-internal-pilot") return disabled(true, "pilot-mode-not-selected");
  if (env.AI_ROLLOUT !== "internal") return disabled(true, "internal-rollout-not-selected");
  if (!env.MIMIR_VERTEX_ACCESS_TOKEN?.trim() || !env.MIMIR_GEMINI_PROJECT_ID?.trim() || !env.MIMIR_GEMINI_ACCOUNT_ID?.trim()) return disabled(true, "provider-access-not-configured");
  if (env.MIMIR_GEMINI_EVALUATION_KILL_SWITCH !== "enabled") return disabled(true, "kill-switch-disabled");
  if (env.MIMIR_GEMINI_DATA_SCOPE !== "spark-local-context-only") return disabled(true, "data-scope-not-approved");
  if (env.MIMIR_GEMINI_RETENTION_MODE !== "review-artifact") return disabled(true, "retention-mode-not-approved");
  const hardCapCents = Number(env.MIMIR_GEMINI_HARD_CAP_CENTS ?? 0);
  if (hardCapCents !== 100) return disabled(true, "hard-cap-must-be-100-cents");
  try {
    const provider = createFirstGlowVertexGeminiPilotProvider({
      accessToken: env.MIMIR_VERTEX_ACCESS_TOKEN,
      projectId: env.MIMIR_GEMINI_PROJECT_ID,
      accountId: env.MIMIR_GEMINI_ACCOUNT_ID,
      location: env.MIMIR_VERTEX_LOCATION ?? "us-central1",
      hardCapCents,
      killSwitch: "enabled",
      runtimeMode: "bounded-internal-pilot",
      billingMode: "vertex-ai",
      dataPolicy: "spark-local-minimized",
      model: "gemini-2.5-flash-lite",
      maxOutputTokens: 128
    });
    return { requested: true, enabled: true, runtimeMode: "bounded-internal-pilot", rollout: "internal", providerId: provider.providerId, model: "gemini-2.5-flash-lite", hardCapCents, reason: "enabled-by-explicit-internal-contract", provider };
  } catch (error) {
    return disabled(true, error instanceof Error ? `provider-rejected-config:${error.message}` : "provider-rejected-config");
  }
}

export interface FirstGlowServerAIResult {
  state: FirstGlowState;
  interpretations: FirstGlowInterpretationRecord[];
  decisions: FirstGlowDecisionRecord[];
  transitions: Array<{ encounterId: string; accepted: boolean; changedFields: string[]; rejection?: string }>;
}

export class FirstGlowServerAIRuntime {
  private readonly attentionBudget = createFirstGlowAttentionBudget({
    perSparkDailyLimit: FIRST_GLOW_ATTENTION_PER_SPARK_PER_DAY,
    globalDailyLimit: FIRST_GLOW_ATTENTION_GLOBAL_PER_DAY,
    timeoutMs: FIRST_GLOW_ATTENTION_TIMEOUT_MS
  });
  private interpretationBudget = { limit: FIRST_GLOW_ATTENTION_GLOBAL_PER_DAY, reserved: 0, used: 0, telemetry: [] as FirstGlowInterpretationUsage[] };
  private simulatedDay = this.attentionBudget.simulatedDay;

  constructor(private readonly config: FirstGlowServerAIConfig, private readonly options: { interpretationTimeoutMs?: number; rcAdmission?: "event-rc-v1" } = {}) {
    const timeout = options.interpretationTimeoutMs;
    if (timeout !== undefined && (!Number.isInteger(timeout) || timeout < 1 || timeout > 10_000)) throw new Error("invalid interpretation timeout");
  }

  private resetInterpretationBudgetIfNeeded(pulse: number): void {
    const day = Math.floor(Math.max(0, pulse) / 4);
    if (day === this.simulatedDay) return;
    this.simulatedDay = day;
    this.interpretationBudget = { limit: FIRST_GLOW_ATTENTION_GLOBAL_PER_DAY, reserved: 0, used: 0, telemetry: [] as FirstGlowInterpretationUsage[] };
  }

  async evaluate(state: FirstGlowState, events: StructuredEvent[]): Promise<FirstGlowServerAIResult> {
    if (!this.config.enabled) return { state, interpretations: [], decisions: [], transitions: [] };
    if (this.options.rcAdmission && state.reflectionCapacity?.eventAdmission?.version !== this.options.rcAdmission) throw new Error("event RC policy mismatch; legacy histories cannot be continued under the new policy");
    if (!events.length) return { state, interpretations: [], decisions: [], transitions: [] };
    this.resetInterpretationBudgetIfNeeded(state.pulse);
    const next = structuredClone(state);
    const ordered = this.options.rcAdmission ? events.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) : events;
    const contexts = ordered.map(event => buildFirstGlowInterpretationContext(next, event)).filter((context): context is NonNullable<typeof context> => Boolean(context));
    if (!contexts.length) return { state, interpretations: [], decisions: [], transitions: [] };
    const runtime = await runFirstGlowHybridRuntime(contexts, {
      runtimeMode: this.config.runtimeMode,
      provider: this.config.provider,
      attentionPolicy: { timeoutMs: this.options.interpretationTimeoutMs ?? FIRST_GLOW_ATTENTION_TIMEOUT_MS },
      attentionBudget: this.options.rcAdmission ? next.reflectionCapacity!.eventAdmission!.attentionBudget : this.attentionBudget,
      interpretationBudget: this.interpretationBudget,
      reflectionCapacity: this.options.rcAdmission ? next.reflectionCapacity : undefined
    });
    next.history ??= createFirstGlowHistory();
    const outcomes = runtime.outcomes.filter(outcome => !this.options.rcAdmission || (outcome.reflectionAdmission?.reason !== "duplicate-event" && outcome.attention.reason !== "duplicate-event"));
    const eventIds = new Set(outcomes.map(outcome => outcome.decision.eventId));
    next.history.decisions = next.history.decisions.filter(decision => !eventIds.has(decision.eventId));
    const transitions: FirstGlowServerAIResult["transitions"] = [];
    for (const outcome of outcomes) {
      appendFirstGlowDecision(next.history, outcome.decision);
      const transition = applyFirstGlowStagingChoice(next, contexts.find(context => context.event.id === outcome.decision.eventId)!, outcome.interpretation);
      transitions.push({ encounterId: outcome.interpretation.encounterId, accepted: transition.accepted, changedFields: transition.changedFields, rejection: transition.rejection });
      if (transition.accepted) next.social = transition.after.social;
    }
    return { state: next, interpretations: outcomes.map(outcome => outcome.interpretation), decisions: outcomes.map(outcome => outcome.decision), transitions };
  }

  status(): Record<string, unknown> {
    const provider = this.config.provider as (FirstGlowInterpretationProvider & { telemetry?: Array<Record<string, unknown>> }) | undefined;
    const telemetry = provider?.telemetry ?? [];
    const budget = this.config.budgetStatus?.();
    return {
      requested: this.config.requested,
      enabled: this.config.enabled,
      runtimeMode: this.config.runtimeMode,
      rollout: this.config.rollout,
      provider: this.config.providerId,
      model: this.config.model,
      hardCapCents: this.config.hardCapCents,
      reason: this.config.reason,
      killSwitch: budget?.stopped ? "stopped" : "enabled",
      calls: budget?.attempts ?? telemetry.length,
      fallbackCount: telemetry.filter(item => item.outcome === "fallback").length,
      cumulativeCostCents: typeof budget?.estimatedTokenCostMicrousd === "number" ? budget.estimatedTokenCostMicrousd / 10000 : telemetry.at(-1)?.cumulativeCostCents ?? 0,
      budget,
      historicalPlaybackUsesAI: false
    };
  }
}
