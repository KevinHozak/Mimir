import type { StructuredEvent } from "./structured.js";

export const FIRST_GLOW_PULSES_PER_DAY = 4 as const;
export const FIRST_GLOW_ATTENTION_PER_SPARK_PER_DAY = 4 as const;
export const FIRST_GLOW_ATTENTION_GLOBAL_PER_DAY = 16 as const;
export const FIRST_GLOW_ATTENTION_TIMEOUT_MS = 1000 as const;
export const FIRST_GLOW_DECISION_BUDGETS = [2, 4, 8, 16] as const;
export type FirstGlowDecisionBudget = typeof FIRST_GLOW_DECISION_BUDGETS[number];
export type FirstGlowDecisionBudgetBasis = "readiness" | "age";

export type FirstGlowAttentionTrigger = "novelty" | "encounter" | "scarcity" | "conflict" | "relationship" | "routine-failure";
export type FirstGlowAttentionDecisionReason =
  | "triggered"
  | "ordinary-rules-only"
  | "duplicate-event"
  | "repeated-event-cooldown"
  | "per-spark-budget-exhausted"
  | "global-budget-exhausted"
  | "cadence-window-not-ready"
  | "historical-playback";

export interface FirstGlowAttentionPolicyOptions {
  perSparkDailyLimit?: number;
  globalDailyLimit?: number;
  repeatedEventCooldownPulses?: number;
  pulsesPerDay?: number;
  timeoutMs?: number;
  historicalPlayback?: boolean;
  sparkDailyLimits?: Record<string, FirstGlowDecisionBudget>;
  spaceOpportunities?: boolean;
}

export interface FirstGlowAttentionDecision {
  eventId: string;
  sparkId: string;
  pulse: number;
  simulatedDay: number;
  created: boolean;
  trigger?: FirstGlowAttentionTrigger;
  reason: FirstGlowAttentionDecisionReason;
  timeoutMs: number;
  perSparkUsed: number;
  perSparkRemaining: number;
  globalUsed: number;
  globalRemaining: number;
  budget: number;
  cadenceIntervalPulses?: number;
  cadencePhaseOffset?: number;
  cadenceWindowIndex?: number;
  nextEligiblePulse?: number;
}

export interface FirstGlowAttentionBudgetState {
  simulatedDay: number;
  perSparkDailyLimit: number;
  sparkDailyLimits: Record<string, FirstGlowDecisionBudget>;
  globalDailyLimit: number;
  repeatedEventCooldownPulses: number;
  timeoutMs: number;
  perSparkUsed: Record<string, number>;
  globalUsed: number;
  requestedEventIds: string[];
  lastTriggerPulse: Record<string, number>;
  lastCreatedPulse: Record<string, number>;
  cadenceVersion: "powers-of-two-v1";
  decisions: FirstGlowAttentionDecision[];
}

export interface FirstGlowDecisionBudgetProfile {
  sparkId: string;
  basis: FirstGlowDecisionBudgetBasis;
  readinessTier?: number;
  ageDays?: number;
  budget: FirstGlowDecisionBudget;
}

export interface FirstGlowDecisionCadence {
  version: "powers-of-two-v1";
  sparkId: string;
  budget: FirstGlowDecisionBudget;
  periodPulses: number;
  intervalPulses: number;
  phaseOffset: number;
}

export function decisionBudgetFromReadinessTier(tier: number): FirstGlowDecisionBudget {
  const index = Math.max(0, Math.min(FIRST_GLOW_DECISION_BUDGETS.length - 1, Math.floor(tier)));
  return FIRST_GLOW_DECISION_BUDGETS[index];
}

export function decisionBudgetFromAgeDays(ageDays: number): FirstGlowDecisionBudget {
  const index = ageDays >= 8 ? 3 : ageDays >= 4 ? 2 : ageDays >= 2 ? 1 : 0;
  return FIRST_GLOW_DECISION_BUDGETS[index];
}

function phaseHash(sparkId: string): number {
  return [...sparkId].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 7);
}

