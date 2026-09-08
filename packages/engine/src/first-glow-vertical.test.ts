import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { bundleHash, decodeWorldBundle, queryCell, validateWorldBundle } from "@mimir/world-data";
import { advanceFirstGlowState, createFirstGlowState } from "./structured.js";
import { advanceFirstGlow as advanceWithActions } from "./first-glow-actions.js";

const hash = "sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601";
const bundle = decodeWorldBundle(JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/generated/sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601/world.json", import.meta.url)), "utf8")));
if (bundle.schemaVersion !== 3) throw new Error("vertical slice requires a First Glow bundle");

test("First Glow vertical slice preserves relay, shelter, and authored signal changes", () => {
  const runtime = { navigationRevision: 0, objects: [], reservations: [] };
  assert.equal(queryCell(bundle, runtime, { x: 16, y: 12 }).walkable, true);
  const closed = structuredClone(bundle);
  closed.surfaces.find(surface => surface.id === "tiled-103-surface")!.enabled = false;
  closed.bundle.contentHash = bundleHash(closed);
  validateWorldBundle(closed);
  assert.equal(queryCell(closed, runtime, { x: 16, y: 12 }).walkable, false);
  closed.surfaces.find(surface => surface.id === "tiled-103-surface")!.enabled = true;
  closed.bundle.contentHash = bundleHash(closed);
  validateWorldBundle(closed);
  assert.equal(queryCell(closed, runtime, { x: 16, y: 12 }).walkable, true);

  const changed = structuredClone(closed);
  changed.objects.find(object => object.id === "tiled-102")!.origin = { x: 12, y: 2 };
  changed.objects.push(
    { id: "tiled-106", definitionId: "light-mark", origin: { x: 6, y: 7 }, orientation: 0 },
    { id: "tiled-107", definitionId: "pattern-shard", origin: { x: 10, y: 7 }, orientation: 0 }
  );
  changed.bundle.contentHash = bundleHash(changed);
  validateWorldBundle(changed);
  assert.notEqual(changed.bundle.contentHash, hash);

  let shelterState = createFirstGlowState(changed);
  shelterState.settlements[0].sparks[0].intendedActivity = "idle";
  let shelterArrived = false;
  for (let tick = 0; tick < 40; tick += 1) { shelterState = advanceWithActions(shelterState); if (shelterState.ledger.some(entry => entry.reason === "arrived-at-shelter-niche")) { shelterArrived = true; break; } }
  assert.equal(shelterArrived, true);

  let signalState = createFirstGlowState(changed, "first-glow-region", "Opening region", 2);
  signalState.settlements[0].sparks[0].intendedActivity = "mark-trace";
  signalState.settlements[0].sparks[1].intendedActivity = "shape-pattern";
  const seen = new Set<string>();
  for (let tick = 0; tick < 50 && seen.size < 2; tick += 1) { signalState = advanceWithActions(signalState); for (const event of signalState.events) if (event.kind === "mark-trace" || event.kind === "shape-pattern") seen.add(event.kind); }
  assert.deepEqual([...seen].sort(), ["mark-trace", "shape-pattern"]);
  assert.equal(signalState.tick > 0, true);
  assert.equal(advanceFirstGlowState(signalState).tick, signalState.tick + 1);
});
