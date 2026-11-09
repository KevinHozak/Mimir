import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { STUDY_MODEL, STUDY_LOCATION, SYNTHETIC_PRICES, studyBudgetPlan, serializeStudyRequest, validateStudyWire, validateStudyUsage } from "./model-study-v4.mjs";
export { requestCostBound } from "./model-study-v4.mjs";
import { openStudyGuard } from "./model-study-guard.mjs";
import { studyTransport } from "./model-study-transport.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const digest = value => createHash("sha256").update(value).digest("hex");
export function verifyStudyManifest({ fixturesOnly = false } = {}) {
  const bytes = readFileSync(resolve(root, "docs/model-study-protocol.json"));
  const manifest = JSON.parse(bytes);
  if (manifest.protocolRevision !== 4 || manifest.model !== STUDY_MODEL || manifest.location !== STUDY_LOCATION || manifest.liveApproved !== false) throw new Error("study v4 manifest required");
  if (fixturesOnly) {
    if (digest(readFileSync(resolve(root, "docs/evidence/model-study-protocol-v4-2026-11-08.json"))) !== digest(bytes)) throw new Error("historical v4 manifest changed");
    return { manifest, hash: digest(bytes) };
  }
  for (const [path, expected] of Object.entries(manifest.sourceFiles)) {
    if (digest(readFileSync(resolve(root, path))) !== expected) throw new Error("protocol source drift");
  }
  return { manifest, hash: digest(bytes) };
}

function admitLive(approval, protocolHash, directory) {
  const now = Date.now();
  if (approval?.approvedFor !== "S004" || approval.protocolHash !== protocolHash || approval.runDirectory !== resolve(directory)) throw new Error("live study not approved");
  if (!Number.isFinite(approval.validFrom) || !Number.isFinite(approval.validUntil) || now < approval.validFrom || now >= approval.validUntil || approval.validUntil - approval.validFrom > 1800000) throw new Error("approval window closed");
  for (const key of ["ownerApproved", "s001Accepted", "privacyTermsVerified", "pricingVerified", "retentionApproved", "accountVerified", "tokenBoundsVerified", "feeBoundsVerified", "reviewerPresentationApproved"]) {
    if (approval[key] !== true) throw new Error("live admission incomplete");
  }
  if (approval.model !== STUDY_MODEL || !/^[a-z][a-z0-9-]{4,62}$/.test(approval.projectId ?? "") || approval.location !== STUDY_LOCATION || !approval.accountId) throw new Error("provider identity not admitted");
  const plan = studyBudgetPlan(approval.prices, approval.priorAllocationMicrousd, approval.overheadReserveMicrousd);
  if (plan.fundedAttempts < 3) throw new Error("minimum three-seed sample not funded");
  for (const key of ["tokenBoundEvidenceHash", "feeBoundEvidenceHash", "accountEvidenceHash"]) if (!/^[a-f0-9]{64}$/.test(approval[key] ?? "")) throw new Error("missing admission evidence");
}

