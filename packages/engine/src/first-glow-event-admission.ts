import { requestFirstGlowReflection, type FirstGlowReflectionCapacityState, type FirstGlowEventAdmission } from "./first-glow-reflection-capacity.js";
import { createFirstGlowAttentionBudget } from "./first-glow-attention.js";

/** Opt-in provenance for new histories; never enable by normalizing an old checkpoint. */
export function initializeFirstGlowEventAdmission(input: FirstGlowReflectionCapacityState, pulse: number): FirstGlowReflectionCapacityState {
  if (pulse !== 0 || input.eventAdmission || input.scheduler.decisions.length || input.scheduler.globalUsed || Object.values(input.scheduler.sparkUsed).some(Boolean)) throw new Error("event RC admission requires a fresh opening");
  return { ...structuredClone(input), eventAdmission: { version: "event-rc-v1", records: [], attentionBudget: createFirstGlowAttentionBudget() } };
}

/** This mutates only the caller-owned candidate state inside its commit boundary. */
export function admitFirstGlowEvent(rc: FirstGlowReflectionCapacityState, eventId: string, sparkId: string, pulse: number): FirstGlowEventAdmission {
  if (rc.eventAdmission?.version !== "event-rc-v1") throw new Error("unsupported or missing event RC admission policy");
  const assignment = rc.assignments[sparkId];
  if (!assignment || !eventId || !Number.isInteger(pulse) || pulse < 0) throw new Error("invalid event RC candidate");
  const day = Math.floor(pulse / rc.policy.pulsesPerDay);
  let created = false;
  let reason: string;
  if (rc.eventAdmission.records.some(record => record.eventId === eventId)) reason = "duplicate-event";
  else if (day < rc.scheduler.simulatedDay) reason = "historical-candidate";
  else if (rc.scheduler.decisions.some(record => record.created && record.sparkId === sparkId && record.pulse === pulse)) reason = "slot-already-owned";
  else if (rc.scheduler.simulatedDay === day && (rc.scheduler.sparkUsed[sparkId] ?? 0) >= assignment.capacity) reason = "capacity-exhausted";
  else {
    const decision = requestFirstGlowReflection(rc, sparkId, pulse);
    created = decision.created;
    reason = created ? "admitted" : decision.reason;
  }
  const record = { eventId, sparkId, pulse, simulatedDay: day, created, reason };
  rc.eventAdmission.records.push(record);
  return record;
}
