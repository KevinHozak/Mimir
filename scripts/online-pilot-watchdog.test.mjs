import test from 'node:test';import assert from 'node:assert/strict';
import {validatePilot,assessPilot,collectUsage,closeOwnedBridge,bridgeCostMicrousd} from './online-pilot-watchdog.mjs';
const config={runId:'s021-pilot-test',revision:'mimir-observer-bridge-s021-test',startsAt:'2026-11-13T00:00:00.000Z',endsAt:'2026-11-14T00:00:00.000Z'};
test('hosting cutoff is conservative, monotonic, fixed to one 24-hour run',()=>{
 assert.equal(bridgeCostMicrousd(3600,100000000),277300);
 const state=assessPilot(config,{}, {seconds:20000,bytes:0},Date.parse(config.startsAt));assert.equal(state.stop,true);
 assert.equal(assessPilot(config,state,{seconds:0,bytes:0},Date.parse(config.startsAt)).stop,true);
 assert.throws(()=>assessPilot({...config,endsAt:'2026-11-14T01:00:00.000Z'},state,{seconds:0,bytes:0}),/contract/);
 assert.equal(assessPilot(config,{}, {seconds:0,bytes:0},Date.parse(config.endsAt)).reason,'deadline');
 assert.throws(()=>bridgeCostMicrousd(NaN,0),/invalid/);assert.throws(()=>validatePilot({...config,revision:'another-service'}),/contract/);
});
test('usage reads all DELTA pages and rejects unknown metrics',async()=>{
 let calls=0;
 const result=await collectUsage(config,async url=>{calls++;const q=new URL(url).searchParams;return q.get('filter').includes('billable_instance_time')?{timeSeries:[{metricKind:'DELTA',valueType:'DOUBLE',points:[{value:{doubleValue:10}}]}],...(!q.has('pageToken')?{nextPageToken:'more'}:{})}:{timeSeries:[{metricKind:'DELTA',valueType:'INT64',points:[{value:{int64Value:'1000'}}]}]};});
 assert.deepEqual(result,{seconds:20,bytes:1000});assert.equal(calls,3);
 await assert.rejects(collectUsage(config,async()=>({timeSeries:[{metricKind:'GAUGE',valueType:'DOUBLE'}]})),/unexpected/);
});
test('cutoff verifies owned traffic, etag and completed ingress restriction',async()=>{
 let closed=false,patched=false;
 await closeOwnedBridge(config,async(url,body)=>{
  if(body){assert.equal(body.etag,'test-etag');assert.equal(body.ingress,'INGRESS_TRAFFIC_INTERNAL_ONLY');patched=true;closed=true;return{done:true};}
  return{etag:'test-etag',trafficStatuses:[{percent:100,revision:'projects/test/locations/test/revisions/'+config.revision}],ingress:closed?'INGRESS_TRAFFIC_INTERNAL_ONLY':'INGRESS_TRAFFIC_ALL'};
 });assert.equal(patched,true);
 await assert.rejects(closeOwnedBridge(config,async()=>({trafficStatuses:[{percent:100,revision:'other'}]})),/ownership/);
});
