// Synthetic rehearsal only. The watchdog starts and owns its browser.
let target, timer, deadline, armed = false, initialized = false, launching, stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  clearTimeout(timer);
  // A disconnect during launch must not leave a browser created after cleanup.
  if (launching) await launching.catch(() => {});
  if (target) { try { process.kill(target); } catch { /* already exited */ } }
  process.exit(0);
}
process.on('disconnect', stop);
process.on('message', async message => {
  if (!initialized) {
    if (!['owned-browser', 'launch-browser'].includes(message?.kind) ||
        (message.kind === 'owned-browser' && (!Number.isInteger(message.pid) || message.pid <= 0 || message.pid === process.pid)) ||
        !Number.isInteger(message.preparationMs) || message.preparationMs <= 0 || message.preparationMs > 4500000) return stop();
    initialized = true;
    deadline = performance.now() + message.preparationMs;
    timer = setTimeout(stop, message.preparationMs);
    if (message.kind === 'owned-browser') {
      target = message.pid;
      process.send?.({ ready: true });
    } else {
      try {
        launching = (async () => {
          const { chromium } = await import('playwright');
          const server = await chromium.launchServer({ headless: true });
          target = server.process().pid;
          server.process().once('exit', () => { target = undefined; if (!stopping) void stop(); });
          return server.wsEndpoint();
        })();
        const endpoint = await launching;
        if (!stopping && process.connected) process.send?.({ ready: true, endpoint });
      } catch { void stop(); }
    }
  } else if (message?.kind === 'observer-window') {
    if (armed || !Number.isInteger(message.ms) || message.ms <= 0 || message.ms > 480000) return stop();
    armed = true;
    deadline = Math.min(deadline, performance.now() + message.ms);
    clearTimeout(timer);
    timer = setTimeout(stop, Math.max(0, deadline - performance.now()));
    process.send?.({ observerArmed: true });
  } else if (message?.kind === 'target-exited') {
    target = undefined;
    stop();
  } else stop();
});
setTimeout(() => { if (!initialized) void stop(); }, 5000).unref();
