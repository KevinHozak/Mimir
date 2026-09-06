export type Tradition = "Hearthkeepers" | "Freehands" | "Seekers";
export type Activity = "work" | "rest" | "share" | "craft" | "meet" | "gather";
export interface TilePosition { x: number; y: number; }

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
  position: TilePosition;
  route: TilePosition[];
}

export interface WorldState {
  worldId: string;
  seed: number;
  tick: number;
  season: number;
  foodReserve: number;
  villagers: Villager[];
}

export interface WorldEvent {
  id: string;
  tick: number;
  kind: "tick" | "sharing" | "harvest";
  message: string;
  villagerIds: string[];
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

export function createWorld(seed = 1, worldId = "first-winter"): WorldState {
  return {
    worldId,
    seed: seed >>> 0,
    tick: 0,
    season: 1,
    foodReserve: 72,
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
      position: { x: 2 + (index % 6) * 4, y: 2 + Math.floor(index / 6) * 2 },
      route: []
    }))
  };
}

export function advanceWorld(input: WorldState): { state: WorldState; events: WorldEvent[] } {
  let random = nextRandom(input.seed + input.tick);
  const foodProduced = input.tick % 3 === 0 ? 8 : 3;
  const nextVillagers = input.villagers.map((villager, index) => {
    random = nextRandom(random + index);
    const needsFood = villager.hunger >= 45;
    const shouldShare = villager.tradition === "Hearthkeepers" && needsFood && input.foodReserve > 0;
    const activity: Activity = shouldShare ? "share" : needsFood ? "work" : random % 7 === 0 ? "craft" : random % 7 === 1 ? "meet" : random % 7 === 2 ? "gather" : "rest";
    const location = activity === "work" ? "Fields" : activity === "share" ? "Granary" : activity === "craft" ? "Workshop" : activity === "meet" ? "Meeting Place" : activity === "gather" ? "Woodland" : "Homes";
    const currentPosition = villager.position ?? { x: 2 + (index % 6) * 4, y: 2 + Math.floor(index / 6) * 2 };
    const anchor = LOCATION_TILES[location] ?? LOCATION_TILES.Homes;
    const target = { x: anchor.x + (index % 3) - 1, y: anchor.y + (index % 2) };
    return {
      ...villager,
      hunger: bounded(villager.hunger + 9 - (villager.food > 0 ? 13 : 0) - (shouldShare ? 3 : 0)),
      rest: bounded(villager.rest + (activity === "rest" ? 7 : -5)),
      trust: bounded(villager.trust + (shouldShare ? 2 : (random % 9 === 0 ? -1 : 0))),
      food: shouldShare ? villager.food : Math.max(0, villager.food - 1),
      activity,
      location,
      position: target,
      route: routeBetween(currentPosition, target)
    };
  });

  const sharingCount = nextVillagers.filter((villager) => villager.activity === "share").length;
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
    }] : [])
  ];
  return { state, events };
}

export function runTicks(initial: WorldState, count: number): { state: WorldState; events: WorldEvent[] } {
  let state = initial;
  const events: WorldEvent[] = [];
  for (let index = 0; index < count; index += 1) {
    const result = advanceWorld(state);
    state = result.state;
    events.push(...result.events);
  }
  return { state, events };
}
