# Structured world profile

Profile date: 2026-09-06 (America/Chicago)

- Bundle: `sha256-1f24c63c9168eb2e8d6a76be1b1d42c12b601ef9f3955a34a9cf25d4d2854564`
- Map: 8 x 8 cells, 8 authored objects, 12 first-village spawns
- Seed: `20260906`
- Simulation: 120 pulses, 12 actors, two consecutive engine runs
- Build: production Vite bundle
- Browser: Playwright Chromium headless, 1280 x 900 viewport
- Historical profile command: `node scripts/profile-world.mjs` (removed with the pre–First Glow village runtime)

Engine timings, measured per pulse:

| Run | Median | P95 | Max | Final pulse |
| --- | ---: | ---: | ---: | ---: |
| 1 | 8.39 ms | 17.06 ms | 52.06 ms | 120 |
| 2 | 6.92 ms | 8.98 ms | 11.97 ms | 120 |

Browser frame timings over 120 `requestAnimationFrame` samples with the overlay initially off: median 16.70 ms, P95 33.30 ms, maximum 183.30 ms. The browser profile was run against an isolated server/database and dedicated API/web ports; the temporary database was removed after shutdown.

The developer overlay was an explicit `Show IDs` / `Hide IDs` control in the historical map toolbar. Browser automation toggled the control and verified the state transition. A production-preview comparison from the historical `node scripts/profile-overlay.mjs` measured overlay-off median/P95/max of 16.70/16.80/166.60 ms and overlay-on 16.70/16.80/16.80 ms over 120 frames. The large overlay-off maximum is an observed isolated-run outlier, not a target or claim of a guaranteed frame budget. This report is retained for historical comparison; use `npm run profile:first-glow` for current profiling.
