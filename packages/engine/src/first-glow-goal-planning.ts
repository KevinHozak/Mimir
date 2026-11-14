import type { FirstGlowGoal } from './first-glow-goals.js';
import { interruptFirstGlowGoal } from './first-glow-goals.js';
import { clearFirstGlowPlan, firstGlowRouteCandidates, type FirstGlowState, type FirstGlowSettlement, type FirstGlowSpark } from './structured.js';
export const GOAL_PLANNING_VERSION = 'varied-coordinated-goals-v1' as const;
export const MEETING_WINDOW_PULSES = 8;
export interface GoalPlanning { version: typeof GOAL_PLANNING_VERSION; activatedPulse: number; }
export interface GoalMeeting { startedPulse: number; deadlinePulse: number; partnerId?: string; invitationEventId?: string; acceptedPulse?: number; ownerSlotId?: string; partnerSlotId?: string; }
const ready=(s:FirstGlowSpark)=>s.carriedCharge>=2&&s.chargeDeficit===0&&s.readiness>=90&&s.intention?.status!=='active';
export function coordinatedGoalFor(state:FirstGlowState,sparkId:string):FirstGlowGoal|undefined {
 return state.goalLoops?.planning && state.goalLoops.goals.find(g=>g.status==='active'&&g.kind==='explore-meet-mark'&&g.step<=1&&g.meeting?.partnerId===sparkId);
}
export function willingMeetingPartner(state:FirstGlowState,settlement:FirstGlowSettlement,actor:FirstGlowSpark,objectId:string,preferred?:string){
 if(!state.goalLoops?.planning||!ready(actor))return;
 const own=firstGlowRouteCandidates(settlement,{...actor,frontierTargetObjectId:undefined,coordinatedMeetingSlotId:undefined,coordinatedMeetingTargetObjectId:undefined},'meet',objectId);
 for(const peer of settlement.sparks.slice().sort((a,b)=>Number(b.id===preferred)-Number(a.id===preferred)||(a.id<b.id?-1:1))){
  if(peer.id===actor.id||!ready(peer)||Math.abs(peer.position.x-actor.position.x)+Math.abs(peer.position.y-actor.position.y)>5||coordinatedGoalFor(state,peer.id)||!state.frontier?.discoveries.some(d=>d.sparkId===peer.id&&d.objectId===objectId))continue;
  const active=state.goalLoops.goals.find(g=>g.sparkId===peer.id&&g.status==='active');
  const compatible=active?.kind==='explore-meet-mark'&&active.step===1&&active.targetObjectId===objectId&&!active.meeting?.partnerId;
  if(active&&!compatible||!compatible&&(peer.destinationObjectId||peer.destinationCell||!['choosing','waiting','idle'].includes(peer.status)))continue;
  const routes=firstGlowRouteCandidates(settlement,{...peer,frontierTargetObjectId:undefined,coordinatedMeetingSlotId:undefined,coordinatedMeetingTargetObjectId:undefined},'meet',objectId);
  for(const a of own)for(const b of routes)if(a.slotId!==b.slotId&&a.target.x===b.target.x&&a.target.y===b.target.y&&Math.max(Math.ceil(a.cost/2),Math.ceil(b.cost/2))<MEETING_WINDOW_PULSES-1&&actor.carriedCharge>Math.ceil(a.cost/2)+1&&peer.carriedCharge>Math.ceil(b.cost/2)+1)return{peer,ownerRoute:a,partnerRoute:b};
 }
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
  g.meeting??={startedPulse:state.pulse,deadlinePulse:state.pulse+MEETING_WINDOW_PULSES};
  if(state.pulse>=g.meeting.deadlinePulse){releaseMeeting(state,g);interruptFirstGlowGoal(state,g,'meeting-window-expired');continue;}
  if(g.meeting.partnerId){const peer=s.sparks.find(a=>a.id===g.meeting!.partnerId)!;if(actor.carriedCharge<1||peer.carriedCharge<1||actor.chargeDeficit>0||peer.chargeDeficit>0||actor.readiness<90||peer.readiness<90){releaseMeeting(state,g);interruptFirstGlowGoal(state,g,'meeting-participant-needs-recovery');}continue;}
  const partner=willingMeetingPartner(state,s,actor,g.targetObjectId!,g.preferredPartnerId);if(!partner)continue;
  const id=`event-${state.pulse}-${g.id}-meeting-invitation`;
  Object.assign(g.meeting,{partnerId:partner.peer.id,invitationEventId:id,acceptedPulse:state.pulse,ownerSlotId:partner.ownerRoute.slotId,partnerSlotId:partner.partnerRoute.slotId});
  for(const [a,slot] of [[actor,partner.ownerRoute.slotId],[partner.peer,partner.partnerRoute.slotId]] as const){
   a.coordinatedMeetingTargetObjectId=g.targetObjectId;a.coordinatedMeetingSlotId=slot;a.knownEvidenceEventIds.push(id);
   if(a.id!==g.sparkId||g.step===1){clearFirstGlowPlan(s,a,'accepted-local-meeting');a.intendedActivity='meet';a.status='choosing';}
  }
  state.events.push({id,pulse:state.pulse,kind:'goal',actorId:actor.id,objectId:g.targetObjectId,participants:[actor.id,partner.peer.id],source:'rules',evidenceEventIds:[id],message:`${actor.name} invited ${partner.peer.name} to a locally known contact; ${partner.peer.name} accepted a bounded meeting after route and needs checks.`});
 }
}
export function finishCoordinatedMeetings(state:FirstGlowState):void {if(state.goalLoops?.planning)for(const g of state.goalLoops.goals)if(g.meeting&&(g.status!=='active'||g.step>1))releaseMeeting(state,g);}
export function validateGoalPlanning(state:FirstGlowState):void {
 const p=state.goalLoops?.planning;const fail=()=>{throw Error('Invalid goal planning policy');};
 if(p&&(p.version!==GOAL_PLANNING_VERSION||!Number.isSafeInteger(p.activatedPulse)||p.activatedPulse<0||p.activatedPulse>state.pulse||!state.frontier))fail();
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
