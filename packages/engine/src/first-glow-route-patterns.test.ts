import assert from "node:assert/strict";
import test from "node:test";
import { validateFirstGlowState, type FirstGlowState } from "./structured.js";
import { advanceFirstGlow } from "./first-glow-actions.js";
import { initializeRoutePatterns } from "./first-glow-route-patterns.js";
import { routePatternFixture as opening, routePatternFixtureBundle as bundle } from "./first-glow-route-patterns-fixture.js";
import { buildChronicleEdition } from "./chronicle.js";


function run(initial: FirstGlowState, count = 24, restart = false) {
  let state = initial;
  const events: FirstGlowState["events"] = [], checkpoints: FirstGlowState[] = [];
  for (let i = 0; i < count; i++) {
    state = advanceFirstGlow(restart && i === 12 ? JSON.parse(JSON.stringify(state)) : state, { sourceCharge: i % 4 === 0 ? 24 : 0 });
    events.push(...state.events.map(event => ({ ...event, pulse: state.pulse })));
    checkpoints.push(state);
  }
  return { state, events, checkpoints };
}

test("a real probe and shard completion create a durable public pattern before another Spark encounters and uses it", () => {
  const initial = opening(), before = JSON.stringify(initial), result = run(initial);
  assert.equal(JSON.stringify(initial), before);
  const pattern = result.state.routePatterns!.patterns.find(pattern => pattern.creatorId === "spark-1")!;
  assert.ok(pattern); assert.equal(pattern.public, true); assert.equal(pattern.createdPulse, 9);
  assert.equal(result.checkpoints[7].routePatterns!.patterns.length, 0);
  assert.equal(result.checkpoints[8].routePatterns!.patterns[0].encounters.length, 0);
  assert.equal(result.checkpoints[8].social.trust.some(item => item.evidenceEventIds.some(id => pattern.sourceEventIds.includes(id) || id === pattern.creationEventId)), false);
  const reader = pattern.encounters.find(item => item.sparkId === "spark-2")!;
  assert.ok(reader); assert.ok(reader.pulse > pattern.createdPulse);
  assert.ok(reader.use); assert.ok(reader.use.pulse > reader.pulse);
  assert.ok(reader.use.outcomeEventId);
  const outcome = result.events.find(event => event.id === reader.use!.outcomeEventId)!;
  assert.match(outcome.message, /reached Wild Cache/);
  assert.ok(result.events.find(event => event.id === reader.eventId)!.evidenceEventIds!.includes(pattern.creationEventId));
  assert.ok(result.events.find(event => event.id === reader.use!.eventId)!.evidenceEventIds!.includes(reader.eventId));
  assert.ok(outcome.evidenceEventIds!.includes(reader.use.eventId));
  assert.equal(result.checkpoints[reader.use.pulse - 1].settlements[0].sparks[1].intendedActivity, "scavenge-cache");
  const withoutPattern = run(opening(32, false), reader.use.pulse);
  assert.equal(withoutPattern.state.settlements[0].sparks[1].intendedActivity, "explore");
  assert.equal(result.checkpoints[8].social.knowledge.find(item => item.sparkId === "spark-2")!.witnessedFacts.some(fact => pattern.sourceEventIds.includes(fact.eventId)), false);
  assert.equal(result.state.settlements[0].sparks[1].knownEvidenceEventIds.includes(pattern.sourceEventIds[0]), false);
  assert.ok(result.checkpoints.some(state => state.ledger.some(entry => entry.actorId === "spark-2" && entry.reason === "activity-sustenance")));
  assert.deepEqual(JSON.parse(JSON.stringify(result)), JSON.parse(JSON.stringify(run(opening(), 24, true))));
});

test("need can decline the encountered pattern, retaining the artifact without claiming use or benefit", () => {
  const result = run(opening(0), 15), pattern = result.state.routePatterns!.patterns[0], reader = pattern.encounters.find(item => item.sparkId === "spark-2")!;
  assert.ok(reader.decline); assert.equal(reader.use, undefined);
  assert.match(reader.decline.reason, /seek-charge/);
  assert.equal(result.events.filter(event => event.id === reader.decline!.eventId).length, 1);
  assert.equal(result.events.some(event => event.actorId === "spark-2" && /-use$/.test(event.id)), false);
  assert.equal(pattern.creationEventId, result.checkpoints[8].routePatterns!.patterns[0].creationEventId);
});

test("no physical encounter means no route knowledge or route-pattern use", () => {
  const result = run(opening(32, true, false), 15), pattern = result.state.routePatterns!.patterns[0];
  assert.equal(pattern.encounters.some(item => item.sparkId === "spark-2"), false);
  assert.equal(result.events.some(event => event.actorId === "spark-2" && event.kind === "route-pattern"), false);
});

test("untagged histories retain their old rule; initialization cannot retrofit a recorded history", () => {
  const result = run(opening(32, false), 15);
  assert.equal(result.state.routePatterns, undefined);
  assert.equal(result.events.some(event => event.kind === "route-pattern"), false);
  assert.throws(() => initializeRoutePatterns(result.state), /fresh history/);
  const state = opening(); assert.throws(() => initializeRoutePatterns(state), /fresh history/);
});

