# MIM-S007 isolated authentication fixture setup

**Status: approved operation completed; genuine live acceptance and cleanup verified on 2026-10-23.** All 28 live matrix requests and four post-rollback access checks passed. Original bridge configuration is restored; fixture identities, grants, temporary allowlist revision, and local credentials are removed. The disposable project is scheduled for deletion. See [execution evidence](evidence/hosted-auth-live-fixtures-2026-10-23.md).

The proposal below records the approved scope. The final wrong-project fixture used a new isolated email/password user with a random memory-only password, avoiding another signer grant after recovered-project IAM denied account creation. Its provider configuration was restored before project retirement.

## Why fixtures are required

The deployed bridge verifies Firebase ID tokens for `mimir-realm`, then checks verified email against its approved list. A Google OAuth service-account token, a custom sign-in token, or a JWT with edited claims cannot substitute for a genuine Firebase ID token. A negative test also needs a valid approved control: otherwise a stopped service or an unapproved identity could make every request fail without exercising expiry/project isolation.

The harness requires three Google-signed tokens from isolated users whose UID starts with `mim-s007-`: a fresh approved target-project control, an expired token for that same UID/email, and a fresh wrong-project token with the same verified email. It validates signatures using Google's current HTTPS certificate endpoint before sending credentials to either fixed Mimir observer origin. Fixtures signed with an unavailable/rotated key fail closed.

Firebase ID tokens normally last one hour. A short custom-token lifetime does not shorten the resulting ID token's lifetime. Preserve the candidate unchanged until its real expiry plus a one-minute margin; do not edit JWT claims or change clocks. See [session management](https://firebase.google.com/docs/auth/admin/manage-sessions) and [custom-token creation](https://firebase.google.com/docs/auth/admin/create-custom-tokens).

## Concrete proposed resources and permission boundary

The private plan `.tmp/live-observer-auth/fixture-setup-plan.json` records the exact proposed project ID, operator, fixture email, running image digest/revision, and original allowlist needed for rollback. It contains no bearer tokens and must remain outside Git.

- Create one dedicated Mimir Firebase authentication fixture project without linking billing. Enable only the management, authentication, and keyless-signing APIs needed by the fixtures, with a fixture-only web app/public API configuration if required. Stop if setup requires billing linkage or an Identity Platform upgrade. Do not enable Auth in the historical Mimir project or the independent backup project.
- Create one new fixture-only signer service account in each of the target and fixture projects. Grant the operator `roles/iam.serviceAccountTokenCreator` on those two accounts only, with a maximum two-hour condition. Do not grant the production compute/bridge identity anything and do not create/export service-account keys. Custom-token signing is privileged; this grant needs explicit approval.
- Create one isolated fixture user per project with the same non-deliverable fixture email, verified-email test claim, and owned `mim-s007-` UID. Abort on an existing UID/email rather than changing a real or unfamiliar account. Do not send sign-in email/SMS or use a personal account.
- Mint an initial target-project ID token into a new private file and wait offline for expiry. Then mint a fresh matching target control and a fresh wrong-project token. Store no credentials in source, command arguments, console output, or reports.
- For one bounded live window, pin the current bridge image and append only the fixture email to the saved existing allowlist. This requires a Cloud Run configuration rollout and explicit approval. Preserve private upstream/VPC configuration, existing approved users, the single SQLite writer, and the paused world; there is no VM restart or world mutation.

## Test and rollback

Run the full matrix sequentially: one valid read before and after twelve denied reads per origin, across the direct bridge and Hosting rewrite (28 requests total). Expired and wrong-project fixtures must receive the exact public 401 error on world, events, interpretations, SSE, bundle, and asset routes. The harness aborts unexpected success before retaining a private body, bounds body sizes and request duration, rejects redirects, checks response headers, and retains only sanitized results. The complete probe window is at most three minutes with one request at a time.

Restore the original allowlist and traffic even on failure or interruption. The saved original healthy revision provides immediate traffic rollback; restore the service template too so a future deployment cannot inherit the fixture email. Verify the original approved-email set and pinned image afterward. Delete only users/signers created by this operation, remove temporary IAM bindings, revoke/delete owned fixture credentials, and retire the owned throwaway project after retaining sanitized evidence. Existing users, projects, secrets, backups, and histories are never cleanup targets.

The user approved the concrete provisioning/signing grants, temporary authentication rollout, rollback, and cleanup on 2026-10-23. The earlier preparation-only boundary has been superseded for this bounded operation. If existing suitable private fixtures and an already approved isolated identity are supplied instead, provisioning can be skipped.

## Running the prepared harness

Copy [the manifest example](../scripts/ops/hosted-auth-fixtures.example.json) to a private ignored directory. Replace its project and absolute paths; each `.jwt` file contains only the raw Firebase ID token. Never paste a token into a shell command. The positive control must already be approved by the live bridge. Run from a built checkout:

```powershell
npm run check:hosted-auth -- --fixtures C:/PRIVATE_FIXTURES/mim-s007/manifest.json --output .tmp/live-observer-auth/unique-result.json
```

Reports refuse existing output files. A missing/unusable fixture is an explicit failed/blocked check, never a skipped passing test. For the separate missing/malformed baseline only:

```powershell
npm run check:hosted-auth -- --baseline --output .tmp/live-observer-auth/unique-baseline.json
```

`npm run test:observer-bridge-auth` runs the existing policy tests plus local signed-fixture, tamper, canary-upstream, and leak-detection regressions. The normal full local verifier includes these local tests; it does not create credentials, provision cloud resources, wait for expiry, or run live authenticated checks implicitly. See [current evidence](evidence/hosted-auth-rejection-2026-10-23.md).

## Windows rollout preflight

Use a private JSON `--flags-file` for the comma-separated allowlist; avoid custom delimiter strings passing through `gcloud.cmd`. [Official flags-file documentation](https://docs.cloud.google.com/sdk/gcloud/reference/topic/flags-file) supports dictionary values without shell escaping. Verify the no-traffic template's explicit revision name; `latestReadyRevisionName` can still identify the serving revision. Preflight rollout/rollback before starting the natural token-expiry wait. Preserve the private snapshot, compare the complete runtime configuration, and stop on unrelated drift.
