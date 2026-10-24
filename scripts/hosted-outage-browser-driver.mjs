import * as files from 'node:fs/promises';
import { browserHarnessInstallExpression } from './hosted-outage-browser-harness.mjs';

const origin = 'https://mimir-realm.web.app';
const bridgeHost = 'mimir-observer-bridge-mah4b2udkq-uc.a.run.app';
const snapshotExpression = `window.liveSnapshot=()=>{const d=document.querySelector('iframe[data-observer="live"]').contentDocument;if(!d?.body)return {scene:false};const f=d.querySelector('[data-testid="follow-controls"]'),e=d.querySelector('[data-testid="objective-events"]'),ids=[...d.querySelectorAll('[data-testid="objective-events"] p[id]')].map(x=>x.id);return {scene:!!d.querySelector('canvas'),pulse64:d.body.innerText.includes('PULSE 64'),selection:d.querySelector('select[aria-label="Selected entity"]')?.value,follow:!!f?.textContent.includes('Tracking committed position'),explanatory:!![...(f?.querySelectorAll('button')??[])].some(b=>b.textContent==='Immersive'),zoom:d.querySelector('canvas')?.dataset.cameraZoom,eventIds:ids,duplicateEvents:new Set(ids).size!==ids.length,eventsText:e?.innerText,error:d.querySelector('[data-testid="first-glow-refresh-error"],[role="alert"]')?.textContent??''}};true`;

export function readyLiveSnapshot(s) {
  return !!s?.scene && s.pulse64 && s.follow && s.explanatory
    && s.selection === 'spark:spark-6' && !s.duplicateEvents && !s.error
    && Number.isFinite(Number(s.zoom)) && Number(s.zoom) > 0
    && Array.isArray(s.eventIds) && s.eventIds.length === 6
    && s.eventIds.every(id => /^event-64-/.test(id));
}

export function timelyReadiness(events, requireStop = false) {
  const names=['replacement-route-verified','replacement-stream-verified',...(requireStop?['stop-requested']:[])];
  return names.every(name=>events.some(e=>e.event===name && Number.isFinite(e.elapsed) && e.elapsed>=0 && e.elapsed<30));
}

export function sameLiveSnapshot(left, right) {
  return JSON.stringify({ ...left, error: '' }) === JSON.stringify({ ...right, error: '' });
}

export function acceptableObserverResponse(path, status, fault) {
  // loadLive deliberately treats reflection as optional; the pinned bridge
  // predates that route. Missing optional capability never exempts auth errors.
  return status === 200 || (path === '/api/reflection' && status === 404) || (fault && status === 502);
}

export function inFaultPhase(events, startMs, receivedAt, recoveredAt = Infinity) {
  const stop = events.find(event => event.event === 'stop-requested');
  return !!stop && receivedAt >= startMs + stop.elapsed * 1000 && receivedAt <= recoveredAt;
}

export function terminatedBracket(before, proofAt, after) {
  return before?.state === 'TERMINATED' && after?.state === 'TERMINATED'
    && before.at * 1000 <= proofAt && after.requestedAt * 1000 >= proofAt
    && after.at >= after.requestedAt;
}

/** One bounded call advances a phase; failures and success both close clients immediately. */
export async function advanceHostedOutageJourney(driver, state = {phase:'readiness',passed:false}) {
  try {
    if(state.phase==='readiness') {
      await driver.arm();state.readiness=await driver.readiness();
      if(!state.readiness.ready)throw new Error('Readiness not verified');
      state.phase='cold-replay';return state;
    }
    if(state.phase==='cold-replay') {
      state.replay=await driver.coldReplay();
      if(state.replay.pending)return state;
      if(!state.replay.vmTerminated)throw new Error('Cold replay not verified');
      state.phase='live-recovery';return state;
    }
    if(state.phase==='live-recovery') {
      state.recovery=await driver.recovery();
      if(state.recovery.pending)return state;
      if(!state.recovery.recovered)throw new Error('Live recovery not verified');
      state.passed=true;
    }
  } catch(error) { state.passed=false;state.errorClass=error.name;state.failedPhase=state.phase; }
  try {state.closed=await driver.close();if(state.closed.observers!==0)state.passed=false;}
  catch(error) {state.passed=false;state.closeErrorClass=error.name;}
  state.phase='finished';return state;
}

