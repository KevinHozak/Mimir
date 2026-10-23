import assert from "node:assert/strict";
import test from "node:test";
import { HistoryRequestSequencer } from "./history-sequencing.js";
import { observerHref, readObserverLocation } from "./observer-navigation.js";

test("reversed history responses cannot commit stale state", () => {
  const sequencer = new HistoryRequestSequencer();
  const older = sequencer.begin();
  const newer = sequencer.begin();
  assert.equal(older.signal.aborted, true);
  assert.equal(sequencer.isCurrent(older), false);
  assert.equal(sequencer.isCurrent(newer), true);
  const committed: string[] = [];
  if (sequencer.isCurrent(newer)) committed.push("newer");
  if (sequencer.isCurrent(older)) committed.push("older");
  assert.deepEqual(committed, ["newer"]);
  sequencer.invalidate();
  assert.equal(sequencer.isCurrent(newer), false);
});

test("observer links retain exact archive, zero pulse, selection, and original live return", () => {
  const live = { sparkId: "spark-6", follow: true, presentation: "immersive" as const };
  const url = new URL(observerHref("history", { ...live, sparkId: "spark-2" }, { timelineId: "archive-a", pulse: 0, eventId: "event/one", returnContext: live }), "http://localhost");
  const location = readObserverLocation(url.search);
  assert.equal(location.timelineId, "archive-a");
  assert.equal(location.pulse, 0);
  assert.equal(location.sparkId, "spark-2");
  assert.deepEqual(location.returnContext, live);
  assert.equal(url.hash, "#event%2Fone");
  const back = new URL(observerHref("live", location.returnContext), url);
  assert.deepEqual(readObserverLocation(back.search).returnContext, live);
  for (const pulse of ["abc", "-1", "1.5", "", "9007199254740993"]) assert.equal(readObserverLocation(`?pulse=${pulse}`).invalidPulse, true);
});
