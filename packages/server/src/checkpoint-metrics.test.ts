import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DatabaseSync} from "node:sqlite";
import {advanceWorld,createWorldFromBundle,type WorldState} from "@mimir/engine";
import {normalizeState} from "./state.js";
import {CheckpointMetrics,projectCheckpointMetrics} from "./checkpoint-metrics.js";
const bundle=JSON.parse(readFileSync(new URL("../../../assets/world/generated/sha256-1ee5c0af5f365d8dee6aaef585dcc986d4286074c84f24a88ec4e77fcb0a079e/world.json",import.meta.url),"utf8"));
const fresh=()=>createWorldFromBundle(bundle,4,"metrics-test",6,{goalLoops:true});

test("chart projection preserves checkpoint measurements without traversing geometry or history",()=>{
 let world=fresh();
 for(let p=0;p<8;p++) {
  const normalized=normalizeState(structuredClone(world)),sparks=normalized.firstGlowState.settlements.flatMap(s=>s.sparks);
  const expected={pulse:world.pulse,foodReserve:0,averageTrust:0,hungryVillagers:sparks.filter(s=>s.chargeDeficit>0).length,travelingVillagers:sparks.filter(s=>s.status==="traveling").length,collectingVillagers:sparks.filter(s=>s.intendedActivity==="draw-charge").length,sourceCharge:normalized.firstGlowState.settlements.reduce((n,s)=>n+s.sourceCharge,0),communalCharge:normalized.firstGlowState.settlements.reduce((n,s)=>n+s.communalCharge,0),averageReadiness:Math.round(sparks.reduce((n,s)=>n+s.readiness,0)/sparks.length),averageChargeDeficit:Math.round(sparks.reduce((n,s)=>n+s.chargeDeficit,0)/sparks.length)};
  const measured=structuredClone(world);
  Object.defineProperty(measured.firstGlowState.settlements[0],"bundle",{get(){throw Error("Chart read traversed geometry");}});
  Object.defineProperty(measured.firstGlowState,"history",{get(){throw Error("Chart read traversed replay history");}});
  assert.deepEqual(projectCheckpointMetrics(measured,world.pulse),expected);world=advanceWorld(world).state;
 }
});

test("incremental metrics reread the mutable head, append history and reset on timeline change",()=>{
 const db=new DatabaseSync(":memory:");db.exec("CREATE TABLE timeline_checkpoints(timeline_id TEXT,pulse INTEGER,state_json TEXT,PRIMARY KEY(timeline_id,pulse))");
 const put=(id:string,w:WorldState)=>db.prepare("INSERT OR REPLACE INTO timeline_checkpoints VALUES(?,?,?)").run(id,w.pulse,JSON.stringify(w));
 const reads:number[]=[];let rowsRead=0;
 const cache=new CheckpointMetrics((id,from)=>{reads.push(from);const rows=db.prepare("SELECT pulse,state_json FROM timeline_checkpoints WHERE timeline_id=? AND pulse>=? ORDER BY pulse").all(id,from) as {pulse:number;state_json:string}[];rowsRead+=rows.length;return rows;});
 const zero=fresh(),one=advanceWorld(zero).state,two=advanceWorld(one).state;put("a",zero);put("a",one);
 assert.deepEqual(cache.read("a").map(s=>s.pulse),[0,1]);assert.equal(rowsRead,2);
 one.firstGlowState.settlements[0].sourceCharge=17;put("a",one);put("a",two);
 const updated=cache.read("a");assert.deepEqual(updated.map(s=>s.pulse),[0,1,2]);assert.equal(updated[1].sourceCharge,17);assert.equal(rowsRead,4);assert.deepEqual(reads,[0,1]);
 updated.pop();assert.equal(cache.read("a").length,3);
 put("b",zero);assert.deepEqual(cache.read("b").map(s=>s.pulse),[0]);assert.equal(reads.at(-1),0);db.close();
});

test("unsupported checkpoints and malformed measured values fail without cached partial results",()=>{
 const world=fresh();assert.throws(()=>projectCheckpointMetrics({...world,simulationVersion:"old"} as unknown as WorldState,0),/Invalid/);
 assert.throws(()=>projectCheckpointMetrics(world,1),/Invalid/);world.firstGlowState.settlements[0].sparks[0].readiness=NaN;assert.throws(()=>projectCheckpointMetrics(world,0),/Invalid/);
});
