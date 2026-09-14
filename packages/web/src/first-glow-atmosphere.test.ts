import assert from "node:assert/strict";
import { planFirstGlowAtmosphere } from "./first-glow-atmosphere.js";

const bundle = { objects: [
  { id: "pool", definitionId: "charge-pool", origin: { x: 2, y: 2 } },
  { id: "shelter", definitionId: "shelter-niche", origin: { x: 5, y: 2 } },
], surfaces: [{ id: "trace-main", enabled: true, cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }] }] };
const plan = planFirstGlowAtmosphere({ bundle, pulse: 4, selectedEntityId: "object:shelter", sparks: [{ id: "spark-1", position: { x: 2, y: 2 }, status: "interacting", destinationObjectId: "pool", remainingRoute: [{ x: 2, y: 1 }] }], events: [{ id: "event-4-share", pulse: 4, kind: "share", actorId: "spark-1", participants: ["spark-1"] }] });
assert.equal(plan.effects.find(effect => effect.id === "pool")?.state, "gathering");
assert.equal(plan.effects.find(effect => effect.id === "shelter")?.state, "selected");
assert.equal(plan.effects.find(effect => effect.kind === "route" && effect.cell.x === 2)?.state, "active");
assert.equal(plan.effects.find(effect => effect.kind === "event")?.state, "gathering");
assert.ok(plan.effects.length <= plan.budget);

const statePlan = planFirstGlowAtmosphere({ bundle: { objects: [...bundle.objects, { id: "trace", definitionId: "trace", origin: { x: 7, y: 2 } }], surfaces: bundle.surfaces }, pulse: 5, sparks: [{ id: "spark-2", position: { x: 5, y: 2 }, status: "waiting", destinationObjectId: "trace", remainingRoute: [] }], events: [{ id: "event-5-draw", pulse: 5, kind: "draw", actorId: "spark-2", message: "Spark 2 drew 0 charge." }], runtime: { objects: [{ objectId: "trace", blocked: true }], reservations: [] } });
assert.equal(statePlan.effects.find(effect => effect.id === "pool")?.state, "depleted");
assert.equal(statePlan.effects.find(effect => effect.id === "trace")?.state, "blocked-route");
assert.ok(statePlan.effects.some(effect => effect.kind === "route" && effect.state === "quiet"), "inactive trace substrate remains represented");
console.log("First Glow atmosphere fixture checks passed");
