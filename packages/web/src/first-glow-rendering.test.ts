import assert from "node:assert/strict";
import { firstGlowSparkDepth, firstGlowSparkScreenPosition, firstGlowSparkSignature } from "./first-glow-rendering.js";

assert.deepEqual(firstGlowSparkScreenPosition({ x: 4, y: 7 }), { x: 108, y: 180 });
assert.equal(firstGlowSparkDepth({ x: 4, y: 7 }), 170);
const signatures = ["spark-01", "spark-02", "spark-03", "spark-04"].map(firstGlowSparkSignature);
assert.ok(new Set(signatures).size >= 3, "stable Spark signatures should provide multiple silhouettes");
assert.deepEqual(signatures, [0, 1, 2, 3]);
console.log("First Glow rendering signature checks passed");
