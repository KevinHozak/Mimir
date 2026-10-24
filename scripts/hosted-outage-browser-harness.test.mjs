import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { browserHarnessDocument } from './hosted-outage-browser-harness.mjs';
import { acceptableObserverResponse, createHostedOutageBrowserDriver, inFaultPhase, readyLiveSnapshot, sameLiveSnapshot, terminatedBracket, timelyReadiness, runHostedOutageJourney, advanceHostedOutageJourney } from './hosted-outage-browser-driver.mjs';

function fixture() {
  let now = 1000;
  const intervals = [], timers = [], children = [], lifecycle = [];
  const output = { textContent: '' };
  const document = {
    querySelector: selector => selector === '#status' ? output : { append: frame => children.push(frame) },
    createElement: () => ({ dataset: {}, src: '', contentWindow: { dispatchEvent(event) { lifecycle.push(event.type); } }, remove() { lifecycle.push('remove'); children.splice(children.indexOf(this), 1); } }),
  };
  const context = { window: {}, document, PageTransitionEvent: class { constructor(type) { this.type = type; } }, URL, Map, Number, JSON, Date: { now: () => now }, setInterval: f => intervals.push(f), setTimeout: f => timers.push(f) };
  const html = browserHarnessDocument('https://mimir-realm.web.app');
  vm.runInNewContext(html.match(/<script>([\s\S]*)<\/script>/)[1], context);
  return { harness: context.window.rehearsal, children, lifecycle, advance: ms => { now += ms; intervals.forEach(f => f()); }, timers };
}

