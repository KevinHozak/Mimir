# Offline Living Lives observer evaluation — 2026-10-22

Follow-up: the [connected observer repair and repeated checks](first-glow-observer-fix-2026-10-22.md)
record the later local implementation. Findings below describe the original evaluation state.

Local issue: [MIM-S001](../../issues/MIM-S001.md). Source: `1d451d87f3e351f6caf814c89645d481502862da` on main. This is an agent technical/usability walkthrough, not an independent human review or evidence of real-model benefit.

## Disposition

**The recorded simulation is intact, but the connected World → Follow → Chronicle → supporting scene experience does not pass its navigation and storytelling gates.** The gaps below were observed in the current UI and checked against source. No simulation or UI fixes were implemented during the evaluation.

## Protocol and runs

The protocol was recorded before execution in MIM-S001. Three fixed seeds (2, 4, 8), six Sparks, 80 server-authoritative rules-only pulses per run, checkpoints 0/16/40/80, and the current default bundle `sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e` were retained. Execution order was 4, 8, 2 so seed 2 remained the paused active world for the full walkthrough. Resets archived earlier cohorts; parent IDs reflect administrative reset lineage, not inherited simulation experience. A boot-created main/pulse-0 checkpoint is outside the three cohorts.

The database is `.tmp/lives-p7/observer.db`; API port 8898 and preview port 4189 are isolated from normal local play. `AUTO_PULSE=false`, `AI_ENABLED=false`, loopback binding, and a disposable owner token were used. There were no provider calls, injected conversations/social decisions, owner-created Anchors, or replacement seeds. The launcher was restarted once to set `OBSERVER_ORIGIN=http://127.0.0.1:4189` after browser CORS failures; histories were retained unchanged.

| Seed | Timeline suffix | Events | Sharing events | Rules interpretations / commitments | Conversations | Persistent intentions |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 2 | b81be67e-dfc9-4ba8-98f9-178f4065097d | 323 | 79 | 118 | 0 | 0 |
| 4 | 7c1da76a-c14b-4e13-88d7-9fd7dfd889d6 | 306 | 69 | 105 | 0 | 0 |
| 8 | 8363a343-7f6d-4d51-bcde-a0b9c7ef5d02 | 323 | 79 | 118 | 0 | 0 |

See [sanitized configuration, checkpoint hashes, and results](lives-observer-2026-10-22/summary.json). Local replay inputs and full run exports remain under `.tmp/lives-p7/`; those ignored files are not a durable published archive.

## Experience tasks

Desktop inspection used 1440×900; mobile-sized inspection used 390×844. These are local browser viewports, not physical-device or hosted acceptance. Seed 2 received the full World/Follow/Chronicle walkthrough. Seeds 4 and 8 were cross-checked through the recorded-timeline selector and their saved history/Chronicle payloads. Manual checkpoints 0, 16, 40, and 80 were inspected across the walkthrough; the quiet starting checkpoint remained explicit rather than acquiring an invented story.

| Task | Result | Observation |
| --- | --- | --- |
| Identify a Spark and its present state | Pass | Spark 6's signature, position, charge deficit, readiness, destination, and traveling status are visible. |
| Enter Follow and use immersive/explanatory controls | Pass, with gaps below | Follow reports tracking the committed Spark; mobile controls remain usable. |
| Explain a lasting choice from the Follow panel | Gap | No recorded intention or conversation was present; the selected Spark's recorded-encounter panel was empty at pulse 80. The separate explanations panel supplies scoring/evidence, but does not establish a later personal narrative. |
| Open that Spark's Chronicle | Fail | Following Spark 6 and clicking the global Chronicle link produces Spark 1's empty personal chapter, without carrying the selected Spark. |
| Open the cited timeline and pulse | Fail | A URL naming pulse 1 still shows pulse 80; an archived timeline link loads the active timeline instead. |
| Open a recorded scene or Follow a historical Spark | Fail | The scene link returns the text HistoryViewer, with zero canvas elements and no Follow control. The First Glow World header exposes no checkpoint selector. |
| Return to prior live context | Gap | Return to live loads the active world at 80, but resets selection to Spark 1 and view to World. |
| Distinguish facts, interpretation, and examples | Mixed | Facts/readings sections and historical notices are explicit; Resonance contract examples are misleadingly presented as committed evidence. |
| Read on mobile | Pass for controls, usability gap | No page-wide horizontal overflow was measured; long timeline/bundle metadata occupies most of the first screen before the Chronicle. |

## Prioritized findings

### P1 — Evidence links do not restore timeline or pulse

Reproduce: open Chronicle at active seed 2/pulse 80, then click `event-1-spark-1-movement`. The URL contains `pulse=1`, but the checkpoint selector and selected historical state remain 80. Select archived seed 4 and click its same event link: the URL names seed 4, while the selector returns to active seed 2/pulse 80. No element has the cited event ID. Manually selecting a checkpoint/timeline works, but requires the reader to repair the navigation.

Cause: `HistoryViewer` initializes timeline/pulse to null and calls `load()` without reading URL parameters (`packages/web/src/main.tsx:785–795`). Evidence links add URL parameters, but the recorded-outcome paragraphs also lack event-ID targets (`main.tsx:808–811`). The implication is incorrect evidence context, not altered saved history.

### P1 — Personal chapters lose actor attribution

