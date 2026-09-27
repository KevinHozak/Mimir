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

## Evidence-source and access recheck — 2026-09-26

The console observations above are the authorized read-only source for the Firebase Console Hosting release panel, the authenticated observer page, and the Google Cloud Console Cloud Run service health and revision traffic view. The report records the values visible on 2026-09-26 in America/Chicago, but the exact capture time was not retained. It does not include a complete Hosting version ID, a source commit shown by the console, or an exported console audit record. The service revision and 100% traffic value are therefore point-in-time console observations, not independently re-read deployment metadata.

At approximately 7:55 PM CDT, this execution environment could not refresh those observations:

- `gcloud auth list --format=json` reported no active Google Cloud account.
- Firebase CLI access was unavailable because its local configuration/update store could not be accessed, and the CLI exited with an unexpected error. No sign-in or configuration changes were attempted.
- The public Hosting URL was inaccessible through the available web reader. A public page response would not, in any case, reveal the complete Hosting release ID or Cloud Run traffic allocation.

The repository's authorized operational route is documented in [the hosted observer runbook](../hosted-observer-runbook.md): an authenticated operator reads the Firebase Hosting release panel and Cloud Run service/revision traffic view. The repository's `npm run deploy:hosting` script is a deployment-and-verification path that requires an authenticated Firebase CLI and a clean checkout exactly at `origin/main`; it is not an independent hosting control plane, and it was not run. No deployment workflow was present under `.github/workflows` at this review.

At this report's original console review, GitHub `main` was `11c4f2e705da6a81b921d859661accadab571e7e`; the observed Sep 14 release predates it, and the console did not expose a source commit. After the report was created, `main` advanced to `5f3392c6441ea722c6644aeedbd443c51332acab` (merged 2026-09-26 at 7:41 PM CDT; docs-only merge). The Hosting build/source match remains unverified against both commits. The Sep 14 release ID and Sep 13 bridge revision/traffic above are the latest recorded console values, not newly confirmed live values as of this recheck.

**Remaining visibility gap:** an authorized operator with Firebase and Google Cloud console access must capture the complete current Hosting version ID and displayed source/build identity (if available), compare it with current `main`, and re-read the bridge's serving revision and traffic split. Until then, neither current deployment identity nor current traffic allocation is claimed.
