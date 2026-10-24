import assert from "node:assert/strict";
import { test } from "node:test";
import { fork, spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { withRefreshBrowser } from "./hosted-refresh-supervisor.mjs";

test("independent supervisor closes task-owned browser across navigation and a stalled driver", async () => {
  await withRefreshBrowser(async ({ context, armObserverWindow }) => {
    const page = await context.newPage(); await page.goto("about:blank");
    const closed = page.waitForEvent("close"); await armObserverWindow(300);
    await assert.rejects(armObserverWindow(120000));
    await page.goto("data:text/html,<title>Owned local fixture</title>"); await closed;
    assert.equal(page.isClosed(), true);
  }, { preparationMs: 10000 });
});
test("watchdog kills only the owned target on parent IPC loss, and cannot extend a lease", async () => {
  for (const mode of ["disconnect", "rearm"]) {
    const target = spawn(process.execPath, ["-e", "setTimeout(()=>{},10000)"], { stdio: "ignore", windowsHide: true });
    const exited = once(target, "exit");
    const guard = fork(fileURLToPath(new URL("./hosted-refresh-watchdog.mjs", import.meta.url)), [], { stdio: ["ignore", "ignore", "ignore", "ipc"], windowsHide: true });
    const ready = once(guard, "message"); guard.send({ kind: "owned-browser", pid: target.pid, preparationMs: 1000 }); await ready;
    if (mode === "disconnect") guard.disconnect();
    else {
      const armed = once(guard, "message"); guard.send({ kind: "observer-window", ms: 500 }); await armed;
      guard.send({ kind: "observer-window", ms: 120000 });
    }
    await exited; assert.ok(target.exitCode !== null || target.signalCode !== null);
    if (guard.connected) guard.disconnect();
  }
});
