import { useMemo } from "react";
import type { Cell, FirstGlowExplanation } from "@mimir/engine";
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

export type FirstGlowExplanationEvent = { id: string; tick: number; message: string };

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
    <FirstGlowEntityChooser sparks={sparks} objects={objects} selectedEntityId={selectedEntityId} onSelectEntity={onSelectEntity} />
    {activeEntity?.spark && <article className="spark-card selected-entity-card"><h3>{activeEntity.spark.name}</h3><small>{debugOverlay ? activeEntity.spark.id : "stable signature"}</small><dl><dt>Current location</dt><dd>{regionName} · {cellLabel(activeEntity.spark.position)}</dd><dt>Contact</dt><dd>{activeEntity.spark.destinationObjectId ? destinationLabel(activeEntity.spark, objects) : "none"}</dd><dt>Destination</dt><dd>{destinationLabel(activeEntity.spark, objects)}</dd><dt>Activity</dt><dd>{firstGlowActivityLabel(activeEntity.spark.intendedActivity)}</dd><dt>Status / wait reason</dt><dd>{firstGlowWaitLabel(activeEntity.spark.status, activeEntity.spark.waitReason)}</dd><dt>Travel progress</dt><dd>{activeEntity.spark.committedCells.length - 1} committed · {activeEntity.spark.remainingRoute.length} remaining · {activeEntity.spark.remainingCost} cost pending</dd><dt>Charge</dt><dd>{activeEntity.spark.carriedCharge}</dd><dt>Charge deficit</dt><dd>{activeEntity.spark.chargeDeficit}</dd><dt>Readiness</dt><dd>{activeEntity.spark.readiness}%</dd></dl></article>}
    {activeEntity?.object && <article className="spark-card selected-entity-card"><h3>{objectLabel(activeEntity.object)}</h3><small>{debugOverlay ? activeEntity.object.id : "light site"}</small><dl><dt>Location</dt><dd>({activeEntity.object.position.x}, {activeEntity.object.position.y})</dd><dt>Status</dt><dd>{activeEntity.object.blocked ? "blocked" : "open"}</dd><dt>Capabilities</dt><dd>{activeEntity.object.capabilities.join(", ") || "none"}</dd></dl><p>Select a nearby Spark to follow its activity at this site.</p></article>}
    {!activeEntity && <p className="empty-selection" role="status">Double-click a Spark or light site on the map, or choose one below, to inspect it.</p>}
  </section>;
}

export function FirstGlowEntityChooser({ sparks, objects, selectedEntityId, onSelectEntity }: { sparks: FirstGlowSpark[]; objects: FirstGlowObject[]; selectedEntityId: string | null; onSelectEntity: (entityId: string) => void }) {
  const entities = useMemo(() => [
    ...sparks.map((spark) => ({ id: `spark:${spark.id}`, label: spark.name, kind: "Spark" })),
    ...objects.map((object) => ({ id: `object:${object.id}`, label: objectLabel(object), kind: "Light site" })),
  ], [objects, sparks]);
  const activeIndex = entities.findIndex((entity) => entity.id === selectedEntityId);
  const cycle = (direction: number) => { if (entities.length === 0) return; const nextIndex = (Math.max(0, activeIndex) + direction + entities.length) % entities.length; onSelectEntity(entities[nextIndex].id); };
  return <section className="entity-chooser" data-testid="first-glow-entity-chooser" aria-label="Choose a First Glow entity">
    <select aria-label="Selected entity" value={selectedEntityId ?? ""} onChange={(event) => onSelectEntity(event.target.value)}><option value="">Choose a Spark or light site</option>{entities.map((entity) => <option value={entity.id} key={entity.id}>{entity.kind}: {entity.label}</option>)}</select>
    <div className="entity-cycle"><button type="button" onClick={() => cycle(-1)} disabled={entities.length < 2} aria-label="Previous entity" title="Previous entity">←</button><span>{activeIndex >= 0 ? `${activeIndex + 1} / ${entities.length}` : `0 / ${entities.length}`}</span><button type="button" onClick={() => cycle(1)} disabled={entities.length < 2} aria-label="Next entity" title="Next entity">→</button></div>
  </section>;
}

function EvidenceList({ title, evidence, empty }: { title: string; evidence: FirstGlowExplanationEvent[]; empty: string }) {
  return <section className="explanation-evidence"><h4>{title}</h4>{evidence.length ? <ul>{evidence.map(item => <li key={item.id}><a href={`#${item.id}`}>Tick {item.tick}: {item.message}</a></li>)}</ul> : <p>{empty}</p>}</section>;
}

export function FirstGlowExplanationPanel({ explanations, currentTick }: { explanations: FirstGlowExplanation[]; currentTick: number }) {
  const visible = [...new Map(explanations.filter(explanation => explanation.tick <= currentTick).sort((a, b) => a.tick - b.tick || a.id.localeCompare(b.id)).map(explanation => [explanation.dilemmaId, explanation])).values()].reverse();
  return <section className="first-glow-explanations" data-testid="first-glow-explanations" aria-label="First Glow choice explanations">
    <h2>Why this happened</h2>
    <p>Committed choices are explained from recorded facts, local Spark knowledge, and bounded social state.</p>
    {visible.length ? visible.map(explanation => <article className="first-glow-explanation" data-testid="first-glow-explanation" key={explanation.id}>
      <header><div><h3>{explanation.alternativeLabel}</h3><p>Tick {explanation.tick} · {explanation.actorName}{explanation.targetSparkName ? ` with ${explanation.targetSparkName}` : ""}</p></div><strong>{explanation.dilemmaId.replaceAll("-", " ")}</strong></header>
      <p>{explanation.summary}</p>
      <dl className="explanation-score"><dt>Need</dt><dd>{explanation.score.need}</dd><dt>Values</dt><dd>{explanation.score.values}</dd><dt>Local knowledge</dt><dd>{explanation.score.localKnowledge}</dd><dt>Trust</dt><dd>{explanation.score.trust}</dd><dt>Commitments</dt><dd>{explanation.score.commitments}</dd><dt>Cost</dt><dd>{explanation.score.cost}</dd><dt>Risk</dt><dd>{explanation.score.risk}</dd><dt>Total</dt><dd>{explanation.score.total}</dd></dl>
      <EvidenceList title="Objective evidence" evidence={explanation.objectiveEvents} empty="No objective event was recorded." />
      <EvidenceList title={`What ${explanation.actorName} knew`} evidence={explanation.knownFacts} empty="This Spark had no recorded witnessed fact for this choice." />
      <section className="explanation-evidence"><h4>Uncertain interpretation</h4>{explanation.uncertainInferences.length ? <ul>{explanation.uncertainInferences.map(inference => <li key={inference}>{inference}</li>)}</ul> : <p>No uncertain inference was recorded.</p>}</section>
      <EvidenceList title="What changed afterward" evidence={explanation.consequenceEvents} empty="No consequence event was recorded." />
    </article>) : <p className="empty-selection">No consequential choice has been committed at this tick yet.</p>}
  </section>;
}
