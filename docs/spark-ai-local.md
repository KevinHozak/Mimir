# Real Spark AI local pilot

## Final bounded goal qualification — 2026-11-13 (local)

S019's local implementation and live qualification are complete. The new bounded context fixed all seven saved oversize failures under the unchanged 16 KiB cap. A fresh 360-pulse run recorded 4 AI-selected goals (3 completed), with zero local wire rejections and provider-free restored replay. Both previous worlds and all five previous receipts remain intact. See [final evidence](evidence/first-glow-goal-context-live-2026-11-13.md) for each Spark decision and outcome.

The run used 5 new requests to `gemini-3.5-flash-lite`, retaining $2.50 in conservative reservations and leaving $0.00 unused from the original $5 allocation. Recorded token-cost estimate: $0.004681; this is not an invoice. Spending is stopped and the server is shut down. Larger-world S020, hosted S021, summaries S022 and deferred human finalization S023 remain separate; no deployment or publication occurred. Earlier sections preserve dated intermediate findings.

## Bounded local goal context — 2026-11-13 (local)

New goal decisions use `bounded-local-goal-v1`: at most six memories (140-character summaries), six outgoing trust records, four own resolved commitments, two supporting references per record and sixteen local evidence IDs. Current trust values and commitment outcomes are retained; omitted-record/reference counts make truncation explicit. Selection uses stable recency/ID ordering, filters future and nonlocal relationship records, and hashes the projected input. Saved contexts, hashes, receipts and histories are never rewritten or silently compacted on replay.

The provider still enforces the 16 KiB wire cap. Oversized or invalid projections fail before reservation with `goal-context-too-large` or `goal-context-invalid`; status counts local rejections separately from provider failures, and sanitized goal summaries expose fallback reasons. This changes neither the model/token envelope nor the allocation ledger.

## Corrected goal-world run and current allocation — 2026-11-13

The contact-continuity repair is selected for fresh goal worlds. The corrected headless run is saved at `data/local/mimir-ai-goals-sharing.db`; the earlier `mimir-ai-goals.db` remains unchanged. The normal goal launcher still targets that earlier filename, so do not treat restarting it as switching to the corrected history or upgrading a save.

Sel's real AI-selected explore/mark goal completed at pulse 127. The full 360-pulse run had six completed, seven expired and five active goals. Three new inference attempts retained USD 1.50; **USD 2.50 remains unused** behind the persistent stop. The server is shut down. Seven later contexts were rejected locally by the 16 KiB wire guard, so sustained live goal qualification remains open.

The owner-authorized continuation used the audited `SparkAIBudget.resume` library operation with exact headroom and only completed old receipts. It preserved the original cap and all reservation history. It is not a refund/reset or automatic restart mechanism. Any future continuation needs explicit authorization and must retain the exact balance and unresolved-attempt guards. [Full corrected results](evidence/first-glow-goal-sharing-live-2026-11-13.md).

## Goal-world launcher — prepared 2026-11-13

`npm run start:ai:goals` builds and opens a separate paused world at `http://127.0.0.1:4176/` with API port 8891. Its world is `data/local/mimir-ai-goals.db`; it shares the existing `data/local/spark-ai-budget.db` allocation with the original pilot. It sets `MIMIR_SPARK_GOALS=true` only for this explicitly selected runtime. No paid request occurs at startup; resuming or pulsing can admit goal or social calls.

Goals use the same model, account/project routing, reservations, token envelope, stop button and receipt cache described below. Do not copy/reset the allocation to create a second budget. Separate worlds receive persisted receipt identities; old non-goal databases are refused rather than upgraded. `GET /api/goals` returns committed progress and runtime status without model calls. Goal choices run before social interpretation within the same RC allowance. Recorded goals continue with physical costs and deterministic fallback.

