// Test-only driver: the test owns the target and terminates this process after readiness.
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const guard = fork(fileURLToPath(new URL('../polling-refresh-watchdog.mjs', import.meta.url)), [], {
  stdio: ['ignore', 'ignore', 'ignore', 'ipc'], windowsHide: true, detached: true
});
guard.once('message', message => {
  if (message?.ready) process.send?.({ ready: true });
  else process.exit(1);
});
guard.send({ kind: 'owned-browser', pid: Number(process.argv[2]), preparationMs: 10000 });
