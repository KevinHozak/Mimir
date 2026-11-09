import { createWorldFromBundle, initializeFirstGlowEventAdmission } from "@mimir/engine";

export function createStudyWorld(bundle, seed) {
  const state = createWorldFromBundle(bundle, seed, `study-v4-seed-${seed}`, 6);
  state.firstGlowState.reflectionCapacity = initializeFirstGlowEventAdmission(state.firstGlowState.reflectionCapacity, state.pulse);
  return state;
}
