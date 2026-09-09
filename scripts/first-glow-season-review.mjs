import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { applyFirstGlowDilemmaChoice, advanceFirstGlow, createWorldV3, recordFirstGlowWitnesses } from "../packages/engine/dist/index.js";
import { decodeWorldBundle } from "../packages/world-data/dist/index.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const bundleHash = "sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601";
const bundle = decodeWorldBundle(JSON.parse(readFileSync(join(root, "assets", "world", "generated", bundleHash, "world.json"), "utf8")));

export const FIRST_GLOW_SEASON_SCENARIOS = [
  { id: "abundance-baseline", title: "Abundance baseline", question: "When charge remains dependable, do Sparks explore and cooperate without scarcity pressure?", controlledVariable: "24 source charge intake every fourth tick; no losses", seeds: [1101, 1102, 1103], expectedObservable: "Stable charge access, exploration/trace activity, and a low final charge deficit.", interpretation: "Intended tradeoff: dependable supply should permit exploration and cooperation; this bounded run shows no immediate bug.", choices: [{ tick: 6, dilemmaId: "weakening-pool-report", alternativeId: "reveal-pool" }, { tick: 12, dilemmaId: "shelter-or-trace", alternativeId: "help-shelter" }, { tick: 18, dilemmaId: "public-or-private-mark", alternativeId: "make-mark-public" }], sourceIntakeEveryFour: 24, lossByTick: {} },
  { id: "supply-scarcity", title: "Supply scarcity", question: "When intake stops and charge is lost, does pressure increase deficit and shelter-seeking?", controlledVariable: "No replenishment; 4 charge lost at ticks 8, 16, and 24", seeds: [1201, 1202, 1203], expectedObservable: "Lower remaining source charge, higher deficit/readiness pressure, and more idle or waiting events.", interpretation: "Intended tradeoff: lower supply should raise charge pressure; unresolved question: whether shelter recovery should outpace depletion.", choices: [{ tick: 6, dilemmaId: "weakening-pool-report", alternativeId: "withhold-pool" }, { tick: 12, dilemmaId: "shelter-or-trace", alternativeId: "continue-exploration" }, { tick: 18, dilemmaId: "public-or-private-mark", alternativeId: "keep-mark-private" }], sourceIntakeEveryFour: 0, lossByTick: { 8: 4, 16: 4, 24: 4 } },
  { id: "information-gap", title: "Information gap", question: "When local signals are available but communication is not guaranteed, do knowledge boundaries remain visible?", controlledVariable: "8 source charge intake every fourth tick; social claims are limited to witnessed evidence", seeds: [1301, 1302, 1303], expectedObservable: "Witnessed facts and uncertain inferences diverge between Sparks while objective events remain shared history.", interpretation: "Intended tradeoff: limited communication should preserve local knowledge boundaries; unresolved question: whether a future explicit communication action is needed.", choices: [{ tick: 6, dilemmaId: "public-or-private-mark", alternativeId: "keep-mark-private" }, { tick: 12, dilemmaId: "weakening-pool-report", alternativeId: "withhold-pool" }, { tick: 18, dilemmaId: "shelter-or-trace", alternativeId: "continue-exploration" }], sourceIntakeEveryFour: 8, lossByTick: {} },
  { id: "promise-breach", title: "Promise breach and repair", question: "After a Spark breaks an informal promise, can later help produce a bounded, evidence-linked trust repair?", controlledVariable: "16 source charge intake every fourth tick; one broken choice at tick 6 followed by help at tick 12", seeds: [1401, 1402, 1403], expectedObservable: "A bounded trust dip, two commitment records, and a later fulfilled commitment with preserved evidence.", interpretation: "Intended tradeoff: breaking and then helping should leave distinct evidence-linked commitment outcomes; this bounded run shows no immediate bug.", choices: [{ tick: 6, dilemmaId: "shelter-or-trace", alternativeId: "continue-exploration" }, { tick: 12, dilemmaId: "shelter-or-trace", alternativeId: "help-shelter" }, { tick: 18, dilemmaId: "public-or-private-mark", alternativeId: "make-mark-public" }], sourceIntakeEveryFour: 16, lossByTick: {}, }
];

