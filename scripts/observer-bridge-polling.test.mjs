import assert from 'node:assert/strict';
import {createServer} from 'node:http';import {once} from 'node:events';
import {createObserverBridgeServer} from './observer-bridge.mjs';
let reached=0;const upstream=createServer((req,res)=>{reached++;res.setHeader('content-type','application/json');if(req.url?.includes('slow')){res.write('{');return;}res.end(JSON.stringify({value:'x'.repeat(100000)}));});
upstream.listen(0,'127.0.0.1');await once(upstream,'listening');
const all=[];async function bridge(extra={}){const s=createObserverBridgeServer({upstreamOrigin:`http://127.0.0.1:${upstream.address().port}`,verifyObserverToken:async a=>a==='Bearer synthetic-owner',pollingOnly:true,gzipResponses:true,maxResponseBytes:200000,maxWireResponseBytes:2000,maxBytesPerMinute:4000,...extra});s.listen(0,'127.0.0.1');await once(s,'listening');all.push(s);return `http://127.0.0.1:${s.address().port}`;}
const headers={authorization:'Bearer synthetic-owner','accept-encoding':'gzip'};
try{
 const url=await bridge();assert.equal((await fetch(url+'/api/live')).status,401);assert.equal((await fetch(url+'/api/live',{headers})).status,405);assert.equal(reached,0);
 for(let i=0;i<2;i++){const r=await fetch(url+'/api/world',{headers});assert.equal(r.status,200);assert.equal(r.headers.get('content-encoding'),'gzip');assert.match(r.headers.get('vary'),/Accept-Encoding/);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal((await r.json()).value.length,100000);}
 assert.equal(all[0].observerStreamSnapshot().activeUpstreamStreams,0);
 const raw=await bridge({maxWireResponseBytes:200000,maxBytesPerMinute:300000});const uncompressed=await fetch(raw+'/api/world',{headers:{...headers,'accept-encoding':'gzip;q=0'}});assert.equal(uncompressed.headers.get('content-encoding'),null);assert.equal((await uncompressed.json()).value.length,100000);
 const small=await bridge({maxResponseBytes:64});await assert.rejects(async()=>{await(await fetch(small+'/api/world',{headers})).text();});
 const wire=await bridge({maxWireResponseBytes:32});await assert.rejects(async()=>{await(await fetch(wire+'/api/world',{headers})).text();});
 const before=reached;const expired=await bridge({endsAt:'2020-01-01T00:00:00Z'});assert.equal((await fetch(expired+'/api/world',{headers})).status,410);assert.equal(reached,before);
 const slow=await bridge({readTimeoutMs:20});await assert.rejects(async()=>{await(await fetch(slow+'/api/world?slow=1',{headers})).text();});
 assert.equal((await fetch(url+'/api/scheduler',{headers,method:'POST'})).status,405);
 console.log('Polling-only denial, auth, compressed wire accounting, raw limits, deadlines and cleanup passed');
}finally{for(const s of all)s.closeAllConnections();upstream.closeAllConnections();await Promise.all([...all,upstream].map(s=>new Promise(r=>s.close(r))));}
