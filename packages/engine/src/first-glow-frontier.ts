import type { FirstGlowState, FirstGlowSettlement, FirstGlowSpark } from "./structured.js";
import { firstGlowRouteCandidates } from "./structured.js";
export const FRONTIER_VERSION = "local-frontier-v1" as const;
export interface FrontierState {
  version: typeof FRONTIER_VERSION;
  discoveries: { sparkId: string; objectId: string; eventId: string; pulse: number }[];
  visits: { sparkId: string; regionId: string; eventId: string; pulse: number }[];
  projects: { objectId: string; contributions: { sparkId: string; eventId: string; pulse: number }[]; completedPulse?: number }[];
}
export interface FrontierOpportunity { kind: "explore-mark" | "explore-shape" | "explore-meet-mark" | "explore-contribute"; objectId: string; label: string; regionId: string; routeCost: number; evidenceEventId: string; }
export function initializeFrontier(state: FirstGlowState): void {
  const config = state.settlements[0].bundle.frontier;
  if (config && (state.pulse!==0 || state.events.length || state.frontier)) throw new Error("Frontier initialization requires a fresh history");
  if (config) state.activityCompletionVersion = "validated-activity-completion-v1";
  if (config) state.frontier = { version: FRONTIER_VERSION, discoveries: [], visits: [], projects: config.projects.map(p => ({ objectId: p.objectId, contributions: [] })) };
}
export function observeFrontier(state: FirstGlowState): void {
  if (!state.frontier) return;
  for (const settlement of state.settlements) for (const spark of settlement.sparks) {
    const config = settlement.bundle.frontier!;
    const region = config.regions.find(r => spark.position.x >= r.x && spark.position.x < r.x+r.width && spark.position.y >= r.y && spark.position.y < r.y+r.height)!;
    if (!state.frontier.visits.some(v => v.sparkId === spark.id && v.regionId === region.id)) {
      const id = `event-${state.pulse}-${spark.id}-region-${region.id}`;
      state.frontier.visits.push({ sparkId: spark.id, regionId: region.id, eventId: id, pulse: state.pulse });
      state.events.push({ id, kind: "discovery", actorId: spark.id, message: `${spark.name} reached ${region.label}.` }); spark.knownEvidenceEventIds.push(id);
    }
    for (const object of settlement.bundle.objects.filter(o => Math.abs(o.origin.x-spark.position.x)+Math.abs(o.origin.y-spark.position.y) <= 5)) {
      if (state.frontier.discoveries.some(d => d.sparkId === spark.id && d.objectId === object.id)) continue;
      const id = `event-${state.pulse}-${spark.id}-noticed-${object.id}`;
      state.frontier.discoveries.push({ sparkId: spark.id, objectId: object.id, eventId: id, pulse: state.pulse });
      state.events.push({ id, kind: "discovery", actorId: spark.id, objectId: object.id, message: `${spark.name} noticed a nearby ${settlement.bundle.objectDefinitions[object.definitionId].label}.` }); spark.knownEvidenceEventIds.push(id);
    }
    if (state.events.some(e => e.actorId === spark.id && e.kind === "explore")) {
      spark.frontierTrail ??= []; const key = `${spark.position.x},${spark.position.y}`;
      if (!spark.frontierTrail.includes(key)) spark.frontierTrail.push(key);
    }
  }
}
export function frontierOpportunities(state: FirstGlowState, settlement: FirstGlowSettlement, spark: FirstGlowSpark): FrontierOpportunity[] {
  if (!state.frontier) return [];
  const result: FrontierOpportunity[] = [];
  for (const kind of ["explore-mark", "explore-shape", "explore-meet-mark", "explore-contribute"] as const) {
    const activity = kind === "explore-shape" || kind === "explore-contribute" ? "shape-pattern" : kind === "explore-meet-mark" ? "meet" : "mark-trace";
    const choices = state.frontier.discoveries.filter(d => d.sparkId === spark.id).flatMap(d => {
      const object = settlement.bundle.objects.find(o=>o.id===d.objectId)!;
      const definition = settlement.bundle.objectDefinitions[object.definitionId];
      const project = state.frontier!.projects.find(p=>p.objectId===object.id);
      if (kind === "explore-contribute" ? !project || project.completedPulse !== undefined || project.contributions.some(c=>c.sparkId===spark.id) : kind === "explore-shape" && project) return [];
      if (kind === "explore-meet-mark" && !definition.slots.some((s,i)=>definition.slots.some((t,j)=>j!==i&&t.offset.x===s.offset.x&&t.offset.y===s.offset.y))) return [];
      const route = firstGlowRouteCandidates(settlement, { ...spark, frontierTargetObjectId: undefined }, activity, object.id)[0];
      if (!route) return [];
      const region = settlement.bundle.frontier!.regions.find(r=>object.origin.x>=r.x&&object.origin.x<r.x+r.width&&object.origin.y>=r.y&&object.origin.y<r.y+r.height)!;
      return [{ kind, objectId: object.id, label: definition.label, regionId: region.id, routeCost: route.cost, evidenceEventId: d.eventId }];
    }).sort((a,b)=>a.routeCost-b.routeCost || (a.objectId<b.objectId?-1:1));
    if (choices[0]) result.push(choices[0]);
  }
  return result;
}
export function contributeFrontier(state: FirstGlowState, settlement: FirstGlowSettlement, spark: FirstGlowSpark, objectId: string, actionEventId: string): void {
  const project = state.frontier?.projects.find(p=>p.objectId===objectId);
  if (!project || project.completedPulse !== undefined || project.contributions.some(c=>c.sparkId===spark.id) || spark.carriedCharge < 1 || spark.chargeDeficit > 0) return;
  const object = settlement.bundle.objects.find(o=>o.id===objectId)!;
  const reservation = settlement.runtime.reservations.find(r=>r.actorId===spark.id&&r.objectId===objectId);
  const slot = reservation && settlement.bundle.objectDefinitions[object.definitionId].slots.find(s=>s.id===reservation.slotId);
  if (!slot || spark.position.x!==object.origin.x+slot.offset.x || spark.position.y!==object.origin.y+slot.offset.y || !state.events.some(e=>e.id===actionEventId&&e.actorId===spark.id&&e.kind==="shape-pattern"&&e.objectId===objectId)) return;
  spark.carriedCharge--;
  state.ledger.push({ kind: "consumption", actorId: spark.id, amount: 1, reason: "trace-weave-contribution" });
  project.contributions.push({ sparkId: spark.id, eventId: actionEventId, pulse: state.pulse });
  const config = settlement.bundle.frontier!.projects.find(p=>p.objectId===objectId)!;
  const complete = project.contributions.length === config.requiredContributors;
  if (complete) project.completedPulse = state.pulse;
  const id = `event-${state.pulse}-${spark.id}-weave-${objectId}`;
  state.events.push({ id, kind: "project", actorId: spark.id, objectId, participants: settlement.sparks.filter(a=>a.position.x===spark.position.x&&a.position.y===spark.position.y).map(a=>a.id), evidenceEventIds: project.contributions.map(c=>c.eventId), message: complete ? `${spark.name} completed the shared trace weave; rest here now restores ${config.restBonus} additional readiness.` : `${spark.name} contributed charge to the trace weave; another Spark's contribution is needed.` });
  spark.knownEvidenceEventIds.push(id);
}
export function frontierRestBonus(state: FirstGlowState, settlement: FirstGlowSettlement, objectId: string): number {
  return state.frontier?.projects.some(p=>p.objectId===objectId&&p.completedPulse!==undefined) ? settlement.bundle.frontier!.projects.find(p=>p.objectId===objectId)!.restBonus : 0;
}
export function validateFrontier(state: FirstGlowState): void {
  if (!state.frontier) { if (state.settlements.some(s=>s.bundle.frontier || s.sparks.some(a=>a.frontierTargetCell || a.frontierTargetObjectId || a.frontierTrail))) throw Error("Missing frontier checkpoint policy"); return; }
  const f=state.frontier, settlement=state.settlements[0], config=settlement.bundle.frontier;
  const fail=()=>{throw Error("Invalid frontier checkpoint");};
  if (!config || f.version!==FRONTIER_VERSION || !Array.isArray(f.discoveries)||!Array.isArray(f.visits)||!Array.isArray(f.projects)||f.projects.length!==config.projects.length) fail();
  const valid=(sparkId:string,pulse:number,eventId:string)=>settlement.sparks.some(s=>s.id===sparkId&&s.knownEvidenceEventIds.includes(eventId))&&Number.isInteger(pulse)&&pulse>=0&&pulse<=state.pulse;
  const seen=new Set<string>();
  for(const d of f.discoveries){const key=`${d.sparkId}/${d.objectId}`;if(!valid(d.sparkId,d.pulse,d.eventId)||!settlement.bundle.objects.some(o=>o.id===d.objectId)||seen.has(key))fail();seen.add(key);}
  for(const v of f.visits){const key=`${v.sparkId}/${v.regionId}`;if(!valid(v.sparkId,v.pulse,v.eventId)||!config!.regions.some(r=>r.id===v.regionId)||seen.has(key))fail();seen.add(key);}
  const projects=new Set<string>();
  for(const p of f.projects){const c=config!.projects.find(c=>c.objectId===p.objectId);if(!c||projects.has(p.objectId)||p.contributions.length>c.requiredContributors||new Set(p.contributions.map(c=>c.sparkId)).size!==p.contributions.length)fail();projects.add(p.objectId);for(const c of p.contributions)if(!valid(c.sparkId,c.pulse,c.eventId))fail();if((p.contributions.length===c!.requiredContributors)!==(p.completedPulse!==undefined)||p.completedPulse!==undefined&&p.completedPulse!==p.contributions.at(-1)?.pulse)fail();}
  for(const spark of settlement.sparks){if(spark.frontierTrail && (new Set(spark.frontierTrail).size!==spark.frontierTrail.length||spark.frontierTrail.length>settlement.bundle.width*settlement.bundle.height||spark.frontierTrail.some(k=>!/^\d+,\d+$/.test(k)||Number(k.split(",")[0])>=settlement.bundle.width||Number(k.split(",")[1])>=settlement.bundle.height)))fail();if(spark.frontierTargetCell && !state.goalLoops?.goals.some(g=>g.sparkId===spark.id&&g.status==='active'&&g.targetCell?.x===spark.frontierTargetCell!.x&&g.targetCell?.y===spark.frontierTargetCell!.y))fail();if(spark.frontierTargetObjectId&&!state.goalLoops?.goals.some(g=>g.sparkId===spark.id&&g.status==='active'&&g.targetObjectId===spark.frontierTargetObjectId))fail();}
}
