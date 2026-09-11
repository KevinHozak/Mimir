# First Glow Audio-P5 validation

Date: 2026-09-10
Branch: `codex/audio-p5-validation`
Scope: issue #90, accessibility, persistence, replay safety, and browser resource validation.

## Automated checks

Run from the repository root:

```text
npm run build
npm run test:first-glow-audio --workspace @mimir/web
npm run test:first-glow-settings --workspace @mimir/web
npm run test:first-glow-audio-p5 --workspace @mimir/web
```

The Audio-P5 browser check starts an isolated server/database and verifies:

- no audio asset request or playback path is entered before the explicit `Enable audio` gesture;
- the five music tracks and twelve effect assets are each requested once after enablement;
- ambience, score, effects volume, and mute controls are persisted and restored on reload;
- committed objective events remain visible while all audio is muted;
- history navigation does not load or replay audio assets;
- reduced-motion mobile mode retains the accessible audio controls, sets the runtime reduced-motion marker, and has no horizontal overflow;
- desktop and mobile review captures are saved beside this record.

The unit ledger regression covers an initial committed batch followed by the same replay/reconnect batch and asserts that event IDs produce no duplicate cues.

## Review boundary

The browser harness can verify request behavior, UI state, persistence, and readable visual evidence. It cannot verify a user's physical speakers/headphones, perceived balance, or fatigue over a ten-minute listening session. Those require a manual desktop/mobile listening pass at ordinary and low volume, with ambience, score, effects, mute, and reduced-motion combinations. No such physical listening claim is made by this automated record.

## Captures

- [`first-glow-audio-p5-desktop.png`](first-glow-audio-p5-desktop.png)
- [`first-glow-audio-p5-mobile.png`](first-glow-audio-p5-mobile.png)
