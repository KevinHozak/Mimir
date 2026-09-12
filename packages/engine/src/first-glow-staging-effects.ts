import { canonicalize } from "@mimir/world-data";
import { applyFirstGlowDilemmaChoice, type FirstGlowDilemmaChoice } from "./first-glow-social.js";
import { validateFirstGlowInterpretationRecord, type FirstGlowInterpretationContext, type FirstGlowInterpretationRecord } from "./first-glow-interpretations.js";
import type { FirstGlowState } from "./structured.js";

export type FirstGlowStagingRejection = "missing-target" | "unsupported-alternative" | "invalid-evidence" | "invalid-record";

export interface FirstGlowStagingSnapshot {
  social: FirstGlowState["social"];
  runtime: {
    tick: number;
    settlements: FirstGlowState["settlements"];
    ledger: FirstGlowState["ledger"];
    events: FirstGlowState["events"];
    explanations: FirstGlowState["explanations"];
    history?: FirstGlowState["history"];
  };
}

export interface FirstGlowStagingTransition {
  accepted: boolean;
  alternativeId: string;
  before: FirstGlowStagingSnapshot;
  after: FirstGlowStagingSnapshot;
  changedFields: string[];
  rejection?: FirstGlowStagingRejection;
}

function snapshot(state: FirstGlowState): FirstGlowStagingSnapshot {
  return {
    social: structuredClone(state.social),
    runtime: {
      tick: state.tick,
      settlements: structuredClone(state.settlements),
      ledger: structuredClone(state.ledger),
      events: structuredClone(state.events),
      explanations: structuredClone(state.explanations),
      history: structuredClone(state.history)
    }
  };
}

function stable(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function changedFields(before: FirstGlowStagingSnapshot, after: FirstGlowStagingSnapshot): string[] {
  const fields = ["social", "runtime.tick", "runtime.settlements", "runtime.ledger", "runtime.events", "runtime.explanations", "runtime.history"] as const;
  return fields.filter(field => {
    const read = (value: FirstGlowStagingSnapshot): unknown => field === "social" ? value.social : field === "runtime.tick" ? value.runtime.tick : value.runtime[field.slice("runtime.".length) as keyof FirstGlowStagingSnapshot["runtime"]];
    return stable(read(before)) !== stable(read(after));
  });
}

function result(state: FirstGlowState, context: FirstGlowInterpretationContext, record: FirstGlowInterpretationRecord, accepted: boolean, rejection?: FirstGlowStagingRejection): FirstGlowStagingTransition {
  const before = snapshot(state);
  let staged = state;
  if (accepted) {
    const choice: FirstGlowDilemmaChoice = {
      dilemmaId: context.dilemmaId,
      alternativeId: record.alternativeId,
      actorSparkId: context.actorSparkId,
      targetSparkId: context.targetSparkId!,
      evidenceEventIds: record.evidenceEventIds.slice(),
      tick: context.tick
    };
    staged = { ...state, social: applyFirstGlowDilemmaChoice(state.social, choice) };
  }
  const after = snapshot(staged);
  return { accepted, alternativeId: record.alternativeId, before, after, changedFields: changedFields(before, after), ...(rejection ? { rejection } : {}) };
}

/**
 * Apply one already-validated interpretation to a disposable state clone.
 * This is deliberately not wired into the server tick: the existing social
 * transition remains the only authority, and the caller owns staging output.
 */
export function applyFirstGlowStagingChoice(state: FirstGlowState, context: FirstGlowInterpretationContext, record: FirstGlowInterpretationRecord): FirstGlowStagingTransition {
  try {
    validateFirstGlowInterpretationRecord(record, context);
  } catch {
    return result(state, context, record, false, "invalid-record");
  }
  if (!context.targetSparkId) return result(state, context, record, false, "missing-target");
  if (!context.supportedAlternatives.includes(record.alternativeId)) return result(state, context, record, false, "unsupported-alternative");
  try {
    return result(state, context, record, true);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return result(state, context, record, false, message.includes("witnessed") || message.includes("hidden") ? "invalid-evidence" : "invalid-record");
  }
}


