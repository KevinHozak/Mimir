# AI-P6 Vertex evaluation

This is the bounded, authorized Gemini 2.5 Flash-Lite evaluation for AI-P6. It used the Vertex AI channel in the isolated `mimir-realm` project with Spark-local context only. The normal First Glow server and historical playback remained provider-free.

## Run contract

| Field | Recorded value |
| --- | --- |
| Provider | Google Vertex AI |
| Model/SKU | `gemini-2.5-flash-lite` |
| Project | `mimir-realm` |
| Account | `khozak@gmail.com` |
| Location | `us-central1` |
| Matched encounters | 16 |
| Per-Spark daily limit | 4 |
| Global daily limit | 16 |
| Hard cap | $0.04 |
| Retention | Review artifact with bounded output and usage metadata |

## Results

- Eight attention-gated Vertex requests completed, producing eight valid bounded proposals and zero deterministic fallbacks.
- The other nine matched encounters remained rules-only because the deterministic attention gate did not create a provider opportunity.
- Cumulative model cost was `$0.0006272` (about 0.063 cents), below the `$0.04` hard cap.
- No provider output changed world state, created an event, moved a Spark, changed resources, or bypassed evidence validation.
- The review artifact retained under `.tmp/ai-p6-gemini-evaluation.json` includes matched rules-only records, bounded outcomes, provider/model/SKU metadata, token usage, latency, cost, and fallback outcomes. It is intentionally runtime evidence rather than a committed database or credential-bearing file.

The result is evaluation evidence only. It does not authorize a provider in normal operation, and historical playback continues to use recorded records without provider calls.
