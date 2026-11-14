# Bounded Spark goal AI connection — 2026-11-13

**Technical result:** goal selection now runs through the existing server AI runtime, shared durable allocation and bounded provider. Synthetic responses selected an exploration/shard goal, persisted alternatives/rationale/usage, and continued to actual completion. A discarded world transaction reused its durable receipts after reopening without another broker call. Real-model goal qualification remains unperformed.

[Structured checks and source fingerprints](first-glow-goal-ai-2026-11-13.json). [S019](../../issues/MIM-S019.md).

## Delivered behavior

- Explicit fresh-world `MIMIR_SPARK_GOALS=true`; prepared paused launcher `npm run start:ai:goals` uses `data/local/mimir-ai-goals.db`, API 8891, observer 4176. It shares the original allocation database and refuses to upgrade recorded non-goal worlds.
- Goal admission precedes social interpretation inside the existing single-writer pulse path. Goal state persists even without social interpretations, with selection events committed and broadcast through the same transaction. Historical reads and `GET /api/goals` never dispatch providers.
- Spark-local contexts include feasible goal alternatives, needs, authored values, local memories, outgoing trust and own commitments. Added explore/shard examination beside explore/mark and the contact-dependent social goal. A single alternative uses rules without spending.
- Social and goal proposals share the same provider instance, RC allowance, durable USD 0.50 reservation, token preflight, usage validation, receipt cache and stop. No new allocation or account/model routing was introduced.
- Receipt identity includes goal purpose, persisted database-world identity, timeline and context hash. Independent `main` timelines do not accidentally share a receipt; rollback and restore retain identity.
- Invalid output, hidden evidence, failure, stopped/exhausted allocation and timeout yield recorded fallback. Timeout retains its reservation, persistently stops spending and ignores late output. Consecutive failures now persist across reopen. Completed receipts remain reusable; uncertain requests never retry.

## Current validation

| Check | Result |
| --- | --- |
| Full four-package build | Passed; existing Vite size advisory remains |
| Root world-data/engine checks | 227 passed |
| Server state, original AI runtime/provider, goal/provider and persistence checks | 29 passed |
| Actual HTTP server, 80 pulses, history reads, restart and refusal of old-world upgrade | 1 passed; AI disabled |
| Added links, source fingerprints and whitespace | Passed |

Logs: `.tmp/s019-build.log`, `.tmp/s019-root-tests.log`, `.tmp/s019-server-tests.log`, `.tmp/s019-http-tests.log`. Tests use disposable worlds and budget ledgers. Provider tests inject synthetic broker responses into the actual bounded provider class; the HTTP test uses rules fallback. Neither is a genuine model response or a hosted acceptance result. No new browser presentation was added or visually accepted, and the full publication verifier was not run.

## Live qualification disposition

The existing local allocation was inspected **read-only** on 2026-11-13: USD **5.00** cap, USD **0.50** retained reservation, USD **4.50** remaining, one completed attempt, zero uncertain attempts, stop unset. Reservations are application accounting, not final bills or a provider-enforced account cap. The read did not create a provider, refresh credentials or make a network call.

The unchanged broker is configured for the existing SDK account, project `mimir-realm`, pinned `gemini-3.5-flash-lite` and US endpoint. Current authentication/provider availability, live goal output quality and comparative benefit were not checked. The prepared goal launcher was not started. A concrete live execution decision still belongs to S019's unchecked qualification criterion; this implementation does not renew or increase the original allocation.

S020 still owns authored expansion and genuine social opportunities. The current default light mark has one contact, so its social goal remains withheld. S021 owns persistent hosted qualification. S023's human review remains deferred. No commit, push, deployment, audience expansion, normal-world advance or paid-provider call occurred in this work.
