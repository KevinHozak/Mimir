import { canonicalize } from "@mimir/world-data";

export const STUDY_MODEL = "gemini-3.5-flash-lite";
export const STUDY_LOCATION = "us";
export const STUDY_HOST = "aiplatform.us.rep.googleapis.com";
export const SYNTHETIC_PRICES = Object.freeze({ inputTokenUpperBound: 16384, reasoningTokenUpperBound: 65536, billableOutputTokenUpperBound: 65664, inputMicrousdPerMillion: 330000, outputMicrousdPerMillion: 2750000, requestFeesMicrousd: 0 });

export function studyEndpoint(projectId) {
  if (typeof projectId !== "string" || !/^[a-z][a-z0-9-]{4,62}$/.test(projectId)) throw new Error("invalid study project");
  return `https://${STUDY_HOST}/v1/projects/${projectId}/locations/${STUDY_LOCATION}/publishers/google/models/${STUDY_MODEL}:generateContent`;
}

// All charged categories are reserved; these are approved maxima, never token estimates.
export function requestCostBound(prices) {
  for (const key of Object.keys(SYNTHETIC_PRICES)) {
    if (!Number.isSafeInteger(prices?.[key]) || prices[key] < 0) throw new Error("unknown pricing bound");
  }
  if (prices.inputTokenUpperBound < 16384 || prices.inputTokenUpperBound > 1048576 || prices.billableOutputTokenUpperBound < 128 || prices.reasoningTokenUpperBound > Number.MAX_SAFE_INTEGER - 128 || prices.billableOutputTokenUpperBound < prices.reasoningTokenUpperBound + 128) throw new Error("insufficient token bound");
  if (prices.inputMicrousdPerMillion < 330000 || prices.outputMicrousdPerMillion < 2750000) throw new Error("pricing below reference floor");
  const numerator = BigInt(prices.inputTokenUpperBound) * BigInt(prices.inputMicrousdPerMillion) + BigInt(prices.billableOutputTokenUpperBound) * BigInt(prices.outputMicrousdPerMillion);
  const bound = Number((numerator + 999999n) / 1000000n) + prices.requestFeesMicrousd;
  if (!Number.isSafeInteger(bound) || bound <= 0 || bound > 1000000) throw new Error("invalid request cost");
  return bound;
}

export function studyBudgetPlan(prices, priorAllocationMicrousd, overheadReserveMicrousd) {
  if (!Number.isSafeInteger(priorAllocationMicrousd) || priorAllocationMicrousd < 0 || priorAllocationMicrousd > 1000000) throw new Error("unknown prior allocation");
  if (!Number.isSafeInteger(overheadReserveMicrousd) || overheadReserveMicrousd < 100000 || overheadReserveMicrousd > 1000000) throw new Error("unknown overhead bound");
  const reserveMicrousd = requestCostBound(prices);
  const fundedAttempts = Math.max(0, Math.min(24, Math.floor((1000000 - priorAllocationMicrousd - overheadReserveMicrousd) / reserveMicrousd)));
  return { reserveMicrousd, fundedAttempts, overheadReserveMicrousd, priorAllocationMicrousd };
}

export function serializeStudyRequest(projectId, context) {
  const local = {};
  for (const key of ["schemaVersion", "personalityProfileVersion", "encounterId", "pulse", "event", "dilemmaId", "supportedAlternatives", "actorSparkId", "targetSparkId", "personalityProfile", "witnessedEvidenceEventIds", "communicatedEvidenceEventIds", "uncertainInferenceEvidenceEventIds", "reflectionMemory"]) local[key] = context[key];
  const prompt = ["You are an evaluation-only bounded interpreter for Mimir's First Glow.", "Return JSON only with alternativeId, claim, summary, and evidenceEventIds.", "Choose exactly one supplied alternative. Use only witnessed evidence IDs.", "The claim must be exactly plausible-choice or ambiguous-social-reading.", "The summary must be 240 characters or fewer.", "Do not invent events, facts, knowledge, actions, resources, or relationships.", "The deterministic server remains authoritative; this is not a request to execute a choice.", JSON.stringify(canonicalize(local))].join("\n");
  const body = JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { candidateCount: 1, maxOutputTokens: 128, thinkingConfig: { thinkingLevel: "MINIMAL" }, responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { alternativeId: { type: "STRING" }, claim: { type: "STRING", enum: ["plausible-choice", "ambiguous-social-reading"] }, summary: { type: "STRING", maxLength: 240 }, evidenceEventIds: { type: "ARRAY", items: { type: "STRING" } } }, required: ["alternativeId", "claim", "summary", "evidenceEventIds"] } } });
  if (Buffer.byteLength(body) > 16384) throw new Error("invalid input: wire size");
  return { endpoint: studyEndpoint(projectId), body };
}

