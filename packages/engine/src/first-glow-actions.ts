import { advanceFirstGlowState, type FirstGlowState } from "./structured.js";

export function advanceFirstGlow(input: FirstGlowState): FirstGlowState {
  const working = structuredClone(input);
  const shares: { actorId: string; recipientId: string }[] = [];
  const restoredActivities = new Map<string, FirstGlowState["settlements"][number]["sparks"][number]["intendedActivity"]>();
  for (const settlement of working.settlements) for (const spark of settlement.sparks) {
    if (spark.status !== "choosing" || spark.intendedActivity !== "share-charge") continue;
    const recipient = settlement.sparks.find(candidate => candidate.id !== spark.id && candidate.position.x === spark.position.x && candidate.position.y === spark.position.y);
    if (recipient) { shares.push({ actorId: spark.id, recipientId: recipient.id }); spark.status = "waiting"; recipient.status = "waiting"; restoredActivities.set(recipient.id, recipient.intendedActivity); recipient.intendedActivity = "share-charge"; }
  }
  const state = advanceFirstGlowState(working);
  for (const share of shares) for (const settlement of state.settlements) {
    const actor = settlement.sparks.find(spark => spark.id === share.actorId); const recipient = settlement.sparks.find(spark => spark.id === share.recipientId);
    if (!actor || !recipient || actor.position.x !== recipient.position.x || actor.position.y !== recipient.position.y) continue;
    const amount = Math.min(1, actor.carriedCharge); actor.carriedCharge -= amount; recipient.carriedCharge += amount; state.ledger.push({ kind: "share", actorId: actor.id, amount, reason: amount ? "co-present-spark" : "no-carried-charge" }); state.events.push({ id: `event-${state.tick}-${actor.id}-share`, kind: "share", actorId: actor.id, message: `${actor.name} shared ${amount} charge with ${recipient.name}.` }); actor.status = "choosing"; recipient.status = "choosing"; const originalActivity = restoredActivities.get(recipient.id); if (originalActivity) recipient.intendedActivity = originalActivity;
  }
  const drawnActors = new Set(state.ledger.filter(entry => entry.kind === "draw" && entry.actorId).map(entry => entry.actorId));
  for (const settlement of state.settlements) for (const spark of settlement.sparks) {
    if (drawnActors.has(spark.id)) continue;
    if (spark.carriedCharge > 0) { spark.carriedCharge -= 1; state.ledger.push({ kind: "consumption", actorId: spark.id, amount: 1, reason: "activity-sustenance" }); }
    else { spark.chargeDeficit += 1; state.ledger.push({ kind: "adjustment", actorId: spark.id, amount: 1, reason: "charge-deficit" }); }
  }
  return state;
}
