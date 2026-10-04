import { createServer } from "node:net";

const allocated = new Set();
/** Allocate distinct loopback ports instead of sharing fixed test listeners. */
export async function testPort() {
  for (;;) {
    const server = createServer();
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    const port = server.address().port;
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    if (!allocated.has(port)) { allocated.add(port); return port; }
  }
}

/** Observe exit before signalling, including Windows signal-only exits. */
export async function stopTestProcesses(children) {
  await Promise.all(children.filter(Boolean).map(child => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    return new Promise((resolve, reject) => {
      const force = setTimeout(() => child.kill("SIGKILL"), 2000);
      const deadline = setTimeout(() => { cleanup(); reject(new Error(`test process ${child.pid} did not exit`)); }, 10000);
      const cleanup = () => { clearTimeout(force); clearTimeout(deadline); child.off("exit", onExit); };
      const onExit = () => { cleanup(); resolve(); };
      child.once("exit", onExit);
      child.kill();
    });
  }));
}

export async function waitForTestExit(child, timeoutMs = 15000) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.off("exit", onExit); reject(new Error(`test process ${child.pid} did not exit within ${timeoutMs}ms`)); }, timeoutMs);
    const onExit = () => { clearTimeout(timer); resolve(); };
    child.once("exit", onExit);
  });
}
