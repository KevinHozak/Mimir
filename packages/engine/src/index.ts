export type Tradition = "Hearthkeepers" | "Freehands" | "Seekers";
export type Activity = "work" | "rest" | "share" | "collect" | "craft" | "meet" | "gather" | "travel";
export * from "./world.js";
export * from "./design.js";
export * from "./social.js";
import { createDefaultWorld, findRoute, isWalkable, MOVEMENT_MODEL, normalizeSpatialMetadata, SIMULATION_VERSION, sameCell, type MovementModel, type WorldDefinition, type WorldRuntimeState } from "./world.js";
import { FIRST_WINTER_DILEMMAS, type DilemmaCard } from "./design.js";
export interface TilePosition { x: number; y: number; }
export interface Beliefs { cooperation: number; selfReliance: number; reflection: number; }
export interface ScenarioConfig { name: string; initialFood: number; seasonTickLimit: number; harvestInterval: number; harvestAmount: number; hungerPressure: number; dilemmaTick?: number; }
export const FIRST_WINTER_SCENARIO: ScenarioConfig = { name: "The First Winter", initialFood: 72, seasonTickLimit: 360, harvestInterval: 3, harvestAmount: 8, hungerPressure: 9 };

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
  settlementId: string;
  travelPlan?: { routeId: string; fromSettlementId: string; toSettlementId: string; remainingTicks: number };
}

export interface SettlementState {
  id: string;
  name: string;
  foodReserve: number;
  worldDefinition?: WorldDefinition;
  worldRuntime: WorldRuntimeState;
  villagerIds: string[];
}

export interface RouteDefinition {
  id: string;
  name: string;
  fromSettlementId: string;
  toSettlementId: string;
  travelTicks: number;
  status: "open" | "blocked";
}

export interface TradeRecord {
  id: string;
  tick: number;
  routeId: string;
  villagerId: string;
  fromSettlementId: string;
  toSettlementId: string;
  resource: "food";
  amount: number;
  summary: string;
}

export type WeatherKind = "clear" | "rain" | "cold" | "drought" | "storm";
export interface WeatherState {
  kind: WeatherKind;
  severity: number;
  forecast: WeatherKind;
  changedAtTick: number;
}

export interface HazardState {
  id: string;
  kind: "bridge-washout" | "field-damage";
  status: "active" | "resolved";
  startedAtTick: number;
  routeId?: string;
  settlementId: string;
  summary: string;
}

export interface WorldState {
  worldId: string;
  seed: number;
  tick: number;
  season: number;
  foodReserve: number;
  scenario: ScenarioConfig;
  villagers: Villager[];
  sharedStore: SharedStore;
  dilemmaHistory: DilemmaResolution[];
  settlements: SettlementState[];
  routes: RouteDefinition[];
  tradeHistory: TradeRecord[];
  weather: WeatherState;
  hazards: HazardState[];
  worldDefinition?: WorldDefinition;
  worldRuntime?: WorldRuntimeState;
  spatialModel: "structured-v1" | "legacy-backdrop-v0";
  simulationVersion: string;
  movementModel: MovementModel;
}

export interface SharedStore {
  id: "shared-granary";
  status: "provisional" | "active";
  contributionRule: string;
  distributionRule: string;
  contributions: number;
  distributions: number;
  dissent: number;
}

export interface DilemmaResolution {
  id: string;
  tick: number;
  dilemmaId: string;
  title: string;
  choiceId: string;
  choiceLabel: string;
  villagerIds: string[];
  foodDelta: number;
  trustDelta: number;
  belief: keyof Beliefs;
  beliefDelta: number;
  institutionStatus?: SharedStore["status"];
  summary: string;
}

