import { frontierOpportunities, type FrontierOpportunity } from "./first-glow-frontier.js";
import { canonicalize, sha256, type FirstGlowActivity } from "@mimir/world-data";
import { canFirstGlowReach, clearFirstGlowPlan, firstGlowExploreCandidate, firstGlowRouteCandidates, initializeActivityCompletion, validateFirstGlowState, type FirstGlowSettlement, type FirstGlowSpark, type FirstGlowState } from "./structured.js";
import { buildFirstGlowReflectionMemoryContext } from "./first-glow-reflection-memory.js";
import { firstGlowActionScore } from "./first-glow-social.js";
import { requestFirstGlowReflection } from "./first-glow-reflection-capacity.js";
import { firstGlowSparkPersonalityProfile } from "./design.js";
import { initializeSharingRouteContinuation } from "./first-glow-sharing-continuation.js";
import { compactFirstGlowGoalContext, validateFirstGlowGoalContextProjection, FirstGlowGoalAdmissionError, type FirstGlowGoalProjection } from "./first-glow-goal-context.js";

export const FIRST_GLOW_GOAL_VERSION = "spark-goal-loop-v1" as const;
const plans = { "follow-trace": ["explore"], "explore-contribute": ["explore", "shape-pattern"], "explore-meet-mark": ["explore", "meet", "mark-trace"], "explore-mark": ["explore", "mark-trace"], "explore-shape": ["explore", "shape-pattern"] } as const;
export type FirstGlowGoalKind = keyof typeof plans;
export interface FirstGlowGoal {
  id: string;
  sparkId: string;
  targetObjectId?: string;
  targetCell?: { x: number; y: number };
  kind: FirstGlowGoalKind;
  source: "rules" | "ai";
  providerId?: string;
  providerReceipt?: { requestId: number; status: string; reservationMicrousd: number; usage?: { inputTokens: number; outputTokens: number; reasoningTokens: number; estimatedTokenCostMicrousd: number } };
  summary: string;
  fallbackReason?: string;
  contextHash: string;
  context: FirstGlowGoalContext;
  evidenceEventIds: string[];
  createdPulse: number;
  expiresPulse: number;
  status: "active" | "completed" | "interrupted";
  step: number;
  dispatches: number;
  completions: Array<{ activity: string; eventId: string; pulse: number }>;
  completedPulse?: number;
  reason?: string;
}
export interface FirstGlowGoals { version: typeof FIRST_GLOW_GOAL_VERSION; providerAttempts: number; goals: FirstGlowGoal[]; }
export interface FirstGlowGoalContext {
  version: typeof FIRST_GLOW_GOAL_VERSION;
  sparkId: string;
  pulse: number;
  candidates: FirstGlowGoalKind[];
  charge: number;
  chargeDeficit: number;
  readiness: number;
  memory: ReturnType<typeof buildFirstGlowReflectionMemoryContext>;
  evidenceEventIds: string[];
  personality?: ReturnType<typeof firstGlowSparkPersonalityProfile>;
  relationships?: { trust: (FirstGlowState["social"]["trust"][number] & { omittedEvidence?: number })[]; commitments: (FirstGlowState["social"]["commitments"][number] & { omittedEvidence?: number })[] };
  frontierExploration?: { target: { x: number; y: number }; routeCost: number; evidenceEventId: string };
  opportunities?: FrontierOpportunity[];
  projection?: FirstGlowGoalProjection;
  contextHash: string;
}
/** Local adapter contract only. Paid-provider admission/receipts belong to the server. */
export interface FirstGlowGoalProvider { providerId: string; propose(context: FirstGlowGoalContext): Promise<unknown>; }
const unique = (ids: string[]) => [...new Set(ids)].sort();
const hash = (value: unknown) => `sha256-${sha256(JSON.stringify(canonicalize(value)))}`;

