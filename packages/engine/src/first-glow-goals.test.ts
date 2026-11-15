import assert from "node:assert/strict";
import test from "node:test";
import { advanceWorld, validateFirstGlowState, createWorldV3 } from "./index.js";
import { buildFirstGlowGoalContext, initializeFirstGlowGoals, requestFirstGlowGoal, selectFirstGlowGoalActivity, summarizeFirstGlowGoals } from "./first-glow-goals.js";
import { buildFirstGlowIntentionContext, commitFirstGlowIntention } from "./first-glow-intentions.js";
import { createGoalFixtureWorld, startGoalFixture } from "./first-glow-goals-fixture.js";
import { readFileSync } from "node:fs";
import { createWorldFromBundle, advanceFirstGlow } from "./index.js";
import { sharingContinuationFixture } from "./first-glow-sharing-continuation-fixture.js";

test("two independently arriving Sparks complete ordered goals through real exploration, encounter and marking", async () => {
  let world = await startGoalFixture();
  const initial = JSON.stringify(world);
  const events = [];
  for (let i = 0; i < 25 && world.firstGlowState.goalLoops!.goals.some(g => g.status === "active"); i++) {
    const before = JSON.stringify(world);
    const input = world;
    const result = advanceWorld(world);
    assert.equal(JSON.stringify(input), before, "advancing must not mutate its input");
    world = result.state;
    events.push(...result.events);
    if (result.events.some(e => e.structuredKind === "meet")) {
      for (const sparkId of ["spark-1", "spark-2"]) assert.equal(world.firstGlowState.ledger.filter(e => e.actorId === sparkId && e.reason === "activity-sustenance").length, 1, "each participant pays once");
    }
  }
  assert.notEqual(JSON.stringify(world), initial);
  assert.equal(world.firstGlowState.goalLoops!.providerAttempts, 2);
  for (const goal of world.firstGlowState.goalLoops!.goals) {
    assert.equal(goal.status, "completed");
    assert.deepEqual(goal.completions.map(c => c.activity), ["explore", "meet", "mark-trace"]);
    for (const completion of goal.completions) assert.ok(events.some(e => e.id === completion.eventId && e.pulse === completion.pulse));
  }
  const meetings = events.filter(e => e.structuredKind === "meet");
  for (const sparkId of ["spark-1", "spark-2"]) assert.ok(events.some(e => e.structuredKind === "movement" && e.actorId === sparkId));
  assert.equal(meetings.length, 1);
  assert.deepEqual(meetings[0].participants, ["spark-1", "spark-2"]);
  assert.equal(world.firstGlowState.history!.conversations!.length, 1);
  assert.ok(world.firstGlowState.social.knowledge.find(k => k.sparkId === "spark-2")!.communicatedClaims.length);
  assert.ok(events.some(e => e.structuredKind === "goal" && e.evidenceEventIds?.length === 3));
  assert.ok(world.firstGlowState.settlements[0].sparks.every(s => s.carriedCharge < 100 && s.readiness < 100));
  assert.equal(summarizeFirstGlowGoals(world.firstGlowState).filter(g => g.status === "completed").length, 2);
});

test("hidden evidence and malformed proposals fall back without granting progress; contexts exclude other Spark state", async () => {
  const world = createGoalFixtureWorld();
  const context = buildFirstGlowGoalContext(world.firstGlowState, "spark-1")!;
  const altered = structuredClone(world.firstGlowState);
  altered.settlements[0].sparks[1].carriedCharge = 999;
  assert.equal(buildFirstGlowGoalContext(altered, "spark-1")!.contextHash, context.contextHash);
  let calls = 0;
  const result = await requestFirstGlowGoal(world.firstGlowState, "spark-1", { provider: { providerId: "invalid", propose: async () => { calls++; return { kind: "explore-meet-mark", summary: "Hidden future", evidenceEventIds: ["future-hidden-event"] }; } } });
  assert.equal(calls, 1);
  assert.equal(result.goal?.source, "rules");
  assert.equal(result.goal?.kind, "explore-mark");
  assert.equal(result.goal?.step, 0);
  assert.equal(world.firstGlowState.goalLoops!.goals.length, 0);
  const historical = await requestFirstGlowGoal(result.state, "spark-2", { historicalPlayback: true, provider: { providerId: "must-not-run", propose: async () => { throw Error("called"); } } });
  assert.equal(historical.state, result.state);
  assert.equal(historical.reason, "historical-playback");
});

