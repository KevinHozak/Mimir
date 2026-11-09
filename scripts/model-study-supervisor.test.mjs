import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { superviseStudyWorker } from "./model-study-supervisor.mjs";

test("independent deadline terminates a worker with a blocked event loop", async () => {
  mkdirSync(resolve(".tmp/model-study-tests"), { recursive: true });
  const directory = mkdtempSync(resolve(".tmp/model-study-tests/worker-"));
  const worker = join(directory, "hung.cjs");
  writeFileSync(worker, "while (true) {}\n");
  const control = superviseStudyWorker(worker, { deadlineMs: 100 });
  const receipt = await control.exited;
  assert.equal(receipt.reason, "deadline");
  assert.notEqual(receipt.code, 0);
});

test("operator stop terminates only the owned worker", async () => {
  mkdirSync(resolve(".tmp/model-study-tests"), { recursive: true });
  const directory = mkdtempSync(resolve(".tmp/model-study-tests/worker-"));
  const worker = join(directory, "waiting.cjs");
  writeFileSync(worker, "process.send('ready'); setInterval(() => {}, 1000);\n");
  const control = superviseStudyWorker(worker);
  await new Promise(resolve => control.child.once("message", resolve));
  control.stop();
  assert.equal((await control.exited).reason, "operator-stop");
});
