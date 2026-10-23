export type ObserverContext = { sparkId?: string; follow: boolean; presentation: "immersive" | "explanatory" };
export type ObserverLocation = ObserverContext & { timelineId?: string; pulse?: number; invalidPulse: boolean; returnContext: ObserverContext };

export function readObserverLocation(search: string): ObserverLocation {
  const params = new URLSearchParams(search);
  const context: ObserverContext = { sparkId: params.get("sparkId") || undefined, follow: params.get("follow") === "1", presentation: params.get("presentation") === "immersive" ? "immersive" : "explanatory" };
  const rawPulse = params.get("pulse");
  const pulse = rawPulse !== null && /^\d+$/.test(rawPulse) && Number.isSafeInteger(Number(rawPulse)) ? Number(rawPulse) : undefined;
  return { ...context, timelineId: params.get("timelineId") || undefined, pulse, invalidPulse: rawPulse !== null && pulse === undefined,
    returnContext: params.has("returnFollow") ? { sparkId: params.get("returnSparkId") || undefined, follow: params.get("returnFollow") === "1", presentation: params.get("returnPresentation") === "immersive" ? "immersive" : "explanatory" } : context };
}

export function observerHref(view: "live" | "history", context: ObserverContext, history?: { timelineId?: string; pulse?: number; eventId?: string; returnContext?: ObserverContext }): string {
  const params = new URLSearchParams();
  if (view === "history") params.set("view", "history");
  if (context.sparkId) params.set("sparkId", context.sparkId);
  if (context.follow) params.set("follow", "1");
  params.set("presentation", context.presentation);
  if (view === "history") {
    if (history?.timelineId) params.set("timelineId", history.timelineId);
    if (history?.pulse !== undefined) params.set("pulse", String(history.pulse));
    const target = history?.returnContext ?? context;
    if (target.sparkId) params.set("returnSparkId", target.sparkId);
    params.set("returnFollow", target.follow ? "1" : "0");
    params.set("returnPresentation", target.presentation);
  }
  return `/?${params}${history?.eventId ? `#${encodeURIComponent(history.eventId)}` : ""}`;
}
