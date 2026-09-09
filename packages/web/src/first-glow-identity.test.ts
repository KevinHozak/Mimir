import assert from "node:assert/strict";
import { firstGlowSparkState, firstGlowSparkVisual } from "./first-glow-rendering.js";

const visuals = Array.from({ length: 12 }, (_, index) => firstGlowSparkVisual(`spark-${index + 1}`));
assert.deepEqual(firstGlowSparkVisual("spark-1"), firstGlowSparkVisual("spark-1"), "a Spark signature must be stable");
assert.ok(new Set(visuals.slice(0, 6).map(visual => visual.signature)).size >= 4, "six Sparks need distinct silhouettes");
assert.ok(new Set(visuals.slice(0, 6).map(visual => visual.accent)).size >= 2, "signatures need restrained accent variation");
assert.equal(firstGlowSparkState("explore", "choosing", 100, 0), "exploring");
assert.equal(firstGlowSparkState("idle", "idle", 100, 0), "sheltering");
assert.equal(firstGlowSparkState("seek-charge", "traveling", 100, 0), "traversing");
assert.equal(firstGlowSparkState("draw-charge", "interacting", 100, 0), "charging");
assert.equal(firstGlowSparkState("meet", "interacting", 100, 0), "gathering");
assert.equal(firstGlowSparkState("seek-charge", "waiting", 100, 0), "blocked");
assert.equal(firstGlowSparkState("seek-charge", "choosing", 40, 0), "low-charge");
console.log("First Glow Spark identity fixtures passed");