test("active goals continue without another provider call; need recovery does not advance a goal", async () => {
  const world = await startGoalFixture();
  const duplicate = await requestFirstGlowGoal(world.firstGlowState, "spark-1", { provider: { providerId: "must-not-run", propose: async () => { throw Error("called"); } } });
  assert.equal(duplicate.reason, "existing-activity-continues");
  world.firstGlowState.settlements[0].sparks[0].carriedCharge = 0;
  world.firstGlowState.settlements[0].sparks[0].chargeDeficit = 1;
  const next = advanceWorld(world).state;
  const spark = next.firstGlowState.settlements[0].sparks[0];
  assert.equal(spark.intendedActivity, "seek-charge");
  assert.equal(next.firstGlowState.goalLoops!.goals[0].step, 0);
});

test("a missing companion never becomes a meeting; bounded expiry releases owned contacts", async () => {
  let world = createGoalFixtureWorld();
  world.firstGlowState = (await requestFirstGlowGoal(world.firstGlowState, "spark-1", { provider: { providerId: "solo-meet", propose: async c => ({ kind: "explore-meet-mark", summary: "Seek company", evidenceEventIds: c.evidenceEventIds.slice(0, 1) }) } })).state;
  const other = world.firstGlowState.settlements[0].sparks[1];
  other.position = { x: 1, y: 1 };
  const events = [];
  for (let i = 0; i < 130 && world.firstGlowState.goalLoops!.goals[0].status === "active"; i++) {
    const result = advanceWorld(world); world = result.state; events.push(...result.events);
  }
  const goal = world.firstGlowState.goalLoops!.goals[0];
  assert.equal(goal.status, "interrupted");
  assert.equal(goal.reason, "goal-expired");
  assert.equal(goal.step, 1);
  assert.equal(events.some(e => e.structuredKind === "meet"), false);
  assert.equal(world.firstGlowState.settlements[0].runtime.reservations.some(r => r.actorId === "spark-1"), false);
});

test("versions, reordered progress and duplicate active goals reject; old histories stay untagged", async () => {
  const world = await startGoalFixture();
  const bad = structuredClone(world.firstGlowState);
  (bad.goalLoops as any).version = "unknown";
  assert.throws(() => validateFirstGlowState(bad), /goal checkpoint/);
  const duplicate = structuredClone(world.firstGlowState);
  duplicate.goalLoops!.goals.push({ ...structuredClone(duplicate.goalLoops!.goals[0]), id: "duplicate-active" });
  assert.throws(() => validateFirstGlowState(duplicate), /goal checkpoint/);
  const malformed = structuredClone(world.firstGlowState);
  malformed.goalLoops!.goals[0].completions.push({ activity: "mark-trace", eventId: "invented", pulse: 1 });
  assert.throws(() => validateFirstGlowState(malformed), /goal checkpoint/);
  assert.throws(() => initializeFirstGlowGoals(world.firstGlowState), /fresh history/);
  const old = createWorldV3(world.firstGlowState.settlements[0].bundle);
  assert.equal(advanceWorld(old).state.firstGlowState.goalLoops, undefined);
});

test("provider timeout and exhausted attempt allowance select rules without retries", async () => {
  const world = createGoalFixtureWorld();
  const timed = await requestFirstGlowGoal(world.firstGlowState, "spark-1", { timeoutMs: 1, provider: { providerId: "never", propose: () => new Promise(() => {}) } });
  assert.equal(timed.goal?.fallbackReason, "provider-failed-or-timeout");
  assert.equal(timed.state.goalLoops!.providerAttempts, 1);
  const capped = structuredClone(world.firstGlowState);
  capped.goalLoops!.providerAttempts = 16;
  const result = await requestFirstGlowGoal(capped, "spark-1", { provider: { providerId: "must-not-run", propose: async () => { throw Error("called"); } } });
  assert.equal(result.goal?.fallbackReason, "provider-attempt-limit");
  assert.equal(result.state.goalLoops!.providerAttempts, 16);
});

