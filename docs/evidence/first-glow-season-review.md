# First Glow Season Review

Date: 2026-09-09
Runtime: first-glow, schema 3, 24 pulses, 6 Sparks
Bundle: sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601

This report preserves four fixed-control reviews with three seeds each. Ranges are min–max across matched runs; the representative history is the middle seed.

## Abundance baseline

Question: When charge remains dependable, do Sparks explore and cooperate without scarcity pressure?

Controlled variable: 24 source charge intake every fourth pulse; no losses

Expected observable: Stable charge access, exploration/trace activity, and a low final charge deficit.

Interpretation: Intended tradeoff: dependable supply should permit exploration and cooperation; this bounded run shows no immediate bug.

Seeds: 1101, 1102, 1103

| Measure | Range | Representative (1102) |
| --- | ---: | ---: |
| finalSourceCharge | 80–80 | 80 |
| finalChargeDeficit | 5–5 | 5 |
| averageReadiness | 92.17–92.17 | 92.17 |
| cooperationEvents | 26–26 | 26 |
| idleOrWaitingEvents | 32–32 | 32 |
| witnessedFacts | 144–144 | 144 |
| communicatedClaims | 3–3 | 3 |
| uncertainInferences | 0–0 | 0 |
| fulfilledCommitments | 3–3 | 3 |
| brokenCommitments | 0–0 | 0 |

Observed causal chain candidates (objective evidence only):
- Spark 3: pressure event-4-spark-3-draw (Spark 3 drew 8 charge.) → response event-6-spark-3-wait (Spark 3 is waiting: no reachable share-charge site.) → later event-24-spark-3-share (Spark 3 shared 1 charge with Spark 4.)
- Spark 4: pressure event-1-spark-4-movement (Spark 4 moved 1 cell(s).) → response event-2-spark-4-movement (Spark 4 moved 1 cell(s).) → later event-5-spark-4-movement (Spark 4 moved 2 cell(s).)
- Spark 5: pressure event-1-spark-5-wait (Spark 5 is waiting: no reachable seek-charge site.) → response event-2-spark-5-movement (Spark 5 moved 1 cell(s).) → later event-24-spark-5-share (Spark 5 shared 1 charge with Spark 3.)

Controlled interventions (not autonomous choices): weakening-pool-report/reveal-pool at pulse 6, shelter-or-trace/help-shelter at pulse 12, public-or-private-mark/make-mark-public at pulse 18

Representative non-movement events: event-1-spark-5-wait, event-1-spark-6-wait, event-4-spark-2-draw, event-4-spark-3-draw, event-4-spark-5-explore, event-4-spark-6-explore, event-5-spark-1-draw, event-6-spark-3-wait, event-6-spark-3-share, event-7-spark-3-wait, event-7-spark-3-share, event-8-spark-3-wait

## Supply scarcity

Question: When intake stops and charge is lost, does pressure increase deficit and shelter-seeking?

Controlled variable: No replenishment; 4 charge lost at pulses 8, 16, and 24

Expected observable: Lower remaining source charge, higher deficit/readiness pressure, and more idle or waiting events.

Interpretation: Intended tradeoff: lower supply should raise charge pressure; unresolved question: whether shelter recovery should outpace depletion.

Seeds: 1201, 1202, 1203

| Measure | Range | Representative (1202) |
| --- | ---: | ---: |
| finalSourceCharge | 0–0 | 0 |
| finalChargeDeficit | 45–45 | 45 |
| averageReadiness | 90–90 | 90 |
| cooperationEvents | 8–8 | 8 |
| idleOrWaitingEvents | 14–14 | 14 |
| witnessedFacts | 97–97 | 97 |
| communicatedClaims | 0–0 | 0 |
| uncertainInferences | 3–3 | 3 |
| fulfilledCommitments | 0–0 | 0 |
| brokenCommitments | 3–3 | 3 |

Observed causal chain candidates (objective evidence only):
- Spark 2: pressure event-4-spark-2-draw (Spark 2 drew 8 charge.) → response event-15-spark-2-wait (Spark 2 is waiting: no reachable share-charge site.) → later event-18-spark-2-share (Spark 2 shared 1 charge with Spark 6.)
- Spark 3: pressure event-4-spark-3-draw (Spark 3 drew 8 charge.) → response event-6-spark-3-wait (Spark 3 is waiting: no reachable share-charge site.) → later event-9-spark-3-share (Spark 3 shared 1 charge with Spark 4.)
- Spark 4: pressure event-1-spark-4-movement (Spark 4 moved 1 cell(s).) → response event-2-spark-4-movement (Spark 4 moved 1 cell(s).) → later event-5-spark-4-movement (Spark 4 moved 2 cell(s).)

Controlled interventions (not autonomous choices): weakening-pool-report/withhold-pool at pulse 6, shelter-or-trace/continue-exploration at pulse 12, public-or-private-mark/keep-mark-private at pulse 18

Representative non-movement events: event-1-spark-5-wait, event-1-spark-6-wait, event-4-spark-2-draw, event-4-spark-3-draw, event-4-spark-5-explore, event-4-spark-6-explore, event-5-spark-1-draw, event-6-spark-3-wait, event-6-spark-3-share, event-7-spark-3-wait, event-7-spark-3-share, event-8-spark-3-wait

## Information gap

Question: When local signals are available but communication is not guaranteed, do knowledge boundaries remain visible?

Controlled variable: 8 source charge intake every fourth pulse; social claims are limited to witnessed evidence

Expected observable: Witnessed facts and uncertain inferences diverge between Sparks while objective events remain shared history.

