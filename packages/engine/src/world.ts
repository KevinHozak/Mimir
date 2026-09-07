export type TerrainKind = "grass" | "road" | "water";
export type WorldObjectKind = "house" | "tree" | "granary" | "bridge" | "workshop" | "field" | "meeting-hall" | "watchtower" | "shelter";

export const WORLD_SCHEMA_VERSION = 1 as const;
export const WORLD_BUNDLE_SCHEMA_VERSION = 1 as const;
export const SIMULATION_VERSION = "mimir-sim-v1" as const;

export interface MovementModel {
  id: "grid-tick-v1";
  unit: "simulation-tick";
  stepsPerTick: 2;
  actorFootprint: { width: 1; height: 1 };
  terrainCostMeaning: "positive-integer-steps";
}

export const MOVEMENT_MODEL: MovementModel = {
  id: "grid-tick-v1",
  unit: "simulation-tick",
  stepsPerTick: 2,
  actorFootprint: { width: 1, height: 1 },
  terrainCostMeaning: "positive-integer-steps"
};

export type SpatialModel = "structured-v1" | "legacy-backdrop-v0";

export interface SpatialSnapshotMetadata {
  spatialModel: SpatialModel;
  simulationVersion: string;
  movementModel: MovementModel;
}

export function normalizeSpatialMetadata(raw: Partial<SpatialSnapshotMetadata> & { worldDefinition?: WorldDefinition }): SpatialSnapshotMetadata {
  const legacy = !raw.worldDefinition && raw.spatialModel !== "structured-v1";
  return {
    spatialModel: raw.spatialModel ?? (legacy ? "legacy-backdrop-v0" : "structured-v1"),
    simulationVersion: raw.simulationVersion ?? (legacy ? "legacy-unknown" : SIMULATION_VERSION),
    movementModel: raw.movementModel ?? MOVEMENT_MODEL
  };
}

export interface WorldBundleReference {
  bundleId: string;
  schemaVersion: typeof WORLD_BUNDLE_SCHEMA_VERSION;
  contentHash: string;
  assetVersion: string;
}

export interface Cell { x: number; y: number; }

export interface TerrainDefinition {
  id: TerrainKind;
  movementCost: number;
  walkable: boolean;
}

export interface WorldObjectDefinition {
  id: WorldObjectKind;
  footprint: Cell[];
  interactionSlots: Cell[];
  blocksMovement: boolean;
  capacity?: number;
  activities?: string[];
}

export interface WorldObjectInstance {
  id: string;
  definitionId: WorldObjectKind;
  position: Cell;
}

export interface WorldDefinition {
  schemaVersion: typeof WORLD_SCHEMA_VERSION;
  id: string;
  bundle: WorldBundleReference;
  width: number;
  height: number;
  terrain: TerrainKind[][];
  objects: WorldObjectInstance[];
  definitions: Record<WorldObjectKind, WorldObjectDefinition>;
}

export interface WorldRuntimeState {
  blockedObjectIds: string[];
  walkableSurfaces?: { id: string; cells: Cell[]; movementCost: number; enabled: boolean }[];
  reservations?: { actorId: string; objectId: string; slotId: string }[];
}

export const DEFAULT_OBJECT_DEFINITIONS: Record<WorldObjectKind, WorldObjectDefinition> = {
  house: { id: "house", footprint: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }], interactionSlots: [{ x: 0, y: 2 }, { x: 1, y: 2 }], blocksMovement: true },
  tree: { id: "tree", footprint: [{ x: 0, y: 0 }], interactionSlots: [], blocksMovement: true },
  granary: { id: "granary", footprint: [{ x: 0, y: 0 }, { x: 1, y: 0 }], interactionSlots: [{ x: 0, y: 1 }, { x: 1, y: 1 }], blocksMovement: true },
  bridge: { id: "bridge", footprint: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }], interactionSlots: [], blocksMovement: false }
  ,workshop: { id: "workshop", footprint: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }], interactionSlots: [{ x: 0, y: 2 }, { x: 1, y: 2 }], blocksMovement: true, capacity: 4, activities: ["craft", "repair"] },
  field: { id: "field", footprint: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }], interactionSlots: [{ x: 1, y: 2 }], blocksMovement: false, capacity: 8, activities: ["work", "gather"] },
  "meeting-hall": { id: "meeting-hall", footprint: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }], interactionSlots: [{ x: 0, y: 2 }, { x: 1, y: 2 }], blocksMovement: true, capacity: 12, activities: ["meet"] },
  watchtower: { id: "watchtower", footprint: [{ x: 0, y: 0 }], interactionSlots: [{ x: 0, y: 1 }], blocksMovement: true, capacity: 2, activities: ["guard", "observe"] },
  shelter: { id: "shelter", footprint: [{ x: 0, y: 0 }, { x: 1, y: 0 }], interactionSlots: [{ x: 0, y: 1 }, { x: 1, y: 1 }], blocksMovement: true, capacity: 6, activities: ["rest", "shelter"] }
};