export function initializeFirstGlowGoals(state: FirstGlowState): void {
  if (state.goalLoops || state.pulse !== 0 || state.events.length || state.ledger.length || state.explanations.length || state.settlements.some(s => s.sparks.some(a => a.knownEvidenceEventIds.length || a.intention)) || Object.values(state.history ?? {}).some(v => Array.isArray(v) && v.length)) throw new Error("Spark goals require a fresh history");
  if (state.patternPreparation || state.initialCachePreparation || state.postProbeContinuation) throw new Error("Spark goal executor cannot share ownership with cache preparation policies");
  if (!state.activityCompletionVersion) initializeActivityCompletion(state);
  if (!state.sharingRouteContinuationVersion) initializeSharingRouteContinuation(state);
  state.goalLoops = { version: FIRST_GLOW_GOAL_VERSION, providerAttempts: 0, goals: [] };
}

export function buildFirstGlowGoalContext(state: FirstGlowState, sparkId: string): FirstGlowGoalContext | null {
  const settlement = state.settlements.find(s => s.sparks.some(a => a.id === sparkId));
  const spark = settlement?.sparks.find(a => a.id === sparkId);
  if (!state.goalLoops || !settlement || !spark) return null;
  const memory = buildFirstGlowReflectionMemoryContext(state, sparkId);
  const knowledge = state.social.knowledge.find(k => k.sparkId === sparkId);
  const evidenceEventIds = unique([...spark.knownEvidenceEventIds, ...memory.reconstruction.eventIds, ...(knowledge?.witnessedFacts.filter(f => f.witnessedPulse <= state.pulse).map(f => f.eventId) ?? [])]);
  // Existing meeting semantics require two independently owned contacts at the same cell.
  const meetingSite = firstGlowRouteCandidates(settlement, spark, "meet").some(route => {
    const object = settlement.bundle.objects.find(o => o.id === route.objectId)!;
    const slots = settlement.bundle.objectDefinitions[object.definitionId].slots;
    const slot = slots.find(s => s.id === route.slotId)!;
    return slots.some(s => s.id !== slot.id && s.offset.x === slot.offset.x && s.offset.y === slot.offset.y);
  });
  const opportunities = state.frontier ? frontierOpportunities(state, settlement, spark) : undefined;
  const nextTrace = state.frontier ? firstGlowExploreCandidate(settlement, { ...spark, frontierTargetObjectId: undefined, frontierTargetCell: undefined }) : null;
  const regionEvidence = state.frontier?.visits.find(v=>v.sparkId===sparkId)?.eventId;
  const frontierExploration = nextTrace && regionEvidence ? { target: nextTrace.target, routeCost: nextTrace.cost, evidenceEventId: regionEvidence } : undefined;
  const candidates: FirstGlowGoalKind[] = opportunities ? [...opportunities.map(o=>o.kind), ...(frontierExploration ? ["follow-trace" as const] : [])] : (Object.keys(plans) as FirstGlowGoalKind[]).filter(kind => (kind !== "follow-trace" && kind !== "explore-contribute" && (kind !== "explore-meet-mark" || meetingSite)) && plans[kind].every(a => canFirstGlowReach(settlement, spark, a)));
  const relationships = { trust: structuredClone(state.social.trust.filter(t => t.sourceSparkId === sparkId)), commitments: structuredClone(state.social.commitments.filter(c => c.promisorSparkId === sparkId)) };
  const context = { ...(frontierExploration ? { frontierExploration } : {}), ...(opportunities ? { opportunities } : {}), version: FIRST_GLOW_GOAL_VERSION, sparkId, pulse: state.pulse, candidates, charge: spark.carriedCharge, chargeDeficit: spark.chargeDeficit, readiness: spark.readiness, memory, evidenceEventIds, personality: firstGlowSparkPersonalityProfile(sparkId), relationships };
  return compactFirstGlowGoalContext({ ...context, contextHash: "" });
}

function checkedProposal(value: unknown, context: FirstGlowGoalContext): { kind: FirstGlowGoalKind; summary: string; evidenceEventIds: string[] } | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  if (!context.candidates.includes(p.kind as FirstGlowGoalKind) || typeof p.summary !== "string" || !p.summary.trim() || p.summary.length > 240 || !Array.isArray(p.evidenceEventIds) || !p.evidenceEventIds.length || p.evidenceEventIds.length > 8 || p.evidenceEventIds.some(id => typeof id !== "string" || !context.evidenceEventIds.includes(id))) return null;
  return { kind: p.kind as FirstGlowGoalKind, summary: p.summary.trim(), evidenceEventIds: unique(p.evidenceEventIds as string[]) };
}

