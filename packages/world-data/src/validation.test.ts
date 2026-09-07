import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { bundleHash } from "./canonical.js";
import { validateRuntimeState, validateWorldBundle } from "./validation.js";
import { decodeWorldBundle } from "./validation.js";

const fixture = decodeWorldBundle(JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/fixtures/first-glow-schema-3.json", import.meta.url)), "utf8")));
test("First Glow spatial validation rejects duplicate IDs and fractional coordinates", () => {
  validateWorldBundle(fixture);
  const duplicate = structuredClone(fixture); duplicate.objects.push({ ...duplicate.objects[0] }); duplicate.bundle.contentHash = bundleHash(duplicate); assert.throws(() => validateWorldBundle(duplicate), /duplicate/);
  const fractional = structuredClone(fixture); fractional.objects[0].origin = { x: 1.5, y: 0 }; fractional.bundle.contentHash = bundleHash(fractional); assert.throws(() => validateWorldBundle(fractional), /integer/);
});
test("First Glow runtime reservations reject unknown and duplicate object state", () => {
  assert.throws(() => validateRuntimeState(fixture, { navigationRevision: 0, objects: [{ objectId: "missing", blocked: true }], reservations: [] }), /unknown object/);
  assert.throws(() => validateRuntimeState(fixture, { navigationRevision: 0, objects: [{ objectId: fixture.objects[0].id, blocked: true }, { objectId: fixture.objects[0].id, blocked: false }], reservations: [] }), /duplicate runtime object/);
});
