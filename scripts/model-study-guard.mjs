import { mkdirSync, openSync, closeSync, readFileSync, writeFileSync, fsyncSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

export function openStudyGuard(directory, protocolHash, { timeoutMs = 10_000, windowMs = 1_800_000, initialCostMicrousd = 0, overheadReserveMicrousd = 100000, fundedAttempts = 24, fixedReserveMicrousd, minimumSeeds = [] } = {}) {
  if (!/^[a-f0-9]{64}$/.test(protocolHash)) throw new Error("invalid protocol identity");
  if (!(timeoutMs > 0 && timeoutMs <= 10_000 && windowMs > 0 && windowMs <= 1_800_000)) throw new Error("invalid deadlines");
  if (!Number.isSafeInteger(initialCostMicrousd) || initialCostMicrousd < 0 || initialCostMicrousd > 1_000_000) throw new Error("invalid prior allocation");
  if (!Number.isSafeInteger(overheadReserveMicrousd) || overheadReserveMicrousd < 100000 || overheadReserveMicrousd > 1000000 || !Number.isInteger(fundedAttempts) || fundedAttempts < 0 || fundedAttempts > 24) throw new Error("invalid funded allowance");
  if (!Array.isArray(minimumSeeds) || new Set(minimumSeeds).size !== minimumSeeds.length || minimumSeeds.some(seed => ![2, 4, 8].includes(seed)) || minimumSeeds.length && (!Number.isSafeInteger(fixedReserveMicrousd) || fixedReserveMicrousd <= 0)) throw new Error("invalid minimum sample reservation");
  mkdirSync(directory, { recursive: true });
  // Intentionally never remove this ownership marker automatically. Crash/reopen fails closed.
  const owner = openSync(join(directory, "owner.lock"), "wx");
  closeSync(owner);
  const ledger = join(directory, "ledger.json");
  let state;
  try { state = JSON.parse(readFileSync(ledger, "utf8")); }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
    state = { protocolHash, initialCostMicrousd, overheadReserveMicrousd, fundedAttempts, fixedReserveMicrousd, minimumSeeds, stopped: false, failures: 0, attempts: [] };
  }
  if (state.protocolHash !== protocolHash) throw new Error("protocol mismatch");
  if (state.attempts.length) throw new Error("existing attempts require explicit reconciliation");
  const persist = () => {
    const fd = openSync(ledger, "w");
    try { writeFileSync(fd, JSON.stringify(state)); fsyncSync(fd); } finally { closeSync(fd); }
  };
  persist();
  let active;
  const end = performance.now() + windowMs;
  const stop = () => { state.stopped = true; try { persist(); } finally { active?.abort(); } };
  const deadline = setTimeout(stop, windowMs);
  deadline.unref();
  return {
    snapshot: () => structuredClone(state),
    stop,
    close: () => { stop(); clearTimeout(deadline); },
    async attempt({ seed, input, reserveMicrousd, contextHash, eventId, sparkId, pulse }, transport) {
      if (performance.now() >= end) stop();
      if (state.stopped || active || state.failures >= 2) throw new Error("study stopped or busy");
      if (![2, 4, 8].includes(seed) || typeof input !== "string" || Buffer.byteLength(input) > 16_384) throw new Error("invalid input");
      if (!Number.isSafeInteger(reserveMicrousd) || reserveMicrousd <= 0) throw new Error("unknown cost bound");
      if (fixedReserveMicrousd !== undefined && reserveMicrousd !== fixedReserveMicrousd) throw new Error("reservation changed");
      if (contextHash !== undefined && (!/^sha256-[a-f0-9]{64}$/.test(contextHash) || typeof eventId !== "string" || eventId.length > 512 || typeof sparkId !== "string" || sparkId.length > 128 || !Number.isSafeInteger(pulse) || pulse < 0)) throw new Error("invalid request identity");
      if (state.attempts.length >= 24 || state.attempts.filter(item => item.seed === seed).length >= 8) throw new Error("attempt cap");
      const remainingSeeds = minimumSeeds.filter(other => other !== seed && !state.attempts.some(item => item.seed === other)).length;
      if (state.attempts.length + 1 + remainingSeeds > fundedAttempts || state.initialCostMicrousd + state.overheadReserveMicrousd + state.attempts.reduce((sum, item) => sum + item.reserveMicrousd, 0) + reserveMicrousd + remainingSeeds * (fixedReserveMicrousd ?? 0) > 1_000_000) throw new Error("budget cap or unfunded minimum sample");
      const item = { id: state.attempts.length + 1, seed, reserveMicrousd, contextHash, eventId, sparkId, pulse, inputHash: createHash("sha256").update(input).digest("hex"), outcome: "reserved" };
      state.attempts.push(item);
      persist(); // Durable reservation precedes any dispatch; never release an uncertain charge.
      const started = performance.now();
      const recordUsage = ({ inputTokens, outputTokens, reasoningTokens, billableOutputTokens, totalTokens, cachedInputTokens, modelVersion }) => {
        if ([inputTokens, outputTokens, reasoningTokens, billableOutputTokens, totalTokens, cachedInputTokens].some(value => !Number.isSafeInteger(value) || value < 0) || outputTokens > 128 || billableOutputTokens !== outputTokens + reasoningTokens || totalTokens !== inputTokens + billableOutputTokens || cachedInputTokens > inputTokens || modelVersion !== "gemini-3.5-flash-lite") { stop(); throw new Error("invalid usage receipt"); }
        Object.assign(item, { inputTokens, outputTokens, reasoningTokens, billableOutputTokens, totalTokens, cachedInputTokens, modelVersion });
        item.settledCostMicrousd = null; // Usage is not final attributable billing.
        persist();
      };
      active = new AbortController();
      const signal = active.signal;
      const timer = setTimeout(stop, timeoutMs);
      try {
        const aborted = new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("study cancelled")), { once: true }));
        const result = await Promise.race([Promise.resolve().then(() => {
          if (signal.aborted) throw new Error("study cancelled");
          return transport({ signal, maxOutputTokens: 128, recordUsage });
        }), aborted]);
        if (signal.aborted) throw new Error("study cancelled");
        item.outcome = "completed";
        state.failures = 0;
        return result;
      } catch {
        item.outcome = "uncertain";
        state.failures += 1;
        if (state.failures >= 2) state.stopped = true;
        throw new Error("study attempt failed; reservation retained");
      } finally {
        clearTimeout(timer);
        item.latencyMs = Math.ceil(performance.now() - started);
        active = undefined;
        persist();
      }
    }
  };
}
