import { queryCell, type Cell } from "@mimir/engine";

export const firstGlowGroundDepth = (cell: Cell) => 20 + cell.y * 10;
export function firstGlowCellQuery(bundle: Parameters<typeof queryCell>[0], runtime: Parameters<typeof queryCell>[1] | undefined, cell: Cell) {
  return queryCell(bundle, runtime ?? { navigationRevision: 0, objects: [], reservations: [] }, cell);
}
export function firstGlowBlockedSummary(bundle: Parameters<typeof queryCell>[0], runtime: Parameters<typeof queryCell>[1] | undefined): string {
  const counts = new Map<string, number>();
  for (let y = 0; y < bundle.height; y += 1) for (let x = 0; x < bundle.width; x += 1) { const result = firstGlowCellQuery(bundle, runtime, { x, y }); if (!result.walkable) counts.set(result.reason, (counts.get(result.reason) ?? 0) + 1); }
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([reason, count]) => `${reason}:${count}`).join(" · ") || "none";
}
