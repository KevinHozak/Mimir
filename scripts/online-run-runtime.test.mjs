import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {testPort,stopTestProcesses} from '../scripts/test-runtime.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),dir=join(root,'.tmp/s021-runtime');mkdirSync(dir,{recursive:true});const run=mkdtempSync(join(dir,'case-'));
const port=await testPort(),path=join(run,'world.db');
const endsAt=new Date(Date.now()+20000).toISOString();
const env={...process.env,PORT:String(port),HOST:'127.0.0.1',DATABASE_PATH:path,AUTO_PULSE:'false',AI_ENABLED:'false',AI_RUNTIME_MODE:'rules-only',MIMIR_SPARK_GOALS:'true',MIMIR_ONLINE_RUN_ID:'qualification-001',MIMIR_ONLINE_END_AT:endsAt,MIMIR_SPARK_AI_ALLOCATION_ID:'rules-only',OWNER_TOKEN:'isolated-test-owner',WORLD_BUNDLE_ROOT:join(root,'assets/world/generated')};
let child;
const start=()=>spawn(process.execPath,['packages/server/dist/index.js'],{cwd:root,env,stdio:'ignore'});
const get=async p=>{const r=await fetch(`http://127.0.0.1:${port}${p}`);assert.equal(r.status,200);return r.json();};
const wait=async()=>{for(let i=0;i<70;i++){try{return await get('/health');}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('isolated server failed to start');};
const post=async(p,body={})=>fetch(`http://127.0.0.1:${port}${p}`,{method:'POST',headers:{'content-type':'application/json','x-owner-token':'isolated-test-owner'},body:JSON.stringify(body)});
try{
 child=start();await wait();assert.equal((await post('/api/pulse')).status,200);const before=await get('/api/world');assert.equal(before.state.worldId,env.MIMIR_ONLINE_RUN_ID);assert.equal((await post('/api/owner/ai/stop')).status,200);
 const duplicate=start();await new Promise(r=>duplicate.on('exit',code=>{assert.notEqual(code,0);r();}));
 await stopTestProcesses([child]);env.AUTO_PULSE='true';env.PULSE_INTERVAL_MS='1000';child=start();assert.equal((await wait()).schedulerPaused,true);assert.deepEqual(await get('/api/world'),before);
 assert.equal((await post('/api/scheduler',{paused:false,intervalMs:60000})).status,200);await stopTestProcesses([child]);env.AUTO_PULSE='false';child=start();assert.equal((await wait()).schedulerPaused,true);
 await new Promise(r=>setTimeout(r,Math.max(0,Date.parse(endsAt)-Date.now()+50)));
 assert.equal((await post('/api/pulse')).status,409);assert.equal((await post('/api/scheduler',{paused:false})).status,409);
 assert.equal((await get('/health')).onlineRun.expired,true);assert.deepEqual(await get('/api/world'),before);
 const evidence={passed:true,runDirectory:run,restartIdentical:true,secondWriterRejected:true,expiredPulseRejected:true,expiredResumeRejected:true,paidRequests:0};writeFileSync(join(run,'result.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{await stopTestProcesses([child]);}
