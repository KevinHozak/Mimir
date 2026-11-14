import test from 'node:test';
import assert from 'node:assert/strict';
import { requestSpark } from './spark-ai-cloud-broker.mjs';
const payload = JSON.stringify({contents:[{role:'user',parts:[{text:'fictional Spark'}]}], generationConfig:{candidateCount:1,maxOutputTokens:2048,thinkingConfig:{thinkingLevel:'MINIMAL'},responseMimeType:'application/json',responseSchema:{type:'OBJECT'}}});
test('cloud broker uses metadata and pinned US endpoint without emitting credentials', async()=>{
 const calls=[];
 const receipt=await requestSpark(payload,async(url, options)=>{
  calls.push({url,options});
  return Response.json(calls.length===1?{access_token:'private-test-value',token_type:'Bearer'}:calls.length===2?{totalTokens:100}:{modelVersion:'gemini-3.5-flash-lite'});
 });
 assert.equal(receipt.ok,true);assert.equal(calls.length,3);
 assert.equal(calls[0].options.headers['Metadata-Flavor'],'Google');
 assert.match(calls[2].url,/^https:\/\/aiplatform.us.rep.googleapis.com\/v1\/projects\/mimir-realm\/locations\/us\/publishers\/google\/models\/gemini-3.5-flash-lite:generateContent$/);
 assert.equal(calls[2].options.redirect,'error');
 assert.equal(JSON.stringify(receipt).includes('private-test-value'),false);
});
test('rejects oversized input before metadata, and never generates after count failure',async()=>{
 let calls=0;const fetch=async()=>{calls++;return calls===1?Response.json({access_token:'private',token_type:'Bearer'}):Response.json({totalTokens:16385});};
 assert.equal((await requestSpark('x'.repeat(16385),fetch)).ok,false);assert.equal(calls,0);
 assert.equal((await requestSpark(payload,fetch)).ok,false);assert.equal(calls,2);
});
test('sanitizes provider errors and never retries a rejected generation',async()=>{
 let calls=0;
 const receipt=await requestSpark(payload,async()=>{calls++;return calls===1?Response.json({access_token:'private',token_type:'Bearer'}):calls===2?Response.json({totalTokens:12}):new Response('private provider error',{status:403});});
 assert.equal(calls,3);assert.deepEqual(receipt,{ok:false,stage:'generateContent',httpStatus:403,error:'bounded-provider-request-failed'});
});
