import { geometricShardSettlement, shardRouteCandidates } from "./first-glow-geometric-shard.js";
import { recoveryForecastSettlement } from "./first-glow-recovery-admission.js";
import { canTraverse } from "@mimir/world-data";
import { firstGlowRouteCandidates, type FirstGlowRouteCandidate, type FirstGlowSettlement, type FirstGlowSpark, type FirstGlowState } from "./structured.js";
import { initializePatternGuidedRetry } from "./first-glow-pattern-retry.js";
import type { RoutePattern } from "./first-glow-route-patterns.js";
export const PATTERN_PREPARATION_VERSION = "pattern-resource-preparation-v1" as const;
type Resources = { charge: number; deficit: number; readiness: number };
/** A synchronous witness only; never persisted or used as contact admission. */
export interface PreparationBudget {
  recoveryActions: number;
  canSpendCharge(amount: number): boolean;
}
export interface PatternPreparationGoal {
  sparkId: string; patternId: string; encounterEventId: string; createdPulse: number;
  phase: "charge" | "rest" | "ready" | "deferred" | "committed"; reason: string;
  actions: number; actionEventIds: string[]; useEventId?: string; lastRecord?: string; signature?: string;
}
export interface PatternPreparationState { version: typeof PATTERN_PREPARATION_VERSION; goals: PatternPreparationGoal[]; }
export interface PreparedDestination { patternId: string; activity: "seek-charge" | "seek-shelter" | "scavenge-cache"; objectId: string; slotId: string; navigationRevision: number; }
export function initializePatternPreparation(state: FirstGlowState): void {
  if (state.patternPreparation || state.pulse !== 0 || state.events.length || state.ledger.length || state.explanations.length || state.settlements.some(s => s.sparks.some(spark => spark.knownEvidenceEventIds.length || spark.wildCacheChoice)) || Object.values(state.history ?? {}).some(v => Array.isArray(v) && v.length)) throw new Error("Pattern preparation requires a fresh history");
  if (!state.patternGuidedRetry) initializePatternGuidedRetry(state);
  state.patternPreparation = { version: PATTERN_PREPARATION_VERSION, goals: [] };
}
export function routeMovementProfile(settlement: FirstGlowSettlement, path: FirstGlowRouteCandidate["path"]) {
  if (!path.length) throw new Error("Preparation route is empty");
  let total = 0;
  const movingPulses = new Set<number>();
  for (let index = 1; index < path.length; index++) {
    const edge = canTraverse(settlement.bundle, settlement.runtime, path[index - 1], path[index]);
    if (!edge.walkable) throw new Error("Preparation route is not traversable");
    total += edge.cost; movingPulses.add(Math.ceil(total / 2));
  }
  const pulses = Math.max(1, Math.ceil(total / 2));
  return { priorMovingPulses: [...movingPulses].filter(pulse => pulse < pulses).length, pulses, movedOnArrival: movingPulses.has(pulses) };
}
const currentResources = (spark: FirstGlowSpark): Resources => ({ charge: spark.carriedCharge, deficit: spark.chargeDeficit, readiness: spark.readiness });
function debit(r: Resources, count: number): Resources { return { charge: Math.max(0, r.charge - count), deficit: r.deficit + Math.max(0, count - r.charge), readiness: Math.max(0, r.readiness - count) }; }
const affordable = (r: Resources) => r.charge >= 3 && r.deficit === 0 && r.readiness >= 75;
export function forecastPatternArrival(settlement: FirstGlowSettlement, spark: FirstGlowSpark, candidate: FirstGlowRouteCandidate, state?: FirstGlowState) {
  const profile = routeMovementProfile(settlement, candidate.path);
  const shardReachable = shardRouteCandidates(state, settlement, { ...spark, position: candidate.target }).length > 0;
  return projectArrival(spark, profile, shardReachable);
}
function projectArrival(spark: FirstGlowSpark, profile: ReturnType<typeof routeMovementProfile>, shardReachable: boolean) {
  const before = debit(currentResources(spark), profile.priorMovingPulses);
  return { ...profile, before, eligible: affordable(before) && shardReachable, shardReachable, minimumCharge: 3 + profile.priorMovingPulses, minimumReadiness: 75 + profile.priorMovingPulses, afterProbe: { charge: before.charge - 1 - Number(profile.movedOnArrival), deficit: before.deficit, readiness: Math.max(0, before.readiness - 2 - Number(profile.movedOnArrival)) } };
}
/** Shaping pays one activity pulse even on a same-cell arrival; no new resource is granted. */
export function forecastShardArrival(settlement: FirstGlowSettlement, spark: FirstGlowSpark, candidate: FirstGlowRouteCandidate, minimumReadiness = 70) {
  const profile = routeMovementProfile(settlement, candidate.path);
  return projectShardArrival(spark, profile, minimumReadiness);
}
function projectShardArrival(spark: FirstGlowSpark, profile: ReturnType<typeof routeMovementProfile>, minimumReadiness: number) {
  const cost = profile.priorMovingPulses + 1;
  const after = debit(currentResources(spark), cost);
  return { ...profile, after, cost, eligible: spark.chargeDeficit === 0 && spark.readiness >= minimumReadiness && after.deficit === 0 && after.readiness > 0 };
}
function resourcesSpark(spark: FirstGlowSpark, r: Resources, position: FirstGlowSpark["position"]): FirstGlowSpark { return { ...spark, position, carriedCharge: r.charge, chargeDeficit: r.deficit, readiness: r.readiness }; }
function recover(settlement: FirstGlowSettlement, r: Resources, candidate: FirstGlowRouteCandidate, phase: "charge" | "rest", repeats: number, source: number, profile = routeMovementProfile(settlement, candidate.path)) {
  let after = debit(r, profile.priorMovingPulses);
  if (phase === "charge") {
    const amount = Math.min(repeats * 8, source);
    after = { charge: after.charge + amount, deficit: Math.max(0, after.deficit - amount), readiness: Math.max(0, after.readiness - Number(profile.movedOnArrival)) };
    return { resources: after, source: source - amount, pulses: profile.pulses + repeats - 1 };
  }
  after.readiness = Math.min(100, Math.max(0, Math.min(100, after.readiness + 10) - Number(profile.movedOnArrival)) + (repeats - 1) * 10);
  if (profile.movedOnArrival) { const charged = debit({ ...after, readiness: 100 }, 1); after.charge = charged.charge; after.deficit = charged.deficit; }
  return { resources: after, source, pulses: profile.pulses + repeats - 1 };
}
const activity = (phase: "charge" | "rest") => phase === "charge" ? "seek-charge" as const : "seek-shelter" as const;
function goalFor(state: FirstGlowState, spark: FirstGlowSpark, pattern: RoutePattern): PatternPreparationGoal {
  let goal = state.patternPreparation!.goals.find(g => g.sparkId === spark.id);
  if (!goal || goal.patternId !== pattern.id) {
    goal = { sparkId: spark.id, patternId: pattern.id, encounterEventId: pattern.encounters.find(e => e.sparkId === spark.id)!.eventId, createdPulse: state.pulse, phase: "deferred", reason: "preparation not evaluated", actions: 0, actionEventIds: [] };
    state.patternPreparation!.goals = state.patternPreparation!.goals.filter(g => g.sparkId !== spark.id).concat(goal);
  }
  return goal;
}
export function selectPatternPreparation(state: FirstGlowState, settlement: FirstGlowSettlement, spark: FirstGlowSpark, pattern: RoutePattern, immediate: "charge" | "rest" | undefined, audit?: (budget: PreparationBudget) => void) {
  const goal = goalFor(state, spark, pattern);
  const pin = (candidate: FirstGlowRouteCandidate, phase: "charge" | "rest" | "ready") => {
    goal.phase = phase; goal.reason = phase === "ready" ? "projected arrival meets probe requirements" : `prepare ${phase} for the recorded cache route`;
    spark.preparedDestination = { patternId: pattern.id, activity: phase === "ready" ? "scavenge-cache" : activity(phase), objectId: candidate.objectId, slotId: candidate.slotId, navigationRevision: settlement.runtime.navigationRevision };
    return spark.preparedDestination.activity;
  };
  return selectCachePreparation(state, settlement, spark, pattern.targetObjectId, goal, immediate, pin, () => { delete spark.preparedDestination; }, false, undefined, audit);
}

