import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createWorldFromBundle } from "@mimir/engine";
import { normalizeState } from "./state.js";

test("fresh geometric shard waiting preserves contact ownership and deterministic SQLite continuation", async () => {
  const { advanceWorld, firstGlowRouteCandidates } = await import("@mimir/engine");
  const { DatabaseSync } = await import("node:sqlite");
  const raw = JSON.parse(readFileSync(new URL("../../../assets/world/generated/sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e/world.json", import.meta.url), "utf8"));
  const options = { routePatterns: true, activityCompletion: true, patternGuidedRetry: true, patternPreparation: true, sharingRouteContinuation: true, recoveryAdmission: true, initialCachePreparation: true, postProbeContinuation: true, careRecoveryFallback: true, geometricShardRoutes: true };
  let direct = createWorldFromBundle(raw, 2, "geo-restart", 1, options);
  for (let p = 0; p < 46; p++) direct = advanceWorld(direct).state;
  const f = direct.firstGlowState, s = f.settlements[0], a = s.sparks[0], extra = createWorldFromBundle(raw, 2, "geo-owner", 2, options).firstGlowState;
  const owner = extra.settlements[0].sparks[1]; s.sparks.push(owner); f.social = extra.social; f.reflectionCapacity = extra.reflectionCapacity;
  owner.position = { x: 5, y: 5 }; owner.carriedCharge = 100; owner.readiness = 100;
  const route = firstGlowRouteCandidates(s, owner, "shape-pattern", "tiled-104")[0];
  owner.status = "traveling"; owner.intendedActivity = "shape-pattern"; owner.destinationObjectId = route.objectId; owner.destinationSlotId = route.slotId;
  owner.remainingRoute = route.path.slice(1); owner.remainingCost = 0; owner.plannedNavigationRevision = s.runtime.navigationRevision;
  s.runtime.reservations.push({ actorId: owner.id, objectId: route.objectId, slotId: route.slotId });
  a.position = { x: 27, y: 5 }; a.carriedCharge = 50; a.chargeDeficit = 0; a.readiness = 100; a.status = "choosing"; a.remainingRoute = [];
  direct = advanceWorld(direct).state;
  assert.equal(direct.firstGlowState.settlements[0].sparks[0].waitReason, "shard-contact-wait");
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE checkpoint (state TEXT)"); db.prepare("INSERT INTO checkpoint VALUES (?)").run(JSON.stringify(direct));
    const saved = JSON.parse((db.prepare("SELECT state FROM checkpoint").get() as { state: string }).state);
    let restored = normalizeState(saved);
    assert.equal(restored.firstGlowState.geometricShardRoutesVersion, "geometric-shard-routes-v1");
    assert.equal(restored.firstGlowState.postProbeContinuation!.goals[0].committedPulse, undefined);
    assert.equal(restored.firstGlowState.settlements[0].runtime.reservations.find(r => r.objectId === "tiled-104")!.actorId, owner.id);
    for (let p = 0; p < 5; p++) { direct = advanceWorld(direct).state; restored = advanceWorld(restored).state; assert.deepEqual(JSON.parse(JSON.stringify(restored.firstGlowState)), JSON.parse(JSON.stringify(direct.firstGlowState))); }
    saved.firstGlowState.geometricShardRoutesVersion = "future"; assert.throws(() => normalizeState(saved), /geometric shard/);
    assert.equal(normalizeState(createWorldFromBundle(fixture)).firstGlowState.geometricShardRoutesVersion, undefined);
  } finally { db.close(); }
});

const fixture = JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/fixtures/first-glow-schema-3.json", import.meta.url)), "utf8"));

