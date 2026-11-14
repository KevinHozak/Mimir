/** Controlled fixture only: two overlapping authored contacts allow existing co-present meet semantics.
 * This is not an active authored bundle, ordinary emergence finding, or production map upgrade. */
import { readFileSync } from "node:fs";
import { bundleHash, decodeWorldBundle, type FirstGlowWorldBundle } from "@mimir/world-data";
import { createWorldV3, advanceWorld, initializeFirstGlowEventAdmission, type WorldState } from "./index.js";
import { requestFirstGlowGoal, type FirstGlowGoalProvider } from "./first-glow-goals.js";

export function createGoalFixtureWorld(options: { eventAdmission?: boolean } = {}): WorldState {
  const bundle = decodeWorldBundle(JSON.parse(readFileSync(new URL("../../../assets/world/generated/sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601/world.json", import.meta.url), "utf8"))) as FirstGlowWorldBundle;
  const mark = bundle.objects.find(o => bundle.objectDefinitions[o.definitionId].capabilities.includes("light-mark"))!;
  const definition = bundle.objectDefinitions[mark.definitionId];
  definition.slots.push({ ...structuredClone(definition.slots[0]), id: "fixture-companion-contact" });
  definition.capacity = 2;
  bundle.bundle.contentHash = bundleHash(bundle);
  let world = createWorldV3(bundle, 2, "goal-loop-controlled", 2, { goalLoops: true });
  world.firstGlowState.reflectionCapacity!.policy.pulsesPerDay = 1; // explicit test cadence, not a new default
  if (options.eventAdmission) world.firstGlowState.reflectionCapacity = initializeFirstGlowEventAdmission(world.firstGlowState.reflectionCapacity!, 0);
  for (const [index, spark] of world.firstGlowState.settlements[0].sparks.entries()) {
    spark.position = index === 0 ? { x: 7, y: 21 } : { x: 11, y: 22 };
    spark.carriedCharge = 100; // controlled opening resources, not production
    spark.intendedActivity = "explore";
  }
  world = advanceWorld(world, options.eventAdmission ? { eventAdmissionPolicy: "event-rc-v1" } : {}).state;
  return world;
}

export const goalFixtureProvider: FirstGlowGoalProvider = {
  providerId: "deterministic-goal-fixture",
  propose: async context => ({ kind: "explore-meet-mark", summary: "Explore the trace, meet a companion and leave a light mark.", evidenceEventIds: context.evidenceEventIds.slice(0, 1) })
};

export async function startGoalFixture(): Promise<WorldState> {
  const world = createGoalFixtureWorld();
  for (const spark of world.firstGlowState.settlements[0].sparks) {
    const result = await requestFirstGlowGoal(world.firstGlowState, spark.id, { provider: goalFixtureProvider });
    if (!result.goal || result.goal.source !== "ai") throw new Error(`fixture goal not admitted: ${result.reason}`);
    world.firstGlowState = result.state;
  }
  return world;
}
