import { canonicalize, sha256 } from "@mimir/world-data";
import type { FirstGlowState } from "./structured.js";
import type { FirstGlowSparkPersonalityProfile } from "./design.js";
import { firstGlowSparkPersonalityProfile } from "./design.js";
import { buildFirstGlowReflectionMemoryContext, type FirstGlowReflectionMemoryContext } from "./first-glow-reflection-memory.js";

export const FIRST_GLOW_WORLD_CODEX_VERSION = "world-codex-v1" as const;
export const FIRST_GLOW_CONTEXT_PACKET_VERSION = "context-packet-v1" as const;
export const FIRST_GLOW_CONTEXT_MAX_MEMORIES = 8 as const;
export const FIRST_GLOW_CONTEXT_MAX_EVENTS = 12 as const;

export interface FirstGlowWorldCodex {
  version: typeof FIRST_GLOW_WORLD_CODEX_VERSION;
  themeId: "living-circuit";
  ageId: "first-glow";
  rules: string[];
  terminology: Record<string, string>;
  knowledgeBoundary: string;
  providerContract: string[];
  hash: string;
}

export interface FirstGlowContextPacket {
  version: typeof FIRST_GLOW_CONTEXT_PACKET_VERSION;
  codex: FirstGlowWorldCodex;
  actorSparkId: string;
  personalityProfile: FirstGlowSparkPersonalityProfile;
  reflectionMemory: FirstGlowReflectionMemoryContext;
  recentEvents: Array<{ id: string; pulse: number; kind: string; message: string; evidenceEventIds: string[] }>;
  privateKnowledgeBoundary: { witnessedEventIds: string[]; communicatedClaimIds: string[]; uncertainInferenceIds: string[] };
  packetHash: string;
}

const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const sorted = (values: string[]) => [...new Set(values)].sort(compare);
const stable = (value: unknown) => JSON.stringify(canonicalize(value));

export function buildFirstGlowWorldCodex(): FirstGlowWorldCodex {
  const body = {
    version: FIRST_GLOW_WORLD_CODEX_VERSION,
    themeId: "living-circuit" as const,
    ageId: "first-glow" as const,
    rules: ["The server commits outcomes.", "Charge sustains activity; readiness increases with rest.", "Movement and arrival are distinct; effects occur only on validated arrival.", "Historical playback uses recorded decisions and never calls a provider."],
    terminology: { spark: "a little luminous First Glow actor", charge: "the activity-sustaining resource", packet: "a bounded information carrier", reflectionCapacity: "a daily attention allowance, never authority or worth" },
    knowledgeBoundary: "A Spark may use witnessed facts, received claims, and explicitly uncertain inferences only; private facts held by another Spark are excluded.",
    providerContract: ["Return one supplied alternative.", "Return one bounded claim and short summary.", "Reference only supplied witnessed evidence.", "Never mutate state, create events, move Sparks, or reveal knowledge."]
  };
  return { ...body, hash: `sha256-${sha256(stable(body))}` };
}

export function estimateFirstGlowTokens(value: unknown): number { return Math.max(1, Math.ceil(stable(value).length / 4)); }

export function buildFirstGlowContextPacket(state: FirstGlowState, actorSparkId: string, currentEventIds: string[] = []): FirstGlowContextPacket {
  const knowledge = state.social.knowledge.find(item => item.sparkId === actorSparkId);
  if (!knowledge) throw new Error(`unknown Spark context ${actorSparkId}`);
  const events = state.events.filter(event => (event.pulse ?? state.pulse) <= state.pulse).sort((a, b) => (a.pulse ?? state.pulse) - (b.pulse ?? state.pulse) || compare(a.id, b.id));
  const selectedIds = new Set([...currentEventIds, ...knowledge.witnessedFacts.map(item => item.eventId)]);
  const recentEvents = events.filter(event => selectedIds.has(event.id)).slice(-FIRST_GLOW_CONTEXT_MAX_EVENTS).map(event => ({ id: event.id, pulse: event.pulse ?? state.pulse, kind: event.kind, message: event.message, evidenceEventIds: sorted(event.evidenceEventIds ?? [event.id]) }));
  const body = { version: FIRST_GLOW_CONTEXT_PACKET_VERSION, codex: buildFirstGlowWorldCodex(), actorSparkId, personalityProfile: firstGlowSparkPersonalityProfile(actorSparkId), reflectionMemory: buildFirstGlowReflectionMemoryContext(state, actorSparkId, { maxMemories: FIRST_GLOW_CONTEXT_MAX_MEMORIES }), recentEvents, privateKnowledgeBoundary: { witnessedEventIds: sorted(knowledge.witnessedFacts.map(item => item.eventId)), communicatedClaimIds: sorted(knowledge.communicatedClaims.map(item => item.id)), uncertainInferenceIds: sorted(knowledge.uncertainInferences.map(item => item.id)) } };
  return { ...body, packetHash: `sha256-${sha256(stable(body))}` };
}

export function validateFirstGlowContextPacket(packet: FirstGlowContextPacket): void {
  const { packetHash, ...body } = packet;
  if (packet.version !== FIRST_GLOW_CONTEXT_PACKET_VERSION || packet.codex.version !== FIRST_GLOW_WORLD_CODEX_VERSION || packetHash !== `sha256-${sha256(stable(body))}`) throw new Error("invalid First Glow context packet");
  if (packet.recentEvents.some(event => event.evidenceEventIds.some(id => !packet.privateKnowledgeBoundary.witnessedEventIds.includes(id)))) throw new Error("context packet references hidden evidence");
}
