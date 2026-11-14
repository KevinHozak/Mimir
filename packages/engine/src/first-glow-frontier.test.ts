import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createWorldFromBundle,advanceWorld,buildFirstGlowGoalContext,requestFirstGlowGoal,validateFirstGlowState,contributeFrontier,frontierRestBonus,advanceFirstGlowState} from './index.js';
const raw=()=>JSON.parse(readFileSync(new URL('../../../assets/world/generated/sha256-1ee5c0af5f365d8dee6aaef585dcc986d4286074c84f24a88ec4e77fcb0a079e/world.json',import.meta.url),'utf8'));
const fresh=()=>createWorldFromBundle(raw(),2,'frontier-test',6,{goalLoops:true});
test('frontier discovery is local, goal destinations are noticed and projected, input remains immutable',async()=>{
 let w=fresh(); w.firstGlowState.reflectionCapacity!.policy.pulsesPerDay=1; // controlled admission; ordinary cadence is measured separately
 const before=JSON.stringify(w);w=advanceWorld(w).state;assert.equal(w.pulse,1);
 const f=w.firstGlowState;assert.equal(f.frontier!.visits.length,6);
 const c=buildFirstGlowGoalContext(f,'spark-3')!;
 assert.ok(c.candidates.includes('explore-contribute'));
 assert.ok(c.opportunities!.every(o=>f.frontier!.discoveries.some(d=>d.sparkId==='spark-3'&&d.objectId===o.objectId)));
 assert.equal(JSON.stringify(c).includes('tiled-308'),false,'remote project is private');
 const result=await requestFirstGlowGoal(f,'spark-3',{provider:{providerId:'fixture',propose:async c=>({kind:'explore-contribute',summary:'Help with the locally noticed weave.',evidenceEventIds:[c.opportunities!.find(o=>o.kind==='explore-contribute')!.evidenceEventId]})}});
 const rules=await requestFirstGlowGoal(f,'spark-3');assert.match(rules.goal!.summary,/Contribute charge/);
 assert.ok(result.goal, result.reason); assert.equal(result.goal.targetObjectId,'tiled-208');assert.equal(result.state.settlements[0].bundle,f.settlements[0].bundle);validateFirstGlowState(result.state);
 const malformed=structuredClone(result.state);malformed.goalLoops!.goals[0].targetCell={x:1,y:1};assert.throws(()=>validateFirstGlowState(malformed),/goal checkpoint/);
 const source=JSON.stringify(w);advanceWorld(w);assert.equal(JSON.stringify(w),source,'advance does not mutate frontier progress');
});
test('shared weave requires paid distinct contributions, bounds recovery and rejects forged progress',()=>{
 const f=fresh().firstGlowState,s=f.settlements[0],a=s.sparks[2],b=s.sparks[3];
 for(const [i,spark] of [a,b].entries()){spark.carriedCharge=4; spark.knownEvidenceEventIds.push('event-'+spark.id);spark.position={x:32,y:13};s.runtime.reservations.push({actorId:spark.id,objectId:'tiled-208',slotId:i?'weave-b':'weave-a'});f.events.push({id:'event-'+spark.id,kind:'shape-pattern',actorId:spark.id,objectId:'tiled-208',message:'Controlled arrived contribution.'});}
 contributeFrontier(f,s,a,'tiled-208','event-'+a.id);assert.equal(a.carriedCharge,3);assert.equal(frontierRestBonus(f,s,'tiled-208'),0);
 contributeFrontier(f,s,a,'tiled-208','event-'+a.id);assert.equal(a.carriedCharge,3,'repeat is free of contribution and benefit');
 b.carriedCharge=0;contributeFrontier(f,s,b,'tiled-208','event-'+b.id);assert.equal(f.frontier!.projects[0].contributions.length,1);
 a.position={x:0,y:0};
 b.carriedCharge=4;contributeFrontier(f,s,b,'tiled-208','event-'+b.id);assert.equal(frontierRestBonus(f,s,'tiled-208'),6);assert.equal(b.carriedCharge,3);
 assert.equal(f.events.filter(e=>e.kind==='project').at(-1)!.participants!.includes(a.id),false,'credit is not remote witnessing');
 assert.equal(f.events.filter(e=>e.kind==='project').at(-1)!.participants!.includes(b.id),true);
 assert.equal(f.ledger.filter(l=>l.reason==='trace-weave-contribution').reduce((n,l)=>n+l.amount,0),2);
 validateFirstGlowState(f);
 a.position={x:32,y:13};a.readiness=50;a.intendedActivity='seek-shelter';a.status='interacting';a.destinationObjectId='tiled-208';a.destinationSlotId='weave-a';
 const rested=advanceFirstGlowState(f);assert.equal(rested.settlements[0].sparks[2].readiness,66,'completed weave changes actual bounded rest');
 assert.equal(rested.ledger.find(l=>l.actorId===a.id&&l.kind==='idle')!.amount,16);
 const forged=structuredClone(f);forged.frontier!.projects[0].contributions[1].sparkId=a.id;assert.throws(()=>validateFirstGlowState(forged),/frontier/);
 const missing=structuredClone(f);delete missing.frontier;assert.throws(()=>validateFirstGlowState(missing),/frontier/);
});

