import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createWorldFromBundle,advanceWorld,validateFirstGlowState} from '../packages/engine/dist/index.js';
globalThis.fetch=()=>{throw Error('Network forbidden');};
const geometricReturnPublication = process.argv.includes('--geometric-return-publication');
const boundedSharingAdmission = geometricReturnPublication || process.argv.includes('--bounded-sharing-admission');
const geometricShardRoutes = boundedSharingAdmission || process.argv.includes('--geometric-shard-routes');
const careRecoveryFallback = geometricShardRoutes || process.argv.includes('--care-recovery-fallback');
const postProbeContinuation = careRecoveryFallback || process.argv.includes('--post-probe-continuation');
const initialCachePreparation = postProbeContinuation || process.argv.includes('--initial-cache-preparation');
const recoveryAdmission = initialCachePreparation || process.argv.includes('--recovery-admission');
const sharingRouteContinuation = recoveryAdmission || process.argv.includes('--sharing-continuation');
const patternPreparation = sharingRouteContinuation || process.argv.includes('--preparation');
const patternGuidedRetry = patternPreparation || process.argv.includes('--retry');
const activityCompletion = patternGuidedRetry || process.argv.includes('--completion');
const directory=fs.mkdtempSync(geometricReturnPublication ? '.tmp/route-patterns-return-publication-ordinary-' : boundedSharingAdmission ? '.tmp/route-patterns-bounded-sharing-ordinary-' : geometricShardRoutes ? '.tmp/route-patterns-geometric-shard-ordinary-' : careRecoveryFallback ? '.tmp/route-patterns-care-fallback-ordinary-' : postProbeContinuation ? '.tmp/route-patterns-post-probe-ordinary-' : initialCachePreparation ? '.tmp/route-patterns-initial-preparation-ordinary-' : recoveryAdmission ? '.tmp/route-patterns-admission-ordinary-' : sharingRouteContinuation ? '.tmp/route-patterns-sharing-ordinary-' : patternPreparation ? '.tmp/route-patterns-preparation-ordinary-' : patternGuidedRetry ? '.tmp/route-patterns-retry-ordinary-' : activityCompletion ? '.tmp/route-patterns-completion-ordinary-' : '.tmp/route-patterns-ordinary-');
const bundles={current:'sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e',review:'sha256-591d53ab30c749f531d0b322609bbfe88096abc8f18b08977ca4d50296d873ca'};
const results=[];
for(const [label,bundleHash] of Object.entries(bundles)) for(const count of [1,8,12]) {
 const raw=JSON.parse(fs.readFileSync(`assets/world/generated/${bundleHash}/world.json`,'utf8'));
 let state=createWorldFromBundle(raw,2,`${label}-${count}`,count,{routePatterns:true, ...(activityCompletion ? {activityCompletion:true} : {}), ...(patternGuidedRetry ? {patternGuidedRetry:true} : {}), ...(patternPreparation ? {patternPreparation:true} : {}), ...(sharingRouteContinuation ? {sharingRouteContinuation:true} : {}), ...(recoveryAdmission ? {recoveryAdmission:true} : {}), ...(initialCachePreparation ? {initialCachePreparation:true} : {}), ...(postProbeContinuation ? {postProbeContinuation:true} : {}), ...(careRecoveryFallback ? {careRecoveryFallback:true} : {}), ...(geometricShardRoutes ? {geometricShardRoutes:true} : {}), ...(boundedSharingAdmission ? {boundedSharingAdmission:true} : {}), ...(geometricReturnPublication ? {geometricReturnPublication:true} : {})});
 const events=[]; const activities={};
 for(let i=0;i<360;i++){const next=advanceWorld(state);state=next.state;events.push(...next.events);for(const s of state.firstGlowState.settlements[0].sparks)activities[s.intendedActivity]=(activities[s.intendedActivity]??0)+1;}
 validateFirstGlowState(state.firstGlowState);
 const sparks=state.firstGlowState.settlements[0].sparks;
 const result={postProbe:state.firstGlowState.postProbeContinuation,initialPreparation:state.firstGlowState.initialCachePreparation, label,bundleHash,sparkCount:count,pulses:state.pulse,patterns:state.firstGlowState.routePatterns.patterns,activitySparkPulses:activities,eventKinds:events.reduce((a,e)=>(a[e.structuredKind??e.kind]=(a[e.structuredKind??e.kind]??0)+1,a),{}),cacheEvents:events.filter(e=>/cache|route-pattern/.test(e.structuredKind??'') ),finalSparks:sparks.map(s=>({id:s.id,position:s.position,activity:s.intendedActivity,charge:s.carriedCharge,deficit:s.chargeDeficit,readiness:s.readiness})),stateSha256:createHash('sha256').update(JSON.stringify(state)).digest('hex')};
 fs.writeFileSync(`${directory}/${label}-${count}.json`,JSON.stringify({state,events}));results.push(result);console.log(JSON.stringify(result));
}
fs.writeFileSync(`${directory}/summary.json`,JSON.stringify({providerCalls:0,geometricReturnPublication,boundedSharingAdmission,geometricShardRoutes,careRecoveryFallback,postProbeContinuation,initialCachePreparation,recoveryAdmission,activityCompletion,patternGuidedRetry,patternPreparation,sharingRouteContinuation,setup:'Unmodified createWorldFromBundle initial state; routePatterns opt-in; rules-only; 360 pulses; fixed seed 2; seed affects social choices but does not randomize initial spawns',results},null,2)); console.log(directory);
