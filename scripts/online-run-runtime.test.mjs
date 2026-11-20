import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {testPort,stopTestProcesses} from '../scripts/test-runtime.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),dir=join(root,'.tmp/s021-runtime');mkdirSync(dir,{recursive:true});const run=mkdtempSync(join(dir,'case-'));
let port=await testPort();const path=join(run,'world.db');
const endsAt=new Date(Date.now()+30000).toISOString();
const env={...process.env,PORT:String(port),HOST:'127.0.0.1',DATABASE_PATH:path,AUTO_PULSE:'false',AI_ENABLED:'false',AI_RUNTIME_MODE:'rules-only',MIMIR_SPARK_GOALS:'true',MIMIR_ONLINE_RUN_ID:'qualification-001',MIMIR_ONLINE_END_AT:endsAt,MIMIR_SPARK_AI_ALLOCATION_ID:'rules-only',OWNER_TOKEN:'isolated-test-owner',WORLD_BUNDLE_ROOT:join(root,'assets/world/generated')};
let child;
const start=async()=>{
  // Test database ownership independently of loopback port reuse on restart.
  port=await testPort();
  env.PORT=String(port);
  const server=spawn(process.execPath,['packages/server/dist/index.js'],{cwd:root,env,stdio:['ignore','ignore','inherit']});
  return server;
};
const get=async p=>{const r=await fetch(`http://127.0.0.1:${port}${p}`,{signal:AbortSignal.timeout(1000)});assert.equal(r.status,200);return r.json();};
const wait=async()=>{
  const deadline=performance.now()+15000;
  while(performance.now()<deadline){
    if(child.exitCode!==null||child.signalCode!==null)throw Error(`isolated server exited before health (${child.exitCode??child.signalCode})`);
    try{return await get('/health');}catch{}
    await new Promise(r=>setTimeout(r,100));
  }
  throw Error('isolated server failed to start');
};
const post=async(p,body={})=>fetch(`http://127.0.0.1:${port}${p}`,{method:'POST',headers:{'content-type':'application/json','x-owner-token':'isolated-test-owner'},body:JSON.stringify(body)});
try{
 child=await start();await wait();assert.equal((await post('/api/pulse')).status,200);const before=await get('/api/world');assert.equal(before.state.worldId,env.MIMIR_ONLINE_RUN_ID);assert.equal((await post('/api/owner/ai/stop')).status,200);
 const duplicate=spawn(process.execPath,['packages/server/dist/index.js'],{cwd:root,env:{...env,PORT:String(await testPort())},stdio:'ignore'});await new Promise(r=>duplicate.on('exit',code=>{assert.notEqual(code,0);r();}));
 await stopTestProcesses([child]);env.AUTO_PULSE='true';env.PULSE_INTERVAL_MS='1000';child=await start();assert.equal((await wait()).schedulerPaused,true);assert.deepEqual(await get('/api/world'),before);
 assert.equal((await post('/api/scheduler',{paused:false,intervalMs:60000})).status,200);await stopTestProcesses([child]);env.AUTO_PULSE='false';child=await start();assert.equal((await wait()).schedulerPaused,true);
 await new Promise(r=>setTimeout(r,Math.max(0,Date.parse(endsAt)-Date.now()+50)));
 assert.equal((await post('/api/pulse')).status,409);assert.equal((await post('/api/scheduler',{paused:false})).status,409);
 assert.equal((await get('/health')).onlineRun.expired,true);assert.deepEqual(await get('/api/world'),before);
 const evidence={passed:true,runDirectory:run,restartIdentical:true,secondWriterRejected:true,expiredPulseRejected:true,expiredResumeRejected:true,paidRequests:0};writeFileSync(join(run,'result.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{await stopTestProcesses([child]);}
