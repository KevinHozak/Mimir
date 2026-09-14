# First Glow production art validation — 2026-09-09

## Tested result

The production Vite build was exercised against the retained First Glow bundle `sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601` at commit `5c83bd90a5b862e40c01a230e611d08efcf9ca50`. The fixture contained 12 Sparks, a 32×32 map, 5 authored map objects, 5 bundled art assets, and normal map activity over 120 pulses. The bundle reported one active art version, `first-glow-v3`.

Environment: Windows (`win32`), Node `v24.14.0`, production Vite bundle, Playwright Chromium headless. The run captured a desktop 1280×900 DPR1 view and a mobile 390×844 DPR2 reduced-motion view. Both loaded all five bundle-qualified asset requests, had no horizontal overflow, exposed keyboard focus, and kept the same canvas through committed pulses. The selected Spark inspector was exercised while sampling the workload.

Measured frame results:

| View | Frame p95 / max | Long tasks | Heap growth | Result |
| --- | ---: | ---: | ---: | --- |
| Desktop, normal motion | 50.1 / 100 ms | 1 / 55 ms | 0 B | Near the provisional 50 ms p95 / 500 ms total thresholds |
| Mobile, reduced motion, DPR2 | 116.8 / 233.4 ms | 124 / 12,863 ms | 0 B | Over provisional frame and long-task thresholds |

The mobile result is an accepted limitation for this validation slice, not a pass: DPR2 headless Chromium is not yet a supported performance target for the current art/effects treatment. It is a follow-up optimization gate before claiming broad mobile responsiveness. No physical-device review was available in this run, so physical-device appearance and thermals remain untested.

Restore coverage is provided by `packages/server/src/first-glow-backup.test.ts`: restore includes the bundle directory, fails safely when required bundle assets are missing, and preserves the historical asset bytes on successful restore. The production asset route was also observed requesting the content-addressed bundle assets during both captures.

Supplemental visual review captures from the existing art-review harness covered desktop/mobile normal and zoomed-out layouts plus reduced-motion/glow-disabled fallbacks. They use the same bundle and were inspected for dark Living Circuit composition, responsive stacking, readable focus/labels, and absence of horizontal overflow. Because that helper's fixture is its smaller visual-review fixture, the performance values above remain the separate twelve-Spark production validation.

## Disposable evidence

The complete JSON and PNG captures are intentionally not authored source and are ignored by Git:

`.tmp/art-validation/2026-09-09T22-40-22-311Z/validation.json`

`.tmp/art-review/review-context.json` and the six PNG captures listed there

The report distinguishes measured results above from visual aspirations. Living Circuit composition, restrained glow, state legibility, and future physical-device review remain design/review concerns beyond these automated measurements.
