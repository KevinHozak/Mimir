# Wild Cache choice before probing — 2026-11-09

Status: local implementation, not published or deployed. This responds to S001's finding that clearer summaries still need meaningful choices and consequences. It does not close S001's interest gate.

## Implemented rule

`choice-before-probe-v1` is an explicit fresh-history engine opt-in. Use the fifth factory argument `{ wildCacheChoice: true }` or `initializeWildCacheChoice` at pulse zero. Existing untagged histories and normal server creation defaults retain their earlier rules. No existing recording, bundle, study protocol or Chronicle edition is rewritten.

The choice occurs at validated Wild Cache contact, before probe effects, rather than before traveling to the cache. Earlier travel remains spent. A Spark probes only with at least three carried charge, no charge deficit, at least 75 readiness, and a reachable Pattern Shard. Otherwise it conserves. This is a deterministic reserves-and-reachability rule, not a claim about private motives or a personality-score contest.

| Path | Immediate recorded consequence | Follow-up |
| --- | --- | --- |
| Probe | Spend one charge and two readiness; survey one real route to a Pattern Shard, with navigation cost and revision | Prioritize shaping a pattern after immediate needs and fresh route checks |
| Conserve | No probe charge/readiness cost, no route fact, no probe event | Seek reachable charge or shelter; idle if neither recovery route is available |

The new contact rule has exactly the listed costs; it does not additionally apply the legacy generic probe activity strain/sustenance. It prevents automatic repeated cache decisions. Other Sparks do not automatically learn the surveyed fact. Conserving interrupts a pending probe intention rather than falsely completing it. The decision, immediate outcome and actual next goal have linked evidence; a goal or route fact does not prove eventual arrival or discovery. Chronicle rendering consumes these records without generation calls.

## Fresh histories

[Structured results](first-glow-cache-choice-2026-11-09.json) contain reproducible history hashes and decision pulses. Each run advances 80 pulses and is compared with a run restarted from a JSON checkpoint at pulse 40.

- Unmodified authored spawns, six Sparks: seeds 2 and 8 conserve at pulse 52; seed 4 conserves at pulse 48, all for Spark 6
- Controlled pulse-zero cache-contact scenarios: Spark 1 starts with five charge and either 90 readiness (probe) or 70 readiness (conserve)
- The controlled probe surveys the route to `tiled-104`, costing 16 navigation units at revision zero, then records shaping a pattern as the next traveling goal
- The controlled conservation records seeking shelter as the next traveling goal
- All five histories match their restarted equivalents

The probe outcome is demonstrated in controlled fresh histories, not observed in the three ordinary spawn runs. These results establish mechanics and replay, not natural outcome diversity, gameplay balance, sustained engagement or real-model benefit. Human review of the new histories remains outstanding.

Disposable initial/final checkpoints, full event streams, generation harness, read-only recording hashes and test logs are under `.tmp/wild-cache-choice/`. The committed regression tests cover both branches independently of that disposable harness.

## Verification

- Four-package production build and root world-data/engine tests (102 reported tests, zero failures)
- Six new choice regressions: exact costs/order/private knowledge and Chronicle links; conservation; legacy behavior/fresh opt-in; invalid contact and malformed records; intention truthfulness; autonomous replay without repeated decisions
- Existing intention regression suite (10 tests including the six choice regressions, zero failures)
- Server state normalization and partial-travel restart equivalence, using isolated disposable state and localhost servers with AI disabled
- Read-only SQLite row hashes before/after for `timeline_checkpoints`, `timeline_events`, `timeline_interpretations`, `runtime_metadata` and `timelines` match in all three existing review databases: `.tmp/lives-p7/observer.db`, `.tmp/s001-human-2026-11-09/observer.db` and `.tmp/s001-journey-2026-11-09/observer.db`
- `git diff --check`

The restart check initially used the wrong working directory, then hit sandbox-local server startup restrictions. Running from the server workspace with localhost execution allowed passed. No inference, countTokens or other paid provider calls were made. Existing running observers were not advanced. No browser human review or full `verify:local` publication run is claimed.
