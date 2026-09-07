export const WORLD_DATA_SCHEMA_VERSION = 2 as const;
export const STRUCTURED_SPATIAL_MODEL = "structured-v2" as const;
export const SIMULATION_VERSION = "mimir-sim-v2" as const;

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
export interface ObjectRuntimeState { objectId: string; blocked: boolean; }
export interface Reservation { actorId: string; objectId: string; slotId: string; }
export interface WorldRuntimeState {
  navigationRevision: number;
  objects: ObjectRuntimeState[];
  reservations: Reservation[];
}

export function isCell(value: unknown): value is Cell { return !!value && typeof value === "object" && Number.isInteger((value as Cell).x) && Number.isInteger((value as Cell).y); }
