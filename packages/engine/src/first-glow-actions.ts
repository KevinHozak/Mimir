import { observeFrontier } from "./first-glow-frontier.js";
import { selectFirstGlowGoalActivity, finishFirstGlowGoals } from "./first-glow-goals.js";
import { sharingAdmissionRefusal, type SharingAdmissionDecision } from "./first-glow-sharing-admission.js";
import { selectPostProbeContinuation, recordPostProbeContinuations } from "./first-glow-post-probe-continuation.js";
import { selectInitialCachePreparation, recordInitialCachePreparation } from "./first-glow-initial-cache-preparation.js";
import { recoveryForecastSettlement, cancelObsoleteRecoveryRequests, validateRecoveryAdmission } from "./first-glow-recovery-admission.js";
import { restoreSharingParticipants, type SharingPause } from "./first-glow-sharing-continuation.js";
import { selectPatternPreparation, recordPatternPreparation, deferPatternPreparation } from "./first-glow-pattern-preparation.js";
import { patternRetryRefusal } from "./first-glow-pattern-retry.js";
import { isRoutePatternCreationSource, knownRoutePattern, recordRoutePatternDecisions, updateRoutePatterns, finishRoutePatternUses, type RoutePatternDecision } from "./first-glow-route-patterns.js";
import { advanceFirstGlowState, canFirstGlowReach, canReachRoutePatternTarget, validateFirstGlowState, type FirstGlowState } from "./structured.js";
import { applyFirstGlowDilemmaChoice, firstGlowActionScore, recordFirstGlowWitnesses, type FirstGlowDilemmaChoice } from "./first-glow-social.js";
import { appendFirstGlowExplanations } from "./first-glow-explanations.js";
import { appendFirstGlowMovement } from "./first-glow-history.js";
import type { FirstGlowActivity } from "@mimir/world-data";
import { canTraverse } from "@mimir/world-data";
import { continueFirstGlowIntention, finalizeFirstGlowIntentions } from "./first-glow-intentions.js";

export interface FirstGlowExternalChargeInput { sourceCharge?: number; communalCharge?: number; loss?: number; resolveSocial?: boolean; validate?: boolean; deterministicSeed?: number; }

function hasLearned(spark: FirstGlowState["settlements"][number]["sparks"][number], activity: FirstGlowActivity): boolean {
  return spark.knownEvidenceEventIds.some((eventId) => eventId.endsWith(`-${activity}`));
}

