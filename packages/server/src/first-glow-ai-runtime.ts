import { ORIGINAL_SPARK_ALLOCATION_ID, RECORDED_COST_POLICY } from "./spark-ai-accounting.js";
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
import { buildFirstGlowGoalContext, requestFirstGlowGoal, type FirstGlowGoalProvider, type FirstGlowGoalContext, type FirstGlowGoal } from "@mimir/engine";
import { resolve, isAbsolute } from "node:path";
import { existsSync } from "node:fs";
import { onlineRunSpec } from "./online-run.js";
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
  goalProvider?: (timelineId: string) => FirstGlowGoalProvider;
  goalReceipt?: (context: FirstGlowGoalContext, timelineId: string) => FirstGlowGoal["providerReceipt"];
  liveSpark?: boolean;
  markWorldBound?: () => void;
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
  if (!requested && env.AI_RUNTIME_MODE !== "spark-online") return disabled(false, "operator-disabled");
  if (env.AI_RUNTIME_MODE === "spark-online") {
    const lease = onlineRunSpec(env)!;
    const cap = Number(env.MIMIR_SPARK_AI_BUDGET_USD) * 1_000_000;
    const path = env.MIMIR_SPARK_AI_BUDGET_PATH;
    if (!path || !isAbsolute(path) || ![5_000_000, 10_000_000].includes(cap) || env.MIMIR_SPARK_AI_KILL_SWITCH !== "enabled") throw Error("Explicit durable online allocation required");
    if (!env.DATABASE_PATH || !isAbsolute(env.DATABASE_PATH) || resolve(path) === resolve(env.DATABASE_PATH)) throw Error("Distinct absolute world and allocation paths required");
    if (existsSync(env.DATABASE_PATH) !== existsSync(path) && !(lease.allocationId === ORIGINAL_SPARK_ALLOCATION_ID && existsSync(path))) throw Error("Online world and allocation ledger must exist together; restore both");
    const provider = createSparkLiveProvider(path, undefined, { allocation: { allocationId: lease.allocationId, capMicrousd: cap }, deadlineMs: lease.deadlineMs });
    if (lease.allocationId === ORIGINAL_SPARK_ALLOCATION_ID && (provider.budgetStatus().accountingPolicy !== RECORDED_COST_POLICY || provider.budgetStatus().targetRunId !== lease.id || cap !== 5000000)) { void provider.close(); throw Error("Original allocation requires audited accounting and matching writer handoff"); }
    if (lease.allocationId === ORIGINAL_SPARK_ALLOCATION_ID && !existsSync(env.DATABASE_PATH) && provider.budgetStatus().targetWorldBound) { void provider.close(); throw Error("Restore missing online world; original allocation is already bound"); }
    return { requested, enabled: requested, runtimeMode: requested ? "bounded-internal-pilot" : "rules-only", rollout: requested ? "internal" : "off", providerId: provider.providerId, model: SPARK_LIVE_MODEL, hardCapCents: cap / 10000, reason: requested ? "explicit-bounded-online-allocation" : "operator-disabled-online", markWorldBound: provider.markWorldBound, provider, goalProvider: timelineId => ({ providerId: provider.providerId, propose: context => provider.proposeGoal(context, timelineId) }), goalReceipt: provider.goalReceipt, liveSpark: true, budgetStatus: provider.budgetStatus, stop: provider.stop, close: provider.close };
  }
  if (env.AI_RUNTIME_MODE === "spark-live") {
    if (env.MIMIR_SPARK_AI_BUDGET_USD !== "5" || env.MIMIR_SPARK_AI_KILL_SWITCH !== "enabled") return disabled(true, "live-budget-or-kill-switch-not-selected");
    const provider = createSparkLiveProvider(resolve("data/local/spark-ai-budget.db"));
    return { requested: true, enabled: true, runtimeMode: "bounded-internal-pilot", rollout: "internal", providerId: provider.providerId, model: SPARK_LIVE_MODEL, hardCapCents: 500, reason: "owner-authorized-live-usd5", provider, goalProvider: timelineId => ({ providerId: provider.providerId, propose: context => provider.proposeGoal(context, timelineId) }), goalReceipt: provider.goalReceipt, liveSpark: true, budgetStatus: provider.budgetStatus, stop: provider.stop, close: provider.close };
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

  constructor(private readonly config: FirstGlowServerAIConfig, private readonly options: { interpretationTimeoutMs?: number; rcAdmission?: "event-rc-v1"; goals?: boolean } = {}) {
    const timeout = options.interpretationTimeoutMs;
    if (timeout !== undefined && (!Number.isInteger(timeout) || timeout < 1 || timeout > 10_000)) throw new Error("invalid interpretation timeout");
    if (options.goals && config.enabled && options.rcAdmission !== "event-rc-v1") throw new Error("AI goal selection requires shared event RC admission");
  }

  async evaluateGoals(state: FirstGlowState, timelineId: string, historicalPlayback = false): Promise<{ state: FirstGlowState; events: StructuredEvent[] }> {
    if (!this.options.goals || !state.goalLoops || historicalPlayback) return { state, events: [] };
    let next = state;
    const events: StructuredEvent[] = [];
    for (const sparkId of state.settlements.flatMap(s => s.sparks.map(a => a.id)).sort()) {
      const actor = next.settlements.flatMap(s=>s.sparks).find(a=>a.id===sparkId)!;
      if (next.goalLoops!.goals.some(g=>g.sparkId===sparkId&&g.status==="active") || actor.intention?.status==="active" || actor.destinationObjectId || actor.destinationCell || !["choosing","waiting","idle"].includes(actor.status)) continue;
      const context = buildFirstGlowGoalContext(next, sparkId)!;
      const budget = this.config.budgetStatus?.();
      const stopped = budget?.stopped === true;
      const exhausted = typeof budget?.remainingMicrousd === "number" && typeof budget.reservationPerRequestMicrousd === "number" && budget.remainingMicrousd < budget.reservationPerRequestMicrousd;
      const provider = this.config.enabled && !stopped && !exhausted && context.candidates.length >= 2 ? this.config.goalProvider?.(timelineId) : undefined;
      const evaluated = await requestFirstGlowGoal(next, sparkId, { provider, timeoutMs: 10000, fallbackReason: stopped ? "provider-stopped" : exhausted ? "provider-budget-exhausted" : context.candidates.length < 2 ? "no-consequential-alternative" : "provider-unavailable" });
      next = evaluated.state;
      if (!evaluated.goal) continue;
      const goal = evaluated.goal;
      if (provider) goal.providerReceipt = this.config.goalReceipt?.(context, timelineId);
      const event: StructuredEvent = { id: `event-${next.pulse}-${goal.id}-selected`, pulse: next.pulse, kind: "goal", actorId: sparkId, source: "rules", evidenceEventIds: goal.evidenceEventIds, message: `${sparkId} selected ${goal.kind} using ${goal.source}; intent is recorded, not a completed outcome.` };
      next.events.push(event); events.push(event);
      next.history ??= createFirstGlowHistory();
      appendFirstGlowDecision(next.history, { id: `decision-${event.id}`, pulse: next.pulse, sparkId, eventId: event.id, trigger: "goal-selection", candidates: goal.context.candidates, selectedAlternative: goal.kind, source: goal.source, providerId: goal.providerId, profileVersion: 1, evidenceEventIds: goal.evidenceEventIds, contextHash: goal.contextHash, validation: "valid", fallbackReason: goal.fallbackReason, latencyMs: 0, resultingEventId: event.id, usage: { requestId: goal.providerReceipt ? `spark-ai-${goal.providerReceipt.requestId}` : goal.id, outcome: goal.source === "ai" ? "recorded" : provider ? "fallback" : "rules-only", reservedUnits: goal.providerReceipt ? 1 : 0, usedUnits: goal.providerReceipt?.status === "completed" ? 1 : 0, inputTokens: goal.providerReceipt?.usage?.inputTokens ?? 0, outputTokens: goal.providerReceipt?.usage?.outputTokens ?? 0, latencyMs: 0 } });
    }
    return { state: next, events };
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
      localRejectionCount: telemetry.filter(item => item.outcome === "rejected-locally").length,
      cumulativeCostCents: typeof budget?.estimatedTokenCostMicrousd === "number" ? budget.estimatedTokenCostMicrousd / 10000 : telemetry.at(-1)?.cumulativeCostCents ?? 0,
      budget,
      historicalPlaybackUsesAI: false,
      goalSelection: this.options.goals === true, goalProviderAvailable: Boolean(this.config.goalProvider)
    };
  }
}
