import type { StructuredEvent } from "./structured.js";\n\nexport const FIRST_GLOW_TICKS_PER_DAY = 4 as const;\nexport const FIRST_GLOW_ATTENTION_PER_SPARK_PER_DAY = 4 as const;\nexport const FIRST_GLOW_ATTENTION_GLOBAL_PER_DAY = 16 as const;\nexport const FIRST_GLOW_ATTENTION_TIMEOUT_MS = 1000 as const;
export const FIRST_GLOW_DECISION_BUDGETS = [2, 4, 8, 16] as const;
export type FirstGlowDecisionBudget = typeof FIRST_GLOW_DECISION_BUDGETS[number];
export type FirstGlowDecisionBudgetBasis = "readiness" | "age";
\nexport type FirstGlowAttentionTrigger = "novelty" | "encounter" | "scarcity" | "conflict" | "relationship" | "routine-failure";\nexport type FirstGlowAttentionDecisionReason =\n  | "triggered"\n  | "ordinary-rules-only"\n  | "duplicate-event"\n  | "repeated-event-cooldown"\n  | "per-spark-budget-exhausted"
  | "global-budget-exhausted"
  | "cadence-window-not-ready"
  | "historical-playback";
\nexport interface FirstGlowAttentionPolicyOptions {\n  perSparkDailyLimit?: number;\n  globalDailyLimit?: number;\n  repeatedEventCooldownTicks?: number;\n  ticksPerDay?: number;\n  timeoutMs?: number;
  historicalPlayback?: boolean;
  sparkDailyLimits?: Record<string, FirstGlowDecisionBudget>;
  spaceOpportunities?: boolean;
}
\nexport interface FirstGlowAttentionDecision {
  eventId: string;\n  sparkId: string;\n  tick: number;\n  simulatedDay: number;\n  created: boolean;\n  trigger?: FirstGlowAttentionTrigger;\n  reason: FirstGlowAttentionDecisionReason;\n  timeoutMs: number;\n  perSparkUsed: number;\n  perSparkRemaining: number;\n  globalUsed: number;
  globalRemaining: number;
  budget: number;
  cadenceIntervalTicks?: number;
  cadencePhaseOffset?: number;
  cadenceWindowIndex?: number;
  nextEligibleTick?: number;
}
\nexport interface FirstGlowAttentionBudgetState {\n  simulatedDay: number;\n  perSparkDailyLimit: number;
  sparkDailyLimits: Record<string, FirstGlowDecisionBudget>;
  globalDailyLimit: number;
  repeatedEventCooldownTicks: number;\n  timeoutMs: number;\n  perSparkUsed: Record<string, number>;\n  globalUsed: number;\n  requestedEventIds: string[];\n  lastTriggerTick: Record<string, number>;
  lastCreatedTick: Record<string, number>;
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
  periodTicks: number;
  intervalTicks: number;
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

export function createFirstGlowDecisionCadence(sparkId: string, budget: FirstGlowDecisionBudget, periodTicks: number): FirstGlowDecisionCadence {
  const intervalTicks = Math.max(1, Math.floor(periodTicks / budget));
  return { version: "powers-of-two-v1", sparkId, budget, periodTicks, intervalTicks, phaseOffset: phaseHash(sparkId) % intervalTicks };
}
\nexport function createFirstGlowAttentionBudget(options: FirstGlowAttentionPolicyOptions = {}, tick = 0): FirstGlowAttentionBudgetState {\n  const ticksPerDay = positiveInteger(options.ticksPerDay, FIRST_GLOW_TICKS_PER_DAY);\n  return {\n    simulatedDay: simulatedDayFor(tick, ticksPerDay),
    perSparkDailyLimit: nonNegativeInteger(options.perSparkDailyLimit, FIRST_GLOW_ATTENTION_PER_SPARK_PER_DAY),
    sparkDailyLimits: { ...(options.sparkDailyLimits ?? {}) },
    globalDailyLimit: nonNegativeInteger(options.globalDailyLimit, FIRST_GLOW_ATTENTION_GLOBAL_PER_DAY),\n    repeatedEventCooldownTicks: nonNegativeInteger(options.repeatedEventCooldownTicks, 4),\n    timeoutMs: positiveInteger(options.timeoutMs, FIRST_GLOW_ATTENTION_TIMEOUT_MS),\n    perSparkUsed: {},\n    globalUsed: 0,\n    requestedEventIds: [],\n    lastTriggerTick: {},
    lastCreatedTick: {},
    cadenceVersion: "powers-of-two-v1",
    decisions: []\n  };\n}\n\nfunction positiveInteger(value: number | undefined, fallback: number): number {\n  return Number.isInteger(value) && value !== undefined && value > 0 ? value : fallback;\n}\n\nfunction nonNegativeInteger(value: number | undefined, fallback: number): number {\n  return Number.isInteger(value) && value !== undefined && value >= 0 ? value : fallback;\n}\n\nfunction simulatedDayFor(tick: number, ticksPerDay: number): number { return Math.floor(Math.max(0, tick) / ticksPerDay); }\nfunction eventText(event: StructuredEvent): string { return `${event.kind} ${event.message}`.toLowerCase(); }\n\nexport function classifyFirstGlowAttentionTrigger(event: StructuredEvent): FirstGlowAttentionTrigger | undefined {\n  const text = eventText(event);\n  if (event.kind === "explore" || event.kind === "wild-cache" || event.kind === "mark-trace" || event.kind === "shape-pattern" || /unfamiliar|novel|unknown|new trace|new route/.test(text)) return "novelty";\n  if (event.kind === "meet" || (event.participants?.length ?? 0) > 1) return "encounter";\n  if (event.kind === "draw" && /\b0\b|empty|scarce|weak|quiet|dim/.test(text)) return "scarcity";\n  if (/conflict|dispute|clash|blocked|tension|breach/.test(text)) return "conflict";\n  if (event.kind === "share" || event.kind === "shelter-loom-choice" || event.kind === "crossing-voices-choice" || /trust|relationship|reliance|helped|helping|shared/.test(text)) return "relationship";\n  return event.kind === "wait" ? undefined : undefined;\n}\n\nfunction routineFailure(event: StructuredEvent, priorEvents: StructuredEvent[], threshold: number): boolean {\n  if (event.kind !== "wait") return false;\n  const matching = priorEvents.filter(candidate => candidate.actorId === event.actorId && candidate.kind === "wait");\n  return matching.length + 1 >= threshold;\n}\n\nfunction resetForDay(budget: FirstGlowAttentionBudgetState, day: number): void {\n  if (budget.simulatedDay === day) return;\n  budget.simulatedDay = day;\n  budget.perSparkUsed = {};\n  budget.globalUsed = 0;\n  budget.requestedEventIds = [];
  budget.lastTriggerTick = {};
  budget.lastCreatedTick = {};
}\n\nfunction record(budget: FirstGlowAttentionBudgetState, decision: FirstGlowAttentionDecision): FirstGlowAttentionDecision {\n  budget.decisions.push(decision);\n  budget.decisions.sort((left, right) => left.tick - right.tick || left.eventId.localeCompare(right.eventId));\n  return decision;\n}\n\n/**\n * Decide whether an event may create one provider opportunity. This is a\n * reservation only: the simulation remains authoritative and callers may use\n * the existing interpretation adapter for timeout and provider fallback.\n */\nexport function requestFirstGlowAttention(event: StructuredEvent, budget: FirstGlowAttentionBudgetState, options: FirstGlowAttentionPolicyOptions = {}, priorEvents: StructuredEvent[] = []): FirstGlowAttentionDecision {\n  const tick = event.tick ?? 0;\n  const ticksPerDay = positiveInteger(options.ticksPerDay, FIRST_GLOW_TICKS_PER_DAY);\n  const day = simulatedDayFor(tick, ticksPerDay);\n  resetForDay(budget, day);\n  const used = budget.perSparkUsed[event.actorId] ?? 0;
  const perSparkLimit = budget.sparkDailyLimits[event.actorId] ?? budget.perSparkDailyLimit;
  const globalLimit = budget.globalDailyLimit;\n  const timeoutMs = positiveInteger(options.timeoutMs, budget.timeoutMs);\n  const cadence = options.spaceOpportunities && perSparkLimit && FIRST_GLOW_DECISION_BUDGETS.includes(perSparkLimit as FirstGlowDecisionBudget)
    ? createFirstGlowDecisionCadence(event.actorId, perSparkLimit as FirstGlowDecisionBudget, ticksPerDay)
    : undefined;
  const scheduledTick = cadence ? day * ticksPerDay + cadence.phaseOffset + used * cadence.intervalTicks : undefined;
  const lastCreatedTick = budget.lastCreatedTick[event.actorId];
  const nextEligibleTick = cadence ? Math.max(scheduledTick ?? 0, lastCreatedTick === undefined ? 0 : lastCreatedTick + cadence.intervalTicks) : undefined;
  const base = { eventId: event.id, sparkId: event.actorId, tick, simulatedDay: day, timeoutMs, perSparkUsed: used, perSparkRemaining: Math.max(0, perSparkLimit - used), globalUsed: budget.globalUsed, globalRemaining: Math.max(0, globalLimit - budget.globalUsed) };
  const trigger = classifyFirstGlowAttentionTrigger(event) ?? (routineFailure(event, priorEvents, 3) ? "routine-failure" : undefined);\n  let reason: FirstGlowAttentionDecisionReason = "ordinary-rules-only";\n  if (options.historicalPlayback) reason = "historical-playback";\n  else if (!trigger) reason = "ordinary-rules-only";\n    else if (budget.requestedEventIds.includes(event.id)) reason = "duplicate-event";
    else if (trigger) {
    const key = `${event.actorId}:${trigger}`;\n    const previous = budget.lastTriggerTick[key];\n    const cooldown = nonNegativeInteger(options.repeatedEventCooldownTicks, budget.repeatedEventCooldownTicks);\n      if (previous !== undefined && tick - previous < cooldown) reason = "repeated-event-cooldown";
      else if (nextEligibleTick !== undefined && tick < nextEligibleTick) reason = "cadence-window-not-ready";
  }\n  if (trigger && reason === "ordinary-rules-only") reason = "triggered";\n  if (reason === "triggered" && used >= perSparkLimit) reason = "per-spark-budget-exhausted";\n  if (reason === "triggered" && budget.globalUsed >= globalLimit) reason = "global-budget-exhausted";\n  const created = reason === "triggered";\n  if (created) {\n    budget.perSparkUsed[event.actorId] = used + 1;\n    budget.globalUsed += 1;
    budget.requestedEventIds.push(event.id);
    budget.lastTriggerTick[`${event.actorId}:${trigger}`] = tick;
    budget.lastCreatedTick[event.actorId] = tick;
  }\n  return record(budget, { ...base, trigger, created, reason, perSparkUsed: budget.perSparkUsed[event.actorId] ?? used, perSparkRemaining: Math.max(0, perSparkLimit - (budget.perSparkUsed[event.actorId] ?? used)), globalUsed: budget.globalUsed, globalRemaining: Math.max(0, globalLimit - budget.globalUsed), budget: perSparkLimit, cadenceIntervalTicks: cadence?.intervalTicks, cadencePhaseOffset: cadence?.phaseOffset, cadenceWindowIndex: used, nextEligibleTick });
}
\nexport const decideFirstGlowAttention = requestFirstGlowAttention;\n