test("fresh geometric publication persists source evidence while the return cache remains reserved", async () => {
  const { advanceWorld, firstGlowRouteCandidates, canReachRoutePatternTarget } = await import("@mimir/engine");
  const { DatabaseSync } = await import("node:sqlite");
  const raw = JSON.parse(readFileSync(new URL("../../../assets/world/generated/sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e/world.json", import.meta.url), "utf8"));
  const options = { routePatterns: true, activityCompletion: true, patternGuidedRetry: true, patternPreparation: true, sharingRouteContinuation: true, recoveryAdmission: true, initialCachePreparation: true, postProbeContinuation: true, careRecoveryFallback: true, geometricShardRoutes: true, boundedSharingAdmission: true, geometricReturnPublication: true };
  let direct = createWorldFromBundle(raw, 2, "return-publication-restart", 1, options);
  for (let p = 0; p < 118; p++) direct = advanceWorld(direct).state;
  const f = direct.firstGlowState, s = f.settlements[0], extra = createWorldFromBundle(raw, 2, "publication-owner", 2, options).firstGlowState, owner = extra.settlements[0].sparks[1];
  s.sparks.push(owner); f.social = extra.social; f.reflectionCapacity = extra.reflectionCapacity;
  owner.position = { x: 5, y: 5 }; owner.carriedCharge = 100; owner.readiness = 100;
  const route = firstGlowRouteCandidates(s, owner, "scavenge-cache", "tiled-106")[0];
  Object.assign(owner, { status: "traveling", intendedActivity: "scavenge-cache", destinationObjectId: route.objectId, destinationSlotId: route.slotId, remainingRoute: route.path.slice(1), remainingCost: 0, plannedNavigationRevision: s.runtime.navigationRevision });
  s.runtime.reservations.push({ actorId: owner.id, objectId: route.objectId, slotId: route.slotId });
  const before = direct; direct = advanceWorld(direct).state;
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE checkpoints (state TEXT)");
    for (const checkpoint of [before, direct]) {
      db.prepare("INSERT INTO checkpoints VALUES (?)").run(JSON.stringify(checkpoint));
      const saved = JSON.parse((db.prepare("SELECT state FROM checkpoints ORDER BY rowid DESC LIMIT 1").get() as { state: string }).state);
      let restored = normalizeState(saved), continued = checkpoint;
      assert.equal(restored.firstGlowState.geometricReturnPublicationVersion, "geometric-return-publication-v1");
      for (let p = 0; p < 5; p++) { restored = advanceWorld(restored).state; continued = advanceWorld(continued).state; assert.deepEqual(JSON.parse(JSON.stringify(restored.firstGlowState)), JSON.parse(JSON.stringify(continued.firstGlowState))); }
      saved.firstGlowState.geometricReturnPublicationVersion = "future"; assert.throws(() => normalizeState(saved), /geometric return publication/);
    }
    const fg = direct.firstGlowState, site = fg.settlements[0], pattern = fg.routePatterns!.patterns[0];
    assert.deepEqual(pattern.sourceEventIds, ["event-46-spark-1-cache-survey", "event-119-spark-1-shape-pattern"]);
    assert.equal(canReachRoutePatternTarget(site, site.sparks[0], "tiled-106"), false);
    assert.equal(site.runtime.reservations.find(r => r.objectId === "tiled-106")!.actorId, owner.id);
    assert.equal(normalizeState(createWorldFromBundle(fixture)).firstGlowState.geometricReturnPublicationVersion, undefined);
  } finally { db.close(); }
});

