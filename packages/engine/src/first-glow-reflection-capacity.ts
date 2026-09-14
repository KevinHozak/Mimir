export const FIRST_GLOW_REFLECTION_CAPACITY_VERSION = "world-age-v1" as const;
export const FIRST_GLOW_REFLECTION_HERO_POLICY_VERSION = "explicit-only-v1" as const;
export const FIRST_GLOW_REFLECTION_PULSES_PER_DAY = 64 as const;
export const FIRST_GLOW_REFLECTION_GLOBAL_DAILY_LIMIT = 16 as const;

export type FirstGlowReflectionHeroProvenance = "policy-default" | "explicit-test";
export type FirstGlowReflectionDecisionReason = "created" | "cadence-window-not-ready" | "global-cap-exhausted" | "historical-playback";

export interface FirstGlowReflectionCapacityPolicy {
  version: typeof FIRST_GLOW_REFLECTION_CAPACITY_VERSION;
  worldAge: "first-glow";
  baselineCapacity: 1;
  heroMultiplier: 1.5;
  heroPolicy: { version: typeof FIRST_GLOW_REFLECTION_HERO_POLICY_VERSION; mode: "explicit-only"; naturalGeneration: "disabled" };
  pulsesPerDay: number;
  globalDailyLimit: number;
}

export interface FirstGlowReflectionAssignment {
  sparkId: string;
  isHero: boolean;
  provenance: FirstGlowReflectionHeroProvenance;
  capacity: number;
}

export interface FirstGlowReflectionDecision {
  sparkId: string;
  pulse: number;
  simulatedDay: number;
  created: boolean;
  reason: FirstGlowReflectionDecisionReason;
  capacity: number;
  intervalPulses: number;
  phaseOffset: number;
  windowIndex: number;
  nextEligiblePulse: number;
  sparkUsed: number;
  globalUsed: number;
  slotEndPulse?: number;
  forcedAtSlotEnd?: boolean;
}

export interface FirstGlowReflectionScheduler {
  version: typeof FIRST_GLOW_REFLECTION_CAPACITY_VERSION;
  simulatedDay: number;
  sparkUsed: Record<string, number>;
  globalUsed: number;
  lastCreatedPulse: Record<string, number>;
  decisions: FirstGlowReflectionDecision[];
}

export interface FirstGlowReflectionCapacityState {
  policy: FirstGlowReflectionCapacityPolicy;
  assignments: Record<string, FirstGlowReflectionAssignment>;
  scheduler: FirstGlowReflectionScheduler;
}

const positiveInteger = (value: number | undefined, fallback: number) => Number.isInteger(value) && value !== undefined && value > 0 ? value : fallback;
const phaseHash = (sparkId: string) => [...sparkId].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 7);
const dayFor = (pulse: number, pulsesPerDay: number) => Math.floor(Math.max(0, pulse) / pulsesPerDay);

export function firstGlowReflectionCadence(sparkId: string, capacity: number, pulsesPerDay: number = FIRST_GLOW_REFLECTION_PULSES_PER_DAY): { intervalPulses: number; phaseOffset: number } {
  const intervalPulses = Math.max(1, Math.floor(pulsesPerDay / capacity));
  return { intervalPulses, phaseOffset: phaseHash(sparkId) % intervalPulses };
}

export function reflectionCapacityFor(isHero: boolean, worldCapacity = 1): number {
  if (!Number.isInteger(worldCapacity) || worldCapacity < 1) throw new Error("world Reflection capacity must be a positive integer");
  return isHero ? Math.ceil(worldCapacity * 1.5) : worldCapacity;
}

export function createFirstGlowReflectionCapacityState(sparkIds: string[], options: { pulsesPerDay?: number; globalDailyLimit?: number } = {}): FirstGlowReflectionCapacityState {
  const pulsesPerDay = positiveInteger(options.pulsesPerDay, FIRST_GLOW_REFLECTION_PULSES_PER_DAY);
  const assignments = Object.fromEntries([...new Set(sparkIds)].sort().map(sparkId => [sparkId, { sparkId, isHero: false, provenance: "policy-default" as const, capacity: 1 }]));
  return {
    policy: { version: FIRST_GLOW_REFLECTION_CAPACITY_VERSION, worldAge: "first-glow", baselineCapacity: 1, heroMultiplier: 1.5, heroPolicy: { version: FIRST_GLOW_REFLECTION_HERO_POLICY_VERSION, mode: "explicit-only", naturalGeneration: "disabled" }, pulsesPerDay, globalDailyLimit: positiveInteger(options.globalDailyLimit, FIRST_GLOW_REFLECTION_GLOBAL_DAILY_LIMIT) },
    assignments,
    scheduler: { version: FIRST_GLOW_REFLECTION_CAPACITY_VERSION, simulatedDay: 0, sparkUsed: {}, globalUsed: 0, lastCreatedPulse: {}, decisions: [] }
  };
}