const terrainRules: Record<TerrainKind, TerrainDefinition> = {
  grass: { id: "grass", movementCost: 2, walkable: true },
  road: { id: "road", movementCost: 1, walkable: true },
  water: { id: "water", movementCost: 0, walkable: false }
};

export function cellKey(cell: Cell): string { return `${cell.x},${cell.y}`; }
export function sameCell(left: Cell, right: Cell): boolean { return left.x === right.x && left.y === right.y; }

function validateWorldStructure(world: WorldDefinition): void {
  if (world.schemaVersion !== WORLD_SCHEMA_VERSION || !world.id || !Number.isInteger(world.width) || !Number.isInteger(world.height) || world.width <= 0 || world.height <= 0) throw new Error("invalid world dimensions or schema");
  if (!world.bundle || world.bundle.schemaVersion !== WORLD_BUNDLE_SCHEMA_VERSION || !world.bundle.bundleId || !world.bundle.contentHash || !world.bundle.assetVersion) throw new Error("world bundle reference is invalid");
  if (world.terrain.length !== world.height || world.terrain.some((row) => row.length !== world.width)) throw new Error("terrain dimensions do not match world");
  for (const row of world.terrain) for (const tile of row) if (!terrainRules[tile]) throw new Error(`unknown terrain: ${tile}`);
  const objectIds = new Set<string>();
  for (const object of world.objects) {
    if (!object.id || objectIds.has(object.id) || !Number.isInteger(object.position.x) || !Number.isInteger(object.position.y)) throw new Error(`invalid or duplicate object ${object.id}`);
    objectIds.add(object.id);
    const definition = world.definitions[object.definitionId];
    if (!definition) throw new Error(`unknown object definition: ${object.definitionId}`);
    for (const offset of [...definition.footprint, ...definition.interactionSlots]) {
      const cell = { x: object.position.x + offset.x, y: object.position.y + offset.y };
      if (!inBounds(world, cell)) throw new Error(`object ${object.id} extends outside world`);
    }
  }
}

