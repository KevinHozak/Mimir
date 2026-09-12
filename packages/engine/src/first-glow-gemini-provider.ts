import { canonicalize } from "@mimir/world-data";
import type { FirstGlowInterpretationContext, FirstGlowInterpretationProvider } from "./first-glow-interpretations.js";

export const FIRST_GLOW_GEMINI_MODEL = "gemini-2.5-flash-lite" as const;
const INPUT_CENTS_PER_MILLION = 10;
const OUTPUT_CENTS_PER_MILLION = 40;

export interface FirstGlowGeminiEvaluationConfig { apiKey?: string; authorization?: string; endpoint?: string; projectId: string; accountId: string; hardCapCents: number; killSwitch: "enabled"; model?: typeof FIRST_GLOW_GEMINI_MODEL; maxOutputTokens?: number; fetchImpl?: typeof fetch; }
export interface FirstGlowGeminiUsageRecord { requestId: string; model: string; sku: string; projectId: string; accountId: string; inputTokens: number; outputTokens: number; latencyMs: number; costCents: number; cumulativeCostCents: number; response: unknown; outcome: "recorded" | "fallback"; error?: string; }
export class FirstGlowGeminiEvaluationStopped extends Error { constructor(message: string) { super(message); this.name = "FirstGlowGeminiEvaluationStopped"; } }
const tokenCostCents = (input: number, output: number) => (input * INPUT_CENTS_PER_MILLION + output * OUTPUT_CENTS_PER_MILLION) / 1_000_000;
function boundedContext(context: FirstGlowInterpretationContext): unknown { return canonicalize({ schemaVersion: context.schemaVersion, personalityProfileVersion: context.personalityProfileVersion, encounterId: context.encounterId, tick: context.tick, event: context.event, dilemmaId: context.dilemmaId, supportedAlternatives: context.supportedAlternatives, actorSparkId: context.actorSparkId, targetSparkId: context.targetSparkId, personalityProfile: context.personalityProfile, witnessedEvidenceEventIds: context.witnessedEvidenceEventIds, communicatedEvidenceEventIds: context.communicatedEvidenceEventIds, uncertainInferenceEvidenceEventIds: context.uncertainInferenceEvidenceEventIds }); }
function promptFor(context: FirstGlowInterpretationContext): string { return ["You are an evaluation-only bounded interpreter for Mimir's First Glow.", "Return JSON only with alternativeId, claim, summary, and evidenceEventIds.", "Choose exactly one supplied alternative. Use only witnessed evidence IDs.", "The claim must be exactly plausible-choice or ambiguous-social-reading.", "The summary must be 240 characters or fewer.", "Do not invent events, facts, knowledge, actions, resources, or relationships.", "The deterministic server remains authoritative; this is not a request to execute a choice.", JSON.stringify(boundedContext(context))].join("\n"); }
function responseText(value: unknown): string { const parts = (value as { candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }> })?.candidates?.[0]?.content?.parts; const text = parts?.find(part => typeof part.text === "string")?.text; if (typeof text !== "string") throw new Error("Gemini response did not contain text"); return text; }
function parseProposal(text: string): unknown { return JSON.parse(text.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "")); }

