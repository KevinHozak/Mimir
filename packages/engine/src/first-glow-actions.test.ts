import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { advanceFirstGlowState, createFirstGlowState, type FirstGlowState } from "./structured.js";
import { bundleHash, decodeWorldBundle, validateWorldBundle } from "@mimir/world-data";
import { advanceFirstGlow } from "./first-glow-actions.js";

const bundle = decodeWorldBundle(JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/generated/sha256-92cc5cee6d8859375c046057ef6341fa6844cf6cbe610177d1d81726af0decf3/world.json", import.meta.url)), "utf8")));
if (bundle.schemaVersion !== 3) throw new Error("T3 fixture is not schema 3");

test("draw-charge is deterministic and occurs only on arrival at a charge pool", () => { let state = createFirstGlowState(bundle); const initial = state.settlements[0].sourceCharge; let drew = false; for (let tick = 0; tick < 12; tick += 1) { state = advanceFirstGlowState(state); const spark = state.settlements[0].sparks[0]; const draw = state.ledger.find(entry => entry.kind === "draw"); if (!draw) { assert.equal(spark.carriedCharge, 0); assert.notEqual(spark.status, "choosing"); } else { drew = true; assert.equal(draw.amount, 8); assert.equal(spark.carriedCharge, 8); assert.equal(state.settlements[0].sourceCharge, initial - 8); break; } } assert.equal(drew, true); });
test("First Glow movement and draw replay identically", () => { const run = () => { let state = createFirstGlowState(bundle); const snapshots: unknown[] = []; for (let tick = 0; tick < 8; tick += 1) { state = advanceFirstGlowState(state); snapshots.push({ tick: state.tick, spark: state.settlements[0].sparks[0], ledger: state.ledger }); } return snapshots; }; assert.deepEqual(run(), run()); });
test("idle recovery is arrival-gated and does not draw charge", () => { let state: FirstGlowState = createFirstGlowState(bundle); const spark = state.settlements[0].sparks[0]; spark.intendedActivity = "idle"; spark.readiness = 70; let recovered = false; for (let tick = 0; tick < 12; tick += 1) { state = advanceFirstGlowState(state); const current = state.settlements[0].sparks[0]; if (state.ledger.some(entry => entry.kind === "idle")) { recovered = true; assert.equal(current.readiness, 80); assert.equal(state.ledger.some(entry => entry.kind === "draw"), false); break; } assert.equal(current.readiness, 70); } assert.equal(recovered, true); });
test("empty charge pools record zero draw without awarding charge", () => { let state = createFirstGlowState(bundle); state.settlements[0].sourceCharge = 0; for (let tick = 0; tick < 12; tick += 1) { state = advanceFirstGlowState(state); const draw = state.ledger.find(entry => entry.kind === "draw"); if (draw) { assert.equal(draw.amount, 0); assert.equal(state.settlements[0].sparks[0].carriedCharge, 0); assert.equal(state.settlements[0].sourceCharge, 0); return; } } assert.fail("Spark did not reach the empty charge pool"); });
test("invalid arrival waits without consuming charge or accumulating a deficit", () => { const state = createFirstGlowState(bundle); state.settlements[0].sparks[0].status = "interacting"; const next = advanceFirstGlow(state); const spark = next.settlements[0].sparks[0]; assert.equal(spark.status, "waiting"); assert.equal(next.ledger.length, 0); assert.equal(next.ledger.some(entry => entry.kind === "draw"), false); assert.equal(next.events.some(event => event.kind === "wait"), false); assert.equal(spark.chargeDeficit, 0); assert.equal(spark.waitReason, "invalid-destination"); });
test("mark-trace records an arrival action without creating charge", () => { let state = createFirstGlowState(bundle); state.settlements[0].sparks[0].intendedActivity = "mark-trace"; for (let tick = 0; tick < 30; tick += 1) { state = advanceFirstGlow(state); const event = state.events.find(candidate => candidate.kind === "mark-trace"); if (event) { assert.equal(state.ledger.some(entry => entry.reason === "mark-trace-arrived" && entry.amount === 0), true); assert.equal(state.settlements[0].sparks[0].carriedCharge, 0); return; } } assert.fail("Spark did not reach the light-mark site"); });

test("new Sparks autonomously complete a deterministic First Glow activity loop", () => {
  const multiSparkBundle = structuredClone(bundle);
  multiSparkBundle.objects.push(
    { id: "tiled-201", definitionId: "charge-pool", origin: { x: 4, y: 2 }, orientation: 0 },
    { id: "tiled-202", definitionId: "shelter-niche", origin: { x: 11, y: 2 }, orientation: 0 },
    { id: "tiled-203", definitionId: "pattern-shard", origin: { x: 9, y: 7 }, orientation: 0 },
    { id: "tiled-204", definitionId: "light-mark", origin: { x: 7, y: 7 }, orientation: 0 }
  );
  multiSparkBundle.bundle.contentHash = bundleHash(multiSparkBundle);
  validateWorldBundle(multiSparkBundle);
  const run = () => {
    let state = createFirstGlowState(multiSparkBundle, "first-glow-region", "Opening region", 2);
    const kinds = new Set<string>();
    const actorKinds = new Map<string, Set<string>>();
    for (let tick = 0; tick < 360; tick += 1) {
      state = advanceFirstGlow(state);
      for (const event of state.events) { kinds.add(event.kind); if (!actorKinds.has(event.actorId)) actorKinds.set(event.actorId, new Set()); actorKinds.get(event.actorId)!.add(event.kind); }
    }
    return { state, kinds: [...kinds].sort(), actorKinds: [...actorKinds.entries()].map(([id, values]) => [id, [...values].sort()]) };
  };
  const first = run();
  const second = run();
  assert.deepEqual(first, second);
  assert.ok(first.kinds.includes("draw"));
  assert.ok(first.kinds.includes("explore"));
  assert.ok(first.kinds.includes("mark-trace"));
  assert.ok(first.kinds.includes("shape-pattern"));
  assert.ok(first.kinds.includes("idle"));
  for (const [id, kinds] of first.actorKinds) { assert.equal(first.state.settlements[0].sparks.some((spark) => spark.id === id), true); for (const kind of ["draw", "explore", "mark-trace", "shape-pattern", "idle"]) assert.ok(kinds.includes(kind), `${id} did not autonomously complete ${kind}`); }
});

test("autonomous decisions choose charge sharing for a co-present Spark in need", () => {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", 2);
  state.tick = 1;
  const [giver, recipient] = state.settlements[0].sparks;
  recipient.position = { ...giver.position };
  giver.carriedCharge = 2;
  const next = advanceFirstGlow(state);
  assert.equal(next.ledger.find((entry) => entry.kind === "share")?.amount, 1);
  assert.equal(next.events.some((event) => event.kind === "share"), true);
});