test("a stale route is declined and malformed provenance is rejected", () => {
  const history = run(opening(), 10), state = structuredClone(history.state), pattern = state.routePatterns!.patterns[0];
  assert.ok(pattern.encounters.length);
  state.settlements[0].runtime.navigationRevision++;
  const next = advanceFirstGlow(state);
  assert.match(next.routePatterns!.patterns[0].encounters[0].decline!.reason, /stale/);
  const corrupt = structuredClone(history.state); corrupt.routePatterns!.patterns[0].encounters[0].pulse = 1;
  assert.throws(() => validateFirstGlowState(corrupt), /Invalid route pattern encounter/);
  const forged = structuredClone(history.checkpoints[8]);
  forged.settlements[0].sparks[1].routePatternTargetObjectId = forged.routePatterns!.patterns[0].targetObjectId;
  assert.throws(() => validateFirstGlowState(forged), /Invalid route pattern target/);
  const unknown = structuredClone(history.state); (unknown.routePatterns as { version: string }).version = "unknown";
  assert.throws(() => validateFirstGlowState(unknown), /Unsupported route pattern policy/);
});

test("loss of the recorded destination during travel records interruption instead of success", () => {
  const initial = run(opening(), 11).state, reader = initial.settlements[0].sparks[1];
  assert.ok(reader.routePatternUse);
  // A declared later instruction changes the goal; the route-use outcome must stay truthful.
  reader.intendedActivity = "seek-charge";
  reader.destinationObjectId = undefined; reader.destinationSlotId = undefined;
  reader.destinationCell = undefined; reader.remainingRoute = []; reader.status = "choosing";
  initial.settlements[0].runtime.reservations = initial.settlements[0].runtime.reservations.filter(item => item.actorId !== reader.id);
  reader.carriedCharge = 0;
  const next = advanceFirstGlow(initial), encounter = next.routePatterns!.patterns[0].encounters[0];
  assert.ok(encounter.use!.outcomeEventId);
  assert.match(next.events.find(event => event.id === encounter.use!.outcomeEventId)!.message, /interrupted/);
  assert.equal(next.settlements[0].sparks[1].routePatternUse, undefined);
});

test("Chronicle links an encountered pattern's actual use and later arrival without exposing creator-private evidence", () => {
  const result = run(opening(), 24), pattern = result.state.routePatterns!.patterns[0], encounter = pattern.encounters.find(item => item.sparkId === "spark-2")!, use = encounter.use!;
  const usePulse = use.pulse, state = result.checkpoints[usePulse - 1];
  const edition = buildChronicleEdition({ timelineId: "fresh-route-pattern", cutoffPulse: usePulse, revision: 1, selectedSparkId: "spark-2", events: result.events, interpretations: [], history: state.history!, explanations: result.state.explanations.filter(item => item.id === `explanation-${use.eventId}`), sparkNames: { "spark-1": "Spark 1", "spark-2": "Spark 2" }, bundleHash: bundle.bundle.contentHash });
  const journey = edition.chapters.find(chapter => chapter.kind === "personal")!.journey!;
  assert.ok(journey.some(item => item.text.includes("Use the encountered route pattern")));
  assert.equal(journey.flatMap(item => item.evidence).some(ref => ref.pulse > usePulse), false);
  assert.equal(journey.flatMap(item => item.evidence).some(ref => ref.id === pattern.sourceEventIds[0]), false);
  const later = buildChronicleEdition({ timelineId: "fresh-route-pattern", cutoffPulse: result.state.pulse, revision: 2, selectedSparkId: "spark-2", events: result.events, interpretations: [], history: result.state.history!, explanations: result.state.explanations.filter(item => item.id === `explanation-${use.eventId}`), sparkNames: { "spark-1": "Spark 1", "spark-2": "Spark 2" }, bundleHash: bundle.bundle.contentHash });
  assert.ok(later.chapters.find(chapter => chapter.kind === "personal")!.journey!.some(item => item.text.includes("reached Wild Cache")));
  const actual = buildChronicleEdition({ timelineId: "fresh-route-pattern", cutoffPulse: result.state.pulse, revision: 3, selectedSparkId: "spark-2", events: result.events, interpretations: [], history: result.state.history!, explanations: result.state.explanations, sparkNames: { "spark-1": "Spark 1", "spark-2": "Spark 2" }, bundleHash: bundle.bundle.contentHash });
  const lasting = actual.chapters.find(chapter => chapter.kind === "personal")!.journey!.find(item => item.label === "Lasting route pattern")!;
  assert.ok(lasting.text.includes("reached Wild Cache"));
  assert.ok(lasting.evidence.some(ref => ref.id === pattern.creationEventId));
  assert.ok(lasting.evidence.some(ref => ref.id === encounter.eventId));
  assert.ok(lasting.evidence.some(ref => ref.id === use.eventId));
  assert.ok(lasting.evidence.some(ref => ref.id === use.outcomeEventId));
  assert.equal(lasting.evidence.some(ref => ref.id === pattern.sourceEventIds[0]), false);
});
