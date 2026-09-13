# Hosted public observer validation — 2026-09-13

## Decision

**Not production-ready for historical release.** The bounded public surface is deployed at `https://mimir-realm.web.app/` and requires Google authentication, but no completed archive is published and authenticated archive loading has not completed successfully. The service must remain a limited staging release until an operator exports and verifies a real archive, publishes it immutably, and repeats the outage/recovery checks below.

## Scope and boundary

- Firebase project: `mimir-realm` (display name `Mimir`), state `ACTIVE`.
- Firebase Hosting site: `mimir-realm`, `https://mimir-realm.web.app/`.
- Storage bucket: `gs://mimir-realm.firebasestorage.app/`.
- Google account used for validation: the approved operator account (address intentionally omitted from the public evidence record).
- The browser surface exposes observer reads only. It does not receive `OWNER_TOKEN`, does not expose owner commands, and does not write simulation state.
- The VM/SQLite process remains the canonical single writer. Browser replay is intended to read immutable archive chunks locally and does not contact the VM.

## Evidence observed

### Account enforcement

An unauthenticated browser read displayed `Private observer · Google sign-in required` with a `Sign in with Google` action. After Google sign-in, the hosted page displayed the approved operator account and the protected archive viewer.

Storage Rules allow archive reads only for an authenticated, verified approved-operator token and deny writes and deletes. A denied-account test still needs to be performed with a second verified Google account before production approval.

### Catalog and archive integrity

The deployed catalog currently contains zero archives. This is intentional: the validating checkout has no operator database containing a completed archived timeline, so no history was invented or advertised.

The exporter emits a catalog, per-archive manifest, chunk byte counts, SHA-256 checksums, schema version, simulation version, and recorded world/events/interpretations. A real export and a successful authenticated chunk read/checksum verification remain outstanding.

### Availability and outage boundary

The public page is served independently from the VM and continues to render its authentication shell when the VM is unavailable. Because no archive is published, VM-independent historical replay has not yet been demonstrated. The authenticated archive catalog read remained in its loading state during the browser read-back after deployment, so this is an operational defect/gate, not a passing outage result.

### Cloud resources and cost envelope

The read-only resource audit found one Hosting site and the default Firebase Storage bucket in `mimir-realm`. No traffic, archive growth, concurrent-viewer, cache-hit, or observed-cost measurement is claimed here; the catalog is empty and the service has not been released to a real audience. Existing dated runbook budget alerts are warnings, not hard spending caps. Quota, budget, and usage snapshots must be captured immediately before any wider release.

## Required follow-up before a production-readiness decision

1. Fix and re-test the authenticated Storage catalog read, including a visible timeout/error state for bucket outage or partial publication.
2. Export a completed timeline from the operator database and verify every manifest, chunk checksum, schema, simulation version, and referenced world bundle.
3. Demonstrate that incomplete publication is absent from the catalog, then complete recovery and republishing.
4. Test a denied verified account and confirm owner routes and mutation paths are unreachable from the public boundary.
5. Stop the VM, replay the published archive from the browser, restore from the independent P8 backup, and record the result.
6. Capture dated Hosting/Storage/Firestore usage, quotas, cache behavior, archive sizes, concurrent-viewer limits, budget alerts, and actual observed cost.

