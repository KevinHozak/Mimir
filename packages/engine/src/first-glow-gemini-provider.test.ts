import assert from "node:assert/strict";
import test from "node:test";
import { createFirstGlowGeminiFlashLiteProvider, createFirstGlowVertexGeminiPilotProvider } from "./first-glow-gemini-provider.js";
import type { FirstGlowInterpretationContext } from "./first-glow-interpretations.js";
const context = { schemaVersion: 2, personalityProfileVersion: 1, encounterId: "encounter-1-event-1", contextHash: "sha256-context", pulse: 1, event: { id: "event-1", kind: "draw", actorId: "spark-1", participants: ["spark-1"], message: "A pool dims.", evidenceEventIds: ["event-1"] }, dilemmaId: "weakening-pool-report", supportedAlternatives: ["reveal-pool", "withhold-pool"], actorSparkId: "spark-1", personalityProfile: { profileVersion: 1, sparkId: "spark-1", name: "Lumen", valueTendencies: ["care"], practicalNeeds: ["charge"], relevantRelationships: [], knowledgeBoundary: { knows: ["event-1"], doesNotKnow: ["why"] }, description: "Notices dimming Sparks.", openingQuestion: "Who needs help?" }, witnessedEvidenceEventIds: ["event-1"], communicatedEvidenceEventIds: [], uncertainInferenceEvidenceEventIds: [] } as unknown as FirstGlowInterpretationContext;
test("Gemini adapter records bounded output and metadata without putting the key in the body", async () => {
  let seenBody = "";
  const provider = createFirstGlowGeminiFlashLiteProvider({ apiKey: "secret-test-key", projectId: "isolated-project", accountId: "approved-account", hardCapCents: 1, killSwitch: "enabled", fetchImpl: async (_url, init) => { seenBody = String(init?.body); return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ alternativeId: "reveal-pool", claim: "plausible-choice", summary: "The witnessed dimming supports a warning.", evidenceEventIds: ["event-1"] }) }] } }], usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 12 } }), { status: 200 }); } });
  assert.deepEqual(await provider.interpret(context), { alternativeId: "reveal-pool", claim: "plausible-choice", summary: "The witnessed dimming supports a warning.", evidenceEventIds: ["event-1"] });
  assert.equal(seenBody.includes("secret-test-key"), false); assert.equal(provider.telemetry[0].model, "gemini-2.5-flash-lite"); assert.equal(provider.telemetry[0].outcome, "recorded");
});
test("Gemini adapter fails closed for a disabled kill switch or invalid cap", () => { assert.throws(() => createFirstGlowGeminiFlashLiteProvider({ apiKey: "key", projectId: "project", accountId: "account", hardCapCents: 1, killSwitch: "disabled" as never }), /kill switch/); assert.throws(() => createFirstGlowGeminiFlashLiteProvider({ apiKey: "key", projectId: "project", accountId: "account", hardCapCents: 0, killSwitch: "enabled" }), /hard cap/); });

test("Vertex pilot requires the explicit P11 contract", () => {
  const base = { accessToken: "token", projectId: "mimir-realm", accountId: "observer@example.com", hardCapCents: 100, killSwitch: "enabled" as const };
  assert.throws(() => createFirstGlowVertexGeminiPilotProvider({ ...base, runtimeMode: "rules-only" as never, billingMode: "vertex-ai", dataPolicy: "spark-local-minimized" }), /bounded-internal-pilot/);
  assert.throws(() => createFirstGlowVertexGeminiPilotProvider({ ...base, runtimeMode: "bounded-internal-pilot", billingMode: "vertex-ai", dataPolicy: "spark-local-minimized", hardCapCents: 4 }), /\$1.00/);
  assert.throws(() => createFirstGlowVertexGeminiPilotProvider({ ...base, runtimeMode: "bounded-internal-pilot", billingMode: "vertex-ai", dataPolicy: "spark-local-minimized", maxOutputTokens: 256 }), /128 tokens/);
});