export async function runHostedOutageJourney(driver, progress = async () => {}) {
  let state;
  do {
    try {await progress(state?.phase ?? 'readiness');} catch { /* diagnostics cannot block cleanup */ }
    state=await advanceHostedOutageJourney(driver,state);
  } while(state.phase!=='finished');
  return state;
}

/** Invoke only inside cua_repl with its documented, origin-scoped CDP handle.
 * Every run owns its context: no cell-global clock/path/cursor is captured.
 * No browser auth state, headers, response bodies or query strings are exported.
 */
export function createHostedOutageBrowserDriver({ cdp, directory, io = files, observe = async () => {} }) {
  const context = { directory, startMs: 0, cursor: 0, network: [], requests: new Map(), baseline: null, sequence: 0, readiness: { reconnected: false, marked: false } };
  const write = async (name, value) => {
    const pending = `${directory}/${name}.${++context.sequence}.next`;
    await io.writeFile(pending, JSON.stringify(value));
    await io.rename(pending, `${directory}/${name}`);
  };
  const read = async name => {
    try { return JSON.parse(await io.readFile(`${directory}/${name}`, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  };
  const evaluate = async expression => {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true }, { timeoutMs: 10000 });
        if (result.exceptionDetails) throw new Error('Browser diagnostic command failed');
        return result.result.value;
      } catch (error) {
        if (!String(error.message).includes('paused document response') || attempt === 4) throw error;
        // A child/auth document can begin loading after the preceding snapshot.
        // Complete the normal Browser Use observation before trying diagnostics.
        await observe();
      }
    }
  };
  const elapsed = () => Date.now() - context.startMs;
  const drain = async () => {
    const methods = ['Network.requestWillBeSent', 'Network.responseReceived', 'Network.loadingFailed'];
    let batch;
    do {
      batch = await cdp.readEvents({ afterSequence: context.cursor, methods, limit: 1000, timeoutMs: 500 });
      context.cursor = batch.cursor;
      if (batch.truncated) throw new Error('Network evidence was truncated');
      for (const event of batch.events) {
        const p = event.params ?? {};
        if (event.method === 'Network.requestWillBeSent') {
          let url, document;
          try { url = new URL(p.request.url); document = new URL(p.documentURL); } catch { continue; }
          if (!['http:', 'https:'].includes(url.protocol)) continue;
          context.requests.set(p.requestId, { host: url.hostname, path: url.pathname, method: p.request.method, frame: p.frameId, archive: document.searchParams.get('view') === 'history', at: p.wallTime * 1000, clockOffset: (p.wallTime - p.timestamp) * 1000 });
        } else if (event.method === 'Network.responseReceived') {
          const request = context.requests.get(p.requestId);
          if (request) {
            const receivedAt = Number.isFinite(request.clockOffset + p.timestamp * 1000) ? request.clockOffset + p.timestamp * 1000 : Date.now();
            context.network.push({ ...request, status: p.response.status, receivedAt, observedAt: Date.now(), diskCache: !!p.response.fromDiskCache, serviceWorker: !!p.response.fromServiceWorker });
            if (request.host === bridgeHost && request.method === 'GET' && request.path.startsWith('/api/') && p.response.status !== 200) {
              const controller = await read('controller.json');
              const fault = inFaultPhase(controller?.events ?? [], context.startMs, receivedAt, context.recoveredAt);
              if (!acceptableObserverResponse(request.path, p.response.status, fault)) { await write('browser-network.json', context.network); await write('abort', { reason: 'Unexpected observer response', status: p.response.status }); throw new Error('Unexpected observer response'); }
            }
          }
        } else if (p.canceled === false) {
          const request = context.requests.get(p.requestId);
          if (request) context.network.push({ ...request, networkFailure: true, observedAt: Date.now() });
        }
      }
    } while (batch.hasMore);
  };
  const fail = async message => { await write('abort', { reason: message }); throw new Error(message); };
  return {
    state: () => ({ directory: context.directory, startMs: context.startMs }),
    async arm() {
      for (const role of ['watchdog', 'controller']) {
        const prepared = await read(`${role}-ready.json`);
        if (!prepared?.authenticated || Date.now() / 1000 - prepared.at >= 110) throw new Error('Fresh prepared process missing; clock not started');
      }
      await evaluate(browserHarnessInstallExpression(origin));
      await cdp.send('Network.enable', {});
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
      context.cursor = (await cdp.readEvents({ methods: ['Network.requestWillBeSent', 'Network.responseReceived', 'Network.loadingFailed'] })).cursor;
      const armed = await evaluate("window.rehearsalStart=Date.now();rehearsal.arm(rehearsalStart+165000);rehearsal.open('live','/?sparkId=spark-6&follow=1&presentation=explanatory');rehearsal.open('archive','/?view=history');({start:rehearsalStart,deadline:rehearsal.state().deadline})");
      context.startMs = armed.start;
      // Browser Use must finish its document-response observation before raw
      // diagnostics may inspect newly navigated child documents.
      await observe();
      await evaluate(snapshotExpression);
      while (elapsed() < 25000) {
        const s = await evaluate('liveSnapshot()');
        if (readyLiveSnapshot(s)) { context.baseline = s; break; }
        await drain();
      }
      if (!context.baseline) return fail('Baseline readiness failed before controller activation');
      await write('baseline-browser.json', context.baseline);
      // Leave this document alive while cancellation crosses the network. The
      // controller wakes the original process before moving traffic, and requires
      // its real final-zero record before any VM stop.
      await evaluate("document.querySelector('iframe[data-observer=live]').contentWindow.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false}));true");
      await drain();
      await write('original-client-stopped.json', { at: Date.now() / 1000, cancellationIssued: true });
      // Activate the already authenticated processes only after the original
      // client is ready; retain the original global clock and client deadline.
      await write('lease.json', { start: armed.start / 1000, heartbeat: Date.now() / 1000, deadline: armed.deadline / 1000 });
    },
    async readiness(untilMs = 30000) {
      const end = Math.min(untilMs, 30000);
      while (!context.baseline && elapsed() < 25000) {
        const s = await evaluate('liveSnapshot()');
        if (readyLiveSnapshot(s)) { context.baseline = s; break; }
        await drain();
      }
      if (!context.baseline) return fail('Baseline readiness failed');
      await write('baseline-browser.json', context.baseline);
      const progress = context.readiness;
      while (elapsed() < end) {
        const controller = await read('controller.json');
        if (controller?.events.some(e => e.event === 'aborted')) return fail('Controller aborted before readiness');
        if (!progress.reconnected && controller?.events.some(e => e.event === 'replacement-route-verified')) {
          await evaluate("document.querySelector('iframe[data-observer=live]').contentWindow.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false}));document.querySelector('iframe[data-observer=live]').src='https://mimir-realm.web.app/?sparkId=spark-6&follow=1&presentation=explanatory&rehearsal=reconnect';true");
          await observe();
          progress.reconnectAt = Date.now();
          progress.reconnected = true;
        }
        if (progress.reconnected && !progress.marked) {
          const s = await evaluate("({live:liveSnapshot(),newDocument:document.querySelector('iframe[data-observer=live]').contentWindow.location.search.includes('rehearsal=reconnect'),archiveReady:[...document.querySelector('iframe[data-observer=archive]').contentDocument.querySelectorAll('option')].some(o=>o.value==='main')})");
          if (s.newDocument && !s.live.error && s.live.scene && s.archiveReady && sameLiveSnapshot(s.live, context.baseline)) {
            await write('replacement-browser-ok.json', { reconnected: true, retainedState: true, archiveReady: true, candidateProcessVerified: false, deadline: (context.startMs + 165000) / 1000, at: Date.now() / 1000 });
            progress.marked = true;
          }
        }
        if (progress.marked && timelyReadiness(controller?.events ?? [])) return { ready: true, elapsed: Math.max(...controller.events.filter(e=>['replacement-route-verified','replacement-stream-verified'].includes(e.event)).map(e=>e.elapsed)), observedElapsed: elapsed() / 1000, retainedEventIds: context.baseline.eventIds.length };
        await drain();
      }
      if (end < 30000) return { pending: true, elapsed: elapsed() / 1000 };
      const finalController=await read('controller.json');
      if (progress.marked && !finalController?.events.some(e=>e.event==='aborted') && timelyReadiness(finalController?.events ?? [],true)) {
        return {ready:true,elapsed:finalController.events.find(e=>e.event==='replacement-stream-verified').elapsed,observedElapsed:elapsed()/1000,retainedEventIds:context.baseline.eventIds.length};
      }
      return fail('Automated readiness deadline');
    },
    async coldReplay(untilMs = 110000) {
      // Cache is allowed for immutable startup assets; cold replay must use the network.
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      const progress = context.replay ??= { selected: false, stage: 0, pending: undefined, proofs: [] };
      const end = Math.min(untilMs, elapsed() + 15000, 110000);
      while (elapsed() < end || (untilMs === 110000 && progress.selected && elapsed() < 110000)) {
        const vm = await read('vm-observation.json'), controller = await read('controller.json');
        if (controller?.events.some(e => e.event === 'aborted')) return fail('Controller aborted before replay');
        const terminated = controller?.events.find(e => e.event === 'vm-terminated');
        if (terminated && elapsed() >= (terminated.elapsed + 10) * 1000) return fail('Ten-second cold replay deadline');
        if (progress.pending) {
          if (vm?.requestedAt * 1000 >= progress.pending.proof.at) {
            if (!terminatedBracket(progress.pending.before, progress.pending.proof.at, vm)) return fail('Replay not bracketed by fresh terminated VM reads');
            progress.proofs.push({ ...progress.pending.proof, pulse: progress.pending.pulse, vmBefore: progress.pending.before, vmAfter: vm });
            progress.pending = undefined;
            if (++progress.stage === 2) { await write('outage-replay-browser.json', progress.proofs); return { verifiedPulses: [64, 48], vmTerminated: true, elapsed: elapsed() / 1000 }; }
            await evaluate("{const f=document.querySelector('iframe[data-observer=archive]'),s=f.contentDocument.querySelectorAll('select')[1];s.value='3';s.dispatchEvent(new f.contentWindow.Event('change',{bubbles:true}));} true");
          }
          await drain();
          continue;
        }
        if (vm?.state === 'TERMINATED' && Date.now() / 1000 - vm.at < 3) {
          if (!progress.selected) { await evaluate("{const f=document.querySelector('iframe[data-observer=archive]'),s=f.contentDocument.querySelector('select');s.value='main';s.dispatchEvent(new f.contentWindow.Event('change',{bubbles:true}));} true"); progress.selected = true; }
          const proof = await evaluate("(()=>{const d=document.querySelector('iframe[data-observer=archive]').contentDocument,h=[...d.querySelectorAll('h2')].find(x=>x.textContent==='Verified local replay'),s=d.querySelectorAll('select')[1];return {at:Date.now(),verified:!!h,proofText:h?.parentElement.innerText??'',checkpoint:s?.value,scene:!!d.querySelector('canvas'),outcomes:d.querySelector('[data-testid=archive-recorded-events]')?.querySelectorAll('p').length??0,error:d.querySelector('[role=alert]')?.textContent??''};})()");
          const pulse = progress.stage === 0 ? 64 : 48;
          if (proof.verified && proof.scene && proof.checkpoint === (progress.stage === 0 ? '4' : '3') && new RegExp(`Pulse\\s+${pulse}\\b`).test(proof.proofText)) {
            progress.pending = { proof, pulse, before: vm };
          }
        }
        await drain();
      }
      if (end < 110000) return { pending: true, elapsed: elapsed() / 1000 };
      return fail('Cold replay deadline not met');
    },
    async recovery(untilMs = 160000) {
      const end = Math.min(untilMs, elapsed() + 15000, 160000);
      while (elapsed() < end) {
        const controller = await read('controller.json');
        const live = await evaluate('liveSnapshot()');
        await drain();
        const watchdog = await read('watchdog.json');
        const restartedAt = watchdog?.startRequestedAt;
        const freshStream = Number.isFinite(restartedAt) && context.network.some(r => r.host === bridgeHost && r.path === '/api/live' && r.status === 200 && r.at >= restartedAt * 1000);
        if (controller?.events.some(e => e.event === 'recovery-confirmed') && freshStream && !live.error && sameLiveSnapshot(live, context.baseline)) {
          context.recoveredAt = Date.now();
          await write('recovery-browser.json', { recovered: true, elapsed: elapsed() / 1000, retainedState: true, freshStream: true, duplicateEvents: live.duplicateEvents });
          return { recovered: true, elapsed: elapsed() / 1000, retainedState: true, freshStream: true };
        }
      }
      if (end < 160000) return { pending: true, elapsed: elapsed() / 1000 };
      return fail('Automatic live recovery deadline');
    },
    async close() {
      const state = await evaluate('rehearsal.close();rehearsal.state()');
      try { await drain(); }
      finally { await write('browser-network.json', context.network); await write('browser-closed.json', { ...state, at: Date.now() }); }
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
      return { closed: state.closed, observers: state.observers, elapsed: elapsed() / 1000 };
    },
  };
}
