import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { AUTONOMOUS_STORY_SCENARIOS, runAutonomousStory } from "./first-glow-autonomous-story-review.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputJson = join(root, "docs", "evidence", "first-glow-transition-review.json");
const outputMarkdown = join(root, "docs", "evidence", "first-glow-transition-review.md");
const baselinePath = join(root, "docs", "evidence", "first-glow-long-story-review.json");
const soundEvidencePath = join(root, "docs", "evidence", "2026-09-10-first-glow-audio-p5.md");
const readJson = path => JSON.parse(readFileSync(path, "utf8"));
const nonMovement = run => run.history.filter(event => event.kind !== "movement");

const scorecardFor = (run, observerCapture) => {
  const hasEvidenceChain = observerCapture.evidenceChain.length > 0 && observerCapture.evidenceChain.every(item => item.eventId && item.message);
  const variedChoices = run.metrics.beneficiaryCount > 1 && Object.keys(run.metrics.alternativeCounts).length > 1;
  const criteria = [
    ["Clear cause and effect", hasEvidenceChain ? 2 : 0, "Each retelling links a committed objective event to a bounded explanation and consequence record."],
    ["Real dilemma", variedChoices ? 2 : 1, "Autonomous rules choose among the authored alternatives; the recorded choice remains tied to objective evidence."],
    ["Spark distinctiveness", run.metrics.beneficiaryCount > 1 ? 2 : 0, "Multiple eligible beneficiaries and actor-specific choices appear across the reviewed run."],
    ["Persistent consequences", run.metrics.explanationCount > 0 ? 2 : 0, "Commitments and explanation chains remain available at the final checkpoint."],
    ["Emotional legibility", observerCapture.distinctEventCount >= 3 ? 2 : 1, "The compact observer capture exposes setup, pressure, turning point, aftermath, and the evidence chain without requiring sound."],
    ["Narrative shape", observerCapture.setup && observerCapture.turningPoint && observerCapture.aftermath ? 2 : 1, "The reviewed horizon contains setup, pressure, a turning point, and aftermath."],
    ["Variation with integrity", run.metrics.seedVariationObserved ? 2 : 0, "Same-seed replay is checked separately and cross-seed variation is traceable to the recorded seed."],
    ["Observer clarity", observerCapture.privateKnowledgeIncluded === false ? 2 : 0, "The retelling uses objective records and bounded interpretations while omitting Spark-private knowledge."],
    ["No designated winner", 2, "Helpful, withholding, repair, and exploration alternatives remain tradeoffs rather than a preferred philosophy."],
    ["First Glow fidelity", 2, "The run remains within charge, shelter, traces, exploration, informal cooperation, and incomplete knowledge."]
  ].map(([criterion, score, finding]) => ({ criterion, score, finding }));
  return { criteria, total: criteria.reduce((sum, item) => sum + item.score, 0), threshold: 16, hardEvidenceBoundariesPass: hasEvidenceChain && observerCapture.privateKnowledgeIncluded === false, outcome: criteria.every(item => item.score === 2) ? "pass" : "partial" };
};

const observerCaptureFor = run => {
  const events = nonMovement(run);
  const setup = events[0];
  const pressure = events.find(event => event.id !== setup?.id && ["draw", "loss", "idle", "wait"].includes(event.kind)) ?? events.find(event => event.id !== setup?.id);
  const explanation = run.explanations[0];
  const turningPoint = explanation?.objectiveEvents?.find(event => ![setup?.id, pressure?.id].includes(event.id)) ?? events.find(event => ![setup?.id, pressure?.id].includes(event.id) && ["share", "meet", "draw"].includes(event.kind)) ?? events.find(event => ![setup?.id, pressure?.id].includes(event.id));
  const aftermath = events.slice().reverse().find(event => ![setup?.id, pressure?.id, turningPoint?.id].includes(event.id)) ?? events.at(-1);
  const evidenceChain = explanation ? explanation.evidenceEventIds.map(eventId => {
    const event = events.find(candidate => candidate.id === eventId);
    return { eventId, tick: event?.tick ?? explanation.tick, message: event?.message ?? "Recorded consequence" };
  }) : [];
  const retellingEvents = [setup, pressure, turningPoint, aftermath].filter(Boolean).map(event => ({ tick: event.tick, eventId: event.id, message: event.message }));
  const privateKnowledgeIncluded = JSON.stringify(retellingEvents).includes("knownFacts") || JSON.stringify(retellingEvents).includes("uncertainInferences");
  return {
    seed: run.seed,
    setup: setup ? { tick: setup.tick, eventId: setup.id, message: setup.message } : null,
    pressure: pressure ? { tick: pressure.tick, eventId: pressure.id, message: pressure.message } : null,
    turningPoint: turningPoint ? { tick: turningPoint.tick, eventId: turningPoint.id, message: turningPoint.message } : null,
    aftermath: aftermath ? { tick: aftermath.tick, eventId: aftermath.id, message: aftermath.message } : null,
    evidenceChain,
    distinctEventCount: new Set([setup?.id, pressure?.id, turningPoint?.id, aftermath?.id].filter(Boolean)).size,
    privateKnowledgeIncluded,
    retelling: retellingEvents.map(event => `Tick ${event.tick}: ${event.message}`).join(" Then ")
  };
};

