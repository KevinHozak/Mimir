# AI-P15 private hosted rehearsal

AI-P15 evaluates the bounded Vertex path inside the private hosted observer. It does not authorize public exposure, unbounded production use, or a second simulation writer.

## Control run

From the repository root, run:

```text
npm run ai-p15:rehearsal
npm run ai-p15:rehearsal:test
```

With no live flag, the runner uses a deterministic local fake provider. This control arm is safe for development and verifies fixed-seed scenario construction, attention budgets, server-validated staging, evidence output, and provider-free replay. Its result must be labeled `deterministic-control`, not Vertex evidence.

## Live private-hosted arm

The live arm requires all of the following runtime-only values:

```text
MIMIR_AI_P15_LIVE=true
MIMIR_AI_P15_HOSTED_BOUNDARY=private
MIMIR_VERTEX_ACCESS_TOKEN=<runtime secret>
MIMIR_GEMINI_PROJECT_ID=<isolated project>
MIMIR_GEMINI_ACCOUNT_ID=<approved account>
MIMIR_GEMINI_HARD_CAP_CENTS=100
MIMIR_GEMINI_EVALUATION_KILL_SWITCH=enabled
MIMIR_GEMINI_DATA_SCOPE=spark-local-context-only
MIMIR_GEMINI_RETENTION_MODE=review-artifact
```

Run it only from the private operator-controlled host or an equivalent isolated execution environment. The runner sends bounded Spark-local context to Vertex, records only safe usage and outcome metadata, and writes the evidence artifact to the configured report path. It must not receive an owner token, expose credentials to the browser, or run against a public observer.

## Decision gate

The report compares the live arm with the same fixed-seed rules-only baseline. Review choice changes, downstream social-state changes, fallbacks, latency, token usage, cumulative cost, knowledge-boundary checks, and provider-free replay. A live result may recommend `proceed-to-next-review` only when the bounded path shows meaningful value and all safety gates pass. Otherwise recommend `defer-for-value`, `tune`, or `retire`.

The deterministic control result is not sufficient to authorize live use. If the required runtime configuration is absent, the correct decision is `live-rehearsal-required` and no provider call is attempted.

## Recovery

Pause ticking, preserve the original database and bundle-inclusive backup, disable AI, and restore to a new destination before comparing history. Replays and branches must use persisted records without calling Vertex. Keep the original evidence and telemetry for review; never recreate missing outcomes with a fresh provider call.

