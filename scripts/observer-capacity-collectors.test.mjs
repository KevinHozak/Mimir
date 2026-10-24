import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { execFileSync } from "node:child_process";
import { resourceSample, installCapacityTelemetry } from "./observer-capacity-bridge.mjs";

test("cgroup v2/v1 resources are direct and unavailable values fail closed", () => {
  assert.deepEqual(resourceSample(p=>p.endsWith("cpu.stat") ? "usage_usec 120\nuser_usec 20" : "1024"),{cpuUsageUsec:120,memoryBytes:1024});
  assert.deepEqual(resourceSample(p=>{if(p.includes("cpu.stat"))throw Error();return p.includes("cpuacct")?"120000":"1024";}),{cpuUsageUsec:120,memoryBytes:1024});
  assert.throws(()=>resourceSample(()=>"invalid"));
});

test("fresh telemetry includes process identity, no private values, and stops at lease expiry", async()=>{
  const server=new EventEmitter();server.observerStreamSnapshot=()=>({processSession:"fixture",timestamp:new Date().toISOString(),activeRequests:0,activeUpstreamStreams:0});
  let closed=false;server.close=()=>{closed=true;server.emit("close");};server.closeAllConnections=()=>{};
  const rows=[];installCapacityTelemetry(server,{emit:r=>rows.push(r),revision:"fixture",sample:()=>({cpuUsageUsec:123,memoryBytes:456}),intervalMs:250,leaseMs:560});
  await delay(650);assert.equal(closed,true);assert.ok(rows.length>=2);assert.equal(rows[0].sequence,1);
  assert.equal(rows.at(-1).activeRequests,0);assert.doesNotMatch(JSON.stringify(rows),/Bearer|email|upstreamOrigin/);
  const count=rows.length;await delay(270);assert.equal(rows.length,count);
});

test("resource failures never turn into fabricated zeros",()=>{
  const server=new EventEmitter();server.observerStreamSnapshot=()=>({});const rows=[];
  const timer=installCapacityTelemetry(server,{emit:r=>rows.push(r),revision:"fixture",sample:()=>{throw Error("private body");}});
  timer.close();assert.equal(rows[0].unavailable,true);assert.equal(rows[0].activeRequests,undefined);assert.doesNotMatch(JSON.stringify(rows),/private body/);
});

test("VM samples and bridge clocks/identity reject stale or malformed observations",()=>{
  const source = `import importlib.util,datetime
s=importlib.util.spec_from_file_location('c','scripts/observer-capacity-collectors.py');c=importlib.util.module_from_spec(s);s.loader.exec_module(c)
assert c.fresh_rows([{'at':100}],102)['at']==100
for rows,now in [([],100),([{'at':100}],104),([{'at':101}],100)]:
 try:c.fresh_rows(rows,now);raise AssertionError('accepted')
 except ValueError:pass
p={'kind':'observer-capacity','revision':'r','processSession':'p','sequence':1,'timestamp':'1970-01-01T00:01:40+00:00','activeRequests':0,'activeUpstreamStreams':0}
assert c.bridge_rows([{'jsonPayload':p}],102,'r')[0]['sequence']==1
for now in [99,106]:
 try:c.bridge_rows([{'jsonPayload':p}],now,'r');raise AssertionError('accepted')
 except ValueError:pass
assert 'mode=ro' in c.VM_COLLECTOR
assert '600' in c.VM_COLLECTOR
print('Collector freshness checks passed')`;
  execFileSync("python",["-B","-c",source],{stdio:"inherit"});
});


