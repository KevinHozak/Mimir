import { spawn } from "node:child_process";
import { resolve } from "node:path";
import type { FirstGlowGoalContext, FirstGlowInterpretationContext, FirstGlowInterpretationProvider } from "@mimir/engine";
import { FirstGlowGoalAdmissionError, validateFirstGlowGoalContextProjection } from "@mimir/engine";
import { canonicalize, sha256 } from "@mimir/world-data";
import { SparkAIBudget } from "./spark-ai-budget.js";

export const SPARK_LIVE_MODEL = "gemini-3.5-flash-lite";
export function sparkGoalWire(context: FirstGlowGoalContext): string {
  validateFirstGlowGoalContextProjection(context);
  const local = Object.fromEntries(["version", "sparkId", "pulse", "candidates", "charge", "chargeDeficit", "readiness", "memory", "evidenceEventIds", "personality", "relationships", "projection", "opportunities", "frontierExploration"].map(key => [key, context[key as keyof FirstGlowGoalContext]]));
  const prompt = "Choose one feasible longer-term goal for this fictional Spark using its needs, values and local memories. explore-mark leaves a light mark; explore-shape examines a pattern shard; explore-meet-mark seeks a real companion before marking. follow-trace explores one locally visible unfamiliar trace cell without knowing what lies beyond. explore-contribute travels to a locally discovered trace weave and pays charge toward a shared improvement; another Spark must contribute to complete it. Supplied opportunities bind each candidate to a noticed local site and route cost. Goals may fail. Do not invent encounters, actions, facts or knowledge. Return JSON only: kind (one candidate), summary (at most 240 characters), evidenceEventIds (1 to 8 IDs from this Spark's supplied evidence). The engine executes and charges all actions.\n" + JSON.stringify(canonicalize(local));
  const body = JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { candidateCount: 1, maxOutputTokens: 2048, thinkingConfig: { thinkingLevel: "MINIMAL" }, responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { kind: { type: "STRING", enum: context.candidates }, summary: { type: "STRING", maxLength: 240 }, evidenceEventIds: { type: "ARRAY", items: { type: "STRING" }, minItems: 1, maxItems: 8 } }, required: ["kind", "summary", "evidenceEventIds"] } } });
  if (Buffer.byteLength(body) > 16384) throw new FirstGlowGoalAdmissionError("goal-context-too-large");
  return body;
}
export function sparkWire(context: FirstGlowInterpretationContext): string {
  const local: Record<string, unknown> = {};
  for (const key of ["schemaVersion", "personalityProfileVersion", "encounterId", "pulse", "event", "dilemmaId", "supportedAlternatives", "actorSparkId", "targetSparkId", "personalityProfile", "witnessedEvidenceEventIds", "communicatedEvidenceEventIds", "uncertainInferenceEvidenceEventIds", "reflectionMemory"] as const) local[key] = context[key];
  const prompt = "Choose one supported alternative for this fictional Spark. Return JSON only: alternativeId, claim (plausible-choice or ambiguous-social-reading), summary (at most 240 characters), evidenceEventIds (only IDs witnessed by this Spark and cited by this event). Do not invent facts, actions or evidence. The server validates and commits the choice.\n" + JSON.stringify(canonicalize(local));
  const body = JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { candidateCount: 1, maxOutputTokens: 2048, thinkingConfig: { thinkingLevel: "MINIMAL" }, responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { alternativeId: { type: "STRING", enum: context.supportedAlternatives }, claim: { type: "STRING", enum: ["plausible-choice", "ambiguous-social-reading"] }, summary: { type: "STRING", maxLength: 240 }, evidenceEventIds: { type: "ARRAY", items: { type: "STRING" } } }, required: ["alternativeId", "claim", "summary", "evidenceEventIds"] } } });
  if (Buffer.byteLength(body) > 16384) throw new Error("Spark context exceeds wire limit");
  return body;
}

