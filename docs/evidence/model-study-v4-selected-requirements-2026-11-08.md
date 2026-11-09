# S004 v4 selected-account token, fee and privacy verification

Date: 2026-11-08. **Selected identity verified for read-only preparation; live admission remains blocked.** [Machine receipt](model-study-v4-selected-requirements-2026-11-08.json). Exact account/project identity and billing linkage stay in ignored private evidence. The user explicitly selected the pair identified in the [account comparison](model-study-s004-account-project-identification-2026-11-08.md).

The source freeze remains `4f9802ac746d456bd8d2b763cff40a2207c9dcc81fc1cec907d627c921b770c7`. No inference, `countTokens`, `computeTokens`, paid billing-export queries, API enablement, Cloud configuration mutations, account switches, new logins or key creation occurred. Existing selected-account credentials were used in memory for the authorized metadata reads; SDK credential refresh/cache handling is distinct from creating an execution credential or approval.

## What this review establishes

| Requirement | Current result |
| --- | --- |
| Exact model catalog identity | Authenticated PublisherModel GET and FULL-view GET return the selected `gemini-3.5-flash-lite` name, version `default`, launch stage `GA` |
| Account billing | Resource-scoped reads reconfirm billing enabled, billing account open and currency USD |
| Account-specific standard input tariff | Exact regional text-input SKU: **USD 0.33 per 1,000,000 tokens**, account contract price equals list price |
| Account-specific standard output tariff | Exact regional text-output SKU: **USD 2.75 per 1,000,000 tokens**, account contract price equals list price |
| Pricing reason | Both price responses say `default-price`, zero effective discount and a single tier starting at zero |
| Cache settings | Project cache GET returns retention type `DURABLE`; no explicit `disableCache` field is present |
| Model request/response logging | The exact `fetchPublisherModelConfig` error identifies an absent PublisherModelConfig for the selected project/location/model; this is more specific than an unexplained 404 |
| Token bound | Still no proven exact-model small-input or combined thinking/output ceiling for the selected Cloud `generateContent` operation |
| All-in fees and prior allocation | Unknown: the owner answered “Unknown” for agreement type, documented maximum tax/fee rate and outside-checkout live/uncertain attempts |
| Privacy acceptance | Technical retention evidence is recorded, but agreement/exemption evidence and explicit owner retention acceptance remain absent |

Catalog metadata is not an inference access or regional quota probe. Its `versionId:default` field is not a generated-response `modelVersion` receipt. Do not use it to weaken the runner's response-identity checks or claim successful generation.

## Account-specific price evidence

