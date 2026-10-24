// Task-owned process only: target arrives on the private fork IPC channel.
// No credential material, browser endpoint, URL or arbitrary messages are logged.
let timer, target, armed = false, observerArmed = false, deadline;
const stop = () => {
  clearTimeout(timer);
  if (target) { try { process.kill(target); } catch { /* process already exited */ } }
  process.exit(0);
};
process.on("disconnect", stop);
process.on("message", message => {
  if (!armed) {
    if (message?.kind !== "owned-browser" || !Number.isInteger(message.pid) || message.pid <= 0 || message.pid === process.pid ||
        !Number.isInteger(message.preparationMs) || message.preparationMs <= 0 || message.preparationMs > 4500000) return stop();
    target = message.pid; armed = true; deadline = performance.now() + message.preparationMs; timer = setTimeout(stop, message.preparationMs); process.send?.({ ready: true }); return;
  }
  if (message?.kind === "observer-window") {
    if (observerArmed || !Number.isInteger(message.ms) || message.ms <= 0 || message.ms > 120000) return stop();
    observerArmed = true;
    // Shorten only; a caller cannot extend the preparation or observer lease.
    const requested = performance.now() + message.ms;
    deadline = Math.min(deadline, requested); clearTimeout(timer); timer = setTimeout(stop, Math.max(0, deadline - performance.now()));
    process.send?.({ observerArmed: true });
  } else if (message?.kind === "target-exited") { target = undefined; stop(); }
});
setTimeout(() => { if (!armed) stop(); }, 5000).unref();
