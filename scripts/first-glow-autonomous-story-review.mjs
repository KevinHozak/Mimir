import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { advanceFirstGlow, createWorldV3 } from "../packages/engine/dist/index.js";
import { decodeWorldBundle } from "../packages/world-data/dist/index.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const bundleHash = "sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601";
const bundle = decodeWorldBundle(JSON.parse(readFileSync(join(root, "assets/world/generated", bundleHash, "world.json"), "utf8")));
const ticksPerSeason = 24;
const seasons = 4;
const totalTicks = ticksPerSeason * seasons;
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const range = values => ({ min: Math.min(...values), max: Math.max(...values) });
export const AUTONOMOUS_STORY_SCENARIOS = [
  { id: "abundance-baseline", title: "Abundance baseline", seeds: [1101, 1102, 1103], sourceIntakeEveryFour: 24, lossByTick: {} },
  { id: "supply-scarcity", title: "Supply scarcity", seeds: [1201, 1202, 1203], sourceIntakeEveryFour: 0, lossByTick: { 8: 4, 16: 4, 24: 4 } },
  { id: "information-gap", title: "Information gap", seeds: [1301, 1302, 1303], sourceIntakeEveryFour: 8, lossByTick: {} },
  { id: "promise-breach", title: "Promise breach and repair", seeds: [1401, 1402, 1403], sourceIntakeEveryFour: 16, lossByTick: {} }
];

export function runAutonomousStory(scenario, seed, ticks = totalTicks) {
  let world = createWorldV3(bundle, seed, `autonomous-${scenario.id}-${seed}`, 6);
  const history = [];
  const ledger = [];
  const checkpoints = [];
  for (let step = 0; step < ticks; step += 1) {
    const nextTick = world.tick + 1;
    const seasonTick = ((nextTick - 1) % ticksPerSeason) + 1;
    const firstGlowState = advanceFirstGlow(world.firstGlowState, { sourceCharge: seasonTick % 4 === 0 ? scenario.sourceIntakeEveryFour : 0, loss: scenario.lossByTick[seasonTick] ?? 0, deterministicSeed: seed, validate: step === 0 });
    world = { ...world, tick: firstGlowState.tick, firstGlowState };
    history.push(...firstGlowState.events.map(event => ({ ...event, tick: firstGlowState.tick })));
    ledger.push(...firstGlowState.ledger.map(entry => ({ ...entry, tick: firstGlowState.tick })));
    if (seasonTick === ticksPerSeason) checkpoints.push({ season: Math.floor((nextTick - 1) / ticksPerSeason) + 1, tick: firstGlowState.tick, commitmentCount: firstGlowState.social.commitments.length, trust: firstGlowState.social.trust.filter(item => item.value !== 0).length, witnessedFacts: firstGlowState.social.knowledge.reduce((sum, item) => sum + item.witnessedFacts.length, 0) });
  }
  const sparks = world.firstGlowState.settlements[0].sparks.slice().sort((a, b) => compare(a.id, b.id));
  const commitments = world.firstGlowState.social.commitments;
  return {
    scenarioId: scenario.id, title: scenario.title, seed, ticks, history, ledger, checkpoints,
    social: world.firstGlowState.social,
    explanations: world.firstGlowState.explanations,
    metrics: {
      eventCount: history.length,
      totalDrawn: ledger.filter(item => item.kind === "draw").reduce((sum, item) => sum + item.amount, 0),
      totalLoss: ledger.filter(item => item.kind === "loss").reduce((sum, item) => sum + item.amount, 0),
      finalSourceCharge: world.firstGlowState.settlements[0].sourceCharge,
      finalChargeDeficit: sparks.reduce((sum, spark) => sum + spark.chargeDeficit, 0),
      fulfilledCommitments: commitments.filter(item => item.status === "fulfilled").length,
      brokenCommitments: commitments.filter(item => item.status === "broken").length,
      alternativeCounts: Object.fromEntries([...new Set(commitments.map(item => item.alternativeId))].sort(compare).map(id => [id, commitments.filter(item => item.alternativeId === id).length])),
      beneficiaryCount: new Set(commitments.map(item => item.beneficiarySparkId)).size,
      explanationCount: world.firstGlowState.explanations.length,
      communicatedClaims: world.firstGlowState.social.knowledge.reduce((sum, item) => sum + item.communicatedClaims.length, 0),
      uncertainInferences: world.firstGlowState.social.knowledge.reduce((sum, item) => sum + item.uncertainInferences.length, 0)
    }
  };
}

