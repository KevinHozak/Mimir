import { useMemo, useState } from "react";
import type { Cell } from "@mimir/engine";
import { firstGlowActivityLabel, firstGlowWaitLabel } from "./first-glow-overlay.js";

export type FirstGlowSpark = {
  id: string;
  name: string;
  position: Cell;
  status: string;
  intendedActivity: string;
  destinationObjectId?: string;
  destinationSlotId?: string;
  destinationCell?: Cell;
  remainingRoute: Cell[];
  remainingCost: number;
  committedCells: Cell[];
  carriedCharge: number;
  chargeDeficit: number;
  readiness: number;
  waitReason?: string;
};

export type FirstGlowObject = {
  id: string;
  label?: string;
  definitionId: string;
  position: Cell;
  blocked: boolean;
  capabilities: string[];
  slots?: { id: string; offset: Cell }[];
};

function objectLabel(object: FirstGlowObject): string {
  return object.label ?? object.definitionId.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

const cellLabel = (cell: Cell) => `cell (${cell.x}, ${cell.y})`;
const destinationLabel = (spark: FirstGlowSpark, objects: FirstGlowObject[]) => {
  const object = objects.find(candidate => candidate.id === spark.destinationObjectId);
  if (!object) return spark.destinationCell ? cellLabel(spark.destinationCell) : "none";
  const slot = object.slots?.find(candidate => candidate.id === spark.destinationSlotId);
  return `${objectLabel(object)} contact${slot ? ` (${slot.id.replaceAll("-", " ")})` : ""} · ${slot ? cellLabel({ x: object.position.x + slot.offset.x, y: object.position.y + slot.offset.y }) : cellLabel(object.position)}`;
};

export function FirstGlowInspector({ sparks, objects, regionName = "Opening region", selectedEntityId, onSelectEntity, debugOverlay }: { sparks: FirstGlowSpark[]; objects: FirstGlowObject[]; regionName?: string; selectedEntityId: string | null; onSelectEntity: (entityId: string) => void; debugOverlay: boolean }) {
  const entities = useMemo(() => [
    ...sparks.map((spark) => ({ id: `spark:${spark.id}`, label: spark.name, kind: "Spark", spark })),
    ...objects.map((object) => ({ id: `object:${object.id}`, label: objectLabel(object), kind: "Object", object })),
  ], [objects, sparks]);
  const activeEntity = entities.find((entity) => entity.id === selectedEntityId);

  return <section className="first-glow-inspector" data-testid="first-glow-inspector" aria-label="First Glow item details">
    {activeEntity?.spark && <article className="spark-card selected-entity-card"><h3>{activeEntity.spark.name}</h3><small>{debugOverlay ? activeEntity.spark.id : "stable signature"}</small><dl><dt>Current location</dt><dd>{regionName} · {cellLabel(activeEntity.spark.position)}</dd><dt>Contact</dt><dd>{activeEntity.spark.destinationObjectId ? destinationLabel(activeEntity.spark, objects) : "none"}</dd><dt>Destination</dt><dd>{destinationLabel(activeEntity.spark, objects)}</dd><dt>Activity</dt><dd>{firstGlowActivityLabel(activeEntity.spark.intendedActivity)}</dd><dt>Status / wait reason</dt><dd>{firstGlowWaitLabel(activeEntity.spark.status, activeEntity.spark.waitReason)}</dd><dt>Travel progress</dt><dd>{activeEntity.spark.committedCells.length - 1} committed · {activeEntity.spark.remainingRoute.length} remaining · {activeEntity.spark.remainingCost} cost pending</dd><dt>Charge</dt><dd>{activeEntity.spark.carriedCharge}</dd><dt>Charge deficit</dt><dd>{activeEntity.spark.chargeDeficit}</dd><dt>Readiness</dt><dd>{activeEntity.spark.readiness}%</dd></dl></article>}
    {activeEntity?.object && <article className="spark-card selected-entity-card"><h3>{objectLabel(activeEntity.object)}</h3><small>{debugOverlay ? activeEntity.object.id : "light site"}</small><dl><dt>Location</dt><dd>({activeEntity.object.position.x}, {activeEntity.object.position.y})</dd><dt>Status</dt><dd>{activeEntity.object.blocked ? "blocked" : "open"}</dd><dt>Capabilities</dt><dd>{activeEntity.object.capabilities.join(", ") || "none"}</dd></dl><p>Select a nearby Spark to follow its activity at this site.</p></article>}
    {!activeEntity && <p className="empty-selection" role="status">Double-click a Spark or light site on the map, or choose one below, to inspect it.</p>}
  </section>;
}

export function FirstGlowEntityChooser({ sparks, objects, selectedEntityId, onSelectEntity }: { sparks: FirstGlowSpark[]; objects: FirstGlowObject[]; selectedEntityId: string | null; onSelectEntity: (entityId: string) => void }) {
  const [query, setQuery] = useState("");
  const entities = useMemo(() => [
    ...sparks.map((spark) => ({ id: `spark:${spark.id}`, label: spark.name, kind: "Spark" })),
    ...objects.map((object) => ({ id: `object:${object.id}`, label: objectLabel(object), kind: "Light site" })),
  ], [objects, sparks]);
  const filteredEntities = entities.filter((entity) => `${entity.kind} ${entity.label} ${entity.id}`.toLowerCase().includes(query.trim().toLowerCase()));
  const activeIndex = filteredEntities.findIndex((entity) => entity.id === selectedEntityId);
  const cycle = (direction: number) => { if (filteredEntities.length === 0) return; const nextIndex = (Math.max(0, activeIndex) + direction + filteredEntities.length) % filteredEntities.length; onSelectEntity(filteredEntities[nextIndex].id); };
  return <section className="entity-chooser" data-testid="first-glow-entity-chooser" aria-label="Choose a First Glow entity">
    <label htmlFor="entity-search">Find an entity</label><input id="entity-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Sparks or sites" />
    <select aria-label="Selected entity" value={selectedEntityId ?? ""} onChange={(event) => onSelectEntity(event.target.value)}><option value="">Choose a Spark or light site</option>{filteredEntities.map((entity) => <option value={entity.id} key={entity.id}>{entity.kind}: {entity.label}</option>)}</select>
    <div className="entity-cycle"><button type="button" onClick={() => cycle(-1)} disabled={filteredEntities.length < 2} aria-label="Previous entity">← Previous</button><span>{activeIndex >= 0 ? `${activeIndex + 1} / ${filteredEntities.length}` : `0 / ${filteredEntities.length}`}</span><button type="button" onClick={() => cycle(1)} disabled={filteredEntities.length < 2} aria-label="Next entity">Next →</button></div>
  </section>;
}
