# Connected offline observer repair — 2026-10-22

Local issue: [MIM-S001](../../issues/MIM-S001.md). Base: main
`1d451d87f3e351f6caf814c89645d481502862da`, with the local implementation described
below. This follows the [original evaluation](first-glow-observer-evaluation-2026-10-22.md);
its original measurements and findings remain a historical snapshot.

## Result

The requested **selected Spark → personal Chronicle → exact recorded scene → same
live Spark** journey passes the offline checks. No provider calls, normal local-world
changes, deployment, commit, or push were part of this repair.

- New event rows retain Spark actor/participant identity and the structured event kind.
  Older rows recover attribution by exact ID and pulse from the original checkpoint's
  structured events, without rewriting rows or inferring identities from prose.
- Chronicle requests accept a selected Spark. Its editions have separate source/cache
  identities and retained revisions; rereading does not replace existing editions.
- Links carry the exact timeline and pulse, preserve event targets, and render the
  saved bundle and Spark positions. Missing/invalid checkpoints and absent Sparks are
  explicit. Request sequencing prevents stale responses replacing the current view.
- Historical selection is independent of the live return target. Changing to Spark 2
  in an archived scene still returns to the original Spark 6 and Follow presentation.
- Follow controls appear only in Follow. Historical speech targets use saved accepted
  utterances. Dark background and wrapped checkpoint identifiers support mobile reading.

## Repeated verification

The connected browser regression ran fixed seeds **4, 8, 2**, six Sparks each and
**80 authoritative rules-only pulses per cohort**. It checked personal chapters at
0/16/40/80, archived timelines, an earlier moment at pulse 4, evidence targets, rendered
canvas, reloads, 1440×900 and 390×844 viewports, changed historical selection, original
live return, absent Sparks, and missing checkpoints. Both executions passed; the final
execution observed the completed navigation code. Each test uses and removes its own
temporary database; its randomly allocated timeline IDs are not retained as an archive.

The original three evaluation timelines remain available in `.tmp/lives-p7/observer.db`
and are identified in the [original summary](lives-observer-2026-10-22/summary.json).
The updated built app was also inspected in the Codex in-app browser using that older,
previously unattributed history. Spark 6's archived seed-4 chapter lists **84 events**;
its pulse-4 chapter lists **5 events**. The linked pulse-4 scene keeps the archived
timeline and Spark 6. A manual mobile round trip through historical Spark 2 restored
live Spark 6. The mobile document measured 375 pixels of content in a 390-pixel viewport.

| Check | Result |
| --- | --- |
| Root build, followed by affected engine/server/web rebuilds | Passed |
| `npm test` | Passed |
| Engine durable-history/attribution and Chronicle tests | Passed |
| Server `test:chronicle` including selected-edition restart persistence | Passed |
| Web `test:history` including the three-cohort connected regression | Passed |
| Existing web `test:history-viewer`, `test:first-glow`, `test:first-glow-audio-p5` | Passed |
| Server `test:state`, `test:first-glow-restart`, `test:backup-restore` | Passed |
| Saved-history hash comparison and provider accounting | Unchanged; zero calls |
| Scoped source review, local issue validation, links and whitespace | Verified at closeout |

Initial sandboxed server requests could not reach their child listener. Running the
isolated acceptance checks outside the sandbox resolved that environment failure.
The backup test's checksum-mismatch output is its expected tamper-rejection case;
the complete test exits successfully. Vite retains its existing large-chunk warning.

All **244 checkpoints, 952 persisted events, 341 interpretations**, and active-timeline
metadata in the original evaluation database retained identical before/after hashes
through the updated observer walkthrough and restart. See the
[repair verification summary](lives-observer-fix-2026-10-22/summary.json).
Narrator editions may be created by first reads; canonical simulation history stays unchanged.

## Scope and remaining findings

The issue remains open for the original evaluation's other findings: automatic launcher
origin configuration, Resonance fixture labeling, and independent human review. This
repair used the exact loopback `OBSERVER_ORIGIN` explicitly; it does not claim the
launcher integration finding is fixed. Hosted navigation and deployment remain separate.
The zero-conversation sample still cannot establish remembered speech, human engagement,
or AI benefit; no dialogue or social decisions were injected to manufacture that evidence.
This is a technical review, not a complete privacy audit or independent review.

## Captures and local review

- [Desktop archived scene](lives-observer-fix-2026-10-22/desktop-archived-scene.png)
- [Populated personal chapter](lives-observer-fix-2026-10-22/desktop-personal-chronicle.png)
- [Mobile historical identity](lives-observer-fix-2026-10-22/mobile-archive-identity.png)
- [Mobile archived scene and Follow](lives-observer-fix-2026-10-22/mobile-archived-scene.png)

The paused review app uses API 8898 / web 4189 and the original isolated evaluation
database. Open `http://127.0.0.1:4189/`; launcher session 81809 may be stopped after review.
No normal `data/local` database was used.
