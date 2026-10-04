# Observer-P4 recovery identity audit — 2026-10-03

## Disposition

Issue [#269](https://github.com/KevinHozak/Mimir/issues/269) is **partially verified, not closed**. Available Hosting rollback, bridge revision metadata, the authoritative VM process/checkpoint, and an existing local bundle-inclusive recovery unit were read. The independent historical recovery object remains available through its existing recovery identity. A fresh independent manifest-content check and exact VM source-commit linkage remain unresolved. No rollback, restart, restore, deployment, world mutation, IAM change, key creation, or new writer was performed. Audience rehearsal #272 and final disposition #257 remain gated.

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

A single Node count supports the observed service shape; it is not a comprehensive OS-wide SQLite-writer proof. Exact VM source commit and a complete source recovery package remain gaps.

The latest existing local manifest by file modification time was `/var/lib/mimir/backups/mimir-2026-10-03T01-15-51.145Z-interval.db.manifest.json` (backup-name timestamp October 2, 20:15:51 CDT). In-place read/hash verification returned:

- Manifest SHA-256 `dc162110b385944b4ec3b236047910bae18ea1ffe0acc5e3964225fb95e7c735`.
- Database exists, size 114,688 bytes, matching manifest; SHA-256 `e2e3c35427c70500de03c1414a50d27f65c0aebdd46faff530dc0400e23bc19f` matches.
- Bundle `sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e`; all seven manifest-listed bundle files exist and match their SHA-256 values.
- Backup SQLite read-only checkpoint summary: timeline `main`, one checkpoint, pulse 0.

This verifies an available local bundle-inclusive unit, not independent durability, full semantic restore validation, or a successful restore. No new backup was created.

## Independent recovery artifact and remaining blocker

Metadata for the existing September 11 recovery archive was freshly read through the existing separate recovery identity. Metadata matches the historical [recovery test](hosted-backup-recovery-2026-09-11.md): generation `1789166774423545`, size 37,774 bytes, MD5 `JEPmC03DjaLV4eCWB1/Eyw==`, CRC32C `TA9GsQ==`, update time `2026-09-11T22:46:14Z`.

The retained manifest record identifies a 430,080-byte database, SHA-256 `a729277e1a348b409bb40ea8e96f6f7a072ff4e2a5a1d5550523c8dd77956d4f`, and the same First Glow bundle. Historical tests recorded an isolated restore, continued pulse, and rejection of a missing asset. These were not rerun, and this old pulse-4 archive must not be treated as the current pulse-0 timeline or as a fresh backup.

Automatic approval review rejected downloading this archive into the local checkout because it may copy private database contents beyond the metadata audit. No archive download occurred and no alternate route bypassed that rejection. Fresh independent manifest/content verification therefore remains blocked pending explicit user approval for a private, isolated inspection destination. Metadata equality supports retained-object identity but does not independently inspect its manifest today. Scheduled independent replication and freshness were not established by this audit.

## Stop and recovery plan

1. Keep #272 rehearsal stopped until the source/content gaps above and its separate audience/window/telemetry gates are resolved. An observed identifier is not permission for disruption.
2. During any later approved rehearsal, immediately close participant sessions on unexpected auth exposure, write behavior, checkpoint changes, resource/error threshold breach, or unavailable cleanup evidence. Recheck active-stream baseline; closing tabs alone does not prove server cleanup.
3. Preserve the one authoritative paused VM and its existing recovery units. Do not reset/pulse, expose the VM, add a scheduler/writer/database, or change IAM to work around failure.
4. For a Hosting-only regression, stop observation first, evaluate the known prior release's asset regression, and obtain approval before the console rollback. Verify the selected release and auth/rendering afterward.
5. For bridge recovery, use exact-revision traffic recovery only after compatibility review and authorization. Re-read traffic and auth/SSE behavior; retained retired metadata is insufficient.
6. For database recovery, obtain approval to inspect/download the independent unit and verify its complete manifest first. Under separate restore authorization, restore to a new isolated destination using the backup CLI and its accompanying bundles, with no scheduler or listener started. Validate checkpoints and bundle integrity before any proposed replacement. Shut down the sole live writer before a separately approved cutover; never run a second writer against live state.
7. Keep the current source/byte fingerprints, backup identities, selected checkpoint, and post-recovery evidence together. A deployment, traffic switch, or copied database is not recovery success.

Documentation verification: local links/content, public-field redaction, and whitespace checks. No simulation suite was run for this documentation-only audit. Issue #269 stays open for independent manifest verification and exact VM source/recovery linkage; #257/#253 retain their broader limitations.
