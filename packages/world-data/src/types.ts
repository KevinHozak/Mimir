export const WORLD_DATA_SCHEMA_VERSION = 2 as const;
export const STRUCTURED_SPATIAL_MODEL = "structured-v2" as const;
export const SIMULATION_VERSION = "mimir-sim-v2" as const;
export const FIRST_GLOW_WORLD_SCHEMA_VERSION = 3 as const;
export const FIRST_GLOW_SIMULATION_VERSION = "mimir-sim-v3-first-glow" as const;
export const LIVING_CIRCUIT_THEME_ID = "living-circuit" as const;
export const FIRST_GLOW_AGE_ID = "first-glow" as const;

export type Cell = { x: number; y: number };
export type TerrainId = string;
export type SurfaceId = string;

export interface TerrainDefinition { id: TerrainId; walkable: boolean; movementCost?: number; visualAsset?: string; }
export interface SurfaceInstance { id: SurfaceId; cells: Cell[]; movementCost: number; enabled: boolean; visualAsset?: string; }
export interface InteractionSlot { id: string; offset: Cell; capacity: 1; }
export interface ObjectDefinition {
  id: string;
  footprint: Cell[];
  slots: InteractionSlot[];
  capabilities: string[];
  capacity: number;
  visualAsset?: string;
  groundContact: { x: number; y: number };
  blocksMovement: boolean;
  foreground?: boolean;
}
export interface ObjectInstance { id: string; definitionId: string; origin: Cell; orientation: 0; overrides?: Record<string, unknown>; }
export interface Spawn { id: string; cell: Cell; settlementId: string; entrance?: boolean; }
export interface AssetManifestEntry { path: string; sha256: string; mediaType: string; version: string; provenance?: string; }
export interface WorldBundleReference { bundleId: string; contentHash: string; schemaVersion: 2; assetVersion: string; }
export interface WorldBundle {
  schemaVersion: 2;
  spatialModel: typeof STRUCTURED_SPATIAL_MODEL;
  simulationVersion: typeof SIMULATION_VERSION;
  id: string;
  width: number;
  height: number;
  cellSizePx: number;
  terrain: TerrainId[][];
  terrainDefinitions: Record<string, TerrainDefinition>;
  surfaces: SurfaceInstance[];
  objectDefinitions: Record<string, ObjectDefinition>;
  objects: ObjectInstance[];
  layers: { id: string; role: "ground" | "surface" | "objects" | "foreground" | "spawns"; order: number }[];
  spawns: Spawn[];
  assets: AssetManifestEntry[];
  bundle: WorldBundleReference;
}
export type FirstGlowActivity = "seek-charge" | "draw-charge" | "share-charge" | "explore" | "mark-trace" | "seek-shelter" | "meet" | "shape-pattern" | "scavenge-cache" | "idle";
export type FirstGlowCapability = "charge-pool" | "shelter-niche" | "trace" | "relay-crossing" | "pattern-shard" | "light-mark" | "wild-cache";
export interface FirstGlowTerrainDefinition extends TerrainDefinition { label?: string; }
export interface FirstGlowObjectDefinition extends ObjectDefinition { capabilities: FirstGlowCapability[]; label: string; }
export interface FirstGlowWorldBundle {
  schemaVersion: 3;
  spatialModel: typeof STRUCTURED_SPATIAL_MODEL;
  simulationVersion: typeof FIRST_GLOW_SIMULATION_VERSION;
  themeId: typeof LIVING_CIRCUIT_THEME_ID;
  ageId: typeof FIRST_GLOW_AGE_ID;
  id: string;
  width: number;
  height: number;
  cellSizePx: number;
  terrain: string[][];
  terrainDefinitions: Record<string, FirstGlowTerrainDefinition>;
  surfaces: SurfaceInstance[];
  objectDefinitions: Record<string, FirstGlowObjectDefinition>;
  objects: ObjectInstance[];
  layers: { id: string; role: "ground" | "surface" | "objects" | "foreground" | "spawns"; order: number }[];
  spawns: Spawn[];
  assets: AssetManifestEntry[];
  bundle: { bundleId: string; contentHash: string; schemaVersion: 3; assetVersion: string };
}
export type DecodedWorldBundle = WorldBundle | FirstGlowWorldBundle;
export interface ObjectRuntimeState { objectId: string; blocked: boolean; }
export interface Reservation { actorId: string; objectId: string; slotId: string; }
export interface WorldRuntimeState {
  navigationRevision: number;
  objects: ObjectRuntimeState[];
  reservations: Reservation[];
}

export function isCell(value: unknown): value is Cell { return !!value && typeof value === "object" && Number.isInteger((value as Cell).x) && Number.isInteger((value as Cell).y); }
