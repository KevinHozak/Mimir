import { useMemo, useState } from "react";
import type { Cell } from "@mimir/engine";

export type FirstGlowSpark = {
  id: string;
  name: string;
  position: Cell;
  status: string;
  intendedActivity: string;
  destinationObjectId?: string;
  destinationSlotId?: string;
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
  definitionId: string;
  position: Cell;
  blocked: boolean;
  capabilities: string[];
};

function objectLabel(object: FirstGlowObject): string {
  return object.definitionId.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function FirstGlowInspector({ sparks, objects, selectedEntityId, onSelectEntity, debugOverlay }: { sparks: FirstGlowSpark[]; objects: FirstGlowObject[]; selectedEntityId: string | null; onSelectEntity: (entityId: string) => void; debugOverlay: boolean }) {
  const [query, setQuery] = useState("");
  const entities = useMemo(() => [
    ...sparks.map((spark) => ({ id: `spark:${spark.id}`, label: spark.name, kind: "Spark", spark })),
    ...objects.map((object) => ({ id: `object:${object.id}`, label: objectLabel(object), kind: "Object", object })),
  ], [objects, sparks]);
  const filteredEntities = entities.filter((entity) => `${entity.kind} ${entity.label} ${entity.id}`.toLowerCase().includes(query.trim().toLowerCase()));
  const activeEntity = entities.find((entity) => entity.id === selectedEntityId) ?? entities[0];
  const activeIndex = filteredEntities.findIndex((entity) => entity.id === activeEntity?.id);
  const cycle = (direction: number) => {
    if (filteredEntities.length === 0) return;
    const nextIndex = (Math.max(0, activeIndex) + direction + filteredEntities.length) % filteredEntities.length;
    onSelectEntity(filteredEntities[nextIndex].id);
  };

  return <section className="first-glow-inspector" data-testid="first-glow-inspector">
    <div className="season-review-heading"><div><h2>First Glow</h2><p>Select a Spark or light site to inspect it.</p></div><strong>{sparks.length} Sparks · {objects.length} sites</strong></div>
    <div className="entity-controls"><label htmlFor="entity-search">Find an entity</label><input id="entity-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Sparks or sites" /><select aria-label="Selected entity" value={activeEntity?.id ?? ""} onChange={(event) => onSelectEntity(event.target.value)}>{filteredEntities.map((entity) => <option value={entity.id} key={entity.id}>{entity.kind}: {entity.label}</option>)}</select><div className="entity-cycle"><button type="button" onClick={() => cycle(-1)} disabled={filteredEntities.length < 2} aria-label="Previous entity">← Previous</button><span>{activeEntity ? `${Math.max(0, activeIndex) + 1} / ${filteredEntities.length}` : "0 / 0"}</span><button type="button" onClick={() => cycle(1)} disabled={filteredEntities.length < 2} aria-label="Next entity">Next →</button></div></div>
    {activeEntity?.spark && <article className="spark-card selected-entity-card"><h3>{activeEntity.spark.name}</h3><small>{debugOverlay ? activeEntity.spark.id : "stable signature"}</small><dl><dt>Activity</dt><dd>{activeEntity.spark.intendedActivity}</dd><dt>Charge</dt><dd>{activeEntity.spark.carriedCharge}</dd><dt>Charge deficit</dt><dd>{activeEntity.spark.chargeDeficit}</dd><dt>Readiness</dt><dd>{activeEntity.spark.readiness}</dd><dt>Capability</dt><dd>{debugOverlay && activeEntity.spark.destinationObjectId ? `${activeEntity.spark.destinationObjectId} / ${activeEntity.spark.destinationSlotId ?? "slot"}` : activeEntity.spark.destinationObjectId ? "contact site" : "roaming"}</dd></dl><p>Status: <strong>{activeEntity.spark.status}</strong>{activeEntity.spark.waitReason ? ` · ${activeEntity.spark.waitReason}` : ""}</p></article>}
    {activeEntity?.object && <article className="spark-card selected-entity-card"><h3>{objectLabel(activeEntity.object)}</h3><small>{debugOverlay ? activeEntity.object.id : "light site"}</small><dl><dt>Location</dt><dd>({activeEntity.object.position.x}, {activeEntity.object.position.y})</dd><dt>Status</dt><dd>{activeEntity.object.blocked ? "blocked" : "open"}</dd><dt>Capabilities</dt><dd>{activeEntity.object.capabilities.join(", ") || "none"}</dd></dl><p>Select a nearby Spark to follow its activity at this site.</p></article>}
    {!activeEntity && <p>No matching entities.</p>}
  </section>;
}
