# Structured world profile

Profile date: 2026-09-06 (America/Chicago)

- Bundle: `sha256-b8e2c3b01dfbf1f1710a28a4f8877640acbe56b42fd103612ae5d6ae54e9adae`
- Map: 8 x 8 cells, 8 authored objects, 12 first-village spawns
- Seed: `20260906`
- Simulation: 120 ticks, 12 actors, two consecutive engine runs
- Build: production Vite bundle
- Browser: Playwright Chromium headless, 1280 x 900 viewport
- Profile command: `node scripts/profile-world.mjs`

Engine timings, measured per tick:

| Run | Median | P95 | Max | Final tick |
| --- | ---: | ---: | ---: | ---: |
| 1 | 36.01 ms | 41.51 ms | 69.21 ms | 120 |
| 2 | 33.48 ms | 41.24 ms | 42.05 ms | 120 |

Browser frame timings over 120 `requestAnimationFrame` samples with the overlay initially off: median 16.70 ms, P95 33.30 ms, maximum 183.30 ms. The browser profile was run against an isolated server/database and dedicated API/web ports; the temporary database was removed after shutdown.

The developer overlay is now an explicit `Show IDs` / `Hide IDs` control in the map toolbar. Browser automation also toggles the control and verifies the state transition. This profile records the measured overlay-off run; an overlay-on timing comparison remains a follow-up before the W7 profile gate is closed.
