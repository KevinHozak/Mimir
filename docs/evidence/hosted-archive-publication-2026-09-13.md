# Hosted archive publication and retention — 2026-09-13

## Operating decision

Use the operator-side `publish:archive` process for the Firebase distribution layer. It never changes canonical SQLite history. A catalog is the advertisement commit point: archive manifests and chunks are validated first, uploaded under a unique staging run, copied to immutable archive paths, and only then is `archives/catalog.json` published.

## Procedure

```powershell
npm run public:archive -- <operator-database> .tmp/public-archives
npm run publish:archive -- .tmp/public-archives gs://mimir-realm.firebasestorage.app
```

Use `--dry-run` to validate a publication without invoking `gcloud`. Use `--quarantine <archive-id>` to remove a suspect archive from the next catalog while retaining its immutable objects for investigation and recovery. The default retention value recorded by the operator output is 395 days; bucket lifecycle configuration remains an infrastructure control and must be verified before production use.

## Validation performed

The empty deployed catalog was run through the dry-run path on 2026-09-13. It passed catalog schema and simulation-version validation and produced a unique staging run identifier without advertising any archive. No operator database was available in the validating checkout, so no history was fabricated and no live archive upload was attempted.

The process rejects missing manifests, missing chunks, catalog/manifest mismatches, byte-count or SHA-256 mismatches, incompatible schema, non-First-Glow simulation versions, and non-`structured-v2` world payloads before the catalog commit. A failed `gcloud` operation throws before catalog publication.

## Boundary and unresolved operational checks

- Firebase Storage is a distribution layer only; Firebase does not write simulation state.
- Storage Rules deny browser writes and deletes. Operator publication uses the separately controlled cloud CLI identity.
- Immutable archive objects are retained during quarantine; removing an archive from the catalog does not erase evidence.
- A real completed timeline still needs export, upload, remote object verification, quarantine, republishing, and restore/replay evidence.
- Storage growth, access logs, budget alerts, quota headroom, cache behavior, and observed cost must be measured from the live project before a wider release.