test("bounded sharing refusals, admitted costs and protected care completion survive SQLite normalization", async () => {
  const { advanceWorld } = await import("@mimir/engine");
  const { DatabaseSync } = await import("node:sqlite");
  const raw = JSON.parse(readFileSync(new URL("../../../assets/world/generated/sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e/world.json", import.meta.url), "utf8"));
  const options = { routePatterns: true, activityCompletion: true, patternGuidedRetry: true, patternPreparation: true, sharingRouteContinuation: true, recoveryAdmission: true, initialCachePreparation: true, postProbeContinuation: true, careRecoveryFallback: true, geometricShardRoutes: true, boundedSharingAdmission: true };
  let direct = createWorldFromBundle(raw, 2, "sharing-restart", 1, options);
  for (let p = 0; p < 46; p++) direct = advanceWorld(direct).state;
  const f = direct.firstGlowState, s = f.settlements[0], a = s.sparks[0], extra = createWorldFromBundle(raw, 2, "sharing-recipient", 2, options).firstGlowState, b = extra.settlements[0].sparks[1];
  s.sparks.push(b); f.social = extra.social; f.reflectionCapacity = extra.reflectionCapacity;
  Object.assign(f.social.trust.find(t => t.sourceSparkId === a.id && t.targetSparkId === b.id)!, { value: 3, evidenceEventIds: [a.wildCacheChoice!.outcomeEventId], lastUpdatedPulse: f.pulse });
  Object.assign(a, { position: { x: 25, y: 5 }, carriedCharge: 19, chargeDeficit: 0, readiness: 84, status: "choosing", remainingRoute: [] });
  Object.assign(b, { position: { x: 25, y: 5 }, carriedCharge: 0, chargeDeficit: 1, readiness: 57, status: "choosing", remainingRoute: [] });
  const surplus = JSON.parse(JSON.stringify(direct)); surplus.firstGlowState.settlements[0].sparks[0].carriedCharge = 21; surplus.firstGlowState.settlements[0].sparks[0].readiness = 94;
  const admitted = advanceWorld(surplus).state;
  assert.ok(admitted.firstGlowState.events.some(e => e.kind === "share" && e.actorId === a.id));
  assert.equal(admitted.firstGlowState.settlements[0].sparks[0].carriedCharge, 19);
  const checkpoints = [admitted]; const stages = new Set<string>();
  for (let p = 0; p < 80; p++) {
    const fg = direct.firstGlowState, g = fg.postProbeContinuation!.goals[0];
    const stage = g.outcome === "completed" ? "completed" : g.phase === "committed" ? "committed" : fg.events.some(e => e.kind === "sharing-admission") ? "refused" : "setup";
    if (!stages.has(stage)) { stages.add(stage); checkpoints.push(direct); }
    if (g.outcome === "completed") break;
    direct = advanceWorld(direct).state;
  }
  assert.deepEqual([...stages].sort(), ["committed", "completed", "refused", "setup"]);
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE checkpoints (state TEXT)");
    for (const checkpoint of checkpoints) {
      db.prepare("INSERT INTO checkpoints VALUES (?)").run(JSON.stringify(checkpoint));
      const saved = JSON.parse((db.prepare("SELECT state FROM checkpoints ORDER BY rowid DESC LIMIT 1").get() as { state: string }).state);
      let restored = normalizeState(saved), continued = checkpoint;
      assert.equal(restored.firstGlowState.boundedSharingAdmissionVersion, "bounded-sharing-admission-v1");
      for (let p = 0; p < 5; p++) { restored = advanceWorld(restored).state; continued = advanceWorld(continued).state; assert.deepEqual(JSON.parse(JSON.stringify(restored.firstGlowState)), JSON.parse(JSON.stringify(continued.firstGlowState))); }
      saved.firstGlowState.boundedSharingAdmissionVersion = "future"; assert.throws(() => normalizeState(saved), /bounded sharing/);
    }
    assert.equal(normalizeState(createWorldFromBundle(fixture)).firstGlowState.boundedSharingAdmissionVersion, undefined);
  } finally { db.close(); }
});
test("server normalization accepts only a complete First Glow checkpoint", () => {
  const state = createWorldFromBundle(fixture, 11, "state-test");
  assert.equal(normalizeState(state).firstGlowState.themeId, "living-circuit");
  assert.throws(() => normalizeState({ ...state, simulationVersion: "mimir-sim-v2" } as never), /First Glow/);
  assert.throws(() => normalizeState({ ...state, firstGlowState: { ...state.firstGlowState, social: undefined } } as never), /predates social state/);
});

import { DatabaseSync } from "node:sqlite";
import { advanceWorld } from "@mimir/engine";

test("activity completion policy survives SQLite normalization without retrofitting old histories", () => {
  const database = new DatabaseSync(":memory:");
  try {
    database.exec("CREATE TABLE checkpoint (state TEXT)");
    const fresh = createWorldFromBundle(fixture, 2, "completion-restart", 1, {activityCompletion: true});
    let direct = fresh;
    for (let pulse = 0; pulse < 8; pulse++) direct = advanceWorld(direct).state;
    database.prepare("INSERT INTO checkpoint VALUES (?)").run(JSON.stringify(direct));
    let restarted = normalizeState(JSON.parse((database.prepare("SELECT state FROM checkpoint").get() as {state: string}).state));
    assert.equal(restarted.firstGlowState.activityCompletionVersion, "validated-activity-completion-v1");
    for (let pulse = 0; pulse < 20; pulse++) { direct = advanceWorld(direct).state; restarted = advanceWorld(restarted).state; }
    assert.equal(JSON.stringify(restarted.firstGlowState), JSON.stringify(direct.firstGlowState));
    const legacy = normalizeState(createWorldFromBundle(fixture));
    assert.equal(legacy.firstGlowState.activityCompletionVersion, undefined);
    const invalid = createWorldFromBundle(fixture); invalid.firstGlowState.activityCompletionVersion = "unknown" as never;
    assert.throws(() => normalizeState(invalid), /Unsupported activity completion/);
  } finally { database.close(); }
});

