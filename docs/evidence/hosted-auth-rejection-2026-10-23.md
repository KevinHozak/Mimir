# Hosted authentication rejection — 2026-10-23

This records the earlier 16:15 UTC baseline. The later [genuine live fixture run](hosted-auth-live-fixtures-2026-10-23.md) supersedes the pending fixture gate below; these original measurements are preserved.

Source baseline: main `eab1ba1dc60c1e3a47fca609193c58197e77ac75`, with the local harness changes described here. Read-only metadata identified Cloud Run service `mimir-observer-bridge`, project `mimir-realm`, region `us-central1`, serving revision `mimir-observer-bridge-p5-h2b-596163` at 100% traffic. No deployment or IAM configuration was changed.

## Measured live baseline

At 2026-10-23T16:15:41.643Z, eight sequential requests completed in 4,211 ms. Missing and malformed credentials were tested against `/api/world` and `/api/live`, through both the direct Cloud Run origin and Firebase Hosting. Every response was HTTP 401 with exactly the public authentication error. The bounded response/header inspection found no credential or private-state disclosure in these sampled rejections. See the [structured result](hosted-auth-rejection-2026-10-23.json).

## Local automated coverage

The harness tests use locally signed RSA fixtures and an isolated bridge with a canary upstream. They exercise signature tampering, token lifetime/project/identity constraints, rejection body/header leakage, response limits, positive controls, request budgets, and CLI argument validation. These local fixtures are not genuine Firebase live evidence. Restricted loopback access initially prevented the local test; the same test passed with network access enabled.

## Remaining live gate

Genuine expired and wrong-project Firebase ID tokens have not been exercised. Missing fixtures produce a failed, incomplete report rather than a skipped success. The existing operator has no keyless signing permission on the inspected Firebase service account; the older Mimir project has no configured Firebase Authentication. No existing account or historical project was repurposed.

The [isolated fixture proposal](../hosted-auth-fixture-setup.md) requires approval before creating resources, granting temporary signing access, or temporarily changing the bridge allowlist. The full local verifier tests the harness; it does not provision cloud fixtures or satisfy this live acceptance gate. MIM-S007 remains in progress.
