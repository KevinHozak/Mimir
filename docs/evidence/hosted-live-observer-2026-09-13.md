# Hosted-P14 authenticated live observer — 2026-09-13

## Verified deployment

- Firebase project: `mimir-realm`; Hosting URL: `https://mimir-realm.web.app/`.
- Cloud Run bridge: `mimir-observer-bridge`, region `us-central1`, revision `mimir-observer-bridge-00004-qff`.
- Private upstream: Compute Engine VM `mimir-staging`; SQLite remains the sole simulation writer.
- The bridge validates approved, verified Google ID tokens and forwards only observer reads and SSE. It does not receive `OWNER_TOKEN`, does not expose owner routes, and does not add a second writer.

## Checks performed

- Unauthenticated `GET https://mimir-realm.web.app/api/world` returned HTTP 401 with `approved Google account required`.
- Authenticated browser validation as `khozak@gmail.com` loaded the live First Glow observer at tick 28 with 12 Sparks and 7 sites. The live observer and History & scenarios navigation were visible; owner controls were absent.
- The hosted frontend build passed.
- First Glow restart-equivalence checks passed.
- First Glow queued-command/idempotency checks passed.
- The static light-mark asset loaded without requiring a bearer token on an HTML image request.

## Explicit limits

P14 is a limited authenticated staging deployment. The following closure gates are not claimed as complete:

1. A real completed archive has not been exported, published, checksum-verified, and replayed while the VM is unavailable; the deployed catalog is empty.
2. Wrong-account, expired-token, and malformed-token cases have not all been captured as dated evidence.
3. The deployed frontend/bridge release has not been pinned to one clean source commit; the validation checkout contained local changes.
4. No bounded concurrent-viewer, cache, quota, transfer, or observed-cost rehearsal has been run.

Therefore issue [#190](https://github.com/KevinHozak/Mimir/issues/190) remains open. The next decision gate is a bounded archive-plus-traffic rehearsal, not a new public audience or a second simulation writer.

## Follow-up verification

After deployment, a bundle-inclusive backup from the running VM was copied into an isolated local rehearsal directory. The exporter produced one archived timeline (`main`), and the publisher dry-run validated its manifest, checkpoint chunk, checksum, schema, simulation version, and world-bundle references.

The validated archive was then published to `gs://mimir-realm.firebasestorage.app`. The remote catalog now advertises `main`, with its manifest and chunk present. A bucket CORS policy was applied for GET/HEAD reads from `https://mimir-realm.web.app` only. The hosted History view was rechecked as `khozak@gmail.com`: it listed `main · 1 checkpoint(s)` and displayed `Verified local replay` for tick 0 with manifest, chunk checksum, schema, simulation version, and world-bundle references verified.

The publisher also needed a Windows `gcloud.cmd` subprocess fix; that change is included in the follow-up PR. The remaining P14 gates are the full rejected-token matrix, clean deployed source-commit pinning, and bounded traffic/cache/quota/transfer/cost rehearsal.
