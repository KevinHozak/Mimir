import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { SparkAIBudget } from "./spark-ai-budget.js";
import { createFirstGlowServerAIConfig } from "./first-glow-ai-runtime.js";
import { ORIGINAL_SPARK_ALLOCATION_ID } from "./spark-ai-accounting.js";
const root=fileURLToPath(new URL("../../../.tmp/recorded-cost-tests",import.meta.url));mkdirSync(root,{recursive:true});
const dir=()=>mkdtempSync(join(root,"case-"));
const hash=(n:number)=>"sha256-"+n.toString(16).padStart(64,"0");
test("authorized accounting preserves all ten receipts and USD 5 cap while buffering known cost",()=>{
 const path=join(dir(),"budget.db");let budget=new SparkAIBudget(path);
 for(let n=1;n<=10;n++){const id=budget.reserve(hash(n));budget.complete(id,{n},{estimatedTokenCostMicrousd:300});}
 budget.stop();budget.adoptRecordedCosts("Owner authorized recorded costs plus buffer within original USD 5");
 assert.equal(budget.snapshot().stopped,true);assert.equal(budget.snapshot().attempts,10);
 assert.equal(budget.snapshot().accountedMicrousd,106000);assert.equal(budget.snapshot().remainingMicrousd,4894000);
 assert.equal(budget.snapshot().reservedMicrousd,5000000);assert.equal(budget.snapshot().capMicrousd,5000000);
 budget.resume(4894000,"Owner authorized original allocation continuation");budget.close();
 budget=new SparkAIBudget(path);assert.equal(budget.snapshot().remainingMicrousd,4894000);assert.deepEqual(budget.cached(hash(1)),{n:1});budget.close();
});
test("unknown and in-flight costs retain full holds; over-budget calls and uncertain resume fail closed",()=>{
 const budget=new SparkAIBudget(join(dir(),"budget.db"));budget.stop();budget.adoptRecordedCosts("Owner approved buffered recorded accounting");budget.resume(4900000,"Owner approved run");
 const id=budget.reserve(hash(1));assert.equal(budget.snapshot().accountedMicrousd,600000);
 budget.uncertain(id,"lost-response");assert.equal(budget.snapshot().unsettledMicrousd,500000);
 for(let n=2;n<=9;n++){const id=budget.reserve(hash(n));budget.complete(id,{n},{estimatedTokenCostMicrousd:250000});}
 assert.equal(budget.snapshot().remainingMicrousd,400000);assert.throws(()=>budget.reserve(hash(10)),/exhausted/);
 budget.stop();assert.throws(()=>budget.resume(400000,"Owner approved retry"),/no unresolved/);assert.throws(()=>budget.cached(hash(1)),/uncertain/);budget.close();
});
test("completed receipt with unknown cost retains its hold",()=>{
 const budget=new SparkAIBudget(join(dir(),"budget.db"));const id=budget.reserve(hash(1));budget.complete(id,{},{});budget.stop();budget.adoptRecordedCosts("Owner approved policy");
 assert.equal(budget.snapshot().accountedMicrousd,600000);budget.close();
});
test("handoff retires desktop writer and carries original identity and policy to exactly one target run",()=>{
 const directory=dir(),path=join(directory,"original.db"),copy=join(directory,"target.db");
 const source=new SparkAIBudget(path);const id=source.reserve(hash(1));source.complete(id,{goal:"explore"},{estimatedTokenCostMicrousd:8844});source.stop();source.adoptRecordedCosts("Owner authorized buffered costs");
 const receipt=source.exportForHandoff(copy,"s021-pilot-20261113","Owner authorized S021 with original USD 5");
 assert.equal(receipt.remainingMicrousd,4882312);assert.equal(source.snapshot().retired,true);
 assert.throws(()=>source.resume(4882312,"Old desktop must stay retired"),/exact remaining/);
 assert.throws(()=>source.exportForHandoff(join(directory,"duplicate.db"),"another-pilot","duplicate"),/Handoff requires/);source.close();
 const target=new SparkAIBudget(copy,{allocationId:ORIGINAL_SPARK_ALLOCATION_ID,capMicrousd:5000000});
 assert.equal(target.snapshot().targetRunId,"s021-pilot-20261113");assert.equal(target.snapshot().retired,false);assert.equal(target.snapshot().stopped,true);
 target.resume(4882312,"Owner authorized target writer");assert.deepEqual(target.cached(hash(1)),{goal:"explore"});assert.equal(target.snapshot().attempts,1);target.markWorldBound();assert.equal(target.snapshot().targetWorldBound,true);target.close();
 assert.throws(()=>createFirstGlowServerAIConfig({AI_ENABLED:"false",AI_RUNTIME_MODE:"spark-online",DATABASE_PATH:join(directory,"lost-world.db"),MIMIR_ONLINE_RUN_ID:"s021-pilot-20261113",MIMIR_ONLINE_END_AT:new Date(Date.now()+60000).toISOString(),MIMIR_SPARK_AI_ALLOCATION_ID:ORIGINAL_SPARK_ALLOCATION_ID,MIMIR_SPARK_AI_BUDGET_PATH:copy,MIMIR_SPARK_AI_BUDGET_USD:"5",MIMIR_SPARK_AI_KILL_SWITCH:"enabled"}),/Restore missing/);
 assert.throws(()=>new SparkAIBudget(join(directory,"missing.db"),{allocationId:ORIGINAL_SPARK_ALLOCATION_ID,capMicrousd:5000000}),/existing ledger/);
});

// Recorded costs, rather than historical admission holds, govern restored headroom.
test("paired original-allocation backup accepts historical holds above the cap without losing receipts", async () => {
 const {createBundleInclusiveBackup,validateBackupAllocation}=await import("./backup-lib.js");
 const directory=dir(),sourcePath=join(directory,"original.db"),targetPath=join(directory,"target.db"),worldPath=join(directory,"world.db");
 const source=new SparkAIBudget(sourcePath);for(let n=1;n<=10;n++){const id=source.reserve(hash(n));source.complete(id,{n},{estimatedTokenCostMicrousd:1000});}source.stop();source.adoptRecordedCosts("Owner approved buffered costs");source.exportForHandoff(targetPath,"original-backup-test","Owner approved same-allocation handoff");source.close();
 const target=new SparkAIBudget(targetPath,{allocationId:ORIGINAL_SPARK_ALLOCATION_ID,capMicrousd:5000000});target.resume(4880000,"Owner approved qualification");const id=target.reserve(hash(11));target.complete(id,{n:11},{estimatedTokenCostMicrousd:1000});target.markWorldBound();const receipt=target.receipt(hash(11));assert.ok(target.snapshot().historicalReservedMicrousd>target.snapshot().capMicrousd);target.close();
 const {DatabaseSync}=await import("node:sqlite");const db=new DatabaseSync(worldPath);db.exec("CREATE TABLE online_run_contract(id INTEGER PRIMARY KEY,run_id TEXT,allocation_id TEXT);CREATE TABLE timeline_checkpoints(state_json TEXT)");db.prepare("INSERT INTO online_run_contract VALUES(1,?,?)").run("original-backup-test",ORIGINAL_SPARK_ALLOCATION_ID);db.prepare("INSERT INTO timeline_checkpoints VALUES(?)").run(JSON.stringify({firstGlowState:{goalLoops:{goals:[{providerReceipt:receipt}]}}}));db.close();
 const backup=join(directory,"snapshot.db");assert.ok(createBundleInclusiveBackup(worldPath,backup,directory,targetPath).aiBudget);validateBackupAllocation(backup,backup+".ai-budget.db");
});
