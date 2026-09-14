import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { FIRST_GLOW_LONG_STORY_PULSES, FIRST_GLOW_REVIEW_PULSES_PER_SEASON, FIRST_GLOW_SEASON_SCENARIOS, FIRST_GLOW_STORY_SEASONS, runFirstGlowSeason } from "./first-glow-season-review.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const range = values => ({ min: Math.min(...values), max: Math.max(...values) });

const scorecard = [
  ["Clear cause and effect", 2, "Objective event IDs, Spark-local witnesses, controlled choices, and committed social records remain linked through all four checkpoints."],
  ["Real dilemma", 1, "Alternatives have bounded different records, but the harness injects them instead of observing autonomous choice."],
  ["Spark distinctiveness", 0, "The harness selects the first eligible actor, so it does not demonstrate distinct autonomous responses."],
  ["Persistent consequences", 2, "Season-one commitments and trust records remain present at the fourth checkpoint."],
  ["Emotional legibility", 1, "Aid, withholding, strain, and repair are identifiable in evidence, but independent observer retellability is not yet captured."],
  ["Narrative shape", 1, "The horizon has setup, pressure, turns, and aftermath, but turns remain externally scheduled review interventions."],
  ["Variation with integrity", 0, "Same-seed replay is deterministic, but the different seeds do not yet produce materially different event messages or headline metrics."],
  ["Observer clarity", 2, "This report separates objective records, Spark-local knowledge, and controlled interventions and preserves replay controls."],
  ["No designated winner", 2, "Helpful and withholding alternatives are recorded without calling either a moral or resource winner."],
  ["First Glow fidelity", 2, "Evidence remains within charge, shelter, traces, exploration, informal cooperation, and incomplete knowledge."]
].map(([criterion, score, finding]) => ({ criterion, score, finding }));

export function buildFirstGlowLongStoryReport() {
  const reviews = FIRST_GLOW_SEASON_SCENARIOS.map(scenario => {
    const runs = scenario.seeds.map(seed => runFirstGlowSeason(scenario, seed));
    const representative = runs[1] ?? runs[0];
    const sameSeedReplay = runFirstGlowSeason(scenario, representative.seed);
    const metrics = ["finalSourceCharge", "finalChargeDeficit", "averageReadiness", "cooperationEvents", "idleOrWaitingEvents", "witnessedFacts", "communicatedClaims", "uncertainInferences", "fulfilledCommitments", "brokenCommitments", "completedSeasons", "persistentCommitments"];
    return {
      scenario: { id: scenario.id, title: scenario.title, question: scenario.question, controlledVariable: scenario.controlledVariable, expectedObservable: scenario.expectedObservable },
      replay: { seedSet: scenario.seeds, pulsesPerSeason: FIRST_GLOW_REVIEW_PULSES_PER_SEASON, seasons: FIRST_GLOW_STORY_SEASONS, totalPulses: FIRST_GLOW_LONG_STORY_PULSES, sourceIntakeEveryFour: scenario.sourceIntakeEveryFour, lossByPulse: scenario.lossByPulse, controlledChoices: scenario.choices, schemaVersion: 3, simulationVersion: "mimir-sim-v3-first-glow", spatialModel: "structured-v2", bundleHash: "sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601" },
      deterministicReplay: JSON.stringify(representative) === JSON.stringify(sameSeedReplay),
      ranges: Object.fromEntries(metrics.map(metric => [metric, range(runs.map(run => run.metrics[metric]))])),
      representative: { seed: representative.seed, metrics: representative.metrics, seasonCheckpoints: representative.seasonCheckpoints, plannedChoices: representative.plannedChoices, arcs: representative.arcs, history: representative.history, ledger: representative.ledger },
      scorecard: { criteria: scorecard, total: scorecard.reduce((sum, item) => sum + item.score, 0), threshold: 16, hardEvidenceBoundariesPass: true, outcome: "partial" }
    };
  });
  return {
    generatedBy: "scripts/first-glow-long-story-review.mjs",
    generatedAt: "2026-09-10",
    baseline: "docs/evidence/first-glow-season-review.md",
    runtime: { themeId: "living-circuit", ageId: "first-glow", schemaVersion: 3, simulationVersion: "mimir-sim-v3-first-glow", spatialModel: "structured-v2", pulsesPerSeason: FIRST_GLOW_REVIEW_PULSES_PER_SEASON, seasonsPerStory: FIRST_GLOW_STORY_SEASONS, pulsesPerStory: FIRST_GLOW_LONG_STORY_PULSES, sparksPerStory: 6, bundleHash: "sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601" },
    reviews,
    decision: "Partial, 13/20: the controlled 96-pulse stories preserve deterministic histories and durable social evidence, but their meaningful turns are injected review controls and different seeds do not yet produce materially different stories. Stories-P2 should prove autonomous choice selection, meaningful seed variation, and independent observer retellability, then Stories-P3 can revalidate. Resonance-P1 (#84) remains Backlog and must not move to Ready from this evidence.",
    limits: ["The scenarios do not establish behavior beyond four 24-pulse review seasons, these seeds, or these controls.", "Controlled interventions are not evidence of autonomous causation.", "The report preserves browser-review requirements, but no independent reviewer capture proves retellability without these annotations.", "No institution, Resonance/Anchor runtime, AI authority, preferred philosophy, credits, or Originator knowledge was introduced."]
  };
}