function chooseAutonomousActivities(state: FirstGlowState, sharingAdmissions: SharingAdmissionDecision[]): RoutePatternDecision[] {
  const decisions: RoutePatternDecision[] = [];
  if (state.pulse === 0) return decisions;
  for (const settlement of state.settlements) for (const spark of settlement.sparks.slice().sort((a, b) => a.id.localeCompare(b.id))) {
    if (spark.intention?.status === "active") continue;
    if (selectFirstGlowGoalActivity(state, settlement, spark)) continue;
    if ((spark.status !== "choosing" && spark.status !== "waiting") || spark.destinationObjectId) continue;
    const companion = settlement.sparks.find((candidate) => candidate.id !== spark.id && candidate.position.x === spark.position.x && candidate.position.y === spark.position.y && candidate.carriedCharge === 0);
    if (spark.carriedCharge > 0 && companion) {
      const reason = sharingAdmissionRefusal(state, settlement, spark);
      if (!reason) { spark.intendedActivity = "share-charge"; continue; }
      sharingAdmissions.push({ sparkId: spark.id, recipientId: companion.id, reason });
    }
    const needsCharge = spark.carriedCharge === 0 || spark.chargeDeficit > 0;
    const priorities: FirstGlowActivity[] = [];
    if (needsCharge && settlement.sourceCharge > 0) priorities.push("seek-charge");
    const target = settlement.sparks.slice().sort((a, b) => a.id.localeCompare(b.id)).find(candidate => candidate.id !== spark.id);
    const shelterCarePreferred = target && firstGlowActionScore(state.social, spark.id, target.id, "shelter-or-trace") >= 3 && spark.readiness < 90;
    if (spark.readiness < 70 || shelterCarePreferred) priorities.push("seek-shelter");
    const pattern = knownRoutePattern(state, settlement.id, spark.id);
    const patternReason = !pattern ? undefined : patternRetryRefusal(state, spark, pattern) ?? ( pattern.navigationRevision !== settlement.runtime.navigationRevision ? "the recorded navigation revision is stale" : !canReachRoutePatternTarget(settlement, spark, pattern.targetObjectId) ? "the recorded target is unavailable or unreachable" : undefined);
    if (pattern && !patternReason) priorities.push("scavenge-cache");
    if (spark.wildCacheChoice && spark.wildCacheChoice.pulse === state.pulse && (spark.wildCacheChoice.alternative !== "probe" || spark.wildCacheChoice.routeFact?.navigationRevision === settlement.runtime.navigationRevision)) priorities.push(spark.wildCacheChoice.nextActivity);
    if (!hasLearned(spark, "explore")) priorities.push("explore");
    if (hasLearned(spark, "explore") && !spark.wildCacheChoice && !hasLearned(spark, "scavenge-cache")) priorities.push("scavenge-cache");
    if (hasLearned(spark, "explore") && !hasLearned(spark, "mark-trace")) priorities.push("mark-trace");
    if (!hasLearned(spark, "shape-pattern")) priorities.push("shape-pattern");
    priorities.push("seek-shelter", "idle");
    if (state.patternPreparation && pattern && patternReason) deferPatternPreparation(state, spark, patternReason);
    const initialGoal = state.initialCachePreparation?.goals.find(g => g.sparkId === spark.id);
    const initial = state.initialCachePreparation && !spark.wildCacheChoice && (initialGoal ? initialGoal.phase !== "committed" || !pattern : !pattern && hasLearned(spark, "explore") && !hasLearned(spark, "scavenge-cache"))
      ? selectInitialCachePreparation(state, settlement, spark, needsCharge ? "charge" : spark.readiness < 70 || shelterCarePreferred ? "rest" : undefined) : undefined;
    const initialSelection = initial === "idle" && (needsCharge || spark.readiness < 70 || shelterCarePreferred) ? priorities.find(a => a === "seek-charge" || a === "seek-shelter") ?? initial : initial;
    const continuation = selectPostProbeContinuation(state, settlement, spark, needsCharge ? "charge" : spark.readiness < 70 || shelterCarePreferred ? "rest" : undefined);
    const continuationCarePreferred = state.careRecoveryFallbackVersion && state.postProbeContinuation?.goals.some(g => g.sparkId === spark.id && g.careFallbackUsed && !g.outcome && (spark.readiness < 90 || !g.careRestEventId));
    const continuationSelection = continuation === "idle" && (needsCharge || spark.readiness < 70 || shelterCarePreferred || continuationCarePreferred) ? priorities.find(a => a === "seek-charge" || a === "seek-shelter") ?? continuation : continuation;
    const preparation = continuationSelection ?? initialSelection ?? (state.patternPreparation && pattern && !patternReason ? selectPatternPreparation(state, settlement, spark, pattern, needsCharge ? "charge" : spark.readiness < 70 || shelterCarePreferred ? "rest" : undefined) : undefined);
    const next = preparation ?? priorities.find((activity) => canFirstGlowReach(state.recoveryAdmission && ["seek-charge", "seek-shelter", "idle"].includes(activity) ? recoveryForecastSettlement(settlement) : settlement, spark, activity));
    if (next) { spark.intendedActivity = next; spark.waitReason = undefined; }
    else if (state.patternGuidedRetry) { spark.intendedActivity = "idle"; spark.waitReason = undefined; }
    if (pattern && initial === undefined && continuation === undefined) {
      const use = !patternReason && next === "scavenge-cache";
      if (use) spark.routePatternTargetObjectId = pattern.targetObjectId;
      decisions.push({ patternId: pattern.id, sparkId: spark.id, use, reason: patternReason ?? (preparation ? state.patternPreparation!.goals.find(g => g.sparkId === spark.id)!.reason : `selected ${next ?? "waiting"} under current needs and reachability`) });
    }
  }
  return decisions;
}

