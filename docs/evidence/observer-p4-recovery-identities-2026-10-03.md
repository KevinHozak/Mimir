# Observer-P4 recovery identity audit — 2026-10-03

## Disposition

Issue [#269](https://github.com/KevinHozak/Mimir/issues/269) has **completed read-only recovery evidence, pending PR merge**. Available Hosting rollback, bridge revision metadata, the authoritative VM process/checkpoint, and an existing local bundle-inclusive recovery unit were read. The independent historical recovery object remains available through its existing recovery identity. The independent archive manifest/content check passed after explicit download approval; the deployed backend has a byte-matched reproducible recovery source at `e5b5b114a7b2990bd6dfb305364079a29aad9aae` (details below). No rollback, restart, restore, deployment, world mutation, IAM change, key creation, or new writer was performed. Audience rehearsal #272 and final disposition #257 retain their separate audience, window, telemetry, and operational-test gates.

The clean audit checkout was based on fetched `origin/main` at `e69828f`. Dependency #254 was read as closed/completed. This report distinguishes current metadata/integrity reads from historical restore tests.

## Access and observation times

Read window: approximately **2026-10-04 00:49–00:55 UTC**, **October 3, 2026, 19:49–19:55 CDT**. Cloud reads used a previously stored authorized operator identity selected per command; the configured default identity lacked Cloud Run read permission. No active-account or IAM setting was changed. Proxy overrides were limited to the individual shell processes.

- `gcloud run services describe` and `gcloud run revisions list`: authenticated read-only Cloud Run metadata.
- Firebase Console > Hosting > Manage site: existing authenticated operator browser session, current/prior release rows and the prior-release action menu. The menu was dismissed without selecting Rollback or Delete.
- Hosting REST `sites/mimir-realm/releases?pageSize=20`: still HTTP 403 with the existing operator token. Console access resolves the release-availability observation; it does not fix or establish REST permission.
- Compute Engine instance description: RUNNING, e2-micro, no external access configuration returned.
- Existing PuTTY key and cached host trust, batch mode, IAP: read-only service, health, process, checkpoint, and manifest inspection. OpenSSH first refused an unknown host key; verification was not weakened. The established PuTTY path succeeded.
- Recovery-identity impersonation: metadata read of the previously recorded independent backup object; no new permission was granted.

Public evidence omits account emails, billing identifiers, project numbers, bucket identities, and budget details. Private recovery destination lookup remains in the existing operator record rather than being reproduced here.

## Hosting versions and recovery procedure

| Console row | Displayed time (CDT) | Source/build linkage | Current availability evidence |
| --- | --- | --- | --- |
| Current `57d854` | Oct 3, 19:20 | Full version `2b0287700b57d854`, source `d1aa17ea9b64f90db71b304845d21570e56c698d`; exact index and hashed asset match in the [deployment record](hosted-p18-p4-deployment-2026-10-03.md) | Current release row freshly read |
| Prior `470f8e` | Sep 14, 19:58 | Full version `82cc93e9b9470f8e`, source `fbd4eb8dbdbf94c78c482030fd5609011de88bab` in the [historical P17 record](hosted-p17-operational-closeout-2026-09-14.md) | Deployed prior row; action menu contains Rollback |
| Prior `b124c9` | Sep 14, 19:39 | Full version/source linkage unknown | Deployed prior row freshly read |
| Prior `74b96e` | Sep 14, 14:48 | Full version/source linkage unknown | Deployed prior row freshly read |

Console suffixes are correlated with retained full identifiers; the console did not expose full version IDs or Git commits. Current build linkage is the same-day deployment evidence, not a new byte comparison by this audit. Only the known prior row's rollback menu was inspected. The visible rows are not an exhaustive release-history export.

For an explicitly authorized recovery, the operator can select the known prior release's **Rollback** action in Firebase Hosting and confirm the chosen release. Then read back the new current release, compare its served index/assets with the retained build, and check authenticated rendering, required bundle assets, and rejected unauthenticated/mutation routes. [Firebase documents this console rollback procedure](https://firebase.google.com/docs/cli). Menu availability does not establish mutation permission or a successful rollback.

The prior release predates #266's authenticated bundle-asset fix. It is a retained fallback with known regression risk, not an equivalent fully working observer. Prefer stopping the rehearsal over blindly reverting to it. A current artifact rebuild/redeployment also requires separate authorization and clean-source verification.

## Bridge identity and recovery procedure

At the read, `mimir-observer-bridge-00004-qff` was latest ready and received **100% traffic**, with `latestRevision: true`. Its immutable image digest is `sha256:d97d41d6874dbc2855966daadfcf407af8385a69885b57c1ae52fc5bd3238660`. ContainerHealthy and Ready were True. The revision became ready on 2026-09-13 at 21:25:29 UTC.

Prior revision `mimir-observer-bridge-00003-p4c` is retained with digest `sha256:074d5b3891adf248b3f7071f3631b4c8c3b0708ee971140a68e42e5740a7b4ed`. It has historical ContainerHealthy=True and Ready=True, but Active=False/Retired and ResourcesAvailable=Unknown. It receives no listed traffic. Revisions `00001-7sr` and `00002-pgd` have failed container-health evidence and are not recovery candidates merely because their Ready field is True after retirement.

The documented recovery procedure is to re-read the intended revision and its compatibility, obtain explicit traffic-change authorization, then assign 100% traffic to the exact retained known-good revision. For recovering from a later faulty rollout, the currently serving `00004-qff` is the recorded baseline. Do not automatically choose `00003-p4c`: current authentication, asset forwarding, and source compatibility are untested for it. [Cloud Run documents exact-revision traffic recovery](https://cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration), including `gcloud run services update-traffic SERVICE --to-revisions REVISION=100`.

Read back traffic and health, then verify approved observer reads, auth rejection, and SSE cleanup before reopening a rehearsal. No revision traffic was changed. Image identities do not establish source commits, recovery success, or outage/SSE behavior.

## Authoritative VM and local recovery unit

At **00:54:40 UTC / 19:54:40 CDT**, the actual unit was `mimir-staging.service`, active/running and enabled. `mimir.service` was absent; its initial inactive result was a wrong-name probe, not evidence of runtime outage.

- Unit file: `/etc/systemd/system/mimir-staging.service`.
- Main PID: `562`; one Node process was returned by `pgrep -c node`.
- Command: `/opt/node/bin/node /opt/mimir/packages/server/dist/index.js`; working directory `/opt/mimir`.
- Database `/var/lib/mimir/mimir.db`; port 8888; `AUTO_PULSE=false`; health `ok=true`, pulse 0, scheduler paused.
- Immutable bundle root `/opt/mimir/assets/world/generated`; backup directory `/var/lib/mimir/backups`; interval 86,400,000 ms.
- SQLite opened with `mode=ro`: one checkpoint on timeline `main`, pulse 0, simulation `mimir-sim-v3-first-glow`. The attempted top-level schema/theme/age lookups were absent; they do not prove incompatible state because those are not all top-level state fields.

The deployed directory has no `.git` directory or observed source-commit marker. These current SHA-256 fingerprints identify deployed bytes without inventing a Git linkage:

| Deployed artifact | SHA-256 |
| --- | --- |
| `packages/server/dist/index.js` | `6f7f7e39ddf5d657d5c20f9d39be7382e1916dc8f48ccdd20f0a759951c5b811` |
| `packages/server/dist/backup-lib.js` | `3e86a713537df9c4cada4b6d7d656b40b84eead2b0c3d02edad5aee01a630c3e` |
| `packages/engine/dist/index.js` | `2bd4a7fc9166a3119cbb1c1b66f313270203d2ad56bbe3125d34b97c3f9ea9d5` |
| `package-lock.json` | `badfe25557f7630fbf9b1bd5a20ac5ccb4afe7a1a4ea40e1908d9d10b695226c` |

A single Node count supports the observed service shape; it is not a comprehensive OS-wide SQLite-writer proof. The follow-up below establishes a reproducible backend recovery source by complete deployed JavaScript comparison; it does not invent the historical deployment command.

The latest existing local manifest by file modification time was `/var/lib/mimir/backups/mimir-2026-10-03T01-15-51.145Z-interval.db.manifest.json` (backup-name timestamp October 2, 20:15:51 CDT). In-place read/hash verification returned:

- Manifest SHA-256 `dc162110b385944b4ec3b236047910bae18ea1ffe0acc5e3964225fb95e7c735`.
- Database exists, size 114,688 bytes, matching manifest; SHA-256 `e2e3c35427c70500de03c1414a50d27f65c0aebdd46faff530dc0400e23bc19f` matches.
- Bundle `sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e`; all seven manifest-listed bundle files exist and match their SHA-256 values.
- Backup SQLite read-only checkpoint summary: timeline `main`, one checkpoint, pulse 0.

This verifies an available local bundle-inclusive unit, not independent durability, full semantic restore validation, or a successful restore. No new backup was created.

## Reproducible VM backend recovery source — approved follow-up

The deployed backend is reproduced by committed source **`e5b5b114a7b2990bd6dfb305364079a29aad9aae`**, the pulse-terminology merge (#198). This is a verified recovery source identity, not proof of the original deployment command or a unique historical checkout: other commits with identical runtime inputs can produce the same bytes.

Read-only IAP inspection fingerprinted all 36 deployed non-test `.js` files under `packages/world-data/dist`, `packages/engine/dist`, and `packages/server/dist`, plus five package/lock manifests. A fresh isolated export of that commit, `npm ci --ignore-scripts --no-audit --no-fund`, and dependency-ordered TypeScript builds reproduced **all 36 JavaScript hashes exactly**. Root package/lock and engine/server package manifests also matched exactly. The world-data package manifest is JSON-identical; converting the source's LF to CRLF reproduces its deployed hash exactly. The complete sanitized [fingerprint inventory](observer-p4-runtime-fingerprints-2026-10-03.json) records tool versions, hashes, and comparison scope.

VM Node is `v22.14.0`; the local byte-equivalence build used Node `v24.14.0`, npm `11.11.1`, and the lockfile-selected TypeScript version recorded in the inventory. Both the VM and local compiled outputs matched despite that Node difference. No runtime behavior equivalence or dependency-tree inventory is inferred from compilation hashes. The earlier `51276f5` candidate matched the lockfile and backup library but not the server/engine entry points; it is not the selected recovery source. One initial build began before dependency installation completed and failed; the completed installation followed by all three ordered builds succeeded.

Recovery preparation, without starting a server:

1. Export or check out the exact recovery commit into a fresh isolated directory. Retain its unchanged `package-lock.json`, the fingerprint inventory, and the selected immutable world bundle. Use a Node runtime supporting `node:sqlite`; the recorded VM version is `v22.14.0`.
2. Run `npm ci --ignore-scripts --no-audit --no-fund`, then `npm run build --workspace @mimir/world-data`, `npm run build --workspace @mimir/engine`, and `npm run build --workspace @mimir/server`, stopping on any failure. Compare every non-test backend JavaScript file and the package/lock manifests with the inventory; permit only the documented world-data manifest newline difference. Historical dependencies are recovery inputs, not a recommendation to replace current main with this old source.
3. For a separately authorized database recovery, retain the selected database, manifest, and accompanying `.bundles` directory together. Use the supplied backup CLI to restore into a new isolated destination and select its restored bundle root. No restore was performed here.
4. Preserve the existing private unit contract: `/opt/node/bin/node /opt/mimir/packages/server/dist/index.js`, port 8888, existing private owner-secret configuration, `AUTO_PULSE=false`, and one authoritative writer. Do not copy credentials into the recovery artifact. An actual service cutover requires separate authorization and stopping the existing writer first.

This links the current backend's bytes to a committed, reproducible recovery source. Firebase frontend and Cloud Run bridge identities are recorded separately above; this comparison does not claim the entire `/opt/mimir` tree or installed dependency tree matches one historical deployment archive.

## Independent recovery artifact and approved content verification

Metadata for the existing September 11 recovery archive was freshly read through the existing separate recovery identity. Metadata matches the historical [recovery test](hosted-backup-recovery-2026-09-11.md): generation `1789166774423545`, size 37,774 bytes, MD5 `JEPmC03DjaLV4eCWB1/Eyw==`, CRC32C `TA9GsQ==`, update time `2026-09-11T22:46:14Z`.

The retained manifest record identifies a 430,080-byte database, SHA-256 `a729277e1a348b409bb40ea8e96f6f7a072ff4e2a5a1d5550523c8dd77956d4f`, and the same First Glow bundle. Historical tests recorded an isolated restore, continued pulse, and rejection of a missing asset. These were not rerun, and this old pulse-4 archive must not be treated as the current pulse-0 timeline or as a fresh backup.

The initial archive download was rejected by automatic approval review because it could copy private database contents beyond the metadata audit. The user subsequently explicitly approved downloading this existing archive into isolated, ignored `.tmp/269` solely to verify its manifest and hashes, without restoring it. The approved download and in-memory tar-member verification completed at **2026-10-04 01:46:36 UTC / October 3, 20:46:36 CDT**. No archive member was extracted to disk and no restore or database startup was performed.

- Archive: 37,774 bytes; MD5 matches the freshly read object metadata above. SHA-256 `7dd8c6ef1b00d5bf01874f3af02535323f82216f548ea667c0e74851d4d5b0af`.
- Manifest: `mimir-staging-p5-backup.db.manifest.json`, SHA-256 `49492910b7a952533b1a3aab125ba14b538b47796db05ebbcb08e0ac5ebd3114`.
- Database: 430,080 bytes; SHA-256 matches the manifest and historical value above.
- All seven manifest-listed bundle files exist in the archive and match their recorded SHA-256 values; the manifest lists the same First Glow bundle.

This closes the fresh independent manifest/content verification gap. It verifies this historical recovery unit, not a fresh backup, semantic restore, or a successful VM cutover. Scheduled independent replication and freshness were not established by this audit. The private archive and inspection script remain ignored local artifacts and are not committed.

## Stop and recovery plan

1. Keep #272 rehearsal stopped until its separate audience/window/telemetry gates are resolved. An observed identifier is not permission for disruption.
2. During any later approved rehearsal, immediately close participant sessions on unexpected auth exposure, write behavior, checkpoint changes, resource/error threshold breach, or unavailable cleanup evidence. Recheck active-stream baseline; closing tabs alone does not prove server cleanup.
3. Preserve the one authoritative paused VM and its existing recovery units. Do not reset/pulse, expose the VM, add a scheduler/writer/database, or change IAM to work around failure.
4. For a Hosting-only regression, stop observation first, evaluate the known prior release's asset regression, and obtain approval before the console rollback. Verify the selected release and auth/rendering afterward.
5. For bridge recovery, use exact-revision traffic recovery only after compatibility review and authorization. Re-read traffic and auth/SSE behavior; retained retired metadata is insufficient.
6. For database recovery, select the intended checkpoint and recheck the approved independent unit identity and manifest integrity first. Under separate restore authorization, restore to a new isolated destination using the backup CLI and its accompanying bundles, with no scheduler or listener started. Validate checkpoints and bundle integrity before any proposed replacement. Shut down the sole live writer before a separately approved cutover; never run a second writer against live state.
7. Keep the current source/byte fingerprints, backup identities, selected checkpoint, and post-recovery evidence together. A deployment, traffic switch, or copied database is not recovery success.

Documentation verification: local links/content, public-field redaction, and whitespace checks. No simulation suite was run for this documentation-only audit. Issue #269 now has its recovery-source linkage and read-only acceptance evidence; closure awaits this PR merge. #257/#253 retain their broader limitations.