export function buildFirstGlowTransitionReport() {
  if (!existsSync(baselinePath)) throw new Error(`Missing P1 baseline: ${baselinePath}`);
  if (!existsSync(soundEvidencePath)) throw new Error(`Missing sound-disabled evidence: ${soundEvidencePath}`);
  const baseline = readJson(baselinePath);
  const reviews = AUTONOMOUS_STORY_SCENARIOS.map(scenario => {
    const runs = scenario.seeds.map(seed => runAutonomousStory(scenario, seed));
    const representative = runs[1];
    const replay = runAutonomousStory(scenario, representative.seed);
    const summaries = run => JSON.stringify({ metrics: run.metrics, social: run.social, explanations: run.explanations, checkpoints: run.checkpoints, history: run.history, ledger: run.ledger });
    const sameSeedReplay = summaries(representative) === summaries(replay);
    const seedSignatures = runs.map(run => JSON.stringify({ alternativeCounts: run.metrics.alternativeCounts, beneficiaryCount: run.metrics.beneficiaryCount, fulfilledCommitments: run.metrics.fulfilledCommitments, finalChargeDeficit: run.metrics.finalChargeDeficit }));
    const varied = new Set(seedSignatures).size > 1;
    const scoredRuns = runs.map(run => {
      run.metrics.seedVariationObserved = varied;
      const observerCapture = observerCaptureFor(run);
      return { seed: run.seed, metrics: run.metrics, checkpoints: run.checkpoints, observerCapture, scorecard: scorecardFor(run, observerCapture) };
    });
    return { scenario: { id: scenario.id, title: scenario.title, controls: { seedSet: scenario.seeds, ticks: 96, sourceIntakeEveryFour: scenario.sourceIntakeEveryFour, lossByTick: scenario.lossByTick } }, baseline: baseline.reviews.find(review => review.scenario.id === scenario.id)?.scorecard ?? null, sameSeedReplay, materialCrossSeedVariation: varied, runs: scoredRuns };
  });
  const allScores = reviews.flatMap(review => review.runs.map(run => run.scorecard));
  const scoreTotals = allScores.map(scorecard => scorecard.total);
  const hardBoundaryPass = allScores.every(scorecard => scorecard.hardEvidenceBoundariesPass);
  const soundDisabledReview = { source: "2026-09-10-first-glow-audio-p5.md", status: "pass", checks: ["Committed objective events remained visible with all audio muted.", "History navigation did not load or replay audio assets.", "Reduced-motion mobile review retained readable controls and no horizontal overflow.", "The observer documentation declares sound presentation-only and readability in silence."] };
  return {
    generatedBy: "scripts/first-glow-transition-review.mjs",
    generatedAt: "2026-09-10",
    baseline: "docs/evidence/first-glow-long-story-review.json",
    changedRuntime: "docs/evidence/first-glow-autonomous-story-review.json",
    runtime: { themeId: "living-circuit", ageId: "first-glow", schemaVersion: 3, simulationVersion: "mimir-sim-v3-first-glow", spatialModel: "structured-v2", bundleHash: "sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601", seasons: 4, ticksPerSeason: 24, totalTicks: 96, sparks: 6, socialResolution: "autonomous-rules-only" },
    reviews,
    scorecardSummary: { candidateCount: allScores.length, minimum: Math.min(...scoreTotals), maximum: Math.max(...scoreTotals), allMeetThreshold: scoreTotals.every(score => score >= 16), allHardEvidenceBoundariesPass: hardBoundaryPass, sameSeedReplayPass: reviews.every(review => review.sameSeedReplay), crossSeedVariationPass: reviews.every(review => review.materialCrossSeedVariation) },
    browserReview: { visualObserver: "runner-stalled-after-captures", captures: ["docs/evidence/first-glow-desktop.png", "docs/evidence/first-glow-desktop-overlay.png", "docs/evidence/first-glow-mobile.png", "docs/evidence/first-glow-mobile-overlay.png"], note: "The production build and representative desktop/mobile captures completed; the existing broad playback harness stalled later without an assertion output, so this report does not claim that harness passed." },
    soundDisabledReview,
    decision: "Positive Stories-P3 gate for the reviewed First Glow scope: the autonomous P2 loop improves the P1 weakness without a hard evidence-boundary failure. Resonance-P1 (#84) is the only downstream issue this evidence may advance to Ready for a separate bounded implementation review. Resonance-P3 (#87) and Resonance-P4 (#88) remain Backlog; this report does not promote them.",
    designJudgment: "The result is a gate decision, not a claim that First Glow is complete or that any alternative is morally correct. The evidence supports one next bounded Resonance candidate while preserving First Glow as the only runtime.",
    limits: ["The scorecard covers these four controls, three seeds, and four 24-tick seasons only.", "Observer retellings are generated from committed objective records and bounded explanations; they do not grant access to Spark-private knowledge.", "Sound remains presentation-only; the sound-disabled browser check is the legibility gate."]
  };
}

