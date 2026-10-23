import type { StructuredEvent, WorldEvent } from "@mimir/engine";

/** Read older attribution from the original checkpoint, never from names or ID patterns. */
export function recordedChronicleEvents(events: WorldEvent[], checkpoints: Array<{ pulse: number; events: StructuredEvent[] }>): StructuredEvent[] {
  const originals = new Map(checkpoints.flatMap(checkpoint => checkpoint.events
    .filter(event => (event.pulse ?? checkpoint.pulse) === checkpoint.pulse)
    .map(event => [`${checkpoint.pulse}:${event.id}`, event] as const)));
  return events.map(event => {
    const original = originals.get(`${event.pulse}:${event.id}`);
    return { ...event, ...(original ?? {}), pulse: event.pulse, id: event.id, message: event.message,
      kind: original?.kind ?? event.structuredKind ?? event.kind } as StructuredEvent;
  });
}
