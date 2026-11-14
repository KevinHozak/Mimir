import type { WorldState } from "@mimir/engine";

/** Chart measurements are projections, not replay or spatial validation. */
export function projectCheckpointMetrics(raw: WorldState, pulse: number) {
  const state=raw?.firstGlowState;
  if(raw?.simulationVersion!=="mimir-sim-v3-first-glow" || raw.spatialModel!=="structured-v2" || state?.schemaVersion!==3 || state.simulationVersion!==raw.simulationVersion || state.spatialModel!==raw.spatialModel || state.themeId!=="living-circuit" || state.ageId!=="first-glow" || state.pulse!==pulse || !Number.isSafeInteger(pulse) || pulse<0 || !Array.isArray(state.settlements)) throw Error("Invalid First Glow metrics checkpoint");
  let sourceCharge=0,communalCharge=0,count=0,readiness=0,deficit=0,hungry=0,traveling=0,collecting=0;
  const nonnegative=(value:number)=>Number.isSafeInteger(value)&&value>=0;
  for(const settlement of state.settlements) {
    if(!nonnegative(settlement.sourceCharge)||!nonnegative(settlement.communalCharge)||!Array.isArray(settlement.sparks))throw Error("Invalid First Glow metrics settlement");
    sourceCharge+=settlement.sourceCharge;communalCharge+=settlement.communalCharge;
    for(const spark of settlement.sparks) {
      if(!nonnegative(spark.chargeDeficit)||!nonnegative(spark.readiness)||spark.readiness>100||typeof spark.status!=="string"||typeof spark.intendedActivity!=="string")throw Error("Invalid First Glow metrics Spark");
      count++;readiness+=spark.readiness;deficit+=spark.chargeDeficit;hungry+=Number(spark.chargeDeficit>0);traveling+=Number(spark.status==="traveling");collecting+=Number(spark.intendedActivity==="draw-charge");
    }
  }
  if(![sourceCharge,communalCharge,count,readiness,deficit].every(Number.isSafeInteger))throw Error("Invalid First Glow metrics totals");
  return Object.freeze({pulse,foodReserve:0,averageTrust:0,hungryVillagers:hungry,travelingVillagers:traveling,collectingVillagers:collecting,sourceCharge,communalCharge,averageReadiness:count?Math.round(readiness/count):0,averageChargeDeficit:count?Math.round(deficit/count):0});
}

type Row={pulse:number;state_json:string};
/** One active timeline; only its mutable head and newly appended checkpoints are reread. */
export class CheckpointMetrics {
  private timelineId: string | undefined;
  private samples: ReturnType<typeof projectCheckpointMetrics>[]=[];
  constructor(private readonly readRows:(timelineId:string,fromPulse:number)=>Iterable<Row>) {}
  read(timelineId:string) {
    const cached=this.timelineId===timelineId?this.samples:[];
    const fromPulse=cached.at(-1)?.pulse??0;
    const updates:ReturnType<typeof projectCheckpointMetrics>[]=[];
    for(const row of this.readRows(timelineId,fromPulse)) {
      if(row.pulse<fromPulse || (updates.length&&row.pulse<=updates.at(-1)!.pulse))throw Error("Metrics checkpoint order changed");
      updates.push(projectCheckpointMetrics(JSON.parse(row.state_json) as WorldState,row.pulse));
    }
    if(cached.length&&!updates.length)throw Error("Metrics checkpoint history changed");
    const result=[...cached.filter(sample=>sample.pulse<fromPulse),...updates];
    this.timelineId=timelineId;this.samples=result;
    return [...result];
  }
}
