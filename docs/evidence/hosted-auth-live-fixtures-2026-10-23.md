# Genuine hosted authentication fixtures - 2026-10-23

## Result

At 2026-10-23T19:02:20.137Z, all 28 live requests passed in 3615 ms. Google signatures were verified for three real Firebase ID tokens: a fresh target control, an unchanged naturally expired token for the same target UID/email, and a fresh wrong-project token for the same verified fixture email. No clocks or JWT claims were changed.

Both `https://mimir-observer-bridge-mah4b2udkq-uc.a.run.app` and `https://mimir-realm.web.app` accepted valid controls before and after their rejection matrix. Each origin rejected expired and wrong-project tokens on world, events, interpretations, SSE, bundle, and asset routes: 24 HTTP 401 denials with exactly the public error, plus four HTTP 200 controls. Header/body checks detected no private-state, internal-path, identity, or credential disclosure in the sampled denials. Authorized private control bodies were validated in memory and not retained.

The [structured evidence](hosted-auth-live-fixtures-2026-10-23.json) includes every sanitized request result. This is genuine live Firebase verification, separate from the earlier [missing/malformed baseline](hosted-auth-rejection-2026-10-23.md) and local RSA mocks.

## Exact boundary

- Project/service/region: `mimir-realm` / `mimir-observer-bridge` / `us-central1`.
- Original and restored serving revision: `mimir-observer-bridge-p5-h2b-596163`, at 100% traffic.
- Temporary test revision: `mimir-observer-bridge-s007-fixture-1792782108`; subsequently deleted.
- Restored template revision: `mimir-observer-bridge-s007-restore-1792782160`; original audience and other runtime configuration verified.
- Pinned image digest: `sha256:9b50923271ad57435d45ccbcab850b7d1bcb250519a3a3636209c94e19124d2a`. No application image upgrade was performed.
- Local harness base: `eab1ba1dc60c1e3a47fca609193c58197e77ac75` plus the local harness changes; the structured evidence records the harness SHA-256.
- Requests were sequential within a 180-second matrix budget, with five-second individual deadlines. No owner endpoint, VM restart, world mutation, or paid AI call was involved.

## Fixtures and operational correction

The user approved isolated resources, temporary signing access, the short allowlist window, rollback, and cleanup. The target fixture used a new signer with an account-scoped two-hour Token Creator lease; no service-account key was exported. The final wrong-project fixture used a new disposable email/password user with a random password held only in memory, after recovered-project IAM denied signer creation. Its genuine Google signature was separately preflighted. The fixture-only provider setting was restored afterward. No personal account was used or changed; no billing was linked and the project remained standard Firebase Auth.

An earlier attempt stopped before the matrix because Windows command processing stripped a gcloud custom delimiter. It was rolled back and its fixtures removed. The corrected path used a private JSON flags file, selected the new no-traffic revision explicitly, and passed eight anonymous checks before the replacement expiry wait. A quota-blocked replacement project was not created; the already owned disposable project was recovered and retired again. These preparation failures are not counted as passing live token cases.

## Rollback and cleanup

Four additional requests proved that the still-fresh fixture token was rejected on world and SSE through both origins after allowlist rollback, before deleting the fixture user. Exact original traffic, allowlist, image digest, remaining runtime settings, and annotations were compared against the private snapshot.

Both fixture users, all temporary signer bindings/accounts, the temporary allowlist revision, and all local JWT/manifest files were removed. The disposable email-provider setting was restored. The project is `DELETE_REQUESTED`, Google's recoverable scheduled-deletion state, rather than a claim of immediate permanent erasure. Independent read-back confirmed original traffic/allowlist, absence of owned fixture revisions and target identities, absent local credential files, and project retirement. The earlier attempt's users and signers had also been verified removed before its retry.

## Local validation

The full 70-step local verifier passed before cloud execution; application/harness code has not changed since that run. After cleanup, `npm run test:observer-bridge-auth` and five isolated operation regressions passed. These cover failed-probe/rollout restoration, comma-safe flags, explicit revision selection, and refusal to overwrite unrelated changes. Documentation and local issue checks are separate from live acceptance. This record describes pre-publication validation; the delivery PR records the exact committed-source verification.
