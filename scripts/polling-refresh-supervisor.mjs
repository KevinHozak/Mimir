import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Offline synthetic rehearsal only; this is not a live admission or polling driver.
export async function withSyntheticPollingBrowser(work, { preparationMs = 4500000 } = {}) {
  if (!Number.isInteger(preparationMs) || preparationMs <= 0 || preparationMs > 4500000) throw new Error('Invalid preparation lease');
  const child = fork(fileURLToPath(new URL('./polling-refresh-watchdog.mjs', import.meta.url)), [], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'], windowsHide: true, detached: true });
  let browser;
  const acknowledge = (message, expected) => new Promise((resolve, reject) => {
    const finish = (error, value) => {
      clearTimeout(timer);
      child.off('message', onMessage); child.off('exit', onExit); child.off('error', onExit);
      error ? reject(new Error('Polling watchdog unavailable')) : resolve(value);
    };
    const onMessage = value => finish(!value?.[expected], value);
    const onExit = () => finish(true);
    const timer = setTimeout(() => finish(true), Math.min(preparationMs, 30000));
    child.once('message', onMessage); child.once('exit', onExit); child.once('error', onExit);
    child.send(message, error => { if (error) finish(true); });
  });
  try {
    const ready = await acknowledge({ kind: 'launch-browser', preparationMs }, 'ready');
    browser = await chromium.connect(ready.endpoint);
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
    if (child.connected) child.disconnect();
  }
}
