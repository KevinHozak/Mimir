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