import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {createObserverBridgeServer} from './observer-bridge.mjs';
let reached = 0;
const upstream=createServer((request,response)=>{reached++;response.writeHead(200,{'content-type':'application/json'});response.end(JSON.stringify({path:request.url}));});
upstream.listen(0,'127.0.0.1');await once(upstream,'listening');
const bridge=createObserverBridgeServer({upstreamOrigin:`http://127.0.0.1:${upstream.address().port}`,verifyObserverToken:async value=>value==='Bearer synthetic-owner'});
bridge.listen(0,'127.0.0.1');await once(bridge,'listening');
const url=`http://127.0.0.1:${bridge.address().port}`;
try {
 for(const path of ['/api/goals','/api/history?timelineId=main&pulse=1','/api/social/config']) {
  assert.equal((await fetch(url+path)).status,401);
  const response=await fetch(url+path,{headers:{authorization:'Bearer synthetic-owner'}});
  assert.equal(response.status,200);assert.equal((await response.json()).path,path);
 }
 const before=reached;
 for(const path of ['/api/owner/ai/stop','/api/pulse','/api/scheduler','/api/backup/status']) {
  assert.equal((await fetch(url+path,{headers:{authorization:'Bearer synthetic-owner'}})).status,404);
  assert.equal((await fetch(url+path,{method:'POST',headers:{authorization:'Bearer synthetic-owner'}})).status,405);
 }
 assert.equal(reached,before);
 console.log('Authenticated goal/history/status reads and owner-route exclusion passed');
} finally {
 bridge.closeAllConnections();upstream.closeAllConnections();
 await Promise.all([new Promise(r=>bridge.close(r)),new Promise(r=>upstream.close(r))]);
}
