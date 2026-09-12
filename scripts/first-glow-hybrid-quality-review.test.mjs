import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildFirstGlowHybridQualityReport } from "./first-glow-hybrid-quality-review.mjs";

const artifact = JSON.parse(readFileSync(resolve(".tmp/ai-p6-gemini-evaluation.json"), "utf8"));

const report = buildFirstGlowHybridQualityReport(artifact);
assert.equal(report.design.matchedEncounters, 16);
assert.equal(report.design.perSparkDailyLimit, 4);
assert.equal(report.cost.providerCalls, 8);
assert.equal(report.cost.actualCostCents, 0.06272);
assert.equal(report.results.flashLite.hiddenKnowledgeLeakage, 0);
assert.equal(report.results.flashLite.simulationAuthorityViolations, 0);
assert.equal(report.replay.historicalReplayProviderCalls, 0);
assert.equal(report.decision, "defer");
assert.equal(report.acceptance.hiddenKnowledgeLeakageZero, true);
assert.equal(report.acceptance.simulationAuthorityViolationsZero, true);
assert.equal(report.acceptance.historicalReplayProviderFree, true);
console.log("AI-P7 hybrid quality review test passed");

