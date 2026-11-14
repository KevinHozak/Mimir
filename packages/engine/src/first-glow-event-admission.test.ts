import test from "node:test";
import assert from "node:assert/strict";
import { admitFirstGlowEvent, initializeFirstGlowEventAdmission } from "./first-glow-event-admission.js";
import { designateFirstGlowHero, activateFirstGlowOnlineCadence, firstGlowReflectionWindow, createFirstGlowReflectionCapacityState, firstGlowReflectionCadence, requestFirstGlowReflection, validateFirstGlowReflectionCapacity } from "./first-glow-reflection-capacity.js";
import { createWorldFromBundle, advanceWorld } from "./index.js";
import { readFileSync } from "node:fs";

test("event admission observes cadence, capacity, duplicate ownership, restart and day boundaries", () => {
  const rc = initializeFirstGlowEventAdmission(createFirstGlowReflectionCapacityState(["spark-1"]), 0);
  const phase = firstGlowReflectionCadence("spark-1", 1).phaseOffset;
  assert.equal(admitFirstGlowEvent(rc, "early", "spark-1", phase - 1).reason, "cadence-window-not-ready");
  assert.equal(admitFirstGlowEvent(rc, "first", "spark-1", phase).created, true);
  const restored = JSON.parse(JSON.stringify(rc));
  assert.equal(admitFirstGlowEvent(restored, "first", "spark-1", phase).reason, "duplicate-event");
  assert.equal(admitFirstGlowEvent(restored, "other", "spark-1", phase).reason, "slot-already-owned");
  assert.equal(admitFirstGlowEvent(restored, "slot-end", "spark-1", 63).reason, "capacity-exhausted");
  assert.equal(admitFirstGlowEvent(restored, "next-day", "spark-1", phase + 64).created, true);
  assert.equal(admitFirstGlowEvent(restored, "stale", "spark-1", phase).reason, "historical-candidate");
  validateFirstGlowReflectionCapacity(restored, ["spark-1"]);
});

test("other scheduler consumers and global caps share the same allowance", () => {
  const rc = initializeFirstGlowEventAdmission(createFirstGlowReflectionCapacityState(["spark-1", "spark-2"], { globalDailyLimit: 1 }), 0);
  const phase = firstGlowReflectionCadence("spark-1", 1).phaseOffset;
  requestFirstGlowReflection(rc, "spark-1", phase);
  assert.equal(admitFirstGlowEvent(rc, "already-owned", "spark-1", phase).created, false);
  assert.equal(admitFirstGlowEvent(rc, "global", "spark-2", 40).reason, "global-cap-exhausted");
  assert.equal(rc.scheduler.globalUsed, 1);
});

test("old or invalid policy histories fail instead of being silently relabeled", () => {
  const old = createFirstGlowReflectionCapacityState(["spark-1"]);
  assert.throws(() => admitFirstGlowEvent(old, "old", "spark-1", 40), /missing/);
  assert.throws(() => initializeFirstGlowEventAdmission(old, 1), /fresh opening/);
  const current = initializeFirstGlowEventAdmission(old, 0);
  assert.throws(() => initializeFirstGlowEventAdmission(current, 0), /fresh opening/);
  const invalid = structuredClone(current);
  invalid.eventAdmission!.version = "unknown" as never;
  assert.throws(() => validateFirstGlowReflectionCapacity(invalid, ["spark-1"]), /unsupported event/);
});

test("policy-aware dispatch permits viewing old data but prevents mixed-policy continuation", () => {
  const bundle = JSON.parse(readFileSync(new URL("../../../assets/world/generated/sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e/world.json", import.meta.url), "utf8"));
  const legacy = createWorldFromBundle(bundle, 2, "policy-test", 2);
  assert.throws(() => advanceWorld(legacy, { eventAdmissionPolicy: "event-rc-v1" }), /dispatch mismatch/);
  const current = structuredClone(legacy);
  current.firstGlowState.reflectionCapacity = initializeFirstGlowEventAdmission(current.firstGlowState.reflectionCapacity!, 0);
  assert.throws(() => advanceWorld(current), /dispatch mismatch/);
  assert.equal(advanceWorld(current, { eventAdmissionPolicy: "event-rc-v1" }).state.pulse, 1);
});


