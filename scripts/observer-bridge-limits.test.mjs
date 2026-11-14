import assert from 'node:assert/strict';import {createServer} from 'node:http';import {once} from 'node:events';import {createObserverBridgeServer} from './observer-bridge.mjs';
let upstreamRequests=0;
const upstream=createServer((req,res)=>{upstreamRequests++;if(req.url==='/api/live'){res.writeHead(200,{'content-type':'text/event-stream'});res.write('data: {}\n\n');}else{res.writeHead(200,{'content-type':'application/json'});res.end('x'.repeat(1024));}});
upstream.listen(0,'127.0.0.1');await once(upstream,'listening');
const bridge=createObserverBridgeServer({upstreamOrigin:`http://127.0.0.1:${upstream.address().port}`,verifyObserverToken:async a=>a==='Bearer synthetic-owner',maxStreams:1,maxRequestsPerMinute:4,maxResponseBytes:32});
bridge.listen(0,'127.0.0.1');await once(bridge,'listening');const url=`http://127.0.0.1:${bridge.address().port}`,headers={authorization:'Bearer synthetic-owner'},controller=new AbortController();
try{
 const first=await fetch(url+'/api/live',{headers,signal:controller.signal});assert.equal(first.status,200);
 assert.equal((await fetch(url+'/api/live',{headers})).status,429);assert.equal(upstreamRequests,1);
 await assert.rejects(async()=>{const r=await fetch(url+'/api/world',{headers});await r.text();});
 assert.equal((await fetch(url+'/api/goals',{headers,method:'HEAD'})).status,200); // headers may arrive before the capped body is aborted
 assert.equal((await fetch(url+'/api/world',{headers})).status,429);
 controller.abort();console.log('Pilot stream, authenticated read rate and response-size bounds passed');
}finally{controller.abort();bridge.closeAllConnections();upstream.closeAllConnections();await Promise.all([new Promise(r=>bridge.close(r)),new Promise(r=>upstream.close(r))]);}
