# S004 v4 offline token-bound investigation

Date: 2026-11-08. **No affordable live token bound established; no approval granted.** [Machine receipt](model-study-v4-offline-bound-investigation-2026-11-08.json), [owner decision sheet](../model-study-s004-owner-decisions.md). The frozen protocol remains `4f9802ac746d456bd8d2b763cff40a2207c9dcc81fc1cec907d627c921b770c7`.

## Defensible conclusions

The [exact model card](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-5-flash-lite) publishes a 1,048,576-token context ceiling. This is the defensible conservative input ceiling available from current provider documentation, subject to the published API acceptance/limit contract. It is not an estimate of the study's actual input. At the verified account rate, three such input-only reservations plus the minimum overhead reserve total **1,138,093 micro-USD**, exceeding the USD 1 ceiling before output/fees. It therefore cannot qualify this minimum three-seed study.

The rechecked [official tokenizer loader](https://github.com/googleapis/python-genai/blob/main/google/genai/_local_tokenizer_loader.py) still has no explicit mapping for `gemini-3.5-flash-lite`. A neighboring model's mapping, ASCII input, an approximate characters-per-token rule or a very large safety multiplier does not prove the selected model's complete input accounting. The Cloud per-message output-limit description still lacks the exact combined reasoning/answer guarantee required by this study; Gemini 4 limits and Interactions-only statements cannot be transferred to this operation.

The investigation narrows the required proof and prepares exact payloads. It does not set `tokenBoundsVerified` or convert the synthetic reservation into a live ceiling.

## Exact natural-request reconstruction

Restored each seed's verified model-arm checkpoint at pulse 40 and advanced only to its first recorded request. The same server evaluator and shared RC policy were used before the target pulse, with the provider callback forbidden and all network access trapped. At the target event, context construction and serialization were pure local operations; no provider callback was invoked.

All three context hashes and wire hashes exactly match the existing v4 ledger:

| Seed | Spark / pulse | Complete wire bytes | Prompt UTF-8 bytes | Wire SHA-256 |
| --- | --- | --- | --- | --- |
| 2 | Spark 6 / 52 | 6,083 | 5,108 | `b3da51571fa038c7a059f0600f2232eb7987aaa3b372236e880576d0be748681` |
| 4 | Spark 6 / 48 | 6,109 | 5,130 | `1e01b06c6ab97b6f57e25d57615363e86179c749521001ec0f19a5c242a62aea` |
| 8 | Spark 6 / 52 | 6,064 | 5,089 | `db68606fdca8eb2936e5150c687a8f317741645dce95f2a1ff626c83e6d2650c` |

The prompt code-point counts equal these prompt-byte counts for these recorded ASCII prompts. The complete JSON body also contains schema/configuration and escaping overhead; these measurements must not be conflated. The earlier 3,169-byte injected fixture is not the natural-request size bound.

This reconstruction covered 32 authoritative pulses from saved checkpoints, with zero forbidden-provider callbacks and zero network requests. Private wire files and receipt are under `.tmp/model-study-offline-bounds/run-U9BRoz/`; the audit helper is `.tmp/model-study-offline-bounds/audit.mjs`. Source study data was read only. Payload files have an added terminal newline for storage; ledger wire hashes cover the exact body without that extra newline.

These are three recorded first-request inputs, not an exhaustive proof of all possible later live contexts. The frozen runner admits any eligible request meeting its size and budget checks; it does not enforce this three-hash allowlist. Do not limit a live cost proof to these inputs without an explicitly reviewed source/protocol change that rejects every additional payload before dispatch. Real choices can differ from synthetic choices; empirical timing and a cadence observation are not a universal branch proof.

## Proof routes and exclusions

| Route | Evidence needed before admission | Current disposition |
| --- | --- | --- |
| Full provider input ceiling | Published exact-model acceptance limit and all-billable-output guarantee | Input ceiling available, but input reservation alone cannot fund three seeds |
| Exact offline tokenizer | Official exact-model mapping; pinned vocabulary/normalization artifacts and hashes; complete prompt/schema/wrapper accounting; no network fallback | Mapping and full accounting contract missing; no assets downloaded |
| Mathematical byte bound | Proof that the exact provider normalizer/tokenizer turns bounded wire content into at most `a × bytes + b` tokens, including wrappers/schema/system overhead | No such provider contract found; choosing `a` and `b` as safety factors would be an assumption |
| Fixed-payload proof | Token accounting evidence for each exact body plus a fail-closed payload allowlist covering every dispatch | Three bodies reconstructed; token proof and runtime allowlist absent |
| Post-response usage/stop | Counts and an error stop after a request | Useful accounting, but cannot establish a pre-request spending bound or recover money already incurred |

Even under a byte-fallback segmentation argument, normalization expansion, inserted tokens and provider-generated schema/wrapper representation need bounds. ASCII observations for these three prompts do not establish those properties or every future context. Never alias the tokenizer ID, install a generic estimator and mark it verified, borrow another API's limit semantics, or waive the USD 1 hard-cap requirement through owner risk acceptance.

## Sufficient-bound target

For zero prior allocation and 100,000 micro-USD overhead, three requests can each reserve at most 300,000 micro-USD. If a **separately proven** combined-output envelope were 65,664 tokens at the account's output rate, a proven input ceiling of **361,890 tokens or less** would suffice for three attempts at the verified input rate. It need not be as tight as 16,384.

This is an algebraic proof target, not a claim that the 65,664 output envelope is correct. The current separate 65,536 thinking allowance remains a fixture assumption; a provider guarantee about thinking, candidate count and output cap is still required. Account-specific input/output rates are already verified in the [selected-account review](model-study-v4-selected-requirements-2026-11-08.md).

If the owner wants to pursue a fixed-input route, a future protocol could allow only these reviewed first-request body hashes, with new contexts falling back to rules before dispatch. That changes the admitted treatment and requires implementation, a new source freeze and offline verification; it is not implemented or approved here. Switching to a model with an official supported offline tokenizer is likewise a separate model/protocol decision. No model substitution, provider tokenization call or vendor outreach occurred.

## Remaining evidence to obtain

A vendor clarification request can be prepared from this concrete question, but must not be sent without authorization:

> For Cloud `v1 generateContent`, exact model `gemini-3.5-flash-lite`, US multi-region endpoint, one text candidate and `thinkingLevel:MINIMAL`: what documented hard bound applies to all billable candidate-plus-thinking tokens when `maxOutputTokens` is 128? Which official offline tokenizer/vocabulary/normalization version covers this exact ID, and what additional billable tokens can response schema and server wrappers add beyond the supplied text? Can a published conservative upper bound cover the complete serialized request without calling tokenization endpoints?

No owner fee/prior-allocation/retention answer can replace that technical evidence. The [decision sheet](../model-study-s004-owner-decisions.md) prepares the remaining owner choices while keeping the technical and live-execution gates closed. All 266 source fingerprints and the original report/checkpoints remain unchanged. This was bounded offline investigation, not another full six-history study or a live qualification.
