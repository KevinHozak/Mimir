export const firstGlowActivityLabel = (activity: string) => activity.replaceAll("-", " ");
export const firstGlowWaitLabel = (status: string, waitReason?: string) => `${status}${waitReason ? ` · ${waitReason}` : ""}`;
