export type Tradition = "Hearthkeepers" | "Freehands" | "Seekers";
export type Activity = "work" | "rest" | "share" | "craft" | "meet" | "gather" | "travel";
export * from "./world.js";
import { createDefaultWorld, findRoute, sameCell, type WorldDefinition, type WorldRuntimeState } from "./world.js";
export interface TilePosition { x: number; y: number; }
export interface Beliefs { cooperation: number; selfReliance: number; reflection: number; }
export interface ScenarioConfig { name: string; initialFood: number; seasonTickLimit: number; harvestInterval: number; harvestAmount: number; hungerPressure: number; }
export const FIRST_WINTER_SCENARIO: ScenarioConfig = { name: "The First Winter", initialFood: 72, seasonTickLimit: 60, harvestInterval: 3, harvestAmount: 8, hungerPressure: 9 };

export interface Villager {
  id: string;
  name: string;
  tradition: Tradition;
  hunger: number;
  rest: number;
  trust: number;
  food: number;
  activity: Activity;
  location: string;
  beliefs: Beliefs;
  position: TilePosition;
  route: TilePosition[];
  destination?: TilePosition;
  intendedActivity?: Exclude<Activity, "travel">;
  targetLocation?: string;
}

export interface WorldState {
  worldId: string;
  seed: number;
  tick: number;
  season: number;
  foodReserve: number;
  scenario: ScenarioConfig;
  villagers: Villager[];
  worldDefinition?: WorldDefinition;
  worldRuntime?: WorldRuntimeState;
}

export interface WorldEvent {
  id: string;
  tick: number;
  kind: "tick" | "sharing" | "harvest" | "encounter";
  message: string;
  villagerIds: string[];
}

export interface SocialInterpretation {
  id: string;
  tick: number;
  eventId: string;
  villagerId: string;
  source: "rules" | "ai";
  fallbackReason?: string;
  belief: keyof Beliefs;
  confidence: number;
  trustDelta: number;
  summary: string;
  evidenceEventIds: string[];
}

const names = [
  ["Mara", "Hearthkeepers"], ["Tomas", "Hearthkeepers"], ["Elsin", "Hearthkeepers"], ["Iria", "Hearthkeepers"],
  ["Bram", "Freehands"], ["Nessa", "Freehands"], ["Oren", "Freehands"], ["Pia", "Freehands"],
  ["Sela", "Seekers"], ["Kato", "Seekers"], ["Veya", "Seekers"], ["Jonan", "Seekers"]
] as const;

const locations = ["Homes", "Granary", "Workshop", "Meeting Place", "Fields", "Woodland"];
export const LOCATION_TILES: Record<string, TilePosition> = {
  Homes: { x: 5, y: 4 }, Granary: { x: 14, y: 4 }, Workshop: { x: 23, y: 4 },
  "Meeting Place": { x: 14, y: 8 }, Fields: { x: 8, y: 11 }, Woodland: { x: 25, y: 9 }
};

const destinationOffsets: TilePosition[] = [
  { x: 0, y: 0 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 },
  { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 }, { x: -2, y: 0 },
  { x: 2, y: 0 }, { x: 0, y: 2 }
];

function nextRandom(value: number): number {
  return (value * 1664525 + 1013904223) >>> 0;
}

