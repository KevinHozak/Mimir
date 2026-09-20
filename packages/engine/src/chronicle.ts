import { canonicalize, sha256 } from "@mimir/world-data";
import type { FirstGlowHistory } from "./first-glow-history.js";
import type { FirstGlowConversationRecord } from "./first-glow-conversations.js";
import type { StructuredEvent } from "./structured.js";

export const CHRONICLE_SCHEMA_VERSION = 1 as const;
export type ChronicleChapterKind = "moment" | "personal" | "season";
export type ChronicleEvidenceKind = "event" | "utterance" | "interpretation" | "checkpoint";

export interface ChronicleEvidenceRef { kind: ChronicleEvidenceKind; id: string; pulse: number; timelineId: string; }
export interface ChronicleIllustrationProvenance { kind: "historical-scene-capture" | "future-generated-slot"; timelineId: string; pulse: number; bundleHash?: string; sourceEventIds: string[]; }
export interface ChronicleNarratorProvenance { mode: "deterministic-baseline" | "ai"; providerId?: string; model?: string; promptVersion: string; }
export interface ChronicleChapter {
  schemaVersion: typeof CHRONICLE_SCHEMA_VERSION;
  id: string;
  editionId: string;
  kind: ChronicleChapterKind;
  title: string;
  summary: string;
  paragraphs: string[];
  selectedSparkIds: string[];
  pulseStart: number;
  pulseEnd: number;
  evidence: ChronicleEvidenceRef[];
  sourceSnapshotHash: string;
  narrator: ChronicleNarratorProvenance;
  illustration: ChronicleIllustrationProvenance;
}
export interface ChronicleEdition { schemaVersion: typeof CHRONICLE_SCHEMA_VERSION; id: string; timelineId: string; cutoffPulse: number; revision: number; sourceSnapshotHash: string; chapters: ChronicleChapter[]; narrator: ChronicleNarratorProvenance; }
export interface ChronicleInput { timelineId: string; cutoffPulse: number; revision: number; events: StructuredEvent[]; interpretations: Array<{ id: string; pulse: number; summary: string; evidenceEventIds: string[] }>; history: FirstGlowHistory; sparkNames: Record<string, string>; bundleHash: string; }

const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const unique = (values: string[]) => [...new Set(values)].sort(compare);
const bounded = (value: string, limit = 280) => value.length <= limit ? value : `${value.slice(0, limit - 1)}…`;
const conversations = (history: FirstGlowHistory, cutoffPulse: number) => (history.conversations ?? []).filter(item => item.pulse <= cutoffPulse).sort((a, b) => a.pulse - b.pulse || compare(a.id, b.id));

function sourceSnapshot(input: ChronicleInput): unknown {
  return canonicalize({ timelineId: input.timelineId, cutoffPulse: input.cutoffPulse, events: input.events.filter(event => (event.pulse ?? 0) <= input.cutoffPulse), interpretations: input.interpretations.filter(item => item.pulse <= input.cutoffPulse), history: { conversations: conversations(input.history, input.cutoffPulse), movements: input.history.movements.filter(item => item.pulse <= input.cutoffPulse), decisions: input.history.decisions.filter(item => item.pulse <= input.cutoffPulse), intentions: (input.history.intentions ?? []).filter(item => item.createdPulse <= input.cutoffPulse) }, bundleHash: input.bundleHash });
}

function evidence(input: ChronicleInput, kind: ChronicleEvidenceKind, id: string, pulse: number): ChronicleEvidenceRef { return { kind, id, pulse, timelineId: input.timelineId }; }
function conversationQuote(record: FirstGlowConversationRecord | undefined, input: ChronicleInput): string | undefined {
  const turn = record?.turns.find(item => item.accepted);
  return turn ? `“${turn.quote}”` : undefined;
}