import { createWorldV3, initializePatternGuidedRetry } from "@mimir/engine";
import { routePatternFixture, routePatternFixtureBundle } from "../../engine/dist/first-glow-route-patterns-fixture.js";

test("committed retry and both cache choices survive SQLite restart; malformed limits reject", () => {
  const database = new DatabaseSync(":memory:");
  try {
    database.exec("CREATE TABLE retry_checkpoint (state TEXT)");
    let direct = createWorldV3(routePatternFixtureBundle, 2, "retry-restart", 2);
    direct.firstGlowState = routePatternFixture(); initializePatternGuidedRetry(direct.firstGlowState);
    for (let pulse = 0; pulse < 10; pulse++) direct = advanceWorld(direct).state;
    // Declared prior conservation for the controlled unit checkpoint.
    const reader = direct.firstGlowState.settlements[0].sparks[1];
    reader.wildCacheChoice = {pulse: 1, alternative: "conserve", cacheObjectId: "tiled-106", decisionEventId: "prior-choice", outcomeEventId: "prior-outcome", nextActivity: "seek-charge"};
    reader.knownEvidenceEventIds.push("prior-choice", "prior-outcome");
    direct = advanceWorld(direct).state;
    assert.equal(direct.firstGlowState.patternGuidedRetry!.attempts.length, 1);
    database.prepare("INSERT INTO retry_checkpoint VALUES (?)").run(JSON.stringify(direct));
    let restarted = normalizeState(JSON.parse((database.prepare("SELECT state FROM retry_checkpoint").get() as {state: string}).state));
    for (let pulse = 0; pulse < 10; pulse++) { direct = advanceWorld(direct).state; restarted = advanceWorld(restarted).state; }
    assert.equal(JSON.stringify(direct.firstGlowState), JSON.stringify(restarted.firstGlowState));
    assert.equal(restarted.firstGlowState.patternGuidedRetry!.attempts[0].priorChoice.alternative, "conserve");
    assert.equal(restarted.firstGlowState.patternGuidedRetry!.attempts[0].choice!.alternative, "probe");
    const malformed = JSON.parse(JSON.stringify(restarted));
    malformed.firstGlowState.patternGuidedRetry.attempts.push(malformed.firstGlowState.patternGuidedRetry.attempts[0]);
    assert.throws(() => normalizeState(malformed), /retry provenance or limit/);
    const unknown = JSON.parse(JSON.stringify(restarted)); unknown.firstGlowState.patternGuidedRetry.version = "unknown";
    assert.throws(() => normalizeState(unknown), /Unsupported pattern-guided retry/);
  } finally { database.close(); }
});

import {preparationFixture} from "../../engine/dist/first-glow-pattern-preparation-fixture.js";
import {advanceFirstGlow} from "@mimir/engine";

test("preparation checkpoint keeps real progress and an unspent retry across SQLite restart",()=>{
 const db=new DatabaseSync(":memory:");
 try {
  db.exec("CREATE TABLE preparation (state TEXT)");
  const first=advanceFirstGlow(preparationFixture(),{sourceCharge:8});
  assert.equal(first.patternGuidedRetry!.attempts.length,0);
  assert.ok(first.patternPreparation!.goals.find(g=>g.sparkId==="spark-2")!.actions>0);
  const world=createWorldFromBundle(fixture,2,"preparation-restart");world.firstGlowState=first;world.pulse=first.pulse;
  db.prepare("INSERT INTO preparation VALUES (?)").run(JSON.stringify(world));
  const restored=normalizeState(JSON.parse((db.prepare("SELECT state FROM preparation").get() as {state:string}).state));
  let a=first,b=restored.firstGlowState;
  for(let i=0;i<30;i++){a=advanceFirstGlow(a,{sourceCharge:8});b=advanceFirstGlow(b,{sourceCharge:8});}
  assert.equal(JSON.stringify(a),JSON.stringify(b));assert.equal(b.patternGuidedRetry!.attempts.length,1);
  const bad=JSON.parse(JSON.stringify(restored));bad.firstGlowState.patternPreparation.version="unknown";
  assert.throws(()=>normalizeState(bad),/Unsupported pattern preparation/);
 } finally {db.close();}
});

