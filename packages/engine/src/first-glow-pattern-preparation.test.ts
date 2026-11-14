import {bundleHash} from "@mimir/world-data";
import assert from "node:assert/strict";
import test from "node:test";
import {selectPatternPreparation, advanceFirstGlowState, advanceFirstGlow, initializePatternPreparation, forecastPatternArrival, firstGlowRouteCandidates, validateFirstGlowState, type FirstGlowState} from "./index.js";

import {preparationFixture} from "./first-glow-pattern-preparation-fixture.js";

function tick(s:FirstGlowState,n=1){for(let i=0;i<n;i++)s=advanceFirstGlow(s,{sourceCharge:8});return s;}

test("funded departure projection matches real arrival, probe and once-only retry commitment",()=>{
 let s=preparationFixture(20,100,0);const reader=s.settlements[0].sparks[1];
 const candidate=firstGlowRouteCandidates(s.settlements[0],reader,"scavenge-cache","cache-a")[0];
 const forecast=forecastPatternArrival(s.settlements[0],reader,candidate);assert.ok(forecast.eligible);
 s=tick(s,forecast.pulses);
 assert.equal(s.patternGuidedRetry!.attempts.length,1);assert.equal(s.patternGuidedRetry!.attempts[0].choice!.alternative,"probe");
 const after=s.settlements[0].sparks[1];assert.equal(after.carriedCharge,forecast.afterProbe.charge);assert.equal(after.readiness,forecast.afterProbe.readiness);
});

test("actual repeated draws and rests prepare resources while retry remains unspent",()=>{
 let s=preparationFixture(), sawDraw=false,sawRest=false;
 for(let i=0;i<50;i++){
  const previous=JSON.stringify(s);const next=tick(s);assert.equal(JSON.stringify(s),previous);s=next;
  sawDraw ||= s.events.some(e=>e.actorId==="spark-2"&&e.kind==="draw");sawRest ||= s.events.some(e=>e.actorId==="spark-2"&&e.kind==="idle");
  if(s.patternPreparation!.goals.find(g=>g.sparkId==="spark-2")?.phase!=="committed")assert.equal(s.patternGuidedRetry!.attempts.length,0);
  if(s.patternGuidedRetry!.attempts[0]?.choice)break;
 }
 assert.ok(sawDraw);assert.ok(sawRest);assert.equal(s.patternGuidedRetry!.attempts.length,1);assert.equal(s.patternGuidedRetry!.attempts[0].choice!.alternative,"probe");
 assert.ok(s.patternPreparation!.goals.find(g=>g.sparkId==="spark-2")!.actions>=3);
});

test("exact arrival threshold admits; one-short charge and readiness do not commit",()=>{
 const s=preparationFixture(20,100,0),r=s.settlements[0].sparks[1],c=firstGlowRouteCandidates(s.settlements[0],r,"scavenge-cache","cache-a")[0],f=forecastPatternArrival(s.settlements[0],r,c);
 r.carriedCharge=f.minimumCharge;r.readiness=f.minimumReadiness;assert.ok(forecastPatternArrival(s.settlements[0],r,c).eligible);
 r.carriedCharge--;assert.equal(forecastPatternArrival(s.settlements[0],r,c).eligible,false);r.carriedCharge++;r.readiness--;assert.equal(forecastPatternArrival(s.settlements[0],r,c).eligible,false);
});

test("unknown policy, retrofit and malformed goal evidence reject",()=>{
 const s=preparationFixture();assert.throws(()=>initializePatternPreparation(s),/fresh/);
 const bad=structuredClone(s);bad.patternPreparation!.version="unknown" as never;assert.throws(()=>validateFirstGlowState(bad),/Unsupported pattern preparation/);
 const planned=tick(s);planned.patternPreparation!.goals[0].encounterEventId="hidden";assert.throws(()=>validateFirstGlowState(planned),/Invalid pattern preparation/);
});

test("preparation serialization preserves progress and unspent allowance",()=>{
 const s=tick(preparationFixture(),2),clone=JSON.parse(JSON.stringify(s));
 assert.equal(s.patternGuidedRetry!.attempts.length,0);
 assert.equal(JSON.stringify(tick(s,20)),JSON.stringify(tick(clone,20)));
});

test("same-cell cache and costly multi-pulse terrain forecasts match actual debits",()=>{
 for(const same of [true,false]) {
  let s=preparationFixture(20,100,0),r=s.settlements[0].sparks[1];
  if(same)r.position={x:4,y:1};
  else {const b=structuredClone(s.settlements[0].bundle);b.terrainDefinitions.open.movementCost=5;b.surfaces=[];b.bundle.contentHash=bundleHash(b);s.settlements[0].bundle=b;}
  const candidate=firstGlowRouteCandidates(s.settlements[0],r,"scavenge-cache","cache-a")[0],forecast=forecastPatternArrival(s.settlements[0],r,candidate);
  s=tick(s,forecast.pulses);
  assert.equal(s.settlements[0].sparks[1].carriedCharge,forecast.afterProbe.charge);
  assert.equal(s.settlements[0].sparks[1].readiness,forecast.afterProbe.readiness);
  assert.equal(s.patternGuidedRetry!.attempts.length,1);
 }
});