test("a source change while the provider is running rejects the stale candidate checkpoint", async () => {
  const world = createGoalFixtureWorld();
  await assert.rejects(requestFirstGlowGoal(world.firstGlowState, "spark-1", { provider: { providerId: "stale", propose: async c => {
    world.firstGlowState.settlements[0].sparks[1].readiness--;
    return { kind: "explore-mark", summary: "Stale plan", evidenceEventIds: c.evidenceEventIds.slice(0, 1) };
  } } }), /source changed/);
  assert.equal(world.firstGlowState.goalLoops!.goals.length, 0);
});

test("urgent rest and care precede discretionary trip funding; a separate intention cannot steal a goal", async () => {
  const world = await startGoalFixture();
  const state = world.firstGlowState, settlement = state.settlements[0], spark = settlement.sparks[0];
  spark.carriedCharge = 1; spark.readiness = 69;
  selectFirstGlowGoalActivity(state, settlement, spark);
  assert.equal(spark.intendedActivity, "seek-shelter");
  assert.equal(spark.carriedCharge, 1);
  assert.equal(spark.readiness, 69);
  spark.carriedCharge = 100; spark.readiness = 83;
  Object.assign(state.social.trust.find(t => t.sourceSparkId === spark.id && t.targetSparkId === "spark-2")!, { value: 3, evidenceEventIds: [spark.knownEvidenceEventIds[0]], lastUpdatedPulse: state.pulse });
  selectFirstGlowGoalActivity(state, settlement, spark);
  assert.equal(spark.intendedActivity, "seek-shelter");
  const context = buildFirstGlowIntentionContext(state, spark.id)!;
  assert.throws(() => commitFirstGlowIntention(state, context, { activity: "explore", summary: "Another intention", evidenceEventIds: context.knownEvidenceEventIds.slice(0, 1) }), /already owns/);
});

test("fresh ordinary goal worlds resume sharing participants without stranded contacts or free arrivals", () => {
  const raw = JSON.parse(readFileSync(new URL("../../../assets/world/generated/sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e/world.json", import.meta.url), "utf8"));
  let world = createWorldFromBundle(raw, 2, "goal-sharing-regression", 6, { goalLoops: true });
  assert.equal(world.firstGlowState.sharingRouteContinuationVersion, "sharing-route-continuation-v1");
  assert.equal(createWorldFromBundle(raw).firstGlowState.sharingRouteContinuationVersion, undefined);
  let restoredTravel = false;
  for (let p = 0; p < 24; p++) {
    const next = advanceWorld(world);
    world = next.state;
    restoredTravel ||= next.events.some(e => e.structuredKind === "sharing-continuation");
    for (const region of world.firstGlowState.settlements) for (const spark of region.sparks) assert.ok(!(spark.status === "choosing" && spark.destinationObjectId && spark.remainingRoute.length), `${spark.id} retained a stranded route at ${world.pulse}`);
  }
  assert.ok(restoredTravel);
  assert.ok(world.firstGlowState.settlements[0].sparks[0].position.x !== 5 || world.firstGlowState.settlements[0].sparks[0].position.y !== 5);
});

test("recorded goal states without the sharing marker retain legacy continuation", () => {
  const old = sharingContinuationFixture(false);
  // A serialized earlier goal policy, not a call to the new fresh constructor.
  old.activityCompletionVersion = "validated-activity-completion-v1";
  old.goalLoops = { version: "spark-goal-loop-v1", providerAttempts: 0, goals: [] };
  const next = advanceFirstGlow(old);
  assert.equal(next.sharingRouteContinuationVersion, undefined);
  assert.equal(next.settlements[0].sparks[1].status, "choosing");
  assert.equal(next.settlements[0].sparks[1].remainingRoute.length, 1);
  assert.throws(() => initializeFirstGlowGoals(next), /fresh history/);
});


