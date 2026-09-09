import assert from "node:assert/strict";

const bundleHash = "sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601";

export function validateEvidence(evidence) {
  assert.equal(evidence.bundleHash, bundleHash);
  assert.equal(evidence.simulationVersion, "mimir-sim-v3-first-glow");
  assert.equal(evidence.themeId, "living-circuit");
  assert.equal(evidence.ageId, "first-glow");
  assert.equal(evidence.sparkCount, 12);
  assert.equal(evidence.tickWorkload.ticks, 120);
  assert.ok(evidence.assetVersionCount >= 1);
  assert.ok(evidence.views.some(view => view.viewport === "1280x900" && view.deviceScaleFactor === 1));
  assert.ok(evidence.views.some(view => view.viewport === "390x844" && view.deviceScaleFactor === 2));
  for (const view of evidence.views) {
    assert.equal(view.horizontalOverflow, false);
    assert.ok(view.frame.frameP95Ms >= 0);
    assert.ok(view.frame.longTaskCount >= 0);
    assert.ok(view.frame.memoryGrowthBytes === null || view.frame.memoryGrowthBytes >= 0);
    assert.equal(view.canvasRecreatedBetweenTicks, false);
  }
  assert.equal(evidence.restoreChecks.requiredAssetFailure, "covered by packages/server/src/first-glow-backup.test.ts");
  return true;
}
