import { firstGlowReflectionCadence } from "./first-glow-reflection-capacity.js";
import type { FirstGlowState } from "./structured.js";

/** Public, replay-safe projection. Private memory summaries and provider input never cross this boundary. */
export interface FirstGlowObserverProjection {
  worldAge: "first-glow";
  policy: { baselineCapacity: number; heroMultiplier: number; ticksPerDay: number; globalDailyLimit: number };
  currentDay: number;
  global: { used: number; remaining: number };
  sparks: Array<{
    id: string; name: string; isHero: boolean; capacity: number; used: number; remaining: number;
    nextScheduledTick: number; slotEndTick?: number;
    intention?: { activity: string; status: string; source: string; summary: string; createdTick: number; evidenceEventIds: string[]; causalEventIds: string[]; reason?: string; };
    reflections: Array<{ tick: number; created: boolean; reason: string; forcedAtSlotEnd?: boolean; evidenceEventIds: string[] }>;
  }>;
}

export function projectFirstGlowObserver(state: FirstGlowState): FirstGlowObserverProjection {
  const capacity = state.reflectionCapacity;
  if (!capacity) throw new Error("First Glow reflection capacity is unavailable");
  const day = Math.floor(Math.max(0, state.tick) / capacity.policy.ticksPerDay);
  const schedulerDay = capacity.scheduler.simulatedDay === day ? capacity.scheduler : { ...capacity.scheduler, sparkUsed: {}, globalUsed: 0 };
  const sparks = state.settlements.flatMap(settlement => settlement.sparks).sort((a, b) => a.id.localeCompare(b.id));
  return {
    worldAge: "first-glow",
    policy: { baselineCapacity: capacity.policy.baselineCapacity, heroMultiplier: capacity.policy.heroMultiplier, ticksPerDay: capacity.policy.ticksPerDay, globalDailyLimit: capacity.policy.globalDailyLimit },
    currentDay: day,
    global: { used: schedulerDay.globalUsed, remaining: Math.max(0, capacity.policy.globalDailyLimit - schedulerDay.globalUsed) },
    sparks: sparks.map(spark => {
      const assignment = capacity.assignments[spark.id];
      const used = schedulerDay.sparkUsed[spark.id] ?? 0;
      const cadence = firstGlowReflectionCadence(spark.id, assignment.capacity, capacity.policy.ticksPerDay);
      const nextScheduledTick = day * capacity.policy.ticksPerDay + cadence.phaseOffset + used * cadence.intervalTicks;
      const dayEnd = (day + 1) * capacity.policy.ticksPerDay - 1;
      const slotEndTick = nextScheduledTick <= dayEnd ? Math.min(nextScheduledTick + cadence.intervalTicks - 1, dayEnd) : undefined;
      const decisions = capacity.scheduler.decisions.filter(decision => decision.sparkId === spark.id && decision.simulatedDay === day).slice(-8);
      const intention = spark.intention ? { activity: spark.intention.activity, status: spark.intention.status, source: spark.intention.source, summary: spark.intention.summary, createdTick: spark.intention.createdTick, evidenceEventIds: spark.intention.evidenceEventIds.slice(), causalEventIds: spark.intention.causalEventIds.slice(), ...(spark.intention.reason ? { reason: spark.intention.reason } : {}) } : undefined;
      return { id: spark.id, name: spark.name, isHero: assignment.isHero, capacity: assignment.capacity, used, remaining: Math.max(0, assignment.capacity - used), nextScheduledTick, slotEndTick, ...(intention ? { intention } : {}), reflections: decisions.map(decision => ({ tick: decision.tick, created: decision.created, reason: decision.reason, ...(decision.forcedAtSlotEnd ? { forcedAtSlotEnd: true } : {}), evidenceEventIds: spark.knownEvidenceEventIds.filter(id => state.events.some(event => event.id === id)).slice(-8) })) };
    })
  };
}
