import { advanceFirstGlowState, canFirstGlowReach, type FirstGlowState } from "./structured.js";
import { applyFirstGlowDilemmaChoice, firstGlowActionScore, recordFirstGlowWitnesses, type FirstGlowDilemmaChoice } from "./first-glow-social.js";
import { appendFirstGlowExplanations } from "./first-glow-explanations.js";
import type { FirstGlowActivity } from "@mimir/world-data";

export interface FirstGlowExternalChargeInput { sourceCharge?: number; communalCharge?: number; loss?: number; resolveSocial?: boolean; validate?: boolean; deterministicSeed?: number; }

function hasLearned(spark: FirstGlowState["settlements"][number]["sparks"][number], activity: FirstGlowActivity): boolean {
  return spark.knownEvidenceEventIds.some((eventId) => eventId.endsWith(`-${activity}`));
}

function chooseAutonomousActivities(state: FirstGlowState): void {
  if (state.tick === 0) return;
  for (const settlement of state.settlements) for (const spark of settlement.sparks.slice().sort((a, b) => a.id.localeCompare(b.id))) {
    if ((spark.status !== "choosing" && spark.status !== "waiting") || spark.destinationObjectId) continue;
    const companion = settlement.sparks.find((candidate) => candidate.id !== spark.id && candidate.position.x === spark.position.x && candidate.position.y === spark.position.y && candidate.carriedCharge === 0);
    if (spark.carriedCharge > 0 && companion) { spark.intendedActivity = "share-charge"; continue; }
    const needsCharge = spark.carriedCharge === 0 || spark.chargeDeficit > 0;
    const priorities: FirstGlowActivity[] = [];
    if (needsCharge && settlement.sourceCharge > 0) priorities.push("seek-charge");
    const target = settlement.sparks.slice().sort((a, b) => a.id.localeCompare(b.id)).find(candidate => candidate.id !== spark.id);
    const shelterCarePreferred = target && firstGlowActionScore(state.social, spark.id, target.id, "shelter-or-trace") >= 3 && spark.readiness < 90;
    if (spark.readiness < 70 || shelterCarePreferred) priorities.push("seek-shelter");
    if (!hasLearned(spark, "explore")) priorities.push("explore");
    if (hasLearned(spark, "explore") && !hasLearned(spark, "scavenge-cache")) priorities.push("scavenge-cache");
    if (hasLearned(spark, "explore") && !hasLearned(spark, "mark-trace")) priorities.push("mark-trace");
    if (!hasLearned(spark, "shape-pattern")) priorities.push("shape-pattern");
    priorities.push("seek-shelter", "idle");
    const next = priorities.find((activity) => canFirstGlowReach(settlement, spark, activity));
    if (next) { spark.intendedActivity = next; spark.waitReason = undefined; }
  }
}

function seededChoicePressure(seed: number, tick: number, eventId: string): number {
  let hash = (Math.trunc(seed) >>> 0) ^ Math.imul(tick, 0x45d9f3b);
  for (const character of eventId) hash = Math.imul(hash ^ character.charCodeAt(0), 0x45d9f3b) | 0;
  return ((hash >>> 0) % 3) - 1;
}

function seededTargetId(seed: number, tick: number, eventId: string, candidates: string[]): string | undefined {
  if (!candidates.length) return undefined;
  let hash = (Math.trunc(seed) >>> 0) ^ Math.imul(tick, 0x27d4eb2d);
  for (const character of eventId) hash = Math.imul(hash ^ character.charCodeAt(0), 0x165667b1) | 0;
  return candidates[(hash >>> 0) % candidates.length];
}

function resolveAutonomousSocialChoices(state: FirstGlowState, deterministicSeed = 0): void {
  const sparks = state.settlements.flatMap(settlement => settlement.sparks).slice().sort((a, b) => a.id.localeCompare(b.id));
  for (const event of state.events.slice().sort((a, b) => a.id.localeCompare(b.id))) {
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
    const target = seededTargetId(deterministicSeed, state.tick, event.id, targetCandidates);
    if (!actor || !target) continue;
    const choices: Record<FirstGlowDilemmaChoice["dilemmaId"], [string, string]> = {
      "weakening-pool-report": ["reveal-pool", "withhold-pool"],
      "shelter-or-trace": ["help-shelter", "continue-exploration"],
      "public-or-private-mark": ["make-mark-public", "keep-mark-private"],
      "wild-cache-risk": ["enter-wild-cache", "stay-on-trace"]
    };
    const [first, second] = choices[dilemmaId];
    const score = firstGlowActionScore(state.social, actor.id, target, dilemmaId);
    const alternativeId = score + seededChoicePressure(deterministicSeed, state.tick, event.id) >= 0 ? first : second;
    state.social = applyFirstGlowDilemmaChoice(state.social, { dilemmaId, alternativeId, actorSparkId: actor.id, targetSparkId: target, evidenceEventIds: [event.id], tick: state.tick });
  }
}

