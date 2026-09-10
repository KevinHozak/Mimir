export const FIRST_GLOW_SOCIAL_SCHEMA_VERSION = 1 as const;
export const FIRST_GLOW_TRUST_MIN = -3;
export const FIRST_GLOW_TRUST_MAX = 3;
export const FIRST_GLOW_CREDIBLE_TRUST_THRESHOLD = 0;

export type FirstGlowCommitmentStatus = "fulfilled" | "broken";
export type FirstGlowInferenceConfidence = "tentative" | "likely";

export interface FirstGlowWitnessedFact {
  eventId: string;
  witnessedTick: number;
}

export interface FirstGlowCommunicatedClaim {
  id: string;
  eventId: string;
  sourceSparkId: string;
  recipientSparkId: string;
  claim: string;
  evidenceEventIds: string[];
  communicatedTick: number;
}

export interface FirstGlowUncertainInference {
  id: string;
  aboutEventId: string;
  inference: string;
  confidence: FirstGlowInferenceConfidence;
  evidenceEventIds: string[];
}

export interface FirstGlowSparkKnowledge {
  sparkId: string;
  witnessedFacts: FirstGlowWitnessedFact[];
  communicatedClaims: FirstGlowCommunicatedClaim[];
  uncertainInferences: FirstGlowUncertainInference[];
}

export interface FirstGlowTrustRecord {
  sourceSparkId: string;
  targetSparkId: string;
  value: number;
  evidenceEventIds: string[];
  lastUpdatedTick: number;
}

export interface FirstGlowCommitmentRecord {
  id: string;
  promisorSparkId: string;
  beneficiarySparkId: string;
  dilemmaId: string;
  alternativeId: string;
  status: FirstGlowCommitmentStatus;
  evidenceEventIds: string[];
  createdTick: number;
  resolvedTick: number;
}

export interface FirstGlowSocialState {
  schemaVersion: typeof FIRST_GLOW_SOCIAL_SCHEMA_VERSION;
  knowledge: FirstGlowSparkKnowledge[];
  trust: FirstGlowTrustRecord[];
  commitments: FirstGlowCommitmentRecord[];
}

export interface FirstGlowDilemmaChoice {
  dilemmaId: "weakening-pool-report" | "shelter-or-trace" | "public-or-private-mark" | "wild-cache-risk";
  alternativeId: string;
  actorSparkId: string;
  targetSparkId: string;
  evidenceEventIds: string[];
  tick: number;
}

const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const sortedUnique = (ids: string[]) => [...new Set(ids)].sort(compare);
const isSortedUnique = (ids: string[]) => ids.every((id, index) => index === 0 || compare(ids[index - 1], id) < 0);
const clampTrust = (value: number) => Math.max(FIRST_GLOW_TRUST_MIN, Math.min(FIRST_GLOW_TRUST_MAX, value));
const dilemmaAlternatives: Record<FirstGlowDilemmaChoice["dilemmaId"], readonly string[]> = {
  "weakening-pool-report": ["reveal-pool", "withhold-pool"],
  "shelter-or-trace": ["help-shelter", "continue-exploration"],
  "public-or-private-mark": ["make-mark-public", "keep-mark-private"],
  "wild-cache-risk": ["enter-wild-cache", "stay-on-trace"]
};

function knowledgeFor(state: FirstGlowSocialState, sparkId: string): FirstGlowSparkKnowledge {
  const knowledge = state.knowledge.find(item => item.sparkId === sparkId);
  if (!knowledge) throw new Error(`unknown Spark knowledge ${sparkId}`);
  return knowledge;
}

function trustFor(state: FirstGlowSocialState, sourceSparkId: string, targetSparkId: string): FirstGlowTrustRecord {
  const trust = state.trust.find(item => item.sourceSparkId === sourceSparkId && item.targetSparkId === targetSparkId);
  if (!trust) throw new Error(`missing trust relationship ${sourceSparkId}->${targetSparkId}`);
  return trust;
}

