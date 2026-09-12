# AI-P17 bounded Vertex interpretation quality review

AI-P17 reviews interpretation quality at encounter level rather than inferring quality from aggregate seed counts. It records the bounded proposal or deterministic fallback, the evidence IDs supplied to the Spark, the supported alternative, the staged choice/downstream comparison, and the provider usage category. Canonical runtime authority remains deterministic and replay never calls a provider.

## Deterministic control

From the repository root:

```text
npm run ai-p17:quality-review
npm run ai-p17:quality-review:test
```

The control uses fixed seeds `2`, `4`, `8`, and `16`, with 32 encounters per seed. It writes a disposable report under `.tmp/ai-p17-quality-review.json` and a matching Markdown summary. The checked-in control evidence is `docs/evidence/ai-p17-quality-control-2026-09-12.json` and `.md`.

The rubric classifies every encounter as `useful`, `valid-no-downstream-change`, `safe-deterministic-fallback`, `deterministic-baseline`, or `review-needed`. Fallback reasons are limited to `malformed-output`, `invalid-reference`, `unsupported-claim`, `timeout`, `budget-exhausted`, and `provider-error`.

## Private Vertex arm

Do not enable this arm from a public observer or without explicit operator authorization for billable usage. Set:

```text
MIMIR_AI_P17_LIVE=true
MIMIR_AI_P17_HOSTED_BOUNDARY=private
MIMIR_VERTEX_ACCESS_TOKEN=<runtime secret>
MIMIR_GEMINI_PROJECT_ID=<isolated project>
MIMIR_GEMINI_ACCOUNT_ID=<approved account>
MIMIR_GEMINI_HARD_CAP_CENTS=100
MIMIR_GEMINI_EVALUATION_KILL_SWITCH=enabled
MIMIR_GEMINI_DATA_SCOPE=spark-local-context-only
MIMIR_GEMINI_RETENTION_MODE=review-artifact
```

The batch retains the existing per-Spark limit of 4, global limit of 16, and aggregate hard cap of 100 cents. Inspect individual review records and fallback totals before deciding whether the model, prompt, timeout, or deterministic fallback needs adjustment. A passing control run is not evidence of live model quality.

## Decision gate

`proceed-to-next-review` requires all safety gates, all encounter records, complete fallback categorization, provider-free replay, and at least three useful interpretations in the live batch. Any safety failure is `stop-and-revise`; valid but weak value is `defer-for-quality`. This phase does not authorize public rollout, canonical AI writes, or unrestricted spending.