export function createStudyProvider({ directory, mode = "synthetic", approval, accessToken, synthetic = {}, timeoutMs = 10000, windowMs = 1800000 }) {
  const inside = relative(resolve(root, ".tmp"), resolve(directory));
  if (!inside || isAbsolute(inside) || inside === ".." || inside.startsWith("../") || inside.startsWith("..\\")) throw new Error("study directory must be isolated beneath .tmp");
  approval = approval ? structuredClone(approval) : undefined;
  const { hash: protocolHash } = verifyStudyManifest({ fixturesOnly: true });
  if (!["synthetic", "live"].includes(mode)) throw new Error("invalid study mode");
  if (mode === "live") {
    admitLive(approval, protocolHash, directory);
    verifyStudyManifest();
    if (!accessToken?.trim()) throw new Error("runtime credential missing");
    if (timeoutMs !== 10000 || windowMs !== 1800000) throw new Error("live limits cannot change");
  }
  const prices = mode === "live" ? approval.prices : { ...SYNTHETIC_PRICES, ...synthetic.prices };
  const plan = studyBudgetPlan(prices, mode === "live" ? approval.priorAllocationMicrousd : synthetic.priorAllocationMicrousd ?? 0, mode === "live" ? approval.overheadReserveMicrousd : 100000);
  const { reserveMicrousd } = plan;
  const guard = openStudyGuard(directory, protocolHash, { timeoutMs, windowMs, initialCostMicrousd: plan.priorAllocationMicrousd, overheadReserveMicrousd: plan.overheadReserveMicrousd, fundedAttempts: plan.fundedAttempts, fixedReserveMicrousd: reserveMicrousd, minimumSeeds: [2, 4, 8] });
  const pending = new Set();
  let busy = false;
  const projectId = mode === "live" ? approval.projectId : "synthetic-study";
  const interpret = async (seed, currentContext) => {
      const { endpoint, body } = serializeStudyRequest(projectId, currentContext);
      validateStudyWire(endpoint, body, projectId);
      if (mode === "synthetic") synthetic.onSerialized?.({ endpoint, body });
      return guard.attempt({ seed, input: body, reserveMicrousd, contextHash: currentContext.contextHash, eventId: currentContext.event.id, sparkId: currentContext.actorSparkId, pulse: currentContext.pulse }, async ({ signal, recordUsage }) => {
        if (mode === "live") { verifyStudyManifest(); admitLive(approval, protocolHash, directory); }
        const response = synthetic.response ?? JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ alternativeId: currentContext.supportedAlternatives[0], claim: "plausible-choice", summary: "Synthetic supported choice.", evidenceEventIds: currentContext.witnessedEvidenceEventIds.slice(0, 1) }) }] } }], modelVersion: STUDY_MODEL, usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 30, thoughtsTokenCount: 20, totalTokenCount: 150 } });
        const requestTimeout = mode === "live" ? Math.min(timeoutMs, approval.validUntil - Date.now()) : timeoutMs;
        const task = studyTransport({ mode, admitted: mode === "live", endpoint, projectId, body, authorization: mode === "live" ? `Bearer ${accessToken}` : "synthetic-credential", response, behavior: synthetic.behavior }, { signal, timeoutMs: requestTimeout, onWorker: synthetic.onWorker, onWorkerReady: synthetic.onWorkerReady });
        pending.add(task);
        let result;
        try { result = await task; } finally { pending.delete(task); }
        if (Buffer.byteLength(result.body) > 65536) throw new Error("response too large");
        const parsed = JSON.parse(result.body);
        let receipt;
        try { receipt = validateStudyUsage(parsed, prices); }
        catch { guard.stop(); throw new Error("study accounting or identity rejected"); }
        recordUsage(receipt);
        if (!Array.isArray(parsed.candidates) || parsed.candidates.length !== 1) { guard.stop(); throw new Error("candidate accounting rejected"); }
        if (parsed.candidates[0].finishReason !== undefined && parsed.candidates[0].finishReason !== "STOP") throw new Error("invalid candidate completion");
        const parts = parsed.candidates[0].content?.parts;
        if (!Array.isArray(parts) || parts.length !== 1 || typeof parts[0].text !== "string" || Object.keys(parts[0]).some(key => key !== "text")) { guard.stop(); throw new Error("unexpected response material"); }
        const proposal = JSON.parse(parsed.candidates?.[0]?.content?.parts?.[0]?.text);
        if (Array.isArray(proposal.evidenceEventIds) && proposal.evidenceEventIds.some(id => typeof id === "string" && (!currentContext.witnessedEvidenceEventIds.includes(id) || !currentContext.event.evidenceEventIds.includes(id)))) {
          guard.stop(); // A knowledge-boundary rejection stops admission immediately.
          throw new Error("provider evidence boundary rejected");
        }
        if (Object.keys(proposal).sort().join(",") !== "alternativeId,claim,evidenceEventIds,summary" || !currentContext.supportedAlternatives.includes(proposal.alternativeId) || !["plausible-choice", "ambiguous-social-reading"].includes(proposal.claim) || typeof proposal.summary !== "string" || !proposal.summary.trim() || proposal.summary.length > 240 || !Array.isArray(proposal.evidenceEventIds) || proposal.evidenceEventIds.length === 0 || !proposal.evidenceEventIds.every(id => typeof id === "string" && currentContext.witnessedEvidenceEventIds.includes(id) && currentContext.event.evidenceEventIds.includes(id))) throw new Error("invalid provider proposal");
        return proposal;
      });
  };
  return {
    providerId: `google-gemini/${STUDY_MODEL}`,
    snapshot: guard.snapshot,
    stop: guard.stop,
    async close() { guard.close(); await Promise.allSettled([...pending]); },
    async interpretForSeed(nextSeed, nextContext) {
      if (busy) throw new Error("concurrent study call");
      busy = true;
      try { return await interpret(nextSeed, nextContext); }
      finally { busy = false; }
    }
  };
}
