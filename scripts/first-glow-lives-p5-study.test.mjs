import { readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStudy } from "./first-glow-lives-p5-study.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const temp = join(root, ".tmp", "lives-p5-study-test.json");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const partial = await runStudy({ outputPath: temp, failureAfterRun: 2 });
assert(partial.status === "incomplete" && partial.runs.length === 2, "incomplete study must return a resume token");
const report = await runStudy({ outputPath: temp, resume: partial.resumeToken });
assert(report.runs.length === 6 && report.integrity.allRunsComplete, "resume must complete every planned run");
assert(report.integrity.allReplayProviderFree && report.integrity.allReplayBudgetFree && report.integrity.allKnowledgeBounded && report.integrity.allAccountingComplete, "replay, knowledge, or accounting integrity failed");
assert(report.integrity.allMatchedInputs && report.integrity.noViewingAdvantage, "matched watched/unwatched controls failed");
assert(report.review.independentHumanReview === "pending" && report.decision === "defer", "offline fixture must not claim benefit");
assert(report.manifests.every(item => item.sanitizedOutputs === temp && item.replayInputs.includes("#runs/")), "run manifest links are incomplete");
assert(JSON.parse(readFileSync(temp, "utf8")).runs.length === 6, "written report is incomplete");
rmSync(temp, { force: true });
console.log("Lives-P5 study harness verified: resume, integrity, replay, accounting, and benefit-gate deferral pass.");