export interface WorldEvent {
  id: string;
  tick: number;
  kind: "tick" | "sharing" | "collection" | "harvest" | "encounter" | "institution" | "dilemma" | "trade" | "weather" | "hazard";
  message: string;
  villagerIds: string[];
  settlementIds?: string[];
  dilemmaId?: string;
  choiceId?: string;
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
export const HOME_SETTLEMENT = { id: "first-village", name: "Hearthmere" } as const;
export const RIVERBEND_SETTLEMENT = { id: "riverbend", name: "Riverbend" } as const;
export const REGIONAL_ROUTES: RouteDefinition[] = [{ id: "road-mimir-riverbend", name: "The River Road", fromSettlementId: HOME_SETTLEMENT.id, toSettlementId: RIVERBEND_SETTLEMENT.id, travelTicks: 3, status: "open" }];
const initialWeather: WeatherState = { kind: "clear", severity: 0, forecast: "rain", changedAtTick: 0 };
const homeSettlement = HOME_SETTLEMENT;
const riverbendSettlement = RIVERBEND_SETTLEMENT;
const regionalRoute = REGIONAL_ROUTES[0];
export const LOCATION_TILES: Record<string, TilePosition> = {
  Homes: { x: 16, y: 18 }, Granary: { x: 48, y: 14 }, Workshop: { x: 78, y: 18 },
  "Meeting Place": { x: 48, y: 50 }, Fields: { x: 28, y: 72 }, Woodland: { x: 80, y: 70 }
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

interface DilemmaConsequence {
  foodDelta: number;
  trustDelta: number;
  belief: keyof Beliefs;
  beliefDelta: number;
  dissentDelta: number;
  institutionStatus?: SharedStore["status"];
  summary: string;
}

interface ResolvedDilemma {
  dilemma: DilemmaCard;
  applicantIndex: number;
  witnessIndex: number;
  choice: DilemmaCard["choices"][number];
  consequences: DilemmaConsequence;
}

function resolveDilemma(input: WorldState, villagers: Villager[], nextTick: number): ResolvedDilemma | null {
  const dilemma = FIRST_WINTER_DILEMMAS.find((candidate) => candidate.triggerTick === nextTick);
  if (!dilemma || villagers.length === 0) return null;
  const chooserIndex = nextRandom(input.seed + nextTick + (input.dilemmaHistory?.length ?? 0) * 313) % villagers.length;
  const chooser = villagers[chooserIndex];
  const circumstancePressure = nextRandom(input.seed + nextTick + 1543) % 100;
  const applicantIndex = villagers.reduce((bestIndex, villager, index) => villager.hunger > villagers[bestIndex].hunger ? index : bestIndex, 0);
  const witnessIndex = (applicantIndex + 1 + chooserIndex) % villagers.length;
  let choiceId: string;
  if (dilemma.id === "hungry-neighbor-loan") {
    const careScore = chooser.beliefs.cooperation + (chooser.tradition === "Hearthkeepers" ? 10 : 0) + chooser.trust;
    const generosityScore = careScore + circumstancePressure - (input.foodReserve < 8 ? 18 : 0);
    choiceId = generosityScore >= chooser.beliefs.selfReliance + 55 ? "grant" : generosityScore >= chooser.beliefs.selfReliance + 35 ? "loan" : "refuse";
  } else if (dilemma.id === "common-repair") {
    const commonScore = chooser.beliefs.cooperation + chooser.beliefs.reflection + (chooser.tradition === "Hearthkeepers" || chooser.tradition === "Seekers" ? 8 : 0);
    const privateScore = chooser.beliefs.selfReliance + (chooser.tradition === "Freehands" ? 25 : 0) + circumstancePressure / 8;
    choiceId = commonScore >= privateScore + 32 ? "repair" : privateScore >= commonScore + 8 ? "private-work" : "split";
  } else {
    choiceId = chooser.beliefs.reflection + circumstancePressure / 5 >= 62 ? "repair-publicly" : chooser.trust < 42 ? "enforce" : "release";
  }
  const choice = dilemma.choices.find((candidate) => candidate.id === choiceId) ?? dilemma.choices[0];
  const consequencesByChoice: Record<string, DilemmaConsequence> = {
    grant: { foodDelta: -8, trustDelta: 4, belief: "cooperation", beliefDelta: 3, dissentDelta: 0, summary: "The store granted immediate care without requiring repayment." },
    loan: { foodDelta: -5, trustDelta: 1, belief: "selfReliance", beliefDelta: 2, dissentDelta: 0, summary: "The store offered measured help while preserving an expectation of reciprocity." },
    refuse: { foodDelta: 0, trustDelta: -4, belief: "cooperation", beliefDelta: -3, dissentDelta: 1, summary: "The store protected its reserve, but the refusal left a visible grievance." },
    repair: { foodDelta: -4, trustDelta: 4, belief: "cooperation", beliefDelta: 4, dissentDelta: 0, institutionStatus: "active", summary: "The village repaired the bridge together and made the granary a trusted common institution." },
    "private-work": { foodDelta: 4, trustDelta: -2, belief: "selfReliance", beliefDelta: 4, dissentDelta: 1, summary: "Private work raised the immediate reserve, while the shared crossing remained vulnerable." },
    split: { foodDelta: 0, trustDelta: 1, belief: "reflection", beliefDelta: 2, dissentDelta: 0, summary: "The village split its effort and accepted a slower answer to both needs." },
    "repair-publicly": { foodDelta: -2, trustDelta: 4, belief: "reflection", beliefDelta: 4, dissentDelta: 0, summary: "An honest explanation and visible repair preserved trust after the promise changed." },
    enforce: { foodDelta: 0, trustDelta: -3, belief: "selfReliance", beliefDelta: 2, dissentDelta: 1, summary: "The village enforced its promise, preserving predictability at a human cost." },
    release: { foodDelta: 0, trustDelta: 1, belief: "cooperation", beliefDelta: 2, dissentDelta: 0, summary: "The village released the promise and accepted that mercy can change a rule." }
  };
  return { dilemma, applicantIndex, witnessIndex, choice, consequences: consequencesByChoice[choice.id] ?? { foodDelta: 0, trustDelta: 0, belief: "reflection", beliefDelta: 0, dissentDelta: 0, summary: "The village recorded the decision without changing the common reserve." } };
}

function routeBetween(start: TilePosition, target: TilePosition): TilePosition[] {
  const route: TilePosition[] = [{ ...start }];
  let x = start.x;
  let y = start.y;
  while (x !== target.x) { x += x < target.x ? 1 : -1; route.push({ x, y }); }
  while (y !== target.y) { y += y < target.y ? 1 : -1; route.push({ x, y }); }
  return route;
}

function resolveWeather(input: WorldState, nextTick: number): WeatherState {
  const current = input.weather ?? initialWeather;
  if (nextTick % 15 !== 0) return current;
  const kinds: WeatherKind[] = ["clear", "rain", "cold", "drought", "storm"];
  const kind = kinds[nextRandom(input.seed + nextTick + 9001) % kinds.length];
  const forecast = kinds[nextRandom(input.seed + nextTick + 9007) % kinds.length];
  return { kind, severity: kind === "clear" ? 0 : 1 + (nextRandom(input.seed + nextTick + 9013) % 3), forecast, changedAtTick: nextTick };
}

function weatherFoodModifier(weather: WeatherState): number {
  return weather.kind === "drought" ? -3 : weather.kind === "storm" ? -2 : weather.kind === "rain" ? 1 : 0;
}

function weatherHungerModifier(weather: WeatherState): number {
  return weather.kind === "cold" ? 3 : weather.kind === "storm" ? 2 : 0;
}

export function createWorld(seed = 1, worldId = "first-winter", scenario: ScenarioConfig = FIRST_WINTER_SCENARIO): WorldState {
  const worldDefinition = createDefaultWorld();
  const riverbendWorld = createDefaultWorld("riverbend-world-v1");
  const villagers = names.map(([name, tradition], index) => ({
    id: `villager-${index + 1}`,
    name,
    tradition,
    hunger: 15 + (index % 4) * 4,
    rest: 75 - (index % 3) * 5,
    trust: 50,
    food: 2,
    activity: "rest" as const,
    location: locations[index % locations.length],
    beliefs: { cooperation: 50, selfReliance: 50, reflection: 50 },
    position: { x: 2 + (index % 6) * 4, y: 2 + Math.floor(index / 6) * 2 },
    route: [],
    settlementId: homeSettlement.id
  }));
  return {
    worldId,
    seed: seed >>> 0,
    tick: 0,
    season: 1,
    foodReserve: scenario.initialFood,
    scenario,
    sharedStore: { id: "shared-granary", status: "provisional", contributionRule: "Harvested food enters the common reserve.", distributionRule: "Food is distributed when a villager arrives at the granary.", contributions: 0, distributions: 0, dissent: 0 },
    dilemmaHistory: [],
    settlements: [
      { id: homeSettlement.id, name: homeSettlement.name, foodReserve: scenario.initialFood, worldDefinition, worldRuntime: { blockedObjectIds: [] }, villagerIds: villagers.map((villager) => villager.id) },
      { id: riverbendSettlement.id, name: riverbendSettlement.name, foodReserve: 48, worldDefinition: riverbendWorld, worldRuntime: { blockedObjectIds: [] }, villagerIds: [] }
    ],
    routes: [regionalRoute],
    tradeHistory: [],
    weather: initialWeather,
    hazards: [],
    villagers,
    worldDefinition,
    worldRuntime: { blockedObjectIds: [] },
    ...normalizeSpatialMetadata({ worldDefinition }),
    spatialModel: "structured-v1",
    simulationVersion: SIMULATION_VERSION,
    movementModel: MOVEMENT_MODEL
  };
}

export function advanceWorld(input: WorldState): { state: WorldState; events: WorldEvent[]; interpretations: SocialInterpretation[] } {
  let random = nextRandom(input.seed + input.tick);
  const weather = resolveWeather(input, input.tick + 1);
  const foodProduced = Math.max(0, (input.tick % input.scenario.harvestInterval === 0 ? input.scenario.harvestAmount : 3) + weatherFoodModifier(weather));
  const occupiedTargets = new Set<string>(input.villagers.map((villager, index) => {
    const position = villager.position ?? { x: 2 + (index % 6) * 4, y: 2 + Math.floor(index / 6) * 2 };
    return `${position.x},${position.y}`;
  }));
  const occupiedNextPositions = new Set<string>(input.villagers
    .filter((villager) => villager.travelPlan || (input.tick + 1 === 8 && villager.id === "villager-12"))
    .map((villager) => `${villager.position.x},${villager.position.y}`));
  let nextVillagers = input.villagers.map((villager, index) => {
    random = nextRandom(random + index);
    if (villager.travelPlan) {
      const arrived = villager.travelPlan.remainingTicks <= 1;
      occupiedNextPositions.add(`${villager.position.x},${villager.position.y}`);
      return {
        ...villager,
        settlementId: arrived ? villager.travelPlan.toSettlementId : villager.travelPlan.fromSettlementId,
        travelPlan: arrived ? undefined : { ...villager.travelPlan, remainingTicks: villager.travelPlan.remainingTicks - 1 },
        location: arrived ? "Riverbend" : "The River Road",
        activity: "travel" as const,
        position: arrived ? { x: 95, y: 95 } : villager.position,
        route: [villager.position],
        ...(arrived ? { destination: undefined, intendedActivity: undefined, targetLocation: undefined } : {})
      };
    }
    if (villager.settlementId !== HOME_SETTLEMENT.id) return { ...villager, activity: "rest" as const, location: "Riverbend", route: [villager.position], destination: undefined, intendedActivity: undefined, targetLocation: undefined };
    const needsFood = villager.hunger >= 45;
    const currentPosition = villager.position ?? { x: 2 + (index % 6) * 4, y: 2 + Math.floor(index / 6) * 2 };
    const continuing = villager.destination && !sameCell(currentPosition, villager.destination);
    const continuingActivity = villager.intendedActivity ?? "rest";
    const desiredActivity: Exclude<Activity, "travel"> = continuing ? (continuingActivity === "collect" && input.foodReserve === 0 ? "work" : continuingActivity) : (villager.food === 0 && input.foodReserve > 0 ? "collect" : villager.tradition === "Hearthkeepers" && needsFood && input.foodReserve > 0 ? "share" : needsFood ? "work" : random % 7 === 0 ? "craft" : random % 7 === 1 ? "meet" : random % 7 === 2 ? "gather" : "rest");
    const desiredLocation = continuing ? (villager.targetLocation ?? villager.location) : (desiredActivity === "work" ? "Fields" : desiredActivity === "share" || desiredActivity === "collect" ? "Granary" : desiredActivity === "craft" ? "Workshop" : desiredActivity === "meet" ? "Meeting Place" : desiredActivity === "gather" ? "Woodland" : "Homes");
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
    const proposedStep = fullRoute[Math.min(2, fullRoute.length - 1)] ?? currentPosition;
    const fallbackOffsets = [{ x: 0, y: 0 }, ...destinationOffsets.filter((offset) => offset.x !== 0 || offset.y !== 0)];
    const stepCandidates = [proposedStep, currentPosition, ...fallbackOffsets
      .filter((offset) => offset.x !== 0 || offset.y !== 0)
      .map((offset) => ({ x: currentPosition.x + offset.x, y: currentPosition.y + offset.y }))];
    const step = stepCandidates
      .find((candidate) => {
        const key = `${candidate.x},${candidate.y}`;
        return !occupiedNextPositions.has(key) && (!input.worldDefinition || isWalkable(input.worldDefinition, candidate, input.worldRuntime));
      }) ?? proposedStep;
    occupiedNextPositions.add(`${step.x},${step.y}`);
    const arrived = sameCell(step, target);
    const activity: Activity = arrived ? desiredActivity : "travel";
    const location = arrived ? desiredLocation : villager.location;
    const shouldShare = activity === "share" && villager.tradition === "Hearthkeepers" && needsFood && input.foodReserve > 0;
    const shouldCollect = activity === "collect" && input.foodReserve > 0;
    return {
      ...villager,
      hunger: bounded(villager.hunger + input.scenario.hungerPressure + weatherHungerModifier(weather) - (villager.food > 0 && activity !== "travel" ? 13 : 0) - (shouldShare ? 3 : 0)),
      rest: bounded(villager.rest + (activity === "rest" ? 7 : activity === "travel" ? -2 : -5)),
      trust: bounded(villager.trust + (shouldShare ? 2 : activity === "meet" ? 1 : (random % 9 === 0 ? -1 : 0))),
      food: shouldCollect ? villager.food + 2 : shouldShare ? villager.food : Math.max(0, villager.food - 1),
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
  const departureTick = 8;
  const travelerId = "villager-12";
  if (input.tick + 1 === departureTick) {
    nextVillagers = nextVillagers.map((villager) => villager.id === travelerId ? { ...villager, activity: "travel" as const, location: "The River Road", travelPlan: { routeId: regionalRoute.id, fromSettlementId: regionalRoute.fromSettlementId, toSettlementId: regionalRoute.toSettlementId, remainingTicks: regionalRoute.travelTicks } } : villager);
  }

  const sharingCount = nextVillagers.filter((villager) => villager.activity === "share").length;
  const meetingVillagers = nextVillagers.filter((villager) => villager.activity === "meet");
  const consumed = nextVillagers.filter((villager) => villager.food === 0).length;
  const collectionCount = nextVillagers.filter((villager) => villager.activity === "collect").length;
  const tradeArrivalTick = departureTick + regionalRoute.travelTicks;
  const tradeAmount = input.tick + 1 === tradeArrivalTick ? Math.min(6, Math.max(0, input.foodReserve + foodProduced - consumed - sharingCount)) : 0;
  const tradeRecord = tradeAmount > 0 ? {
    id: `trade-${input.tick + 1}-${regionalRoute.id}`,
    tick: input.tick + 1,
    routeId: regionalRoute.id,
    villagerId: travelerId,
    fromSettlementId: regionalRoute.fromSettlementId,
    toSettlementId: regionalRoute.toSettlementId,
    resource: "food" as const,
    amount: tradeAmount,
    summary: `Jonan carried ${tradeAmount} food from Hearthmere to Riverbend along the River Road.`
  } : null;
  const tradeHistory = tradeRecord ? [...(input.tradeHistory ?? []), tradeRecord] : (input.tradeHistory ?? []);
  const existingHazards = input.hazards ?? [];
  const newHazard = weather.kind === "storm" && !existingHazards.some((hazard) => hazard.kind === "bridge-washout" && hazard.status === "active") ? {
    id: `hazard-${input.tick + 1}-bridge-washout`,
    kind: "bridge-washout" as const,
    status: "active" as const,
    startedAtTick: input.tick + 1,
    routeId: regionalRoute.id,
    settlementId: HOME_SETTLEMENT.id,
    summary: "Storm water washed out the River Road bridge; cross-village travel is suspended."
  } : null;
  const hazards = newHazard ? [...existingHazards, newHazard] : existingHazards;
  const routes = (input.routes ?? [regionalRoute]).map((route) => newHazard?.routeId === route.id ? { ...route, status: "blocked" as const } : route);
  const resolvedDilemma = resolveDilemma(input, nextVillagers, input.tick + 1);
  const dilemmaVillagerIds = resolvedDilemma ? [nextVillagers[resolvedDilemma.applicantIndex].id, nextVillagers[resolvedDilemma.witnessIndex].id] : [];
  const dilemmaHistory = resolvedDilemma ? [...(input.dilemmaHistory ?? []), {
    id: `dilemma-${input.tick + 1}-${resolvedDilemma.dilemma.id}`,
    tick: input.tick + 1,
    dilemmaId: resolvedDilemma.dilemma.id,
    title: resolvedDilemma.dilemma.title,
    choiceId: resolvedDilemma.choice.id,
    choiceLabel: resolvedDilemma.choice.label,
    villagerIds: dilemmaVillagerIds,
    foodDelta: resolvedDilemma.consequences.foodDelta,
    trustDelta: resolvedDilemma.consequences.trustDelta,
    belief: resolvedDilemma.consequences.belief,
    beliefDelta: resolvedDilemma.consequences.beliefDelta,
    ...(resolvedDilemma.consequences.institutionStatus ? { institutionStatus: resolvedDilemma.consequences.institutionStatus } : {}),
    summary: resolvedDilemma.consequences.summary
  }] : (input.dilemmaHistory ?? []);
  const dilemmaAdjustedVillagers = resolvedDilemma ? nextVillagers.map((villager, index) => {
    if (index !== resolvedDilemma.applicantIndex && index !== resolvedDilemma.witnessIndex) return villager;
    const trustAdjustment = resolvedDilemma.consequences.trustDelta * (index === resolvedDilemma.applicantIndex ? 1 : 0.5);
    return { ...villager, trust: bounded(villager.trust + trustAdjustment), beliefs: { ...villager.beliefs, [resolvedDilemma.consequences.belief]: bounded(villager.beliefs[resolvedDilemma.consequences.belief] + resolvedDilemma.consequences.beliefDelta) } };
  }) : nextVillagers;
  const previousStore = input.sharedStore ?? createWorld(input.seed, input.worldId, input.scenario).sharedStore;
  const state: WorldState = {
    ...input,
    tick: input.tick + 1,
    seed: random,
    foodReserve: Math.max(0, input.foodReserve + foodProduced - consumed - sharingCount - nextVillagers.filter((villager) => villager.activity === "collect").length + (resolvedDilemma?.consequences.foodDelta ?? 0) - tradeAmount),
    sharedStore: { ...previousStore, status: resolvedDilemma?.consequences.institutionStatus ?? previousStore.status, contributions: previousStore.contributions + foodProduced, distributions: previousStore.distributions + sharingCount + collectionCount, dissent: previousStore.dissent + (resolvedDilemma?.consequences.dissentDelta ?? 0) },
    villagers: dilemmaAdjustedVillagers,
    dilemmaHistory,
    settlements: (input.settlements ?? []).map((settlement) => settlement.id === regionalRoute.fromSettlementId ? { ...settlement, foodReserve: Math.max(0, input.foodReserve + foodProduced - consumed - sharingCount - nextVillagers.filter((villager) => villager.activity === "collect").length + (resolvedDilemma?.consequences.foodDelta ?? 0) - tradeAmount), villagerIds: dilemmaAdjustedVillagers.filter((villager) => villager.settlementId === settlement.id).map((villager) => villager.id) } : settlement.id === regionalRoute.toSettlementId ? { ...settlement, foodReserve: settlement.foodReserve + tradeAmount, villagerIds: dilemmaAdjustedVillagers.filter((villager) => villager.settlementId === settlement.id).map((villager) => villager.id) } : { ...settlement, villagerIds: dilemmaAdjustedVillagers.filter((villager) => villager.settlementId === settlement.id).map((villager) => villager.id) }),
    routes,
    tradeHistory,
    weather,
    hazards
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
    ...(nextVillagers.some((villager) => villager.activity === "collect") ? [{
      id: `event-${state.tick}-collection`,
      tick: state.tick,
      kind: "collection" as const,
      message: `${nextVillagers.filter((villager) => villager.activity === "collect").map((villager) => villager.name).join(", ")} collected food at the granary.`,
      villagerIds: nextVillagers.filter((villager) => villager.activity === "collect").map((villager) => villager.id)
    }] : []),
    ...(foodProduced > 0 ? [{
      id: `event-${state.tick}-harvest`,
      tick: state.tick,
      kind: "harvest" as const,
      message: `${foodProduced} food was gathered from the village's work.`,
      villagerIds: []
    }] : []),
    ...((foodProduced > 0 || sharingCount > 0 || collectionCount > 0) ? [{
      id: `event-${state.tick}-institution`,
      tick: state.tick,
      kind: "institution" as const,
      message: `The shared granary recorded ${foodProduced} contribution${foodProduced === 1 ? "" : "s"} and ${sharingCount + collectionCount} distribution${sharingCount + collectionCount === 1 ? "" : "s"}.`,
      villagerIds: nextVillagers.filter((villager) => villager.activity === "share" || villager.activity === "collect").map((villager) => villager.id)
    }] : []),
    ...(resolvedDilemma ? [{
      id: `event-${state.tick}-dilemma`,
      tick: state.tick,
      kind: "dilemma" as const,
      message: `${resolvedDilemma.dilemma.title}: ${resolvedDilemma.choice.label}. ${resolvedDilemma.consequences.summary}`,
      villagerIds: dilemmaVillagerIds,
      dilemmaId: resolvedDilemma.dilemma.id,
      choiceId: resolvedDilemma.choice.id
    }] : []),
    ...(tradeRecord ? [{
      id: `event-${state.tick}-trade`,
      tick: state.tick,
      kind: "trade" as const,
      message: tradeRecord.summary,
      villagerIds: [tradeRecord.villagerId],
      settlementIds: [tradeRecord.fromSettlementId, tradeRecord.toSettlementId]
    }] : []),
    ...(weather.kind !== (input.weather ?? initialWeather).kind ? [{
      id: `event-${state.tick}-weather`,
      tick: state.tick,
      kind: "weather" as const,
      message: `Weather changed to ${weather.kind} (severity ${weather.severity}); forecast: ${weather.forecast}.`,
      villagerIds: []
    }] : []),
    ...(newHazard ? [{
      id: `event-${state.tick}-hazard`,
      tick: state.tick,
      kind: "hazard" as const,
      message: newHazard.summary,
      villagerIds: [],
      settlementIds: [newHazard.settlementId]
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
