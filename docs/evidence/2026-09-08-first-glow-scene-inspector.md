# First Glow scene and Spark inspector evidence

Date: 2026-09-08

The First Glow web path now uses focused lifecycle, scene-query, asset-loading, Spark-rendering, playback, and overlay modules. The inspector exposes region/cell, contact, destination, activity, status and wait reason, committed travel progress, charge, charge deficit, and readiness. Stable user-facing labels are shown by default; raw IDs remain developer-only.

Verified with:

- `npm run build`
- `npm run test:first-glow --workspace @mimir/web`
- `git diff --check`

The browser acceptance run passed on desktop and mobile, including square-map rendering, asset loading, tooltip overlays, playback across committed pulses, inspector parity, and raw-ID redaction. Captures: `first-glow-desktop.png`, `first-glow-mobile.png`, `first-glow-desktop-overlay.png`, and `first-glow-mobile-overlay.png`.
