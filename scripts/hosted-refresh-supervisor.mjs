import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

/** Explicit invocation only. All observers live in this new task-owned browser. */
export async function withRefreshBrowser(work, { preparationMs = 4500000 } = {}) {
  if (!Number.isInteger(preparationMs) || preparationMs <= 0 || preparationMs > 4500000) throw new Error("Invalid preparation lease");
  const server = await chromium.launchServer({ headless: true });
  const child = fork(fileURLToPath(new URL("./hosted-refresh-watchdog.mjs", import.meta.url)), [], { stdio: ["ignore", "ignore", "ignore", "ipc"], windowsHide: true });
  let browser;
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Watchdog unavailable")), 5000);
      child.once("error", () => { clearTimeout(timer); reject(new Error("Watchdog unavailable")); });
      child.once("exit", () => { clearTimeout(timer); reject(new Error("Watchdog unavailable")); });
      child.once("message", message => { clearTimeout(timer); message?.ready ? resolve() : reject(new Error("Watchdog unavailable")); });
      child.send({ kind: "owned-browser", pid: server.process().pid, preparationMs });
    });
    browser = await chromium.connect(server.wsEndpoint());
    const context = await browser.newContext();
    let armed = false;
    return await work({ context, async armObserverWindow(ms = 120000) {
      if (armed || !Number.isInteger(ms) || ms <= 0 || ms > 120000) throw new Error("Invalid or repeated observer window");
      armed = true;
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Observer watchdog unavailable")), 3000);
        child.once("message", message => { clearTimeout(timer); message?.observerArmed ? resolve() : reject(new Error("Observer watchdog unavailable")); });
        child.send({ kind: "observer-window", ms });
      });
    } });
  } finally {
    await browser?.close().catch(() => {}); await server.close().catch(() => {});
    // Disarm only once the owned browser's actual process has exited.
    if (server.process().exitCode !== null || server.process().signalCode !== null) child.send?.({ kind: "target-exited" }, () => {});
    if (child.connected) child.disconnect();
  }
}