export function buildChronicleEdition(input: ChronicleInput): ChronicleEdition {
  if (!Number.isInteger(input.cutoffPulse) || input.cutoffPulse < 0) throw new Error("chronicle cutoff must be a non-negative integer");
  const snapshotHash = `sha256-${sha256(JSON.stringify(sourceSnapshot(input)))}`;
  const visibleEvents = input.events.filter(event => (event.pulse ?? 0) <= input.cutoffPulse).sort((a, b) => (a.pulse ?? 0) - (b.pulse ?? 0) || compare(a.id, b.id));
  const meets = visibleEvents.filter(event => event.kind === "meet" && (event.participants?.length ?? 0) > 0);
  const notable = meets[0] ?? visibleEvents.find(event => ["share", "shelter-loom-choice", "crossing-voices-choice", "mark-trace", "explore"].includes(event.kind)) ?? visibleEvents[0];
  const firstConversation = conversations(input.history, input.cutoffPulse)[0];
  const sourceEvent = notable ? evidence(input, "event", notable.id, notable.pulse ?? 0) : evidence(input, "checkpoint", `checkpoint-${input.cutoffPulse}`, input.cutoffPulse);
  const sourceIds = notable ? [notable.id] : [];
  const sparkIds = unique([...(notable?.participants ?? []), ...(notable?.actorId ? [notable.actorId] : []), ...(firstConversation?.speakerSparkIds ?? [])]);
  const names = sparkIds.map(id => input.sparkNames[id] ?? id);
  const quote = conversationQuote(firstConversation, input);
  const quoteEvidence = firstConversation?.turns.find(item => item.accepted)?.evidenceEventIds ?? [];
  const momentEvidence = [sourceEvent, ...(firstConversation ? [evidence(input, "utterance", firstConversation.turns[0].id, firstConversation.pulse)] : [])];
  const momentParagraphs = notable ? [`At pulse ${notable.pulse ?? 0}, ${notable.message}`, ...(quote ? [`${names[0] ?? "A Spark"} said ${quote}`] : []), "This account names the recorded outcome and leaves motives unresolved when the history does not establish them."] : ["No recorded moment met the Chronicle selection criteria at this cutoff. The quiet is part of the record."];
  const moment: ChronicleChapter = { schemaVersion: 1, id: "moment", editionId: `edition-${snapshotHash.slice(7, 23)}-${input.revision}`, kind: "moment", title: notable ? `A moment at pulse ${notable.pulse ?? 0}` : "A quiet checkpoint", summary: bounded(momentParagraphs[0]), paragraphs: momentParagraphs, selectedSparkIds: sparkIds, pulseStart: notable?.pulse ?? input.cutoffPulse, pulseEnd: notable?.pulse ?? input.cutoffPulse, evidence: [...momentEvidence, ...quoteEvidence.map(id => evidence(input, "event", id, notable?.pulse ?? input.cutoffPulse))], sourceSnapshotHash: snapshotHash, narrator: { mode: "deterministic-baseline", promptVersion: "chronicle-baseline-v1" }, illustration: { kind: "historical-scene-capture", timelineId: input.timelineId, pulse: notable?.pulse ?? input.cutoffPulse, bundleHash: input.bundleHash, sourceEventIds: sourceIds } };
  const personalSpark = sparkIds[0] ?? Object.keys(input.sparkNames).sort(compare)[0];
  const personalEvents = visibleEvents.filter(event => event.actorId === personalSpark || event.participants?.includes(personalSpark));
  const personalNames = input.sparkNames[personalSpark] ?? personalSpark ?? "No selected Spark";
  const personalEvidence = personalEvents.slice(-4).map(event => evidence(input, "event", event.id, event.pulse ?? 0));
  const personal: ChronicleChapter = { ...moment, id: "personal", kind: "personal", title: personalSpark ? `${personalNames}'s trace` : "A Spark's trace", summary: personalEvents.length ? `${personalNames} appears in ${personalEvents.length} recorded event(s) through pulse ${input.cutoffPulse}.` : "No selected Spark has a recorded event at this cutoff.", paragraphs: personalEvents.length ? personalEvents.slice(-4).map(event => `Pulse ${event.pulse ?? 0}: ${event.message}`) : ["No personal history is available at this cutoff; no private context has been invented."], selectedSparkIds: personalSpark ? [personalSpark] : [], pulseStart: personalEvents[0]?.pulse ?? input.cutoffPulse, pulseEnd: personalEvents.at(-1)?.pulse ?? input.cutoffPulse, evidence: personalEvidence, sourceSnapshotHash: snapshotHash, narrator: moment.narrator, illustration: { ...moment.illustration, pulse: personalEvents.at(-1)?.pulse ?? input.cutoffPulse, sourceEventIds: personalEvents.map(event => event.id) } };
  const seasonEvents = visibleEvents.slice(-8);
  const season: ChronicleChapter = { ...moment, id: "season", kind: "season", title: `The First Glow through pulse ${input.cutoffPulse}`, summary: `${visibleEvents.length} committed event(s) and ${input.interpretations.filter(item => item.pulse <= input.cutoffPulse).length} bounded reading(s) are available for this chapter.`, paragraphs: seasonEvents.length ? seasonEvents.map(event => `Pulse ${event.pulse ?? 0}: ${event.message}`) : ["This chapter contains no committed events yet."], selectedSparkIds: unique(seasonEvents.flatMap(event => [event.actorId, ...(event.participants ?? [])])), pulseStart: seasonEvents[0]?.pulse ?? 0, pulseEnd: seasonEvents.at(-1)?.pulse ?? input.cutoffPulse, evidence: seasonEvents.map(event => evidence(input, "event", event.id, event.pulse ?? 0)), sourceSnapshotHash: snapshotHash, narrator: moment.narrator, illustration: { ...moment.illustration, pulse: input.cutoffPulse, sourceEventIds: seasonEvents.map(event => event.id) } };
  const editionId = moment.editionId;
  return { schemaVersion: 1, id: editionId, timelineId: input.timelineId, cutoffPulse: input.cutoffPulse, revision: input.revision, sourceSnapshotHash: snapshotHash, chapters: [moment, personal, season], narrator: moment.narrator };
}