/** Returns a new candidate checkpoint. The server must commit it through its single writer. */
export async function requestFirstGlowGoal(input: FirstGlowState, sparkId: string, options: { provider?: FirstGlowGoalProvider; timeoutMs?: number; historicalPlayback?: boolean; fallbackReason?: string } = {}): Promise<{ state: FirstGlowState; goal?: FirstGlowGoal; reason: string }> {
  validateFirstGlowState(input);
  if (options.historicalPlayback) return { state: input, reason: "historical-playback" };
  const spark = input.settlements.flatMap(s => s.sparks).find(a => a.id === sparkId);
  if (!input.goalLoops || !spark) return { state: input, reason: "goals-disabled-or-unknown-spark" };
  if (input.goalLoops.goals.some(g => g.sparkId === sparkId && g.status === "active") || spark.intention?.status === "active" || spark.destinationObjectId || spark.destinationCell || !["choosing", "waiting", "idle"].includes(spark.status)) return { state: input, reason: "existing-activity-continues" };
  if (input.goalLoops.goals.length >= 64) return { state: input, reason: "goal-record-limit" };
  const context = buildFirstGlowGoalContext(input, sparkId)!;
  if (!context.candidates.length || !context.evidenceEventIds.length) return { state: input, reason: "no-local-opportunity-evidence" };
  const timeoutMs = options.timeoutMs ?? 1000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10_000) throw new Error("invalid goal timeout");
  const sourceHash = hash(input);
  // Bundles are immutable; retain their identity so world-size path caches survive decisions.
  const next: FirstGlowState = { ...structuredClone({ ...input, settlements: [] }), settlements: input.settlements.map(({ bundle, ...settlement }) => ({ ...structuredClone(settlement), bundle })) };
  if (!next.reflectionCapacity || !requestFirstGlowReflection(next.reflectionCapacity, sparkId, next.pulse).created) return { state: next, reason: "reflection-not-admitted" };
  let selected: ReturnType<typeof checkedProposal> = null;
  let fallbackReason = options.provider ? "provider-attempt-limit" : options.fallbackReason ?? "provider-unavailable";
  if (options.provider && next.goalLoops!.providerAttempts < 16) {
    next.goalLoops!.providerAttempts++;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const value = await Promise.race([options.provider.propose(structuredClone(context)), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), timeoutMs); })]);
      selected = checkedProposal(value, context);
      fallbackReason = "provider-invalid";
    } catch (error) { fallbackReason = error instanceof FirstGlowGoalAdmissionError ? error.code : "provider-failed-or-timeout"; }
    finally { clearTimeout(timer); }
  }
  if (hash(input) !== sourceHash) throw new Error("Spark goal source changed while evaluating proposal");
  const source = selected ? "ai" : "rules";
  const fallbackKind = context.opportunities ? [...context.candidates].sort((a,b)=>next.goalLoops!.goals.filter(g=>g.sparkId===sparkId&&g.kind===a).length-next.goalLoops!.goals.filter(g=>g.sparkId===sparkId&&g.kind===b).length || (["explore-contribute","follow-trace","explore-meet-mark","explore-shape","explore-mark"].indexOf(a)-["explore-contribute","follow-trace","explore-meet-mark","explore-shape","explore-mark"].indexOf(b)))[0] : context.candidates.includes("explore-mark") ? "explore-mark" : context.candidates[0];
  selected ??= { kind: fallbackKind, summary: fallbackKind === "explore-contribute" ? "Contribute charge at a locally noticed trace weave." : fallbackKind === "follow-trace" ? "Explore a locally visible unfamiliar trace cell." : fallbackKind === "explore-shape" ? "Explore a reachable trace and examine a pattern shard." : "Explore a reachable trace and leave a light mark.", evidenceEventIds: context.evidenceEventIds.slice(0, 1) };
  const targetObjectId = context.opportunities?.find(o=>o.kind===selected!.kind)?.objectId;
  const goal: FirstGlowGoal = { ...(selected.kind === "follow-trace" ? { targetCell: context.frontierExploration!.target } : {}), ...(targetObjectId ? { targetObjectId } : {}), id: `goal-${next.pulse}-${sparkId}-${next.goalLoops!.goals.length}`, sparkId, ...selected, source, ...(source === "ai" ? { providerId: options.provider!.providerId } : { fallbackReason }), contextHash: context.contextHash, context, createdPulse: next.pulse, expiresPulse: next.pulse + 128, status: "active", step: 0, dispatches: 0, completions: [] };
  next.goalLoops!.goals.push(goal);
  validateFirstGlowGoals(next);
  return { state: next, goal, reason: source === "ai" ? "provider-selected" : fallbackReason };
}