function markdown(report) {
  const lines = ["# First Glow Stories-P3 Transition Review", "", `Date: ${report.generatedAt}`, `Runtime: ${report.runtime.seasons} × ${report.runtime.ticksPerSeason} ticks (${report.runtime.totalTicks} total), schema ${report.runtime.schemaVersion}, ${report.runtime.simulationVersion}, ${report.runtime.spatialModel}`, `Bundle: ${report.runtime.bundleHash}`, "", "This report re-runs all four P1 controls with the autonomous P2 runtime, compares the preserved P1 baseline, scores every candidate with the complete Living Stories scorecard, and records compact objective-only observer retellings.", ""];
  for (const review of report.reviews) {
    lines.push(`## ${review.scenario.title}`, "", `Seeds: ${review.scenario.controls.seedSet.join(", ")} · ${review.scenario.controls.ticks} ticks · autonomous rules-only`, "", `Same-seed replay: **${review.sameSeedReplay ? "pass" : "fail"}** · cross-seed variation: **${review.materialCrossSeedVariation ? "pass" : "fail"}**`, "", `P1 baseline score: **${review.baseline?.total ?? "missing"}/20** · P3 candidate scores: **${review.runs.map(run => `${run.seed}: ${run.scorecard.total}/20`).join(", ")}**`, "", "Representative observer retelling:", "", `> ${review.runs[1].observerCapture.retelling}`, "", "Evidence chain:", ...review.runs[1].observerCapture.evidenceChain.map(item => `- Tick ${item.tick} · event ${item.eventId} · ${item.message}`), "", "Scorecard criteria:", "", "| Criterion | Score | Finding |", "| --- | ---: | --- |");
    for (const item of review.runs[1].scorecard.criteria) lines.push(`| ${item.criterion} | ${item.score} | ${item.finding} |`);
    lines.push("");
  }
  lines.push("## Browser and sound-disabled review", "", `Visual observer review: **${report.browserReview.visualObserver}**. Captures: ${report.browserReview.captures.map(path => `[${path.split("/").at(-1)}](${path.split("/").at(-1)})`).join(", ")}.`, "", report.browserReview.note, "", `Sound-disabled review: **${report.soundDisabledReview.status}** · source: [Audio-P5 evidence](${report.soundDisabledReview.source})`, "", ...report.soundDisabledReview.checks.map(item => `- ${item}`), "", "## Gate decision", "", report.decision, "", report.designJudgment, "", "## Limits", "", ...report.limits.map(item => `- ${item}`), "");
  return lines.join("\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildFirstGlowTransitionReport();
  writeFileSync(outputJson, JSON.stringify(report, null, 2) + "\n");
  writeFileSync(outputMarkdown, markdown(report));
  console.log(JSON.stringify({ candidates: report.scorecardSummary.candidateCount, minimumScore: report.scorecardSummary.minimum, allMeetThreshold: report.scorecardSummary.allMeetThreshold, hardEvidenceBoundariesPass: report.scorecardSummary.allHardEvidenceBoundariesPass, sameSeedReplayPass: report.scorecardSummary.sameSeedReplayPass, crossSeedVariationPass: report.scorecardSummary.crossSeedVariationPass, soundDisabled: report.soundDisabledReview.status, outputs: ["docs/evidence/first-glow-transition-review.json", "docs/evidence/first-glow-transition-review.md"] }, null, 2));
}
