import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePrivateAiEndpoint,removePrivateAiEndpoint} from './online-private-ai-endpoint.mjs';
const config={runId:'spark-pilot-test',name:'projects/mimir-realm/locations/us-central1/regionalEndpoints/spark-pilot-test-ai-us'};
const endpoint={name:config.name,targetGoogleApi:'aiplatform.us.rep.googleapis.com',labels:{mimir_run:config.runId},network:'projects/mimir-realm/global/networks/default',subnetwork:'projects/mimir-realm/regions/us-central1/subnetworks/default'};
test('cleanup deletes only the owned endpoint and waits for verified absence',async()=>{
 let deleted=false,polls=0;
 assert.deepEqual(await removePrivateAiEndpoint(config,async(url,method)=>{
  if(method==='DELETE'){deleted=true;return {name:'projects/mimir-realm/locations/us-central1/operations/cleanup-1'};}
  if(url.endsWith('/operations/cleanup-1')){polls++;return {done:true};}
  return deleted?null:endpoint;
 },async()=>{}),{absent:true});assert.equal(polls,1);
});
test('cleanup is idempotent and rejects ownership changes before deletion',async()=>{
 assert.deepEqual(await removePrivateAiEndpoint(config,async()=>null),{absent:true});
 for(const change of [{targetGoogleApi:'aiplatform.eu.rep.googleapis.com'},{labels:{}},{network:'projects/other/global/networks/default'}]) {
  let deletes=0;await assert.rejects(removePrivateAiEndpoint(config,async(url,method)=>{if(method)deletes++;return {...endpoint,...change};}),/ownership/);assert.equal(deletes,0);
 }
 assert.throws(()=>validatePrivateAiEndpoint({...config,name:config.name+'/other'}),/contract/);
 assert.throws(()=>validatePrivateAiEndpoint({name:'projects/mimir-realm/locations/us-central1/regionalEndpoints/undefined-ai-us'}),/contract/);
 await assert.rejects(removePrivateAiEndpoint(config,async(url,method)=>method?{done:true}:endpoint),/unverified/);
});
