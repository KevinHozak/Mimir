import { recoveryForecastSettlement } from './first-glow-recovery-admission.js';
import type { FirstGlowGoal } from './first-glow-goals.js';
import { interruptFirstGlowGoal } from './first-glow-goals.js';
import { clearFirstGlowPlan, firstGlowRouteCandidates, type FirstGlowState, type FirstGlowSettlement, type FirstGlowSpark } from './structured.js';
export const GOAL_PLANNING_VERSION = 'varied-coordinated-goals-v1' as const;
export const GOAL_REFINEMENT_VERSION = 'local-cooperation-variety-v2' as const;
export const RENDEZVOUS_PREPARATION_PULSES = 16;
export const MEETING_WINDOW_PULSES = 8;
export interface GoalRendezvous { partnerId: string; offeredPulse: number; expiresPulse: number; offerEventId: string; status: 'preparing' | 'accepted' | 'ended'; }
export interface GoalPlanning { version: typeof GOAL_PLANNING_VERSION; activatedPulse: number; refinement?: {version: typeof GOAL_REFINEMENT_VERSION; activatedPulse: number}; }
export interface GoalMeeting { startedPulse: number; deadlinePulse: number; partnerId?: string; invitationEventId?: string; acceptedPulse?: number; ownerSlotId?: string; partnerSlotId?: string; }
const ready=(s:FirstGlowSpark)=>s.carriedCharge>=2&&s.chargeDeficit===0&&s.readiness>=90&&s.intention?.status!=='active';
export function coordinatedGoalFor(state:FirstGlowState,sparkId:string):FirstGlowGoal|undefined {
 return state.goalLoops?.planning && state.goalLoops.goals.find(g=>g.status==='active'&&g.kind==='explore-meet-mark'&&g.step<=1&&g.meeting?.partnerId===sparkId);
}
export function willingMeetingPartner(state:FirstGlowState,settlement:FirstGlowSettlement,actor:FirstGlowSpark,objectId:string,preferred?:string){
 if(!state.goalLoops?.planning||!ready(actor))return;
 const own=firstGlowRouteCandidates(settlement,{...actor,frontierTargetObjectId:undefined,coordinatedMeetingSlotId:undefined,coordinatedMeetingTargetObjectId:undefined},'meet',objectId);
 for(const peer of settlement.sparks.slice().sort((a,b)=>Number(b.id===preferred)-Number(a.id===preferred)||(a.id<b.id?-1:1))){
  if(peer.id===actor.id||!ready(peer)||(Math.abs(peer.position.x-actor.position.x)+Math.abs(peer.position.y-actor.position.y)>5&&!(preparingRendezvousFor(state,peer.id)?.sparkId===actor.id))||coordinatedGoalFor(state,peer.id)||(preparingRendezvousFor(state,peer.id)?.sparkId!==actor.id&&Boolean(preparingRendezvousFor(state,peer.id)))||!state.frontier?.discoveries.some(d=>d.sparkId===peer.id&&d.objectId===objectId))continue;
  const active=state.goalLoops.goals.find(g=>g.sparkId===peer.id&&g.status==='active');
  const compatible=active?.kind==='explore-meet-mark'&&active.step===1&&active.targetObjectId===objectId&&!active.meeting?.partnerId;
  if(active&&!compatible||!compatible&&(peer.destinationObjectId||peer.destinationCell||!['choosing','waiting','idle'].includes(peer.status)))continue;
  const routes=firstGlowRouteCandidates(settlement,{...peer,frontierTargetObjectId:undefined,coordinatedMeetingSlotId:undefined,coordinatedMeetingTargetObjectId:undefined},'meet',objectId);
  for(const a of own)for(const b of routes)if(a.slotId!==b.slotId&&a.target.x===b.target.x&&a.target.y===b.target.y&&Math.max(Math.ceil(a.cost/2),Math.ceil(b.cost/2))<MEETING_WINDOW_PULSES-1&&actor.carriedCharge>Math.ceil(a.cost/2)+1&&peer.carriedCharge>Math.ceil(b.cost/2)+1)return{peer,ownerRoute:a,partnerRoute:b};
 }
}
/** An accepted preparation offer owns only the next discretionary activity, never an existing recovery route. */
export function preparingRendezvousFor(state: FirstGlowState, sparkId: string): FirstGlowGoal | undefined {
 return state.goalLoops?.goals.find(g => g.status==='active' && g.step<=1 && g.rendezvous?.status==='preparing' && (g.sparkId===sparkId || g.rendezvous.partnerId===sparkId));
}
const recoveryActivity=(s:FirstGlowSpark)=>['seek-charge','draw-charge','seek-shelter','idle'].includes(s.intendedActivity);
export function preparableMeetingPartner(state:FirstGlowState,settlement:FirstGlowSettlement,actor:FirstGlowSpark,objectId:string){
 if(!state.goalLoops?.planning?.refinement || actor.readiness<70 || actor.intention?.status==='active' || preparingRendezvousFor(state,actor.id))return;
 const forecast={...settlement,runtime:{...settlement.runtime,reservations:settlement.runtime.reservations.filter(r=>r.objectId!==objectId)}};
 const routes=(a:FirstGlowSpark)=>firstGlowRouteCandidates(forecast,{...a,frontierTargetObjectId:undefined,coordinatedMeetingSlotId:undefined,coordinatedMeetingTargetObjectId:undefined},'meet',objectId);
 const canPrepare=(a:FirstGlowSpark)=>a.readiness>=70 && a.intention?.status!=='active' && ['seek-charge','seek-shelter'].every(activity=>firstGlowRouteCandidates(recoveryForecastSettlement(settlement),{...a,frontierTargetObjectId:undefined},activity as 'seek-charge'|'seek-shelter').some(r=>r.cost<=12)) && settlement.sourceCharge>0;
 if(!canPrepare(actor))return;
 for(const peer of settlement.sparks.slice().sort((a,b)=>a.id<b.id?-1:1)){
  if(peer.id===actor.id || !canPrepare(peer) || Math.abs(peer.position.x-actor.position.x)+Math.abs(peer.position.y-actor.position.y)>5 || coordinatedGoalFor(state,peer.id) || preparingRendezvousFor(state,peer.id) || state.goalLoops.goals.some(g=>g.sparkId===peer.id&&g.status==='active') || !state.frontier?.discoveries.some(d=>d.sparkId===peer.id&&d.objectId===objectId))continue;
  if((peer.destinationObjectId||peer.destinationCell||!['choosing','waiting','idle'].includes(peer.status))&&!recoveryActivity(peer))continue;
  for(const a of routes(actor))for(const b of routes(peer))if(a.slotId!==b.slotId&&a.target.x===b.target.x&&a.target.y===b.target.y&&a.cost<=12&&b.cost<=12)return{peer,ownerRoute:a,partnerRoute:b};
 }
}
export function offerGoalRendezvous(state:FirstGlowState,g:FirstGlowGoal):void {
 if(!g.context.planning?.refinement || g.kind!=='explore-meet-mark' || !g.preferredPartnerId)return;
 const s=state.settlements.find(s=>s.sparks.some(a=>a.id===g.sparkId))!, actor=s.sparks.find(a=>a.id===g.sparkId)!;
 const partner=preparableMeetingPartner(state,s,actor,g.targetObjectId!);
 if(!partner || partner.peer.id!==g.preferredPartnerId)throw Error('Selected rendezvous is no longer feasible');
 const id=`event-${state.pulse}-${g.id}-rendezvous-offer`;
 g.rendezvous={partnerId:partner.peer.id,offeredPulse:state.pulse,expiresPulse:state.pulse+RENDEZVOUS_PREPARATION_PULSES,offerEventId:id,status:'preparing'};
 for(const a of [actor,partner.peer])a.knownEvidenceEventIds.push(id);
 state.events.push({id,pulse:state.pulse,kind:'goal',actorId:actor.id,objectId:g.targetObjectId,participants:[actor.id,partner.peer.id],source:'rules',evidenceEventIds:[id],message:`${actor.name} offered ${partner.peer.name} a local rendezvous; rules accepted up to sixteen pulses of ordinary recovery preparation before physical meeting admission.`});
}
/** Returns true while preserving committed recovery; a prepared partner waits without free resource production. */
export function selectRendezvousPreparation(state:FirstGlowState,s:FirstGlowSettlement,a:FirstGlowSpark):boolean {
 const g=preparingRendezvousFor(state,a.id);if(!g)return false;
 if(a.destinationObjectId||a.destinationCell||a.status==='traveling'||a.status==='interacting')return true;
 const route=firstGlowRouteCandidates(s,{...a,frontierTargetObjectId:undefined},'meet',g.targetObjectId!)[0];
 const needed=Math.ceil((route?.cost??12)/2)+2;
 a.intendedActivity=a.carriedCharge<needed||a.chargeDeficit>0?'seek-charge':a.readiness<98?'seek-shelter':'idle';
 a.status='choosing';a.waitReason=a.intendedActivity==='idle'?'rendezvous-prepared':undefined;
 return true;
}
function releaseMeeting(state:FirstGlowState,g:FirstGlowGoal){
 for(const s of state.settlements)for(const a of s.sparks)if((a.id===g.sparkId||a.id===g.meeting?.partnerId)&&a.coordinatedMeetingTargetObjectId===g.targetObjectId&&!state.goalLoops!.goals.some(other=>other.id!==g.id&&other.status==='active'&&other.step<=1&&other.meeting?.partnerId&&(other.sparkId===a.id||other.meeting.partnerId===a.id))){
  delete a.coordinatedMeetingTargetObjectId;delete a.coordinatedMeetingSlotId;
  if(a.intendedActivity==='meet'){clearFirstGlowPlan(s,a,'meeting-ended');a.intendedActivity='idle';}
 }
}
export function compatibleMeetingPair(state:FirstGlowState,a:string,b:string):boolean {
 const pair=(id:string)=>state.goalLoops?.planning&&state.goalLoops.goals.find(g=>g.status==='active'&&g.step<=1&&g.meeting?.partnerId&&(g.sparkId===id||g.meeting.partnerId===id));
 const x=pair(a),y=pair(b);return(!x||x.sparkId===b||x.meeting!.partnerId===b)&&(!y||y.sparkId===a||y.meeting!.partnerId===a);
}
/** Executed after pulse increment/reset, before movement. Offers are local and rules-accepted. */
export function coordinateGoalMeetings(state:FirstGlowState):void {
 if(!state.goalLoops?.planning)return;
 for(const g of state.goalLoops.goals){
  if(g.meeting&&(g.status!=='active'||g.step>1)){releaseMeeting(state,g);continue;}
  if(g.status!=='active'||g.kind!=='explore-meet-mark'||g.step>1||g.step===0&&!g.context.planning||coordinatedGoalFor(state,g.sparkId))continue;
  const s=state.settlements.find(s=>s.sparks.some(a=>a.id===g.sparkId))!,actor=s.sparks.find(a=>a.id===g.sparkId)!;
  if(g.rendezvous?.status==='preparing'){
   if(state.pulse>=g.rendezvous.expiresPulse){g.rendezvous.status='ended';interruptFirstGlowGoal(state,g,'rendezvous-preparation-expired');continue;}
   const prepared=willingMeetingPartner(state,s,actor,g.targetObjectId!,g.rendezvous.partnerId);
   if(!prepared || prepared.peer.id!==g.rendezvous.partnerId || actor.readiness<91+Math.ceil(prepared.ownerRoute.cost/2) || prepared.peer.readiness<91+Math.ceil(prepared.partnerRoute.cost/2))continue;
  }
  g.meeting??={startedPulse:state.pulse,deadlinePulse:state.pulse+MEETING_WINDOW_PULSES};
  if(state.pulse>=g.meeting.deadlinePulse){releaseMeeting(state,g);interruptFirstGlowGoal(state,g,'meeting-window-expired');continue;}
  if(g.meeting.partnerId){const peer=s.sparks.find(a=>a.id===g.meeting!.partnerId)!;if(actor.carriedCharge<1||peer.carriedCharge<1||actor.chargeDeficit>0||peer.chargeDeficit>0||actor.readiness<90||peer.readiness<90){releaseMeeting(state,g);interruptFirstGlowGoal(state,g,'meeting-participant-needs-recovery');}continue;}
  const partner=willingMeetingPartner(state,s,actor,g.targetObjectId!,g.preferredPartnerId);if(!partner)continue;
  if(g.rendezvous)g.rendezvous.status='accepted';
  const id=`event-${state.pulse}-${g.id}-meeting-invitation`;
  Object.assign(g.meeting,{partnerId:partner.peer.id,invitationEventId:id,acceptedPulse:state.pulse,ownerSlotId:partner.ownerRoute.slotId,partnerSlotId:partner.partnerRoute.slotId});
  for(const [a,slot] of [[actor,partner.ownerRoute.slotId],[partner.peer,partner.partnerRoute.slotId]] as const){
   a.coordinatedMeetingTargetObjectId=g.targetObjectId;a.coordinatedMeetingSlotId=slot;a.knownEvidenceEventIds.push(id);
   if(a.id!==g.sparkId||g.step===1){clearFirstGlowPlan(s,a,'accepted-local-meeting');a.intendedActivity='meet';a.status='choosing';}
  }
  state.events.push({id,pulse:state.pulse,kind:'goal',actorId:actor.id,objectId:g.targetObjectId,participants:[actor.id,partner.peer.id],source:'rules',evidenceEventIds:[id],message:`${actor.name} invited ${partner.peer.name} to a locally known contact; ${partner.peer.name} accepted a bounded meeting after route and needs checks.`});
 }
}
export function finishCoordinatedMeetings(state:FirstGlowState):void {if(state.goalLoops?.planning)for(const g of state.goalLoops.goals){if(g.rendezvous&&(g.status!=='active'||g.step>1))g.rendezvous.status='ended';if(g.meeting&&(g.status!=='active'||g.step>1))releaseMeeting(state,g);}}
export function validateGoalPlanning(state:FirstGlowState):void {
 const p=state.goalLoops?.planning;const fail=()=>{throw Error('Invalid goal planning policy');};
 if(p&&(p.version!==GOAL_PLANNING_VERSION||!Number.isSafeInteger(p.activatedPulse)||p.activatedPulse<0||p.activatedPulse>state.pulse||!state.frontier))fail();
 if(p?.refinement&&(p.refinement.version!==GOAL_REFINEMENT_VERSION||!Number.isSafeInteger(p.refinement.activatedPulse)||p.refinement.activatedPulse<p.activatedPulse||p.refinement.activatedPulse>state.pulse))fail();
 const leases=new Set<string>();
 for(const g of state.goalLoops?.goals??[]){const r=g.rendezvous;if(!r)continue;
  const s=state.settlements.find(s=>s.sparks.some(a=>a.id===g.sparkId))!,peer=s.sparks.find(a=>a.id===r.partnerId),actor=s.sparks.find(a=>a.id===g.sparkId)!;
  if(!g.context.planning?.refinement||g.kind!=='explore-meet-mark'||r.partnerId!==g.preferredPartnerId||!peer||peer.id===g.sparkId||r.offeredPulse!==g.createdPulse||r.expiresPulse!==r.offeredPulse+RENDEZVOUS_PREPARATION_PULSES||!['preparing','accepted','ended'].includes(r.status)||!actor.knownEvidenceEventIds.includes(r.offerEventId)||!peer.knownEvidenceEventIds.includes(r.offerEventId)||!state.frontier?.discoveries.some(d=>d.sparkId===peer.id&&d.objectId===g.targetObjectId&&d.pulse<=r.offeredPulse))fail();
  if(r.status==='preparing'&&(g.meeting||g.status!=='active'||g.step>1||state.pulse>=r.expiresPulse||state.goalLoops!.goals.some(other=>other.sparkId===r.partnerId&&other.status==='active')))fail();
  if(r.status==='accepted'&&(!g.meeting||g.meeting.partnerId!==r.partnerId||g.meeting.acceptedPulse!>=r.expiresPulse))fail();
  if(g.status==='active'&&g.step<=1&&r.status!=='ended')for(const id of[g.sparkId,r.partnerId]){if(leases.has(id))fail();leases.add(id);}
 }
 const participants=new Set<string>();
 for(const g of state.goalLoops?.goals??[]){if(!g.meeting)continue;const m=g.meeting;
  if(!p||g.kind!=='explore-meet-mark'||!Number.isSafeInteger(m.startedPulse)||m.startedPulse<p.activatedPulse||m.startedPulse>state.pulse||m.deadlinePulse!==m.startedPulse+MEETING_WINDOW_PULSES)fail();
  if(m.partnerId){const s=state.settlements.find(s=>s.sparks.some(a=>a.id===g.sparkId))!;const peer=s.sparks.find(a=>a.id===m.partnerId);const object=s.bundle.objects.find(o=>o.id===g.targetObjectId);const slots=object&&s.bundle.objectDefinitions[object.definitionId].slots;const a=slots?.find(x=>x.id===m.ownerSlotId),b=slots?.find(x=>x.id===m.partnerSlotId);
   if(!peer||peer.id===g.sparkId||!Number.isSafeInteger(m.acceptedPulse)||m.acceptedPulse!<m.startedPulse||m.acceptedPulse!>state.pulse||!m.invitationEventId||!peer.knownEvidenceEventIds.includes(m.invitationEventId)||!s.sparks.find(a=>a.id===g.sparkId)!.knownEvidenceEventIds.includes(m.invitationEventId)||!a||!b||a.id===b.id||a.offset.x!==b.offset.x||a.offset.y!==b.offset.y||!state.frontier!.discoveries.some(d=>d.sparkId===peer.id&&d.objectId===g.targetObjectId&&d.pulse<=m.acceptedPulse!))fail();
   if(g.status==='active'&&g.step<=1){for(const id of[g.sparkId,peer!.id]){if(participants.has(id))fail();participants.add(id);}}
  }else if(m.ownerSlotId||m.partnerSlotId||m.invitationEventId||m.acceptedPulse!==undefined)fail();
 }
 for(const s of state.settlements)for(const a of s.sparks)if(a.coordinatedMeetingTargetObjectId||a.coordinatedMeetingSlotId){const g=state.goalLoops?.goals.find(g=>g.status==='active'&&g.step<=1&&g.meeting?.partnerId&&(g.sparkId===a.id||g.meeting.partnerId===a.id));if(!p||!g||a.coordinatedMeetingTargetObjectId!==g.targetObjectId||a.coordinatedMeetingSlotId!==(g.sparkId===a.id?g.meeting!.ownerSlotId:g.meeting!.partnerSlotId))fail();}
}
