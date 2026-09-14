import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeWorldBundle, type FirstGlowWorldBundle } from "@mimir/world-data";
import { applyFirstGlowStagingChoice } from "./first-glow-staging-effects.js";
import { buildFirstGlowInterpretationContext, createRulesOnlyFirstGlowInterpretation } from "./first-glow-interpretations.js";
import { createFirstGlowState } from "./structured.js";
import { recordFirstGlowWitnesses } from "./first-glow-social.js";

const bundlePath = resolve(dirname(fileURLToPath(import.meta.url)), "../../../assets/world/generated/sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601/world.json");
const bundle = decodeWorldBundle(JSON.parse(readFileSync(bundlePath, "utf8"))) as FirstGlowWorldBundle;
const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", 2);
state.pulse = 1;
const event = { id: "event-staging-1", kind: "draw" as const, actorId: "spark-1", participants: ["spark-1"], message: "A weakening pool is witnessed.", evidenceEventIds: [] };
state.events = [event];
recordFirstGlowWitnesses(state.social, [event.id], event.actorId, [], state.pulse);
const context = buildFirstGlowInterpretationContext(state, event);
assert(context);
const baseline = createRulesOnlyFirstGlowInterpretation(context);
const applied = applyFirstGlowStagingChoice(state, context, baseline);
assert.equal(applied.accepted, true);
assert.deepEqual(applied.changedFields, ["social"]);
assert.equal(applied.after.runtime.events.length, state.events.length);
assert.equal(applied.after.runtime.ledger.length, state.ledger.length);
assert.equal(applied.after.social.commitments.length, 1);
const expectedTrust = ["reveal-pool", "help-shelter", "make-mark-public", "stay-on-trace"].includes(baseline.alternativeId) ? 1 : -1;
assert.equal(applied.after.social.trust.find(item => item.sourceSparkId === "spark-1" && item.targetSparkId === "spark-2")?.value, expectedTrust);

const malformed = { ...baseline, alternativeId: "invented-alternative" } as unknown as typeof baseline;
const rejected = applyFirstGlowStagingChoice(state, context, malformed);
assert.equal(rejected.accepted, false);
assert.equal(rejected.rejection, "unsupported-alternative");
assert.deepEqual(rejected.changedFields, []);

console.log("First Glow staging effects tests passed");