test("rollback guard protects original resources and independently expires preparation and live windows",()=>{
 const code=`import importlib.util,tempfile,pathlib,json
from unittest.mock import Mock
s=importlib.util.spec_from_file_location('w','scripts/observer-capacity-watchdog.py');w=importlib.util.module_from_spec(s);s.loader.exec_module(w)
assert w.due(100,None,640) and not w.due(100,None,639)
assert w.due(100,200,350) and not w.due(100,200,349)
with tempfile.TemporaryDirectory(dir='.tmp') as d:
 p=pathlib.Path(d);(p/'candidate.json').write_text(json.dumps({'name':w.g.ORIGINAL}));c=Mock()
 try:w.cleanup(p,c);raise AssertionError('accepted original')
 except ValueError:pass
 c.call.assert_not_called()
 (p/'candidate.json').write_text(json.dumps({'name':w.g.SERVICE+'-s010-owned'}));c.restore.return_value=False;assert not w.cleanup(p,c);c.call.assert_not_called()
 c.restore.return_value=True;c.call.side_effect=RuntimeError('cloud HTTP 404');assert w.cleanup(p,c)
print('Independent exact rollback checks passed')`;
 execFileSync("python",["-B","-c",code],{stdio:"inherit"});
});


test("whole-second HTTP clocks use uncertainty bounds instead of rejecting fresh records as future",()=>{
 const code=`import importlib.util
s=importlib.util.spec_from_file_location('v','scripts/observer-capacity-collectors.py');v=importlib.util.module_from_spec(s);s.loader.exec_module(v)
b=v.clock_offset_bounds(112,100,100.3);assert b['upper']==13 and abs(b['lower']-11.7)<1e-9
p={'kind':'observer-capacity','revision':'r','processSession':'p','sequence':1,'timestamp':'1970-01-01T00:01:55.5+00:00','activeRequests':2,'activeUpstreamStreams':2}
try:v.bridge_rows([{'jsonPayload':p}],115,'r');raise AssertionError('rounded clock accepted future sample')
except ValueError:pass
assert v.bridge_rows([{'jsonPayload':p}],116,'r')[0]['activeRequests']==2
try:v.clock_offset_bounds(112,100,103);raise AssertionError('slow clock accepted')
except ValueError:pass`;
 execFileSync("python",["-B","-c",code],{stdio:"inherit"});
});


test("the exact temporary bootstrap listens, keeps auth denial, counts bytes and closes without leaks",async()=>{
 const {startCapacityBridge}=await import("./observer-capacity-bridge.mjs");const {once}=await import("node:events");
 const server=startCapacityBridge({FIREBASE_PROJECT_ID:"synthetic-capacity-test",PUBLIC_OBSERVER_EMAILS:"approved@example.invalid",OBSERVER_UPSTREAM_ORIGIN:"http://10.0.0.1:9",PORT:"0"});
 await once(server,"listening");
 try {const response=await fetch(`http://127.0.0.1:${server.address().port}/api/world`);assert.equal(response.status,401);await response.text();const row=server.observerStreamSnapshot();assert.equal(row.totalHttpRequests,1);assert.ok(row.responseBytes>0);assert.equal(row.activeUpstreamStreams,0);}
 finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});


test("samples emitted while the Logging request is in flight use response receipt time",()=>{
 const code=`import importlib.util
s=importlib.util.spec_from_file_location('v','scripts/observer-capacity-collectors.py');v=importlib.util.module_from_spec(s);s.loader.exec_module(v)
p={'kind':'observer-capacity','revision':'r','processSession':'p','sequence':1,'timestamp':'1970-01-01T00:01:55.5+00:00','activeRequests':2,'activeUpstreamStreams':2}
try:v.bridge_rows([{'jsonPayload':p}],115,'r');raise AssertionError('request-start clock accepted future sample')
except ValueError:pass
assert v.bridge_response_rows([{'jsonPayload':p}],'r',104,12)[0]['activeRequests']==2`;
 execFileSync("python",["-B","-c",code],{stdio:"inherit"});
});


