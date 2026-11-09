# S004 v4 adapter and budget verification

Date: 2026-11-08. Scope: local offline implementation. **Live approval false; real-model benefit and independent human review unmeasured.** [Machine receipt](model-study-v4-verification-2026-11-08.json), [v4 protocol](../model-study-s004-protocol-v4.md), [active manifest](../model-study-protocol.json).

Protocol SHA-256: `4f9802ac746d456bd8d2b763cff40a2207c9dcc81fc1cec907d627c921b770c7`.

## Implemented boundary

The isolated study now uses `scripts/model-study-v4.mjs`: exact `gemini-3.5-flash-lite`, location `us`, host `aiplatform.us.rep.googleapis.com`, one text/JSON candidate, explicit `MINIMAL` thinking and 128 visible output tokens. Unsupported sampling overrides, tools/media/continuation and alternate hosts/models are rejected or omitted. Normal application defaults and the legacy application adapter are unchanged. Fresh histories use `study-v4-seed-*`; archived v3 source identities and trial artifacts are preserved.

The durable guard reserves at least 100,000 micro-USD overhead inside the 1,000,000 ceiling, explicit prior allocation and a fixed full input/candidate/reasoning reservation. It enforces the tighter funded-attempt allowance and protects one initial attempt per seed. Usage never refunds a reservation. Unknown token bounds, insufficient three-seed funding, missing evidence hashes or admission flags fail before credentials/dispatch. Prompt, candidate, reasoning, total, included-cache and optional text-modality counts are reconciled; unknown categories, bad model identity, unexpected thought material and privacy breaches stop immediately. Other malformed/transport failures retain the two-failure ceiling. The independent worker rechecks wire identity before its live branch, and synthetic workers forbid network access.

## Current validation

| Check | Result |
| --- | --- |
| Root four-package build | Passed; existing nonfatal large-web-chunk warning |
| `npm run test:model-study` | 27 passed, zero failed; includes hostile accounting, host/model/payload restrictions, cap boundaries, durable uncertainty, no retry, cancellation, crash/parent-loss cleanup and six matched histories |
| Server runtime tests | 3 passed from `packages/server`; normal defaults remain rules-only |
| Server normalization | 1 passed |
| Matched histories | Six complete histories, 480 authoritative pulses; three synthetic requests |
| Natural focal admission | Spark 6 at 52/48/52 in both arms for seeds 2/4/8 |
| Deterministic integrated rules repeat | 240 pulses, all 15 saved hashes matched; forbidden provider counter zero and network trap enabled |
| Actual observer replay | All six histories at 1440/390 widths; World → Spark 6 Follow → personal Chronicle at 80 → exact admitted event → return to Spark 6 |
| Observer immutability | Zero browser mutation requests, zero provider calls, no page errors; canonical database hashes unchanged; AI/pulsing disabled and external browser requests blocked |
| V3 preservation | Original report byte hash and all 30 checkpoint hashes unchanged; archived manifest byte-identical |
| Source binding | Active manifest and every pinned source/compiled hash verified after checks |

The initial server-test invocation from the repository root used the wrong working directory for its relative bundle lookup and failed with missing-fixture paths. It was rerun from the package directory and all three tests passed; no application repair was needed. No complete root `npm test` run is claimed for this script-only migration.

Artifacts remain in ignored local directories:

- Study: `.tmp/model-study-integration/run-BiNhoG/report.json` and its journals/checkpoints
- Observer: `.tmp/model-study-review/run-zfE9mt/review.json` and 12 desktop/mobile captures, using derived databases with owned services closed after checking
- Approval preparation: `.tmp/model-study-approval-preparation/approval-v4-draft.json`, serialization and v3-preservation receipts

A locally serialized injected synthetic context is 3,169 bytes, SHA-256 `5d73e1347638fe0b0993c19e9bbc366cec2147df5578cbebe65c66affaf9733d`. It is a wire-inspection example, not a natural treatment request or tokenization proof. Natural treatment wire hashes remain in the study ledger; no prompt or credential is included in this public receipt.

## Budget interpretation and limits

Synthetic tests use an **unverified fixture envelope** of 16,384 input tokens, 65,536 reasoning tokens and 65,664 combined output tokens at the documented non-global reference rates. That reserves 185,983 micro-USD per request, permits four funded attempts with zero prior allocation, and retains **657,949 micro-USD including overhead for the three synthetic requests**. All three fake receipts record prompt 100, candidate 30, reasoning 20 and total 150; no allocation is released from those small counts. These numbers exercise arithmetic and enforcement; they are not provider bills, approved bounds or actual spend.

Effective admitted live requests remain zero. Input/reasoning/total bounds and account-specific overhead are not proven, account/project/billing/privacy evidence remains unverified, and the private approval draft has null prices/window/directory with every approval flag false. A successful synthetic comparison does not establish live availability, provider-side cancellation/refunds, quality, blinding or observer engagement. The frozen v4 gate checklist is supplemented by this post-freeze verification record; completed offline checks do not complete its remaining live/human prerequisites.

No inference, `countTokens`, authenticated provider metadata, credential acquisition or Cloud configuration mutation occurred in this implementation turn. Invalid-host/model worker tests stopped before network dispatch. No normal database, hosted runtime, Git commit/push or deployment was changed. Changes remain local/uncommitted.
