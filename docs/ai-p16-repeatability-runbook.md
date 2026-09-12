# AI-P16 bounded Vertex repeatability runbook

AI-P16 evaluates whether the bounded private-hosted Vertex signal observed in AI-P15 repeats across four fixed seeds. It is an evaluation-only phase: proposals are staged for comparison, while the deterministic server remains authoritative.

## Control run

From the repository root:

```text
npm run ai-p16:repeatability
npm run ai-p16:repeatability:test
```

With no live flag, the runner uses the deterministic local fake provider. The control report must be labeled `deterministic-control` and must not be treated as Vertex evidence.

## Live private-hosted arm

The live arm requires the same private-hosted boundary as AI-P15:

```text
MIMIR_AI_P16_LIVE=true
MIMIR_AI_P16_HOSTED_BOUNDARY=private
MIMIR_VERTEX_ACCESS_TOKEN=<runtime secret>
MIMIR_GEMINI_PROJECT_ID=<isolated project>
MIMIR_GEMINI_ACCOUNT_ID=<approved account>
MIMIR_GEMINI_HARD_CAP_CENTS=100
MIMIR_GEMINI_EVALUATION_KILL_SWITCH=enabled
MIMIR_GEMINI_DATA_SCOPE=spark-local-context-only
MIMIR_GEMINI_RETENTION_MODE=review-artifact
```

The runner evaluates seeds `2`, `4`, `8`, and `16`, with 32 encounters per seed. The single provider instance enforces the aggregate 100-cent hard cap across the batch. Do not run it from a public observer or pass owner credentials into the runner.

## Review rubric and decision gate

A seed counts as useful only when it records a valid evidence-grounded proposal and changes both the staged choice and downstream social state. Every seed must also pass private-boundary, deterministic-authority, cap, valid-proposal, provider-free-replay, and no-broader-deployment checks.

- `proceed-to-next-review`: at least 3 of 4 seeds show useful bounded value and every safety gate passes.
- `defer-for-quality`: proposals are valid but useful value is inconsistent or weak.
- `live-rehearsal-blocked`: the live provider arm records no interpretations; diagnose infrastructure or provider access.
- `stop-and-revise`: any safety or proposal-validity gate fails.

The report does not authorize production rollout. Preserve the per-seed reports and the aggregate telemetry for review.

