import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

type FixtureEvent = { id: string; pulse: number; participants: string[]; chargeCost: number; visibility: "observer" | "participants"; location: { objectId: string; slotId: string }; pattern?: string };
type FixtureCase = { id: string; events: FixtureEvent[]; knowledge?: Record<string, string[]>; expected: { forms: boolean; candidateId?: string; evidenceEventIds?: string[]; failureCode?: string; observerSees?: boolean; sparkDKnowsCandidate?: boolean } };
type Fixture = { schemaVersion: number; rule: { id: string; anchorKind: string; requiredOccurrences: number; distinctParticipantMinimum: number; minimumChargeCost: number; maximumPulseSpan: number; location: { objectId: string; slotId: string } }; cases: FixtureCase[] };

const fixture = JSON.parse(readFileSync(fileURLToPath(new URL("../../../docs/resonance-anchor-fixtures.json", import.meta.url)), "utf8")) as Fixture;
const compare = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;

function evaluate(caseFixture: FixtureCase) {
  const events = caseFixture.events.slice().sort((left, right) => left.pulse - right.pulse || compare(left.id, right.id));
  const qualifying = events.filter(event => event.pattern !== "shelter-refusal" && event.location.objectId === fixture.rule.location.objectId && event.location.slotId === fixture.rule.location.slotId);
  const participantIds = [...new Set(qualifying.flatMap(event => event.participants))].sort(compare);
  const totalChargeCost = qualifying.reduce((total, event) => total + event.chargeCost, 0);
  if (qualifying.length < fixture.rule.requiredOccurrences) return { forms: false, failureCode: "required-occurrences-not-met" };
  if (qualifying.at(-1)!.pulse - qualifying[0]!.pulse > fixture.rule.maximumPulseSpan) return { forms: false, failureCode: "maximum-pulse-span-exceeded" };
  if (participantIds.length < fixture.rule.distinctParticipantMinimum) return { forms: false, failureCode: "distinct-participant-minimum-not-met" };
  if (totalChargeCost < fixture.rule.minimumChargeCost) return { forms: false, failureCode: "minimum-charge-cost-not-met" };
  const evidenceEventIds = qualifying.map(event => event.id).sort(compare);
  return { forms: true, candidateId: `candidate-${fixture.rule.id}-${fixture.rule.location.objectId}-${fixture.rule.location.slotId}-${qualifying[0]!.id}`, evidenceEventIds };
}

test("Resonance contract fixtures keep qualification, cost, privacy, and conflicting patterns deterministic", () => {
  assert.equal(fixture.schemaVersion, 1);
  assert.equal(new Set(fixture.cases.map(item => item.id)).size, 4);
  for (const caseFixture of fixture.cases) {
    const result = evaluate(caseFixture);
    assert.deepEqual(result, evaluate(caseFixture), `${caseFixture.id} repeats exactly`);
    assert.equal(result.forms, caseFixture.expected.forms, caseFixture.id);
    assert.equal(result.candidateId, caseFixture.expected.candidateId, caseFixture.id);
    assert.deepEqual(result.evidenceEventIds, caseFixture.expected.evidenceEventIds, caseFixture.id);
    assert.equal(result.failureCode, caseFixture.expected.failureCode, caseFixture.id);
    for (const event of caseFixture.events) {
      assert.deepEqual(event.participants, event.participants.slice().sort(compare), `${caseFixture.id} participants are stable`);
      assert.ok(event.chargeCost >= 0, `${caseFixture.id} has no negative cost`);
      assert.deepEqual(event.location, fixture.rule.location, `${caseFixture.id} evidence stays at the authored location`);
    }
  }
  const privateKnowledge = fixture.cases.find(item => item.id === "private-knowledge-does-not-qualify")!;
  assert.equal(privateKnowledge.knowledge?.["spark-d"].includes("event-4-help"), false);
  assert.equal(privateKnowledge.expected.observerSees, true);
  assert.equal(privateKnowledge.expected.sparkDKnowsCandidate, false);
});
