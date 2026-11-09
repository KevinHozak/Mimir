import { mkdirSync, writeFileSync, readFileSync, openSync, closeSync, fsyncSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { createWorldFromBundle, advanceWorld } from "@mimir/engine";
import { canonicalize } from "@mimir/world-data";
import { FirstGlowServerAIRuntime } from "../packages/server/dist/first-glow-ai-runtime.js";
import { createStudyProvider, verifyStudyManifest } from "./model-study-runner.mjs";
import { createStudyWorld } from "./model-study-world.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const hash = state => createHash("sha256").update(JSON.stringify(canonicalize(state))).digest("hex");

export async function executeStudy({ directory, mode = "synthetic", approval, accessToken }) {
  const { manifest, hash: protocolHash } = verifyStudyManifest({ fixturesOnly: mode === "synthetic" });
  if (manifest.protocolRevision !== 4 || manifest.admissionPolicy !== "event-rc-v1") throw new Error("study v4 policy manifest required");
  const bundle = JSON.parse(readFileSync(resolve(root, `assets/world/generated/${manifest.bundleId}/world.json`)));
  const provider = createStudyProvider({ directory, mode, approval, accessToken });
  const report = { protocolHash, mode, status: "incomplete", providerBenefit: "unmeasured", humanReview: "unmeasured", runs: [] };
  mkdirSync(directory, { recursive: true });
  try {
    for (const plan of manifest.seeds) {
      for (const arm of ["rules", "model"]) {
        let state = createStudyWorld(bundle, plan.seed);
        if (hash(state) !== plan.checkpoints[0].hash) throw new Error("opening mismatch");
        // Both arms use the same evaluator/staging path. Only provider eligibility differs.
        const runtime = new FirstGlowServerAIRuntime({ requested: true, enabled: true, runtimeMode: arm === "model" ? "bounded-internal-pilot" : "rules-only", rollout: "internal", providerId: provider.providerId, model: "gemini-3.5-flash-lite", hardCapCents: 100, reason: "study", provider: { providerId: provider.providerId, interpret: context => {
          return provider.interpretForSeed(plan.seed, context);
        } } }, { interpretationTimeoutMs: 10000, rcAdmission: "event-rc-v1" });
        const checkpoints = [];
        const run = { seed: plan.seed, arm, status: "incomplete", lastPulse: 0, checkpoints, rejectedTransitions: 0 };
        report.runs.push(run);
        const journal = openSync(resolve(directory, `${plan.seed}-${arm}-outcomes.jsonl`), "wx");
        try { for (let pulse = 0; pulse <= 80; pulse++) {
          if ([0, 16, 40, 80].includes(pulse)) {
            const checkpointHash = hash(state);
            writeFileSync(resolve(directory, `${plan.seed}-${arm}-${pulse}.json`), JSON.stringify(state), { flag: "wx" });
            checkpoints.push({ pulse, hash: checkpointHash });
          }
          if (pulse === 80) break;
          const previousIds = new Set(state.firstGlowState.events.map(event => event.id));
          const advanced = advanceWorld(state, { eventAdmissionPolicy: "event-rc-v1" });
          const evaluated = await runtime.evaluate(advanced.state.firstGlowState, advanced.state.firstGlowState.events.filter(event => !previousIds.has(event.id)));
          state = evaluated.interpretations.length ? { ...advanced.state, firstGlowState: evaluated.state } : advanced.state;
          const admissions = state.firstGlowState.reflectionCapacity.eventAdmission.records.filter(item => item.pulse === state.pulse);
          const rcSuppressions = admissions.filter(item => !item.created);
          if (admissions.some(item => item.created) && ![0, 16, 40, 80].includes(state.pulse)) {
            writeFileSync(resolve(directory, `${plan.seed}-${arm}-${state.pulse}.json`), JSON.stringify(state), { flag: "wx" });
            checkpoints.push({ pulse: state.pulse, hash: hash(state) });
          }
          writeFileSync(journal, JSON.stringify({ pulse: state.pulse, events: advanced.events, interpretations: evaluated.interpretations, transitions: evaluated.transitions, admissions, rcSuppressions }) + "\n");
          fsyncSync(journal);
          run.lastPulse = state.pulse;
          run.rejectedTransitions += evaluated.transitions.filter(item => !item.accepted).length;
          if (provider.snapshot().stopped) throw new Error("study stopped");
        }
        run.status = "complete";
        run.admissions = state.firstGlowState.reflectionCapacity.eventAdmission.records;
        if (!run.admissions.some(item => item.created && item.sparkId === plan.focalSpark)) throw new Error("insufficient natural focal-Spark coverage; defer study");
        } finally {
          closeSync(journal);
          writeFileSync(resolve(directory, `${plan.seed}-${arm}-last-state.json`), JSON.stringify(state), { flag: "wx" });
        }
      }
    }
    report.status = "complete";
    return report;
  } finally {
    await provider.close();
    report.accounting = provider.snapshot();
    writeFileSync(resolve(directory, "report.json"), JSON.stringify(report, null, 2), { flag: "wx" });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Live execution is API-only pending a separately reviewed S004 approval packet.
  if (process.argv.length !== 3) throw new Error("usage: node scripts/model-study-execute.mjs <new-isolated-directory> (synthetic only)");
  const report = await executeStudy({ directory: resolve(process.argv[2]) });
  console.log(JSON.stringify({ status: report.status, mode: report.mode, runs: report.runs.length, attempts: report.accounting.attempts.length, providerBenefit: report.providerBenefit }));
}
