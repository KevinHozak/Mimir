import type { Cell, FirstGlowActivity } from "@mimir/world-data";
import { queryCell } from "@mimir/world-data";
import { CROSSING_VOICES_RULE } from "./resonance-crossing-rule.js";
import type { CrossingVoicesDecisionRecord, ResonanceAnchorRecord } from "./resonance-anchor.js";
import type { FirstGlowState, StructuredEvent } from "./structured.js";

export type CrossingVoicesChoice = "follow-signal" | "hold-course";
export type CrossingVoicesChoiceResult =
  | { ok: true; state: FirstGlowState; decision: CrossingVoicesDecisionRecord; event: StructuredEvent }
  | { ok: false; code: "anchor-not-active" | "unknown-spark" | "not-at-crossing" | "invalid-evidence" };

const sameCell = (left: Cell, right: Cell) => left.x === right.x && left.y === right.y;

function crossingCell(state: FirstGlowState, anchor: ResonanceAnchorRecord): Cell | null {
  const settlement = state.settlements.find(item => item.bundle.objects.some(object => object.id === anchor.authoredObjectId));
  const object = settlement?.bundle.objects.find(item => item.id === anchor.authoredObjectId);
  return object ? { ...object.origin } : null;
}

export function applyCrossingVoicesChoice(input: FirstGlowState, anchor: ResonanceAnchorRecord | undefined, actorSparkId: string, choice: CrossingVoicesChoice, evidenceEventIds: string[]): CrossingVoicesChoiceResult {
  if (!anchor || anchor.anchorKind !== CROSSING_VOICES_RULE.anchorKind || anchor.state !== "active" || anchor.accessRuleId !== CROSSING_VOICES_RULE.accessRuleId) return { ok: false, code: "anchor-not-active" };
  if (!evidenceEventIds.length || new Set(evidenceEventIds).size !== evidenceEventIds.length) return { ok: false, code: "invalid-evidence" };
  const settlement = input.settlements.find(item => item.sparks.some(spark => spark.id === actorSparkId));
  const actor = settlement?.sparks.find(spark => spark.id === actorSparkId);
  const target = crossingCell(input, anchor);
  if (!actor || !settlement) return { ok: false, code: "unknown-spark" };
  if (!target || !sameCell(actor.position, target) || !queryCell(settlement.bundle, settlement.runtime, target).walkable || !["choosing", "waiting", "idle", "interacting"].includes(actor.status)) return { ok: false, code: "not-at-crossing" };
  if (!evidenceEventIds.every(id => actor.knownEvidenceEventIds.includes(id))) return { ok: false, code: "invalid-evidence" };
  const state: FirstGlowState = { ...input, settlements: input.settlements.map(({ bundle, ...rest }) => ({ ...structuredClone(rest), bundle })), ledger: structuredClone(input.ledger), events: structuredClone(input.events), social: structuredClone(input.social), explanations: structuredClone(input.explanations) };
  const nextActor = state.settlements.flatMap(item => item.sparks).find(spark => spark.id === actorSparkId)!;
  const chargeCost = 1;
  const hasCharge = nextActor.carriedCharge >= chargeCost;
  nextActor.carriedCharge = hasCharge ? nextActor.carriedCharge - chargeCost : nextActor.carriedCharge;
  nextActor.chargeDeficit += hasCharge ? 0 : chargeCost;
  const readinessDelta = choice === "follow-signal" ? -2 : 2;
  nextActor.readiness = Math.max(0, Math.min(100, nextActor.readiness + readinessDelta));
  const intendedActivity: FirstGlowActivity = choice === "follow-signal" ? "explore" : "seek-charge";
  nextActor.intendedActivity = intendedActivity;
  const outcome = choice === "follow-signal" ? "new-signal-followed" : "known-course-held";
  const durableConsequence = choice === "follow-signal" ? `${nextActor.name} follows the newer crossing signal, spending charge and readiness to test an uncertain route.` : `${nextActor.name} holds the known course, preserving the crossing's earlier evidence while leaving the newer signal unresolved.`;
  const decision: CrossingVoicesDecisionRecord = { id: `crossing-decision-${state.pulse}-${actorSparkId}`, anchorId: anchor.id, pulse: state.pulse, actorSparkId, choice, accessRuleId: anchor.accessRuleId, chargeCost, readinessDelta, intendedActivity, outcome, durableConsequence, evidenceEventIds: [...evidenceEventIds].sort() };
  state.ledger.push({ kind: "adjustment", actorId: actorSparkId, amount: chargeCost, reason: `crossing-voices-${choice}` });
  const event: StructuredEvent = { id: `event-${state.pulse}-${decision.id}`, pulse: state.pulse, kind: "crossing-voices-choice", actorId: actorSparkId, message: durableConsequence, evidenceEventIds: decision.evidenceEventIds, source: "rules" };
  state.events.push(event);
  return { ok: true, state, decision, event };
}