export function buildAutonomousStoryReport() {
  const reviews = AUTONOMOUS_STORY_SCENARIOS.map(scenario => {
    const runs = scenario.seeds.map(seed => runAutonomousStory(scenario, seed));
    const representative = runs[1];
    const replay = runAutonomousStory(scenario, representative.seed);
    const summaries = run => ({ metrics: run.metrics, social: run.social, explanations: run.explanations, checkpoints: run.checkpoints, history: run.history, ledger: run.ledger });
    const materiallyVaried = runs.some(run => JSON.stringify(summaries(run)) !== JSON.stringify(summaries(representative)));
    return { scenario, replayControls: { seeds: scenario.seeds, ticksPerSeason, seasons, totalTicks, sourceIntakeEveryFour: scenario.sourceIntakeEveryFour, lossByTick: scenario.lossByTick, bundleHash, schemaVersion: 3, simulationVersion: "mimir-sim-v3-first-glow", spatialModel: "structured-v2", socialResolution: "autonomous-rules-only" }, sameSeedDeterministic: JSON.stringify(summaries(representative)) === JSON.stringify(summaries(replay)), materiallyVaried, ranges: Object.fromEntries(["eventCount", "totalDrawn", "totalLoss", "finalSourceCharge", "finalChargeDeficit", "fulfilledCommitments", "brokenCommitments", "beneficiaryCount", "explanationCount", "communicatedClaims", "uncertainInferences"].map(name => [name, range(runs.map(run => run.metrics[name]))])), runs: runs.map(run => ({ seed: run.seed, metrics: run.metrics, checkpoints: run.checkpoints, history: run.history, ledger: run.ledger, social: run.social, explanations: run.explanations })) };
  });
  return { generatedBy: "scripts/first-glow-autonomous-story-review.mjs", generatedAt: "2026-09-10", runtime: { themeId: "living-circuit", ageId: "first-glow", schemaVersion: 3, simulationVersion: "mimir-sim-v3-first-glow", spatialModel: "structured-v2", bundleHash, ticksPerSeason, seasons, totalTicks, sparks: 6 }, reviews, decision: "P2 evidence: autonomous social resolution now varies the beneficiary relationship deterministically by recorded seed while preserving the existing score, ledger, knowledge, and explanation boundaries. Same-seed replay passes and each reviewed scenario has material seed variation. Stories-P3 must still confirm that an independent observer can retell the resulting turns and that no hard evidence boundary regressed.", nonGoals: ["No new map object, route, resource type, institution, personality system, AI authority, Anchor, Originator knowledge, or preferred philosophy.", "Seed variation is bounded input pressure and beneficiary selection, not a moral ranking or hidden knowledge channel."] };
}

function markdown(report) {
  const lines = [`# First Glow Autonomous Story Review`, ``, `Date: ${report.generatedAt}`, `Runtime: ${report.runtime.seasons} × ${report.runtime.ticksPerSeason} ticks (${report.runtime.totalTicks} total), schema ${report.runtime.schemaVersion}, ${report.runtime.simulationVersion}, ${report.runtime.spatialModel}`, `Bundle: ${report.runtime.bundleHash}`, ``, `This report replays the four P1 scenarios with autonomous rules-only social resolution. Every run records its seed, full committed event history, ledger, social state, explanations, and season checkpoints in the JSON companion.`, ``];
  for (const review of report.reviews) {
    lines.push(`## ${review.scenario.title}`, ``, `Seeds: ${review.replayControls.seeds.join(", ")}`, ``, `Same-seed replay: **${review.sameSeedDeterministic ? "pass" : "fail"}** · material seed variation: **${review.materiallyVaried ? "pass" : "fail"}**`, ``, `| Measure | Range |`, `| --- | ---: |`, ...Object.entries(review.ranges).map(([name, value]) => `| ${name} | ${value.min}–${value.max} |`), ``, `Season checkpoints (representative): ${review.runs[1].checkpoints.map(item => `S${item.season} t${item.tick}: ${item.commitmentCount} commitments, ${item.trust} non-neutral trust records`).join("; ")}.`, ``);
  }
  lines.push(`## Decision`, ``, report.decision, ``, `## Non-goals`, ``, ...report.nonGoals.map(item => `- ${item}`), ``);
  return lines.join("\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildAutonomousStoryReport();
  writeFileSync(join(root, "docs/evidence/first-glow-autonomous-story-review.json"), JSON.stringify(report, null, 2) + "\n");
  writeFileSync(join(root, "docs/evidence/first-glow-autonomous-story-review.md"), markdown(report));
  console.log(JSON.stringify({ scenarios: report.reviews.length, deterministic: report.reviews.every(review => review.sameSeedDeterministic), varied: report.reviews.every(review => review.materiallyVaried), outputs: ["docs/evidence/first-glow-autonomous-story-review.json", "docs/evidence/first-glow-autonomous-story-review.md"] }, null, 2));
}