function markdown(report) {
  const lines = ["# First Glow Long-Season Story Review", "", `Date: ${report.generatedAt}`, `Baseline: [24-pulse season review](first-glow-season-review.md)`, `Runtime: ${report.runtime.seasonsPerStory} × ${report.runtime.pulsesPerSeason} pulses (${report.runtime.pulsesPerStory} total), schema ${report.runtime.schemaVersion}, ${report.runtime.simulationVersion}, ${report.runtime.spatialModel}`, `Bundle: ${report.runtime.bundleHash}`, "", "Four controlled stories each run three fixed seeds across four 24-pulse review seasons. The JSON companion preserves the representative histories, ledgers, checkpoint summaries, exact choices, seeds, bundle, schema, simulation version, and spatial model.", ""];
  for (const review of report.reviews) {
    lines.push(`## ${review.scenario.title}`, "", `Question: ${review.scenario.question}`, "", `Control: ${review.scenario.controlledVariable}`, "", `Replay: seeds ${review.replay.seedSet.join(", ")}; ${review.replay.seasons} × ${review.replay.pulsesPerSeason} pulses; schema ${review.replay.schemaVersion}; ${review.replay.simulationVersion}; ${review.replay.spatialModel}; ${review.replay.bundleHash}.`, "", `Same-seed deterministic replay: **${review.deterministicReplay ? "pass" : "fail"}**.`, "", "| Measure | Range across seeds | Representative |", "| --- | ---: | ---: |");
    for (const [metric, values] of Object.entries(review.ranges)) lines.push(`| ${metric} | ${values.min}–${values.max} | ${review.representative.metrics[metric]} |`);
    lines.push("", `Season checkpoints: ${review.representative.seasonCheckpoints.map(checkpoint => `S${checkpoint.season} t${checkpoint.pulse} (${checkpoint.commitmentCount} commitments; ${checkpoint.nonNeutralTrustCount} non-neutral trust records)`).join("; ")}.`, "", `Scorecard: **${review.scorecard.outcome.toUpperCase()} ${review.scorecard.total}/20**; threshold ${review.scorecard.threshold}; hard evidence boundaries ${review.scorecard.hardEvidenceBoundariesPass ? "pass" : "fail"}.`, "", "| Criterion | Score | Finding |", "| --- | ---: | --- |");
    for (const item of review.scorecard.criteria) lines.push(`| ${item.criterion} | ${item.score} | ${item.finding} |`);
    lines.push("", `Controlled interventions, not autonomous choices: ${review.representative.plannedChoices.filter(choice => choice.applied).map(choice => `${choice.dilemmaId}/${choice.alternativeId} at t${choice.scheduledPulse}`).join(", ")}.`, "");
  }
  lines.push("## Gate decision", "", report.decision, "", "## Limits and evidenced Stories-P2 gaps", "", ...report.limits.map(limit => `- ${limit}`), "");
  return lines.join("\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildFirstGlowLongStoryReport();
  writeFileSync(join(root, "docs", "evidence", "first-glow-long-story-review.json"), JSON.stringify(report, null, 2) + "\n");
  writeFileSync(join(root, "docs", "evidence", "first-glow-long-story-review.md"), markdown(report));
  console.log(JSON.stringify({ scenarios: report.reviews.length, decision: report.decision, outputs: ["docs/evidence/first-glow-long-story-review.json", "docs/evidence/first-glow-long-story-review.md"] }, null, 2));
}
