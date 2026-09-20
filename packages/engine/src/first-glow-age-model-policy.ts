import { canonicalize, sha256 } from "@mimir/world-data";
import type { FirstGlowState } from "./structured.js";

export const FIRST_GLOW_AGE_MODEL_POLICY_VERSION = "age-model-policy-v1" as const;
export type FirstGlowPolicyStatus = "active" | "diagnostic" | "candidate";
export type FirstGlowPolicyChangeReason = "authorized-evaluation" | "provider-unavailable" | "downgrade" | "rollback";

export interface FirstGlowAgeModelPolicy {
  version: typeof FIRST_GLOW_AGE_MODEL_POLICY_VERSION;
  status: FirstGlowPolicyStatus;
  worldAge: { id: string; ordinal: number };
  model: { provider: string; model: string; version: string };
  callFrequency: { perSparkDailyLimit: number; globalDailyLimit: number };
  memory: { maxMemories: number; maxEvents: number };
  planning: { maxSteps: number };
  expression: { maxSummaryChars: number; maxOutputTokens: number };
  naturalHeroGeneration: "disabled";
}

export interface FirstGlowSparkContinuitySnapshot {
  sparkId: string;
  identityHash: string;
  commitmentsHash: string;
  knowledgeHash: string;
  memoriesHash: string;
  resourcesHash: string;
  intentionsHash: string;
  historyHash: string;
}

export interface FirstGlowAgeModelTransition {
  version: typeof FIRST_GLOW_AGE_MODEL_POLICY_VERSION;
  id: string;
  oldPolicy: FirstGlowAgeModelPolicy;
  newPolicy: FirstGlowAgeModelPolicy;
  effectivePulse: number;
  reason: FirstGlowPolicyChangeReason;
  sparkIds: string[];
  before: FirstGlowSparkContinuitySnapshot[];
  after: FirstGlowSparkContinuitySnapshot[];
}