// Explicitly controlled coordinates/resources below are fixtures, never live mutations.
async function frontierPlanningFixture() {
  const { observeFrontier, GOAL_PLANNING_VERSION } = await import("./index.js");
  const bundle = JSON.parse(readFileSync(new URL("../../../assets/world/generated/sha256-1ee5c0af5f365d8dee6aaef585dcc986d4286074c84f24a88ec4e77fcb0a079e/world.json", import.meta.url), "utf8"));
  const world = createWorldFromBundle(bundle, 2, "planning-fixture", 6, { goalLoops: true });
  world.firstGlowState.reflectionCapacity!.policy.pulsesPerDay = 1;
  const state = world.firstGlowState;
  for (const spark of state.settlements[0].sparks) {
    spark.carriedCharge = 100; spark.readiness = 100; spark.status = "choosing";
    spark.position = { x: 12, y: 10 }; spark.intendedActivity = "explore";
  }
  observeFrontier(state);
  state.goalLoops!.planning = { version: GOAL_PLANNING_VERSION, activatedPulse: 0 };
  return world;
}

test("versioned planning exposes multiple own-known targets and validates an explicit destination", async () => {
  const { observeFrontier } = await import("./index.js");
  const world = await frontierPlanningFixture(), state = world.firstGlowState, actor = state.settlements[0].sparks[0];
  for (const position of [{x:18,y:18},{x:40,y:22},{x:58,y:28}]) { actor.position = position; observeFrontier(state); }
  actor.position = {x:57,y:28};
  const context = buildFirstGlowGoalContext(state, actor.id)!;
  const shards = context.opportunities!.filter(o=>o.kind==="explore-shape");
  assert.equal(shards.length, 2); assert.equal(new Set(shards.map(o=>o.objectId)).size, 2);
  assert.ok(context.opportunities!.every(o=>state.frontier!.discoveries.some(d=>d.sparkId===actor.id&&d.objectId===o.objectId)));
  assert.ok(Buffer.byteLength(JSON.stringify(context)) < 16384);
  const destination = shards[1];
  const result = await requestFirstGlowGoal(state, actor.id, {provider:{providerId:"explicit-fixture",propose:async c=>({kind:destination.kind,objectId:destination.objectId,summary:"Examine another locally known shard.",evidenceEventIds:[destination.evidenceEventId]})}});
  assert.equal(result.goal!.source,"ai"); assert.equal(result.goal!.targetObjectId,destination.objectId);
  validateFirstGlowState(result.state);
  let completed={...world,firstGlowState:result.state};
  for(let i=0;i<100&&completed.firstGlowState.goalLoops!.goals[0].status==="active";i++) completed=advanceWorld(completed).state;
  assert.equal(completed.firstGlowState.goalLoops!.goals[0].status,"completed");
  const next=buildFirstGlowGoalContext(completed.firstGlowState,actor.id)!;
  assert.equal(next.planning!.recentGoals.at(-1)!.objectId,destination.objectId);
  assert.ok(next.opportunities!.some(o=>o.kind==="explore-shape"&&o.objectId!==destination.objectId&&o.recentCompletions===0));
  for (const objectId of ["hidden-object", "tiled-104", undefined]) {
    const invalid = await requestFirstGlowGoal(state,actor.id,{provider:{providerId:"invalid-target",propose:async()=>({kind:"explore-shape",objectId,summary:"Invalid target",evidenceEventIds:context.evidenceEventIds.slice(0,1)})}});
    assert.equal(invalid.goal!.source,"rules");
  }
  const distant = structuredClone(state); distant.settlements[0].sparks[5].carriedCharge=777;
  assert.equal(buildFirstGlowGoalContext(distant,actor.id)!.contextHash,context.contextHash,"unseen peer resources do not enter nonmeeting options");
});