function hashCanonical(canonical: string): string {
  let hash = 2166136261;
  for (let index = 0; index < canonical.length; index += 1) { hash ^= canonical.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function canonicalWorld(world: WorldDefinition): string {
  return JSON.stringify({
    schemaVersion: world.schemaVersion,
    id: world.id,
    width: world.width,
    height: world.height,
    terrain: world.terrain,
    objects: [...world.objects].sort((left, right) => left.id.localeCompare(right.id)),
    definitions: Object.fromEntries(Object.entries(world.definitions).sort(([left], [right]) => left.localeCompare(right)))
  });
}

export function worldFingerprint(world: WorldDefinition): string {
  validateWorldStructure(world);
  return hashCanonical(canonicalWorld(world));
}

export function validateWorldDefinition(world: WorldDefinition): void {
  validateWorldStructure(world);
  if (world.bundle.contentHash !== worldFingerprint(world)) throw new Error("world bundle content hash does not match definition");
}

function finalizeWorld(world: Omit<WorldDefinition, "bundle">, assetVersion = "provisional-v1"): WorldDefinition {
  const withReference = { ...world, bundle: { bundleId: `${world.id}-bundle`, schemaVersion: WORLD_BUNDLE_SCHEMA_VERSION, contentHash: "pending", assetVersion } } as WorldDefinition;
  withReference.bundle.contentHash = worldFingerprint(withReference);
  return withReference;
}

export function parseWorldDefinition(raw: unknown): WorldDefinition {
  if (!raw || typeof raw !== "object") throw new Error("world definition must be an object");
  const world = raw as Partial<WorldDefinition>;
  if (world.schemaVersion !== WORLD_SCHEMA_VERSION || typeof world.id !== "string" || !world.bundle || !Array.isArray(world.terrain) || !Array.isArray(world.objects) || !world.definitions) throw new Error("world definition is missing required fields");
  const parsed = world as WorldDefinition;
  validateWorldDefinition(parsed);
  return parsed;
}

export interface TiledImportOptions {
  terrainByGid: Record<number, TerrainKind>;
  objectByType: Record<string, WorldObjectKind>;
  definitions?: Record<WorldObjectKind, WorldObjectDefinition>;
}

export function importTiledMap(raw: unknown, id: string, options: TiledImportOptions): WorldDefinition {
  if (!raw || typeof raw !== "object") throw new Error("Tiled map must be an object");
  const map = raw as { width?: number; height?: number; tilewidth?: number; tileheight?: number; layers?: unknown[] };
  if (!Number.isInteger(map.width) || !Number.isInteger(map.height) || !Number.isInteger(map.tilewidth) || map.tilewidth !== map.tileheight || !Array.isArray(map.layers)) throw new Error("unsupported Tiled map shape");
  const width = map.width as number; const height = map.height as number; const tileSize = map.tilewidth as number;
  const terrainLayer = map.layers.find((layer) => typeof layer === "object" && layer !== null && (layer as { type?: string }).type === "tilelayer") as { data?: unknown[] } | undefined;
  if (!terrainLayer || !Array.isArray(terrainLayer.data) || terrainLayer.data.length !== width * height) throw new Error("Tiled map needs a complete terrain tile layer");
  const terrain: TerrainKind[][] = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    const gid = terrainLayer.data![y * width + x];
    if (typeof gid !== "number" || !options.terrainByGid[gid]) throw new Error(`no terrain mapping for tile ${String(gid)}`);
    return options.terrainByGid[gid];
  }));
  const objectLayer = map.layers.find((layer) => typeof layer === "object" && layer !== null && (layer as { type?: string }).type === "objectgroup") as { objects?: unknown[] } | undefined;
  const objects: WorldObjectInstance[] = [];
  for (const rawObject of objectLayer?.objects ?? []) {
    if (!rawObject || typeof rawObject !== "object") throw new Error("invalid Tiled object");
    const object = rawObject as { id?: number; x?: number; y?: number; type?: string; class?: string };
    const key = object.class || object.type;
    const definitionId = key ? options.objectByType[key] : undefined;
    if (!Number.isInteger(object.id) || typeof object.x !== "number" || typeof object.y !== "number" || !definitionId) throw new Error("Tiled object needs an id, position, and mapped type");
    if (object.x % tileSize !== 0 || object.y % tileSize !== 0) throw new Error(`Tiled object ${object.id} is not aligned to the grid`);
    objects.push({ id: `tiled-${object.id}`, definitionId, position: { x: object.x / tileSize, y: object.y / tileSize } });
  }
  const world = finalizeWorld({ schemaVersion: WORLD_SCHEMA_VERSION, id, width, height, terrain, objects, definitions: options.definitions ?? DEFAULT_OBJECT_DEFINITIONS });
  validateWorldDefinition(world);
  return world;
}

export function inBounds(world: WorldDefinition, cell: Cell): boolean { return cell.x >= 0 && cell.y >= 0 && cell.x < world.width && cell.y < world.height; }

export type CellBlockReason = "out-of-bounds" | "terrain" | "solid-object" | "runtime-blocker";
export type CellQuery = { walkable: true; cost: number } | { walkable: false; reason: CellBlockReason; objectId?: string };