export function advanceFirstGlow(input: FirstGlowState, external: FirstGlowExternalChargeInput = {}): FirstGlowState {
  // Bundles are immutable, content-addressed authored data. Preserve their identity while
  // cloning mutable runtime state so long evidence reviews do not copy the full map per tick.
  const working: FirstGlowState = {
    ...input,
    settlements: input.settlements.map(({ bundle, ...settlement }) => ({ ...structuredClone(settlement), bundle })),
    ledger: structuredClone(input.ledger),
    events: structuredClone(input.events),
    social: structuredClone(input.social),
    explanations: structuredClone(input.explanations)
  };
  chooseAutonomousActivities(working);
  const previous = new Map(working.settlements.flatMap(settlement => settlement.sparks.map(spark => [spark.id, { status: spark.status, activity: spark.intendedActivity }] as const)));
  const shares: { actorId: string; recipientId: string }[] = [];
  const claimedRecipients = new Set<string>();
  const restoredActivities = new Map<string, FirstGlowState["settlements"][number]["sparks"][number]["intendedActivity"]>();
  for (const settlement of working.settlements) for (const spark of settlement.sparks.slice().sort((a, b) => a.id.localeCompare(b.id))) {
    if (spark.status !== "choosing" || spark.intendedActivity !== "share-charge") continue;
    const recipient = settlement.sparks.slice().sort((a, b) => a.id.localeCompare(b.id)).find(candidate => candidate.id !== spark.id && !claimedRecipients.has(candidate.id) && candidate.position.x === spark.position.x && candidate.position.y === spark.position.y);
    if (recipient) { shares.push({ actorId: spark.id, recipientId: recipient.id }); claimedRecipients.add(recipient.id); spark.status = "waiting"; recipient.status = "waiting"; restoredActivities.set(recipient.id, recipient.intendedActivity); recipient.intendedActivity = "share-charge"; }
  }
  const state = advanceFirstGlowState(working, external.validate !== false);
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
    const amount = Math.min(1, actor.carriedCharge); actor.carriedCharge -= amount; recipient.carriedCharge += amount; state.ledger.push({ kind: "share", actorId: actor.id, recipientId: recipient.id, amount, reason: amount ? "co-present-spark" : "no-carried-charge" }); state.events.push({ id: `event-${state.tick}-${actor.id}-share`, kind: "share", actorId: actor.id, participants: [actor.id, recipient.id], message: `${actor.name} shared ${amount} charge with ${recipient.name}.` }); actor.status = "choosing"; recipient.status = "choosing"; const originalActivity = restoredActivities.get(recipient.id); if (originalActivity) recipient.intendedActivity = originalActivity;
  }
  const arrivalActions = new Set(state.events.filter(event => ["explore", "mark-trace", "shape-pattern", "meet", "wild-cache"].includes(event.kind)).map(event => event.actorId));
  const movedActors = new Set(state.events.filter(event => event.kind === "movement").map(event => event.actorId));
  const drawnActors = new Set(state.ledger.filter(entry => entry.kind === "draw" && entry.actorId).map(entry => entry.actorId));
  for (const settlement of state.settlements) for (const spark of settlement.sparks) {
    const drawn = state.ledger.find((entry) => entry.kind === "draw" && entry.actorId === spark.id)?.amount ?? 0;
    if (drawn > 0) spark.chargeDeficit = Math.max(0, spark.chargeDeficit - drawn);
  }
  for (const settlement of state.settlements) for (const spark of settlement.sparks) {
    const before = previous.get(spark.id);
    if ((before?.status === "traveling" || before?.status === "interacting") && spark.status === "choosing" && (before.activity === "explore" || before.activity === "mark-trace" || before.activity === "shape-pattern")) {
      state.ledger.push({ kind: "adjustment", actorId: spark.id, amount: 0, reason: `${before.activity}-arrived` });
      state.events.push({ id: `event-${state.tick}-${spark.id}-${before.activity}`, kind: before.activity, actorId: spark.id, message: `${spark.name} completed ${before.activity.replaceAll("-", " ")}.` });
      spark.knownEvidenceEventIds.push(`event-${state.tick}-${spark.id}-${before.activity}`);
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
  for (const event of state.events) recordFirstGlowWitnesses(state.social, [event.id], event.actorId, event.participants ?? [], state.tick);
  if (external.resolveSocial !== false) resolveAutonomousSocialChoices(state, external.deterministicSeed ?? 0);
  appendFirstGlowExplanations(state, state.events);
  return state;
}