test('absolute deadline survives child navigation and closes both observers', () => {
  const f = fixture(); f.harness.arm(181000);
  f.harness.open('live', '/?sparkId=spark-6'); f.harness.open('archive', '/?view=history');
  f.children[0].src = 'https://mimir-realm.web.app/?follow=1';
  f.advance(179999); assert.equal(f.harness.state().observers, 2);
  f.advance(1); assert.equal(f.children.length, 0); assert.equal(f.harness.state().closed, true);
  assert.throws(() => f.harness.open('live', '/')); f.harness.close();
});
test('rejects oversized/rearmed lease, third observer and foreign origin', () => {
  const f = fixture(); assert.throws(() => f.harness.open('live', '/'));
  assert.throws(() => f.harness.arm(181001)); f.harness.arm(4000);
  assert.throws(() => f.harness.arm(5000));
  assert.throws(() => f.harness.open('live', 'https://example.com/'));
  f.harness.open('live', '/'); assert.throws(() => f.harness.open('live', '/'));
  f.harness.open('archive', '/?view=history'); assert.throws(() => f.harness.open('third', '/'));
});
test('delayed wall-clock execution still closes clients', () => {
  const f = fixture(); f.harness.arm(2000); f.harness.open('live', '/');
  f.advance(99999); assert.equal(f.harness.state().closed, true); assert.equal(f.children.length, 0);
});
test('accepts only an exact HTTP origin', () => {
  for (const value of ['https://mimir-realm.web.app/path', 'javascript:alert(1)', 'https://mimir-realm.web.app/']) assert.throws(() => browserHarnessDocument(value));
});
test('optional projection absence never exempts auth or required data failures', () => {
  assert.equal(acceptableObserverResponse('/api/reflection', 404, false), true);
  for (const path of ['/api/world', '/api/live', '/api/reflection']) {
    for (const status of [401, 403, 503]) assert.equal(acceptableObserverResponse(path, status, true), false);
    assert.equal(acceptableObserverResponse(path, 502, false), false);
    assert.equal(acceptableObserverResponse(path, 502, true), true);
  }
  assert.equal(acceptableObserverResponse('/api/world', 404, false), false);
});
test('queued responses use receipt time and the actual browser recovery boundary', () => {
  const events = [{ event: 'stop-requested', elapsed: 60 }, { event: 'recovery-confirmed', elapsed: 100 }];
  assert.equal(inFaultPhase(events, 1000, 60000, 110000), false);
  assert.equal(inFaultPhase(events, 1000, 65000, 110000), true);
  assert.equal(inFaultPhase(events, 1000, 105000, 110000), true);
  assert.equal(inFaultPhase(events, 1000, 111000, 110000), false);
});
test('cold replay needs a VM request initiated after rendering, not a reused or in-flight sample', () => {
  const before = { state: 'TERMINATED', requestedAt: 70, at: 70.2 };
  assert.equal(terminatedBracket(before, 71000, before), false);
  assert.equal(terminatedBracket(before, 71000, { state: 'TERMINATED', requestedAt: 70.9, at: 71.2 }), false);
  assert.equal(terminatedBracket(before, 71000, { state: 'TERMINATED', requestedAt: 71.1, at: 71.3 }), true);
  assert.equal(terminatedBracket(before, 71000, { state: 'PROVISIONING', requestedAt: 71.1, at: 71.3 }), false);
});
test('driver instances keep independent clocks, lease paths and cursors', async () => {
  const firstStart = Date.now(), secondStart = firstStart + 5000;
  const saved = new Map();
  const io = { readFile: async () => JSON.stringify({ authenticated: true, at: Date.now() / 1000 }), writeFile: async (path, value) => saved.set(path, JSON.parse(value)), rename: async (from, to) => { saved.set(to, saved.get(from)); saved.delete(from); } };
  const ready = { scene: true, pulse64: true, follow: true, explanatory: true, selection: 'spark:spark-6', duplicateEvents: false, zoom: '1', eventIds: ['event-64-a','event-64-b','event-64-c','event-64-d','event-64-e','event-64-f'] };
  const make = start => ({ send: async (method, args) => ({ result: { value: method === 'Runtime.evaluate' && args.expression === 'liveSnapshot()' ? ready : method === 'Runtime.evaluate' && args.expression.startsWith('window.rehearsalStart=Date.now()') ? { start, deadline: start + 165000 } : true } }), readEvents: async () => ({ cursor: start, events: [], hasMore: false }) });
  const first = createHostedOutageBrowserDriver({ cdp: make(firstStart), directory: 'first', io });
  const second = createHostedOutageBrowserDriver({ cdp: make(secondStart), directory: 'second', io });
  await first.arm(); await second.arm();
  assert.equal(first.state().startMs, firstStart); assert.equal(second.state().startMs, secondStart);
  assert.equal(saved.get('first/lease.json').start, firstStart / 1000); assert.equal(saved.get('second/lease.json').start, secondStart / 1000);
});
test('reconnect comparison retains selection, Follow, presentation, zoom and event identities', () => {
  const original = { selection: 'spark:spark-6', follow: true, explanatory: true, zoom: '1.5', eventIds: ['event-1', 'event-2'], duplicateEvents: false, error: '' };
  assert.equal(sameLiveSnapshot(original, { ...original, error: 'temporary outage' }), true);
  for (const patch of [{ selection: 'spark:spark-5' }, { follow: false }, { explanatory: false }, { zoom: '1' }, { eventIds: ['event-1', 'event-1'] }]) assert.equal(sameLiveSnapshot(original, { ...original, ...patch }), false);
});
test('new document observation completes before raw child diagnostics', async () => {
  let observed = false;
  const io = { readFile: async () => JSON.stringify({ authenticated: true, at: Date.now() / 1000 }), writeFile: async () => {}, rename: async () => {} };
  const cdp = { send: async (method, args) => {
    if (method === 'Runtime.evaluate' && args.expression.startsWith('window.liveSnapshot=')) assert.equal(observed, true);
    if (method === 'Runtime.evaluate' && args.expression === 'liveSnapshot()') return { result: { value: { scene: true, pulse64: true, follow: true, explanatory: true, selection: 'spark:spark-6', duplicateEvents: false, zoom: '1', eventIds: ['event-64-a','event-64-b','event-64-c','event-64-d','event-64-e','event-64-f'] } } };
    return { result: { value: method === 'Runtime.evaluate' && args.expression.startsWith('window.rehearsalStart=Date.now()') ? { start: Date.now(), deadline: Date.now() + 165000 } : true } };
  }, readEvents: async () => ({ cursor: 0, events: [], hasMore: false }) };
  const driver = createHostedOutageBrowserDriver({ cdp, directory: 'fixture', io, observe: async () => { observed = true; } });
  await driver.arm(); assert.equal(observed, true);
});
test('a late document response is observed through Browser Use before diagnostics retry', async () => {
  let observations = 0, blocked = false;
  const start = Date.now();
  const io = { readFile: async () => JSON.stringify({ authenticated: true, at: Date.now() / 1000 }), writeFile: async () => {}, rename: async () => {} };
  const cdp = { send: async (method, args) => {
    if (method === 'Runtime.evaluate' && !blocked) { blocked = true; throw new Error('Raw CDP is unavailable while Browser Use is resolving a paused document response.'); }
    if (method === 'Runtime.evaluate' && args.expression === 'liveSnapshot()') return { result: { value: { scene: true, pulse64: true, follow: true, explanatory: true, selection: 'spark:spark-6', duplicateEvents: false, zoom: '1', eventIds: ['event-64-a','event-64-b','event-64-c','event-64-d','event-64-e','event-64-f'] } } };
    return { result: { value: method === 'Runtime.evaluate' && args.expression.startsWith('window.rehearsalStart=Date.now()') ? { start, deadline: start + 165000 } : true } };
  }, readEvents: async () => ({ cursor: 0, events: [], hasMore: false }) };
  await createHostedOutageBrowserDriver({ cdp, directory: 'fixture', io, observe: async () => { observations++; } }).arm();
  assert.equal(blocked, true); assert.ok(observations >= 2);
});

