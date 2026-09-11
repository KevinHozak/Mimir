# First Glow production performance profile — 2026-09-11

Status: **Measured production-preview evidence complete; mobile performance remains a documented limitation.**

## Exact run

The audit ran from the isolated issue worktree with disposable `.tmp` runtime state and dedicated ports:

```powershell
$env:VITE_API_URL = 'http://127.0.0.1:34144'
npm run build
node scripts/profile-first-glow.mjs
```

The web client was served by `vite preview` from `packages/web/dist`, not the Vite development server. The server used `AUTO_TICK=false`, a disposable SQLite path under `.tmp`, and owner-authenticated manual ticks. Each browser view reset the First Glow timeline with the same seed and then received 120 committed ticks while frame timing was sampled. Two independent deterministic engine runs also advanced 120 ticks over 12 Sparks.

## Reproducibility metadata

- Date: 2026-09-11
- Commit: `ebdadbf2ff7e32177d49c50dde2f226f5f2c950b`
- Bundle: `sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601`
- Runtime: Living Circuit / First Glow, 32×32 map, 5 objects, 5 assets, 12 spawns
- Seed: `20260911`; workload: 120 committed ticks; 12 Sparks
- OS: Windows `10.0.26200`; hardware: 11th Gen Intel Core i7-1195G7 @ 2.90GHz, 8 logical CPUs, approximately 63.8 GiB RAM
- Node: `v24.14.0`; browser: Playwright Chromium `153.0.8010.12`
- Browser views: desktop 1280×900 DPR1, desktop overlay 1280×900 DPR1, mobile 390×844 DPR2 with reduced motion

## Measurements

| View | Frame median / P95 / max | Long tasks | Heap growth |
| --- | ---: | ---: | ---: |
| Desktop, overlay off | 50.0 / 50.1 / 166.6 ms | 5 / 403 ms | 0 B |
| Desktop, overlay on | 16.7 / 33.4 / 166.7 ms | 1 / 164 ms | 0 B |
| Mobile DPR2, reduced motion | 100.0 / 116.7 / 216.7 ms | 118 / 11,182 ms | 0 B |

Engine timing over 120 ticks:

| Run | Median | P95 | Max | Final tick |
| --- | ---: | ---: | ---: | ---: |
| 1 | 44.68 ms | 302.76 ms | 1,989.19 ms | 120 |
| 2 | 45.29 ms | 75.77 ms | 88.21 ms | 120 |

## Fresh captures and interpretation

- [Desktop overlay off](first-glow-production-desktop.png)
- [Desktop overlay on](first-glow-production-desktop-overlay.png)
- [Mobile reduced motion](first-glow-production-mobile.png)
- Machine-readable result: [first-glow-production-profile-2026-09-11.json](first-glow-production-profile-2026-09-11.json)

The desktop and mobile captures were inspected at their requested viewports. The desktop profile shows the full First Glow observer with the Spark map, inspector, evidence panels, and controls. The mobile capture remains readable and stacked but is a narrow, very tall page. The mobile DPR2 measurements exceed the provisional frame and long-task thresholds; physical-device appearance, thermals, and broader device coverage remain untested. The desktop result is an isolated measurement, not a universal frame-budget guarantee. No claim is made that mobile performance is broadly acceptable.

The issue references `docs/planning/2026-09-06_World_Implementation_Plan.md` and its section 10.0a evidence ledger, but that historical planning file is not present in the current `origin/main` checkout. This current evidence packet preserves the requested exact checks, results, and limitations without recreating the retired planning document.
