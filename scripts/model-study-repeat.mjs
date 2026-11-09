import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { advanceWorld } from "@mimir/engine";
import { canonicalize } from "@mimir/world-data";
import { FirstGlowServerAIRuntime } from "../packages/server/dist/first-glow-ai-runtime.js";
import { createStudyWorld } from "./model-study-world.mjs";

assert.equal(process.argv.length, 3, "provide a completed v4 study directory");
const directory = resolve(process.argv[2]);
const manifestBytes = readFileSync("docs/model-study-protocol.json");
const manifest = JSON.parse(manifestBytes);
const report = JSON.parse(readFileSync(resolve(directory, "report.json")));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
assert.equal(report.protocolHash, hash(manifestBytes));
assert.equal(report.status, "complete");
assert.equal(manifest.protocolRevision, 4);
const bundle = JSON.parse(readFileSync(`assets/world/generated/${manifest.bundleId}/world.json`));
let calls = 0, checkpoints = 0;
globalThis.fetch = () => { throw new Error("network forbidden in deterministic repeat"); };
for (const plan of manifest.seeds) {
  let state = createStudyWorld(bundle, plan.seed);
  const expected = report.runs.find(run => run.seed === plan.seed && run.arm === "rules");
  const runtime = new FirstGlowServerAIRuntime({ requested: true, enabled: true, runtimeMode: "rules-only", rollout: "internal", providerId: "forbidden", model: "gemini-3.5-flash-lite", hardCapCents: 100, reason: "study", provider: { providerId: "forbidden", interpret: async () => { calls++; throw new Error("provider forbidden in rules repeat"); } } }, { interpretationTimeoutMs: 10000, rcAdmission: "event-rc-v1" });
  for (let pulse = 0; pulse <= 80; pulse++) {
    const checkpoint = expected.checkpoints.find(item => item.pulse === pulse);
    if (checkpoint) { assert.equal(hash(JSON.stringify(canonicalize(state))), checkpoint.hash, `determinism failed at seed ${plan.seed} pulse ${pulse}`); checkpoints++; }
    if (pulse === 80) break;
    const previous = new Set(state.firstGlowState.events.map(event => event.id));
    const advanced = advanceWorld(state, { eventAdmissionPolicy: "event-rc-v1" });
    const evaluated = await runtime.evaluate(advanced.state.firstGlowState, advanced.state.firstGlowState.events.filter(event => !previous.has(event.id)));
    state = evaluated.interpretations.length ? { ...advanced.state, firstGlowState: evaluated.state } : advanced.state;
  }
  console.log(`Repeated rules history seed ${plan.seed}: all saved checkpoint hashes match`);
}
assert.equal(calls, 0);
console.log(JSON.stringify({ seeds: 3, pulses: 240, checkpoints, providerCalls: calls, result: "deterministic-repeat-pass" }));
