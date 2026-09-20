import assert from "node:assert/strict";
import test from "node:test";
import { createFollowNavigation, enterFollow, leaveFollow, nearbyFollowSparks, resolveFollowSpark, returnFollowToLive, selectFollowHistory, selectFollowSpark } from "./follow-mode.js";

const sparks = [{ id: "mira", position: { x: 4, y: 4 } }, { id: "tovan", position: { x: 6, y: 5 } }];

test("follow navigation preserves identity through history and live transitions", () => {
  const world = createFollowNavigation("main", "mira");
  const followed = enterFollow(world);
  const historical = selectFollowHistory(followed, 12, "encounter-12", ["event-12"]);
  assert.equal(historical.view, "follow");
  assert.equal(historical.selectedSparkId, "mira");
  assert.equal(historical.mode, "history");
  assert.deepEqual(returnFollowToLive(historical), { ...historical, mode: "live", pulse: undefined, encounterId: undefined, eventIds: [] });
  assert.equal(leaveFollow(followed).view, "world");
});
test("selection changes only the browser-local selected Spark", () => {
  const state = enterFollow(createFollowNavigation("main", "mira"));
  const next = selectFollowSpark(state, "tovan");
  assert.equal(next.selectedSparkId, "tovan");
  assert.equal(next.timelineId, "main");
  assert.equal(next.mode, "live");
});

test("missing checkpoint targets produce an explicit recovery reason", () => {
  assert.deepEqual(resolveFollowSpark(sparks, "gone"), { reason: "unavailable-at-checkpoint" });
  assert.deepEqual(resolveFollowSpark(sparks), { reason: "missing-selection" });
  assert.deepEqual(nearbyFollowSparks(sparks, "mira"), [sparks[1]]);
});