The authenticated [Cloud Billing Pricing API](https://docs.cloud.google.com/billing/docs/reference/pricing-api/rest) was used to identify the linked account's Vertex service, enumerate its SKUs and retrieve only the two exact standard regional text prices through the documented [account price GET](https://docs.cloud.google.com/billing/docs/reference/pricing-api/rest/v1beta/billingAccounts.skus.price/get).

| SKU ID | Description | Account contract price | Unit quantity |
| --- | --- | --- | --- |
| `A078-09CB-E461` | Gemini 3.5 Flash Lite Regional Text Input - Predictions | USD 0.33 | 1,000,000 count |
| `A841-F27B-EE62` | Gemini 3.5 Flash Lite Regional Text Output - Predictions | USD 2.75 | 1,000,000 count |

The SKU descriptions and prices match the selected non-global standard text tariff. Tuned, global, cached, media, Priority, Flex, Batch, Deferred and Off-Peak SKUs were excluded. All service/SKU pagination needed for this lookup completed; absence of a match was never inferred from an incomplete page. The reference rates in the frozen runner therefore match the account's returned base prices. `default-price` does **not** establish the legal agreement type, tax exemption or absence of other fees.

The public list-method documentation uses a camelCase service filter, but the actual API rejected it and explicitly required `billing_account_service`. One corrected read-only request used that spelling and succeeded. The initial first-page miss and invalid-filter response were retained as diagnostics rather than interpreted as missing SKUs or unavailable pricing.

A separate billing read that forced the selected project as `x-goog-user-project` returned a management-API-disabled error. No service was enabled. Standard resource-scoped billing reads with the same explicit account then succeeded and reconfirmed the linked USD account. This management API consumer issue is not evidence that project billing or the Vertex inference API is disabled. Future study requests must still bind their project explicitly; successful resource-scoped billing metadata reads do not authorize another inference billing project or a default ADC substitution.

The base-rate arithmetic is now account-verified:

```text
inputMicrousdPerMillion = 330000
outputMicrousdPerMillion = 2750000
```

The fixture reservation remains 185,983 micro-USD and the proposed overhead reserve remains 100,000 inside the USD 1 ceiling. Neither is an approved all-in bound: exact input/reasoning maxima, tax/fee allowance and prior allocation remain unsupported. The owner’s “Unknown” response was recorded literally; it was not converted into standard online terms, zero tax, zero outside attempts or permission to spend.

## Token verification outcome

The [official Cloud API protobuf](https://github.com/googleapis/googleapis/blob/master/google/cloud/aiplatform/v1/content.proto) describes `max_output_tokens` as maximum output tokens per message and separately describes thinking configuration. It does not resolve the exact combined thinking/visible-output contract needed for this model. FULL publisher metadata returned no `predictSchemata` or supported-actions parameter schema to establish a tighter bound. No vendor-provided tokenizer model or generation limit was invented from a template URI.

The earlier [exact-model tokenizer review](model-study-v4-bound-account-review-2026-11-08.md) still applies: the inspected official Python local-tokenizer mapping does not include this exact model ID, and no neighboring model's tokenizer may substitute for it. The 16 KiB wire cap and 3,169-byte serialization example are size evidence, not full prompt/schema token-count proofs. No tokenizer packages/assets or gated models were installed/downloaded.

The full-context input-only reservation still exceeds the USD 1 cap for the minimum three-seed sample before output/fees. No inference or token-counting request was made to tighten that bound. Acceptable next evidence is an exact-model supported offline tokenizer with full request accounting, or authoritative model/operation-specific bounds. A future counting request would require separate authorization and prior privacy disposition; it remains prohibited here.

## Privacy verification outcome

The project’s cache response directly establishes durable retention configuration. The previously reviewed [retention guidance](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/zero-data-retention) documents default caching and retention up to 24 hours for supported caches. This is not zero data retention, and the owner has not accepted the permitted retention for live transmission.

The logging lookup now provides explicit absence evidence: the service says the exact PublisherModelConfig was not found and describes creating it with `setPublisherModelConfig`. The [read-method contract](https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/rest/v1beta1/projects.locations.publishers.models/fetchPublisherModelConfig) does not promise a default configuration readback. Combined with documentation that request-response logging is disabled by default, **default-off is the supported inference for an absent override**. An explicit disabled-logging configuration was not returned; no setting was created to manufacture such a receipt. The authenticated model catalog GET separately succeeded, so this config error should not be presented as proof the model itself is absent.

Public training restrictions still prohibit use for training/fine-tuning without prior permission/instruction. [Abuse-monitoring terms](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/abuse-monitoring) can permit flagged-prompt retention and human review depending on the agreement. Because agreement/exemption evidence is unknown, claim neither exemption nor ZDR. Record the ordinary Google-model conservative retention/human-review case for an owner decision rather than assume a Master Agreement.

The frozen fictional Spark-local payload, no personal Vault/household material or secrets, excluded tools/grounding/stateful APIs, and local 30/90-day post-sign-off retention controls remain unchanged. No study prompt or Spark context was transmitted by these metadata checks. Privacy requirements are documented and cache/config facts are narrowed; `privacyTermsVerified` and `retentionApproved` remain false.

## Gate disposition and retained evidence

The account choice, USD currency, catalog identity, two account-specific base prices, durable cache setting and absent logging override are established. Remaining blocking evidence is:

- Proven exact-model input and all-billable-output bounds sufficient to fund all three seeds within USD 1
- Documented maximum all-in tax/fee allowance and reconciled prior allocation, which the owner currently does not know
- Agreement/exemption evidence and explicit acceptance of the applicable caching, abuse retention/human review and logging disposition
- S001/reviewer disposition and separate manifest-specific live approval

Private evidence resides under `.tmp/model-study-approval-preparation/`: selected requirements metadata/follow-up receipts, account-pricing catalog/SKU/price receipts, `s004-v4-owner-unknowns.json`, and the inert `approval-v4-draft.json`. Public receipts contain no account email, project ID, billing account ID or credential. Checked SDK/repository configuration files are unchanged. All 266 frozen source hashes still match, so the earlier offline implementation checks remain applicable; no simulation rerun is claimed or required for this evidence-only review. Changes remain local/uncommitted, with no push or deployment.