test("bounded cross-service clock skew never widens the fifteen-second freshness envelope",()=>{
 const code=`import importlib.util
s=importlib.util.spec_from_file_location('v','scripts/observer-capacity-collectors.py');v=importlib.util.module_from_spec(s);s.loader.exec_module(v)
p={'kind':'observer-capacity','revision':'r','processSession':'p','sequence':1,'timestamp':'1970-01-01T00:01:55.5+00:00','activeRequests':2,'activeUpstreamStreams':2}
assert v.bridge_response_rows([{'jsonPayload':p}],'r',103,12)[0]['activeRequests']==2
for received in [100,110]:
 try:v.bridge_response_rows([{'jsonPayload':p}],'r',received,12);raise AssertionError('outside clock bound accepted')
 except ValueError:pass
try:v.bridge_response_rows([{'jsonPayload':p}],'r',104,12,max_age=14);raise AssertionError('widened gap accepted')
except ValueError:pass`;
 execFileSync("python",["-B","-c",code],{stdio:"inherit"});
});


test("stats-only probes deny missing/wrong/expired keys and never enter the private upstream",async()=>{
 const {startCapacityBridge}=await import("./observer-capacity-bridge.mjs");const {once}=await import("node:events");
 const server=startCapacityBridge({FIREBASE_PROJECT_ID:"synthetic-capacity-test",PUBLIC_OBSERVER_EMAILS:"approved@example.invalid",OBSERVER_UPSTREAM_ORIGIN:"http://10.0.0.1:9",PORT:"0",MIMIR_CAPACITY_KEY:"synthetic-only-key",MIMIR_CAPACITY_EXPIRES_AT:String(Date.now()+60000)},{sample:()=>{throw Error("synthetic unavailable");}});
 await once(server,"listening");const url=`http://127.0.0.1:${server.address().port}/__capacity`;
 try {
  for(const headers of [{},{"x-mimir-capacity-key":"wrong"}]) {const response=await fetch(url,{headers});assert.equal(response.status,401);const body=await response.text();assert.doesNotMatch(body,/processSession|memoryBytes|synthetic-only-key/);assert.equal(response.headers.get("cache-control"),"no-store");}
  const result=await fetch(url,{headers:{"x-mimir-capacity-key":"synthetic-only-key"}});assert.equal(result.status,503);assert.equal(server.observerStreamSnapshot().activeUpstreamStreams,0);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 const expired=startCapacityBridge({FIREBASE_PROJECT_ID:"synthetic-capacity-test",PUBLIC_OBSERVER_EMAILS:"approved@example.invalid",OBSERVER_UPSTREAM_ORIGIN:"http://10.0.0.1:9",PORT:"0",MIMIR_CAPACITY_KEY:"synthetic-only-key",MIMIR_CAPACITY_EXPIRES_AT:"1"});await once(expired,"listening");
 try{const response=await fetch(`http://127.0.0.1:${expired.address().port}/__capacity`,{headers:{"x-mimir-capacity-key":"synthetic-only-key"}});assert.equal(response.status,401);}finally{expired.closeAllConnections();await new Promise(resolve=>expired.close(resolve));}
});


test("authorized direct probes return only fixed current counters and resource measurements",async()=>{
 const {startCapacityBridge}=await import("./observer-capacity-bridge.mjs");const {once}=await import("node:events");
 const server=startCapacityBridge({FIREBASE_PROJECT_ID:"synthetic-capacity-test",PUBLIC_OBSERVER_EMAILS:"approved@example.invalid",OBSERVER_UPSTREAM_ORIGIN:"http://10.0.0.1:9",PORT:"0",MIMIR_CAPACITY_KEY:"synthetic-only-key",MIMIR_CAPACITY_EXPIRES_AT:String(Date.now()+60000)},{sample:()=>({cpuUsageUsec:123,memoryBytes:456})});
 await once(server,"listening");try{const response=await fetch(`http://127.0.0.1:${server.address().port}/__capacity`,{headers:{"x-mimir-capacity-key":"synthetic-only-key"}});assert.equal(response.status,200);const row=await response.json();assert.equal(row.cpuUsageUsec,123);assert.equal(row.memoryBytes,456);assert.equal(row.activeRequests,0);assert.equal(row.activeUpstreamStreams,0);assert.equal(row.sequence,1);assert.doesNotMatch(JSON.stringify(row),/synthetic-only-key|approved@example|10.0.0.1/);}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});


test("bounded fixture closes only non-stream private upstream pools and preserves authorization",async()=>{
 const {closeIdleUpstreamConnections}=await import("./observer-capacity-bridge.mjs");const calls=[];
 const request=closeIdleUpstreamConnections("http://10.0.0.1:8888",async(input,init)=>{calls.push({url:String(input),headers:new Headers(init.headers)});return "ok";});
 await request("http://10.0.0.1:8888/api/world",{headers:{authorization:"synthetic-auth"}});assert.equal(calls[0].headers.get("connection"),"close");assert.equal(calls[0].headers.get("authorization"),"synthetic-auth");
 await request("http://10.0.0.1:8888/api/live",{headers:{authorization:"synthetic-auth"}});assert.equal(calls[1].headers.get("connection"),null);
 await request("https://example.invalid/certificates",{});assert.equal(calls[2].headers.get("connection"),null);
});


test("two streams plus ordinary reads drain all upstream sockets despite long backend keepalive",async()=>{
 const {createServer}=await import("node:http"),{once}=await import("node:events");
 const {createObserverBridgeServer}=await import("./observer-bridge.mjs");const {closeIdleUpstreamConnections}=await import("./observer-capacity-bridge.mjs");const {runBoundedRehearsal}=await import("./observer-rehearsal.mjs");
 const sockets=new Set();const upstream=createServer((req,res)=>{if(req.url==="/api/live"){res.writeHead(200,{"content-type":"text/event-stream"});res.write("data: fixture\n\n");}else res.end("{}");});upstream.keepAliveTimeout=72000;upstream.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket));});upstream.listen(0,"127.0.0.1");await once(upstream,"listening");
 const original=globalThis.fetch;globalThis.fetch=closeIdleUpstreamConnections(`http://127.0.0.1:${upstream.address().port}`,original);
 const bridge=createObserverBridgeServer({upstreamOrigin:`http://127.0.0.1:${upstream.address().port}`,verifyObserverToken:async()=>true});bridge.listen(0,"127.0.0.1");await once(bridge,"listening");
 try{
  const origin=`http://127.0.0.1:${bridge.address().port}`;const running=runBoundedRehearsal({targetOrigin:origin,windowMs:350,rampDelayMs:25});await delay(100);
  await Promise.all(Array.from({length:5},async()=>{const response=await fetch(origin+"/api/world");await response.text();}));const result=await running;assert.equal(result.totalErrors,0);assert.equal(result.peakClients,2);
  for(let i=0;i<100&&sockets.size;i++)await delay(10);assert.equal(sockets.size,0);assert.equal(bridge.observerStreamSnapshot().activeUpstreamStreams,0);
 }finally{globalThis.fetch=original;bridge.closeAllConnections();upstream.closeAllConnections();await Promise.all([new Promise(resolve=>bridge.close(resolve)),new Promise(resolve=>upstream.close(resolve))]);}
});


