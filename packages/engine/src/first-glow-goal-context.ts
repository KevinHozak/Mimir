import { canonicalize, sha256 } from "@mimir/world-data";
import type { FirstGlowGoalContext } from "./first-glow-goals.js";

export const FIRST_GLOW_GOAL_PROJECTION_VERSION = "bounded-local-goal-v1" as const;
export const FIRST_GLOW_GOAL_CONTEXT_LIMITS = { memories: 6, trust: 6, commitments: 4, references: 2, evidence: 16 } as const;
export interface FirstGlowGoalProjection {
  version: typeof FIRST_GLOW_GOAL_PROJECTION_VERSION;
  omittedTrust: number;
  omittedCommitments: number;
  omittedEvidence: number;
}
export class FirstGlowGoalAdmissionError extends Error {
  constructor(readonly code: "goal-context-too-large" | "goal-context-invalid") {
    super(code === "goal-context-too-large" ? "Spark goal context exceeds wire limit" : "Invalid Spark goal context projection");
  }
}
const ref = (id: string) => /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,95}$/.test(id);
const unique = (ids: string[]) => [...new Set(ids)];
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const digest = (value: unknown) => `sha256-${sha256(JSON.stringify(canonicalize(value)))}`;

/** New decision input only. Never replaces a saved goal context or its receipt identity. */
export function compactFirstGlowGoalContext(input: FirstGlowGoalContext): FirstGlowGoalContext {
  if (input.projection) {
    validateFirstGlowGoalContextProjection(input);
    return structuredClone(input);
  }
  const limits = FIRST_GLOW_GOAL_CONTEXT_LIMITS;
  const known = new Set(input.evidenceEventIds.filter(ref));
  const references = (ids: string[]) => unique(ids.filter(id => ref(id) && known.has(id))).slice(-limits.references);
  const allMemories = input.memory.memories;
  const memories = allMemories.filter(m => m.pulse <= input.pulse && known.has(m.sourceEventId) && ref(m.sourceEventId)).slice(-limits.memories);
  const allTrust = input.relationships?.trust ?? [];
  const trust = allTrust.filter(t => t.sourceSparkId === input.sparkId && ref(t.targetSparkId) && t.lastUpdatedPulse <= input.pulse)
    .slice().sort((a, b) => b.lastUpdatedPulse - a.lastUpdatedPulse || compare(a.targetSparkId, b.targetSparkId)).slice(0, limits.trust);
  const allCommitments = input.relationships?.commitments ?? [];
  const commitments = allCommitments.filter(c => c.promisorSparkId === input.sparkId && ref(c.id) && ref(c.beneficiarySparkId) && c.createdPulse <= input.pulse && c.resolvedPulse <= input.pulse)
    .slice().sort((a, b) => b.resolvedPulse - a.resolvedPulse || compare(a.id, b.id)).slice(0, limits.commitments);
  // Reserve a citation for each retained memory first, then a small spread across
  // relationships, before filling with other already-known local references.
  const evidenceEventIds = unique([
    ...(input.frontierExploration ? [input.frontierExploration.evidenceEventId] : []),
    ...(input.opportunities?.map(o=>o.evidenceEventId).filter(id=>known.has(id)) ?? []),
    ...memories.map(m => m.sourceEventId),
    ...trust.flatMap(t => references(t.evidenceEventIds).slice(0, 1)),
    ...commitments.flatMap(c => references(c.evidenceEventIds).slice(0, 1)),
    ...memories.flatMap(m => references(m.evidenceEventIds)),
    ...input.evidenceEventIds.filter(ref).slice(-limits.evidence)
  ]).slice(0, limits.evidence);
  const exported = new Set(evidenceEventIds);
  const retainedRefs = (ids: string[]) => references(ids).filter(id => exported.has(id));
  const memory = {
    version: input.memory.version, sparkId: input.sparkId,
    omittedCount: input.memory.omittedCount + allMemories.length - memories.length,
    memories: memories.map(m => ({ id: m.id, kind: m.kind, sourceEventId: m.sourceEventId, evidenceEventIds: retainedRefs(m.evidenceEventIds), pulse: m.pulse, summary: m.summary.slice(0, 140), provenance: m.provenance, retention: m.retention, retentionVersion: m.retentionVersion, ...(m.sourceSparkId ? { sourceSparkId: m.sourceSparkId } : {}) })),
    reconstruction: { ...input.memory.reconstruction, eventIds: unique(memories.flatMap(m => [m.sourceEventId, ...retainedRefs(m.evidenceEventIds)])).sort(compare) }
  };
  const relationships = {
    trust: trust.map(t => ({ sourceSparkId: t.sourceSparkId, targetSparkId: t.targetSparkId, value: t.value, lastUpdatedPulse: t.lastUpdatedPulse, evidenceEventIds: retainedRefs(t.evidenceEventIds), omittedEvidence: (t.omittedEvidence ?? 0) + t.evidenceEventIds.length - retainedRefs(t.evidenceEventIds).length })),
    commitments: commitments.map(c => ({ id: c.id, promisorSparkId: c.promisorSparkId, beneficiarySparkId: c.beneficiarySparkId, dilemmaId: c.dilemmaId, alternativeId: c.alternativeId, status: c.status, createdPulse: c.createdPulse, resolvedPulse: c.resolvedPulse, evidenceEventIds: retainedRefs(c.evidenceEventIds), omittedEvidence: (c.omittedEvidence ?? 0) + c.evidenceEventIds.length - retainedRefs(c.evidenceEventIds).length }))
  };
  const context = {
    version: input.version, sparkId: input.sparkId, pulse: input.pulse,
    candidates: [...input.candidates], charge: input.charge, chargeDeficit: input.chargeDeficit, readiness: input.readiness,
    memory, evidenceEventIds,
    ...(input.frontierExploration ? { frontierExploration: structuredClone(input.frontierExploration) } : {}),
    ...(input.opportunities ? { opportunities: structuredClone(input.opportunities) } : {}),
    ...(input.personality ? { personality: structuredClone(input.personality) } : {}), relationships,
    projection: { version: FIRST_GLOW_GOAL_PROJECTION_VERSION, omittedTrust: allTrust.length - trust.length, omittedCommitments: allCommitments.length - commitments.length, omittedEvidence: input.evidenceEventIds.length - evidenceEventIds.length }
  };
  return { ...context, contextHash: digest(context) };
}

