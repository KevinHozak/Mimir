# Hosted observer live status — 2026-09-26

## Read-only verification

Review window: **2026-09-26**, America/Chicago. No hosted settings, traffic allocation, data, or configuration were changed.

### Firebase Hosting

- The current release panel displayed short hash `470f8e`, deployed **2026-09-14 at 7:58 PM** local time. The complete release ID and source commit were not available in the read-only view.
- The authenticated page at [mimir-realm.web.app](https://mimir-realm.web.app/) loaded the observer navigation and First Glow state: pulse 0, 12 Sparks, and 7 sites. It showed observer controls and no owner controls.
- GitHub `main` was at `11c4f2e705da6a81b921d859661accadab571e7e`, merged 2026-09-20. The observed Hosting release predates that commit, so this check does not establish that the latest merged source is deployed.

### Cloud Run bridge

- The configured bridge was **Available / healthy and serving traffic**.
- Current revision: `mimir-observer-bridge-00004-qff`, receiving **100%** of traffic. Console deploy time: **2026-09-13 16:25 CDT**.
- The seven-day metrics view did not show populated series at review time. This is not a traffic, capacity, or billing measurement.

## Limits and follow-up

This check confirms the authenticated observer and bridge were reachable at review time. It does not identify the deployed frontend source commit, test an unauthenticated API request, or establish supported audience size, service availability, cost, SSE reconnect behavior, or archive operation during a live outage.

Still outstanding are expired, wrong-project, and unapproved-user token rejection; authenticated SSE refresh/reconnect/closure; bridge-process restart; archive playback during live unavailability; multi-viewer and transfer/load measurements; billing observation; and fresh isolated recovery evidence. Keep the limited authenticated boundary until these checks are completed and recorded.

The local repository checkout was behind the verified GitHub default branch during this review. Do not deploy from that stale checkout.

## Earlier evidence-source and access recheck — 2026-09-26

This records the approximately 7:55 PM CDT check. Its access limitation was resolved by the later, timestamped console recheck below.

The console observations above are the authorized read-only source for the Firebase Console Hosting release panel, the authenticated observer page, and the Google Cloud Console Cloud Run service health and revision traffic view. The report records the values visible on 2026-09-26 in America/Chicago, but the exact capture time was not retained. It does not include a complete Hosting version ID, a source commit shown by the console, or an exported console audit record. The service revision and 100% traffic value are therefore point-in-time console observations, not independently re-read deployment metadata.

At approximately 7:55 PM CDT, this execution environment could not refresh those observations:

- `gcloud auth list --format=json` reported no active Google Cloud account.
- Firebase CLI access was unavailable because its local configuration/update store could not be accessed, and the CLI exited with an unexpected error. No sign-in or configuration changes were attempted.
- The public Hosting URL was inaccessible through the available web reader. A public page response would not, in any case, reveal the complete Hosting release ID or Cloud Run traffic allocation.

The repository's authorized operational route is documented in [the hosted observer runbook](../hosted-observer-runbook.md): an authenticated operator reads the Firebase Hosting release panel and Cloud Run service/revision traffic view. The repository's `npm run deploy:hosting` script is a deployment-and-verification path that requires an authenticated Firebase CLI and a clean checkout exactly at `origin/main`; it is not an independent hosting control plane, and it was not run. No deployment workflow was present under `.github/workflows` at this review.

At the original console review, GitHub `main` was `11c4f2e705da6a81b921d859661accadab571e7e`; the observed Sep 14 release predates it, and the console did not expose a source commit. `main` later advanced to `5f3392c6441ea722c6644aeedbd443c51332acab` (merged 2026-09-26 at 7:41 PM CDT; docs-only merge). At that earlier review, the Hosting build/source match had not been verified against either commit, and the Sep 14 release plus Sep 13 bridge revision/traffic were still only recorded snapshots.

**Remaining visibility gap at the earlier review:** an authorized operator with Firebase and Google Cloud console access must capture the complete current Hosting version ID and displayed source/build identity (if available), compare it with current `main`, and re-read the bridge's serving revision and traffic split. Until then, neither current deployment identity nor current traffic allocation is claimed.

## Fresh authenticated console recheck — 2026-09-26

Verification timestamp: **2026-09-26 21:36:23 CDT** (**2026-09-27 02:36:23 UTC**). Firebase Console and Google Cloud Console were opened through the existing authenticated browser session. These were read-only views; no hosting settings, service configuration, revisions, or traffic allocation were changed.

### Firebase Hosting

- **Evidence source:** Firebase Console, Hosting > Manage site > Releases. The current release row displayed hash suffix `470f8e` and deploy time **2026-09-14 7:58 PM CDT**. The current console view does not show the full version ID or a Git commit.
- The retained [Hosted-P17 operational closeout](hosted-p17-operational-closeout-2026-09-14.md) records a post-deploy recheck of Firebase version `82cc93e9b9470f8e` deployed from `origin/main` commit `fbd4eb8dbdbf94c78c482030fd5609011de88bab`. The live console suffix `470f8e` matches the last six characters of that version ID, so the displayed current release maps to that previously verified version and source commit. The source commit is established by the retained deployment evidence, not displayed directly in the current Hosting panel.
- **Comparison:** a fresh Git fetch placed `origin/main` at `843eb12edc9e4aaf1ce7dce9d3f18c0385c2ee50`. The recorded Hosting source commit is an ancestor, with 54 commits now reachable after it. The currently served frontend therefore predates current `origin/main`.

### Cloud Run bridge

- **Evidence source:** Google Cloud Console, Cloud Run > service details > Revision History, with the current revision selected.
- The service was marked healthy and serving traffic. Revision `mimir-observer-bridge-00004-qff` received **100%** of traffic (shown as 100% to latest); the console listed deployment time **2026-09-13 16:25:03 CDT**.
- The selected revision's details showed **no build information available** and **no source information available**. Its source commit cannot be established from the current console view.

### Result and remaining visibility gap

Authenticated read access to both consoles is confirmed. The live Hosting release is identified through its matching version suffix and the retained deployment record, and is behind current `origin/main`. The active Cloud Run revision and traffic split are recorded, but its source/build linkage remains unavailable. No deployment was run; the prior stale-checkout restriction was respected.