function interrupt(state: FirstGlowState, goal: FirstGlowGoal, reason: string): void {
  goal.status = "interrupted";
  goal.reason = reason;
  const settlement = state.settlements.find(s => s.sparks.some(a => a.id === goal.sparkId))!;
  const spark = settlement.sparks.find(a => a.id === goal.sparkId)!;
  clearFirstGlowPlan(settlement, spark, "goal-ended");
  delete spark.frontierTargetObjectId; delete spark.frontierTargetCell;
  spark.intendedActivity = "idle";
  state.events.push({ id: `event-${state.pulse}-${goal.id}-interrupted`, pulse: state.pulse, kind: "goal", actorId: goal.sparkId, source: "rules", evidenceEventIds: goal.completions.map(c => c.eventId), message: `${goal.sparkId}'s ${goal.kind} goal ended without completion: ${reason}.` });
}

/** Selects only at an activity boundary: never teleports, grants resources or steals reservations. */
export function selectFirstGlowGoalActivity(state: FirstGlowState, settlement: FirstGlowSettlement, spark: FirstGlowSpark): boolean {
  const goal = state.goalLoops?.goals.find(g => g.sparkId === spark.id && g.status === "active");
  if (!goal) { delete spark.frontierTargetObjectId; delete spark.frontierTargetCell; return false; }
  if (goal.kind === "explore-contribute") {
    const project=state.frontier?.projects.find(p=>p.objectId===goal.targetObjectId);
    const site=settlement.bundle.objects.find(o=>o.id===goal.targetObjectId);
    if(project?.completedPulse!==undefined && !project.contributions.some(c=>c.sparkId===spark.id) && site && Math.abs(site.origin.x-spark.position.x)+Math.abs(site.origin.y-spark.position.y)<=5){
      interrupt(state,goal,"observed-project-already-completed"); return false;
    }
  }
  if (spark.destinationObjectId || spark.destinationCell || spark.status === "traveling" || spark.status === "interacting") return true;
  if (state.pulse >= goal.expiresPulse || goal.dispatches >= 64) return false; // finalized after the next authoritative transition
  const stage = plans[goal.kind][goal.step];
  spark.frontierTargetObjectId = goal.targetObjectId;
  spark.frontierTargetCell = goal.targetCell;
  const exploration = stage === "explore" ? firstGlowExploreCandidate(settlement, spark) : null;
  const routes = exploration ? [exploration] : firstGlowRouteCandidates(settlement, spark, stage);
  const travelPulses = routes.length ? Math.ceil(routes[0].cost / 2) : 0;
  const target = settlement.sparks.find(a => a.id !== spark.id);
  const care = target && firstGlowActionScore(state.social, spark.id, target.id, "shelter-or-trace") >= 3;
  let activity: FirstGlowActivity = stage;
  if (spark.carriedCharge === 0 || spark.chargeDeficit > 0) activity = "seek-charge";
  else if (spark.readiness < (care ? 90 : 70)) activity = "seek-shelter";
  else if (spark.carriedCharge <= travelPulses + 1) activity = "seek-charge";
  else if (spark.readiness < 70 + travelPulses + 1) activity = "seek-shelter";
  if (!canFirstGlowReach(settlement, spark, activity) || activity === "seek-charge" && settlement.sourceCharge <= 0) {
    // Keep the goal, but let normal need/recovery selection act. No success or stage advance.
    goal.reason = `unavailable-${activity}`;
    return false;
  }
  if (activity !== stage) { delete spark.frontierTargetObjectId; delete spark.frontierTargetCell; }
  goal.reason = activity === stage ? "pursuing-goal" : `recovering-${activity}`;
  goal.dispatches++;
  spark.intendedActivity = activity;
  spark.waitReason = undefined;
  spark.status = "choosing";
  return true;
}