function seededChoicePressure(seed: number, pulse: number, eventId: string): number {
  let hash = (Math.trunc(seed) >>> 0) ^ Math.imul(pulse, 0x45d9f3b);
  for (const character of eventId) hash = Math.imul(hash ^ character.charCodeAt(0), 0x45d9f3b) | 0;
  return ((hash >>> 0) % 3) - 1;
}

function seededTargetId(seed: number, pulse: number, eventId: string, candidates: string[]): string | undefined {
  if (!candidates.length) return undefined;
  let hash = (Math.trunc(seed) >>> 0) ^ Math.imul(pulse, 0x27d4eb2d);
  for (const character of eventId) hash = Math.imul(hash ^ character.charCodeAt(0), 0x165667b1) | 0;
  return candidates[(hash >>> 0) % candidates.length];
}

function resolveAutonomousSocialChoices(state: FirstGlowState, deterministicSeed = 0): void {
  const sparks = state.settlements.flatMap(settlement => settlement.sparks).slice().sort((a, b) => a.id.localeCompare(b.id));
  for (const event of state.events.slice().sort((a, b) => a.id.localeCompare(b.id))) {
    if (isRoutePatternCreationSource(state, event)) continue;
    const dilemmaId: FirstGlowDilemmaChoice["dilemmaId"] | undefined = event.kind === "draw"
      ? "weakening-pool-report"
      : event.kind === "idle" || event.kind === "wait"
        ? "shelter-or-trace"
        : ["explore", "mark-trace", "shape-pattern", "meet"].includes(event.kind)
          ? "public-or-private-mark"
          : event.kind === "wild-cache"
            ? "wild-cache-risk"
          : undefined;
    if (!dilemmaId) continue;
    const actor = sparks.find(spark => spark.id === event.actorId);
    const targetCandidates = event.participants?.slice().sort((a, b) => a.localeCompare(b)).filter(id => id !== event.actorId) ?? sparks.filter(spark => spark.id !== event.actorId).map(spark => spark.id);
    const target = seededTargetId(deterministicSeed, state.pulse, event.id, targetCandidates);
    if (!actor || !target) continue;
    const choices: Record<FirstGlowDilemmaChoice["dilemmaId"], [string, string]> = {
      "weakening-pool-report": ["reveal-pool", "withhold-pool"],
      "shelter-or-trace": ["help-shelter", "continue-exploration"],
      "public-or-private-mark": ["make-mark-public", "keep-mark-private"],
      "wild-cache-risk": ["enter-wild-cache", "stay-on-trace"]
    };
    const [first, second] = choices[dilemmaId];
    const score = firstGlowActionScore(state.social, actor.id, target, dilemmaId);
    const alternativeId = score + seededChoicePressure(deterministicSeed, state.pulse, event.id) >= 0 ? first : second;
    state.social = applyFirstGlowDilemmaChoice(state.social, { dilemmaId, alternativeId, actorSparkId: actor.id, targetSparkId: target, evidenceEventIds: [event.id], pulse: state.pulse });
  }
}

