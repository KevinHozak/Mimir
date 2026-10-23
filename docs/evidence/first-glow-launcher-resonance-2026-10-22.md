# Local launcher and Resonance examples — 2026-10-22

Local issue: [MIM-S001](../../issues/MIM-S001.md). Base: merged main
`79a3723c0a2d383f991e05c1c9d65c8e5c48f3a3`; this follow-up is local and uncommitted.
The [original evaluation](first-glow-observer-evaluation-2026-10-22.md) and
[connected-experience repair](first-glow-observer-fix-2026-10-22.md) remain historical evidence.

## Implemented behavior

- `npm start` derives the exact loopback preview origin, including a custom `WEB_PORT`,
  and supplies it to the API's existing CORS policy. Origins use URL canonicalization;
  invalid or ephemeral preview ports fail explicitly. Vite preview uses a strict port
  so an occupied port cannot silently change the allowed origin.
- Explicit `OBSERVER_ORIGIN` values take precedence. Empty overrides retain denial
  of cross-origin reads. Direct server startup keeps its existing default-deny policy.
- The observer labels the fixture panel **Resonance examples**, explains that the
  scenarios are separate from the world's recorded events, and labels disclosures
  **Example evidence**. The fixture API no longer mixes in live pulse/event counts.
  Missing fixtures remain an unavailable, empty example projection. Actual committed
  events and persisted Resonance Anchors keep their separate surfaces.
- Example cards wrap fixture IDs and evidence on mobile. The first regression caught
  an overflow, which was repaired before the passing checks and captures.

## Verification

Publication CI exposed an existing Windows-only npm lookup in the launcher on Linux
Node 22. The follow-up prefers npm's supplied `npm_execpath` and checks Windows/Unix
installation layouts for direct Node startup. Configuration tests cover each lookup,
and the real-launcher restart deliberately omits `npm_execpath` to exercise fallback.

`npm run test:local-observer` runs configuration cases plus the real production launcher
on dynamically allocated loopback ports and an isolated temporary database. It checks
GET reads, OPTIONS preflight, unrelated-origin rejection, explicit-origin override
precedence after restart, fixture provenance, absence of live-count fields, desktop
1440×900/mobile 390×844 rendering, nonempty actual recorded events, unchanged simulation
history hashes, and zero provider calls. CI now includes this check after browser setup.

Default/custom ports, standard-port and leading-zero canonicalization, invalid preview
ports, explicit API URLs, and empty-origin overrides have configuration coverage. The
actual launcher integration uses custom isolated ports; it does not occupy normal local
play ports or claim to test hosted deployment behavior.

The existing root core tests, First Glow browser checks, connected-history regression,
and hosted frontend auth-boundary checks are repeated for this follow-up. Final observed
results and source hashes are in the [verification summary](launcher-resonance-2026-10-22/summary.json).
No engine transitions, AI provider configuration, private knowledge rules, or owner
authorization rules were changed.

The review app at `http://127.0.0.1:4189/` was restarted without a manual observer-origin
override, using only `.tmp/lives-p7/observer.db`, `AUTO_PULSE=false`, and `AI_ENABLED=false`.
Its original 244 checkpoints, 952 events, 341 interpretations, and active-timeline
metadata retained identical hashes. Desktop/mobile inspection confirmed the notice,
expanded example evidence, readable wrapping, and separation from recorded facts.

- [Desktop examples and evidence](launcher-resonance-2026-10-22/desktop-examples.png)
- [Mobile examples](launcher-resonance-2026-10-22/mobile-examples.png)

The review launcher is session 67582. No normal local-world database, commit, push, PR,
or deployment was part of this follow-up. MIM-S001 stays open for independent human
review; human engagement and real-model benefit remain unassessed.