test('child pagehide stops streams before frame teardown', () => {
  const f = fixture(); f.harness.arm(2000); f.harness.open('live', '/'); f.harness.open('archive', '/?view=history');
  f.harness.close(); assert.deepEqual(f.lifecycle, ['pagehide', 'remove', 'pagehide', 'remove']);
});

test('replacement reconnect waits for actual routing and retains cached startup assets', async () => {
  let reloaded = false, observed = false, poll = 0; const cache=[];
  const start = Date.now();
  const ready = { scene: true, pulse64: true, follow: true, explanatory: true, selection: 'spark:spark-6', duplicateEvents: false, zoom: '1', eventIds: ['event-64-a','event-64-b','event-64-c','event-64-d','event-64-e','event-64-f'] };
  const saved = new Map();
  const io = {
    readFile: async path => {
      if (path.endsWith('-ready.json')) return JSON.stringify({authenticated: true, at: Date.now()/1000});
      if (path.endsWith('controller.json')) {
        poll++;
        const events = [{event: 'replacement-routing',elapsed:1}];
        if (poll > 1) events.push({event: 'replacement-stream-verified',elapsed:2});
        if (poll > 2) events.push({event: 'replacement-route-verified',elapsed:3});
        return JSON.stringify({events});
      }
      const error = new Error('absent'); error.code='ENOENT'; throw error;
    },
    writeFile: async (path,value) => saved.set(path,JSON.parse(value)),
    rename: async (from,to) => {saved.set(to,saved.get(from));saved.delete(from);},
  };
  const cdp = {send: async (method,args) => {
    if (method==='Network.setCacheDisabled') cache.push(args.cacheDisabled);
    let value=true;
    if (method==='Runtime.evaluate') {
      const expression=args.expression;
      if (expression.startsWith('window.rehearsalStart=')) value={start,deadline:start+165000};
      if (expression==='liveSnapshot()') value=ready;
            if (expression.includes("src='https://mimir-realm.web.app")) {assert.equal(poll,3);reloaded=true;}
      if (expression.startsWith('({live:')) {assert.ok(reloaded && observed); value={live:ready,newDocument:true,archiveReady:true};}
    }
    return {result:{value}};
  },readEvents:async()=>({cursor:0,events:poll>0 ? [{method:'Network.requestWillBeSent',params:{requestId:'fresh',request:{url:'https://mimir-observer-bridge-mah4b2udkq-uc.a.run.app/api/live',method:'GET'},documentURL:'https://mimir-realm.web.app/',wallTime:Date.now()/1000+1,timestamp:1}},{method:'Network.responseReceived',params:{requestId:'fresh',timestamp:1,response:{status:200}}}] : [],hasMore:false})};
  const driver=createHostedOutageBrowserDriver({cdp,directory:'fixture',io,observe:async()=>{observed=true;}});
  await driver.arm(); const result=await driver.readiness();
  assert.ok(result.ready); assert.equal(poll,3); assert.deepEqual(cache,[false]); assert.ok(saved.get('fixture/replacement-browser-ok.json').retainedState);
});


