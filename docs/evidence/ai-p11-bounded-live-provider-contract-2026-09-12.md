# AI-P11 bounded live provider contract

Date: 2026-09-12

## Decision

Approve the contract needed to implement the first bounded live AI path, without making a provider call as part of AI-P11.

The selected route is Google Vertex AI with Gemini 2.5 Flash-Lite. AI may propose a bounded interpretation for a server-selected Spark situation; the deterministic Mimir server remains the only authority that commits movement, resources, relationships, knowledge, events, and timeline state.

## Selected runtime contract

| Field | Contract |
| --- | --- |
| Provider channel | Google Vertex AI |
| Model / SKU | `gemini-2.5-flash-lite` |
| Project | `mimir-realm` |
| Account | `khozak@gmail.com` |
| Location | `us-central1` |
| Per-Spark daily attention limit | 4 |
| Global daily attention limit | 16 |
| Maximum provider output | 128 tokens |
| Provider timeout | 1 second |
| Retries | 0; fall back immediately |
| Hard experiment cap | $1.00 |
| Kill switch | Required and must be enabled explicitly |
| Normal runtime default | Disabled; rules-only |

The project/account match the previously authorized AI-P6 Vertex evaluation route. The AI-P11 hard cap is now $1.00, superseding the smaller $0.04 AI-P6 evaluation cap. This changes the ceiling only: enabling live calls still requires an operator to set the explicit configuration and verify billing state immediately before use.

## Data minimization, privacy, and retention

Only the bounded Spark-local context may cross the provider boundary:

- versioned personality material needed for the selected situation;
- the current server-selected event and allowlisted alternatives;
- witnessed, communicated, and uncertain evidence IDs already available to that Spark;
- feasibility and relationship state required to interpret the situation.

Do not send secrets, owner tokens, live database files, unrelated Sparks' private knowledge, hidden model reasoning, or arbitrary application logs. The provider receives a schema-constrained request and may return only one supplied alternative, one bounded claim type, a short summary, and witnessed evidence IDs.

Retain the bounded returned proposal, validation/fallback result, provider/model metadata, context hash, usage, latency, cost, and resulting deterministic event linkage needed for audit and replay. Do not retain hidden chain-of-thought. Provider-side storage and data-use settings must be confirmed for the selected Vertex channel before any call; if the required retention boundary cannot be established, the call is not permitted.

## Authority and fallback

The deterministic attention gate decides whether a provider opportunity exists. The provider cannot create an event, choose an arbitrary activity, move a Spark, modify charge/readiness, change relationships, reveal knowledge, or write persistence.

Every accepted proposal must pass schema, alternative, claim, evidence, knowledge-boundary, and context-hash validation before the existing deterministic transition adapter is allowed to commit a consequence. Invalid output, unsupported claims, hidden evidence, timeout, provider failure, unavailable access, or either budget cap being exhausted uses the rules-only resolver immediately.

Historical playback and branching never call Vertex AI. They replay recorded decisions and objective consequences. The public observer remains provider-free until a later bounded runtime pilot is complete.

## Pre-call checklist

Before enabling a live call, the operator must verify:

1. The active Vertex project, account, billing mode, model/SKU, and current price snapshot.
2. The $1.00 hard cap, 4-per-Spark cap, 16-global cap, 1-second timeout, zero retries, and enabled kill switch.
3. The minimized data scope and provider retention/data-use settings.
4. Usage/cost telemetry and an immediate rules-only fallback path.
5. An isolated disposable runtime target, never the canonical timeline or public observer.

This document defines the contract and authorization boundary. It does not itself authorize a live request or spend.
