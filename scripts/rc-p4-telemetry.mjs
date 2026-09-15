// A provider is shared across scenarios; count each telemetry entry exactly once.
export function summarizeScenarioTelemetry(telemetry = [], start = 0) {
  return telemetry.slice(start).reduce((sum, entry) => ({
    latencyMs: sum.latencyMs + (entry.latencyMs ?? 0),
    inputTokens: sum.inputTokens + (entry.inputTokens ?? 0),
    outputTokens: sum.outputTokens + (entry.outputTokens ?? 0),
    costCents: sum.costCents + (entry.costCents ?? 0),
  }), { latencyMs: 0, inputTokens: 0, outputTokens: 0, costCents: 0 });
}