test('baseline waits for the full recorded event list after the first SSE scene', () => {
  const ready={scene:true,pulse64:true,follow:true,explanatory:true,selection:'spark:spark-6',duplicateEvents:false,error:'',zoom:'1',eventIds:['event-64-a','event-64-b','event-64-c','event-64-d','event-64-e','event-64-f']};
  assert.equal(readyLiveSnapshot({...ready,eventIds:[]}),false);
  assert.equal(readyLiveSnapshot({...ready,eventIds:undefined}),false);
  assert.equal(readyLiveSnapshot({...ready,zoom:undefined}),false);
  assert.equal(readyLiveSnapshot(ready),true);
});

test('cold replay resumes between short calls and preserves both fresh VM brackets', async t => {
  let now=100000, start, checkpoint='4', selections=0; t.mock.method(Date,'now',()=>now);
  const saved=new Map();const ready={scene:true,pulse64:true,follow:true,explanatory:true,selection:'spark:spark-6',duplicateEvents:false,error:'',zoom:'1',eventIds:['event-64-a','event-64-b','event-64-c','event-64-d','event-64-e','event-64-f']};
  const io={readFile:async path=>JSON.stringify(path.endsWith('-ready.json')?{authenticated:true,at:now/1000}:path.endsWith('vm-observation.json')?{state:'TERMINATED',requestedAt:now/1000,at:now/1000}:path.endsWith('controller.json')?{events:[{event:'vm-terminated',elapsed:0}]}:{}),writeFile:async(path,value)=>saved.set(path,JSON.parse(value)),rename:async(from,to)=>{saved.set(to,saved.get(from));saved.delete(from);}};
  const cdp={send:async(method,args)=>{
    let value=true;const expression=args?.expression??'';
    if(expression.startsWith('window.rehearsalStart=')){start=now;value={start,deadline:start+165000};}
    if(expression==='liveSnapshot()')value=ready;
    if(expression.includes("s.value='main'"))selections++;
    if(expression.includes("s.value='3'"))checkpoint='3';
    if(expression.startsWith('(()=>{const d='))value={at:now,verified:true,scene:true,checkpoint,proofText:'Pulse '+(checkpoint==='4'?64:48),outcomes:6,error:''};
    return {result:{value}};
  },readEvents:async()=>{now+=1000;return {cursor:0,events:[],hasMore:false};}};
  const driver=createHostedOutageBrowserDriver({cdp,directory:'fixture',io});await driver.arm();
  const first=await driver.coldReplay(2000);assert.equal(first.pending,true);
  const second=await driver.coldReplay(6000);assert.deepEqual(second.verifiedPulses,[64,48]);assert.equal(selections,1);
  const proofs=saved.get('fixture/outage-replay-browser.json');assert.equal(proofs.length,2);
  for(const proof of proofs)assert.ok(terminatedBracket(proof.vmBefore,proof.at,proof.vmAfter));
});

