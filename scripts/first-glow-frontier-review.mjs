import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createWorldFromBundle,advanceWorld,initializeFirstGlowEventAdmission,validateFirstGlowState} from '../packages/engine/dist/index.js';
import {FirstGlowServerAIRuntime} from '../packages/server/dist/first-glow-ai-runtime.js';
import {sparkGoalWire} from '../packages/server/dist/spark-ai-live.js';
const directory=fs.mkdtempSync(path.resolve('.tmp/first-glow-frontier-review-'));
const bundle=JSON.parse(fs.readFileSync('assets/world/generated/sha256-1ee5c0af5f365d8dee6aaef585dcc986d4286074c84f24a88ec4e77fcb0a079e/world.json','utf8'));
globalThis.fetch=async()=>{throw Error('Offline world review forbids provider traffic');};
const files=[];function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);if(f.isDirectory())walk(p);else files.push(p);}}for(const p of ['engine','server','world-data'])walk(`packages/${p}/src`);
const fingerprints=()=>Object.fromEntries(files.sort().map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));const sourceSha256=fingerprints();
fs.writeFileSync('.tmp/first-glow-frontier-review-latest.json',JSON.stringify({directory}));
const index=process.argv.indexOf('--pulses');const maxPulse=index<0?240:Number(process.argv[index+1]);if(!Number.isInteger(maxPulse)||maxPulse<1||maxPulse>360)throw Error('--pulses must be 1–360');
const runs=[];
for(const seed of [2,7]){
 let world=createWorldFromBundle(bundle,seed,`s020-${seed}`,6,{goalLoops:true});
 world.firstGlowState.reflectionCapacity=initializeFirstGlowEventAdmission(world.firstGlowState.reflectionCapacity,0);
 const runtime=new FirstGlowServerAIRuntime({requested:false,enabled:false,runtimeMode:'rules-only',rollout:'off',hardCapCents:0,reason:'offline-world-review'},{goals:true,rcAdmission:'event-rc-v1'});
 const events=[],pressure={chargeDeficitSparkPulses:0,lowReadinessSparkPulses:0,blockedSparkPulses:0,maxDeficit:0},ledger={consumption:0,production:0,draw:0},initial=world.firstGlowState.settlements[0].sourceCharge;
 for(let p=1;p<=maxPulse;p++){
  const next=advanceWorld(world,{eventAdmissionPolicy:'event-rc-v1'});world=next.state;events.push(...next.events);
  const evaluated=await runtime.evaluateGoals(world.firstGlowState,world.worldId);world.firstGlowState=evaluated.state;
  for(const settlement of world.firstGlowState.settlements){for(const a of settlement.sparks){
   assert.ok(!(a.status==='choosing'&&a.destinationObjectId&&a.remainingRoute.length),'no stranded sharing contact');
   pressure.chargeDeficitSparkPulses+=a.chargeDeficit>0?1:0;pressure.lowReadinessSparkPulses+=a.readiness<70?1:0;pressure.blockedSparkPulses+=a.status==='waiting'?1:0;pressure.maxDeficit=Math.max(pressure.maxDeficit,a.chargeDeficit);
  }}
  for(const l of world.firstGlowState.ledger)if(l.kind in ledger)ledger[l.kind]+=l.amount;
  if(p%60===0)console.log(JSON.stringify({seed,pulse:p,goals:world.firstGlowState.goalLoops.goals.length,projects:world.firstGlowState.frontier.projects.map(p=>p.contributions.length)}));
 }
 const f=world.firstGlowState,s=f.settlements[0];validateFirstGlowState(f);
 assert.equal(initial+ledger.production-ledger.consumption,s.sourceCharge+s.communalCharge+s.sparks.reduce((n,a)=>n+a.carriedCharge,0),'charge conservation');
 const goals=f.goalLoops.goals;
 const summary={seed,pulses:maxPulse,sparks:6,normalStartingResources:true,normalRC:true,providerCalls:0,bundleHash:bundle.bundle.contentHash,goals:goals.map(g=>({id:g.id,sparkId:g.sparkId,kind:g.kind,targetObjectId:g.targetObjectId,targetCell:g.targetCell,status:g.status,reason:g.reason,createdPulse:g.createdPulse,completedPulse:g.completedPulse,completions:g.completions})),projects:f.frontier.projects,visits:f.frontier.visits,discoveryCount:f.frontier.discoveries.length,meetingEvents:events.filter(e=>e.structuredKind==='meet'),sharingEvents:events.filter(e=>e.structuredKind==='share').length,pressure,ledger,finalSourceCharge:s.sourceCharge,maximumGoalWireBytes:Math.max(0,...goals.map(g=>Buffer.byteLength(sparkGoalWire(g.context)))),noStrandedContacts:true,chargeConservation:true};

 fs.writeFileSync(path.join(directory,`seed-${seed}-final.json`),JSON.stringify(world));fs.writeFileSync(path.join(directory,`seed-${seed}-summary.json`),JSON.stringify(summary,null,2));runs.push(summary);
}
fs.writeFileSync(path.join(directory,'summary.json'),JSON.stringify({directory,runs,sourceSha256,sourceUnchanged:JSON.stringify(sourceSha256)===JSON.stringify(fingerprints())},null,2));fs.writeFileSync('.tmp/first-glow-frontier-review-latest.json',JSON.stringify({directory}));console.log(JSON.stringify({directory,runs:runs.map(r=>({seed:r.seed,goals:r.goals.length,completed:r.goals.filter(g=>g.status==='completed').length,meetings:r.meetingEvents.length,projects:r.projects,pressure:r.pressure,regions:r.visits.length,maxWire:r.maximumGoalWireBytes}))}));
