import type { Cell } from "./coordinates";
export interface DebugCell { cell: Cell; walkable: boolean; cost?: number; reason?: string; objectId?: string; }
export interface DebugMarker { kind: "object" | "slot" | "spawn" | "reservation"; id: string; cell: Cell; label: string; }
export function debugLegend(): Record<string, string> { return { walkable: "#b9df8b", terrain: "#6d96ad", "solid-object": "#c96d68", "runtime-blocker": "#8f3349", "out-of-bounds": "#4b435b" }; }
