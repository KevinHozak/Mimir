import assert from "node:assert/strict";
import { firstGlowSparkDepth, firstGlowSparkScreenPosition, firstGlowSparkVisual } from "./first-glow-rendering.js";

assert.deepEqual(firstGlowSparkScreenPosition({ x: 4, y: 7 }), { x: 108, y: 180 });
assert.equal(firstGlowSparkDepth({ x: 4, y: 7 }), 170);
const signatures = ["spark-01", "spark-02", "spark-03", "spark-04"].map(id => firstGlowSparkVisual(id).signature);
assert.ok(new Set(signatures).size >= 3, "stable Spark signatures should provide multiple silhouettes");
assert.deepEqual(signatures, ["triangle", "double-dot", "cross", "hex"]);
console.log("First Glow rendering signature checks passed");