The owner explicitly approved the payload, destination and remaining USD 4.50 for a bounded headless S019 run. It reached pulse 360 and accepted one genuine social interpretation, but all eleven goals had only one feasible alternative, so zero paid goal proposals were dispatched. Three rules goals completed, four expired and four remained active. One additional USD 0.50 reservation was retained; USD 4.00 remains unused behind the persistent spending stop. The server is shut down. No automatic restart or budget reset is configured. See [live evidence and contact-continuity findings](evidence/first-glow-goal-ai-live-2026-11-13.md); actual AI goal selection remains unqualified.

The owner authorized real Spark AI on 2026-11-08 with a USD 5 total pilot allocation and waived further privacy-paperwork admission for this local use. Ordinary `npm start` remains provider-disabled. This pilot uses Google Cloud project `mimir-realm`, the explicitly selected existing Cloud SDK account and `gemini-3.5-flash-lite` through the US multi-region endpoint. It does not change the SDK default account or use Application Default Credentials.

## Launch and use

Run `npm run start:ai` from the repository root. It builds the workspaces, starts the API on loopback port 8890 and a separate Vite observer on port 4175. Open http://127.0.0.1:4175/ and select **Resume clock** or **Advance one pulse**. The default launch is paused and makes no model call at startup. Existing rules-only local data is preserved.

The AI world lives in `data/local/mimir-ai.db`; its cumulative allocation and receipts live in `data/local/spark-ai-budget.db`. Both are private local runtime data. Keep the allocation database and its SQLite sidecars: deleting, replacing or copying it to another machine can defeat cumulative accounting. World resets and server restarts do not reset this allocation. Do not run independent copies of this pilot allocation.

At significant naturally admitted events, the server sends only the bounded fictional Spark context. The provider proposes one supported alternative and a short evidence-linked interpretation. The engine validates the proposal and commits authoritative consequences. Invalid or unavailable output falls back to rules. Replay uses stored results and never calls the provider.

## Budget and stop behavior

The app reserves USD 0.50 durably **before** each unique attempted request. Reservations are never refunded, including failed, cancelled, rejected or uncertain calls. USD 5 permits at most ten attempts across restarts. Completed contexts reuse their stored receipt; uncertain contexts are never retried. One request is in flight at a time; two consecutive provider/validation failures stop further spending. **Stop AI spending** records a persistent stop and pauses the clock. It cannot undo a request already sent. There is deliberately no reset or budget-increase button.

Each attempt performs one real `countTokens` preflight and, only if admitted, one generation. The wire is limited to 16 KiB, counted input to 16,384 tokens, one candidate and 2,048 configured output tokens with MINIMAL thinking. Receipt validation also limits reasoning to 65,536 tokens, verifies total usage and rejects unexpected model/completion identities. The worker has a nine-second cutoff and no retry. Conservative accounting includes the larger reasoning envelope rather than assuming thinking is free.

The verified regional list rates are USD 0.33 per million input tokens and USD 2.75 per million output tokens including thinking. The conservative token envelope costs about USD 0.191263 before fees; doubling that for price/fee contingency remains below the USD 0.50 reservation. Recorded token cost is an estimate, not a final invoice. The durable USD 5 limit is an application allocation, not a Google-enforced account billing cap or an attribution of unknown earlier activity elsewhere. The owner chose this practical buffered pilot rather than waiting on agreement/fee paperwork.

The selected account needs its existing Cloud SDK installation, usable credentials, billing and Vertex permissions. Credential contents are never printed or committed. If those prerequisites stop working, keep the reserved allocation and use rules fallback; do not silently switch accounts, projects, models or endpoints.

## Evidence and scope

[Live verification](evidence/spark-ai-live-2026-11-08.md) records one accepted response, persistent restart behavior and offline tests. The old USD 1 matched-study v4 manifest is preserved unchanged, including its historical source hashes. Current application edits intentionally invalidate its source freeze. Neither the pilot nor the real response establishes comparative model benefit or independent human observer acceptance.

General local verification uses `model-study-protocol.mjs --fixtures-only` to compare the preserved v4 protocol and deterministic checkpoints without approving its stale source fingerprint. The default protocol command and study execution keep strict source matching; no study freeze is rewritten. Spark budget/receipt regressions run through the server AI-runtime check.