const stable = (value: unknown) => JSON.stringify(canonicalize(value));
const hash = (value: unknown) => `sha256-${sha256(stable(value))}`;
const positive = (value: number, label: string) => {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${label} must be a positive integer`);
};

export function createFirstGlowAgeModelPolicy(overrides: Partial<FirstGlowAgeModelPolicy> = {}): FirstGlowAgeModelPolicy {
  const base: FirstGlowAgeModelPolicy = {
    version: FIRST_GLOW_AGE_MODEL_POLICY_VERSION, status: "active",
    worldAge: { id: "first-glow", ordinal: 1 },
    model: { provider: "rules", model: "rules-only", version: "deterministic-v1" },
    callFrequency: { perSparkDailyLimit: 4, globalDailyLimit: 16 },
    memory: { maxMemories: 8, maxEvents: 12 }, planning: { maxSteps: 1 },
    expression: { maxSummaryChars: 240, maxOutputTokens: 128 }, naturalHeroGeneration: "disabled"
  };
  return { ...base, ...overrides, worldAge: { ...base.worldAge, ...overrides.worldAge }, model: { ...base.model, ...overrides.model }, callFrequency: { ...base.callFrequency, ...overrides.callFrequency }, memory: { ...base.memory, ...overrides.memory }, planning: { ...base.planning, ...overrides.planning }, expression: { ...base.expression, ...overrides.expression } };
}

export function validateFirstGlowAgeModelPolicy(policy: FirstGlowAgeModelPolicy, options: { allowCandidateAge?: boolean } = {}): void {
  if (policy.version !== FIRST_GLOW_AGE_MODEL_POLICY_VERSION || !["active", "diagnostic", "candidate"].includes(policy.status)) throw new Error("unsupported First Glow age/model policy");
  if (!policy.worldAge.id || !Number.isInteger(policy.worldAge.ordinal) || policy.worldAge.ordinal < 1) throw new Error("invalid world age policy");
  if (!options.allowCandidateAge && policy.worldAge.ordinal !== 1) throw new Error("future age policy is diagnostic only");
  positive(policy.callFrequency.perSparkDailyLimit, "per-Spark call limit"); positive(policy.callFrequency.globalDailyLimit, "global call limit"); positive(policy.memory.maxMemories, "memory limit"); positive(policy.memory.maxEvents, "event limit"); positive(policy.planning.maxSteps, "planning horizon"); positive(policy.expression.maxSummaryChars, "summary limit"); positive(policy.expression.maxOutputTokens, "output limit");
  if (policy.naturalHeroGeneration !== "disabled") throw new Error("natural Hero generation must remain disabled");
}

export function createFirstGlowSparkContinuitySnapshot(state: FirstGlowState, sparkId: string): FirstGlowSparkContinuitySnapshot {
  const spark = state.settlements.flatMap(settlement => settlement.sparks).find(item => item.id === sparkId);
  if (!spark) throw new Error(`unknown Spark ${sparkId}`);
  const knowledge = state.social.knowledge.find(item => item.sparkId === sparkId);
  const commitments = state.social.commitments.filter(item => item.promisorSparkId === sparkId || item.beneficiarySparkId === sparkId);
  const intentions = state.history?.intentions?.filter(item => item.sparkId === sparkId) ?? [];
  const decisions = state.history?.decisions.filter(item => item.sparkId === sparkId) ?? [];
  return { sparkId, identityHash: hash({ id: spark.id, name: spark.name, spawnedPulse: spark.spawnedPulse }), commitmentsHash: hash(commitments), knowledgeHash: hash(knowledge ?? null), memoriesHash: hash({ events: state.events.filter(event => event.actorId === sparkId || event.participants?.includes(sparkId)), witnessed: knowledge?.witnessedFacts ?? [], claims: knowledge?.communicatedClaims ?? [], inferences: knowledge?.uncertainInferences ?? [] }), resourcesHash: hash({ carriedCharge: spark.carriedCharge, chargeDeficit: spark.chargeDeficit, readiness: spark.readiness, status: spark.status }), intentionsHash: hash(intentions), historyHash: hash(decisions) };
}

export function validateFirstGlowSparkContinuity(before: FirstGlowSparkContinuitySnapshot, after: FirstGlowSparkContinuitySnapshot): void {
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error(`Spark continuity changed during policy transition for ${before.sparkId}`);
}

export function createFirstGlowAgeModelTransition(oldPolicy: FirstGlowAgeModelPolicy, newPolicy: FirstGlowAgeModelPolicy, state: FirstGlowState, reason: FirstGlowPolicyChangeReason): FirstGlowAgeModelTransition {
  if (newPolicy.status === "active" && newPolicy.worldAge.ordinal !== 1) throw new Error("automatic live age upgrades are disabled");
  validateFirstGlowAgeModelPolicy(oldPolicy); validateFirstGlowAgeModelPolicy(newPolicy, { allowCandidateAge: newPolicy.status !== "active" });
  const sparkIds = state.settlements.flatMap(settlement => settlement.sparks.map(spark => spark.id)).sort();
  const snapshots = sparkIds.map(sparkId => createFirstGlowSparkContinuitySnapshot(state, sparkId));
  return { version: FIRST_GLOW_AGE_MODEL_POLICY_VERSION, id: `policy-transition-${state.pulse}-${hash({ oldPolicy, newPolicy, sparkIds }).slice(-12)}`, oldPolicy: structuredClone(oldPolicy), newPolicy: structuredClone(newPolicy), effectivePulse: state.pulse, reason, sparkIds, before: snapshots, after: structuredClone(snapshots) };
}

export function validateFirstGlowAgeModelTransition(transition: FirstGlowAgeModelTransition): void {
  if (transition.version !== FIRST_GLOW_AGE_MODEL_POLICY_VERSION || !Number.isInteger(transition.effectivePulse) || transition.effectivePulse < 0 || transition.before.length !== transition.after.length) throw new Error("invalid age/model transition");
  validateFirstGlowAgeModelPolicy(transition.oldPolicy); validateFirstGlowAgeModelPolicy(transition.newPolicy, { allowCandidateAge: transition.newPolicy.status !== "active" });
  transition.before.forEach((snapshot, index) => validateFirstGlowSparkContinuity(snapshot, transition.after[index]));
}
