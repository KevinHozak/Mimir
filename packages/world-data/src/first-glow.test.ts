import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { bundleHash } from "./canonical.js";
import { decodeWorldBundle, validateRuntimeState } from "./validation.js";
import type { FirstGlowWorldBundle } from "./types.js";

const fixturePath = fileURLToPath(new URL("../../../assets/world/fixtures/first-glow-schema-3.json", import.meta.url));
function fixture(): FirstGlowWorldBundle { return decodeWorldBundle(JSON.parse(readFileSync(fixturePath, "utf8"))) as FirstGlowWorldBundle; }

test("schema-3 First Glow fixture decodes and hashes stably", () => { const bytes = readFileSync(fixturePath); const world = fixture(); assert.equal(world.schemaVersion, 3); assert.equal(world.themeId, "living-circuit"); assert.equal(world.ageId, "first-glow"); assert.equal(bundleHash(world), world.bundle.contentHash); assert.equal(JSON.parse(bytes.toString("utf8")).bundle.contentHash, world.bundle.contentHash); });
test("schema-3 decoder rejects malformed nested data and references", () => { const base = fixture(); const malformed = structuredClone(base) as unknown as Record<string, unknown>; malformed.terrain = "not-a-grid"; assert.throws(() => decodeWorldBundle(malformed), /malformed nested|terrain/); const unknownDefinition = structuredClone(base); unknownDefinition.objects[0].definitionId = "missing"; unknownDefinition.bundle.contentHash = bundleHash(unknownDefinition); assert.throws(() => decodeWorldBundle(unknownDefinition), /unknown object definition/); const badAsset = structuredClone(base) as any; badAsset.assets[0].mediaType = 42; badAsset.bundle.contentHash = bundleHash(badAsset); assert.throws(() => decodeWorldBundle(badAsset), /malformed asset/); });
test("runtime reservations require valid slots and known actors when supplied", () => { const world = fixture(); assert.throws(() => validateRuntimeState(world, { navigationRevision: 0, objects: [], reservations: [{ actorId: "missing-spark", objectId: "pool-a", slotId: "draw" }] }, ["spark-1"]), /unknown actor/); assert.throws(() => validateRuntimeState(world, { navigationRevision: 0, objects: [], reservations: [{ actorId: "spark-1", objectId: "pool-a", slotId: "missing" }] }, ["spark-1"]), /unknown slot/); });
test("wrong theme, age, and simulation combinations are rejected", () => { const world = fixture(); for (const [key, value] of [["themeId", "village"], ["ageId", "hearth-circuit"], ["simulationVersion", "mimir-sim-v2"]] as const) { const wrong = { ...world, [key]: value, bundle: { ...world.bundle, contentHash: "" } }; assert.throws(() => decodeWorldBundle(wrong), /unsupported world bundle version\/theme/); } });