test("absolute collector stop cannot be extended by cold startup and shorter rollback lease stays bounded",()=>{
 const code=`import importlib.util
s=importlib.util.spec_from_file_location('w','scripts/observer-capacity-watchdog.py');w=importlib.util.module_from_spec(s);s.loader.exec_module(w)
assert w.due(100,None,340,lease_seconds=270)
assert not w.due(100,None,339,lease_seconds=270)
assert w.due(100,150,300,lease_seconds=270)
try:w.due(100,None,200,lease_seconds=700);raise AssertionError('unbounded lease')
except ValueError:pass`;
 execFileSync("python",["-B","-c",code],{stdio:"inherit"});
});

test("absolute collector deadline is calculated from creation rather than process startup",async()=>{
 const {capacityLeaseMs}=await import("./observer-capacity-bridge.mjs");
 assert.equal(capacityLeaseMs(undefined,1000),600000);assert.equal(capacityLeaseMs("271000",1000),270000);
 assert.equal(capacityLeaseMs("271000",51000),220000);assert.equal(capacityLeaseMs("1000",2000),1);
 assert.throws(()=>capacityLeaseMs("invalid",1000));assert.throws(()=>capacityLeaseMs("900000",1000));
});


test("immutable capacity samples preserve history while the previous snapshot is held open on Windows",()=>{
 const code=`import importlib.util,tempfile,pathlib,json,os
s=importlib.util.spec_from_file_location('v','scripts/observer-capacity-collectors.py');v=importlib.util.module_from_spec(s);s.loader.exec_module(v)
with tempfile.TemporaryDirectory(dir='.tmp') as d:
 root=pathlib.Path(d);old=root/'observations.json';old.write_text('{}');handle=None
 if os.name=='nt':
  import ctypes
  kernel=ctypes.WinDLL('kernel32',use_last_error=True);kernel.CreateFileW.restype=ctypes.c_void_p
  handle=kernel.CreateFileW(str(old.resolve()),0x80000000,1,None,3,0,None);assert handle not in [None,ctypes.c_void_p(-1).value]
 try:
  first=v.record_capacity_sample(root/'samples',1,{'elapsed':1,'streams':2});second=v.record_capacity_sample(root/'samples',2,{'elapsed':2,'streams':0})
  assert json.loads(first.read_text())['streams']==2 and json.loads(second.read_text())['streams']==0
  try:v.record_capacity_sample(root/'samples',1,{'streams':0});raise AssertionError('sample overwritten')
  except FileExistsError:pass
  assert old.read_text()=='{}'
 finally:
  if handle:kernel.CloseHandle(ctypes.c_void_p(handle))
for root in [pathlib.Path('.'),pathlib.Path('.tmp')]:
 try:v.record_capacity_sample(root,1,{});raise AssertionError('unsafe root')
 except ValueError:pass`;
 execFileSync("python",["-B","-c",code],{stdio:"inherit"});
});


