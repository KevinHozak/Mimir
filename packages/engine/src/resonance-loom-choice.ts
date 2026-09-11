import type { Cell } from "@mimir/world-data";
import { SHELTER_LOOM_RULE, type ResonanceAnchorRecord, type ShelterLoomChoice, type ShelterLoomDecisionRecord } from "./resonance-anchor.js";
import type { FirstGlowState, LedgerEntry, StructuredEvent } from "./structured.js";

export type ShelterLoomChoiceResult =
  | { ok: true; state: FirstGlowState; decision: ShelterLoomDecisionRecord; event: StructuredEvent }
  | { ok: false; code: "anchor-not-active" | "unknown-spark" | "different-settlement" | "not-at-loom" | "invalid-evidence" | "choice-already-recorded" };

const sameCell = (left: Cell, right: Cell) => left.x === right.x && left.y === right.y;

function trustRecord(state: FirstGlowState, sourceSparkId: string, targetSparkId: string, delta: number, evidenceEventIds: string[]) {
  const existing = state.social.trust.find(item => item.sourceSparkId === sourceSparkId && item.targetSparkId === targetSparkId);
  if (existing) {
    existing.value = Math.max(-3, Math.min(3, existing.value + delta));
    existing.lastUpdatedTick = state.tick;
    existing.evidenceEventIds = [...new Set([...existing.evidenceEventIds, ...evidenceEventIds])].sort();
  } else {
    state.social.trust.push({ sourceSparkId, targetSparkId, value: Math.max(-3, Math.min(3, delta)), evidenceEventIds: [...evidenceEventIds].sort(), lastUpdatedTick: state.tick });
  }
}

function loomCell(state: FirstGlowState, anchor: ResonanceAnchorRecord): Cell | null {
  const settlement = state.settlements.find(item => item.bundle.objects.some(object => object.id === anchor.authoredObjectId));
  const object = settlement?.bundle.objects.find(item => item.id === anchor.authoredObjectId);
  const definition = object && settlement?.bundle.objectDefinitions[object.definitionId];
  const slot = definition?.slots.find(item => item.id === anchor.authoredSlotId);
  return object && slot ? { x: object.origin.x + slot.offset.x, y: object.origin.y + slot.offset.y } : null;
}

export function applyShelterLoomChoice(input: FirstGlowState, anchor: ResonanceAnchorRecord | undefined, actorSparkId: string, beneficiarySparkId: string, choice: ShelterLoomChoice, evidenceEventIds: string[]): ShelterLoomChoiceResult {
  if (!anchor || anchor.anchorKind !== SHELTER_LOOM_RULE.anchorKind || anchor.state !== "active" || anchor.accessRuleId !== SHELTER_LOOM_RULE.accessRuleId) return { ok: false, code: "anchor-not-active" };
  if (actorSparkId === beneficiarySparkId || !evidenceEventIds.length || new Set(evidenceEventIds).size !== evidenceEventIds.length) return { ok: false, code: "invalid-evidence" };
  const settlement = input.settlements.find(item => item.sparks.some(spark => spark.id === actorSparkId) && item.sparks.some(spark => spark.id === beneficiarySparkId));
  if (!settlement) {
    const actorExists = input.settlements.some(item => item.sparks.some(spark => spark.id === actorSparkId));
    const beneficiaryExists = input.settlements.some(item => item.sparks.some(spark => spark.id === beneficiarySparkId));
    return !actorExists || !beneficiaryExists ? { ok: false, code: "unknown-spark" } : { ok: false, code: "different-settlement" };
  }
  const actor = settlement.sparks.find(spark => spark.id === actorSparkId)!;
  const beneficiary = settlement.sparks.find(spark => spark.id === beneficiarySparkId)!;
  const target = loomCell(input, anchor);
  if (!target || !sameCell(actor.position, target) || !sameCell(beneficiary.position, target) || !["choosing", "waiting", "idle", "interacting"].includes(actor.status) || !["choosing", "waiting", "idle", "interacting"].includes(beneficiary.status)) return { ok: false, code: "not-at-loom" };
  if (!evidenceEventIds.every(id => actor.knownEvidenceEventIds.includes(id))) return { ok: false, code: "invalid-evidence" };

  const state: FirstGlowState = { ...input, settlements: input.settlements.map(({ bundle, ...rest }) => ({ ...structuredClone(rest), bundle })), ledger: structuredClone(input.ledger), events: structuredClone(input.events), social: structuredClone(input.social), explanations: structuredClone(input.explanations) };
  const nextActor = state.settlements.flatMap(item => item.sparks).find(spark => spark.id === actorSparkId)!;
  const nextBeneficiary = state.settlements.flatMap(item => item.sparks).find(spark => spark.id === beneficiarySparkId)!;
  const chargeCost = 1;
  const actorChargeDelta = nextActor.carriedCharge >= chargeCost ? -chargeCost : 0;
  const actorDeficitDelta = actorChargeDelta === 0 ? chargeCost : 0;
  const actorReadinessDelta = choice === "yield-rest" ? -2 : 4;
  const beneficiaryReadinessDelta = choice === "yield-rest" ? 10 : -5;
  nextActor.carriedCharge += actorChargeDelta;
  nextActor.chargeDeficit += actorDeficitDelta;
  nextActor.readiness = Math.max(0, Math.min(100, nextActor.readiness + actorReadinessDelta));
  nextBeneficiary.readiness = Math.max(0, Math.min(100, nextBeneficiary.readiness + beneficiaryReadinessDelta));
  const outcome = choice === "yield-rest" ? "priority-granted" : "priority-refused";
  const durableConsequence = choice === "yield-rest" ? `${nextBeneficiary.name} receives the Loom's rest priority; ${nextActor.name} gives up charge and readiness to make room.` : `${nextActor.name} keeps the Loom's rest priority; ${nextBeneficiary.name} carries a readiness setback and must seek another path.`;
  const decision: ShelterLoomDecisionRecord = { id: `loom-decision-${state.tick}-${actorSparkId}-${beneficiarySparkId}`, anchorId: anchor.id, tick: state.tick, actorSparkId, beneficiarySparkId, choice, accessRuleId: anchor.accessRuleId, chargeCost, actorReadinessDelta, beneficiaryReadinessDelta, actorChargeDelta, actorDeficitDelta, outcome, durableConsequence, evidenceEventIds: [...evidenceEventIds].sort() };
  const ledger: LedgerEntry[] = [{ kind: "adjustment", actorId: actorSparkId, recipientId: beneficiarySparkId, amount: chargeCost, reason: `shelter-loom-${choice}` }];
  const event: StructuredEvent = { id: `event-${state.tick}-${decision.id}`, tick: state.tick, kind: "shelter-loom-choice", actorId: actorSparkId, participants: [actorSparkId, beneficiarySparkId], message: durableConsequence, evidenceEventIds: decision.evidenceEventIds, source: "rules" };
  state.ledger.push(...ledger);
  state.events.push(event);
  trustRecord(state, actorSparkId, beneficiarySparkId, choice === "yield-rest" ? 1 : -1, decision.evidenceEventIds);
  trustRecord(state, beneficiarySparkId, actorSparkId, choice === "yield-rest" ? 1 : -1, decision.evidenceEventIds);
  return { ok: true, state, decision, event };
}