test("unavailable recovery contacts defer without consuming a use or retry",()=>{
 const s=preparationFixture(),settlement=s.settlements[0];
 // An inert fixture actor holds both recovery contacts for this decision.
 const creator=settlement.sparks[0];creator.status="traveling";creator.destinationCell={x:2,y:1};creator.remainingRoute=[{x:2,y:1}];creator.remainingCost=100;
 settlement.runtime.reservations=settlement.bundle.objects.filter(o=>o.id==="pool-a"||o.id==="niche-a").flatMap(o=>settlement.bundle.objectDefinitions[o.definitionId].slots.map(slot=>({actorId:creator.id,objectId:o.id,slotId:slot.id})));
 const next=tick(s);
 assert.equal(next.patternPreparation!.goals.find(g=>g.sparkId==="spark-2")!.phase,"deferred");
 assert.equal(next.patternGuidedRetry!.attempts.length,0);assert.equal(next.routePatterns!.patterns[0].encounters[0].use,undefined);
});

test("readiness-cap impossibility and bounded preparation do not spend the retry",()=>{
 let s=preparationFixture(30,100,0);const b=structuredClone(s.settlements[0].bundle);b.terrainDefinitions.open.movementCost=2;b.surfaces=[];b.bundle.contentHash=bundleHash(b);s.settlements[0].bundle=b;
 // A declared long unit-world route proves the cap independently of arrival eligibility.
 const path=Array.from({length:29},(_,i)=>({x:i%2===0?0:1,y:1})).concat([{x:1,y:1},{x:2,y:1},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:4,y:1}]);
 const candidate={objectId:"cache-a",slotId:"draw",target:{x:4,y:1},path,cost:56};
 const forecast=forecastPatternArrival(s.settlements[0],s.settlements[0].sparks[1],candidate);
 assert.ok(forecast.minimumReadiness>100);assert.equal(forecast.eligible,false);
 s=tick(preparationFixture());const goal=s.patternPreparation!.goals.find(g=>g.sparkId==="spark-2")!;
 goal.actions=64;goal.actionEventIds=Array.from({length:64},(_,i)=>`fixture-recovery-${i}`);s.settlements[0].sparks[1].knownEvidenceEventIds.push(...goal.actionEventIds);
 s=tick(s);assert.equal(s.patternGuidedRetry!.attempts.length,0);assert.equal(s.patternPreparation!.goals.find(g=>g.sparkId==="spark-2")!.phase,"deferred");
});

test("resource changes and contact conflicts before commitment preserve the retry",()=>{
 for(const conflict of ["resources","slot"]){
  const s=preparationFixture(20,100,0),settlement=s.settlements[0],reader=settlement.sparks[1],pattern=s.routePatterns!.patterns[0];
  const planned=selectPatternPreparation(s,settlement,reader,pattern,undefined);assert.equal(planned,"scavenge-cache");reader.intendedActivity=planned;
  if(conflict==="resources")reader.carriedCharge=0;
  else {const creator=settlement.sparks[0];creator.status="traveling";creator.destinationCell={x:2,y:1};creator.remainingRoute=[{x:2,y:1}];creator.remainingCost=100;settlement.runtime.reservations.push({actorId:creator.id,objectId:reader.preparedDestination!.objectId,slotId:reader.preparedDestination!.slotId});}
  const next=advanceFirstGlowState(s,true,[{patternId:pattern.id,sparkId:reader.id,use:true,reason:"unit budget ready before change"}]);
  assert.equal(next.patternGuidedRetry!.attempts.length,0);assert.equal(next.routePatterns!.patterns[0].encounters[0].use,undefined);
  assert.equal(next.patternPreparation!.goals[0].phase,"deferred");
 }
});

test("navigation changes defer the goal and retain the unspent retry",()=>{
 let s=tick(preparationFixture());s.settlements[0].runtime.navigationRevision++;
 const before=s.patternPreparation!.goals.find(g=>g.sparkId==="spark-2")!.actions;
 s=tick(s);const goal=s.patternPreparation!.goals.find(g=>g.sparkId==="spark-2")!;
 assert.equal(goal.phase,"deferred");assert.match(goal.reason,/stale|no longer available/);assert.equal(goal.actions,before);assert.equal(s.patternGuidedRetry!.attempts.length,0);
});


test("rest preparation can include the eleventh recovery needed after arrival strain",()=>{
 const s=preparationFixture(40,0,0),settlement=s.settlements[0],reader=settlement.sparks[1];
 const b=structuredClone(settlement.bundle);b.width=31;b.terrain=Array.from({length:3},()=>Array(31).fill("open"));b.surfaces=[];
 b.objects.find(o=>o.id==="cache-a")!.origin={x:29,y:1};b.bundle.contentHash=bundleHash(b);settlement.bundle=b;reader.position={x:2,y:2};
 const direct=firstGlowRouteCandidates(settlement,reader,"scavenge-cache","cache-a")[0];assert.ok(forecastPatternArrival(settlement,reader,direct).minimumReadiness>100);
 assert.equal(selectPatternPreparation(s,settlement,reader,s.routePatterns!.patterns[0],"rest"),"seek-shelter");
});
