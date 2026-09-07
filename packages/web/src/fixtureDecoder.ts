import { decodeWorldBundle } from "@mimir/world-data";

export function decodeFirstGlowFixture(raw: unknown) {
  const bundle = decodeWorldBundle(raw);
  if (bundle.schemaVersion !== 3) throw new Error("browser fixture is not schema 3");
  return { schemaVersion: bundle.schemaVersion, themeId: bundle.themeId, ageId: bundle.ageId, simulationVersion: bundle.simulationVersion, contentHash: bundle.bundle.contentHash };
}
