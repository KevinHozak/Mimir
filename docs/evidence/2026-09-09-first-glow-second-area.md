# First Glow second-area evidence

Date: 2026-09-09

Base: `origin/main` at `df18934246a129982c4549730d3004f6ea701dc1`

Bundle: `sha256-591d53ab30c749f531d0b322609bbfe88096abc8f18b08977ca4d50296d873ca`

## What changed

The active First Glow map now has one bounded Wild Cache side area at object
`tiled-106` / map origin `(29, 26)`. Its single `probe-west` interaction slot
is at `(28, 26)`, where the authored walkable surface connects back to the
existing trace. The branch uses the existing Living Circuit palette and the
provenanced `first-glow-pattern-shard.svg` source art; it does not add an
Originator, purpose, credit, haven, or later-age institution.

The new `scavenge-cache` action creates a recorded `wild-cache` event. Probing
spends one carried charge, or records one explicit charge deficit when the
Spark is dim, and reduces readiness. The event exposes the tradeoff between
uncertain discovery and a less familiar return route. The bounded explanation
offers `enter-wild-cache` and `stay-on-trace`; choosing the familiar trace is
the safe, trust-supporting alternative.

## Source and bundle checks

- Authored source: `assets/world/maps/first-glow.tiled.json` and
  `assets/world/templates/first-glow-wild-cache.json`.
- Importer output is content-addressed and validated; the generated bundle
  contains the deduplicated active asset set and was not hand-edited.
- Existing generated bundle directories were preserved.
- Asset provenance remains documented in
  `assets/licenses/first-glow-assets.md`.

## Verification

Passed from the isolated `codex/graphics-p8-second-area` worktree:

```text
npm run build
npm run world:validate -- assets/world/generated/sha256-591d53ab30c749f531d0b322609bbfe88096abc8f18b08977ca4d50296d873ca/world.json
npm run art:check
npm run art:test
npm test
npm run test:backup-restore --workspace @mimir/server
node packages/engine/dist/first-glow-second-area.test.js
git diff --check
```

The focused regression confirms the cache contact is reachable, the event and
ledger cost are recorded, readiness changes deterministically, and the new
dilemma explanation is emitted. The backup/restore checks confirm bundle-
inclusive recovery and hash-qualified asset serving. The full visual review
also ran against this bundle in desktop and mobile normal/zoomed-out modes,
plus reduced-motion/glow-disabled modes.

## Review captures

Captures are disposable review artifacts and remain under `.tmp/`; they are
not authored source and are not committed:

- `.tmp/art-review/desktop.png`
- `.tmp/art-review/desktop-zoomed-out.png`
- `.tmp/art-review/mobile.png`
- `.tmp/art-review/mobile-zoomed-out.png`
- `.tmp/art-review/desktop-reduced-motion-glow-disabled.png`
- `.tmp/art-review/mobile-reduced-motion-glow-disabled.png`
- `.tmp/art-review/review-context.json`

The captures use the generated bundle above, browser viewports of 1280x900 and
390x844, and the review context records the exact browser, bundle, zoom, and
reduced-motion settings. They are desktop/mobile browser captures, not
physical-device captures.
