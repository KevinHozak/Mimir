import { FIRST_GLOW_DESIGN, type FirstGlowValueTendency } from "./design.js";
import type { FirstGlowState, StructuredEvent } from "./structured.js";

export interface FirstGlowExplanationScore {
  need: number;
  values: number;
  localKnowledge: number;
  trust: number;
  commitments: number;
  cost: number;
  risk: number;
  total: number;
}

export interface FirstGlowExplanationEvidence {
  id: string;
  pulse: number;
  message: string;
}

export interface FirstGlowExplanation {
  id: string;
  pulse: number;
  dilemmaId: string;
  actorSparkId: string;
  actorName: string;
  targetSparkId?: string;
  targetSparkName?: string;
  alternativeId: string;
  alternativeLabel: string;
  summary: string;
  score: FirstGlowExplanationScore;
  evidenceEventIds: string[];
  objectiveEvents: FirstGlowExplanationEvidence[];
  knownFacts: FirstGlowExplanationEvidence[];
  uncertainInferences: string[];
  consequenceEvents: FirstGlowExplanationEvidence[];
}

const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const sortedUnique = (values: string[]) => [...new Set(values)].sort(compare);
const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const cardFor = (sparkId: string) => {
  const numericId = Number(sparkId.replace(/^spark-/, ""));
  return FIRST_GLOW_DESIGN.cards[(Number.isInteger(numericId) && numericId > 0 ? numericId - 1 : 0) % FIRST_GLOW_DESIGN.cards.length];
};

function targetFor(state: FirstGlowState, actorSparkId: string, event: StructuredEvent): string | undefined {
  const participant = event.participants?.slice().sort(compare).find(id => id !== actorSparkId);
  if (participant) return participant;
  return state.settlements.flatMap(settlement => settlement.sparks).map(spark => spark.id).sort(compare).find(id => id !== actorSparkId);
}

function trustFor(state: FirstGlowState, actorSparkId: string, targetSparkId: string | undefined): number {
  if (!targetSparkId) return 0;
  return state.social.trust.find(record => record.sourceSparkId === actorSparkId && record.targetSparkId === targetSparkId)?.value ?? 0;
}

function tendencyScore(tendencies: FirstGlowValueTendency[], alternativeId: string): number {
  const positive: FirstGlowValueTendency[] = alternativeId === "reveal-pool" || alternativeId === "help-shelter" || alternativeId === "make-mark-public" ? ["care", "reciprocity", "patience"] : ["caution", "curiosity", "independence"];
  return positive.reduce((score, tendency) => score + (tendencies.includes(tendency) ? 2 : 0), 0);
}

function scoreAlternative(state: FirstGlowState, event: StructuredEvent, dilemmaId: string, alternativeId: string, actorSparkId: string, targetSparkId: string | undefined): FirstGlowExplanationScore {
  const spark = state.settlements.flatMap(settlement => settlement.sparks).find(candidate => candidate.id === actorSparkId);
  const knowledge = state.social.knowledge.find(item => item.sparkId === actorSparkId);
  const targetTrust = trustFor(state, actorSparkId, targetSparkId);
  const matchingCommitment = state.social.commitments.slice().sort((a, b) => b.resolvedPulse - a.resolvedPulse || compare(a.id, b.id)).find(commitment => commitment.promisorSparkId === actorSparkId && commitment.beneficiarySparkId === targetSparkId && commitment.dilemmaId === dilemmaId);
  const need = clamp((spark?.chargeDeficit ?? 0) * 2 + Math.max(0, 70 - (spark?.readiness ?? 100)) / 10, 0, 10);
  const values = tendencyScore(cardFor(actorSparkId).valueTendencies, alternativeId);
  const localKnowledge = clamp((knowledge?.witnessedFacts.length ?? 0) + (knowledge?.communicatedClaims.length ?? 0) - (knowledge?.uncertainInferences.length ?? 0), -3, 6);
  const trust = targetTrust;
  const commitments = matchingCommitment?.status === "fulfilled" ? 3 : matchingCommitment?.status === "broken" ? -3 : 0;
  const costMagnitude = Math.min(6, Math.max(0, (event.cells?.length ?? 1) - 1));
  const cost = costMagnitude === 0 ? 0 : -costMagnitude;
  const risk = alternativeId === "continue-exploration" || alternativeId === "keep-mark-private" ? -Math.min(6, Math.round((spark?.chargeDeficit ?? 0) + Math.max(0, 50 - (spark?.readiness ?? 100)) / 10)) : 0;
  const total = need + values + localKnowledge + trust + commitments + cost + risk;
  return { need, values, localKnowledge, trust, commitments, cost, risk, total };
}

