import type { Cell } from "@mimir/engine";
import { firstGlowGroundDepth } from "./first-glow-scene.js";

export const firstGlowSparkScreenPosition = (cell: Cell, tileSize = 24) => ({ x: cell.x * tileSize + tileSize / 2, y: cell.y * tileSize + tileSize / 2 });
export const firstGlowSparkDepth = (cell: Cell) => firstGlowGroundDepth(cell) + 80;
