export type Cell = { x: number; y: number };
export function cellToWorld(cell: Cell, cellSize: number): { x: number; y: number } { return { x: cell.x * cellSize + cellSize / 2, y: cell.y * cellSize + cellSize / 2 }; }
export function worldToCell(point: { x: number; y: number }, cellSize: number): Cell { return { x: Math.floor(point.x / cellSize), y: Math.floor(point.y / cellSize) }; }
