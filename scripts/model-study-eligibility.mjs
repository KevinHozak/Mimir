// Reuse a recorded RC opportunity; never grant capacity or create scheduler decisions.
export function studyEligibility() {
  const used = new Set();
  return (state, context) => {
    const rc = state.reflectionCapacity;
    if (rc?.policy.version !== "world-age-v1" || rc.policy.baselineCapacity !== 1 || rc.policy.pulsesPerDay !== 64 || rc.policy.heroPolicy.naturalGeneration !== "disabled" || Object.values(rc.assignments).some(item => item.capacity !== 1 || item.isHero)) throw new Error("study RC policy mismatch");
    const key = `${context.actorSparkId}:${Math.floor(context.pulse / 64)}`;
    const recorded = rc.scheduler.decisions.some(item => item.sparkId === context.actorSparkId && item.pulse === context.pulse && item.created);
    if (!recorded || used.has(key)) return false;
    used.add(key);
    return true;
  };
}