function hasWitnessed(knowledge: FirstGlowSparkKnowledge, eventId: string): boolean {
  return knowledge.witnessedFacts.some(fact => fact.eventId === eventId);
}

export function createFirstGlowSocialState(sparkIds: string[]): FirstGlowSocialState {
  const ids = sortedUnique(sparkIds);
  const knowledge = ids.map(sparkId => ({ sparkId, witnessedFacts: [], communicatedClaims: [], uncertainInferences: [] }));
  const trust = ids.flatMap(sourceSparkId => ids.filter(targetSparkId => targetSparkId !== sourceSparkId).map(targetSparkId => ({ sourceSparkId, targetSparkId, value: 0, evidenceEventIds: [], lastUpdatedTick: 0 })));
  trust.sort((a, b) => compare(a.sourceSparkId, b.sourceSparkId) || compare(a.targetSparkId, b.targetSparkId));
  return { schemaVersion: FIRST_GLOW_SOCIAL_SCHEMA_VERSION, knowledge, trust, commitments: [] };
}

export function validateFirstGlowSocialState(state: FirstGlowSocialState, sparkIds: string[]): void {
  if (state.schemaVersion !== FIRST_GLOW_SOCIAL_SCHEMA_VERSION) throw new Error("unsupported First Glow social state version");
  const ids = sortedUnique(sparkIds);
  const idSet = new Set(ids);
  if (state.knowledge.length !== ids.length || state.knowledge.some(item => !idSet.has(item.sparkId)) || new Set(state.knowledge.map(item => item.sparkId)).size !== ids.length) throw new Error("incomplete First Glow Spark knowledge state");
  for (const item of state.knowledge) {
    if (item.witnessedFacts.some(fact => !fact.eventId || !Number.isInteger(fact.witnessedTick) || fact.witnessedTick < 0) || item.witnessedFacts.some((fact, index) => index > 0 && (item.witnessedFacts[index - 1].witnessedTick > fact.witnessedTick || item.witnessedFacts[index - 1].witnessedTick === fact.witnessedTick && compare(item.witnessedFacts[index - 1].eventId, fact.eventId) >= 0))) throw new Error(`invalid witnessed fact for ${item.sparkId}`);
    if (item.communicatedClaims.some(claim => !claim.id || !claim.eventId || !idSet.has(claim.sourceSparkId) || !idSet.has(claim.recipientSparkId) || claim.recipientSparkId !== item.sparkId || claim.sourceSparkId === claim.recipientSparkId || !Number.isInteger(claim.communicatedTick) || claim.communicatedTick < 0 || claim.evidenceEventIds.length === 0 || !isSortedUnique(claim.evidenceEventIds)) || item.communicatedClaims.some((claim, index) => index > 0 && (item.communicatedClaims[index - 1].communicatedTick > claim.communicatedTick || item.communicatedClaims[index - 1].communicatedTick === claim.communicatedTick && compare(item.communicatedClaims[index - 1].id, claim.id) >= 0))) throw new Error(`invalid communicated claim for ${item.sparkId}`);
    if (item.uncertainInferences.some(inference => !inference.id || !inference.aboutEventId || !inference.inference || inference.evidenceEventIds.length === 0 || !isSortedUnique(inference.evidenceEventIds)) || item.uncertainInferences.some((inference, index) => index > 0 && compare(item.uncertainInferences[index - 1].id, inference.id) >= 0)) throw new Error(`invalid uncertain inference for ${item.sparkId}`);
  }
  const trustKeys = new Set<string>();
  for (const record of state.trust) {
    const key = `${record.sourceSparkId}->${record.targetSparkId}`;
    if (!idSet.has(record.sourceSparkId) || !idSet.has(record.targetSparkId) || record.sourceSparkId === record.targetSparkId || trustKeys.has(key) || !Number.isInteger(record.value) || record.value < FIRST_GLOW_TRUST_MIN || record.value > FIRST_GLOW_TRUST_MAX || !Number.isInteger(record.lastUpdatedTick) || record.lastUpdatedTick < 0) throw new Error(`invalid First Glow trust record ${key}`);
    trustKeys.add(key);
  }
  if (state.trust.length !== ids.length * Math.max(0, ids.length - 1)) throw new Error("incomplete First Glow trust state");
  const commitmentIds = new Set<string>();
  for (const record of state.commitments) {
    if (!record.id || !idSet.has(record.promisorSparkId) || !idSet.has(record.beneficiarySparkId) || record.promisorSparkId === record.beneficiarySparkId || !record.dilemmaId || !record.alternativeId || !Number.isInteger(record.createdTick) || record.createdTick < 0 || !Number.isInteger(record.resolvedTick) || record.resolvedTick < record.createdTick) throw new Error(`invalid First Glow commitment ${record.id}`);
    if (commitmentIds.has(record.id)) throw new Error(`duplicate First Glow commitment ${record.id}`);
    commitmentIds.add(record.id);
  }
}