import {sharingContinuationFixture} from "../../engine/dist/first-glow-sharing-continuation-fixture.js";

test("sharing continuation survives SQLite pause/restart and preserves cleanup/evidence",()=>{
 const db=new DatabaseSync(":memory:");
 try {
  db.exec("CREATE TABLE sharing_checkpoint (state TEXT); CREATE TABLE sharing_events (event TEXT)");
  let world=createWorldFromBundle(fixture,2,"sharing-restart",2,{sharingRouteContinuation:true});world.firstGlowState=sharingContinuationFixture();
  const paused=advanceWorld(world);world=paused.state;
  assert.equal(world.firstGlowState.settlements[0].sparks[1].status,"traveling");
  db.prepare("INSERT INTO sharing_checkpoint VALUES (?)").run(JSON.stringify(world));
  for(const event of paused.events)db.prepare("INSERT INTO sharing_events VALUES (?)").run(JSON.stringify(event));
  const saved=normalizeState(JSON.parse((db.prepare("SELECT state FROM sharing_checkpoint").get() as {state:string}).state));
  let a=world,b=saved;
  for(let i=0;i<5;i++){a=advanceWorld(a).state;b=advanceWorld(b).state;assert.equal(JSON.stringify(a.firstGlowState),JSON.stringify(b.firstGlowState));if(i===0)assert.equal(b.firstGlowState.settlements[0].runtime.reservations.some(r=>r.actorId==="spark-2"&&r.objectId==="niche-a"),false);}
  const records=db.prepare("SELECT event FROM sharing_events").all() as {event:string}[];
  const resumed=records.map(r=>JSON.parse(r.event)).find(e=>e.structuredKind==="sharing-continuation");
  assert.ok(resumed.evidenceEventIds.includes("event-1-spark-1-share"));
  const unknown=JSON.parse(JSON.stringify(saved));unknown.firstGlowState.sharingRouteContinuationVersion="future";
  assert.throws(()=>normalizeState(unknown),/Unsupported sharing route continuation/);
  assert.equal(normalizeState(createWorldFromBundle(fixture)).firstGlowState.sharingRouteContinuationVersion,undefined);
 } finally {db.close();}
});

test("recovery queue survives SQLite restart with age, ownership, accounting and cancellation intact", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE admission_checkpoint (state TEXT)");
    let direct = createWorldFromBundle(fixture, 2, "admission-restart", 3, { recoveryAdmission: true });
    direct = advanceWorld(direct).state;
    assert.ok(direct.firstGlowState.recoveryAdmission!.requests.length > 0);
    const savedRequests = JSON.stringify(direct.firstGlowState.recoveryAdmission!.requests);
    db.prepare("INSERT INTO admission_checkpoint VALUES (?)").run(JSON.stringify(direct));
    let restored = normalizeState(JSON.parse((db.prepare("SELECT state FROM admission_checkpoint").get() as {state:string}).state));
    assert.equal(JSON.stringify(restored.firstGlowState.recoveryAdmission!.requests), savedRequests);
    for (let i = 0; i < 20; i++) {
      direct = advanceWorld(direct).state; restored = advanceWorld(restored).state;
      assert.equal(JSON.stringify(direct.firstGlowState), JSON.stringify(restored.firstGlowState));
    }
    const bad = JSON.parse(JSON.stringify(restored)); bad.firstGlowState.recoveryAdmission.version = "future";
    assert.throws(() => normalizeState(bad), /Unsupported recovery admission/);
    const duplicate = JSON.parse(JSON.stringify(direct));
    if (duplicate.firstGlowState.recoveryAdmission.requests.length) {
      duplicate.firstGlowState.recoveryAdmission.requests.push(duplicate.firstGlowState.recoveryAdmission.requests[0]);
      assert.throws(() => normalizeState(duplicate), /recovery admission/);
    }
    assert.equal(normalizeState(createWorldFromBundle(fixture)).firstGlowState.recoveryAdmission, undefined);
  } finally { db.close(); }
});

