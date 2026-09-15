# AI-P14 bounded First Glow rollout runbook

AI-P14 is an internal, operator-controlled pilot. The default and safe recovery mode is rules-only. This procedure does not authorize public exposure, production expansion, or unbounded AI use.

## Preconditions and rollout

The server enables the bounded path only when all gates are explicit: `AI_ENABLED=true`, `AI_RUNTIME_MODE=bounded-internal-pilot`, `AI_ROLLOUT=internal`, configured Vertex/Gemini access, the approved local-context data scope, review-artifact retention, an enabled kill switch, and `MIMIR_GEMINI_HARD_CAP_CENTS=100`. Provider credentials are runtime configuration only and must never be committed or sent to the browser.

Before an internal run:

1. Pause or otherwise control the scheduler and create a bundle-inclusive backup to a new destination.
2. Start the isolated runtime and inspect `/api/social/config`. Confirm the bounded mode, internal rollout, approved provider/model, hard cap of 100 cents, and `historicalPlaybackUsesAI=false`.
3. Run only the approved attention-trigger encounters. Monitor calls, fallbacks, cumulative cost, latency, committed interpretations, and deterministic transition results.
4. Verify that the observer remains read-only and that playback/replay uses persisted outcomes without provider calls.

Routine activity remains rules-only. AI receives bounded Spark-local context and may propose only the supported staging choices; the server validates and commits the result.

## Rollback and kill switch

Disable the feature by setting `AI_ENABLED=false` and restarting the server. If an immediate gate failure is needed, also set `AI_RUNTIME_MODE=rules-only` or remove the internal rollout gate. Confirm `/api/social/config` reports `rules-only` and no new provider calls occur. Existing checkpoints, events, interpretations, and audit artifacts are retained; rollback does not delete or rewrite history.

Stop the pilot immediately if the cap, data boundary, authority boundary, duplicate-commit, latency, fallback, or explainability checks fail. Do not expand the rollout to public observers while any of those checks are unresolved.

## Monitoring

Use the read-only social config endpoint together with the existing health/report endpoints and server logs. Review enabled state, runtime mode, provider/model, hard-cap configuration, call count, fallback count, cumulative cost, and the provider-free playback indicator. Logs and review artifacts may contain bounded outcome summaries, but must not contain access tokens, owner secrets, hidden model reasoning, or unbounded prompt/context data.

## Recovery

If the run is interrupted or state is suspect, stop pulsing, preserve the original database and bundle, and create a fresh bundle-inclusive backup. Restore to a new destination, validate the restored bundle, and replay from persisted records with the AI path disabled. Compare checkpoint, event, interpretation, and ledger results before considering any replacement of live state. Keep the original artifacts for audit and never recover by inventing fresh AI results.