export function sparkBroker(body: string): Promise<any> {
  const sdk = resolve(process.env.LOCALAPPDATA ?? "", "Google/Cloud SDK/google-cloud-sdk");
  return new Promise((accept, reject) => {
    const child = spawn(process.env.AI_RUNTIME_MODE === "spark-online" ? process.execPath : resolve(sdk, "platform/bundledpython/python.exe"), [resolve(process.env.AI_RUNTIME_MODE === "spark-online" ? "scripts/spark-ai-cloud-broker.mjs" : "scripts/spark-ai-broker.py")], { stdio: ["pipe", "pipe", "ignore"], windowsHide: true, env: { ...process.env, CLOUDSDK_CORE_DISABLE_PROMPTS: "1", CLOUDSDK_CORE_CHECK_GCE_METADATA: "false", CLOUDSDK_CORE_DISABLE_USAGE_REPORTING: "true" } });
    let text = "", failure = false;
    const timer = setTimeout(() => { failure = true; child.kill(); }, 9000);
    child.stdout.on("data", chunk => { text += chunk; if (Buffer.byteLength(text) > 65536) { failure = true; child.kill(); } });
    child.on("error", () => { failure = true; });
    child.stdin.on("error", () => {});
    child.on("close", code => { clearTimeout(timer); if (failure || code !== 0) reject(new Error("Spark provider worker stopped")); else { try { accept(JSON.parse(text)); } catch { reject(new Error("invalid Spark provider receipt")); } } });
    child.stdin.end(body);
  });
}

const goalIdentity = (context: FirstGlowGoalContext, timelineId: string) => `sha256-${sha256(JSON.stringify(canonicalize({ purpose: "spark-goal-provider-v1", timelineId, contextHash: context.contextHash })))}`;