test("queued pattern preparation keeps its goal and unspent retry across SQLite restart", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE queued_preparation (state TEXT)");
    let first = preparationFixture(0, 60, 10, true);
    const owner = first.settlements[0].sparks[0];
    owner.status = "traveling"; owner.destinationCell = { x: 2, y: 1 }; owner.remainingRoute = [{ x: 2, y: 1 }]; owner.remainingCost = 100;
    first.settlements[0].runtime.reservations = [{ actorId: owner.id, objectId: "pool-a", slotId: "draw" }];
    first = advanceFirstGlow(first);
    assert.equal(first.recoveryAdmission!.requests.length, 1);
    const world = createWorldFromBundle(fixture, 2, "queued-preparation");
    world.firstGlowState = first; world.pulse = first.pulse;
    db.prepare("INSERT INTO queued_preparation VALUES (?)").run(JSON.stringify(world));
    const restored = normalizeState(JSON.parse((db.prepare("SELECT state FROM queued_preparation").get() as {state:string}).state));
    assert.equal(JSON.stringify(restored.firstGlowState.recoveryAdmission), JSON.stringify(first.recoveryAdmission));
    let a = first, b = restored.firstGlowState;
    for (let i = 0; i < 8; i++) {
      a = advanceFirstGlow(a); b = advanceFirstGlow(b);
      assert.equal(JSON.stringify(a), JSON.stringify(b));
    }
    assert.equal(b.patternGuidedRetry!.attempts.length, 0);
    assert.equal(b.patternPreparation!.goals[0].actions, 0);
  } finally { db.close(); }
});

test("initial expedition preparation and pending departure survive SQLite restart without retrofit", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE initial_expedition (state TEXT)");
    const raw = JSON.parse(readFileSync(new URL("../../../assets/world/generated/sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e/world.json", import.meta.url), "utf8"));
    let direct = createWorldFromBundle(raw, 2, "initial-restart", 1, { routePatterns: true, activityCompletion: true, patternGuidedRetry: true, patternPreparation: true, sharingRouteContinuation: true, recoveryAdmission: true, initialCachePreparation: true });
    for (let pulse = 1; pulse <= 50; pulse++) {
      direct = advanceWorld(direct).state;
      if (![8, 24, 30, 46].includes(pulse)) continue;
      db.prepare("INSERT INTO initial_expedition VALUES (?)").run(JSON.stringify(direct));
      const saved = JSON.parse((db.prepare("SELECT state FROM initial_expedition ORDER BY rowid DESC LIMIT 1").get() as {state:string}).state);
      let restored = normalizeState(saved), continued = direct;
      for (let i = 0; i < 8; i++) {
        continued = advanceWorld(continued).state; restored = advanceWorld(restored).state;
        assert.deepEqual(JSON.parse(JSON.stringify(restored.firstGlowState)), JSON.parse(JSON.stringify(continued.firstGlowState)));
      }
      const bad = JSON.parse(JSON.stringify(saved)); bad.firstGlowState.initialCachePreparation.version = "future";
      assert.throws(() => normalizeState(bad), /Unsupported initial cache preparation/);
      const malformed = JSON.parse(JSON.stringify(saved)); malformed.firstGlowState.initialCachePreparation.goals[0].actions = 65;
      assert.throws(() => normalizeState(malformed), /initial cache preparation goal/);
    }
    assert.equal(normalizeState(createWorldFromBundle(fixture)).firstGlowState.initialCachePreparation, undefined);
  } finally { db.close(); }
});

test("post-probe goal, shared budget and actual completion survive SQLite normalization and restart", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE post_probe (state TEXT)");
    const raw = JSON.parse(readFileSync(new URL("../../../assets/world/generated/sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e/world.json", import.meta.url), "utf8"));
    let direct = createWorldFromBundle(raw, 2, "post-probe-restart", 1, { routePatterns: true, activityCompletion: true, patternGuidedRetry: true, patternPreparation: true, sharingRouteContinuation: true, recoveryAdmission: true, initialCachePreparation: true, postProbeContinuation: true });
    for (let p = 1; p <= 119; p++) {
      direct = advanceWorld(direct).state;
      if (![46, 80, 101, 118, 119].includes(p)) continue;
      db.prepare("INSERT INTO post_probe VALUES (?)").run(JSON.stringify(direct));
      const saved = JSON.parse((db.prepare("SELECT state FROM post_probe ORDER BY rowid DESC LIMIT 1").get() as {state:string}).state);
      let restored = normalizeState(saved), continued = direct;
      for (let i = 0; i < 5; i++) {
        continued = advanceWorld(continued).state; restored = advanceWorld(restored).state;
        assert.deepEqual(JSON.parse(JSON.stringify(continued.firstGlowState)), JSON.parse(JSON.stringify(restored.firstGlowState)));
      }
      const bad = JSON.parse(JSON.stringify(saved)); bad.firstGlowState.postProbeContinuation.version = "future";
      assert.throws(() => normalizeState(bad), /Unsupported post-probe/);
      const malformed = JSON.parse(JSON.stringify(saved)); malformed.firstGlowState.postProbeContinuation.goals[0].priorActionEventIds = [];
      assert.throws(() => normalizeState(malformed), /post-probe preceding action budget/);
    }
    assert.equal(normalizeState(createWorldFromBundle(fixture)).firstGlowState.postProbeContinuation, undefined);
  } finally { db.close(); }
});

