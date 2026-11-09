import { spawn } from "node:child_process";
import { resolve } from "node:path";
import type { FirstGlowInterpretationContext, FirstGlowInterpretationProvider } from "@mimir/engine";
import { canonicalize } from "@mimir/world-data";
import { SparkAIBudget } from "./spark-ai-budget.js";

export const SPARK_LIVE_MODEL = "gemini-3.5-flash-lite";
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
    const child = spawn(resolve(sdk, "platform/bundledpython/python.exe"), [resolve("scripts/spark-ai-broker.py")], { stdio: ["pipe", "pipe", "ignore"], windowsHide: true, env: { ...process.env, CLOUDSDK_CORE_DISABLE_PROMPTS: "1", CLOUDSDK_CORE_CHECK_GCE_METADATA: "false", CLOUDSDK_CORE_DISABLE_USAGE_REPORTING: "true" } });
    let text = "", failure = false;
    const timer = setTimeout(() => { failure = true; child.kill(); }, 9000);
    child.stdout.on("data", chunk => { text += chunk; if (Buffer.byteLength(text) > 65536) { failure = true; child.kill(); } });
    child.on("error", () => { failure = true; });
    child.stdin.on("error", () => {});
    child.on("close", code => { clearTimeout(timer); if (failure || code !== 0) reject(new Error("Spark provider worker stopped")); else { try { accept(JSON.parse(text)); } catch { reject(new Error("invalid Spark provider receipt")); } } });
    child.stdin.end(body);
  });
}

export function createSparkLiveProvider(path: string, broker = sparkBroker): FirstGlowInterpretationProvider & { telemetry: Array<Record<string, unknown>>; budgetStatus(): ReturnType<SparkAIBudget["snapshot"]>; stop(): void; close(): Promise<void> } {
  const budget = new SparkAIBudget(path), telemetry: Array<Record<string, unknown>> = [];
  let busy = false, failures = 0, closed = false;
  const pending = new Set<Promise<unknown>>();
  return {
    providerId: `google-gemini/${SPARK_LIVE_MODEL}`, telemetry, budgetStatus: () => budget.snapshot(), stop: () => budget.stop(),
    async close() { closed = true; await Promise.allSettled([...pending]); budget.close(); },
    async interpret(context) {
      if (closed || busy) throw new Error("Spark AI unavailable or busy");
      const cached = budget.cached(context.contextHash); if (cached) return cached;
      const body = sparkWire(context), id = budget.reserve(context.contextHash);
      busy = true;
      const started = Date.now();
      let task: Promise<any> | undefined;
      try {
        task = broker(body); pending.add(task);
        const receipt = await task;
        if (!receipt.ok) throw new Error(`Spark provider ${receipt.stage ?? "request"} failed (${receipt.httpStatus ?? "local"})`);
        const result = receipt.response, usage = result?.usageMetadata;
        const input = usage?.promptTokenCount, output = usage?.candidatesTokenCount, thoughts = usage?.thoughtsTokenCount ?? 0;
        if (!Number.isSafeInteger(receipt.countedInputTokens) || receipt.countedInputTokens > 16384 || receipt.countedInputTokens < 0 || !Number.isSafeInteger(input) || input < 0 || input > 16384 || !Number.isSafeInteger(output) || output < 0 || output > 2048 || !Number.isSafeInteger(thoughts) || thoughts < 0 || thoughts > 65536 || !Number.isSafeInteger(usage.totalTokenCount) || usage.totalTokenCount !== input + output + thoughts || result.modelVersion !== SPARK_LIVE_MODEL || result.candidates?.length !== 1 || result.candidates[0].finishReason !== "STOP") throw new Error("Spark AI usage or completion rejected");
        const parts = result.candidates[0].content?.parts;
        const text = parts?.filter((p: any) => typeof p.text === "string" && p.thought !== true).map((p: any) => p.text).join("");
        const proposal = JSON.parse(text);
        if (Object.keys(proposal).sort().join(",") !== "alternativeId,claim,evidenceEventIds,summary" || !context.supportedAlternatives.includes(proposal.alternativeId) || !["plausible-choice", "ambiguous-social-reading"].includes(proposal.claim) || typeof proposal.summary !== "string" || !proposal.summary.trim() || proposal.summary.length > 240 || !Array.isArray(proposal.evidenceEventIds) || !proposal.evidenceEventIds.length || !proposal.evidenceEventIds.every((e: unknown) => typeof e === "string" && context.witnessedEvidenceEventIds.includes(e) && context.event.evidenceEventIds?.includes(e))) throw new Error("Spark AI proposal rejected");
        const estimatedTokenCostMicrousd = Math.ceil((input * 330000 + (output + thoughts) * 2750000) / 1000000);
        budget.complete(id, proposal, { countedInputTokens: receipt.countedInputTokens, inputTokens: input, outputTokens: output, reasoningTokens: thoughts, totalTokens: usage.totalTokenCount, estimatedTokenCostMicrousd });
        failures = 0; telemetry.push({ outcome: "recorded", requestId: id, inputTokens: input, outputTokens: output, reasoningTokens: thoughts, latencyMs: Date.now() - started, costCents: estimatedTokenCostMicrousd / 10000, cumulativeCostCents: budget.snapshot().estimatedTokenCostMicrousd / 10000 });
        return proposal;
      } catch (e) {
        budget.uncertain(id, "provider-or-validation-failure"); if (++failures >= 2) budget.stop();
        telemetry.push({ outcome: "fallback", requestId: id, latencyMs: Date.now() - started, error: e instanceof Error ? e.message : "Spark request failed" });
        throw new Error("Spark AI failed; reservation retained; rules fallback");
      } finally { if (task) pending.delete(task); busy = false; }
    }
  };
}
