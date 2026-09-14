# First Glow rendering evidence

Date: 2026-09-07
Issue: #24
Build: production Vite bundle

The browser regression run captured and visually inspected the following states:

- Desktop Chromium, 1280 x 900 viewport, device scale factor 1. The canvas backing store was 768 x 768 and its displayed box remained square.
- Mobile Chromium, 390 x 844 viewport, device scale factor 2. The canvas backing store was 1536 x 1536 and its displayed box remained square.
- Both states were inspected with the developer overlay off and on. Overlay labels remain compact and pixel-oriented only when enabled; production inspector and control text is browser-rendered.
- The run also exercised zoom, Fit, playback pulses, stable canvas identity, no horizontal overflow, and authoritative Spark coordinate equality on both pages.

Captures:

- `first-glow-desktop.png`
- `first-glow-desktop-overlay.png`
- `first-glow-mobile.png`
- `first-glow-mobile-overlay.png`

Remaining limitation: the dedicated browser run uses headless Chromium rather than a physical handset. The DPR-specific backing-store and responsive behavior are covered; physical-device optical inspection remains outside this automated evidence.