/** Completion evidence is consumed once, in order, from this pulse's physical executor. */
export function finishFirstGlowGoals(state: FirstGlowState): void {
  if (!state.goalLoops) return;
  for (const goal of state.goalLoops.goals.filter(g => g.status === "active")) {
    if (state.pulse > goal.expiresPulse) { interrupt(state, goal, "goal-expired"); continue; }
    const activity = plans[goal.kind][goal.step];
    const event = state.events.find(e => e.kind === activity && (!goal.targetCell || e.cells?.some(c=>c.x===goal.targetCell!.x&&c.y===goal.targetCell!.y)) && (!goal.targetObjectId || e.objectId === goal.targetObjectId) && (goal.kind !== "explore-contribute" || activity !== "shape-pattern" || state.frontier?.projects.some(p=>p.objectId===goal.targetObjectId&&p.contributions.some(c=>c.sparkId===goal.sparkId&&c.eventId===e.id))) && (e.actorId === goal.sparkId || activity === "meet" && e.participants?.includes(goal.sparkId)) && (activity !== "meet" || e.participants?.length === 2) && !goal.completions.some(c => c.eventId === e.id));
    if (event) {
      goal.completions.push({ activity, eventId: event.id, pulse: state.pulse });
      goal.step++;
      if (goal.step === plans[goal.kind].length) {
        const actor=state.settlements.flatMap(s=>s.sparks).find(s=>s.id===goal.sparkId)!; delete actor.frontierTargetObjectId; delete actor.frontierTargetCell;
        goal.status = "completed";
        goal.completedPulse = state.pulse;
        goal.reason = "all-steps-physically-completed";
      }
      state.events.push({ id: `event-${state.pulse}-${goal.id}-step-${goal.step}`, pulse: state.pulse, kind: "goal", actorId: goal.sparkId, source: "rules", evidenceEventIds: goal.completions.map(c => c.eventId), message: `${goal.sparkId} completed ${activity} (${goal.step}/${plans[goal.kind].length}) for ${goal.kind}${goal.status === "completed" ? "; goal completed" : "; goal continues"}.` });
    }
    if (goal.status === "active" && (state.pulse >= goal.expiresPulse || goal.dispatches >= 64)) interrupt(state, goal, state.pulse >= goal.expiresPulse ? "goal-expired" : "dispatch-limit");
  }
}

/** A real contact may wait for another independently arriving Spark; no fabricated partner. */
export function waitingForFirstGlowGoalMeeting(state: FirstGlowState, spark: FirstGlowSpark): boolean {
  const target = state.settlements.find(s => s.sparks.some(a => a.id === spark.id))?.sparks.find(a => a.id !== spark.id);
  const care = target && firstGlowActionScore(state.social, spark.id, target.id, "shelter-or-trace") >= 3;
  return spark.carriedCharge > 0 && spark.chargeDeficit === 0 && spark.readiness >= (care ? 90 : 70) && Boolean(state.goalLoops?.goals.some(g => g.sparkId === spark.id && g.status === "active" && plans[g.kind][g.step] === "meet" && state.pulse < g.expiresPulse));
}

export function summarizeFirstGlowGoals(state: FirstGlowState) {
  return (state.goalLoops?.goals ?? []).map(g => ({ id: g.id, sparkId: g.sparkId, kind: g.kind, source: g.source, targetObjectId: g.targetObjectId, targetCell: g.targetCell, providerId: g.providerId, fallbackReason: g.fallbackReason, status: g.status, step: g.step, totalSteps: plans[g.kind].length, createdPulse: g.createdPulse, completedPulse: g.completedPulse, reason: g.reason, evidence: g.completions.map(c => ({ ...c })) }));
}