export function queryCell(world: WorldDefinition, cell: Cell, runtime: WorldRuntimeState = { blockedObjectIds: [] }): CellQuery {
  if (!Number.isInteger(cell.x) || !Number.isInteger(cell.y) || !inBounds(world, cell)) return { walkable: false, reason: "out-of-bounds" };
  for (const object of world.objects) {
    const definition = world.definitions[object.definitionId];
    const runtimeBlocked = runtime.blockedObjectIds.includes(object.id);
    if ((definition.blocksMovement || runtimeBlocked) && definition.footprint.some((offset) => sameCell(cell, { x: object.position.x + offset.x, y: object.position.y + offset.y }))) return { walkable: false, reason: runtimeBlocked ? "runtime-blocker" : "solid-object", objectId: object.id };
  }
  const surface = runtime.walkableSurfaces?.find((candidate) => candidate.enabled && candidate.cells.some((surfaceCell) => sameCell(surfaceCell, cell)));
  if (surface) return { walkable: true, cost: surface.movementCost };
  const definition = terrainRules[world.terrain[cell.y][cell.x]];
  return definition.walkable ? { walkable: true, cost: definition.movementCost } : { walkable: false, reason: "terrain" };
}

export function canTraverse(world: WorldDefinition, from: Cell, to: Cell, runtime: WorldRuntimeState = { blockedObjectIds: [] }): CellQuery | { walkable: false; reason: "non-adjacent" } {
  if (Math.abs(from.x - to.x) + Math.abs(from.y - to.y) !== 1) return { walkable: false, reason: "non-adjacent" };
  const start = queryCell(world, from, runtime); return start.walkable ? queryCell(world, to, runtime) : start;
}

export function isWalkable(world: WorldDefinition, cell: Cell, runtime?: WorldRuntimeState): boolean {
  return queryCell(world, cell, runtime).walkable;
}

function cost(world: WorldDefinition, cell: Cell, runtime: WorldRuntimeState = { blockedObjectIds: [] }): number { const result = queryCell(world, cell, runtime); return result.walkable ? result.cost : Infinity; }
function neighbors(cell: Cell): Cell[] { return [{ x: cell.x, y: cell.y - 1 }, { x: cell.x - 1, y: cell.y }, { x: cell.x + 1, y: cell.y }, { x: cell.x, y: cell.y + 1 }]; }
function distance(left: Cell, right: Cell): number { return Math.abs(left.x - right.x) + Math.abs(left.y - right.y); }

type RouteEntry = { cell: Cell; priority: number };

class RouteQueue {
  private entries: RouteEntry[] = [];

  private comesBefore(left: RouteEntry, right: RouteEntry): boolean {
    return left.priority < right.priority || (left.priority === right.priority && cellKey(left.cell).localeCompare(cellKey(right.cell)) < 0);
  }

  push(entry: RouteEntry): void {
    this.entries.push(entry);
    let index = this.entries.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.comesBefore(this.entries[parent], this.entries[index])) break;
      [this.entries[parent], this.entries[index]] = [this.entries[index], this.entries[parent]];
      index = parent;
    }
  }

  pop(): RouteEntry | undefined {
    const first = this.entries[0];
    const last = this.entries.pop();
    if (!first || !last) return first;
    if (this.entries.length > 0) {
      this.entries[0] = last;
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;
        if (left < this.entries.length && this.comesBefore(this.entries[left], this.entries[smallest])) smallest = left;
        if (right < this.entries.length && this.comesBefore(this.entries[right], this.entries[smallest])) smallest = right;
        if (smallest === index) break;
        [this.entries[index], this.entries[smallest]] = [this.entries[smallest], this.entries[index]];
        index = smallest;
      }
    }
    return first;
  }
}

