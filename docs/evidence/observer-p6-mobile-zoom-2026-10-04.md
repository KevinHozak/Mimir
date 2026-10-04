# Observer-P6: local mobile zoom verification

Issue: [#271](https://github.com/KevinHozak/Mimir/issues/271). Local branch: `codex/271-mobile-observer-zoom`, based on main commit `8d14b82663f9c5cf3b51c0fc5b7d1c527cc044d3`.

## Reproduction and correction

The signed-in read-only observer was reproduced locally with a synthetic auth adapter, an isolated SQLite database, and automatic pulses disabled. No real account, hosted writer, or cloud configuration was used or changed.

At 390 × 844, the old panel occupied x=14–274, while Zoom in occupied x=332–368, Fit map x=374–410, and Zoom out x=416–452. Document overflow was false; the latter two controls were clipped and failed hit testing.

Mobile rules assigned `flex: 1 1 100%` to both rows in a column panel with a fixed height and wrapping enabled. The zoom row wrapped into a second column. The correction disables panel wrapping and gives each row a fixed 36px flex basis. The compact two-row design and desktop placement remain intact.

## Verification

- Root four-package build passed. Vite retains its existing large-chunk warning.
- Focused `npm run test:observer-zoom --workspace @mimir/web` checks 390, 375, 320, 800, and 1280 CSS-pixel viewport widths at 844px height. Every zoom button must fit the panel and viewport, pass center-point hit testing, and respond to clicks by changing or restoring the canvas camera zoom. Document horizontal overflow must remain false.
- Corrected mobile button bounds: x=84–120, 126–162, and 168–204; all three are 36px high. Desktop bounds at 1280: x=1012–1048, 1054–1090, and 1096–1132.
- Existing First Glow owner header desktop/mobile checks and hosted auth-boundary checks passed. The observer test checks token-bearing world requests and rejects browser owner requests or writes.
- Captures use the active bundle `sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e`. Desktop/mobile images were visually inspected. Captures contain no real account identifiers or cloud billing/storage details.

| Width | Capture |
| --- | --- |
| 390 | [Mobile](observer-p6-390-2026-10-04.png) |
| 375 | [Narrow mobile](observer-p6-375-2026-10-04.png) |
| 320 | [Smaller mobile](observer-p6-320-2026-10-04.png) |
| 800 | [Breakpoint](observer-p6-800-2026-10-04.png) |
| 1280 | [Desktop](observer-p6-1280-2026-10-04.png) |

## Remaining hosted gate

This is local browser evidence with synthetic authentication, not a real Google sign-in or hosted deployment verification. Auth and bundle-loading implementation are unchanged. An attempted additional rendered SVG-response check did not observe the required asset requests in this local harness, so it is not evidence that all hosted SVGs load. After merge and authorized deployment, verify real authenticated bundle assets, zoom behavior, element bounds, and overflow against the deployed build before closing the hosted gate. This does not complete #272 or #257.
