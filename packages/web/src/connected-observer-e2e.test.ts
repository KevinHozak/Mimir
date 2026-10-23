import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { chromium } from "playwright";
import { testPort, stopTestProcesses } from "../../../scripts/test-runtime.mjs";

const root = join(process.cwd(), "..", "..");
const apiPort = await testPort(), webPort = await testPort();
const api = `http://127.0.0.1:${apiPort}`, web = `http://127.0.0.1:${webPort}`;
const temp = join(root, ".tmp", "browser-tests", `connected-${Date.now()}`);
mkdirSync(temp, { recursive: true });
const database = join(temp, "observer.db"), children: ChildProcess[] = [];
const token = "connected-offline-test";
const hash = "sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e";
async function request(path: string, body?: unknown) {
  const response = await fetch(api + path, body === undefined ? {} : { method: "POST", headers: { "content-type": "application/json", "x-owner-token": token }, body: JSON.stringify(body) });
  assert.ok(response.ok, `${path}: ${response.status} ${response.ok ? "" : await response.text()}`);
  return response.json();
}
async function waitFor(url: string) {
  for (let attempt = 0; attempt < 100; attempt++) { try { if ((await fetch(url)).ok) return; } catch { /* starting */ } await new Promise(resolve => setTimeout(resolve, 100)); }
  throw new Error(`Service did not start: ${url}`);
}
function simulationHash() {
  const db = new DatabaseSync(database, { readOnly: true });
  try {
    const tables = ["timeline_checkpoints", "timeline_events", "timeline_interpretations", "runtime_metadata"];
    return createHash("sha256").update(JSON.stringify(tables.map(table => db.prepare(`SELECT * FROM ${table} ORDER BY 1, 2`).all()))).digest("hex");
  } finally { db.close(); }
}
try {
  const env = { ...process.env, HOST: "127.0.0.1", PORT: String(apiPort), AUTO_PULSE: "false", AI_ENABLED: "false", PUBLIC_OBSERVER_AUTH_REQUIRED: "false", DATABASE_PATH: database, OWNER_TOKEN: token, OBSERVER_ORIGIN: web, WORLD_BUNDLE_ROOT: join(root, "assets", "world", "generated") };
  children.push(spawn(process.execPath, [join(root, "packages/server/dist/index.js")], { cwd: root, env, stdio: "ignore" }));
  children.push(spawn(process.execPath, [join(root, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"], { cwd: join(root, "packages/web"), env: { ...env, VITE_API_URL: api }, stdio: "ignore" }));
  await Promise.all([waitFor(`${api}/health`), waitFor(web)]);
  const runs: Array<{ seed: number; timelineId: string }> = [];
  for (const seed of [4, 8, 2]) {
    console.log(`Running offline cohort seed ${seed}`);
    const reset = await request("/api/owner/reset-v3", { bundleHash: hash, seed, sparkCount: 6 });
    for (let pulse = 1; pulse <= 80; pulse++) await request("/api/pulse", {});
    runs.push({ seed, timelineId: reset.timeline.id });
    const history = await request(`/api/history?timelineId=${reset.timeline.id}&pulse=80`);
    assert.ok(history.events.every((event: { actorId?: string }) => event.actorId));
    for (const pulse of [0, 16, 40, 80]) {
      const chapter = (await request(`/api/chronicle?timelineId=${reset.timeline.id}&pulse=${pulse}&sparkId=spark-6`)).edition.chapters[1];
      assert.deepEqual(chapter.selectedSparkIds, ["spark-6"]);
      assert.equal(chapter.evidence.length > 0, pulse > 0);
      assert.ok(chapter.evidence.every((ref: { pulse: number }) => ref.pulse <= pulse));
    }
  }
  const before = simulationHash();
  console.log("Checking desktop/mobile evidence round trip");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const pageErrors: string[] = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.goto(web);
    await page.getByLabel("Selected entity", { exact: true }).selectOption("spark:spark-6");
    await page.getByRole("button", { name: "Follow Spark 6", exact: true }).click();
    await page.getByRole("button", { name: "Immersive", exact: true }).click();
    await page.getByRole("link", { name: "Chronicle & history", exact: true }).click();
    await page.getByTestId("chronicle-personal").waitFor();
    assert.match(await page.getByTestId("chronicle-personal").innerText(), /Spark 6's trace/);
    assert.doesNotMatch(await page.getByTestId("chronicle-personal").innerText(), /No personal history/);
    assert.equal(await page.getByTestId("historical-scene").getAttribute("data-timeline-id"), runs[2].timelineId);

    // Exercise exact earlier evidence on two archived timelines, with reload and mobile coverage.
    for (const run of runs.slice(0, 2)) {
      await page.getByLabel("Recorded timeline", { exact: true }).selectOption(run.timelineId);
      await page.locator(`[data-testid="historical-scene"][data-timeline-id="${run.timelineId}"]`).waitFor();
      const momentLink = page.getByTestId("chronicle-moment").locator("a").first();
      const href = await momentLink.getAttribute("href"); assert.ok(href);
      const destination = new URL(href, web);
      const expectedPulse = destination.searchParams.get("pulse")!;
      assert.ok(Number(expectedPulse) < 80);
      await momentLink.click();
      await page.locator(`[data-testid="historical-scene"][data-timeline-id="${run.timelineId}"][data-pulse="${expectedPulse}"]`).waitFor();
      assert.equal(await page.getByLabel("Checkpoint", { exact: true }).inputValue(), expectedPulse);
      const evidenceId = decodeURIComponent(destination.hash.slice(1));
      assert.ok(await page.locator(`[id="${evidenceId}"]`).isVisible());
      await page.locator("#village-canvas canvas").waitFor();
      await page.reload();
      await page.getByTestId("chronicle-personal").waitFor();
      assert.equal(await page.getByLabel("Recorded timeline", { exact: true }).inputValue(), run.timelineId);
      assert.equal(await page.getByLabel("Checkpoint", { exact: true }).inputValue(), expectedPulse);
      await page.getByLabel("Checkpoint", { exact: true }).selectOption("0");
      await page.locator('[data-testid="historical-scene"][data-pulse="0"]').waitFor();
      assert.match(await page.getByTestId("chronicle-personal").innerText(), /No personal history/);
      await page.getByLabel("Checkpoint", { exact: true }).selectOption("40");
      await page.locator('[data-testid="historical-scene"][data-pulse="40"]').waitFor();
      await page.getByTestId("chronicle-personal").getByRole("link", { name: "open recorded scene", exact: true }).click();
      await page.getByTestId("chronicle-personal").waitFor();
      assert.equal(await page.getByLabel("Recorded timeline", { exact: true }).inputValue(), run.timelineId);
      await page.setViewportSize({ width: 390, height: 844 });
      assert.ok(await page.getByTestId("historical-scene").isVisible());
      assert.equal(await page.getByLabel("Selected entity", { exact: true }).inputValue(), "spark:spark-6");
      // Changing the historical selection must not replace the original live return target.
      await page.getByLabel("Selected entity", { exact: true }).selectOption("spark:spark-2");
      await page.getByTestId("chronicle-personal").getByRole("heading", { name: "Spark 2's trace" }).waitFor();
      await page.getByRole("link", { name: "Return to live observer", exact: true }).click();
      await page.getByTestId("follow-controls").waitFor();
      assert.equal(await page.getByLabel("Selected entity", { exact: true }).inputValue(), "spark:spark-6");
      assert.equal(await page.locator("main").getAttribute("data-follow-view"), "follow");
      assert.equal(await page.locator("main").getAttribute("data-follow-presentation"), "immersive");
      await page.getByRole("link", { name: "Chronicle & history", exact: true }).click();
      await page.getByTestId("chronicle-personal").waitFor();
    }
    // Missing checkpoint/Spark stays explicit, without replacing it with the latest/first.
    await page.goto(`${web}/?view=history&timelineId=${runs[0].timelineId}&pulse=999&sparkId=spark-6`);
    await page.getByRole("alert").waitFor();
    assert.equal(await page.getByTestId("historical-scene").count(), 0);
    await page.goto(`${web}/?view=history&timelineId=${runs[0].timelineId}&pulse=16&sparkId=absent`);
    await page.getByText("This Spark is not present in this checkpoint.", { exact: true }).waitFor();
    assert.equal(await page.getByTestId("chronicle-personal").count(), 0);
    assert.equal(pageErrors.length, 0, pageErrors.join("\n"));
  } finally { await browser.close(); }
  assert.equal(simulationHash(), before, "viewing must not mutate saved simulation history");
  const reflection = await request("/api/reflection");
  assert.equal(reflection.runtime.calls, 0);
  console.log("Connected observer passed: seeds 4/8/2, 240 pulses, archived evidence, quiet cutoff, mobile, live Spark return, immutable history, zero provider calls");
} finally {
  await stopTestProcesses(children);
  rmSync(temp, { recursive: true, force: true });
}