/** Shared resource search; callers supply their own goal provenance and destination pin. */
export function selectCachePreparation<A extends "scavenge-cache" | "shape-pattern" = "scavenge-cache">(state: FirstGlowState, settlement: FirstGlowSettlement, spark: FirstGlowSpark, targetObjectId: string,
  goal: Pick<PatternPreparationGoal, "phase" | "reason" | "actions" | "signature">, immediate: "charge" | "rest" | undefined,
  pin: (candidate: FirstGlowRouteCandidate, phase: "charge" | "rest" | "ready") => "seek-charge" | "seek-shelter" | A,
  clearPin: () => void, enforceRemainingBudget = false, objective?: { activity: A; minimumReadiness: number; requireRest?: boolean; chargeThenRest?: boolean }, audit?: (budget: PreparationBudget) => void) {
  const destinationActivity = objective?.activity ?? "scavenge-cache";
  const candidates = destinationActivity === "shape-pattern" ? shardRouteCandidates(state, settlement, spark, targetObjectId) : firstGlowRouteCandidates(settlement, spark, destinationActivity, targetObjectId);
  if (!immediate && !objective?.requireRest && !objective?.chargeThenRest) { const ready = candidates.find(c => (objective ? forecastShardArrival(settlement, spark, c, objective.minimumReadiness) : forecastPatternArrival(settlement, spark, c, state)).eligible); if (ready) {
    audit?.({ recoveryActions: 0, canSpendCharge: amount => Number.isInteger(amount) && amount >= 0 && spark.carriedCharge >= amount && (objective ? forecastShardArrival(settlement, { ...spark, carriedCharge: spark.carriedCharge - amount }, ready, objective.minimumReadiness) : forecastPatternArrival(settlement, { ...spark, carriedCharge: spark.carriedCharge - amount }, ready, state)).eligible });
    return pin(ready, "ready");
  } }
  const signature = JSON.stringify([spark.position, currentResources(spark), settlement.runtime.navigationRevision, settlement.runtime.reservations, settlement.sourceCharge, immediate, goal.actions, ...(objective ? [objective.activity, objective.minimumReadiness, ...(objective.requireRest ? ["require-rest"] : []), ...(objective.chargeThenRest ? ["charge-then-rest"] : [])] : [])]);
  if (goal.phase === "deferred" && goal.signature === signature) return "idle" as const;
  goal.signature = signature;
  clearPin();
  if (goal.actions >= 64) { goal.phase = "deferred"; goal.reason = "bounded preparation action limit reached"; return "idle" as const; }
  const forecastSettlement = state.recoveryAdmission ? recoveryForecastSettlement(settlement) : settlement;
  // Reuse geometry within this synchronous forecast only.
  // Resources still vary per sequence; no result survives an admission or pulse.
  const routeMemo = new Map<string, FirstGlowRouteCandidate[]>();
  const profiles = new Map<FirstGlowRouteCandidate, ReturnType<typeof routeMovementProfile>>();
  const shards = new Map<FirstGlowRouteCandidate, boolean>();
  const routes = (actor: FirstGlowSpark, act: "seek-charge" | "seek-shelter" | "scavenge-cache" | "shape-pattern", target?: string) => {
    const key = `${actor.position.x},${actor.position.y}:${act}:${target ?? ""}`;
    let choices = routeMemo.get(key);
    if (!choices) { choices = firstGlowRouteCandidates(act === "shape-pattern" ? geometricShardSettlement(state, forecastSettlement) : forecastSettlement, actor, act, target); routeMemo.set(key, choices); }
    return choices;
  };
  const profile = (candidate: FirstGlowRouteCandidate) => {
    let value = profiles.get(candidate);
    if (!value) { value = routeMovementProfile(settlement, candidate.path); profiles.set(candidate, value); }
    return value;
  };
  const arrival = (actor: FirstGlowSpark, candidate: FirstGlowRouteCandidate) => {
    if (objective) return projectShardArrival(actor, profile(candidate), objective.minimumReadiness);
    if (!shards.has(candidate)) shards.set(candidate, shardRouteCandidates(state, settlement, { ...actor, position: candidate.target }).length > 0);
    return projectArrival(actor, profile(candidate), shards.get(candidate)!);
  };
  const available = new Set(["seek-charge", "seek-shelter"].flatMap(a => firstGlowRouteCandidates(settlement, spark, a as "seek-charge" | "seek-shelter").map(c => `${c.objectId}:${c.slotId}`)));
  const witness = (site: FirstGlowRouteCandidate, phase: "charge" | "rest", n: number, destination: FirstGlowRouteCandidate, secondSite?: FirstGlowRouteCandidate, m = 0): PreparationBudget | undefined => audit ? {
    recoveryActions: n + m,
    canSpendCharge: amount => {
      if (!Number.isInteger(amount) || amount < 0 || spark.carriedCharge < amount) return false;
      const first = recover(settlement, { ...currentResources(spark), charge: spark.carriedCharge - amount }, site, phase, n, settlement.sourceCharge, profile(site));
      if (objective?.chargeThenRest && first.resources.readiness < 70) return false;
      const last = secondSite ? recover(settlement, first.resources, secondSite, phase === "charge" ? "rest" : "charge", m, first.source, profile(secondSite)) : first;
      return arrival(resourcesSpark(spark, last.resources, secondSite?.target ?? site.target), destination).eligible;
    }
  } : undefined;
  let best: { candidate: FirstGlowRouteCandidate; phase: "charge" | "rest"; score: number; key: string; available: boolean; budget?: PreparationBudget } | undefined;
  const accept = (candidate: FirstGlowRouteCandidate, phase: "charge" | "rest", score: number, key: string, budget?: PreparationBudget) => { const free = available.has(`${candidate.objectId}:${candidate.slotId}`); if (!best || state.recoveryAdmission && free && !best.available || (!state.recoveryAdmission || free === best.available) && (score < best.score || score === best.score && key < best.key)) best = { candidate, phase, score, key, available: free, budget }; };
  for (const phase of ["charge", "rest"] as const) {
    if (immediate && phase !== immediate || objective?.chargeThenRest && phase !== "charge") continue;
    const sites = routes(spark, activity(phase));
    for (const site of sites) {
      const max = phase === "charge" ? Math.min(32, Math.ceil(settlement.sourceCharge / 8)) : 11;
      for (let n = 1; n <= max; n++) {
        if (enforceRemainingBudget && n > 64 - goal.actions) continue;
        const first = recover(settlement, currentResources(spark), site, phase, n, settlement.sourceCharge, profile(site));
        if (objective?.chargeThenRest && first.resources.readiness < 70) continue;
        const at = resourcesSpark(spark, first.resources, site.target);
        const cache = routes(at, destinationActivity, targetObjectId).find(c => arrival(at, c).eligible);
        const key = `${phase}:${site.objectId}:${site.slotId}:${n}`;
        if (cache && (!objective?.requireRest && !objective?.chargeThenRest || phase === "rest")) accept(site, phase, first.pulses + profile(cache).pulses, key, witness(site, phase, n, cache));
        const secondPhase = phase === "charge" ? "rest" : "charge";
        for (const secondSite of routes(at, activity(secondPhase))) {
          const maxSecond = secondPhase === "charge" ? Math.min(32, Math.ceil(first.source / 8)) : 11;
          for (let m = 1; m <= maxSecond; m++) {
            if (enforceRemainingBudget && n + m > 64 - goal.actions) continue;
            const second = recover(settlement, first.resources, secondSite, secondPhase, m, first.source, profile(secondSite));
            const last = resourcesSpark(spark, second.resources, secondSite.target);
            const destination = routes(last, destinationActivity, targetObjectId).find(c => arrival(last, c).eligible);
            if (destination) accept(site, phase, first.pulses + second.pulses + profile(destination).pulses, `${key}:${secondSite.objectId}:${secondSite.slotId}:${m}`, witness(site, phase, n, destination, secondSite, m));
          }
        }
      }
    }
  }
  if (best) { if (best.budget) audit?.(best.budget); return pin(best.candidate, best.phase); }
  goal.phase = "deferred";
  goal.reason = objective ? "no currently feasible funded shard itinerary or contact" : !candidates.length ? "cache contact unavailable or unreachable" : candidates.every(c => forecastPatternArrival(settlement, spark, c, state).minimumReadiness > 100) ? "no feasible preparation itinerary; direct route exceeds readiness cap" : "no currently feasible charge/rest itinerary";
  return "idle" as const;
}
export function deferPatternPreparation(state: FirstGlowState, spark: FirstGlowSpark, reason: string) { const goal = state.patternPreparation?.goals.find(g => g.sparkId === spark.id); if (goal && goal.phase !== "committed") { goal.phase = "deferred"; goal.reason = reason; delete spark.preparedDestination; } }
export function recordPatternPreparation(state: FirstGlowState): void {
  for (const goal of state.patternPreparation?.goals ?? []) {
    const spark = state.settlements.flatMap(s => s.sparks).find(s => s.id === goal.sparkId)!;
    const actual = state.events.filter(e => e.actorId === goal.sparkId && (goal.phase === "charge" && e.kind === "draw" || goal.phase === "rest" && e.kind === "idle"));
    for (const event of actual) if (!goal.actionEventIds.includes(event.id)) { goal.actions++; goal.actionEventIds.push(event.id); if (!spark.knownEvidenceEventIds.includes(event.id)) spark.knownEvidenceEventIds.push(event.id); }
    const record = `${goal.phase}:${goal.reason}:${goal.actions}`;
    if (record !== goal.lastRecord) {
      const id = `event-${state.pulse}-${goal.sparkId}-pattern-preparation`;
      state.events.push({ id, pulse: state.pulse, kind: "pattern-preparation", actorId: goal.sparkId, message: `${spark.name}: ${goal.reason}; preparation ${goal.phase}, ${goal.actions} recorded recovery action(s).`, evidenceEventIds: [goal.encounterEventId, ...actual.map(e => e.id), ...(goal.useEventId ? [goal.useEventId] : [])], source: "rules" });
      spark.knownEvidenceEventIds.push(id); goal.lastRecord = record;
    }
  }
}
export function validatePatternPreparation(state: FirstGlowState): void {
  const data = state.patternPreparation;
  if (data === undefined) { if (state.settlements.some(s => s.sparks.some(spark => spark.preparedDestination))) throw new Error("Prepared destination requires preparation policy"); return; }
  if (!data || data.version !== PATTERN_PREPARATION_VERSION || !state.patternGuidedRetry || !Array.isArray(data.goals) || data.goals.length > 64) throw new Error("Unsupported pattern preparation policy");
  const seen = new Set<string>();
  for (const goal of data.goals) {
    const pattern = state.routePatterns?.patterns.find(p => p.id === goal.patternId), spark = state.settlements.find(s => s.id === pattern?.settlementId)?.sparks.find(s => s.id === goal.sparkId), encounter = pattern?.encounters.find(e => e.sparkId === goal.sparkId);
    if (seen.has(goal.sparkId) || !spark || !encounter || encounter.eventId !== goal.encounterEventId || !Number.isInteger(goal.createdPulse) || goal.createdPulse < encounter.pulse || goal.createdPulse > state.pulse || !["charge", "rest", "ready", "deferred", "committed"].includes(goal.phase) || !Number.isInteger(goal.actions) || goal.actions < 0 || goal.actions > 64 || goal.actions !== goal.actionEventIds.length || new Set(goal.actionEventIds).size !== goal.actions || goal.actionEventIds.some(id => !spark.knownEvidenceEventIds.includes(id)) || goal.phase === "committed" && (!goal.useEventId || goal.useEventId !== encounter.use?.eventId)) throw new Error("Invalid pattern preparation goal");
    const pin = spark.preparedDestination;
    const expectedActivity = goal.phase === "ready" ? "scavenge-cache" : goal.phase === "charge" ? "seek-charge" : goal.phase === "rest" ? "seek-shelter" : undefined;
    if (pin && (pin.activity !== expectedActivity || pin.activity === "scavenge-cache" && pin.objectId !== pattern!.targetObjectId)) throw new Error("Prepared destination does not match its goal");
    if (pin && (pin.patternId !== pattern!.id || pin.navigationRevision !== state.settlements.find(s => s.id === pattern!.settlementId)!.runtime.navigationRevision || !["seek-charge", "seek-shelter", "scavenge-cache"].includes(pin.activity))) throw new Error("Invalid prepared destination");
    seen.add(goal.sparkId);
  }
  for (const settlement of state.settlements) for (const spark of settlement.sparks) {
    const pin = spark.preparedDestination;
    if (!pin) continue;
    const object = settlement.bundle.objects.find(o => o.id === pin.objectId);
    const capability = pin.activity === "seek-charge" ? "charge-pool" : pin.activity === "seek-shelter" ? "shelter-niche" : "wild-cache";
    if (!seen.has(spark.id) || !object || !settlement.bundle.objectDefinitions[object.definitionId].slots.some(slot => slot.id === pin.slotId) || !settlement.bundle.objectDefinitions[object.definitionId].capabilities.includes(capability)) throw new Error("Invalid prepared destination reference");
  }
}
