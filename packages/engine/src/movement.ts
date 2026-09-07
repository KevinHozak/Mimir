import { canTraverse, queryCell, type Cell, type WorldDefinition, type WorldRuntimeState } from "./world.js";

export type MovementStatus = "choosing" | "traveling" | "waiting" | "interacting" | "idle";
export interface MovementState { position: Cell; remainingRoute: Cell[]; remainingCost: number; status: MovementStatus; plannedNavigationRevision: number; waitReason?: string; }
export interface MovementStep { state: MovementState; committedCells: Cell[]; spentCost: number; }

export function advanceMovement(world: WorldDefinition, runtime: WorldRuntimeState, input: MovementState, budget = 2): MovementStep {
  let state = { ...input, remainingRoute: input.remainingRoute.map(cell => ({ ...cell })) }; const committedCells: Cell[] = [{ ...state.position }]; let spentCost = 0; let remainingBudget = budget;
  if (state.status === "waiting" && state.waitReason) return { state, committedCells, spentCost };
  state.status = state.remainingRoute.length > 0 ? "traveling" : "idle"; delete state.waitReason;
  while (remainingBudget > 0 && state.remainingRoute.length > 0) {
    const next = state.remainingRoute[0]; const edge = canTraverse(world, state.position, next, runtime);
    if (!edge.walkable) { state.status = "waiting"; state.waitReason = edge.reason; return { state, committedCells, spentCost }; }
    const cell = queryCell(world, next, runtime); if (!cell.walkable) { state.status = "waiting"; state.waitReason = cell.reason; return { state, committedCells, spentCost }; }
    if (state.remainingCost <= 0) state.remainingCost = cell.cost;
    const debit = Math.min(remainingBudget, state.remainingCost); state.remainingCost -= debit; remainingBudget -= debit; spentCost += debit;
    if (state.remainingCost > 0) break;
    state.position = { ...next }; state.remainingRoute.shift(); committedCells.push({ ...state.position });
  }
  if (state.remainingRoute.length === 0 && state.remainingCost === 0) state.status = "interacting";
  return { state, committedCells, spentCost };
}