Every cohort has hundreds of events and sharing activity, yet all three personal chapters say no personal history is available. All 952 persisted server events lack `actorId` and `participants`. The moment picker selects the first movement at pulse 1, and the season chapter ends with eight movement messages rather than explaining a consequential life.

`mapFirstGlowEvents` discards structured actor/participant fields and maps specific event kinds into coarse WorldEvent kinds (`packages/engine/src/index.ts:36,67`). Chronicle's notable-event and personal filters expect the original kinds and actor fields (`packages/engine/src/chronicle.ts:50–67`). This disconnect prevents existing activity from becoming an attributable personal chapter. It is not evidence that the simulation produced no activity.

### P2 — World, Follow, and scene navigation do not share context

The global Chronicle link carries no Spark, encounter, pulse, or return target (`packages/web/src/main.tsx:824`). `open recorded scene` targets the same text history page; there is no rendered historical world there (`main.tsx:801–818`). Return to live starts selection afresh. Additionally, the inspector displays `FOLLOW / Spark 1` and “Camera paused by manual intervention” while the main element's actual view is `world`; selection is passed as `followSparkId` even outside Follow (`main.tsx:769`, `first-glow.tsx` Follow controls).

### P2 — Local launch requires an origin that the launcher does not supply

With the isolated ports, GET read endpoints returned 200 but no `Access-Control-Allow-Origin`; browser fetches failed. SSE still populated part of the UI while event/readings feeds stayed empty and a load error remained. The server registers CORS with `process.env.OBSERVER_ORIGIN?.trim() || false` (`packages/server/src/index.ts:137`); `scripts/run-local.mjs` does not derive the preview origin. Setting the exact local preview origin restored loading. The stock launcher also separates API and preview ports, so this is a relevant launcher integration gap; no LAN/hosted policy was widened during evaluation.

### P2 — Contract examples are presented as committed Resonance evidence

The normal observer shows `qualifying-shelter-pattern`, `spark-a/spark-b/spark-c`, and a “Committed evidence” disclosure beside a live-event count, although these are not the six Sparks in the run. `/api/resonance` explicitly sources `docs/resonance-anchor-fixtures.json` (`packages/server/src/index.ts:235–247`), while `ResonanceReview` labels it observations over committed evidence (`packages/web/src/main.tsx:491–502`). Keep contract demonstrations visibly distinct from the current world's outcomes before using this panel in a viewer study.

### Evaluation limits — Conversation and individuality remain unproven

All three ordinary rules-only runs had zero recorded conversations and persistent intentions. The default six actors are named Spark 1–6, while the design bench displays different authored names. These runs cannot demonstrate remembered speech, a speech-to-memory-to-action chain, or human attachment to individuals. This absence was retained rather than repaired with fake-provider dialogue. It does not prove that the separately tested conversation contracts are broken, nor that AI would solve the gaps.

## Integrity and evidence boundaries

- All 244 saved checkpoints, 952 persisted events, 341 interpretations, and active-timeline metadata had identical before/after hashes across the restart and walkthrough. Provider calls and observed provider cost stayed zero. First Chronicle reads may create narrator editions; this is separate from immutable simulation checkpoints.
- The starting checkpoint explicitly describes a quiet record. No quotes were invented in the zero-conversation sample. Historical context and subjective-reading labels are present.
- No private model memory appeared in the inspected UI. This is not a complete API/privacy audit: full world-state responses and all hidden/future-evidence rejection paths were not exhaustively evaluated.
- Read-only observation of paused histories is verified; a new matched watched/unwatched live-scheduling experiment was not performed.
- Independent human recall, engagement, desire to return, and real-model benefit remain **unassessed**. No synthetic score substitutes for those gates.

## One recommended next improvement

Repair one evidence-preserving vertical slice: **selected Spark → attributable personal chapter → exact saved timeline/pulse/event in a rendered scene → return to the same live Spark**. Preserve actor/participant identity at the server event boundary and carry a single navigation context across the views. Acceptance should explicitly use an archived timeline and an older pulse, not just the current world's latest checkpoint. Keep fixture demonstrations labeled outside that slice. Then repeat this offline walkthrough before independent human review or any separately authorized provider evaluation.

## Captures and reproducibility

- [Desktop Follow](lives-observer-2026-10-22/desktop-follow.jpg)
- [Desktop Chronicle](lives-observer-2026-10-22/desktop-chronicle.jpg)
- [Empty personal chapter beside populated history](lives-observer-2026-10-22/personal-chronicle-gap.jpg)
- [Evidence-link pulse mismatch](lives-observer-2026-10-22/evidence-link-pulse-mismatch.jpg)
- [Mobile World](lives-observer-2026-10-22/mobile-world.jpg), [Follow](lives-observer-2026-10-22/mobile-follow.jpg), and [Chronicle](lives-observer-2026-10-22/mobile-chronicle.jpg)

Local generator: `node .tmp/lives-p7/run.mjs` (writes new isolated timelines; do not run it against normal local state). Hash readback: `node .tmp/lives-p7/integrity.mjs before` / `after`. UI checks used the Codex in-app browser. The paused review server is available at `http://127.0.0.1:4189/`; launcher session 51344 can be stopped after review. No runtime source, deployment, provider configuration, commit, or push was changed by this evaluation.
