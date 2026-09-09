import assert from "node:assert/strict";
import { validateEvidence } from "./first-glow-art-validation-schema.mjs";

const base = { bundleHash: "sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601", simulationVersion: "mimir-sim-v3-first-glow", themeId: "living-circuit", ageId: "first-glow", sparkCount: 12, assetVersionCount: 1, tickWorkload: { ticks: 120 }, views: [{ viewport: "1280x900", deviceScaleFactor: 1, horizontalOverflow: false, canvasRecreatedBetweenTicks: false, frame: { frameP95Ms: 10, longTaskCount: 0, memoryGrowthBytes: 0 } }, { viewport: "390x844", deviceScaleFactor: 2, horizontalOverflow: false, canvasRecreatedBetweenTicks: false, frame: { frameP95Ms: 10, longTaskCount: 0, memoryGrowthBytes: 0 } }], restoreChecks: { requiredAssetFailure: "covered by packages/server/src/first-glow-backup.test.ts" } };
assert.equal(validateEvidence(base), true);
assert.throws(() => validateEvidence({ ...base, views: [{ ...base.views[0], horizontalOverflow: true }, base.views[1]] }), /false/);
assert.throws(() => validateEvidence({ ...base, tickWorkload: { ticks: 24 } }), /120/);
console.log("First Glow art validation evidence schema checks passed");