function bounded(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function routeBetween(start: TilePosition, target: TilePosition): TilePosition[] {
  const route: TilePosition[] = [{ ...start }];
  let x = start.x;
  let y = start.y;
  while (x !== target.x) { x += x < target.x ? 1 : -1; route.push({ x, y }); }
  while (y !== target.y) { y += y < target.y ? 1 : -1; route.push({ x, y }); }
  return route;
}

export function createWorld(seed = 1, worldId = "first-winter", scenario: ScenarioConfig = FIRST_WINTER_SCENARIO): WorldState {
  return {
    worldId,
    seed: seed >>> 0,
    tick: 0,
    season: 1,
    foodReserve: scenario.initialFood,
    scenario,
    villagers: names.map(([name, tradition], index) => ({
      id: `villager-${index + 1}`,
      name,
      tradition,
      hunger: 15 + (index % 4) * 4,
      rest: 75 - (index % 3) * 5,
      trust: 50,
      food: 2,
      activity: "rest",
      location: locations[index % locations.length],
      beliefs: { cooperation: 50, selfReliance: 50, reflection: 50 },
      position: { x: 2 + (index % 6) * 4, y: 2 + Math.floor(index / 6) * 2 },
      route: []
    })),
    worldDefinition: createDefaultWorld(),
    worldRuntime: { blockedObjectIds: [] }
  };
}

export function advanceWorld(input: WorldState): { state: WorldState; events: WorldEvent[]; interpretations: SocialInterpretation[] } {
  let random = nextRandom(input.seed + input.tick);
  const foodProduced = input.tick % input.scenario.harvestInterval === 0 ? input.scenario.harvestAmount : 3;
  const occupiedTargets = new Set<string>(input.villagers.map((villager, index) => {
    const position = villager.position ?? { x: 2 + (index % 6) * 4, y: 2 + Math.floor(index / 6) * 2 };
    return `${position.x},${position.y}`;
  }));
  const nextVillagers = input.villagers.map((villager, index) => {
    random = nextRandom(random + index);
    const needsFood = villager.hunger >= 45;
    const currentPosition = villager.position ?? { x: 2 + (index % 6) * 4, y: 2 + Math.floor(index / 6) * 2 };
    const continuing = villager.destination && !sameCell(currentPosition, villager.destination);
    const desiredActivity: Exclude<Activity, "travel"> = continuing ? (villager.intendedActivity ?? "rest") : (villager.tradition === "Hearthkeepers" && needsFood && input.foodReserve > 0 ? "share" : needsFood ? "work" : random % 7 === 0 ? "craft" : random % 7 === 1 ? "meet" : random % 7 === 2 ? "gather" : "rest");
    const desiredLocation = continuing ? (villager.targetLocation ?? villager.location) : (desiredActivity === "work" ? "Fields" : desiredActivity === "share" ? "Granary" : desiredActivity === "craft" ? "Workshop" : desiredActivity === "meet" ? "Meeting Place" : desiredActivity === "gather" ? "Woodland" : "Homes");
    const anchor = LOCATION_TILES[desiredLocation] ?? LOCATION_TILES.Homes;
    const target = continuing ? villager.destination! : (() => {
      const targetOffset = destinationOffsets
        .map((offset, offsetIndex) => ({ offset, offsetIndex }))
        .sort((left, right) => ((left.offsetIndex + index) % destinationOffsets.length) - ((right.offsetIndex + index) % destinationOffsets.length))
        .find(({ offset }) => {
          const candidate = { x: anchor.x + offset.x, y: anchor.y + offset.y };
          if (occupiedTargets.has(`${candidate.x},${candidate.y}`)) return false;
          const candidateRoute = input.worldDefinition ? findRoute(input.worldDefinition, currentPosition, candidate, input.worldRuntime) : routeBetween(currentPosition, candidate);
          return candidateRoute !== null && (!candidateRoute[1] || !occupiedTargets.has(`${candidateRoute[1].x},${candidateRoute[1].y}`));
        })?.offset ?? destinationOffsets[0];
      return { x: anchor.x + targetOffset.x, y: anchor.y + targetOffset.y };
    })();
    occupiedTargets.add(`${target.x},${target.y}`);
    const fullRoute = input.worldDefinition ? (findRoute(input.worldDefinition, currentPosition, target, input.worldRuntime) ?? [currentPosition]) : routeBetween(currentPosition, target);
    const step = fullRoute[1] ?? currentPosition;
    occupiedTargets.add(`${step.x},${step.y}`);
    const arrived = sameCell(step, target);
    const activity: Activity = arrived ? desiredActivity : "travel";
    const location = arrived ? desiredLocation : villager.location;
    const shouldShare = activity === "share" && villager.tradition === "Hearthkeepers" && needsFood && input.foodReserve > 0;
    return {
      ...villager,
      hunger: bounded(villager.hunger + input.scenario.hungerPressure - (villager.food > 0 && activity !== "travel" ? 13 : 0) - (shouldShare ? 3 : 0)),
      rest: bounded(villager.rest + (activity === "rest" ? 7 : activity === "travel" ? -2 : -5)),
      trust: bounded(villager.trust + (shouldShare ? 2 : activity === "meet" ? 1 : (random % 9 === 0 ? -1 : 0))),
      food: shouldShare ? villager.food : Math.max(0, villager.food - 1),
      activity,
      location,
      beliefs: {
        cooperation: bounded((villager.beliefs?.cooperation ?? 50) + (shouldShare ? 3 : 0)),
        selfReliance: bounded((villager.beliefs?.selfReliance ?? 50) + (activity === "work" ? 2 : 0)),
        reflection: bounded((villager.beliefs?.reflection ?? 50) + (activity === "meet" ? 2 : 0))
      },
      position: step,
      route: arrived ? [step] : [currentPosition, step],
      destination: arrived ? undefined : target,
      intendedActivity: arrived ? undefined : desiredActivity,
      targetLocation: arrived ? undefined : desiredLocation
    };
  });

  const sharingCount = nextVillagers.filter((villager) => villager.activity === "share").length;
  const meetingVillagers = nextVillagers.filter((villager) => villager.activity === "meet");
  const consumed = nextVillagers.filter((villager) => villager.food === 0).length;
  const state: WorldState = {
    ...input,
    tick: input.tick + 1,
    seed: random,
    foodReserve: Math.max(0, input.foodReserve + foodProduced - consumed - sharingCount),
    villagers: nextVillagers
  };
  const events: WorldEvent[] = [
    {
      id: `event-${state.tick}-tick`,
      tick: state.tick,
      kind: "tick",
      message: `Tick ${state.tick} completed with ${state.foodReserve} food in reserve.`,
      villagerIds: []
    },
    ...(sharingCount > 0 ? [{
      id: `event-${state.tick}-sharing`,
      tick: state.tick,
      kind: "sharing" as const,
      message: `${sharingCount} Hearthkeeper${sharingCount === 1 ? "" : "s"} chose to share from the granary.`,
      villagerIds: nextVillagers.filter((villager) => villager.activity === "share").map((villager) => villager.id)
    }] : []),
    ...(foodProduced > 0 ? [{
      id: `event-${state.tick}-harvest`,
      tick: state.tick,
      kind: "harvest" as const,
      message: `${foodProduced} food was gathered from the village's work.`,
      villagerIds: []
    }] : []),
    ...(meetingVillagers.length > 0 ? [{
      id: `event-${state.tick}-encounter`,
      tick: state.tick,
      kind: "encounter" as const,
      message: `${meetingVillagers.map((villager) => villager.name).join(", ")} gathered at the meeting place.`,
      villagerIds: meetingVillagers.map((villager) => villager.id)
    }] : [])
  ];
  return { state, events, interpretations: interpretSocialEvents(state, events) };
}

export function interpretSocialEvents(state: WorldState, events: WorldEvent[], source: "rules" | "ai" = "rules"): SocialInterpretation[] {
  const namesById = new Map(state.villagers.map((villager) => [villager.id, villager.name]));
  return events
    .filter((event) => event.kind === "sharing" || event.kind === "encounter")
    .flatMap((event) => event.villagerIds.map((villagerId) => {
      const name = namesById.get(villagerId) ?? villagerId;
      const sharing = event.kind === "sharing";
      return {
        id: `interpretation-${event.id}-${villagerId}`,
        tick: event.tick,
        eventId: event.id,
        villagerId,
        source,
        ...(source === "rules" ? { fallbackReason: "Deterministic rules are the active Phase 4 adapter." } : {}),
        belief: sharing ? "cooperation" : "reflection",
        confidence: sharing ? 0.88 : 0.7,
        trustDelta: sharing ? 2 : 1,
        summary: sharing ? `${name} reads the shared food as evidence that cooperation can protect the village.` : `${name} treats the gathering as a chance to compare values and revise their understanding.`,
        evidenceEventIds: [event.id]
      } satisfies SocialInterpretation;
    }));
}

export function runTicks(initial: WorldState, count: number): { state: WorldState; events: WorldEvent[]; interpretations: SocialInterpretation[] } {
  let state = initial;
  const events: WorldEvent[] = [];
  const interpretations: SocialInterpretation[] = [];
  for (let index = 0; index < count; index += 1) {
    const result = advanceWorld(state);
    state = result.state;
    events.push(...result.events);
    interpretations.push(...result.interpretations);
  }
  return { state, events, interpretations };
}
