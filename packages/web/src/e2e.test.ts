import { chromium } from "playwright";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const projectRoot = join(process.cwd(), "..", "..");
const databasePath = join(projectRoot, `phase5-browser-${Date.now()}.db`);
const apiPort = 34130;
const webPort = 5177;
const children: ChildProcess[] = [];
const waitFor = async (url: string) => { for (let attempt = 0; attempt < 50; attempt += 1) { try { if ((await fetch(url)).ok) return; } catch { /* process is still starting */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error(`service did not start: ${url}`); };
try {
  children.push(spawn(process.execPath, [join(projectRoot, "packages", "server", "dist", "index.js")], { cwd: projectRoot, env: { ...process.env, PORT: String(apiPort), AUTO_TICK: "false", TICK_INTERVAL_MS: "0", DATABASE_PATH: databasePath, OWNER_TOKEN: "browser-owner" }, stdio: "ignore" }));
  children.push(spawn(process.execPath, [join(projectRoot, "node_modules", "vite", "bin", "vite.js"), "--host", "127.0.0.1", "--port", String(webPort)], { cwd: join(projectRoot, "packages", "web"), env: { ...process.env, VITE_API_URL: `http://127.0.0.1:${apiPort}` }, stdio: "ignore" }));
  await waitFor(`http://127.0.0.1:${apiPort}/health`);
  await waitFor(`http://127.0.0.1:${webPort}/`);
  const browser = await chromium.launch({ headless: true });
  try {
    const live = await browser.newPage();
    await live.goto(`http://127.0.0.1:${webPort}/`);
    await live.getByRole("textbox", { name: "Owner token" }).fill("browser-owner");
    await live.getByRole("button", { name: "Advance one tick" }).click();
    await live.getByText("Season 1 · Tick 1").waitFor();
    const history = await browser.newPage();
    await history.goto(`http://127.0.0.1:${webPort}/`);
    await history.getByRole("slider", { name: "History" }).press("Home");
    await history.getByText("Season 1 · Tick 0").waitFor();
    await live.getByRole("button", { name: "Advance one tick" }).click();
    await live.getByText("Season 1 · Tick 2").waitFor();
    await history.getByText("Season 1 · Tick 0").waitFor();
    await history.getByText("● HISTORY", { exact: true }).waitFor();
    console.log("browser e2e tests passed");
  } finally { await browser.close(); }
} finally {
  await Promise.all(children.map((child) => new Promise<void>((resolve) => { if (child.exitCode !== null) { resolve(); return; } child.once("exit", () => resolve()); child.kill(); setTimeout(resolve, 3000); })));
  for (let attempt = 0; attempt < 10; attempt += 1) { let locked = false; for (const suffix of ["", "-shm", "-wal"]) { const path = `${databasePath}${suffix}`; if (existsSync(path)) { try { unlinkSync(path); } catch { locked = true; } } } if (!locked) break; await new Promise((resolve) => setTimeout(resolve, 100)); }
}
