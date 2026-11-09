# Real Spark AI local pilot

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
