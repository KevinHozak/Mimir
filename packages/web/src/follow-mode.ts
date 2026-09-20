export type FollowView = "world" | "follow";
export type FollowMode = "live" | "history";

export type FollowNavigationState = {
  view: FollowView;
  mode: FollowMode;
  timelineId: string;
  selectedSparkId?: string;
  encounterId?: string;
  eventIds: string[];
  pulse?: number;
  returnTarget?: FollowNavigationState;
};

export type FollowSparkLike = { id: string; position: { x: number; y: number } };

let cameraState: { sparkId?: string; tracking: boolean } = { tracking: false };
export function setFollowCameraState(next: { sparkId?: string; tracking: boolean }): void { cameraState = { ...next }; }
export function getFollowCameraState(): { sparkId?: string; tracking: boolean } { return cameraState; }

export function createFollowNavigation(timelineId: string, selectedSparkId?: string): FollowNavigationState {
  return { view: "world", mode: "live", timelineId, ...(selectedSparkId ? { selectedSparkId } : {}), eventIds: [] };
}

export function selectFollowSpark(state: FollowNavigationState, selectedSparkId: string): FollowNavigationState {
  return { ...state, selectedSparkId };
}

export function enterFollow(state: FollowNavigationState, selectedSparkId = state.selectedSparkId): FollowNavigationState {
  if (!selectedSparkId) return state;
  return { ...state, view: "follow", selectedSparkId, returnTarget: { ...state, eventIds: [...state.eventIds] } };
}

export function leaveFollow(state: FollowNavigationState): FollowNavigationState {
  return { ...state, view: "world", returnTarget: undefined };
}

export function selectFollowHistory(state: FollowNavigationState, pulse: number, encounterId?: string, eventIds: string[] = []): FollowNavigationState {
  return { ...state, mode: "history", pulse, ...(encounterId ? { encounterId } : {}), eventIds: [...eventIds] };
}

export function returnFollowToLive(state: FollowNavigationState): FollowNavigationState {
  return { ...state, mode: "live", pulse: undefined, encounterId: undefined, eventIds: [] };
}

export function resolveFollowSpark<T extends FollowSparkLike>(sparks: T[], selectedSparkId?: string): { spark?: T; reason?: "missing-selection" | "unavailable-at-checkpoint" } {
  if (!selectedSparkId) return { reason: "missing-selection" };
  const spark = sparks.find(candidate => candidate.id === selectedSparkId);
  return spark ? { spark } : { reason: "unavailable-at-checkpoint" };
}

export function nearbyFollowSparks<T extends FollowSparkLike>(sparks: T[], selectedSparkId: string, radius = 4): T[] {
  const selected = sparks.find(candidate => candidate.id === selectedSparkId);
  if (!selected) return [];
  return sparks.filter(candidate => candidate.id !== selectedSparkId && Math.hypot(candidate.position.x - selected.position.x, candidate.position.y - selected.position.y) <= radius);
}
