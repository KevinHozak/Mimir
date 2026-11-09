# S004 account and project identification

Date: 2026-11-08. **One read-only-qualified candidate identified; no live approval.** [Machine receipt](model-study-s004-account-project-identification-2026-11-08.json). This supersedes the unresolved account-selection question in the [earlier review](model-study-v4-bound-account-review-2026-11-08.md), without rewriting its evidence for the previously configured principal.

## Scope and configuration evidence

Inspected the repository's `.firebaserc`, the single local SDK named configuration, and the two cached account identifiers. Queries selected only account-ID columns from the credential database in read-only mode; credential secrets were not read by that inventory query. The SDK configuration and repository agree on one Mimir project candidate. No unrelated projects were enumerated, no account was activated and no default configuration was changed.

Both cached accounts were tested explicitly against that repository project using existing SDK credentials. The second cached account is the **unique qualified pair among the inspected candidates**. Exact account/project identifiers and billing linkage remain in ignored private evidence:

- `.tmp/model-study-approval-preparation/s004-account-project-inventory.json`
- `.tmp/model-study-approval-preparation/s004-account-project-comparison.json`
- `.tmp/model-study-approval-preparation/s004-identified-account-project.json`

This establishes a candidate for S004 approval preparation, not a blanket recommendation to charge the project or an owner decision to execute.

## Read-only results

| Check | Previously configured cached account | Second cached account |
| --- | --- | --- |
| IAM test | HTTP 200; no tested permissions returned | HTTP 200; all three tested permissions returned |
| Permissions | None returned | `resourcemanager.projects.get`, `serviceusage.services.use`, `aiplatform.endpoints.predict` |
| Project | Not retried after empty permission result; prior review recorded 403 | HTTP 200, exact repository project ID, lifecycle `ACTIVE` |
| Billing linkage | Not retried | HTTP 200, billing enabled |
| Billing account | Not retried | HTTP 200, open, currency `USD` |
| Vertex API | Not retried | HTTP 200, `ENABLED` |
| Cache configuration | Not retried | HTTP 200, retention type `DURABLE`; no explicit `disableCache` field in the response |
| Exact model logging configuration | Not retried | HTTP 404 `NOT_FOUND`; logging state not established |

The project-read permission supports metadata review; service-use and prediction permissions are the tested execution-related permissions. These results do not establish every model-specific entitlement, quota, organization-policy condition or actual generation availability. No inference was used as an access probe. Do not treat the logging lookup's 404 as evidence of disabled logging, an absent setting, or model unavailability; the response does not distinguish those possibilities.

The cache response is evidence of durable retention configuration, not a ZDR claim or accepted retention policy. Contract/tax terms, abuse-monitoring exemptions and explicit privacy/retention acceptance remain unresolved. USD billing currency is now established for this candidate; the earlier candidate's denied billing read is no longer the only available evidence. Currency verification alone does not establish all-in fees.

## Default-credential boundary

The existing active SDK configuration was left unchanged. The ADC file is an `authorized_user` configuration whose quota project **does not match** the qualified Mimir project; its principal was not authenticated in this review. ADC credentials were not loaded or used for the Cloud checks. Do not assume ADC or the active CLI account represents the qualified pair.

Future authorized management checks or execution must explicitly select the verified account and project, including an appropriate quota/billing project. Do not make a default account switch, change the ADC quota project, create a key, or silently substitute ADC as part of this identification task.

The private v4 draft now names the qualified candidate and marks account selection resolved, while every live admission flag remains false and prices, bounds, approval window, run directory and execution approval remain unset. Evidence of account readiness and permission to spend are separate decisions. Token/fee bounds, provider privacy acceptance, S001/reviewer disposition and explicit manifest-specific owner approval still block live execution.

## Verification and preservation

The SDK named-configuration files, active-configuration selector and repository `.firebaserc` have identical before/after byte hashes. Existing credentials may be refreshed by the SDK for authorized reads; no token values were printed or persisted by the helpers, and no new login or key was created. The comparison made eight explicit read-only REST metadata requests: one IAM test for the first account and seven metadata operations for the second. `testIamPermissions` uses HTTP POST but does not change policy.

Zero inference and `countTokens` calls; zero IAM, service, billing, caching or logging mutations. The unchanged v4 source hash is `4f9802ac746d456bd8d2b763cff40a2207c9dcc81fc1cec907d627c921b770c7`, with all 266 pinned hashes intact. Documentation/receipt checks are appropriate for this evidence-only work; no simulation rerun, commit, push or deployment occurred.