export function findRoute(world: WorldDefinition, start: Cell, goal: Cell, runtime?: WorldRuntimeState): Cell[] | null {
  if (!isWalkable(world, start, runtime) || !isWalkable(world, goal, runtime)) return null;
  const open = new RouteQueue();
  open.push({ cell: start, priority: distance(start, goal) });
  const cameFrom = new Map<string, Cell>();
  const gScore = new Map([[cellKey(start), 0]]);
  const fScore = new Map([[cellKey(start), distance(start, goal)]]);
  while (true) {
    const entry = open.pop();
    if (!entry) break;
    const currentKey = cellKey(entry.cell);
    if (entry.priority !== fScore.get(currentKey)) continue;
    const current = entry.cell;
    if (sameCell(current, goal)) {
      const route = [current];
      while (cameFrom.has(cellKey(route[0]))) route.unshift(cameFrom.get(cellKey(route[0]))!);
      return route;
    }
    for (const next of neighbors(current)) {
      const edge = canTraverse(world, current, next, runtime);
      if (!edge.walkable) continue;
      const nextKey = cellKey(next);
      const candidate = gScore.get(cellKey(current))! + cost(world, next, runtime);
      if (candidate >= (gScore.get(nextKey) ?? Infinity)) continue;
      cameFrom.set(nextKey, current); gScore.set(nextKey, candidate); fScore.set(nextKey, candidate + distance(next, goal));
      open.push({ cell: next, priority: fScore.get(nextKey)! });
    }
  }
  return null;
}

export function setObjectBlocked(world: WorldDefinition, runtime: WorldRuntimeState, objectId: string, blocked: boolean): WorldRuntimeState {
  if (!world.objects.some((object) => object.id === objectId)) throw new Error(`unknown world object: ${objectId}`);
  const blockedIds = new Set(runtime.blockedObjectIds);
  if (blocked) blockedIds.add(objectId); else blockedIds.delete(objectId);
  return { blockedObjectIds: [...blockedIds].sort() };
}

export function createFixtureWorld(): WorldDefinition {
  const width = 12; const height = 10;
  const terrain = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => (y === 4 ? "road" : x === 6 ? "water" : "grass") as TerrainKind));
  terrain[4][6] = "road"; terrain[4][7] = "road";
  const world = finalizeWorld({ schemaVersion: WORLD_SCHEMA_VERSION, id: "fixture-v1", width, height, terrain, definitions: DEFAULT_OBJECT_DEFINITIONS, objects: [
    { id: "house-1", definitionId: "house", position: { x: 2, y: 2 } },
    { id: "tree-1", definitionId: "tree", position: { x: 9, y: 2 } },
    { id: "granary-1", definitionId: "granary", position: { x: 8, y: 6 } },
    { id: "bridge-1", definitionId: "bridge", position: { x: 6, y: 4 } }
  ] });
  validateWorldDefinition(world); return world;
}

export function createDefaultWorld(id = "first-winter-world-v1"): WorldDefinition {
  const width = 100; const height = 100;
  const terrain = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => (y === 50 || y === 25 || y === 75 ? "road" : x === 50 ? "water" : "grass") as TerrainKind));
  terrain[25][50] = "road"; terrain[25][51] = "road";
  terrain[50][50] = "road"; terrain[50][51] = "road";
  terrain[75][50] = "road"; terrain[75][51] = "road";
  const world = finalizeWorld({ schemaVersion: WORLD_SCHEMA_VERSION, id, width, height, terrain, definitions: DEFAULT_OBJECT_DEFINITIONS, objects: [
    { id: "house-1", definitionId: "house", position: { x: 12, y: 12 } },
    { id: "tree-1", definitionId: "tree", position: { x: 84, y: 12 } },
    { id: "granary-1", definitionId: "granary", position: { x: 47, y: 13 } },
    { id: "bridge-1", definitionId: "bridge", position: { x: 50, y: 50 } },
    { id: "house-2", definitionId: "house", position: { x: 12, y: 72 } },
    { id: "tree-2", definitionId: "tree", position: { x: 84, y: 78 } },
    { id: "bridge-2", definitionId: "bridge", position: { x: 50, y: 25 } },
    { id: "bridge-3", definitionId: "bridge", position: { x: 50, y: 75 } }
    ,{ id: "workshop-1", definitionId: "workshop", position: { x: 72, y: 16 } }
    ,{ id: "field-1", definitionId: "field", position: { x: 22, y: 66 } }
    ,{ id: "meeting-hall-1", definitionId: "meeting-hall", position: { x: 42, y: 46 } }
    ,{ id: "watchtower-1", definitionId: "watchtower", position: { x: 78, y: 58 } }
    ,{ id: "shelter-1", definitionId: "shelter", position: { x: 10, y: 48 } }
  ] });
  validateWorldDefinition(world); return world;
}