export function validateStudyWire(endpoint, body, projectId) {
  if (endpoint !== studyEndpoint(projectId) || typeof body !== "string" || Buffer.byteLength(body) > 16384) throw new Error("study wire identity rejected");
  const payload = JSON.parse(body), config = payload.generationConfig;
  const keys = value => Object.keys(value ?? {}).sort().join(",");
  if (keys(payload) !== "contents,generationConfig" || !Array.isArray(payload.contents) || payload.contents.length !== 1 || keys(payload.contents[0]) !== "parts,role" || payload.contents[0].role !== "user" || !Array.isArray(payload.contents[0].parts) || payload.contents[0].parts.length !== 1 || keys(payload.contents[0].parts[0]) !== "text" || typeof payload.contents[0].parts[0].text !== "string") throw new Error("study payload rejected");
  if (keys(config) !== "candidateCount,maxOutputTokens,responseMimeType,responseSchema,thinkingConfig" || config.candidateCount !== 1 || config.maxOutputTokens !== 128 || config.responseMimeType !== "application/json" || keys(config.thinkingConfig) !== "thinkingLevel" || config.thinkingConfig.thinkingLevel !== "MINIMAL" || !config.responseSchema) throw new Error("study wire limits changed");
}

export function validateStudyUsage(response, prices) {
  if (response.modelVersion !== STUDY_MODEL) throw new Error("study model identity rejected");
  const usage = response.usageMetadata;
  const permitted = new Set(["promptTokenCount", "candidatesTokenCount", "thoughtsTokenCount", "totalTokenCount", "cachedContentTokenCount", "promptTokensDetails", "candidatesTokensDetails", "cacheTokensDetails", "trafficType"]);
  if (!usage || Object.keys(usage).some(key => !permitted.has(key))) throw new Error("unknown usage category");
  for (const key of ["promptTokenCount", "candidatesTokenCount", "thoughtsTokenCount", "totalTokenCount"]) {
    if (!Number.isSafeInteger(usage[key]) || usage[key] < 0) throw new Error("missing or invalid usage");
  }
  const { promptTokenCount: inputTokens, candidatesTokenCount: outputTokens, thoughtsTokenCount: reasoningTokens, totalTokenCount: totalTokens } = usage;
  const billableOutputTokens = outputTokens + reasoningTokens;
  if (!Number.isSafeInteger(billableOutputTokens) || inputTokens > prices.inputTokenUpperBound || outputTokens > 128 || reasoningTokens > prices.reasoningTokenUpperBound || billableOutputTokens > prices.billableOutputTokenUpperBound || !Number.isSafeInteger(inputTokens + billableOutputTokens) || totalTokens !== inputTokens + billableOutputTokens) throw new Error("excessive or inconsistent usage");
  if (usage.cachedContentTokenCount !== undefined && (!Number.isSafeInteger(usage.cachedContentTokenCount) || usage.cachedContentTokenCount < 0 || usage.cachedContentTokenCount > inputTokens)) throw new Error("invalid cache accounting");
  for (const [key, maximum] of [["promptTokensDetails", inputTokens], ["candidatesTokensDetails", outputTokens], ["cacheTokensDetails", usage.cachedContentTokenCount ?? 0]]) {
    if (usage[key] === undefined) continue;
    if (!Array.isArray(usage[key]) || usage[key].length !== 1 || usage[key].some(item => item.modality !== "TEXT" || !Number.isSafeInteger(item.tokenCount) || item.tokenCount !== maximum || Object.keys(item).some(k => !["modality", "tokenCount"].includes(k)))) throw new Error("unsupported modality accounting");
  }
  if (usage.trafficType !== undefined && usage.trafficType !== "ON_DEMAND") throw new Error("unexpected billing tier");
  return { inputTokens, outputTokens, reasoningTokens, billableOutputTokens, totalTokens, cachedInputTokens: usage.cachedContentTokenCount ?? 0, modelVersion: response.modelVersion };
}
