import assert from "node:assert/strict";
import { recordedChronicleEvents } from "./chronicle-events.js";
import type { WorldEvent } from "@mimir/engine";
import { advanceWorld, buildChronicleEdition, createWorldV3, validateChronicleEdition } from "@mimir/engine";
import { routePatternFixture, routePatternFixtureBundle } from "../../engine/dist/first-glow-route-patterns-fixture.js";

const old: WorldEvent = { id: "shared-id", pulse: 2, kind: "sharing", message: "Recorded outcome", villagerIds: [] };
const before = JSON.stringify(old);
const recovered = recordedChronicleEvents([old], [{ pulse: 2, events: [{ id: old.id, kind: "share", actorId: "spark-6", participants: ["spark-6", "spark-2"], message: old.message }] }]);
assert.equal(recovered[0].actorId, "spark-6");
assert.deepEqual(recovered[0].participants, ["spark-6", "spark-2"]);
assert.equal(recovered[0].kind, "share");
assert.equal(JSON.stringify(old), before);
const unrelated = recordedChronicleEvents([old], [{ pulse: 3, events: [{ id: old.id, kind: "share", actorId: "future", message: "future" }] }]);
assert.equal(unrelated[0].actorId, undefined);
assert.equal(recordedChronicleEvents([{ ...old, actorId: "spark-6", structuredKind: "share" }], [])[0].kind, "share");
console.log("Read-only checkpoint attribution and pulse boundaries passed");

let world = createWorldV3(routePatternFixtureBundle, 2, "persisted-pattern", 2);
world.firstGlowState = routePatternFixture();
const persisted: WorldEvent[] = [];
for (let pulse = 1; pulse <= 18; pulse++) {
  const result = advanceWorld(world); world = result.state;
  persisted.push(...JSON.parse(JSON.stringify(result.events)) as WorldEvent[]);
}
const glow = world.firstGlowState, pattern = glow.routePatterns!.patterns[0], reader = pattern.encounters[0];
const chronicleInput = { timelineId: "persisted-pattern", cutoffPulse: 18, revision: 1, selectedSparkId: "spark-2", events: recordedChronicleEvents(persisted, []), interpretations: [], explanations: glow.explanations, history: glow.history!, sparkNames: { "spark-1": "Spark 1", "spark-2": "Spark 2" }, bundleHash: routePatternFixtureBundle.bundle.contentHash };
const edition = buildChronicleEdition(chronicleInput);
validateChronicleEdition(edition, chronicleInput);
const lasting = edition.chapters.find(chapter => chapter.kind === "personal")!.journey!.find(item => item.label === "Lasting route pattern")!;
assert.deepEqual(new Set(lasting.evidence.map(ref => ref.id)), new Set([pattern.creationEventId, reader.eventId, reader.use!.eventId, reader.use!.outcomeEventId]));
assert.equal(lasting.evidence.some(ref => ref.id === pattern.sourceEventIds[0]), false);
console.log("Persisted route-pattern creation, encounter, use and outcome provenance passed");
