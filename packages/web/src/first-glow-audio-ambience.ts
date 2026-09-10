type Cell = { x: number; y: number };

export type FirstGlowAmbientContext = "open-space" | "charge-pool" | "shelter-niche" | "quiet-route";
export type FirstGlowRenderedAudioInput = {
  selectedEntityId: string | null;
  sparks: { id: string; position: Cell }[];
  objects: { id: string; definitionId: string; origin: Cell }[];
  surfaces: { id: string; cells: Cell[]; enabled: boolean }[];
};
export type FirstGlowAudioMix = {
  context: FirstGlowAmbientContext;
  ambienceLevel: number;
  scoreLevel: number;
};

const contextLevels: Record<FirstGlowAmbientContext, number> = {
  "open-space": 0.07,
  "charge-pool": 0.12,
  "shelter-niche": 0.06,
  "quiet-route": 0.09,
};

const sameCell = (left: Cell, right: Cell) => left.x === right.x && left.y === right.y;
const objectContext = (definitionId: string): FirstGlowAmbientContext | null => {
  if (definitionId === "charge-pool") return "charge-pool";
  if (definitionId === "shelter-niche") return "shelter-niche";
  if (definitionId === "trace") return "quiet-route";
  return null;
};

export function firstGlowAmbientContext(input: FirstGlowRenderedAudioInput): FirstGlowAmbientContext {
  const selectedObjectId = input.selectedEntityId?.startsWith("object:") ? input.selectedEntityId.slice("object:".length) : null;
  const selectedObject = selectedObjectId ? input.objects.find(object => object.id === selectedObjectId) : undefined;
  if (selectedObject) return objectContext(selectedObject.definitionId) ?? "open-space";

  const selectedSparkId = input.selectedEntityId?.startsWith("spark:") ? input.selectedEntityId.slice("spark:".length) : null;
  const selectedSpark = selectedSparkId ? input.sparks.find(spark => spark.id === selectedSparkId) : undefined;
  if (!selectedSpark) return "open-space";
  const occupiedObject = input.objects.find(object => sameCell(object.origin, selectedSpark.position));
  if (occupiedObject) return objectContext(occupiedObject.definitionId) ?? "open-space";
  if (input.surfaces.some(surface => surface.enabled && surface.cells.some(cell => sameCell(cell, selectedSpark.position)))) return "quiet-route";
  return "open-space";
}

export function planFirstGlowAudioMix(input: FirstGlowRenderedAudioInput): FirstGlowAudioMix {
  const context = firstGlowAmbientContext(input);
  return { context, ambienceLevel: contextLevels[context], scoreLevel: context === "open-space" ? 0.08 : 0.12 };
}