test("capacity controller diagnostics keep fixed handoff failures but discard arbitrary private error text",()=>{
 const code=`import importlib.util,pathlib
s=importlib.util.spec_from_file_location('c','scripts/observer-capacity-controller.py');c=importlib.util.module_from_spec(s);s.loader.exec_module(c)
assert c.failure_detail(RuntimeError('private status handoff unavailable'))=='private status handoff unavailable'
assert c.failure_detail(ValueError('synthetic private response'))=='ValueError'
source=pathlib.Path('scripts/observer-capacity-controller.py').read_text()
assert 'record_capacity_sample' in source and "g.write(r/'observations.json'" not in source`;
 execFileSync("python",["-B","-c",code],{stdio:"inherit"});
});


test("reusable controller executes its direct probe and fails a missing VM baseline without cloud operations",()=>{
 const code=`import importlib.util,tempfile,pathlib,json,time,email.utils,io
from unittest.mock import Mock,patch
s=importlib.util.spec_from_file_location('c','scripts/observer-capacity-controller.py');c=importlib.util.module_from_spec(s);s.loader.exec_module(c)
class Response(io.BytesIO):
 status=200
 def __init__(self,value,headers):super().__init__(json.dumps(value).encode());self.headers=headers
with tempfile.TemporaryDirectory(dir='.tmp') as d:
 root=pathlib.Path(d);(root/'candidate.json').write_text(json.dumps({'name':'synthetic','createdAt':time.time()-81}));(root/'candidate-url.json').write_text(json.dumps({'url':'https://synthetic.invalid'}))
 cloud=Mock(token='synthetic-only');cloud.call.side_effect=[{'spec':{'containers':[{'env':[{'name':'MIMIR_CAPACITY_KEY','value':'synthetic-only'}]}]}},{'status':{'url':'https://synthetic.invalid'}}]
 row={'kind':'observer-capacity','revision':'synthetic','sequence':1,'processSession':'p',**{k:0 for k in ['activeRequests','activeUpstreamStreams','cpuUsageUsec','memoryBytes','responseBytes','totalHttpRequests']}}
 responses=[Response({}, {'Date':email.utils.formatdate(time.time(),usegmt=True)}),Response(row,{'Cache-Control':'no-store'})]
 with patch.object(c.g,'Cloud',return_value=cloud),patch.object(c.urllib.request,'urlopen',side_effect=responses):
  try:c.run(root);raise AssertionError('missing VM baseline accepted')
  except RuntimeError as error:assert str(error)=='Collector preflight failed; no load'
 assert json.loads((root/'abort').read_text())['errorClass']=='AssertionError'
 assert cloud.call.call_count==2`;
 execFileSync("python",["-B","-c",code],{stdio:"inherit"});
});


