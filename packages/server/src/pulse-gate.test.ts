import assert from "node:assert/strict";
import { PulseGate, PulseInFlightError } from "./pulse-gate.js";

const gate = new PulseGate();
let release!: () => void;
const blocked = new Promise<void>(resolve => { release = resolve; });
let entered = false;

const first = gate.run(async () => {
  entered = true;
  await blocked;
  return "first";
});
while (!entered) await new Promise(resolve => setImmediate(resolve));

assert.equal(gate.busy, true);
await assert.rejects(gate.run(async () => "overlap"), PulseInFlightError);
release();
assert.equal(await first, "first");
assert.equal(gate.busy, false);

await assert.rejects(gate.run(async () => { throw new Error("pulse failed"); }), /pulse failed/);
assert.equal(gate.busy, false);
assert.equal(await gate.run(async () => "recovered"), "recovered");

const order: string[] = [];
let releaseExclusive!: () => void;
const exclusive = gate.runExclusive(async () => {
  order.push("first");
  await new Promise<void>((resolve) => { releaseExclusive = resolve; });
  order.push("first-done");
});
const queued = gate.runExclusive(async () => { order.push("second"); });
await new Promise(resolve => setImmediate(resolve));
assert.deepEqual(order, ["first"]);
releaseExclusive();
await Promise.all([exclusive, queued]);
assert.deepEqual(order, ["first", "first-done", "second"]);
console.log("Pulse gate overlap and rejection recovery passed");