export function recordFirstGlowWitnesses(state: FirstGlowSocialState, eventIds: string[], actorSparkId: string, participantSparkIds: string[] = [], tick: number): void {
  const witnesses = sortedUnique([actorSparkId, ...participantSparkIds]);
  for (const sparkId of witnesses) {
    const knowledge = knowledgeFor(state, sparkId);
    for (const eventId of sortedUnique(eventIds)) if (!hasWitnessed(knowledge, eventId)) knowledge.witnessedFacts.push({ eventId, witnessedTick: tick });
    knowledge.witnessedFacts.sort((a, b) => a.witnessedTick - b.witnessedTick || compare(a.eventId, b.eventId));
  }
}

export function canFirstGlowActOnEvent(state: FirstGlowSocialState, sparkId: string, eventId: string): boolean {
  const knowledge = knowledgeFor(state, sparkId);
  if (hasWitnessed(knowledge, eventId)) return true;
  return knowledge.communicatedClaims.some(claim => claim.eventId === eventId && claim.evidenceEventIds.includes(eventId) && trustFor(state, claim.sourceSparkId, sparkId).value >= FIRST_GLOW_CREDIBLE_TRUST_THRESHOLD);
}

function updateTrust(state: FirstGlowSocialState, sourceSparkId: string, targetSparkId: string, delta: number, evidenceEventIds: string[], tick: number): void {
  const record = trustFor(state, sourceSparkId, targetSparkId);
  record.value = clampTrust(record.value + delta);
  record.evidenceEventIds = sortedUnique([...record.evidenceEventIds, ...evidenceEventIds]);
  record.lastUpdatedTick = tick;
}

function addClaim(state: FirstGlowSocialState, choice: FirstGlowDilemmaChoice, claim: string): void {
  const source = knowledgeFor(state, choice.actorSparkId);
  const recipient = knowledgeFor(state, choice.targetSparkId);
  const eventId = choice.evidenceEventIds.slice().sort(compare)[0];
  const id = `claim-${choice.dilemmaId}-${choice.actorSparkId}-${choice.targetSparkId}-${choice.tick}`;
  if (!source.witnessedFacts.some(fact => fact.eventId === eventId)) throw new Error("Spark cannot communicate hidden knowledge");
  if (!recipient.communicatedClaims.some(item => item.id === id)) recipient.communicatedClaims.push({ id, eventId, sourceSparkId: choice.actorSparkId, recipientSparkId: choice.targetSparkId, claim, evidenceEventIds: sortedUnique(choice.evidenceEventIds), communicatedTick: choice.tick });
  recipient.communicatedClaims.sort((a, b) => a.communicatedTick - b.communicatedTick || compare(a.id, b.id));
}