export function validateFirstGlowGoals(state: FirstGlowState): void {
  const policy = state.goalLoops;
  if (policy === undefined) return;
  const fail = () => { throw new Error("Invalid or unsupported Spark goal checkpoint"); };
  if (!policy || policy.version !== FIRST_GLOW_GOAL_VERSION || !state.activityCompletionVersion || state.patternPreparation || state.initialCachePreparation || state.postProbeContinuation || !Number.isInteger(policy.providerAttempts) || policy.providerAttempts < 0 || policy.providerAttempts > 16 || !Array.isArray(policy.goals) || policy.goals.length > 64) fail();
  const ids = new Set<string>(), active = new Set<string>();
  const sparks = state.settlements.flatMap(s => s.sparks);
  for (const g of policy.goals) {
    const spark = sparks.find(a => a.id === g.sparkId);
    if (!spark || !g.id || ids.has(g.id) || !Object.hasOwn(plans, g.kind) || !["rules", "ai"].includes(g.source) || typeof g.summary !== "string" || !g.summary.trim() || g.summary.length > 240 || !/^sha256-[a-f0-9]{64}$/.test(g.contextHash) || !Array.isArray(g.evidenceEventIds) || !g.evidenceEventIds.length || g.evidenceEventIds.some(id => typeof id !== "string") || !["active", "completed", "interrupted"].includes(g.status) || !Number.isInteger(g.createdPulse) || g.createdPulse < 0 || g.createdPulse > state.pulse || g.expiresPulse !== g.createdPulse + 128 || !Number.isInteger(g.step) || g.step < 0 || g.step > plans[g.kind].length || !Number.isInteger(g.dispatches) || g.dispatches < 0 || g.dispatches > 64 || !Array.isArray(g.completions) || g.completions.length !== g.step) fail();
    if (g.kind === "explore-contribute" && !state.frontier) fail();
    if (g.targetObjectId !== undefined && (!state.frontier || g.context.opportunities?.find(o=>o.kind===g.kind)?.objectId!==g.targetObjectId || !state.frontier.discoveries.some(d=>d.sparkId===g.sparkId&&d.objectId===g.targetObjectId&&d.pulse<=g.createdPulse))) fail();
    if (g.context.opportunities && !g.targetObjectId && g.kind!=="follow-trace") fail();
    if (g.targetCell && (g.kind!=="follow-trace" || !Number.isInteger(g.targetCell.x) || !Number.isInteger(g.targetCell.y) || g.targetCell.x<0 || g.targetCell.y<0 || g.targetCell.x>=state.settlements[0].bundle.width || g.targetCell.y>=state.settlements[0].bundle.height)) fail();
    if (g.kind==="follow-trace" && (!state.frontier || !g.targetCell || JSON.stringify(g.targetCell)!==JSON.stringify(g.context.frontierExploration?.target))) fail();
    const { contextHash, ...context } = g.context ?? {};
    validateFirstGlowGoalContextProjection(g.context);
    if (contextHash !== g.contextHash || hash(context) !== g.contextHash || g.context.sparkId !== g.sparkId || g.context.pulse !== g.createdPulse || g.context.version !== FIRST_GLOW_GOAL_VERSION || !g.context.candidates.includes(g.kind) || g.evidenceEventIds.some(id => !g.context.evidenceEventIds.includes(id)) || g.source === "ai" && (!g.providerId || g.providerId.length > 120) || g.source === "rules" && !g.fallbackReason) fail();
    if (g.status === "active") { if (active.has(g.sparkId) || g.step === plans[g.kind].length || spark!.intention?.status === "active") fail(); active.add(g.sparkId); }
    if ((g.status === "completed") !== (g.step === plans[g.kind].length) || g.status === "completed" && g.completedPulse !== g.completions.at(-1)?.pulse || g.status !== "completed" && g.completedPulse !== undefined) fail();
    let previous = g.createdPulse;
    for (let i = 0; i < g.completions.length; i++) {
      const c = g.completions[i];
      if (c.activity !== plans[g.kind][i] || typeof c.eventId !== "string" || !spark!.knownEvidenceEventIds.includes(c.eventId) || !Number.isInteger(c.pulse) || c.pulse <= previous || c.pulse > state.pulse || c.pulse > g.expiresPulse || g.completions.findIndex(x => x.eventId === c.eventId) !== i) fail();
      previous = c.pulse;
    }
    ids.add(g.id);
  }
}