/** Explicit test setup only. AI and simulation events must not call this. */
export function designateFirstGlowHero(state: FirstGlowReflectionCapacityState, sparkId: string, provenance: "explicit-test" = "explicit-test"): FirstGlowReflectionAssignment {
  const current = state.assignments[sparkId];
  if (!current) throw new Error(`unknown Spark ${sparkId}`);
  const assignment = { sparkId, isHero: true, provenance, capacity: reflectionCapacityFor(true, state.policy.baselineCapacity) };
  state.assignments[sparkId] = assignment;
  return assignment;
}

export function requestFirstGlowReflection(state: FirstGlowReflectionCapacityState, sparkId: string, pulse: number, historicalPlayback = false): FirstGlowReflectionDecision {
  const assignment = state.assignments[sparkId];
  if (!assignment) throw new Error(`unknown Spark ${sparkId}`);
  const { policy, scheduler } = state;
  const day = dayFor(pulse, policy.pulsesPerDay);
  if (scheduler.simulatedDay !== day) { scheduler.simulatedDay = day; scheduler.sparkUsed = {}; scheduler.globalUsed = 0; }
  const used = scheduler.sparkUsed[sparkId] ?? 0;
  const { intervalPulses, phaseOffset } = firstGlowReflectionCadence(sparkId, assignment.capacity, policy.pulsesPerDay);
  const scheduled = day * policy.pulsesPerDay + phaseOffset + used * intervalPulses;
  const dayEnd = (day + 1) * policy.pulsesPerDay - 1;
  const slotEndPulse = scheduled <= dayEnd ? Math.min(scheduled + intervalPulses - 1, dayEnd) : undefined;
  const previous = scheduler.lastCreatedPulse[sparkId];
  const nextEligiblePulse = Math.max(scheduled, previous === undefined ? 0 : previous + intervalPulses);
  const forcedAtSlotEnd = slotEndPulse !== undefined && pulse === slotEndPulse;
  let reason: FirstGlowReflectionDecisionReason = historicalPlayback ? "historical-playback" : "created";
  if (!historicalPlayback && pulse < nextEligiblePulse && !forcedAtSlotEnd) reason = "cadence-window-not-ready";
  if (!historicalPlayback && reason === "created" && scheduler.globalUsed >= policy.globalDailyLimit) reason = "global-cap-exhausted";
  const created = reason === "created";
  if (created) { scheduler.sparkUsed[sparkId] = used + 1; scheduler.globalUsed += 1; scheduler.lastCreatedPulse[sparkId] = pulse; }
  const decision = { sparkId, pulse, simulatedDay: day, created, reason, capacity: assignment.capacity, intervalPulses, phaseOffset, windowIndex: used, nextEligiblePulse, slotEndPulse, forcedAtSlotEnd, sparkUsed: scheduler.sparkUsed[sparkId] ?? used, globalUsed: scheduler.globalUsed };
  scheduler.decisions.push(decision);
  scheduler.decisions.sort((left, right) => left.pulse - right.pulse || left.sparkId.localeCompare(right.sparkId));
  return decision;
}

export function validateFirstGlowReflectionCapacity(state: FirstGlowReflectionCapacityState, sparkIds: string[]): void {
  if (state.policy.version !== FIRST_GLOW_REFLECTION_CAPACITY_VERSION || state.policy.worldAge !== "first-glow" || state.policy.baselineCapacity !== 1 || state.policy.heroMultiplier !== 1.5 || state.policy.heroPolicy.mode !== "explicit-only" || state.policy.heroPolicy.naturalGeneration !== "disabled") throw new Error("unsupported First Glow Reflection capacity policy");
  if (state.scheduler.version !== FIRST_GLOW_REFLECTION_CAPACITY_VERSION || !Number.isInteger(state.policy.pulsesPerDay) || state.policy.pulsesPerDay <= 0) throw new Error("unsupported First Glow Reflection scheduler");
  const ids = new Set(sparkIds);
  for (const sparkId of sparkIds) { const assignment = state.assignments[sparkId]; if (!assignment || assignment.sparkId !== sparkId || assignment.capacity !== reflectionCapacityFor(assignment.isHero) || !["policy-default", "explicit-test"].includes(assignment.provenance)) throw new Error(`invalid Reflection assignment ${sparkId}`); }
  if (Object.keys(state.assignments).some(sparkId => !ids.has(sparkId))) throw new Error("Reflection assignment references an unknown Spark");
  if (!Number.isInteger(state.scheduler.globalUsed) || state.scheduler.globalUsed < 0 || !Array.isArray(state.scheduler.decisions)) throw new Error("invalid Reflection scheduler state");
}

export function ensureFirstGlowReflectionCapacity(state: { firstGlowState: { settlements: Array<{ sparks: Array<{ id: string }> }>; reflectionCapacity?: FirstGlowReflectionCapacityState } }): FirstGlowReflectionCapacityState {
  const sparkIds = state.firstGlowState.settlements.flatMap(settlement => settlement.sparks.map(spark => spark.id));
  state.firstGlowState.reflectionCapacity ??= createFirstGlowReflectionCapacityState(sparkIds);
  return state.firstGlowState.reflectionCapacity;
}