function explanationForEvent(state: FirstGlowState, event: StructuredEvent): FirstGlowExplanation | null {
  const mapping = event.kind === "draw" ? { dilemmaId: "weakening-pool-report", alternatives: ["reveal-pool", "withhold-pool"] } : event.kind === "idle" || event.kind === "wait" ? { dilemmaId: "shelter-or-trace", alternatives: ["help-shelter", "continue-exploration"] } : ["explore", "mark-trace", "shape-pattern", "meet"].includes(event.kind) ? { dilemmaId: "public-or-private-mark", alternatives: ["make-mark-public", "keep-mark-private"] } : event.kind === "wild-cache" ? { dilemmaId: "wild-cache-risk", alternatives: ["enter-wild-cache", "stay-on-trace"] } : null;
  if (!mapping) return null;
  const actor = state.settlements.flatMap(settlement => settlement.sparks).find(spark => spark.id === event.actorId);
  if (!actor) return null;
  const targetSparkId = targetFor(state, actor.id, event);
  const scores = mapping.alternatives.map(alternativeId => ({ alternativeId, score: scoreAlternative(state, event, mapping.dilemmaId, alternativeId, actor.id, targetSparkId) }));
  scores.sort((a, b) => b.score.total - a.score.total || compare(a.alternativeId, b.alternativeId));
  const selected = scores[0];
  const dilemma = FIRST_GLOW_DESIGN.dilemmas.find(candidate => candidate.id === mapping.dilemmaId)!;
  const alternative = dilemma.alternatives.find(candidate => candidate.id === selected.alternativeId)!;
  const knowledge = state.social.knowledge.find(item => item.sparkId === actor.id);
  const evidence = { id: event.id, pulse: state.pulse, message: event.message };
  const knownFacts = (knowledge?.witnessedFacts ?? []).filter(fact => fact.eventId === event.id).map(fact => evidence);
  const uncertainInferences = (knowledge?.uncertainInferences ?? []).map(inference => inference.inference).sort(compare);
  const score = selected.score;
  const targetSparkName = state.settlements.flatMap(settlement => settlement.sparks).find(spark => spark.id === targetSparkId)?.name;
  return { id: `explanation-${state.pulse}-${event.id}`, pulse: state.pulse, dilemmaId: mapping.dilemmaId, actorSparkId: actor.id, actorName: actor.name, targetSparkId, targetSparkName, alternativeId: selected.alternativeId, alternativeLabel: alternative.label, summary: `${actor.name} selected this path because its deterministic score favored ${alternative.label.toLowerCase()}.`, score, evidenceEventIds: [event.id], objectiveEvents: [evidence], knownFacts, uncertainInferences, consequenceEvents: [evidence] };
}

export function appendFirstGlowExplanations(state: FirstGlowState, events: StructuredEvent[]): void {
  state.explanations ??= [];
  const existing = new Set(state.explanations.map(explanation => explanation.id));
  for (const event of events.slice().sort((a, b) => compare(a.id, b.id))) {
    const explanation = explanationForEvent(state, event);
    if (explanation && !existing.has(explanation.id)) state.explanations.push(explanation);
  }
  state.explanations.sort((a, b) => a.pulse - b.pulse || compare(a.id, b.id));
}
