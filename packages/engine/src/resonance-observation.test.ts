import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { observeResonance, type ResonanceObservationEvent, type ResonanceObservationRule } from "./resonance-observation.js";

type FixtureCase = { id: string; events: ResonanceObservationEvent[]; expected: { forms: boolean; failureCode?: string } };
type Fixture = { rule: ResonanceObservationRule; cases: FixtureCase[] };
const fixture = JSON.parse(readFileSync(fileURLToPath(new URL("../../../docs/resonance-anchor-fixtures.json", import.meta.url)), "utf8")) as Fixture;

test("Resonance observation is deterministic and keeps fixture statuses distinct", () => {
  assert.equal(new Set(fixture.cases.map((item) => item.id)).size, 4);
  for (const item of fixture.cases) {
    const first = observeResonance(item.events, fixture.rule);
    const second = observeResonance(item.events, fixture.rule);
    assert.deepEqual(first, second, `${item.id} repeats exactly`);
    assert.equal(first.status === "qualifying", item.expected.forms, item.id);
    if (item.expected.failureCode) assert.ok(first.reasons.includes(item.expected.failureCode), item.id);
    assert.equal(first.privateKnowledgeExcluded, true, item.id);
    assert.equal(first.observerVisible, true, item.id);
  }
  const qualifying = observeResonance(fixture.cases[0].events, fixture.rule);
  assert.deepEqual(qualifying.evidenceEventIds, ["event-14-help", "event-4-help", "event-9-help"]);
  assert.equal(qualifying.status, "qualifying");
  assert.equal(observeResonance(fixture.cases[1].events, fixture.rule).status, "near-miss");
  assert.equal(observeResonance(fixture.cases[3].events, fixture.rule).status, "conflicting");
});
