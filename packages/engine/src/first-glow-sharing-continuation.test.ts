import assert from "node:assert/strict";
import test from "node:test";
import {advanceFirstGlow, restoreSharingParticipants, restoreFirstGlowSharingPlan, initializeSharingRouteContinuation, validateFirstGlowState} from "./index.js";
import {bundleHash} from "@mimir/world-data";
import {sharingContinuationFixture} from "./first-glow-sharing-continuation-fixture.js";

test("sharing pauses a traveler once, then valid travel resumes and shelter releases its contact",()=>{
 const initial=sharingContinuationFixture(),original=JSON.stringify(initial);const paused=advanceFirstGlow(initial);
 assert.equal(JSON.stringify(initial),original);
 const recipient=paused.settlements[0].sparks[1];assert.equal(recipient.status,"traveling");assert.deepEqual(recipient.position,{x:2,y:2});assert.equal(recipient.remainingRoute.length,1);
 assert.equal(paused.events.some(e=>e.actorId===recipient.id&&e.kind==="idle"),false);
 assert.equal(paused.settlements[0].runtime.reservations.some(r=>r.actorId===recipient.id),true);
 const arrived=advanceFirstGlow(paused);assert.ok(arrived.events.some(e=>e.actorId===recipient.id&&e.kind==="idle"));
 assert.equal(arrived.settlements[0].runtime.reservations.some(r=>r.actorId===recipient.id),false);assert.equal(arrived.settlements[0].sparks[1].readiness,49);
});

test("untagged history retains its original stuck-route behavior and unknown/retrofit policies fail",()=>{
 let state=sharingContinuationFixture(false);state=advanceFirstGlow(state);state=advanceFirstGlow(state);
 assert.equal(state.settlements[0].sparks[1].status,"choosing");assert.equal(state.settlements[0].sparks[1].remainingRoute.length,1);
 assert.throws(()=>initializeSharingRouteContinuation(state),/fresh history/);
 const unknown=sharingContinuationFixture();unknown.sharingRouteContinuationVersion="future" as never;
 assert.throws(()=>advanceFirstGlow(unknown),/Unsupported sharing route continuation/);
});

test("sharing and sustenance accounting is unchanged and charged once",()=>{
 for(const enabled of [true,false]){
  const state=sharingContinuationFixture(enabled),before=state.settlements[0].sourceCharge+state.settlements[0].sparks.reduce((n,s)=>n+s.carriedCharge,0),next=advanceFirstGlow(state);
  assert.equal(next.ledger.filter(e=>e.kind==="share").length,1);assert.equal(next.ledger.find(e=>e.kind==="share")!.amount,1);
  assert.equal(next.ledger.filter(e=>e.reason==="activity-sustenance").length,2);
  const after=next.settlements[0].sourceCharge+next.settlements[0].sparks.reduce((n,s)=>n+s.carriedCharge,0);
  assert.equal(after,before-next.ledger.filter(e=>e.kind==="consumption").reduce((n,e)=>n+e.amount,0));
  assert.equal(next.events.filter(e=>e.kind==="movement").length,0);
 }
});

test("interacting recipient stays arrival-gated until the next actual action",()=>{
 const state=sharingContinuationFixture(),[donor,reader]=state.settlements[0].sparks;
 donor.position={x:3,y:2};reader.position={x:3,y:2};reader.remainingRoute=[];reader.status="interacting";
 const paused=advanceFirstGlow(state);assert.equal(paused.settlements[0].sparks[1].status,"interacting");assert.equal(paused.events.some(e=>e.kind==="idle"),false);
 const next=advanceFirstGlow(paused);assert.ok(next.events.some(e=>e.actorId===reader.id&&e.kind==="idle"));assert.equal(next.settlements[0].runtime.reservations.some(r=>r.actorId===reader.id),false);
});

test("partial edge progress survives a pause without a free move or duplicate debit",()=>{
 const state=sharingContinuationFixture(),settlement=state.settlements[0],b=structuredClone(settlement.bundle);b.terrainDefinitions.open.movementCost=5;b.bundle.contentHash=bundleHash(b);settlement.bundle=b;
 settlement.sparks[1].remainingCost=3;
 const paused=advanceFirstGlow(state);assert.equal(paused.settlements[0].sparks[1].remainingCost,3);
 const next=advanceFirstGlow(paused);assert.deepEqual(next.settlements[0].sparks[1].position,{x:2,y:2});assert.equal(next.settlements[0].sparks[1].remainingCost,1);
 const arrived=advanceFirstGlow(next);assert.deepEqual(arrived.settlements[0].sparks[1].position,{x:3,y:2});assert.ok(arrived.events.some(e=>e.actorId==="spark-2"&&e.kind==="idle"));
});

test("invalid or canceled plans clear only the participant's route and reservation",()=>{
 for(const failure of ["capability","canceled","missing-reservation","bad-route"]){
  const state=sharingContinuationFixture(),settlement=state.settlements[0],reader=settlement.sparks[1];
  settlement.runtime.reservations.push({actorId:"spark-1",objectId:"pool-a",slotId:"draw"});
  if(failure==="canceled")reader.destinationObjectId=undefined;
  if(failure==="missing-reservation")settlement.runtime.reservations=settlement.runtime.reservations.filter(r=>r.actorId!==reader.id);
  if(failure==="bad-route")reader.remainingRoute=[{x:0,y:0}];
  const resources=[reader.carriedCharge,reader.readiness,reader.chargeDeficit];
  assert.equal(restoreFirstGlowSharingPlan(settlement,reader,failure==="capability"?"draw-charge":"seek-shelter"),"invalid");
  assert.equal(reader.destinationObjectId,undefined);assert.equal(reader.destinationSlotId,undefined);assert.equal(reader.remainingRoute.length,0);assert.equal(reader.remainingCost,0);
  assert.equal(settlement.runtime.reservations.some(r=>r.actorId===reader.id),false);assert.equal(settlement.runtime.reservations.some(r=>r.actorId==="spark-1"),true);
  assert.deepEqual([reader.carriedCharge,reader.readiness,reader.chargeDeficit],resources);assert.equal(state.ledger.length,0);
 }
});

test("cell routes, changed navigation and aborted sharing restore or cancel coherently",()=>{
 const state=sharingContinuationFixture(),s=state.settlements[0],reader=s.sparks[1];
 s.runtime.reservations=[];reader.destinationObjectId=undefined;reader.destinationSlotId=undefined;reader.destinationCell={x:3,y:2};reader.intendedActivity="explore";s.runtime.navigationRevision=1;
 restoreSharingParticipants(state,[{sparkId:reader.id,activity:"explore",hadPlan:true}]);
 assert.equal(reader.status,"traveling");assert.equal(reader.plannedNavigationRevision,1);assert.equal(state.ledger.length,0);assert.equal(state.events.some(e=>e.kind==="share"),false);
 assert.equal(state.events.at(-1)!.evidenceEventIds!.length,0);validateFirstGlowState(state);
});

test("zero-amount sharing still restores the route with the original deficit accounting",()=>{
 const state=sharingContinuationFixture();state.settlements[0].sparks[0].carriedCharge=0;
 const next=advanceFirstGlow(state);assert.equal(next.ledger.find(e=>e.kind==="share")!.amount,0);assert.equal(next.settlements[0].sparks[1].status,"traveling");
 assert.equal(next.settlements[0].sparks[0].chargeDeficit,1);assert.equal(next.settlements[0].sparks[1].chargeDeficit,1);
});