test("local invitation uses distinct physical contacts and releases both participants after a real meeting", async () => {
  let world=await frontierPlanningFixture();
  const state=world.firstGlowState, sparks=state.settlements[0].sparks;
  for (const s of sparks.slice(2)) s.position={x:4,y:4};
  const result=await requestFirstGlowGoal(state,"spark-1",{provider:{providerId:"meeting-fixture",propose:async c=>{const o=c.opportunities!.find(o=>o.kind==="explore-meet-mark")!;assert.ok(o);return{kind:o.kind,objectId:o.objectId,summary:"Invite a willing local companion.",evidenceEventIds:[o.evidenceEventId]};}}});
  assert.equal(result.goal!.source,"ai"); world.firstGlowState=result.state;
  const events=[];
  for(let i=0;i<18&&world.firstGlowState.goalLoops!.goals[0].status==="active";i++) {
    const result=advanceWorld(world);world=result.state;events.push(...result.events);
    const reopened=JSON.parse(JSON.stringify(world));validateFirstGlowState(reopened.firstGlowState);
    assert.deepEqual(JSON.parse(JSON.stringify(advanceWorld(reopened))),JSON.parse(JSON.stringify(advanceWorld(world))),"serialized checkpoint replay remains deterministic");
  }
  const goal=world.firstGlowState.goalLoops!.goals[0];
  assert.equal(goal.status,"completed",JSON.stringify(goal));
  assert.ok(events.some(e=>e.id===goal.meeting!.invitationEventId));
  assert.ok(events.some(e=>e.structuredKind==="meet"&&e.participants?.includes(goal.meeting!.partnerId!)));
  assert.notEqual(goal.meeting!.ownerSlotId,goal.meeting!.partnerSlotId);
  assert.ok(world.firstGlowState.settlements[0].sparks.every(s=>!s.coordinatedMeetingSlotId&&!s.coordinatedMeetingTargetObjectId));
});

test("activation bounds an existing lonely meeting and never offers remote or busy companions", async () => {
  let world=await frontierPlanningFixture();
  delete world.firstGlowState.goalLoops!.planning;
  const result=await requestFirstGlowGoal(world.firstGlowState,"spark-1",{provider:{providerId:"legacy-meeting",propose:async c=>({kind:"explore-meet-mark",summary:"Wait at a known contact.",evidenceEventIds:c.evidenceEventIds.slice(0,1)})}});
  world.firstGlowState=result.state;
  for(const s of world.firstGlowState.settlements[0].sparks.slice(1))s.position={x:58,y:28};
  for(let i=0;i<3&&world.firstGlowState.goalLoops!.goals[0].step===0;i++)world=advanceWorld(world).state;
  assert.equal(world.firstGlowState.goalLoops!.goals[0].step,1);
  const savedContext=JSON.stringify(world.firstGlowState.goalLoops!.goals[0].context);
  world.firstGlowState.goalLoops!.planning={version:"varied-coordinated-goals-v1",activatedPulse:world.pulse};
  const context=buildFirstGlowGoalContext(world.firstGlowState,"spark-1")!;
  assert.equal(context.candidates.includes("explore-meet-mark"),false);
  const events=[];
  for(let i=0;i<10&&world.firstGlowState.goalLoops!.goals[0].status==="active";i++){const r=advanceWorld(world);world=r.state;events.push(...r.events);}
  const goal=world.firstGlowState.goalLoops!.goals[0];
  assert.equal(goal.status,"interrupted");assert.equal(goal.reason,"meeting-window-expired");
  assert.equal(JSON.stringify(goal.context),savedContext,"activation never rewrites an old context");
  assert.equal(events.some(e=>e.structuredKind==="meet"),false);
  assert.equal(world.firstGlowState.settlements[0].runtime.reservations.some(r=>r.actorId==="spark-1"&&r.objectId===goal.targetObjectId),false);
  const bad=structuredClone(world.firstGlowState);(bad.goalLoops!.planning as any).version="unknown";
  assert.throws(()=>validateFirstGlowState(bad),/planning policy/);
});

