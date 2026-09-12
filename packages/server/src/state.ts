import { createFirstGlowHistory, validateFirstGlowState, type WorldState } from "@mimir/engine";

export function normalizeState(raw: WorldState): WorldState {
  if (raw.simulationVersion !== "mimir-sim-v3-first-glow" || raw.spatialModel !== "structured-v2" || !raw.firstGlowState) throw new Error("checkpoint is not a First Glow structured-v2 state");
  raw.firstGlowState.history ??= createFirstGlowHistory();
  validateFirstGlowState(raw.firstGlowState);
  return {
    ...raw,
    firstGlowState: raw.firstGlowState,
    tick: raw.firstGlowState.tick,
    season: raw.season ?? 0,
    foodReserve: raw.foodReserve ?? 0,
    villagers: raw.villagers ?? [],
    events: raw.events ?? [],
    interpretations: raw.interpretations ?? [],
    settlements: raw.settlements ?? [],
    tradeHistory: raw.tradeHistory ?? [],
    dilemmaHistory: raw.dilemmaHistory ?? [],
    scenario: raw.scenario ?? { name: "The First Glow", seasonTickLimit: 360 }
  };
}