/** Legacy contexts stay valid. Marked projections must retain their explicit bounds. */
export function validateFirstGlowGoalContextProjection(context: FirstGlowGoalContext): void {
  if (!context.projection) return;
  const p = context.projection, limits = FIRST_GLOW_GOAL_CONTEXT_LIMITS;
  const invalid = () => { throw new FirstGlowGoalAdmissionError("goal-context-invalid"); };
  if (p.version !== FIRST_GLOW_GOAL_PROJECTION_VERSION || ![p.omittedTrust, p.omittedCommitments, p.omittedEvidence].every(n => Number.isSafeInteger(n) && n >= 0) || context.evidenceEventIds.length > limits.evidence || context.evidenceEventIds.some(id => !ref(id)) || context.memory.memories.length > limits.memories || (context.relationships?.trust.length ?? 0) > limits.trust || (context.relationships?.commitments.length ?? 0) > limits.commitments) invalid();
  if (context.opportunities && (context.opportunities.length>4 || context.opportunities.some(o=>!context.candidates.includes(o.kind)||!ref(o.objectId)||!ref(o.evidenceEventId)||!Number.isInteger(o.routeCost)||o.routeCost<0||o.label.length>64))) invalid();
  const known = new Set(context.evidenceEventIds);
  if (context.opportunities?.some(o=>!known.has(o.evidenceEventId))) invalid();
  if (context.frontierExploration && (!known.has(context.frontierExploration.evidenceEventId) || !Number.isInteger(context.frontierExploration.routeCost) || context.frontierExploration.routeCost<0)) invalid();
  const refsValid = (ids: string[]) => ids.length <= limits.references && ids.every(id => known.has(id));
  for (const m of context.memory.memories) if (!known.has(m.sourceEventId) || !refsValid(m.evidenceEventIds) || m.pulse > context.pulse || m.summary.length > 140) invalid();
  for (const t of context.relationships?.trust ?? []) if (t.sourceSparkId !== context.sparkId || !refsValid(t.evidenceEventIds) || t.lastUpdatedPulse > context.pulse || !Number.isSafeInteger(t.omittedEvidence) || t.omittedEvidence! < 0) invalid();
  for (const c of context.relationships?.commitments ?? []) if (c.promisorSparkId !== context.sparkId || !refsValid(c.evidenceEventIds) || c.resolvedPulse > context.pulse || !Number.isSafeInteger(c.omittedEvidence) || c.omittedEvidence! < 0) invalid();
}