test("meeting invitations decline busy peers and release both routes when needs deteriorate",async()=>{
 const {willingMeetingPartner}=await import("./index.js");
 const world=await frontierPlanningFixture(),state=world.firstGlowState,s=state.settlements[0],a=s.sparks[0];
 for(const peer of s.sparks.slice(1)){peer.destinationObjectId="tiled-103";peer.status="traveling";}
 assert.equal(willingMeetingPartner(state,s,a,"tiled-104"),undefined);
 assert.equal(buildFirstGlowGoalContext(state,a.id)!.candidates.includes("explore-meet-mark"),false);
 for(const peer of s.sparks.slice(1)){delete peer.destinationObjectId;peer.status="choosing";}
 const selected=await requestFirstGlowGoal(state,a.id,{provider:{providerId:"needs-fixture",propose:async c=>{const o=c.opportunities!.find(o=>o.kind==="explore-meet-mark")!;return{kind:o.kind,objectId:o.objectId,summary:"Local meeting",evidenceEventIds:[o.evidenceEventId]};}}});
 let current=advanceWorld({...world,firstGlowState:selected.state}).state;
 const goal=current.firstGlowState.goalLoops!.goals[0];assert.ok(goal.meeting?.partnerId);
 current.firstGlowState.settlements[0].sparks.find(a=>a.id===goal.meeting!.partnerId)!.carriedCharge=0;
 current=advanceWorld(current).state;
 assert.equal(current.firstGlowState.goalLoops!.goals[0].reason,"meeting-participant-needs-recovery");
 assert.ok(current.firstGlowState.settlements[0].sparks.every(a=>!a.coordinatedMeetingSlotId));
});
async function refinementFixture() {
 const {GOAL_REFINEMENT_VERSION}=await import('./index.js');const world=await frontierPlanningFixture();
 world.firstGlowState.goalLoops!.planning!.refinement={version:GOAL_REFINEMENT_VERSION,activatedPulse:0};
 for(const a of world.firstGlowState.settlements[0].sparks.slice(2))a.position={x:58,y:28};
 return world;
}
async function selectRefinementMeeting(state:ReturnType<typeof createWorldV3>['firstGlowState']){
 return requestFirstGlowGoal(state,'spark-1',{provider:{providerId:'refinement-fixture',propose:async c=>{const o=c.opportunities!.find(o=>o.kind==='explore-meet-mark');assert.ok(o,'recoverable local pair should be offered');return{kind:o.kind,objectId:o.objectId,summary:'Prepare for a local encounter.',evidenceEventIds:[o.evidenceEventId]};}}});
}
test('refinement prepares a recovering pair, reserves its next decision and completes only through physical evidence',async()=>{
 let world=await refinementFixture();const s=world.firstGlowState.settlements[0];s.sparks[0].readiness=78;s.sparks[1].carriedCharge=1;
 const original=JSON.stringify(world.firstGlowState);const selected=await selectRefinementMeeting(world.firstGlowState);assert.equal(JSON.stringify(world.firstGlowState),original);
 assert.equal(selected.goal!.source,'ai');assert.equal(selected.goal!.rendezvous!.status,'preparing');assert.equal(selected.goal!.meeting,undefined);
 const blocked=await requestFirstGlowGoal(selected.state,'spark-2',{provider:{providerId:'must-not-run',propose:async()=>{throw Error('must not run');}}});assert.equal(blocked.reason,'existing-activity-continues');assert.equal(blocked.goal,undefined);
 world.firstGlowState=selected.state;const events=[];
 for(let i=0;i<32&&world.firstGlowState.goalLoops!.goals[0].status==='active';i++){
  const reopened=JSON.parse(JSON.stringify(world));validateFirstGlowState(reopened.firstGlowState);
  const a=advanceWorld(world),b=advanceWorld(reopened);assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));world=a.state;events.push(...a.events);
 }
 const goal=world.firstGlowState.goalLoops!.goals[0];assert.equal(goal.status,'completed',JSON.stringify(goal));
 assert.ok(events.some(e=>e.structuredKind==='meet'&&e.participants?.includes('spark-2')));assert.notEqual(goal.meeting!.ownerSlotId,goal.meeting!.partnerSlotId);
 assert.equal(goal.rendezvous!.status,'ended');assert.ok(world.firstGlowState.ledger.every(e=>e.reason!=='rendezvous-grant'));
});
test('refinement preparation preserves a committed recovery route and expires without a fictitious meeting',async()=>{
 let world=await refinementFixture();const s=world.firstGlowState.settlements[0],peer=s.sparks[1];peer.carriedCharge=0;peer.chargeDeficit=2;peer.readiness=80;peer.intendedActivity='seek-charge';
 const {firstGlowRouteCandidates,selectRendezvousPreparation}=await import('./index.js');const r=firstGlowRouteCandidates(s,peer,'seek-charge')[0];assert.ok(r);
 peer.destinationObjectId=r.objectId;peer.destinationSlotId=r.slotId;peer.status='traveling';peer.remainingRoute=r.path.slice(1);
 const chosen=await selectRefinementMeeting(world.firstGlowState);world.firstGlowState=chosen.state;
 const p=world.firstGlowState.settlements[0].sparks[1],before=JSON.stringify(p);assert.equal(selectRendezvousPreparation(world.firstGlowState,world.firstGlowState.settlements[0],p),true);assert.equal(JSON.stringify(p),before);
 // Removing source availability after the honest offer prevents preparation success.
 world.firstGlowState.settlements[0].sourceCharge=0;const events=[];
 for(let i=0;i<18&&world.firstGlowState.goalLoops!.goals[0].status==='active';i++){const n=advanceWorld(world);world=n.state;events.push(...n.events);}
 assert.equal(world.firstGlowState.goalLoops!.goals[0].reason,'rendezvous-preparation-expired');assert.equal(events.some(e=>e.structuredKind==='meet'),false);
 const {preparingRendezvousFor}=await import('./index.js');assert.equal(preparingRendezvousFor(world.firstGlowState,'spark-2'),undefined);
});
test('refinement excludes recent redundant solo work while preserving legacy menus and cooperative revisits',async()=>{
 let world=await frontierPlanningFixture();const c=buildFirstGlowGoalContext(world.firstGlowState,'spark-1')!,o=c.opportunities!.find(o=>o.kind==='explore-mark')!;
 const selected=await requestFirstGlowGoal(world.firstGlowState,'spark-1',{provider:{providerId:'solo',propose:async()=>({kind:o.kind,objectId:o.objectId,summary:'Mark the known trace.',evidenceEventIds:[o.evidenceEventId]})}});world.firstGlowState=selected.state;
 for(let i=0;i<20&&world.firstGlowState.goalLoops!.goals[0].status==='active';i++)world=advanceWorld(world).state;
 assert.equal(world.firstGlowState.goalLoops!.goals[0].status,'completed');const saved=JSON.stringify(world.firstGlowState.goalLoops!.goals[0].context);
 for(const a of world.firstGlowState.settlements[0].sparks){a.carriedCharge=100;a.readiness=100;a.status='choosing';delete a.destinationObjectId;delete a.destinationCell;a.position={x:12,y:10};}world.firstGlowState.settlements[0].runtime.reservations=[];
 assert.ok(buildFirstGlowGoalContext(world.firstGlowState,'spark-1')!.opportunities!.some(x=>x.kind==='explore-mark'&&x.objectId===o.objectId));
 world.firstGlowState.goalLoops!.planning!.refinement={version:'local-cooperation-variety-v2',activatedPulse:world.pulse};
 const next=buildFirstGlowGoalContext(world.firstGlowState,'spark-1')!;
 assert.equal(next.opportunities!.some(x=>x.kind==='explore-mark'&&x.objectId===o.objectId),false);assert.ok(next.opportunities!.some(x=>x.kind==='explore-meet-mark'&&x.objectId===o.objectId));
 assert.equal(JSON.stringify(world.firstGlowState.goalLoops!.goals[0].context),saved);validateFirstGlowState(world.firstGlowState);
 const invalid=structuredClone(world.firstGlowState);invalid.goalLoops!.planning!.refinement!.activatedPulse=world.pulse+1;assert.throws(()=>validateFirstGlowState(invalid),/planning policy/);
 const remote=structuredClone(world.firstGlowState);for(const a of remote.settlements[0].sparks.slice(1))a.position={x:58,y:28};assert.equal(buildFirstGlowGoalContext(remote,'spark-1')!.candidates.includes('explore-meet-mark'),false);
});

test('refinement never offers a remote, privately uninformed or discretionary-busy peer',async()=>{
 const {preparableMeetingPartner}=await import('./index.js');const world=await refinementFixture(),state=world.firstGlowState,s=state.settlements[0],actor=s.sparks[0],peer=s.sparks[1];
 assert.ok(preparableMeetingPartner(state,s,actor,'tiled-104'));
 peer.destinationObjectId='tiled-104';peer.status='traveling';peer.intendedActivity='mark-trace';assert.equal(preparableMeetingPartner(state,s,actor,'tiled-104'),undefined);
 delete peer.destinationObjectId;peer.status='choosing';peer.intendedActivity='idle';peer.position={x:58,y:28};assert.equal(preparableMeetingPartner(state,s,actor,'tiled-104'),undefined);
 peer.position={x:12,y:10};state.frontier!.discoveries=state.frontier!.discoveries.filter(d=>d.sparkId!==peer.id);assert.equal(preparableMeetingPartner(state,s,actor,'tiled-104'),undefined);
});