Interpretation: Intended tradeoff: limited communication should preserve local knowledge boundaries; unresolved question: whether a future explicit communication action is needed.

Seeds: 1301, 1302, 1303

| Measure | Range | Representative (1302) |
| --- | ---: | ---: |
| finalSourceCharge | 8–8 | 8 |
| finalChargeDeficit | 25–25 | 25 |
| averageReadiness | 92.33–92.33 | 92.33 |
| cooperationEvents | 28–28 | 28 |
| idleOrWaitingEvents | 38–38 | 38 |
| witnessedFacts | 151–151 | 151 |
| communicatedClaims | 0–0 | 0 |
| uncertainInferences | 3–3 | 3 |
| fulfilledCommitments | 0–0 | 0 |
| brokenCommitments | 3–3 | 3 |

Observed causal chain candidates (objective evidence only):
- Spark 2: pressure event-4-spark-2-draw (Spark 2 drew 8 charge.) → response event-15-spark-2-wait (Spark 2 is waiting: no reachable share-charge site.) → later event-21-spark-2-draw (Spark 2 drew 8 charge.)
- Spark 3: pressure event-4-spark-3-draw (Spark 3 drew 8 charge.) → response event-6-spark-3-wait (Spark 3 is waiting: no reachable share-charge site.) → later event-22-spark-3-wait (Spark 3 is waiting: no reachable share-charge site.)
- Spark 4: pressure event-1-spark-4-movement (Spark 4 moved 1 cell(s).) → response event-2-spark-4-movement (Spark 4 moved 1 cell(s).) → later event-5-spark-4-movement (Spark 4 moved 2 cell(s).)

Controlled interventions (not autonomous choices): public-or-private-mark/keep-mark-private at pulse 6, weakening-pool-report/withhold-pool at pulse 12, shelter-or-trace/continue-exploration at pulse 18

Representative non-movement events: event-1-spark-5-wait, event-1-spark-6-wait, event-4-spark-2-draw, event-4-spark-3-draw, event-4-spark-5-explore, event-4-spark-6-explore, event-5-spark-1-draw, event-6-spark-3-wait, event-6-spark-3-share, event-7-spark-3-wait, event-7-spark-3-share, event-8-spark-3-wait

## Promise breach and repair

Question: After a Spark breaks an informal promise, can later help produce a bounded, evidence-linked trust repair?

Controlled variable: 16 source charge intake every fourth pulse; one broken choice at pulse 6 followed by help at pulse 12

Expected observable: A bounded trust dip, two commitment records, and a later fulfilled commitment with preserved evidence.

Interpretation: Intended tradeoff: breaking and then helping should leave distinct evidence-linked commitment outcomes; this bounded run shows no immediate bug.

Seeds: 1401, 1402, 1403

| Measure | Range | Representative (1402) |
| --- | ---: | ---: |
| finalSourceCharge | 32–32 | 32 |
| finalChargeDeficit | 5–5 | 5 |
| averageReadiness | 92.17–92.17 | 92.17 |
| cooperationEvents | 26–26 | 26 |
| idleOrWaitingEvents | 32–32 | 32 |
| witnessedFacts | 144–144 | 144 |
| communicatedClaims | 2–2 | 2 |
| uncertainInferences | 1–1 | 1 |
| fulfilledCommitments | 2–2 | 2 |
| brokenCommitments | 1–1 | 1 |

Observed causal chain candidates (objective evidence only):
- Spark 3: pressure event-4-spark-3-draw (Spark 3 drew 8 charge.) → response event-6-spark-3-wait (Spark 3 is waiting: no reachable share-charge site.) → later event-24-spark-3-share (Spark 3 shared 1 charge with Spark 4.)
- Spark 4: pressure event-1-spark-4-movement (Spark 4 moved 1 cell(s).) → response event-2-spark-4-movement (Spark 4 moved 1 cell(s).) → later event-5-spark-4-movement (Spark 4 moved 2 cell(s).)
- Spark 5: pressure event-1-spark-5-wait (Spark 5 is waiting: no reachable seek-charge site.) → response event-2-spark-5-movement (Spark 5 moved 1 cell(s).) → later event-24-spark-5-share (Spark 5 shared 1 charge with Spark 3.)

Controlled interventions (not autonomous choices): shelter-or-trace/continue-exploration at pulse 6, shelter-or-trace/help-shelter at pulse 12, public-or-private-mark/make-mark-public at pulse 18

Representative non-movement events: event-1-spark-5-wait, event-1-spark-6-wait, event-4-spark-2-draw, event-4-spark-3-draw, event-4-spark-5-explore, event-4-spark-6-explore, event-5-spark-1-draw, event-6-spark-3-wait, event-6-spark-3-share, event-7-spark-3-wait, event-7-spark-3-share, event-8-spark-3-wait

## Evidence-based decision

Deepen the rules-only model's shelter and trust-repair loop before adding AI interpretation: scarcity changes charge pressure, while the information-gap and promise-breach runs show that evidence-linked local knowledge and bounded repair are the next useful questions.

## What the data does not establish

- These fixed-seed seasons do not establish general behavior outside the tested seeds, 24-pulse horizon, or four controls.
- Observed event order supports an evidence chain but does not prove that one event alone caused a later choice.
- The suite does not establish a stable long-term haven, universal Spark values, or that any future AI interpretation would improve the rules-only baseline.
- The current engine does not model a live communication channel for every objective event; absent claims remain absent knowledge.
- Choices listed as controlled interventions were injected by the review harness and are not evidence of autonomous causation; autonomous runtime behavior is evaluated by the committed event and social-state records.