test("online cadence preserves old records and admits staggered eight-pulse shared slots across restart", () => {
 const ids=Array.from({length:6},(_,i)=>`spark-${i+1}`);
 let rc=initializeFirstGlowEventAdmission(createFirstGlowReflectionCapacityState(ids),0);
 assert.equal(admitFirstGlowEvent(rc,"old-first","spark-1",26).created,true);
 assert.equal(admitFirstGlowEvent(rc,"old-second","spark-1",90).created,true);
 const oldRecords=JSON.stringify(rc.eventAdmission!.records),oldDecisions=JSON.stringify(rc.scheduler.decisions);
 activateFirstGlowOnlineCadence(rc,200);
 assert.equal(firstGlowReflectionWindow(rc,199).day,3);
 assert.equal(firstGlowReflectionWindow(rc,200).day,4);
 const created=new Map<string,number[]>();
 for(let pulse=200;pulse<232;pulse++){
  for(const id of ids){
   const admission=admitFirstGlowEvent(rc,`event-${pulse}-${id}`,id,pulse);
   if(admission.created){const times=created.get(id)??[];if(times.length)assert.ok(pulse-times.at(-1)!>=8);times.push(pulse);created.set(id,times);assert.equal(requestFirstGlowReflection(rc,id,pulse).created,false,"goal and event cannot consume the same new slot twice");}
  }
  validateFirstGlowReflectionCapacity(rc,ids);
  const restarted=JSON.parse(JSON.stringify(rc));
  assert.deepEqual(requestFirstGlowReflection(restarted,"spark-1",pulse),requestFirstGlowReflection(structuredClone(rc),"spark-1",pulse));
  rc=JSON.parse(JSON.stringify(rc));
 }
 assert.ok([...created.values()].every(times=>times.length===4));
 assert.equal(new Set([...created.values()].map(times=>times[0])).size,6,"first opportunities are staggered");
 assert.equal(JSON.stringify(rc.eventAdmission!.records.slice(0,2)),oldRecords);
 assert.equal(JSON.stringify(rc.scheduler.decisions.filter(d=>d.pulse<200)),oldDecisions);
 assert.equal(rc.policy.pulsesPerDay,64,"original calendar is retained for historical records");
 assert.throws(()=>activateFirstGlowOnlineCadence(rc,233),/untouched new pulse/);
 const bad=structuredClone(rc);(bad.cadenceOverride as any).version="unknown";assert.throws(()=>validateFirstGlowReflectionCapacity(bad,ids),/online Reflection/);
});

test("online cadence never forces a second slot at a window boundary and observer matches the new schedule",async()=>{
 const {projectFirstGlowObserver}=await import("./first-glow-observer.js");
 const {createGoalFixtureWorld}=await import("./first-glow-goals-fixture.js");
 const world=createGoalFixtureWorld(),state=world.firstGlowState;
 state.pulse=200;state.reflectionCapacity=createFirstGlowReflectionCapacityState(state.settlements[0].sparks.map(a=>a.id));
 state.reflectionCapacity.scheduler.lastCreatedPulse['spark-1']=199;
 activateFirstGlowOnlineCadence(state.reflectionCapacity,200);
 const projection=projectFirstGlowObserver(state);
 assert.equal(projection.policy.pulsesPerDay,8);
 assert.equal(projection.sparks.find(a=>a.id==='spark-1')!.nextScheduledPulse,207);
 assert.equal(requestFirstGlowReflection(state.reflectionCapacity,'spark-1',206).created,false);
 assert.equal(requestFirstGlowReflection(state.reflectionCapacity,'spark-1',207).created,true);
 assert.equal(requestFirstGlowReflection(state.reflectionCapacity,'spark-1',208).created,false);
 assert.equal(requestFirstGlowReflection(state.reflectionCapacity,'spark-1',214).created,false);
 assert.equal(requestFirstGlowReflection(state.reflectionCapacity,'spark-1',215).created,true);
 const hero=createFirstGlowReflectionCapacityState(['spark-1']);designateFirstGlowHero(hero,'spark-1');activateFirstGlowOnlineCadence(hero,200);
 assert.equal(requestFirstGlowReflection(hero,'spark-1',202).created,true);
 assert.equal(requestFirstGlowReflection(hero,'spark-1',206).created,false,'explicit Hero assignment cannot bypass online eight-pulse spacing');
 const blocked=createFirstGlowReflectionCapacityState(['spark-1']);requestFirstGlowReflection(blocked,'spark-1',26);
 assert.throws(()=>activateFirstGlowOnlineCadence(blocked,26),/untouched new pulse/);
});

test("online goal attempt ceiling retains the cumulative count and historical playback never calls a provider",async()=>{
 const {createGoalFixtureWorld}=await import("./first-glow-goals-fixture.js");
 const {requestFirstGlowGoal}=await import("./first-glow-goals.js");
 const state=createGoalFixtureWorld().firstGlowState;
 state.pulse=3;state.reflectionCapacity=createFirstGlowReflectionCapacityState(state.settlements[0].sparks.map(a=>a.id));
 activateFirstGlowOnlineCadence(state.reflectionCapacity,1);state.goalLoops!.providerAttempts=16;
 let calls=0;const provider={providerId:'cadence-fixture',propose:async(c:any)=>{calls++;return{kind:'explore-mark',summary:'A newly eligible local goal.',evidenceEventIds:c.evidenceEventIds.slice(0,1)};}};
 const result=await requestFirstGlowGoal(state,'spark-1',{provider});assert.equal(result.goal!.source,'ai');assert.equal(result.state.goalLoops!.providerAttempts,17);assert.equal(calls,1);
 const historical=await requestFirstGlowGoal(state,'spark-1',{provider,historicalPlayback:true});assert.equal(historical.state,state);assert.equal(calls,1);
 state.goalLoops!.providerAttempts=64;const capped=await requestFirstGlowGoal(state,'spark-1',{provider});assert.equal(capped.goal!.fallbackReason,'provider-attempt-limit');assert.equal(capped.state.goalLoops!.providerAttempts,64);assert.equal(calls,1);
});
