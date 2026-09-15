import assert from "node:assert/strict";
import { summarizeScenarioTelemetry } from "./rc-p4-telemetry.mjs";

const telemetry = [{ latencyMs: 100, inputTokens: 10, outputTokens: 2, costCents: 1 }];
const first = summarizeScenarioTelemetry(telemetry, 0);
const start = telemetry.length;
telemetry.push({ latencyMs: 200, inputTokens: 20, outputTokens: 3, costCents: 2 });
const second = summarizeScenarioTelemetry(telemetry, start);
assert.deepEqual(second, { latencyMs: 200, inputTokens: 20, outputTokens: 3, costCents: 2 });
assert.equal(first.costCents + second.costCents, 3);
assert.deepEqual(summarizeScenarioTelemetry(undefined), { latencyMs: 0, inputTokens: 0, outputTokens: 0, costCents: 0 });
assert.equal(summarizeScenarioTelemetry(telemetry, telemetry.length).costCents, 0);
console.log("RC-P4 scenario telemetry isolation passed.");
