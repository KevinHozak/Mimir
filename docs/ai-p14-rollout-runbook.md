# AI-P14 bounded First Glow rollout runbook

## Frontier goal payload — S020 (local)

Fresh frontier goal contexts add at most four noticed site opportunities (kind, site/region label, stable ID, actual route cost and own discovery evidence) and one locally visible trace target. New `follow-trace` and `explore-contribute` choices use the same bounded selection validator, 16 KiB cap and authoritative arrival/resource executor. The entire map, global discovery list and hidden memories are excluded. Old recorded contexts/receipts are unchanged. The new local launcher and S020 verification use AI disabled; no renewed allocation or provider calls are authorized by the implementation. S021 retains online/live qualification.

## Final bounded goal qualification — 2026-11-13 (local)

S019's local implementation and live qualification are complete. The new bounded context fixed all seven saved oversize failures under the unchanged 16 KiB cap. A fresh 360-pulse run recorded 4 AI-selected goals (3 completed), with zero local wire rejections and provider-free restored replay. Both previous worlds and all five previous receipts remain intact. See [final evidence](evidence/first-glow-goal-context-live-2026-11-13.md) for each Spark decision and outcome.

The run used 5 new requests to `gemini-3.5-flash-lite`, retaining $2.50 in conservative reservations and leaving $0.00 unused from the original $5 allocation. Recorded token-cost estimate: $0.004681; this is not an invoice. Spending is stopped and the server is shut down. Larger-world S020, hosted S021, summaries S022 and deferred human finalization S023 remain separate; no deployment or publication occurred. Earlier sections preserve dated intermediate findings.

## Bounded local goal context — 2026-11-13 (local)

New goal decisions use `bounded-local-goal-v1`: at most six memories (140-character summaries), six outgoing trust records, four own resolved commitments, two supporting references per record and sixteen local evidence IDs. Current trust values and commitment outcomes are retained; omitted-record/reference counts make truncation explicit. Selection uses stable recency/ID ordering, filters future and nonlocal relationship records, and hashes the projected input. Saved contexts, hashes, receipts and histories are never rewritten or silently compacted on replay.

The provider still enforces the 16 KiB wire cap. Oversized or invalid projections fail before reservation with `goal-context-too-large` or `goal-context-invalid`; status counts local rejections separately from provider failures, and sanitized goal summaries expose fallback reasons. This changes neither the model/token envelope nor the allocation ledger.

## Corrected run and continuation controls — 2026-11-13

After explicit owner authorization, the existing stop was lifted using the exact-balance audited library guard. Every prior receipt and the original cap were preserved; unresolved requests cannot be released through it. A fresh sharing-safe world completed a real AI-selected goal and then stopped at pulse 360. USD 2.50 remains unused, spending is stopped again, and no automatic resumption is installed.

Before another goal-provider qualification, address the ordinary-history context-size gap: seven requests exceeded the fixed 16 KiB wire cap before any reservation or remote call. Do not raise the cap or reset the ledger to work around it. See [corrected live evidence](evidence/first-glow-goal-sharing-live-2026-11-13.md).

## Latest local qualification — 2026-11-13

The owner approved the fictional payload/destination and remaining allocation. A 360-pulse live goal-world run accepted one social response but dispatched no paid goal proposal: all admitted goal contexts were single-option. S019 remains open for contact continuity and multi-option goal admission. USD 4.00 remains unused; the durable spending stop is set and the server is shut down. Do not treat remaining headroom as a reset or automatic execution authorization. [Live evidence](evidence/first-glow-goal-ai-live-2026-11-13.md) retains outcomes, receipts and recovery proof.

## Goal-loop rollout boundary — S019, 2026-11-13

`start:ai:goals` selects a separate fresh goal world and shares the existing durable Spark AI allocation. Goals use the existing live broker/model contract, persisted receipts, stop control and RC; they do not use the older USD 1 in-memory study provider. The server rejects AI goal mode unless shared event RC admission and the durable runtime are selected. Do not inject an unbudgeted goal transport.

Implementation was verified locally with synthetic responses and an AI-disabled HTTP server. Before real goal qualification, confirm the configured account/project/model, existing remaining allocation, explicitly selected world/cadence and intended bounded run. Keep the clock paused until that decision. Startup itself makes no calls. No default account, allocation, audience or hosted limit changes through this implementation. [S019 evidence](evidence/first-glow-goal-ai-2026-11-13.md) records the limits; [S021](../issues/MIM-S021.md) retains online qualification.

## Owner-selected live Spark pilot — 2026-11-08

The owner selected real Spark AI with a **USD 5 total pilot allocation**, replacing privacy-paperwork admission for this local pilot. [The live pilot guide](spark-ai-local.md) and [verification](evidence/spark-ai-live-2026-11-08.md) describe the implemented path. One real response was validated and committed; the observer is paused. This is operational pilot evidence, not completion of the matched S004 study or independent S001 human review. Earlier study requirements and no-call statements below describe their dated study scope; the frozen v4 manifest is retained unchanged and is not the current live application's source fingerprint.


AI-P14 is an internal, operator-controlled pilot. The default and safe recovery mode is rules-only. This procedure does not authorize public exposure, production expansion, or unbounded AI use.

## Living Lives study planning — 2026-11-08

The [S002 study controls](model-study-controls.md) propose a matched observer-benefit study with a USD 1 cumulative ceiling and a separate manifest-specific approval gate. S003 integrates and verifies the study controls offline. Provider/account admission and explicit run approval remain outstanding; these controls do not authorize a run or change runtime defaults.

