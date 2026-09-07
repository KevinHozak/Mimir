import { advanceFirstGlowState, canFirstGlowReach, type FirstGlowState } from "./structured.js";
import type { FirstGlowActivity } from "@mimir/world-data";

export interface FirstGlowExternalChargeInput { sourceCharge?: number; communalCharge?: number; loss?: number; }

function hasLearned(spark: FirstGlowState["settlements"][number]["sparks"][number], activity: FirstGlowActivity): boolean {
  return spark.knownEvidenceEventIds.some((eventId) => eventId.endsWith(`-${activity}`));
}

function chooseAutonomousActivities(state: FirstGlowState): void {
  if (state.tick === 0) return;
  for (const settlement of state.settlements) for (const spark of settlement.sparks.slice().sort((a, b) => a.id.localeCompare(b.id))) {
    if (spark.status !== "choosing" || spark.destinationObjectId) continue;
    const companion = settlement.sparks.find((candidate) => candidate.id !== spark.id && candidate.position.x === spark.position.x && candidate.position.y === spark.position.y && candidate.carriedCharge === 0);
    if (spark.carriedCharge > 0 && companion) { spark.intendedActivity = "share-charge"; continue; }
    const needsCharge = spark.carriedCharge === 0 || spark.chargeDeficit > 0;
    const priorities: FirstGlowActivity[] = [];
    if (needsCharge && settlement.sourceCharge > 0) priorities.push("seek-charge");
    if (spark.readiness < 70) priorities.push("seek-shelter");
    if (!hasLearned(spark, "explore")) priorities.push("explore");
    if (hasLearned(spark, "explore") && !hasLearned(spark, "mark-trace")) priorities.push("mark-trace");
    if (!hasLearned(spark, "shape-pattern")) priorities.push("shape-pattern");
    priorities.push("seek-shelter", "idle");
    const next = priorities.find((activity) => canFirstGlowReach(settlement, spark, activity));
    if (next) spark.intendedActivity = next;
  }
}

export function advanceFirstGlow(input: FirstGlowState, external: FirstGlowExternalChargeInput = {}): FirstGlowState {
  const working = structuredClone(input);
  chooseAutonomousActivities(working);
  const previous = new Map(working.settlements.flatMap(settlement => settlement.sparks.map(spark => [spark.id, { status: spark.status, activity: spark.intendedActivity }] as const)));
  const shares: { actorId: string; recipientId: string }[] = [];
  const restoredActivities = new Map<string, FirstGlowState["settlements"][number]["sparks"][number]["intendedActivity"]>();
  for (const settlement of working.settlements) for (const spark of settlement.sparks) {
    if (spark.status !== "choosing" || spark.intendedActivity !== "share-charge") continue;
    const recipient = settlement.sparks.find(candidate => candidate.id !== spark.id && candidate.position.x === spark.position.x && candidate.position.y === spark.position.y);
    if (recipient) { shares.push({ actorId: spark.id, recipientId: recipient.id }); spark.status = "waiting"; recipient.status = "waiting"; restoredActivities.set(recipient.id, recipient.intendedActivity); recipient.intendedActivity = "share-charge"; }
  }
  const state = advanceFirstGlowState(working);
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
    const amount = Math.min(1, actor.carriedCharge); actor.carriedCharge -= amount; recipient.carriedCharge += amount; state.ledger.push({ kind: "share", actorId: actor.id, amount, reason: amount ? "co-present-spark" : "no-carried-charge" }); state.events.push({ id: `event-${state.tick}-${actor.id}-share`, kind: "share", actorId: actor.id, message: `${actor.name} shared ${amount} charge with ${recipient.name}.` }); actor.status = "choosing"; recipient.status = "choosing"; const originalActivity = restoredActivities.get(recipient.id); if (originalActivity) recipient.intendedActivity = originalActivity;
  }
  const arrivalActions = new Set(state.events.filter(event => ["explore", "mark-trace", "shape-pattern", "meet"].includes(event.kind)).map(event => event.actorId));
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
    if (spark.carriedCharge > 0) { spark.carriedCharge -= 1; state.ledger.push({ kind: "consumption", actorId: spark.id, amount: 1, reason: "activity-sustenance" }); }
    else { spark.chargeDeficit += 1; state.ledger.push({ kind: "adjustment", actorId: spark.id, amount: 1, reason: "charge-deficit" }); }
  }
  return state;
}