export function createSparkLiveProvider(path: string, broker = sparkBroker, options: { timeoutMs?: number; allocation?: {allocationId:string;capMicrousd:number}; deadlineMs?:number } = {}): FirstGlowInterpretationProvider & { proposeGoal(context: FirstGlowGoalContext, timelineId: string): Promise<unknown>; goalReceipt(context: FirstGlowGoalContext, timelineId: string): ReturnType<SparkAIBudget["receipt"]>; telemetry: Array<Record<string, unknown>>; budgetStatus(): ReturnType<SparkAIBudget["snapshot"]>; markWorldBound(): void; stop(): void; close(): Promise<void> } {
  const timeoutMs = options.timeoutMs ?? 9500;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 9500) throw new Error("invalid Spark provider timeout");
  const budget = new SparkAIBudget(path, options.allocation), telemetry: Array<Record<string, unknown>> = [];
  let busy = false, closed = false;
  const pending = new Set<Promise<unknown>>();
  const execute = async (contextHash: string, body: string, validate: (proposal: any) => boolean, purpose: string): Promise<unknown> => {
      if (options.deadlineMs !== undefined && Date.now() >= options.deadlineMs) { budget.stop(); throw new Error("Online allocation lease expired"); }
      if (closed || busy) throw new Error("Spark AI unavailable or busy");
      if (budget.snapshot().consecutiveFailures >= 2) budget.stop();
      const cached = budget.cached(contextHash); if (cached) { if (!validate(cached)) throw new Error("cached Spark proposal rejected"); return cached; }
      const id = budget.reserve(contextHash);
      busy = true;
      const started = Date.now();
      let task: Promise<any> | undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let timedOut = false;
      let knownUsage: any;
      try {
        // The real broker kills its worker at nine seconds. This outer bound also
        // fails closed for a broken/injected broker; a late result cannot settle a receipt.
        task = Promise.race([Promise.resolve().then(() => broker(body)), new Promise<never>((_, reject) => { timer = setTimeout(() => { timedOut = true; reject(new Error("provider timeout")); }, timeoutMs); })]); pending.add(task);
        const receipt = await task;
        if (!receipt.ok) throw new Error(`Spark provider ${receipt.stage ?? "request"} failed (${receipt.httpStatus ?? "local"})`);
        const result = receipt.response, usage = result?.usageMetadata;
        const input = usage?.promptTokenCount, output = usage?.candidatesTokenCount, thoughts = usage?.thoughtsTokenCount ?? 0;
        if (!Number.isSafeInteger(receipt.countedInputTokens) || receipt.countedInputTokens > 16384 || receipt.countedInputTokens < 0 || !Number.isSafeInteger(input) || input < 0 || input > 16384 || !Number.isSafeInteger(output) || output < 0 || output > 2048 || !Number.isSafeInteger(thoughts) || thoughts < 0 || thoughts > 65536 || !Number.isSafeInteger(usage.totalTokenCount) || usage.totalTokenCount !== input + output + thoughts || result.modelVersion !== SPARK_LIVE_MODEL) throw new Error("Spark AI usage rejected");
        const estimatedTokenCostMicrousd = Math.ceil((input * 330000 + (output + thoughts) * 2750000) / 1000000);
        knownUsage = { countedInputTokens: receipt.countedInputTokens, inputTokens: input, outputTokens: output, reasoningTokens: thoughts, totalTokens: usage.totalTokenCount, estimatedTokenCostMicrousd };
        if (result.candidates?.length !== 1 || result.candidates[0].finishReason !== "STOP") throw new Error("Spark AI completion rejected");
        const parts = result.candidates[0].content?.parts;
        const text = parts?.filter((p: any) => typeof p.text === "string" && p.thought !== true).map((p: any) => p.text).join("");
        const proposal = JSON.parse(text);
        if (!validate(proposal)) throw new Error("Spark AI proposal rejected");
        budget.complete(id, proposal, knownUsage);
        telemetry.push({ purpose, outcome: "recorded", requestId: id, inputTokens: input, outputTokens: output, reasoningTokens: thoughts, latencyMs: Date.now() - started, costCents: estimatedTokenCostMicrousd / 10000, cumulativeCostCents: budget.snapshot().estimatedTokenCostMicrousd / 10000 });
        return proposal;
      } catch (e) {
        if (knownUsage && !timedOut) budget.rejected(id, knownUsage, "proposal-validation-failure");
        else budget.uncertain(id, timedOut ? "provider-timeout" : "provider-or-validation-failure"); if (timedOut || budget.snapshot().consecutiveFailures >= 2) budget.stop();
        telemetry.push({ purpose, outcome: "fallback", requestId: id, latencyMs: Date.now() - started, error: "provider-or-validation-failure" });
        throw new Error("Spark AI failed; spending accounted; rules fallback");
      } finally { clearTimeout(timer); if (task) pending.delete(task); busy = false; }
  };
  return {
    providerId: `google-gemini/${SPARK_LIVE_MODEL}`, telemetry, budgetStatus: () => budget.snapshot(), markWorldBound: () => budget.markWorldBound(), stop: () => budget.stop(),
    async close() { closed = true; await Promise.allSettled([...pending]); budget.close(); },
    goalReceipt: (context, timelineId) => budget.receipt(goalIdentity(context, timelineId)),
    async interpret(context) {
      return execute(context.contextHash, sparkWire(context), p => p && Object.keys(p).sort().join(",") === "alternativeId,claim,evidenceEventIds,summary" && context.supportedAlternatives.includes(p.alternativeId) && ["plausible-choice", "ambiguous-social-reading"].includes(p.claim) && typeof p.summary === "string" && Boolean(p.summary.trim()) && p.summary.length <= 240 && Array.isArray(p.evidenceEventIds) && p.evidenceEventIds.length > 0 && p.evidenceEventIds.every((e: unknown) => typeof e === "string" && context.witnessedEvidenceEventIds.includes(e) && context.event.evidenceEventIds?.includes(e)), "interpretation");
    },
    async proposeGoal(context, timelineId) {
      if (!timelineId) return Promise.reject(new Error("goal timeline identity required"));
      const identity = goalIdentity(context, timelineId);
      let wire: string;
      try { wire = sparkGoalWire(context); }
      catch (error) {
        if (error instanceof FirstGlowGoalAdmissionError) telemetry.push({ purpose: "goal", outcome: "rejected-locally", reason: error.code, reservedMicrousd: 0 });
        throw error;
      }
      return execute(identity, wire, p => p && Object.keys(p).sort().join(",") === "evidenceEventIds,kind,summary" && context.candidates.includes(p.kind) && typeof p.summary === "string" && Boolean(p.summary.trim()) && p.summary.length <= 240 && Array.isArray(p.evidenceEventIds) && p.evidenceEventIds.length > 0 && p.evidenceEventIds.length <= 8 && p.evidenceEventIds.every((e: unknown) => typeof e === "string" && context.evidenceEventIds.includes(e)), "goal");
    }
  };
}