test("reusable controller journals samples and completes exact-cleanup handoffs with a mocked hosted lifecycle",()=>{
 const code=`import importlib.util,tempfile,pathlib,json,email.utils,io
from unittest.mock import Mock,patch
s=importlib.util.spec_from_file_location('c','scripts/observer-capacity-controller.py');c=importlib.util.module_from_spec(s);s.loader.exec_module(c)
class Response(io.BytesIO):
 status=200
 def __init__(self,value,headers):super().__init__(json.dumps(value).encode());self.headers=headers
clock=[1000.0];sequence=[0]
with tempfile.TemporaryDirectory(dir='.tmp') as d:
 root=pathlib.Path(d);base={'integrity':True,'singleWriter':True,'paused':True,'pulse':64,'backupsHealthy':True,'tableHashes':{'fixture':'unchanged'}}
 for name,value in {'candidate.json':{'name':'synthetic','createdAt':1000},'candidate-url.json':{'url':'https://synthetic.invalid'},'run-lease.json':{'start':1015},'browser-closed.json':{'at':1017},'vm-stop-path.json':{'path':'/tmp/mimir-s010-synthetic.stop'}}.items():(root/name).write_text(json.dumps(value))
 cloud=Mock(token='synthetic-only');cloud.call.side_effect=[{'spec':{'containers':[{'env':[{'name':'MIMIR_CAPACITY_KEY','value':'synthetic-only'}]}]}},{'status':{'url':'https://synthetic.invalid'}}]
 def urlopen(request,**kwargs):
  if request.full_url==c.g.RUN:return Response({}, {'Date':email.utils.formatdate(clock[0],usegmt=True)})
  sequence[0]+=1;n=2 if clock[0]==1016 else 0
  row={'kind':'observer-capacity','revision':'synthetic','sequence':sequence[0],'processSession':'p','activeRequests':n,'activeUpstreamStreams':n,'cpuUsageUsec':0,'memoryBytes':1,'responseBytes':1,'totalHttpRequests':1}
  with (root/'vm-samples.jsonl').open('a') as f:f.write(json.dumps({'memoryFraction':.4,'receivedAt':clock[0],'networkBytes':1000,'upstreamSockets':n,'baseline':base})+'\\n')
  return Response(row,{'Cache-Control':'no-store'})
 def sleep(seconds):clock[0]+=seconds
 def stop(*args,**kwargs):
  for name in ['cloud-cleanup.json','vm-worker-exit.json']:(root/name).write_text('{}')
  return Mock(returncode=0)
 with patch.object(c.g,'Cloud',return_value=cloud),patch.object(c.urllib.request,'urlopen',side_effect=urlopen),patch.object(c.time,'time',side_effect=lambda:clock[0]),patch.object(c.time,'monotonic',side_effect=lambda:clock[0]),patch.object(c.time,'sleep',side_effect=sleep),patch.object(c.subprocess,'run',side_effect=stop):c.run(root)
 final=json.loads((root/'final-status.json').read_text());assert final['withinOverall'] and not final['aborted'];assert json.loads((root/'final-recovery.json').read_text())['passed'];assert list((root/'samples').glob('*.json'));assert (root/'observations-final.json').exists()
`;
 execFileSync("python",["-B","-c",code],{stdio:"inherit"});
});