test("fresh care fallback persists pending care, actual rest and the 90-readiness departure contract", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE care_fallback (state TEXT)");
    const raw = JSON.parse(readFileSync(new URL("../../../assets/world/generated/sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e/world.json", import.meta.url), "utf8"));
    const options = { routePatterns: true, activityCompletion: true, patternGuidedRetry: true, patternPreparation: true, sharingRouteContinuation: true, recoveryAdmission: true, initialCachePreparation: true, postProbeContinuation: true, careRecoveryFallback: true };
    let direct = createWorldFromBundle(raw, 2, "care-restart", 1, options);
    for (let i = 0; i < 46; i++) direct = advanceWorld(direct).state;
    // Controlled resources after a fresh-policy real survey; not a live/legacy upgrade.
    const f = direct.firstGlowState, s = f.settlements[0], a = s.sparks[0], extra = createWorldFromBundle(raw, 2, "care-companion", 2, options).firstGlowState;
    extra.settlements[0].sparks[1].carriedCharge = 100; s.sparks.push(extra.settlements[0].sparks[1]); f.social = extra.social; f.reflectionCapacity = extra.reflectionCapacity;
    Object.assign(f.social.trust.find(t => t.sourceSparkId === a.id && t.targetSparkId === "spark-2")!, { value: 3, evidenceEventIds: [a.wildCacheChoice!.outcomeEventId], lastUpdatedPulse: f.pulse });
    a.position = { x: 5, y: 5 }; a.carriedCharge = 16; a.readiness = 83; a.chargeDeficit = 0; a.intendedActivity = "seek-charge";
    const seen = new Set<string>();
    for (let step = 0; step < 100; step++) {
      const g = direct.firstGlowState.postProbeContinuation!.goals[0];
      const stage = g.outcome === "completed" ? "completed" : g.phase === "committed" ? "committed" : g.careRestEventId ? "rested" : g.careFallbackUsed ? "fallback" : "setup";
      if (!seen.has(stage)) {
        seen.add(stage); db.prepare("INSERT INTO care_fallback VALUES (?)").run(JSON.stringify(direct));
        const saved = JSON.parse((db.prepare("SELECT state FROM care_fallback ORDER BY rowid DESC LIMIT 1").get() as {state:string}).state);
        let restored = normalizeState(saved), continued = direct;
        for (let i = 0; i < 5; i++) { restored = advanceWorld(restored).state; continued = advanceWorld(continued).state; assert.deepEqual(JSON.parse(JSON.stringify(restored.firstGlowState)), JSON.parse(JSON.stringify(continued.firstGlowState))); }
        const unknown = JSON.parse(JSON.stringify(saved)); unknown.firstGlowState.careRecoveryFallbackVersion = "future";
        assert.throws(() => normalizeState(unknown), /Unsupported care recovery fallback/);
        if (stage === "committed" || stage === "completed") {
          const missingRest = JSON.parse(JSON.stringify(saved)); delete missingRest.firstGlowState.postProbeContinuation.goals[0].careRestEventId;
          assert.throws(() => normalizeState(missingRest), /requires actual rest evidence/);
        }
      }
      if (stage === "completed") break;
      direct = advanceWorld(direct).state;
    }
    assert.deepEqual([...seen].sort(), ["committed", "completed", "fallback", "rested", "setup"]);
    assert.equal(normalizeState(createWorldFromBundle(fixture)).firstGlowState.careRecoveryFallbackVersion, undefined);
  } finally { db.close(); }
});