export function advanceFirstGlow(input: FirstGlowState, external: FirstGlowExternalChargeInput = {}): FirstGlowState {
  validateRecoveryAdmission(input);
  // Bundles are immutable, content-addressed authored data. Preserve their identity while
  // cloning mutable runtime state so long evidence reviews do not copy the full map per pulse.
  const working: FirstGlowState = {
    ...input,
    ...(input.frontier ? { frontier: structuredClone(input.frontier) } : {}),
    ...(input.goalLoops ? { goalLoops: structuredClone(input.goalLoops) } : {}),
    ...(input.postProbeContinuation ? { postProbeContinuation: structuredClone(input.postProbeContinuation) } : {}),
    ...(input.initialCachePreparation ? { initialCachePreparation: structuredClone(input.initialCachePreparation) } : {}),
    ...(input.recoveryAdmission ? { recoveryAdmission: structuredClone(input.recoveryAdmission) } : {}),
    ...(input.patternPreparation ? { patternPreparation: structuredClone(input.patternPreparation) } : {}),
    ...(input.patternGuidedRetry ? { patternGuidedRetry: structuredClone(input.patternGuidedRetry) } : {}),
    ...(input.routePatterns ? { routePatterns: structuredClone(input.routePatterns) } : {}),
    settlements: input.settlements.map(({ bundle, ...settlement }) => ({ ...structuredClone(settlement), bundle })),
    ledger: structuredClone(input.ledger),
    events: structuredClone(input.events),
    social: structuredClone(input.social),
    explanations: structuredClone(input.explanations),
    history: structuredClone(input.history),
    reflectionCapacity: structuredClone(input.reflectionCapacity)
  };
  continueFirstGlowIntention(working);
  const sharingAdmissions: SharingAdmissionDecision[] = [];
  const routePatternDecisions = chooseAutonomousActivities(working, sharingAdmissions);
  const previous = new Map(working.settlements.flatMap(settlement => settlement.sparks.map(spark => [spark.id, { status: spark.status, activity: spark.intendedActivity }] as const)));
  const pauseSnapshots = new Map(working.settlements.flatMap(settlement => settlement.sparks.map(spark => [spark.id, { sparkId: spark.id, activity: spark.intendedActivity, hadPlan: Boolean(spark.destinationObjectId || spark.destinationCell || spark.remainingRoute.length) } satisfies SharingPause] as const)));
  const shares: { actorId: string; recipientId: string }[] = [];
  const claimedRecipients = new Set<string>();
  const restoredActivities = new Map<string, FirstGlowState["settlements"][number]["sparks"][number]["intendedActivity"]>();
  for (const settlement of working.settlements) for (const spark of settlement.sparks.slice().sort((a, b) => a.id.localeCompare(b.id))) {
    if (spark.status !== "choosing" || spark.intendedActivity !== "share-charge") continue;
    const recipient = settlement.sparks.slice().sort((a, b) => a.id.localeCompare(b.id)).find(candidate => candidate.id !== spark.id && !claimedRecipients.has(candidate.id) && candidate.position.x === spark.position.x && candidate.position.y === spark.position.y);
    if (recipient) {
      const reason = sharingAdmissionRefusal(working, settlement, spark);
      if (reason) { sharingAdmissions.push({ sparkId: spark.id, recipientId: recipient.id, reason }); continue; }
      shares.push({ actorId: spark.id, recipientId: recipient.id }); claimedRecipients.add(recipient.id); spark.status = "waiting"; recipient.status = "waiting"; restoredActivities.set(recipient.id, recipient.intendedActivity); recipient.intendedActivity = "share-charge";
    }
  }
  cancelObsoleteRecoveryRequests(working);
  const state = advanceFirstGlowState(working, external.validate !== false, routePatternDecisions);
  for (const decision of sharingAdmissions.filter((d, i, all) => all.findIndex(x => x.sparkId === d.sparkId) === i)) {
    state.events.push({ id: `event-${state.pulse}-${decision.sparkId}-sharing-admission`, kind: "sharing-admission", actorId: decision.sparkId, participants: [decision.sparkId, decision.recipientId], source: "rules", message: `${decision.sparkId} deferred discretionary sharing: ${decision.reason}. This proposed transfer was not admitted; normal recovery, admission and actual costs remain authoritative.` });
  }
  if (!state.patternGuidedRetry) recordRoutePatternDecisions(state, routePatternDecisions);
  // Link the first committed follow-up goal, rather than treating the plan as an outcome.
  for (const settlement of state.settlements) for (const spark of settlement.sparks) {
    const choice = spark.wildCacheChoice;
    if (!choice || choice.pulse !== state.pulse - 1) continue;
    const causedByChoice = spark.intendedActivity === choice.nextActivity;
    const event = { id: `event-${state.pulse}-${spark.id}-cache-follow-up`, pulse: state.pulse, kind: "wild-cache-choice" as const, actorId: spark.id, evidenceEventIds: [choice.decisionEventId, choice.outcomeEventId], source: "rules" as const, message: `${spark.name} ${causedByChoice ? "followed the Wild Cache choice with" : "rechecked needs and instead selected"} ${spark.intendedActivity.replaceAll("-", " ")}; status: ${spark.status}. This records the goal, not successful arrival.` };
    state.events.push(event);
    const explanation = state.explanations.find(item => item.id === `explanation-${choice.decisionEventId}`);
    if (explanation) {
      explanation.consequenceEvents.push({ id: event.id, pulse: state.pulse, message: event.message });
    }
  }
  for (const event of state.events.filter(event => event.kind === "movement" && event.cells && event.cells.length > 1)) {
    const spark = state.settlements.flatMap(settlement => settlement.sparks).find(candidate => candidate.id === event.actorId);
    const settlement = state.settlements.find(candidate => candidate.sparks.some(spark => spark.id === event.actorId));
    if (!spark || !settlement || !state.history) continue;
    const movementCost = event.cells!.slice(1).reduce((total, cell, index) => { const edge = canTraverse(settlement.bundle, settlement.runtime, event.cells![index], cell); return total + (edge.walkable ? edge.cost : 0); }, 0);
    appendFirstGlowMovement(state.history, { id: `movement-${state.pulse}-${event.actorId}`, pulse: state.pulse, sparkId: event.actorId, eventId: event.id, cells: event.cells!.map(cell => ({ ...cell })), routeRevision: spark.plannedNavigationRevision, movementCost, resourceEffects: [], resultingEventId: event.id });
  }
  const sourceInput = external.sourceCharge ?? 0;
  const communalInput = external.communalCharge ?? 0;
  const lossInput = external.loss ?? 0;
  if (![sourceInput, communalInput, lossInput].every(value => Number.isInteger(value) && value >= 0)) throw new Error("First Glow external charge inputs must be non-negative integers");
  if (sourceInput > 0) { state.settlements[0].sourceCharge += sourceInput; state.ledger.push({ kind: "production", amount: sourceInput, reason: "external-source-intake" }); }
  if (communalInput > 0) { state.settlements[0].communalCharge += communalInput; state.ledger.push({ kind: "production", amount: communalInput, reason: "external-communal-intake" }); }
  if (lossInput > 0) { const settlement = state.settlements[0]; const lost = Math.min(lossInput, settlement.sourceCharge + settlement.communalCharge); const fromSource = Math.min(lost, settlement.sourceCharge); settlement.sourceCharge -= fromSource; settlement.communalCharge -= lost - fromSource; state.ledger.push({ kind: "loss", amount: lost, reason: "external-charge-loss" }); }
  for (const share of shares) for (const settlement of state.settlements) {
    const actor = settlement.sparks.find(spark => spark.id === share.actorId); const recipient = settlement.sparks.find(spark => spark.id === share.recipientId);
    if (!actor || !recipient || actor.position.x !== recipient.position.x || actor.position.y !== recipient.position.y) continue;
    const amount = Math.min(1, actor.carriedCharge); actor.carriedCharge -= amount; recipient.carriedCharge += amount; state.ledger.push({ kind: "share", actorId: actor.id, recipientId: recipient.id, amount, reason: amount ? "co-present-spark" : "no-carried-charge" }); state.events.push({ id: `event-${state.pulse}-${actor.id}-share`, kind: "share", actorId: actor.id, participants: [actor.id, recipient.id], message: `${actor.name} shared ${amount} charge with ${recipient.name}.` }); actor.status = "choosing"; recipient.status = "choosing"; const originalActivity = restoredActivities.get(recipient.id); if (originalActivity) recipient.intendedActivity = originalActivity;
  }
  if (state.sharingRouteContinuationVersion) {
    const pausedIds = new Set(shares.flatMap(share => [share.actorId, share.recipientId]));
    restoreSharingParticipants(state, [...pausedIds].map(id => pauseSnapshots.get(id)!).filter(Boolean));
  }
  const arrivalActions = new Set(state.events.filter(event => ["explore", "mark-trace", "shape-pattern", "meet", "wild-cache"].includes(event.kind)).flatMap(event => state.goalLoops && event.kind === "meet" ? event.participants ?? [event.actorId] : [event.actorId]));
  const movedActors = new Set(state.events.filter(event => event.kind === "movement").map(event => event.actorId));
  const drawnActors = new Set(state.ledger.filter(entry => entry.kind === "draw" && entry.actorId).map(entry => entry.actorId));
  for (const settlement of state.settlements) for (const spark of settlement.sparks) {
    const drawn = state.ledger.find((entry) => entry.kind === "draw" && entry.actorId === spark.id)?.amount ?? 0;
    if (drawn > 0) spark.chargeDeficit = Math.max(0, spark.chargeDeficit - drawn);
  }
  if (state.history) for (const movement of state.history.movements.filter(item => item.pulse === state.pulse)) movement.resourceEffects = state.ledger.filter(entry => entry.actorId === movement.sparkId).map(entry => ({ kind: entry.kind, amount: entry.amount, reason: entry.reason }));
  for (const settlement of state.settlements) for (const spark of settlement.sparks) {
    const before = previous.get(spark.id);
    if (!state.activityCompletionVersion && (before?.status === "traveling" || before?.status === "interacting") && spark.status === "choosing" && (before.activity === "explore" || before.activity === "mark-trace" || before.activity === "shape-pattern")) {
      state.ledger.push({ kind: "adjustment", actorId: spark.id, amount: 0, reason: `${before.activity}-arrived` });
      state.events.push({ id: `event-${state.pulse}-${spark.id}-${before.activity}`, kind: before.activity, actorId: spark.id, message: `${spark.name} completed ${before.activity.replaceAll("-", " ")}.` });
      spark.knownEvidenceEventIds.push(`event-${state.pulse}-${spark.id}-${before.activity}`);
    }
    if (movedActors.has(spark.id) || arrivalActions.has(spark.id)) {
      spark.readiness = Math.max(0, spark.readiness - 1);
      state.ledger.push({ kind: "adjustment", actorId: spark.id, amount: 1, reason: movedActors.has(spark.id) ? "movement-strain" : "activity-strain" });
    }
    if (drawnActors.has(spark.id)) continue;
    const expendedCharge = movedActors.has(spark.id) || arrivalActions.has(spark.id) || shares.some((share) => share.actorId === spark.id || share.recipientId === spark.id);
    if (!expendedCharge) continue;
    if (spark.carriedCharge > 0) { spark.carriedCharge -= 1; state.ledger.push({ kind: "consumption", actorId: spark.id, amount: 1, reason: "activity-sustenance" }); }
    else { spark.chargeDeficit += 1; state.ledger.push({ kind: "adjustment", actorId: spark.id, amount: 1, reason: "charge-deficit" }); }
  }
  if (state.activityCompletionVersion && state.history) for (const movement of state.history.movements.filter(item => item.pulse === state.pulse)) movement.resourceEffects = state.ledger.filter(entry => entry.actorId === movement.sparkId).map(entry => ({ kind: entry.kind, amount: entry.amount, reason: entry.reason }));
  recordInitialCachePreparation(state);
  recordPatternPreparation(state);
  recordPostProbeContinuations(state);
  updateRoutePatterns(state, canReachRoutePatternTarget);
  finishRoutePatternUses(state);
  observeFrontier(state);
  finishFirstGlowGoals(state);
  for (const event of state.events) recordFirstGlowWitnesses(state.social, [event.id], event.actorId, event.participants ?? [], state.pulse);
  if (external.resolveSocial !== false) resolveAutonomousSocialChoices(state, external.deterministicSeed ?? 0);
  appendFirstGlowExplanations(state, state.events);
  finalizeFirstGlowIntentions(state);
  if ((state.routePatterns || state.goalLoops) && external.validate !== false) validateFirstGlowState(state);
  return state;
}