The [S004 audit](evidence/model-study-zero-opportunities-2026-11-08.md) identified missing RC production in v2. [V3](model-study-protocol.md) now has shared admission and [offline verification](evidence/model-study-v3-verification-2026-11-08.md), while archived v2 records are unchanged. This is isolated study readiness, not authorization for live execution, real provider access or deployment; current account-specific pricing/privacy admission and an explicit approved packet remain mandatory.

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

The [owner choices](model-study-s004-owner-decisions.md) record deferred fees, unknown outside attempts, and retention acceptance conditional on agreement verification. Keep the executable retention/privacy flags false while that condition is unmet; do not infer a fee ceiling, zero prior allocation, settings-change permission or live execution authorization.

Use the [owner decision sheet](model-study-s004-owner-decisions.md) for the remaining fee/prior-allocation/retention facts and policies. It is not a live approval. The [offline investigation](evidence/model-study-v4-offline-bound-investigation-2026-11-08.md) reconstructs three exact natural wires, not token counts or every future live path. Any outside attempts require total/per-seed count enforcement as well as dollars; v4 currently carries a prior-dollar scalar only. No owner policy waiver, tokenizer alias or byte heuristic may replace the pre-request cost proof.

[Selected-account requirements verification](evidence/model-study-v4-selected-requirements-2026-11-08.md) establishes the exact account-specific base tariffs and GA catalog entry. The absent logging override supports a documented default-off inference; do not create a configuration just to manufacture an explicit readback. The observed durable cache setting still requires retention acceptance. Unknown agreement/tax/fee/prior-allocation facts and unproven token bounds keep live admission closed. No inference/countTokens, API enablement or account-default changes were made.

[S004 account identification](evidence/model-study-s004-account-project-identification-2026-11-08.md) qualifies the other cached account for the repository Mimir project via read-only permissions, billing and API checks. Use its explicit private identity for later authorized metadata checks; do not assume the unchanged SDK default or ADC represents it. USD currency is verified, while token/fee bounds, logging/retention acceptance and live execution approval remain open. Identification did not switch accounts, mutate Cloud settings or call inference/countTokens.

The [current v4 bound/account/privacy review](evidence/model-study-v4-bound-account-review-2026-11-08.md) records denied metadata reads and no returned permissions for the configured candidate. Confirm the intended account/project before further account qualification; do not repair IAM, switch accounts or change cache/logging settings implicitly. Exact-model token bounds, all-in fees and accepted provider retention remain unresolved. No inference/countTokens call is authorized by the completed read-only review.

Follow-up implementation: [S004 v4](model-study-s004-protocol-v4.md) uses a study-specific Gemini 3.5 Flash-Lite serializer at the documented US multi-region endpoint, explicit minimal thinking and durable candidate/reasoning/funded-attempt controls. No live approval follows from this offline migration: documented bounds, account/privacy evidence, independent review and explicit source-bound approval remain required. Do not enable the normal application or legacy v3 adapter to run the study.

S004 admission history (2026-11-08): the [blocked approval packet](model-study-s004-live-approval-packet.md) records retirement of the v3 model and unresolved authenticated account/billing/privacy evidence. V4 migrates the isolated adapter and accounting; proof of live token/fee bounds remains required. Offline guard verification does not authorize enabling this pilot or spending.

Use the read-only social config endpoint together with the existing health/report endpoints and server logs. Review enabled state, runtime mode, provider/model, hard-cap configuration, call count, fallback count, cumulative cost, and the provider-free playback indicator. Logs and review artifacts may contain bounded outcome summaries, but must not contain access tokens, owner secrets, hidden model reasoning, or unbounded prompt/context data.

## Recovery

If the run is interrupted or state is suspect, stop pulsing, preserve the original database and bundle, and create a fresh bundle-inclusive backup. Restore to a new destination, validate the restored bundle, and replay from persisted records with the AI path disabled. Compare checkpoint, event, interpretation, and ledger results before considering any replacement of live state. Keep the original artifacts for audit and never recover by inventing fresh AI results.


## S021 online preparation (not activated)

The optional `spark-online` mode uses VM metadata credentials and a separate durable allocation identified in the persisted run contract. It does not reuse or replenish the exhausted local allocation. The owner selected $2 additional hosting for 24 hours; the owner selected AI stopped and preparation only. Keep paid dispatch and activation stopped, and retain genuine hosted auth, paired off-host recovery and exact deployment checks in [the online packet](spark-ai-online.md).


### S021 original-allocation continuation — 2026-11-13

The owner authorized recorded-cost accounting with a reasonable buffer, continuation under the original USD 5 AI cap, and USD 2 hosting for a 24-hour owner-only pilot. The original ten receipts remain intact: USD 0.008844 token-cost estimate, USD 0.117688 guarded after a 2× multiplier and USD 0.10 reserve, and USD 4.882312 guarded headroom. Pending/uncertain or missing-cost calls keep full USD 0.50 holds. An audited ledger handoff retires the desktop writer before the target writer resumes; it does not create another allocation. The hosting watchdog and independent shutdown deadline preserve the selected window and conservative hosting cutoff. These are implementation/preparation records, not a deployed-readiness claim; see [the online packet](spark-ai-online.md). The standalone backup worker now also requires `spark-ai-accounting.js`.