export function validateChronicleEdition(edition: ChronicleEdition, input?: Pick<ChronicleInput, "timelineId" | "cutoffPulse" | "events" | "history">): void {
  if (edition.schemaVersion !== 1 || !edition.id || !edition.timelineId || !Number.isInteger(edition.cutoffPulse) || edition.cutoffPulse < 0 || edition.chapters.length !== 3) throw new Error("invalid Chronicle edition");
  const kinds = new Set<ChronicleChapterKind>();
  const events = new Set((input?.events ?? []).filter(event => (event.pulse ?? 0) <= edition.cutoffPulse).map(event => event.id));
  const turns = new Map((input ? conversations(input.history, edition.cutoffPulse) : []).flatMap(record => record.turns.map(turn => [turn.id, turn.quote] as const)));
  for (const chapter of edition.chapters) { if (chapter.schemaVersion !== 1 || chapter.editionId !== edition.id || chapter.sourceSnapshotHash !== edition.sourceSnapshotHash || chapter.pulseEnd > edition.cutoffPulse || kinds.has(chapter.kind)) throw new Error(`invalid Chronicle chapter ${chapter.id}`); kinds.add(chapter.kind); for (const ref of chapter.evidence) { if (ref.timelineId !== edition.timelineId || ref.pulse > edition.cutoffPulse || (ref.kind === "event" && input && !events.has(ref.id))) throw new Error(`Chronicle evidence is unavailable: ${ref.id}`); } }
  for (const chapter of edition.chapters) for (const paragraph of chapter.paragraphs) for (const [id, quote] of turns) if (paragraph.includes(`“${quote}”`) && !chapter.evidence.some(ref => ref.kind === "utterance" && ref.id === id)) throw new Error(`Chronicle quote is missing utterance evidence: ${id}`);
}
