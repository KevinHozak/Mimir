import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createWorldFromBundle, advanceWorld } from "@mimir/engine";
import { createStudyWorld } from "./model-study-world.mjs";
import { canonicalize, decodeWorldBundle, bundleHash } from "@mimir/world-data";

const root = fileURLToPath(new URL("../", import.meta.url));
const hash = value => createHash("sha256").update(value).digest("hex");
const manifestPath = resolve(root, "docs/model-study-protocol.json");
const bundleId = "sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e";
const bundle = decodeWorldBundle(JSON.parse(readFileSync(resolve(root, `assets/world/generated/${bundleId}/world.json`))));
assert.equal(bundleHash(bundle), bundleId);
const files = [
  "scripts/model-study-protocol.mjs", "scripts/model-study-guard.mjs", "scripts/model-study-guard.test.mjs",
  "scripts/model-study-supervisor.mjs", "scripts/model-study-supervisor.test.mjs",
  "scripts/model-study-v4.mjs", "scripts/model-study-v4.test.mjs", "scripts/model-study-repeat.mjs", "docs/model-study-s004-protocol-v4.json", "docs/model-study-s004-protocol-v4.md",
  "scripts/model-study-runner.mjs", "scripts/model-study-runner.test.mjs", "scripts/model-study-execute.mjs", "scripts/model-study-world.mjs", "scripts/model-study-observer.test.mjs",
  "scripts/model-study-transport.mjs", "scripts/model-study-transport-worker.mjs", "scripts/model-study-watchdog.mjs",
  "scripts/model-study-eligibility.mjs", "scripts/model-study-eligibility.test.mjs",
  "docs/model-study-controls.md", "docs/model-study-protocol.md",
  "package-lock.json", "package.json", "scripts/verify-local.mjs"
];
for (const pkg of ["world-data", "engine", "server", "web"]) {
  const directory = `packages/${pkg}/src`;
  for (const name of readdirSync(resolve(root, directory), { recursive: true })) {
    if (/\.(ts|tsx|css)$/.test(name)) files.push(`${directory}/${name.replaceAll("\\", "/")}`);
  }
  files.push(`packages/${pkg}/package.json`, `packages/${pkg}/tsconfig.json`);
  if (pkg !== "web") {
    const output = `packages/${pkg}/dist`;
    for (const name of readdirSync(resolve(root, output), { recursive: true })) {
      if (/\.js$/.test(name)) files.push(`${output}/${name.replaceAll("\\", "/")}`);
    }
  }
}
files.sort();
const snapshots = seed => {
  let state = createStudyWorld(bundle, seed);
  const checkpoints = [];
  for (let pulse = 0; pulse <= 80; pulse++) {
    if ([0, 16, 40, 80].includes(pulse)) checkpoints.push({ pulse, hash: hash(JSON.stringify(canonicalize(state))) });
    if (pulse < 80) state = advanceWorld(state, { eventAdmissionPolicy: "event-rc-v1" }).state;
  }
  return checkpoints;
};
export function currentProtocol() {
  return {
    schemaVersion: 1, protocolRevision: 4, admissionPolicy: "event-rc-v1", reviewCheckpoint: 80, status: "offline-preregistration-only", liveApproved: false, model: "gemini-3.5-flash-lite", location: "us",
    budgetPolicy: { overheadReserveMicrousd: 100000, minimumSeeds: [2, 4, 8], tokenBoundsVerified: false, feeBoundsVerified: false, effectiveAdmittedLiveAttempts: 0 },
    bundleId, simulationVersion: "mimir-sim-v3-first-glow", spatialModel: "structured-v2",
    sourceFiles: Object.fromEntries(files.map(name => [name, hash(readFileSync(resolve(root, name)))])),
    seeds: [2, 4, 8].map(seed => ({ seed, population: 6, focalSpark: "spark-6", checkpoints: snapshots(seed) })),
    order: [{ seed: 2, first: "rules" }, { seed: 4, first: "model" }, { seed: 8, first: "rules" }],
    limits: { attempts: 24, attemptsPerSeed: 8, concurrency: 1, maxInputBytes: 16384, maxOutputTokens: 128, budgetMicrousd: 1000000, timeoutMs: 10000, windowMs: 1800000 },
    humanReview: "unmeasured", providerBenefit: "unmeasured"
  };
}

if (process.argv.includes("--freeze")) {
  // Explicit freeze is for this preregistration only, never an acceptance-update shortcut.
  writeFileSync(manifestPath, JSON.stringify(currentProtocol(), null, 2) + "\n");
  console.log("Offline protocol frozen; no model arm executed.");
} else {
  const expected = JSON.parse(readFileSync(manifestPath));
  if (process.argv.includes("--fixtures-only")) {
    // General regression verification checks fixtures without approving a stale
    // research source freeze. Execution retains the default strict source gate.
    const archived = JSON.parse(readFileSync(resolve(root, "docs/evidence/model-study-protocol-v4-2026-11-08.json")));
    assert.deepEqual(expected, archived, "historical v4 manifest changed");
    const { sourceFiles: historicalSources, ...historicalProtocol } = expected;
    const { sourceFiles: currentSources, ...fixtureProtocol } = currentProtocol();
    assert.deepEqual(fixtureProtocol, historicalProtocol, "protocol/fixture drift");
    console.log("Historical v4 fixtures only; source freeze not approved for execution.");
  } else {
    assert.deepEqual(currentProtocol(), expected, "protocol/source/fixture drift: review and version the protocol before execution");
  }
  for (const { seed, checkpoints } of expected.seeds) assert.deepEqual(snapshots(seed), checkpoints);
  console.log(`Protocol ${hash(readFileSync(manifestPath))}: matched initial states and 12 repeatable rules-only checkpoints verified; live benefit unmeasured.`);
}
