import assert from "node:assert/strict";
import { recordedChronicleEvents } from "./chronicle-events.js";
import type { WorldEvent } from "@mimir/engine";

const old: WorldEvent = { id: "shared-id", pulse: 2, kind: "sharing", message: "Recorded outcome", villagerIds: [] };
const before = JSON.stringify(old);
const recovered = recordedChronicleEvents([old], [{ pulse: 2, events: [{ id: old.id, kind: "share", actorId: "spark-6", participants: ["spark-6", "spark-2"], message: old.message }] }]);
assert.equal(recovered[0].actorId, "spark-6");
assert.deepEqual(recovered[0].participants, ["spark-6", "spark-2"]);
assert.equal(recovered[0].kind, "share");
assert.equal(JSON.stringify(old), before);
const unrelated = recordedChronicleEvents([old], [{ pulse: 3, events: [{ id: old.id, kind: "share", actorId: "future", message: "future" }] }]);
assert.equal(unrelated[0].actorId, undefined);
assert.equal(recordedChronicleEvents([{ ...old, actorId: "spark-6", structuredKind: "share" }], [])[0].kind, "share");
console.log("Read-only checkpoint attribution and pulse boundaries passed");