export function createFirstGlowDecisionCadence(sparkId: string, budget: FirstGlowDecisionBudget, periodPulses: number): FirstGlowDecisionCadence {
  const intervalPulses = Math.max(1, Math.floor(periodPulses / budget));
  return { version: "powers-of-two-v1", sparkId, budget, periodPulses, intervalPulses, phaseOffset: phaseHash(sparkId) % intervalPulses };
}

export function createFirstGlowAttentionBudget(options: FirstGlowAttentionPolicyOptions = {}, pulse = 0): FirstGlowAttentionBudgetState {
  const pulsesPerDay = positiveInteger(options.pulsesPerDay, FIRST_GLOW_PULSES_PER_DAY);
  return {
    simulatedDay: simulatedDayFor(pulse, pulsesPerDay),
    perSparkDailyLimit: nonNegativeInteger(options.perSparkDailyLimit, FIRST_GLOW_ATTENTION_PER_SPARK_PER_DAY),
    sparkDailyLimits: { ...(options.sparkDailyLimits ?? {}) },
    globalDailyLimit: nonNegativeInteger(options.globalDailyLimit, FIRST_GLOW_ATTENTION_GLOBAL_PER_DAY),
    repeatedEventCooldownPulses: nonNegativeInteger(options.repeatedEventCooldownPulses, 4),
    timeoutMs: positiveInteger(options.timeoutMs, FIRST_GLOW_ATTENTION_TIMEOUT_MS),
    perSparkUsed: {},
    globalUsed: 0,
    requestedEventIds: [],
    lastTriggerPulse: {},
    lastCreatedPulse: {},
    cadenceVersion: "powers-of-two-v1",
    decisions: []
  };
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) && value !== undefined && value > 0 ? value : fallback;
}

function nonNegativeInteger(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) && value !== undefined && value >= 0 ? value : fallback;
}

function simulatedDayFor(pulse: number, pulsesPerDay: number): number { return Math.floor(Math.max(0, pulse) / pulsesPerDay); }
function eventText(event: StructuredEvent): string { return `${event.kind} ${event.message}`.toLowerCase(); }

export function classifyFirstGlowAttentionTrigger(event: StructuredEvent): FirstGlowAttentionTrigger | undefined {
  const text = eventText(event);
  if (event.kind === "explore" || event.kind === "wild-cache" || event.kind === "mark-trace" || event.kind === "shape-pattern" || /unfamiliar|novel|unknown|new trace|new route/.test(text)) return "novelty";
  if (event.kind === "meet" || (event.participants?.length ?? 0) > 1) return "encounter";
  if (event.kind === "draw" && /\b0\b|empty|scarce|weak|quiet|dim/.test(text)) return "scarcity";
  if (/conflict|dispute|clash|blocked|tension|breach/.test(text)) return "conflict";
  if (event.kind === "share" || event.kind === "shelter-loom-choice" || event.kind === "crossing-voices-choice" || /trust|relationship|reliance|helped|helping|shared/.test(text)) return "relationship";
  return event.kind === "wait" ? undefined : undefined;
}

function routineFailure(event: StructuredEvent, priorEvents: StructuredEvent[], threshold: number): boolean {
  if (event.kind !== "wait") return false;
  const matching = priorEvents.filter(candidate => candidate.actorId === event.actorId && candidate.kind === "wait");
  return matching.length + 1 >= threshold;
}

function resetForDay(budget: FirstGlowAttentionBudgetState, day: number): void {
  if (budget.simulatedDay === day) return;
  budget.simulatedDay = day;
  budget.perSparkUsed = {};
  budget.globalUsed = 0;
  budget.requestedEventIds = [];
  budget.lastTriggerPulse = {};
  budget.lastCreatedPulse = {};
}

function record(budget: FirstGlowAttentionBudgetState, decision: FirstGlowAttentionDecision): FirstGlowAttentionDecision {
  budget.decisions.push(decision);
  budget.decisions.sort((left, right) => left.pulse - right.pulse || left.eventId.localeCompare(right.eventId));
  return decision;
}

/**
 * Decide whether an event may create one provider opportunity. This is a
 * reservation only: the simulation remains authoritative and callers may use
 * the existing interpretation adapter for timeout and provider fallback.
 */