function compare(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
function round(value) { return Math.round(value * 100) / 100; }
function range(values) { return { min: Math.min(...values), max: Math.max(...values), mean: round(values.reduce((sum, value) => sum + value, 0) / values.length) }; }
function eventByActor(history, actorId, predicate = () => true) { return history.find(event => event.actorId === actorId && predicate(event)); }

function applyPlannedChoice(world, plan, events) {
  const evidence = events.slice().sort((a, b) => compare(a.id, b.id))[0];
  if (!evidence) return { world, applied: false, actorSparkId: null, targetSparkId: null, evidenceEventId: null };
  const actorSparkId = evidence.actorId;
  const targetSparkId = world.firstGlowState.settlements.flatMap(settlement => settlement.sparks).map(spark => spark.id).sort(compare).find(sparkId => sparkId !== actorSparkId);
  if (!targetSparkId) return { world, applied: false, actorSparkId, targetSparkId: null, evidenceEventId: evidence.id };
  recordFirstGlowWitnesses(world.firstGlowState.social, [evidence.id], actorSparkId, [], world.tick);
  const social = applyFirstGlowDilemmaChoice(world.firstGlowState.social, { ...plan, actorSparkId, targetSparkId, evidenceEventIds: [evidence.id], tick: world.tick });
  return { world: { ...world, firstGlowState: { ...world.firstGlowState, social } }, applied: true, actorSparkId, targetSparkId, evidenceEventId: evidence.id };
}

export function runFirstGlowSeason(scenario, seed, ticks = 24) {
  let world = createWorldV3(bundle, seed, `season-${scenario.id}-${seed}`, 6);
  const history = [];
  const ledger = [];
  const plannedChoices = [];
  for (let step = 0; step < ticks; step += 1) {
    const nextTick = world.tick + 1;
    const sourceCharge = nextTick % 4 === 0 ? scenario.sourceIntakeEveryFour : 0;
    const loss = scenario.lossByTick[nextTick] ?? 0;
    const firstGlowState = advanceFirstGlow(world.firstGlowState, { sourceCharge, loss, resolveSocial: false });
    world = { ...world, tick: firstGlowState.tick, firstGlowState };
    const tickEvents = firstGlowState.events.map(event => ({ ...event, tick: firstGlowState.tick }));
    history.push(...tickEvents);
    ledger.push(...firstGlowState.ledger.map(entry => ({ ...entry, tick: firstGlowState.tick })));
    const plan = scenario.choices.find(choice => choice.tick === firstGlowState.tick);
    if (plan) {
      const result = applyPlannedChoice(world, plan, tickEvents);
      world = result.world;
      plannedChoices.push({ ...plan, evidenceMode: "controlled-intervention", applied: result.applied, actorSparkId: result.actorSparkId, targetSparkId: result.targetSparkId, evidenceEventId: result.evidenceEventId });
    }
  }
  const settlement = world.firstGlowState.settlements[0];
  const sparks = settlement.sparks.slice().sort((a, b) => compare(a.id, b.id));
  const trustValues = world.firstGlowState.social.trust.map(record => record.value);
  const commitments = world.firstGlowState.social.commitments;
  const eventCounts = Object.fromEntries([...new Set(history.map(event => event.kind))].sort(compare).map(kind => [kind, history.filter(event => event.kind === kind).length]));
  const arcs = sparks.map(spark => {
    const actorEvents = history.filter(event => event.actorId === spark.id);
    const pressure = eventByActor(actorEvents, spark.id, event => ["draw", "idle", "wait"].includes(event.kind)) ?? actorEvents[0];
    const response = pressure ? actorEvents.find(event => event.tick > pressure.tick) : actorEvents[1];
    const later = actorEvents.at(-1);
    return { sparkId: spark.id, sparkName: spark.name, pressure, response, later };
  }).filter(arc => arc.pressure && arc.response && arc.later).slice(0, 3);
  return {
    scenarioId: scenario.id, title: scenario.title, seed, ticks, history, ledger, plannedChoices, controlledInterventions: plannedChoices, arcs,
    metrics: {
      finalSourceCharge: settlement.sourceCharge,
      finalCommunalCharge: settlement.communalCharge,
      finalCarriedCharge: sparks.reduce((sum, spark) => sum + spark.carriedCharge, 0),
      finalChargeDeficit: sparks.reduce((sum, spark) => sum + spark.chargeDeficit, 0),
      averageReadiness: round(sparks.reduce((sum, spark) => sum + spark.readiness, 0) / sparks.length),
      totalDrawn: ledger.filter(entry => entry.kind === "draw").reduce((sum, entry) => sum + entry.amount, 0),
      totalShared: ledger.filter(entry => entry.kind === "share").reduce((sum, entry) => sum + entry.amount, 0),
      totalLoss: ledger.filter(entry => entry.kind === "loss").reduce((sum, entry) => sum + entry.amount, 0),
      eventCount: history.length,
      cooperationEvents: history.filter(event => ["share", "meet"].includes(event.kind)).length,
      idleOrWaitingEvents: history.filter(event => ["idle", "wait"].includes(event.kind)).length,
      witnessedFacts: world.firstGlowState.social.knowledge.reduce((sum, item) => sum + item.witnessedFacts.length, 0),
      communicatedClaims: world.firstGlowState.social.knowledge.reduce((sum, item) => sum + item.communicatedClaims.length, 0),
      uncertainInferences: world.firstGlowState.social.knowledge.reduce((sum, item) => sum + item.uncertainInferences.length, 0),
      trust: range(trustValues),
      fulfilledCommitments: commitments.filter(item => item.status === "fulfilled").length,
      brokenCommitments: commitments.filter(item => item.status === "broken").length,
      appliedChoices: plannedChoices.filter(choice => choice.applied).length,
      controlledInterventions: plannedChoices.filter(choice => choice.applied).length
    }
  };
}

export function buildFirstGlowSeasonReport() {
  const reviews = FIRST_GLOW_SEASON_SCENARIOS.map(scenario => {
    const runs = scenario.seeds.map(seed => runFirstGlowSeason(scenario, seed));
    const representative = runs[1] ?? runs[0];
    const metricNames = ["finalSourceCharge", "finalCommunalCharge", "finalCarriedCharge", "finalChargeDeficit", "averageReadiness", "totalDrawn", "totalShared", "totalLoss", "eventCount", "cooperationEvents", "idleOrWaitingEvents", "witnessedFacts", "communicatedClaims", "uncertainInferences", "fulfilledCommitments", "brokenCommitments", "appliedChoices"];
    const ranges = Object.fromEntries(metricNames.map(name => [name, range(runs.map(run => run.metrics[name]))]));
    ranges.trust = { min: range(runs.map(run => run.metrics.trust.min)).min, max: range(runs.map(run => run.metrics.trust.max)).max, mean: range(runs.map(run => run.metrics.trust.mean)).mean };
    return { scenario: { ...scenario, bundleHash }, seedSet: scenario.seeds, ranges, representative: { seed: representative.seed, metrics: representative.metrics, arcs: representative.arcs, plannedChoices: representative.plannedChoices, controlledInterventions: representative.controlledInterventions, eventSample: representative.history.filter(event => event.kind !== "movement").slice(0, 12) } };
  });
  return {
    generatedBy: "scripts/first-glow-season-review.mjs",
    generatedAt: "2026-09-09",
    runtime: { themeId: "living-circuit", ageId: "first-glow", schemaVersion: 3, simulationVersion: "mimir-sim-v3-first-glow", spatialModel: "structured-v2", bundleHash, ticksPerSeason: 24, sparksPerSeason: 6 },
    reviews,
    decision: "Deepen the rules-only model's shelter and trust-repair loop before adding AI interpretation: scarcity changes charge pressure, while the information-gap and promise-breach runs show that evidence-linked local knowledge and bounded repair are the next useful questions.",
    notEstablished: ["These fixed-seed seasons do not establish general behavior outside the tested seeds, 24-tick horizon, or four controls.", "Observed event order supports an evidence chain but does not prove that one event alone caused a later choice.", "The suite does not establish a stable long-term haven, universal Spark values, or that any future AI interpretation would improve the rules-only baseline.", "The current engine does not model a live communication channel for every objective event; absent claims remain absent knowledge.", "Choices listed as controlled interventions were injected by the review harness and are not evidence of autonomous causation; autonomous runtime behavior is evaluated by the committed event and social-state records."]
  };
}

function markdown(report) {
  const lines = [`# First Glow Season Review`, ``, `Date: ${report.generatedAt}`, `Runtime: ${report.runtime.ageId}, schema ${report.runtime.schemaVersion}, ${report.runtime.ticksPerSeason} ticks, ${report.runtime.sparksPerSeason} Sparks`, `Bundle: ${report.runtime.bundleHash}`, ``, `This report preserves four fixed-control reviews with three seeds each. Ranges are min–max across matched runs; the representative history is the middle seed.`, ``];
  for (const review of report.reviews) {
    const { scenario, ranges, representative } = review;
    lines.push(`## ${scenario.title}`, ``, `Question: ${scenario.question}`, ``, `Controlled variable: ${scenario.controlledVariable}`, ``, `Expected observable: ${scenario.expectedObservable}`, ``, `Interpretation: ${scenario.interpretation}`, ``, `Seeds: ${review.seedSet.join(", ")}`, ``, `| Measure | Range | Representative (${representative.seed}) |`, `| --- | ---: | ---: |`);
    for (const name of ["finalSourceCharge", "finalChargeDeficit", "averageReadiness", "cooperationEvents", "idleOrWaitingEvents", "witnessedFacts", "communicatedClaims", "uncertainInferences", "fulfilledCommitments", "brokenCommitments"]) lines.push(`| ${name} | ${ranges[name].min}–${ranges[name].max} | ${representative.metrics[name]} |`);
    lines.push(``, `Observed causal chain candidates (objective evidence only):`);
    for (const arc of representative.arcs) lines.push(`- ${arc.sparkName}: pressure ${arc.pressure.id} (${arc.pressure.message}) → response ${arc.response.id} (${arc.response.message}) → later ${arc.later.id} (${arc.later.message})`);
    lines.push(``, `Controlled interventions (not autonomous choices): ${representative.controlledInterventions.filter(choice => choice.applied).map(choice => `${choice.dilemmaId}/${choice.alternativeId} at tick ${choice.tick}`).join(", ") || "none"}`);
    lines.push(``, `Representative non-movement events: ${representative.eventSample.map(event => event.id).join(", ") || "none"}`, ``);
  }
  lines.push(`## Evidence-based decision`, ``, report.decision, ``, `## What the data does not establish`, ``, ...report.notEstablished.map(item => `- ${item}`), ``);
  return lines.join("\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildFirstGlowSeasonReport();
  writeFileSync(join(root, "docs", "evidence", "first-glow-season-review.json"), JSON.stringify(report, null, 2) + "\n");
  writeFileSync(join(root, "docs", "evidence", "first-glow-season-review.md"), markdown(report));
  console.log(JSON.stringify({ scenarios: report.reviews.length, seeds: report.reviews.reduce((sum, review) => sum + review.seedSet.length, 0), decision: report.decision, outputs: ["docs/evidence/first-glow-season-review.json", "docs/evidence/first-glow-season-review.md"] }, null, 2));
}