test('frontier bundle rejects overlapping regions and unsupported project contracts',async()=>{
 const {validateWorldBundle}=await import('@mimir/world-data');
 const overlap=raw();overlap.frontier.regions[1].x=20;assert.throws(()=>validateWorldBundle(overlap),/partition/);
 const unbounded=raw();unbounded.frontier.projects[0].restBonus=100;assert.throws(()=>validateWorldBundle(unbounded),/project/);
});

test('explicit destination binding does not constrain legacy recovery to a remembered cache',async()=>{
 const {createGoalFixtureWorld}=await import('./first-glow-goals-fixture.js');
 const {canFirstGlowReach,firstGlowRouteCandidates}=await import('./structured.js');
 const s=createGoalFixtureWorld().firstGlowState.settlements[0],spark=s.sparks[0];
 spark.routePatternTargetObjectId='tiled-106';
 assert.equal(canFirstGlowReach(s,spark,'seek-charge'),true);
 const pinned=firstGlowRouteCandidates(s,spark,'shape-pattern','tiled-104');assert.ok(pinned.length>0);assert.ok(pinned.every(r=>r.objectId==='tiled-104'));
});

test('late contributors end obsolete goals only after observing the completed site',async()=>{
 const {selectFirstGlowGoalActivity}=await import('./first-glow-goals.js');
 let w=fresh();w.firstGlowState.reflectionCapacity!.policy.pulsesPerDay=1;w=advanceWorld(w).state;
 const result=await requestFirstGlowGoal(w.firstGlowState,'spark-3',{provider:{providerId:'fixture',propose:async c=>({kind:'explore-contribute',summary:'Contribute at the noticed weave.',evidenceEventIds:c.evidenceEventIds.slice(0,1)})}});
 assert.ok(result.goal);const f=result.state,s=f.settlements[0],actor=s.sparks[2],project=f.frontier!.projects[0];
 project.completedPulse=f.pulse;project.contributions=[{sparkId:'spark-1',eventId:'controlled-a',pulse:f.pulse},{sparkId:'spark-2',eventId:'controlled-b',pulse:f.pulse}];
 s.sparks[0].knownEvidenceEventIds.push('controlled-a');s.sparks[1].knownEvidenceEventIds.push('controlled-b');validateFirstGlowState(f);
 actor.position={x:4,y:6};actor.carriedCharge=20;actor.readiness=100;
 selectFirstGlowGoalActivity(f,s,actor);assert.equal(result.goal!.status,'active','remote completion is not knowledge');
 actor.position={x:32,y:13};const before=actor.carriedCharge;
 selectFirstGlowGoalActivity(f,s,actor);assert.equal(result.goal!.status,'interrupted');assert.equal(result.goal!.reason,'observed-project-already-completed');assert.equal(actor.carriedCharge,before);assert.equal(project.contributions.length,2);
});