export function requestFirstGlowAttention(event: StructuredEvent, budget: FirstGlowAttentionBudgetState, options: FirstGlowAttentionPolicyOptions = {}, priorEvents: StructuredEvent[] = []): FirstGlowAttentionDecision {
  const pulse = event.pulse ?? 0;
  const pulsesPerDay = positiveInteger(options.pulsesPerDay, FIRST_GLOW_PULSES_PER_DAY);
  const day = simulatedDayFor(pulse, pulsesPerDay);
  resetForDay(budget, day);
  const used = budget.perSparkUsed[event.actorId] ?? 0;
  const perSparkLimit = budget.sparkDailyLimits[event.actorId] ?? budget.perSparkDailyLimit;
  const globalLimit = budget.globalDailyLimit;
  const timeoutMs = positiveInteger(options.timeoutMs, budget.timeoutMs);
  const cadence = options.spaceOpportunities && perSparkLimit && FIRST_GLOW_DECISION_BUDGETS.includes(perSparkLimit as FirstGlowDecisionBudget)
    ? createFirstGlowDecisionCadence(event.actorId, perSparkLimit as FirstGlowDecisionBudget, pulsesPerDay)
    : undefined;
  const scheduledPulse = cadence ? day * pulsesPerDay + cadence.phaseOffset + used * cadence.intervalPulses : undefined;
  const lastCreatedPulse = budget.lastCreatedPulse[event.actorId];
  const nextEligiblePulse = cadence ? Math.max(scheduledPulse ?? 0, lastCreatedPulse === undefined ? 0 : lastCreatedPulse + cadence.intervalPulses) : undefined;
  const base = { eventId: event.id, sparkId: event.actorId, pulse, simulatedDay: day, timeoutMs, perSparkUsed: used, perSparkRemaining: Math.max(0, perSparkLimit - used), globalUsed: budget.globalUsed, globalRemaining: Math.max(0, globalLimit - budget.globalUsed) };
  const trigger = classifyFirstGlowAttentionTrigger(event) ?? (routineFailure(event, priorEvents, 3) ? "routine-failure" : undefined);
  let reason: FirstGlowAttentionDecisionReason = "ordinary-rules-only";
  if (options.historicalPlayback) reason = "historical-playback";
  else if (!trigger) reason = "ordinary-rules-only";
    else if (budget.requestedEventIds.includes(event.id)) reason = "duplicate-event";
    else if (trigger) {
    const key = `${event.actorId}:${trigger}`;
    const previous = budget.lastTriggerPulse[key];
    const cooldown = nonNegativeInteger(options.repeatedEventCooldownPulses, budget.repeatedEventCooldownPulses);
      if (previous !== undefined && pulse - previous < cooldown) reason = "repeated-event-cooldown";
      else if (nextEligiblePulse !== undefined && pulse < nextEligiblePulse) reason = "cadence-window-not-ready";
  }
  if (trigger && reason === "ordinary-rules-only") reason = "triggered";
  if (reason === "triggered" && used >= perSparkLimit) reason = "per-spark-budget-exhausted";
  if (reason === "triggered" && budget.globalUsed >= globalLimit) reason = "global-budget-exhausted";
  const created = reason === "triggered";
  if (created) {
    budget.perSparkUsed[event.actorId] = used + 1;
    budget.globalUsed += 1;
    budget.requestedEventIds.push(event.id);
    budget.lastTriggerPulse[`${event.actorId}:${trigger}`] = pulse;
    budget.lastCreatedPulse[event.actorId] = pulse;
  }
  return record(budget, { ...base, trigger, created, reason, perSparkUsed: budget.perSparkUsed[event.actorId] ?? used, perSparkRemaining: Math.max(0, perSparkLimit - (budget.perSparkUsed[event.actorId] ?? used)), globalUsed: budget.globalUsed, globalRemaining: Math.max(0, globalLimit - budget.globalUsed), budget: perSparkLimit, cadenceIntervalPulses: cadence?.intervalPulses, cadencePhaseOffset: cadence?.phaseOffset, cadenceWindowIndex: used, nextEligiblePulse });
}

export const decideFirstGlowAttention = requestFirstGlowAttention;