export function createFirstGlowGeminiFlashLiteProvider(config: FirstGlowGeminiEvaluationConfig): FirstGlowInterpretationProvider & { readonly telemetry: FirstGlowGeminiUsageRecord[] } {
  if (!config.apiKey?.trim() && !config.authorization?.trim()) throw new FirstGlowGeminiEvaluationStopped("Gemini evaluation requires an approved API key or OAuth authorization");
  if (!config.projectId.trim() || !config.accountId.trim()) throw new FirstGlowGeminiEvaluationStopped("Gemini evaluation requires an isolated project and account identifier");
  if (config.killSwitch !== "enabled") throw new FirstGlowGeminiEvaluationStopped("Gemini evaluation kill switch is not enabled");
  if (!Number.isInteger(config.hardCapCents) || config.hardCapCents <= 0) throw new FirstGlowGeminiEvaluationStopped("Gemini evaluation hard cap must be a positive integer number of cents");
  const model = config.model ?? FIRST_GLOW_GEMINI_MODEL;
  const maxOutputTokens = config.maxOutputTokens ?? 128;
  const fetchImpl = config.fetchImpl ?? fetch;
  let cumulativeCostCents = 0;
  const telemetry: FirstGlowGeminiUsageRecord[] = [];
  return { providerId: `google-gemini/${model}`, telemetry, interpret: async context => {
    if (config.killSwitch !== "enabled") throw new FirstGlowGeminiEvaluationStopped("Gemini evaluation kill switch was disabled");
    const requestId = `gemini-${context.encounterId}-${context.contextHash.slice(-12)}`;
    const prompt = promptFor(context);
    const estimatedInputTokens = Math.ceil(prompt.length / 4);
    if (cumulativeCostCents + tokenCostCents(estimatedInputTokens, maxOutputTokens) > config.hardCapCents) { telemetry.push({ requestId, model, sku: model, projectId: config.projectId, accountId: config.accountId, inputTokens: estimatedInputTokens, outputTokens: 0, latencyMs: 0, costCents: 0, cumulativeCostCents, response: null, outcome: "fallback", error: "hard-cap-before-request" }); throw new FirstGlowGeminiEvaluationStopped("Gemini evaluation hard cap reached before request"); }
    const started = Date.now();
    try {
      const endpoint = config.endpoint ?? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.apiKey!)}`;
      const result = await fetchImpl(endpoint, { method: "POST", headers: { "content-type": "application/json", ...(config.authorization ? { authorization: config.authorization } : {}) }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { alternativeId: { type: "STRING" }, claim: { type: "STRING", enum: ["plausible-choice", "ambiguous-social-reading"] }, summary: { type: "STRING", maxLength: 240 }, evidenceEventIds: { type: "ARRAY", items: { type: "STRING" } } }, required: ["alternativeId", "claim", "summary", "evidenceEventIds"] }, temperature: 0, maxOutputTokens } }) });
      const response = await result.json();
      if (!result.ok) throw new Error(`Gemini HTTP ${result.status}`);
      const usage = (response as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } }).usageMetadata ?? {};
      const inputTokens = Number.isInteger(usage.promptTokenCount) ? usage.promptTokenCount! : estimatedInputTokens;
      const outputTokens = Number.isInteger(usage.candidatesTokenCount) ? usage.candidatesTokenCount! : maxOutputTokens;
      const costCents = tokenCostCents(inputTokens, outputTokens); cumulativeCostCents += costCents;
      const proposal = parseProposal(responseText(response));
      telemetry.push({ requestId, model, sku: model, projectId: config.projectId, accountId: config.accountId, inputTokens, outputTokens, latencyMs: Date.now() - started, costCents, cumulativeCostCents, response: proposal, outcome: "recorded" });
      return proposal;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown provider error";
      telemetry.push({ requestId, model, sku: model, projectId: config.projectId, accountId: config.accountId, inputTokens: estimatedInputTokens, outputTokens: 0, latencyMs: Date.now() - started, costCents: 0, cumulativeCostCents, response: null, outcome: "fallback", error: message });
      throw error;
    }
  } };
}

export interface FirstGlowVertexGeminiEvaluationConfig { accessToken: string; projectId: string; accountId: string; location?: string; hardCapCents: number; killSwitch: "enabled"; model?: typeof FIRST_GLOW_GEMINI_MODEL; maxOutputTokens?: number; fetchImpl?: typeof fetch; }
export function createFirstGlowVertexGeminiFlashLiteProvider(config: FirstGlowVertexGeminiEvaluationConfig) {
  const location = config.location ?? "us-central1";
  return createFirstGlowGeminiFlashLiteProvider({ ...config, authorization: `Bearer ${config.accessToken}`, endpoint: `https://${location}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(config.model ?? FIRST_GLOW_GEMINI_MODEL)}:generateContent` });
}
