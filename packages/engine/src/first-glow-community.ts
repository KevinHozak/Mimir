import { firstGlowSparkPersonalityProfile } from './design.js';
import { canFirstGlowReach, createFirstGlowState, type FirstGlowState, type FirstGlowSettlement, type FirstGlowSpark } from './structured.js';
import { createFirstGlowSocialState, recordFirstGlowWitnesses } from './first-glow-social.js';
import { createFirstGlowReflectionCapacityState } from './first-glow-reflection-capacity.js';
import { observeFrontier } from './first-glow-frontier.js';
import type { FirstGlowGoal, FirstGlowGoalKind } from './first-glow-goals.js';
export const COMMUNITY_VERSION='local-intentions-arrivals-v1' as const;
export interface GoalNotice {goalId:string;sparkId:string;objectId:string;kind:FirstGlowGoalKind;eventId:string;pulse:number;expiresPulse:number;witnessIds:string[];}
export type LocalGoalNotice=Omit<GoalNotice,'witnessIds'>;
export interface GoalCommunity {version:typeof COMMUNITY_VERSION;activatedPulse:number;arrivalIds:string[];peerSightings:Array<{sparkId:string;peerId:string;eventId:string;pulse:number}>;notices:GoalNotice[];waits:Array<{sparkId:string;afterGoalId:string;startedPulse:number;untilPulse:number}>;}
export function communityFor(state:FirstGlowState){return state.goalLoops?.planning?.community;}
export function communityPersonalityProfile(state:FirstGlowState,id:string){
 const profile=firstGlowSparkPersonalityProfile(id);if(!communityFor(state)?.arrivalIds.includes(id))return profile;
 return {...profile,name:state.settlements.flatMap(s=>s.sparks).find(a=>a.id===id)!.name,relevantRelationships:[]};
}
export function knowsCommunityPeer(state:FirstGlowState,id:string,peerId:string):boolean{
 const c=communityFor(state);return !c||(!c.arrivalIds.includes(id)&&!c.arrivalIds.includes(peerId))||c.peerSightings.some(p=>p.sparkId===id&&p.peerId===peerId);
}
function observeLocalPeers(state:FirstGlowState):void{
 const c=communityFor(state)!;for(const s of state.settlements)for(const a of s.sparks)for(const b of s.sparks){
  if(a.id===b.id||knowsCommunityPeer(state,a.id,b.id)||Math.abs(a.position.x-b.position.x)+Math.abs(a.position.y-b.position.y)>5)continue;
  const eventId=`event-${state.pulse}-${a.id}-noticed-${b.id}`;c.peerSightings.push({sparkId:a.id,peerId:b.id,eventId,pulse:state.pulse});a.knownEvidenceEventIds.push(eventId);recordFirstGlowWitnesses(state.social,[eventId],a.id,[],state.pulse);
  state.events.push({id:eventId,pulse:state.pulse,kind:'discovery',actorId:a.id,participants:[a.id],cells:[a.position,b.position],evidenceEventIds:[eventId],source:'rules',message:`${a.name} noticed ${b.name} nearby; no private knowledge or history was transferred.`});
 }
}
export function localGoalNotices(state:FirstGlowState,id:string):LocalGoalNotice[]{return (communityFor(state)?.notices??[]).filter(n=>n.sparkId!==id&&n.expiresPulse>state.pulse&&n.witnessIds.includes(id)).slice(-4).map(({witnessIds,...n})=>n);}
export function locallyClaimedTask(state:FirstGlowState,id:string,kind:string,objectId:string):boolean{return localGoalNotices(state,id).some(n=>n.objectId===objectId&&n.kind===kind);}
export function publiclyFinishingGoal(state:FirstGlowState,ownerId:string,peerId:string):FirstGlowGoal|undefined{
 if(!communityFor(state))return;
 return state.goalLoops!.goals.find(g=>g.sparkId===peerId&&g.status==='active'&&g.step===1&&['explore-mark','explore-shape','explore-contribute'].includes(g.kind)&&localGoalNotices(state,ownerId).some(n=>n.goalId===g.id));
}
/** Public intent is communicated only at local contact, never inferred from private goals. */
export function announceLocalGoals(state:FirstGlowState):void{
 const c=communityFor(state);if(!c)return;observeLocalPeers(state);c.notices=c.notices.filter(n=>n.expiresPulse>state.pulse);
 for(const g of state.goalLoops!.goals.filter(g=>g.status==='active'&&g.targetObjectId)){
  const s=state.settlements.find(s=>s.sparks.some(a=>a.id===g.sparkId))!,a=s.sparks.find(a=>a.id===g.sparkId)!;
  const witnesses=s.sparks.filter(b=>b.id!==a.id&&Math.abs(a.position.x-b.position.x)+Math.abs(a.position.y-b.position.y)<=5&&state.frontier!.discoveries.some(d=>d.sparkId===b.id&&d.objectId===g.targetObjectId)&&!c.notices.some(n=>n.goalId===g.id&&n.witnessIds.includes(b.id))).map(b=>b.id).sort();
  if(!witnesses.length)continue;
  const id=`event-${state.pulse}-${g.id}-local-intent-${c.notices.length}`;
  const notice:GoalNotice={goalId:g.id,sparkId:a.id,objectId:g.targetObjectId!,kind:g.kind,eventId:id,pulse:state.pulse,expiresPulse:state.pulse+16,witnessIds:[a.id,...witnesses]};c.notices.push(notice);
  for(const actor of s.sparks.filter(b=>notice.witnessIds.includes(b.id)))actor.knownEvidenceEventIds.push(id);
  recordFirstGlowWitnesses(state.social,[id],a.id,witnesses,state.pulse);
  state.events.push({id,pulse:state.pulse,kind:'goal',actorId:a.id,objectId:g.targetObjectId,participants:notice.witnessIds,evidenceEventIds:[id],source:'rules',message:`${a.name} told nearby Sparks of its ${g.kind} intention at a site they already know; this is an intention, not a completed result.`});
 }
}
/** Waiting must not monopolize a productive contact needed by another Spark. */
export function leaveProductiveContact(s:FirstGlowSettlement,a:FirstGlowSpark):boolean{
 const atWork=s.bundle.objects.some(o=>{const d=s.bundle.objectDefinitions[o.definitionId];return !d.capabilities.includes('shelter-niche')&&d.slots.some(slot=>o.origin.x+slot.offset.x===a.position.x&&o.origin.y+slot.offset.y===a.position.y);});
 if(!atWork||!canFirstGlowReach(s,a,'seek-shelter'))return false;
 a.intendedActivity='seek-shelter';a.status='choosing';a.waitReason=undefined;return true;
}
/** Each completed goal permits at most one eight-pulse discretionary hold. Needs and commitments retain priority. */
export function selectCommunityDecisionWait(state:FirstGlowState,a:FirstGlowSpark):boolean{
 const c=communityFor(state);if(!c||a.destinationObjectId||a.destinationCell||!['choosing','waiting','idle'].includes(a.status)||a.carriedCharge<2||a.chargeDeficit>0||a.readiness<90||state.goalLoops!.goals.length>=128)return false;
 const key=state.goalLoops!.goals.filter(g=>g.sparkId===a.id&&g.status!=='active').at(-1)?.id??'arrival';
 let w=c.waits.find(w=>w.sparkId===a.id);
 if(!w||w.afterGoalId!==key){w={sparkId:a.id,afterGoalId:key,startedPulse:state.pulse,untilPulse:state.pulse+8};c.waits=c.waits.filter(w=>w.sparkId!==a.id);c.waits.push(w);}
 if(state.pulse>=w.untilPulse)return false;
 const settlement=state.settlements.find(s=>s.sparks.some(b=>b.id===a.id))!;if(leaveProductiveContact(settlement,a))return true;
 a.intendedActivity='idle';a.status='choosing';a.waitReason='awaiting-goal-decision';return true;
}
export function waitingForCommunityDecision(state:FirstGlowState,a:FirstGlowSpark):boolean{return a.waitReason==='awaiting-goal-decision'&&Boolean(communityFor(state)?.waits.some(w=>w.sparkId===a.id&&state.pulse<=w.untilPulse));}
/** Explicit additive transaction candidate. No charge, memories, old identities or scheduler counters are replaced. */
export function activateGoalCommunity(state:FirstGlowState,addCount:number):void{
 const planning=state.goalLoops?.planning,s=state.settlements[0];
 if(s.bundle.frontier?.regions.length!==3)throw Error('Community arrivals require the three-region frontier');
 if(!planning?.refinement||planning.community||!state.frontier||!state.reflectionCapacity||addCount!==6||s.sparks.length!==6)throw Error('Community activation requires six existing Sparks and six arrivals');
 const occupied=new Set(s.sparks.map(a=>`${a.position.x},${a.position.y}`)),placements=[];
 for(const region of s.bundle.frontier!.regions){const free=s.bundle.spawns.filter(p=>p.settlementId===s.id&&p.cell.x>=region.x&&p.cell.x<region.x+region.width&&p.cell.y>=region.y&&p.cell.y<region.y+region.height&&!occupied.has(`${p.cell.x},${p.cell.y}`)).slice(0,2);if(free.length!==2)throw Error('Insufficient unoccupied authored regional spawns');placements.push(...free.map(p=>p.cell));}
 const fresh=createFirstGlowState(s.bundle,s.id,s.name,12).settlements[0].sparks.slice(6);if(fresh.some(a=>s.sparks.some(b=>b.id===a.id)))throw Error('Arrival identity collision');
 for(let i=0;i<fresh.length;i++){
  const a=fresh[i];a.position={...placements[i]};a.committedCells=[{...a.position}];a.spawnedPulse=state.pulse;a.plannedNavigationRevision=s.runtime.navigationRevision;
  const id=`event-${state.pulse}-${a.id}-arrival`;a.knownEvidenceEventIds=[id];s.sparks.push(a);state.events.push({id,pulse:state.pulse,kind:'discovery',actorId:a.id,participants:[a.id],cells:[a.position],evidenceEventIds:[id],source:'rules',message:`${a.name} arrived with zero charge and only local perception; no earlier memories or relationships were inherited.`});
 }
 const ids=s.sparks.map(a=>a.id),social=createFirstGlowSocialState(ids),oldIds=new Set(state.social.knowledge.map(k=>k.sparkId)),trust=new Set(state.social.trust.map(t=>`${t.sourceSparkId}/${t.targetSparkId}`));
 state.social.knowledge.push(...social.knowledge.filter(k=>!oldIds.has(k.sparkId)));state.social.trust.push(...social.trust.filter(t=>!trust.has(`${t.sourceSparkId}/${t.targetSparkId}`)).map(t=>({...t,lastUpdatedPulse:state.pulse})));
 const defaults=createFirstGlowReflectionCapacityState(fresh.map(a=>a.id));Object.assign(state.reflectionCapacity.assignments,defaults.assignments);
 planning.community={version:COMMUNITY_VERSION,activatedPulse:state.pulse,arrivalIds:fresh.map(a=>a.id),peerSightings:[],notices:[],waits:[]};for(const a of fresh)recordFirstGlowWitnesses(state.social,[a.knownEvidenceEventIds[0]],a.id,[],state.pulse);observeFrontier(state);announceLocalGoals(state);
}
export function validateGoalCommunity(state:FirstGlowState):void{
 const c=communityFor(state);if(!c)return;const fail=()=>{throw Error('Invalid community policy');};const sparks=state.settlements.flatMap(s=>s.sparks),ids=new Set(sparks.map(a=>a.id));
 if(c.version!==COMMUNITY_VERSION||!Number.isSafeInteger(c.activatedPulse)||c.activatedPulse<state.goalLoops!.planning!.refinement!.activatedPulse||c.activatedPulse>state.pulse||c.arrivalIds.length!==6||new Set(c.arrivalIds).size!==6||c.arrivalIds.some(id=>sparks.find(a=>a.id===id)?.spawnedPulse!==c.activatedPulse)||c.notices.length>256||c.waits.length>sparks.length)fail();
 const sightings=new Set<string>();if(c.peerSightings.length>sparks.length*(sparks.length-1))fail();for(const p of c.peerSightings){const key=p.sparkId+'/'+p.peerId;if(!ids.has(p.sparkId)||!ids.has(p.peerId)||p.sparkId===p.peerId||sightings.has(key)||!Number.isSafeInteger(p.pulse)||p.pulse<c.activatedPulse||p.pulse>state.pulse||!sparks.find(a=>a.id===p.sparkId)!.knownEvidenceEventIds.includes(p.eventId))fail();sightings.add(key);}
 const notices=new Set<string>();for(const n of c.notices){const g=state.goalLoops!.goals.find(g=>g.id===n.goalId);if(!g||g.sparkId!==n.sparkId||g.kind!==n.kind||g.targetObjectId!==n.objectId||notices.has(n.eventId)||!Number.isSafeInteger(n.pulse)||n.pulse<c.activatedPulse||n.pulse>state.pulse||n.expiresPulse!==n.pulse+16||new Set(n.witnessIds).size!==n.witnessIds.length||n.witnessIds.length<2||!n.witnessIds.includes(n.sparkId)||n.witnessIds.some(id=>!ids.has(id)||!sparks.find(a=>a.id===id)!.knownEvidenceEventIds.includes(n.eventId)||!state.frontier!.discoveries.some(d=>d.sparkId===id&&d.objectId===n.objectId&&d.pulse<=n.pulse)))fail();notices.add(n.eventId);}
 const waits=new Set<string>();for(const w of c.waits){if(!ids.has(w.sparkId)||waits.has(w.sparkId)||!Number.isSafeInteger(w.startedPulse)||w.startedPulse<c.activatedPulse||w.startedPulse>state.pulse||w.untilPulse!==w.startedPulse+8||w.afterGoalId!=='arrival'&&!state.goalLoops!.goals.some(g=>g.id===w.afterGoalId&&g.sparkId===w.sparkId&&g.status!=='active'))fail();waits.add(w.sparkId);}
}
