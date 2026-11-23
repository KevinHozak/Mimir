import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Offline synthetic rehearsal only; this is not a live admission or polling driver.
export async function withSyntheticPollingBrowser(work, { preparationMs = 4500000 } = {}) {
  if (!Number.isInteger(preparationMs) || preparationMs <= 0 || preparationMs > 4500000) throw new Error('Invalid preparation lease');
  const server = await chromium.launchServer({ headless: true });
  const child = fork(fileURLToPath(new URL('./polling-refresh-watchdog.mjs', import.meta.url)), [], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'], windowsHide: true, detached: true });
  let browser;
  const acknowledge = (message, expected) => new Promise((resolve, reject) => {
    const finish = error => {
      clearTimeout(timer);
      child.off('message', onMessage); child.off('exit', onExit); child.off('error', onExit);
      error ? reject(new Error('Polling watchdog unavailable')) : resolve();
    };
    const onMessage = value => finish(!value?.[expected]);
    const onExit = () => finish(true);
    const timer = setTimeout(() => finish(true), 5000);
    child.once('message', onMessage); child.once('exit', onExit); child.once('error', onExit);
    child.send(message, error => { if (error) finish(true); });
  });
  try {
    await acknowledge({ kind: 'owned-browser', pid: server.process().pid, preparationMs }, 'ready');
    browser = await chromium.connect(server.wsEndpoint());
    const context = await browser.newContext({ offline: true, serviceWorkers: 'block' });
    await context.route('**/*', route => route.abort());
    let armed = false;
    return await work({ context, async armObserverWindow(ms = 480000) {
      if (armed || !Number.isInteger(ms) || ms <= 0 || ms > 480000) throw new Error('Invalid or repeated observer window');
      armed = true;
      await acknowledge({ kind: 'observer-window', ms }, 'observerArmed');
    } });
  } finally {
    await browser?.close().catch(() => {});
    await server.close().catch(() => {});
    if ((server.process().exitCode !== null || server.process().signalCode !== null) && child.connected) child.send({ kind: 'target-exited' }, () => {});
    if (child.connected) child.disconnect();
  }
}
