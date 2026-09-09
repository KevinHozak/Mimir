import { advanceFirstGlow } from "./first-glow-actions.js";
import { buildFirstGlowInterpretationContext, createRulesOnlyFirstGlowInterpretation } from "./first-glow-interpretations.js";
import { createFirstGlowState, FIRST_GLOW_SIMULATION_VERSION, validateFirstGlowState, type FirstGlowState } from "./structured.js";
import { decodeWorldBundle, type FirstGlowWorldBundle } from "@mimir/world-data";
export { queryCell } from "@mimir/world-data";
export * from "./structured.js";
export * from "./design.js";
export * from "./first-glow-social.js";
export * from "./first-glow-explanations.js";
export * from "./first-glow-interpretations.js";
export { advanceFirstGlow } from "./first-glow-actions.js";

export interface WorldEvent { id: string; tick: number; kind: "tick" | "sharing" | "collection" | "world-object"; message: string; villagerIds: string[]; settlementIds?: string[]; }
export interface SocialInterpretation { id: string; tick: number; eventId: string; sparkId?: string; villagerId?: string; source: "rules" | "ai"; summary: string; evidenceEventIds: string[]; [key: string]: unknown; }
export interface WorldState {
  worldId: string; seed: number; tick: number; simulationVersion: typeof FIRST_GLOW_SIMULATION_VERSION; spatialModel: "structured-v2"; firstGlowState: FirstGlowState;
  [key: string]: any;
}

export type SharedStore = Record<string, unknown>;
export const FIRST_WINTER_SCENARIO = { seasonTickLimit: 360 } as const;
export const HOME_SETTLEMENT = { id: "first-glow-region", name: "Opening region" } as const;
export const CHARACTER_CARDS: never[] = [];
export const FIRST_WINTER_DILEMMAS: never[] = [];
export function createWorld(..._args: unknown[]): never { throw new Error("First Glow requires a schema-3 bundle"); }
export function createWorldV2(..._args: unknown[]): never { throw new Error("structured-v2 village timelines are no longer supported"); }
export function setObjectBlocked<T extends { blockedObjectIds?: string[] }>(world: unknown, runtime: T, objectId: string, blocked: boolean): T { const ids = runtime.blockedObjectIds ?? []; return { ...runtime, blockedObjectIds: blocked ? [...new Set([...ids, objectId])] : ids.filter(id => id !== objectId) }; }
export function parseWorldDefinition<T>(value: T): T { return value; }

export function createWorldV3(bundle: FirstGlowWorldBundle, seed = 1, worldId = "first-glow-v3", sparkCount = 1): WorldState {
  const firstGlowState = createFirstGlowState(bundle, "first-glow-region", "Opening region", sparkCount);
  const settlements = firstGlowState.settlements.map(settlement => ({ id: settlement.id, name: settlement.name, villagerIds: [], foodReserve: 0, worldRuntime: settlement.runtime }));
  return { worldId, seed, tick: 0, season: 0, simulationVersion: FIRST_GLOW_SIMULATION_VERSION, spatialModel: "structured-v2", firstGlowState, settlements, villagers: [], events: [], interpretations: [], foodReserve: 0, scenario: { name: "The First Glow", seasonTickLimit: 360 }, weather: { kind: "clear", forecast: "clear", severity: 0 }, hazards: [], tradeHistory: [], dilemmaHistory: [], sharedStore: undefined, worldRuntime: firstGlowState.settlements[0].runtime };
}

export function createWorldFromBundle(raw: unknown, seed = 1, worldId = "first-glow-v3", sparkCount = 1): WorldState {
  const bundle = decodeWorldBundle(raw);
  if (bundle.schemaVersion !== 3) throw new Error("First Glow requires a schema-3 world bundle");
  return createWorldV3(bundle, seed, worldId, sparkCount);
}

function toWorldEvents(state: FirstGlowState, priorIds = new Set<string>()): WorldEvent[] {
  return state.events.filter(event => !priorIds.has(event.id)).map(event => ({ id: event.id, tick: state.tick, kind: event.kind === "share" ? "sharing" : event.kind === "draw" ? "collection" : event.kind === "movement" ? "world-object" : "tick", message: event.message, villagerIds: [], settlementIds: [] }));
}

function openingChargeIntake(world: WorldState): number {
  return world.tick > 0 && world.tick % 4 === 0 ? 24 : 0;
}

export function advanceWorld(input: WorldState): { state: WorldState; events: WorldEvent[]; interpretations: SocialInterpretation[] } {
  validateFirstGlowState(input.firstGlowState);
  const previousIds = new Set(input.firstGlowState.events.map(event => event.id));
  const firstGlowState = advanceFirstGlow(input.firstGlowState, { sourceCharge: openingChargeIntake(input) });
  const state: WorldState = { ...input, tick: firstGlowState.tick, firstGlowState };
  const interpretations = firstGlowState.events.filter(event => !previousIds.has(event.id)).slice().sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).flatMap(event => { const context = buildFirstGlowInterpretationContext(firstGlowState, event); return context ? [createRulesOnlyFirstGlowInterpretation(context)] : []; });
  return { state, events: toWorldEvents(firstGlowState, previousIds), interpretations };
}

export function runTicks(initial: WorldState, count: number): { state: WorldState; events: WorldEvent[]; interpretations: SocialInterpretation[] } {
  let state = initial; const events: WorldEvent[] = []; const interpretations: SocialInterpretation[] = [];
  for (let index = 0; index < count; index += 1) { const result = advanceWorld(state); state = result.state; events.push(...result.events); interpretations.push(...result.interpretations); }
  return { state, events, interpretations };
}
