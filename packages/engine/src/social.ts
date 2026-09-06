import type { Beliefs, SocialInterpretation, WorldEvent, WorldState } from "./index.js";
import { interpretSocialEvents } from "./index.js";

export interface SocialModelContext {
  state: WorldState;
  events: WorldEvent[];
  promptVersion: string;
}

export type SocialModel = (context: SocialModelContext) => Promise<unknown>;

const beliefs = new Set<keyof Beliefs>(["cooperation", "selfReliance", "reflection"]);

export function validateSocialInterpretation(raw: unknown, context: SocialModelContext, index: number): SocialInterpretation | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<SocialInterpretation>;
  if (typeof candidate.villagerId !== "string" || !context.state.villagers.some((villager) => villager.id === candidate.villagerId)) return null;
  if (typeof candidate.eventId !== "string" || !context.events.some((event) => event.id === candidate.eventId)) return null;
  if (typeof candidate.belief !== "string" || !beliefs.has(candidate.belief as keyof Beliefs)) return null;
  if (typeof candidate.summary !== "string" || candidate.summary.length < 1 || candidate.summary.length > 500) return null;
  if (typeof candidate.confidence !== "number" || candidate.confidence < 0 || candidate.confidence > 1) return null;
  if (typeof candidate.trustDelta !== "number" || candidate.trustDelta < -5 || candidate.trustDelta > 5) return null;
  const evidence = Array.isArray(candidate.evidenceEventIds) && candidate.evidenceEventIds.every((id) => typeof id === "string" && context.events.some((event) => event.id === id)) ? candidate.evidenceEventIds as string[] : null;
  if (!evidence || evidence.length === 0) return null;
  return { id: `ai-${context.state.tick}-${index}`, tick: context.state.tick, eventId: candidate.eventId, villagerId: candidate.villagerId, source: "ai", belief: candidate.belief as keyof Beliefs, confidence: candidate.confidence, trustDelta: candidate.trustDelta, summary: candidate.summary, evidenceEventIds: evidence };
}

export async function boundedSocialInterpretation(state: WorldState, events: WorldEvent[], model: SocialModel | undefined, options: { budgetCents: number; timeoutMs: number; promptVersion: string }): Promise<{ interpretations: SocialInterpretation[]; usedFallback: boolean; fallbackReason?: string }> {
  const fallback = (reason: string) => ({ interpretations: interpretSocialEvents(state, events, "rules"), usedFallback: true, fallbackReason: reason });
  if (!model) return fallback("No social model is configured.");
  if (options.budgetCents <= 0) return fallback("Social budget is exhausted or disabled.");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const raw = await Promise.race([model({ state, events, promptVersion: options.promptVersion }), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("social model timeout")), options.timeoutMs); })]);
    const candidates = Array.isArray(raw) ? raw.map((item, index) => validateSocialInterpretation(item, { state, events, promptVersion: options.promptVersion }, index)).filter((item): item is SocialInterpretation => item !== null) : [];
    return candidates.length > 0 ? { interpretations: candidates, usedFallback: false } : fallback("Social model returned no valid evidence-linked interpretations.");
  } catch (error) {
    return fallback(error instanceof Error ? error.message : "Social model failed.");
  } finally {
    if (timer) clearTimeout(timer);
  }
}

