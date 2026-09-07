import assert from "node:assert/strict";
import test from "node:test";
import { HistoryRequestSequencer } from "./history-sequencing.js";

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
