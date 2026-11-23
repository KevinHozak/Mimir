// The watchdog owns this entire process tree, including a browser still launching.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

if (process.env.MIMIR_TEST_STALLED_POLLING_LAUNCH === '1') {
  const child = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore', windowsHide: true });
  process.send?.({ testChild: child.pid });
  await new Promise(() => {});
}

try {
  const server = await chromium.launchServer({ headless: true });
  server.process().once('exit', () => process.exit(0));
  process.send?.({ endpoint: server.wsEndpoint() });
} catch {
  process.exit(1);
}