function addInference(state: FirstGlowSocialState, choice: FirstGlowDilemmaChoice, inference: string): void {
  const knowledge = knowledgeFor(state, choice.actorSparkId);
  const id = `inference-${choice.dilemmaId}-${choice.actorSparkId}-${choice.tick}`;
  if (!knowledge.uncertainInferences.some(item => item.id === id)) knowledge.uncertainInferences.push({ id, aboutEventId: choice.evidenceEventIds.slice().sort(compare)[0], inference, confidence: "tentative", evidenceEventIds: sortedUnique(choice.evidenceEventIds) });
  knowledge.uncertainInferences.sort((a, b) => compare(a.id, b.id));
}

export function applyFirstGlowDilemmaChoice(input: FirstGlowSocialState, choice: FirstGlowDilemmaChoice): FirstGlowSocialState {
  const state = structuredClone(input);
  knowledgeFor(state, choice.targetSparkId);
  if (!Number.isInteger(choice.tick) || choice.tick < 0 || choice.evidenceEventIds.length === 0 || !choice.evidenceEventIds.every(eventId => canFirstGlowActOnEvent(state, choice.actorSparkId, eventId))) throw new Error("Spark cannot act on an event it has not witnessed or credibly learned");
  if (!dilemmaAlternatives[choice.dilemmaId].includes(choice.alternativeId)) throw new Error(`unsupported First Glow dilemma alternative ${choice.alternativeId}`);
  const positive = ["reveal-pool", "help-shelter", "make-mark-public", "stay-on-trace"].includes(choice.alternativeId);
  const commitmentId = `commitment-${choice.dilemmaId}-${choice.actorSparkId}-${choice.targetSparkId}-${choice.tick}`;
  state.commitments.push({ id: commitmentId, promisorSparkId: choice.actorSparkId, beneficiarySparkId: choice.targetSparkId, dilemmaId: choice.dilemmaId, alternativeId: choice.alternativeId, status: positive ? "fulfilled" : "broken", evidenceEventIds: sortedUnique(choice.evidenceEventIds), createdTick: choice.tick, resolvedTick: choice.tick });
  state.commitments.sort((a, b) => a.resolvedTick - b.resolvedTick || compare(a.id, b.id));
  updateTrust(state, choice.actorSparkId, choice.targetSparkId, positive ? 1 : -1, choice.evidenceEventIds, choice.tick);
  if (choice.alternativeId === "reveal-pool") addClaim(state, choice, "The nearby charge pool is weakening.");
  else if (choice.alternativeId === "help-shelter") addClaim(state, choice, "I helped you reach a shelter niche.");
  else if (choice.alternativeId === "make-mark-public") addClaim(state, choice, "This light mark records a visible trace junction.");
  else if (choice.alternativeId === "withhold-pool") addInference(state, choice, "The pool may yield less charge than before.");
  else if (choice.alternativeId === "continue-exploration") addInference(state, choice, "The tired Spark may need shelter before following this route.");
  else if (choice.alternativeId === "enter-wild-cache") addInference(state, choice, "The Wild Cache may reveal a useful signal, but the return route is less familiar.");
  else addInference(state, choice, "The trace junction may be useful, but its farther branch remains unknown.");
  return state;
}

export function firstGlowActionScore(state: FirstGlowSocialState, actorSparkId: string, targetSparkId: string, dilemmaId: string): number {
  const trust = trustFor(state, actorSparkId, targetSparkId).value;
  const knowledge = knowledgeFor(state, actorSparkId);
  const commitment = state.commitments.slice().sort((a, b) => b.resolvedTick - a.resolvedTick || compare(a.id, b.id)).find(item => item.promisorSparkId === actorSparkId && item.beneficiarySparkId === targetSparkId && item.dilemmaId === dilemmaId);
  return trust + Math.min(2, knowledge.witnessedFacts.length + knowledge.communicatedClaims.length) - Math.min(2, knowledge.uncertainInferences.length) + (commitment?.status === "fulfilled" ? 2 : commitment?.status === "broken" ? -2 : 0);
}
