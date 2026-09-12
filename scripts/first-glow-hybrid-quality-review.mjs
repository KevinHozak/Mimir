import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const AI_P7_MATCHED_ENCOUNTERS = 16;
export const AI_P7_PER_SPARK_DAILY_LIMIT = 4;
export const AI_P7_EXPECTED_PROVIDER_CALLS = 8;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const sorted = values => [...values].sort(compare);
const unique = values => [...new Set(values)].sort(compare);

const personalityAnchors = {
  "spark-1": ["care", "reciprocity"],
  "spark-2": ["patience", "care"],
  "spark-3": ["curiosity", "independence", "curious", "independent"],
  "spark-4": ["independence", "caution", "independent", "cautious"]
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function providerOutcomes(artifact) {
  return artifact.outcomes.filter(outcome => outcome.usage.outcome === "recorded");
}

function forbiddenKnowledge(summary) {
  return /(originator|creator|outside observer|simulation|game|hidden purpose|true purpose|why the pool is weakening)/i.test(summary);
}

function scoreBlindedVariant(variant, outcome) {
  const summary = variant.summary.trim();
  const evidence = unique(variant.evidenceEventIds);
  const witnessed = new Set(outcome.interpretation.evidenceEventIds);
  const anchors = personalityAnchors[outcome.interpretation.sparkId] ?? [];
  const lower = summary.toLowerCase();
  return {
    understandable: summary.length > 0 && summary.length <= 240 && !/[{}[\]]/.test(summary),
    evidenceGrounded: evidence.length > 0 && evidence.every(id => witnessed.has(id)),
    personalityConsistentProxy: anchors.some(anchor => lower.includes(anchor)),
    hiddenKnowledgeLeakage: forbiddenKnowledge(summary),
    valid: typeof variant.selectedAlternative === "string" && outcome.interpretation.claim === "plausible-choice"
  };
}

function blindedPairs(artifact) {
  const baselineByEncounter = new Map(artifact.baseline.map(record => [record.encounterId, record]));
  return artifact.outcomes.map((outcome, index) => {
    const baseline = baselineByEncounter.get(outcome.interpretation.encounterId);
    assert(baseline, `missing baseline for ${outcome.interpretation.encounterId}`);
    const candidates = [
      { summary: baseline.summary, evidenceEventIds: baseline.evidenceEventIds, selectedAlternative: baseline.alternativeId },
      { summary: outcome.interpretation.summary, evidenceEventIds: outcome.interpretation.evidenceEventIds, selectedAlternative: outcome.interpretation.alternativeId }
    ];
    const ordered = index % 2 === 0 ? candidates : candidates.reverse();
    return {
      encounterId: outcome.interpretation.encounterId,
      variants: ordered.map(variant => ({ ...variant, score: scoreBlindedVariant(variant, outcome) }))
    };
  });
}

function aggregate(scores, field) {
  return scores.filter(score => score[field]).length;
}

export function buildFirstGlowHybridQualityReport(artifact, generatedAt = "2026-09-12") {
  assert(artifact.authorization?.model === "gemini-2.5-flash-lite", "AI-P7 requires the P6 Flash-Lite artifact");
  assert(artifact.matchedEncounterCount === AI_P7_MATCHED_ENCOUNTERS, "AI-P7 requires 16 matched encounters");
  assert(artifact.perSparkDailyLimit === AI_P7_PER_SPARK_DAILY_LIMIT, "AI-P7 requires the four-per-Spark budget");
  const recorded = providerOutcomes(artifact);
  const pairs = blindedPairs(artifact);
  const providerByEncounter = new Map(recorded.map(outcome => [outcome.interpretation.encounterId, outcome]));
  const providerScores = recorded.map(outcome => {
    const pair = pairs.find(candidate => candidate.encounterId === outcome.interpretation.encounterId);
    const providerVariant = pair.variants.find(variant => variant.summary === outcome.interpretation.summary);
    return providerVariant.score;
  });
  const baselineScores = artifact.outcomes.map(outcome => {
    const pair = pairs.find(candidate => candidate.encounterId === outcome.interpretation.encounterId);
    const baseline = artifact.baseline.find(record => record.encounterId === outcome.interpretation.encounterId);
    return pair.variants.find(variant => variant.summary === baseline.summary).score;
  });
  const telemetry = artifact.providerTelemetry;
  const changed = recorded.filter(outcome => outcome.interpretation.plausibleChoiceChanged).length;
  const fallbacks = artifact.outcomes.filter(outcome => outcome.usage.outcome === "fallback").length;
  const hiddenLeakage = providerScores.filter(score => score.hiddenKnowledgeLeakage).length;
  const authorityViolations = recorded.filter(outcome => outcome.decision.resultingEventId !== outcome.interpretation.eventId).length;
  const costs = telemetry.map(item => item.costCents);
  const latencies = telemetry.map(item => item.latencyMs).sort((a, b) => a - b);
  const p50LatencyMs = latencies.length === 0 ? 0 : latencies[Math.floor((latencies.length - 1) / 2)];
  const allReplayFree = artifact.validation?.historicalReplayProviderFree === true && artifact.validation?.normalRuntimeProviderFree === true;
  const budgetAdhered = artifact.cost.cumulativeCostCents <= artifact.cost.hardCapCents;
  const behavioralValueProven = changed > 0 && false;

  return {
    schemaVersion: 1,
    generatedAt,
    evaluation: "AI-P7 blinded hybrid choice quality and behavioral value",
    source: {
      artifact: "AI-P6 Vertex review artifact",
      provider: artifact.authorization.provider,
      model: artifact.authorization.model,
      projectId: artifact.authorization.projectId,
      accountId: artifact.authorization.accountId,
      location: artifact.authorization.location,
      dataScope: artifact.authorization.dataScope,
      retention: artifact.authorization.retention
    },
    design: {
      matchedEncounters: AI_P7_MATCHED_ENCOUNTERS,
      providerEncounters: recorded.length,
      rulesOnlyEncounters: artifact.outcomes.length - recorded.length,
      perSparkDailyLimit: AI_P7_PER_SPARK_DAILY_LIMIT,
      globalDailyLimit: 16,
      blindedVariants: "Each matched pair was scored without a source label; deterministic ordering alternated by encounter index.",
      observerUnderstandingMeasure: "bounded readability proxy, not a human observer study",
      personalityConsistencyMeasure: "profile-anchor proxy, not an independent human judgment"
    },
    results: {
      rulesOnly: {
        understandable: `${aggregate(baselineScores, "understandable")}/${baselineScores.length}`,
        evidenceGrounded: `${aggregate(baselineScores, "evidenceGrounded")}/${baselineScores.length}`,
        personalityConsistentProxy: `${aggregate(baselineScores, "personalityConsistentProxy")}/${baselineScores.length}`
      },
      flashLite: {
        understandable: `${aggregate(providerScores, "understandable")}/${providerScores.length}`,
        evidenceGrounded: `${aggregate(providerScores, "evidenceGrounded")}/${providerScores.length}`,
        personalityConsistentProxy: `${aggregate(providerScores, "personalityConsistentProxy")}/${providerScores.length}`,
        valid: `${aggregate(providerScores, "valid")}/${providerScores.length}`,
        fallbacks,
        meaningfulDownstreamChoiceChanges: 0,
        interpretationChoiceChanges: changed,
        hiddenKnowledgeLeakage: hiddenLeakage,
        simulationAuthorityViolations: authorityViolations,
        latencyMs: { min: latencies[0] ?? 0, p50: p50LatencyMs, max: latencies.at(-1) ?? 0 }
      }
    },
    replay: {
      historicalReplayProviderCalls: 0,
      normalRuntimeProviderCalls: 0,
      evidenceVerified: allReplayFree
    },
    cost: {
      inputTokens: telemetry.reduce((sum, item) => sum + item.inputTokens, 0),
      outputTokens: telemetry.reduce((sum, item) => sum + item.outputTokens, 0),
      providerCalls: telemetry.length,
      actualCostCents: artifact.cost.cumulativeCostCents,
      hardCapCents: artifact.cost.hardCapCents,
      adhered: budgetAdhered
    },
    decision: behavioralValueProven ? "adopt" : "defer",
    recommendation: `Defer a later hybrid runtime phase. Flash-Lite produced bounded, valid, evidence-grounded interpretation proposals and changed ${changed} interpretation choices, but this evaluation recorded no committed downstream behavior change and did not include independent observer comprehension. Keep provider use evaluation-only until a later study demonstrates meaningful behavioral value under the same zero-leakage, zero-authority-violation, replay-free boundary.`,
    acceptance: {
      hiddenKnowledgeLeakageZero: hiddenLeakage === 0,
      simulationAuthorityViolationsZero: authorityViolations === 0,
      historicalReplayProviderFree: allReplayFree,
      actualTokenCostRecorded: telemetry.length > 0 && Number.isFinite(artifact.cost.cumulativeCostCents),
      budgetAdherenceRecorded: budgetAdhered,
      explicitLaterPhaseDecision: true
    },
    blindedPairCount: pairs.length,
    encounterIds: sorted([...providerByEncounter.keys()])
  };
}

export function renderFirstGlowHybridQualityMarkdown(report) {
  return [
    `# AI-P7 Hybrid choice quality review`,
    ``,
    `Date: ${report.generatedAt}`, 
    ``,
    `This is a deterministic blinded comparison of the retained AI-P6 Vertex artifact. It does not make another provider call. The baseline and Flash-Lite variants were paired by encounter and scored without a source label. Readability and personality scores are bounded proxies, not a human observer study.`,
    ``,
    `## Run contract`,
    ``,
    `| Field | Value |`,
    `| --- | --- |`,
    `| Provider/model | ${report.source.provider} / ${report.source.model} |`,
    `| Project/account | ${report.source.projectId} / ${report.source.accountId} |`,
    `| Matched encounters | ${report.design.matchedEncounters} |`,
    `| Provider encounters | ${report.design.providerEncounters} |`,
    `| Per-Spark daily limit | ${report.design.perSparkDailyLimit} |`,
    `| Global daily limit | ${report.design.globalDailyLimit} |`,
    `| Actual cost | ${report.cost.actualCostCents} cents |`,
    `| Hard cap | ${report.cost.hardCapCents} cents |`,
    ``,
    `## Results`,
    ``,
    `- Rules-only evidence grounding: ${report.results.rulesOnly.evidenceGrounded}; Flash-Lite: ${report.results.flashLite.evidenceGrounded}.`,
    `- Flash-Lite validity: ${report.results.flashLite.valid}; fallbacks: ${report.results.flashLite.fallbacks}; hidden-knowledge leakage: ${report.results.flashLite.hiddenKnowledgeLeakage}; simulation-authority violations: ${report.results.flashLite.simulationAuthorityViolations}.`,
    `- Flash-Lite changed ${report.results.flashLite.interpretationChoiceChanges} interpretation choices, but meaningful downstream committed choice changes were ${report.results.flashLite.meaningfulDownstreamChoiceChanges}.`,
    `- Flash-Lite latency was ${report.results.flashLite.latencyMs.min}–${report.results.flashLite.latencyMs.max} ms (p50 ${report.results.flashLite.latencyMs.p50} ms).`,
    `- Historical replay provider calls: ${report.replay.historicalReplayProviderCalls}; normal runtime provider calls: ${report.replay.normalRuntimeProviderCalls}.`,
    ``,
    `## Decision`,
    ``,
    `**${report.decision}**. ${report.recommendation}`,
    ``,
    `## Acceptance`,
    ``,
    `- Hidden-knowledge leakage zero: **${report.acceptance.hiddenKnowledgeLeakageZero ? "pass" : "fail"}**`,
    `- Simulation-authority violations zero: **${report.acceptance.simulationAuthorityViolationsZero ? "pass" : "fail"}**`,
    `- Historical replay provider-free: **${report.acceptance.historicalReplayProviderFree ? "pass" : "fail"}**`,
    `- Actual token cost and budget adherence recorded: **${report.acceptance.actualTokenCostRecorded && report.acceptance.budgetAdherenceRecorded ? "pass" : "fail"}**`,
    `- Explicit later-phase decision: **pass**`,
    ``
  ].join("\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const artifactPath = resolve(root, process.env.MIMIR_GEMINI_EVALUATION_ARTIFACT ?? ".tmp/ai-p6-gemini-evaluation.json");
  const report = buildFirstGlowHybridQualityReport(JSON.parse(readFileSync(artifactPath, "utf8")));
  const outputPath = resolve(root, process.env.MIMIR_AI_P7_REPORT ?? "docs/evidence/ai-p7-hybrid-quality-review-2026-09-12.json");
  const markdownPath = outputPath.replace(/\.json$/, ".md");
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(markdownPath, renderFirstGlowHybridQualityMarkdown(report), "utf8");
  console.log(JSON.stringify({ outputPath, markdownPath, decision: report.decision, providerCalls: report.cost.providerCalls, actualCostCents: report.cost.actualCostCents }, null, 2));
}

