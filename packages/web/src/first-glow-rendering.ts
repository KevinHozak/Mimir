import type { Cell } from "@mimir/engine";
import { firstGlowGroundDepth } from "./first-glow-scene.js";

export const firstGlowSparkScreenPosition = (cell: Cell, tileSize = 24) => ({ x: cell.x * tileSize + tileSize / 2, y: cell.y * tileSize + tileSize / 2 });
export const firstGlowSparkDepth = (cell: Cell) => firstGlowGroundDepth(cell) + 80;

export const FIRST_GLOW_SPARK_SIGNATURES = ["ring", "diamond", "triangle", "double-dot", "cross", "hex"] as const;
export type FirstGlowSparkSignature = typeof FIRST_GLOW_SPARK_SIGNATURES[number];

export type FirstGlowSparkVisual = {
  signature: FirstGlowSparkSignature;
  accent: "ice" | "cyan" | "violet";
  motion: "hover" | "orbit" | "pulse" | "drift";
};

const stableHash = (value: string) => [...value].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 7);

export const firstGlowSparkVisual = (id: string): FirstGlowSparkVisual => {
  const hash = stableHash(id);
  return {
    signature: FIRST_GLOW_SPARK_SIGNATURES[hash % FIRST_GLOW_SPARK_SIGNATURES.length],
    accent: (["ice", "cyan", "violet"] as const)[hash % 3],
    motion: (["hover", "orbit", "pulse", "drift"] as const)[(hash >>> 5) % 4],
  };
};

export const firstGlowSparkState = (activity: string, status: string, readiness: number, chargeDeficit: number) => {
  if (status === "waiting") return "blocked" as const;
  if (status === "interacting" && (activity === "meet" || activity === "share-charge")) return "gathering" as const;
  if (readiness < 45 || chargeDeficit > 0) return "low-charge" as const;
  if (status === "traveling") return "traversing" as const;
  if (activity === "draw-charge" || activity === "share-charge") return "charging" as const;
  if (activity === "explore" || activity === "shape-pattern" || activity === "mark-trace") return "exploring" as const;
  if (activity === "idle") return "sheltering" as const;
  return "idle" as const;
};