test('a timely recorded VM stop survives late observation without accepting a late gate',()=>{
  const events=[{event:'replacement-route-verified',elapsed:16},{event:'replacement-stream-verified',elapsed:29.4},{event:'stop-requested',elapsed:29.6}];
  assert.ok(timelyReadiness(events,true));
  assert.equal(timelyReadiness(events.slice(0,2),true),false);
  assert.equal(timelyReadiness(events.map(e=>e.event==='replacement-stream-verified'?{...e,elapsed:30.1}:e),true),false);
  assert.equal(timelyReadiness(events.map(e=>e.event==='stop-requested'?{...e,elapsed:30}:e),true),false);
});

test('late browser delivery accepts only gate and stop records made before T+30',async t=>{
  let now=100000;t.mock.method(Date,'now',()=>now);
  for(const late of [false,true]){
    now=100000;let reads=0;const saved=new Map();const ready={scene:true,pulse64:true,follow:true,explanatory:true,selection:'spark:spark-6',duplicateEvents:false,error:'',zoom:'1',eventIds:['event-64-a','event-64-b','event-64-c','event-64-d','event-64-e','event-64-f']};
    const io={readFile:async path=>{
      if(path.endsWith('controller.json')){reads++;return JSON.stringify({events:[{event:'replacement-route-verified',elapsed:16},...(reads>1?[{event:'replacement-stream-verified',elapsed:late?30.1:29.4},{event:'stop-requested',elapsed:29.6}]:[])]});}
      return JSON.stringify({authenticated:true,at:now/1000});
    },writeFile:async(path,value)=>saved.set(path,JSON.parse(value)),rename:async(from,to)=>{saved.set(to,saved.get(from));saved.delete(from);}};
    const cdp={send:async(method,args)=>{
      let value=true;const expression=args?.expression??'';
      if(expression.startsWith('window.rehearsalStart='))value={start:now,deadline:now+165000};
      if(expression==='liveSnapshot()')value=ready;
      if(expression.startsWith('({live:'))value={live:ready,newDocument:true,archiveReady:true};
      return {result:{value}};
    },readEvents:async()=>{if(now>=117000)now=131000;return {cursor:0,events:[],hasMore:false};}};
    const driver=createHostedOutageBrowserDriver({cdp,directory:'fixture',io});await driver.arm();now=117000;
    if(late){await assert.rejects(driver.readiness(),/readiness deadline/);assert.ok(saved.has('fixture/abort'));}
    else{const result=await driver.readiness();assert.ok(result.ready);assert.equal(result.elapsed,29.4);assert.equal(result.observedElapsed,31);assert.equal(saved.has('fixture/abort'),false);}
  }
});

test('phase runner closes automatically on success and on a replay failure',async()=>{
  for(const fail of [false,true]){
    const calls=[];let replay=0,recovery=0;
    const driver={arm:async()=>calls.push('arm'),readiness:async()=>({ready:true}),coldReplay:async()=>{calls.push('replay');if(fail)throw new Error('synthetic');return ++replay===1?{pending:true}:{vmTerminated:true};},recovery:async()=>{calls.push('recovery');return ++recovery===1?{pending:true}:{recovered:true};},close:async()=>{calls.push('close');return {observers:0};}};
    const result=await runHostedOutageJourney(driver);assert.equal(result.passed,!fail);assert.equal(result.phase,'finished');assert.equal(calls.at(-1),'close');assert.equal(calls.filter(x=>x==='arm').length,1);
    if(fail){assert.equal(result.failedPhase,'cold-replay');assert.equal(calls.includes('recovery'),false);}
  }
});
test('a failed readiness phase closes clients before returning to the caller',async()=>{
  let closed=false;const result=await advanceHostedOutageJourney({arm:async()=>{},readiness:async()=>{throw new Error('late');},close:async()=>{closed=true;return {observers:0};}});
  assert.ok(closed);assert.equal(result.passed,false);assert.equal(result.phase,'finished');
});
