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

export function FirstGlowInspector({ sparks, debugOverlay }: { sparks: FirstGlowSpark[]; debugOverlay: boolean }) {
  return <section className="first-glow-inspector" data-testid="first-glow-inspector">
    <div className="season-review-heading"><div><h2>First Glow</h2><p>Observe Sparks learning how to remain lit together.</p></div><strong>{sparks.length} Sparks</strong></div>
    <div className="spark-list">{sparks.map((spark) => <article className="spark-card" key={spark.id}>
      <h3>{spark.name}</h3><small>{debugOverlay ? spark.id : "stable signature"}</small>
      <dl><dt>Activity</dt><dd>{spark.intendedActivity}</dd><dt>Charge</dt><dd>{spark.carriedCharge}</dd><dt>Charge deficit</dt><dd>{spark.chargeDeficit}</dd><dt>Readiness</dt><dd>{spark.readiness}</dd><dt>Capability</dt><dd>{debugOverlay && spark.destinationObjectId ? `${spark.destinationObjectId} / ${spark.destinationSlotId ?? "slot"}` : spark.destinationObjectId ? "contact site" : "roaming"}</dd></dl>
      <p>Status: <strong>{spark.status}</strong>{spark.waitReason ? ` · ${spark.waitReason}` : ""}</p>
    </article>)}</div>
  </section>;
}
