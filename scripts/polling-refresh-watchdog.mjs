// Synthetic rehearsal only. The watchdog owns a separate browser launcher tree.
import { execFileSync, fork, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

let target, launcher, timer, deadline, armed = false, initialized = false, stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  clearTimeout(timer);
  if (launcher?.pid) {
    if (process.platform === 'win32') {
      // Restrict taskkill to the launcher created by this watchdog and its descendants.
      spawnSync('taskkill', ['/PID', String(launcher.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true, timeout: 5000 });
    } else {
      // Playwright can place Chromium in its own process group. Freeze the
      // launcher before collecting descendants so they cannot create new ones.
      try {
        process.kill(launcher.pid, 'SIGSTOP');
        const rows = execFileSync('ps', ['-A', '-o', 'pid=,ppid='], { encoding: 'utf8', timeout: 5000 });
        const pending = [launcher.pid], descendants = [];
        const pairs = rows.trim().split(/\r?\n/).map(row => row.trim().split(/\s+/).map(Number));
        while (pending.length) {
          const parent = pending.pop();
          for (const [pid, ppid] of pairs) if (ppid === parent && pid > 1) {
            try { process.kill(pid, 'SIGSTOP'); } catch { continue; }
            descendants.push(pid); pending.push(pid);
          }
        }
        for (const pid of descendants.reverse()) { try { process.kill(pid, 'SIGKILL'); } catch {} }
      } catch { /* group termination below is the fallback */ }
      try { process.kill(-launcher.pid, 'SIGKILL'); } catch { /* already exited */ }
    }
  } else if (target) { try { process.kill(target); } catch { /* already exited */ } }
  process.exit(0);
}
process.on('disconnect', stop);
process.on('message', message => {
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
      launcher = fork(fileURLToPath(new URL('./polling-browser-launcher.mjs', import.meta.url)), [], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'], windowsHide: true, detached: process.platform !== 'win32' });
      launcher.once('error', stop);
      launcher.once('exit', () => { launcher = undefined; if (!stopping) stop(); });
      launcher.once('message', value => {
        if (process.env.MIMIR_TEST_STALLED_POLLING_LAUNCH === '1' && Number.isInteger(value?.testChild)) {
          process.send?.({ testChild: value.testChild });
          return;
        }
        if (!stopping && process.connected && typeof value?.endpoint === 'string') process.send?.({ ready: true, endpoint: value.endpoint });
        else stop();
      });
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
