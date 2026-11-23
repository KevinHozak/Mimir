// Synthetic rehearsal only. The private IPC channel carries a task-owned PID and durations.
let target, timer, deadline, armed = false;
function stop() {
  clearTimeout(timer);
  if (target) { try { process.kill(target); } catch { /* already exited */ } }
  process.exit(0);
}
process.on('disconnect', stop);
process.on('message', message => {
  if (!target) {
    if (message?.kind !== 'owned-browser' || !Number.isInteger(message.pid) || message.pid <= 0 || message.pid === process.pid ||
        !Number.isInteger(message.preparationMs) || message.preparationMs <= 0 || message.preparationMs > 4500000) return stop();
    target = message.pid;
    deadline = performance.now() + message.preparationMs;
    timer = setTimeout(stop, message.preparationMs);
    process.send?.({ ready: true });
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
setTimeout(() => { if (!target) stop(); }, 5000).unref();
