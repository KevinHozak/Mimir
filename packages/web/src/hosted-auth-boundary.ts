export function requiresHostedObserverAuth(hostname: string, configured: boolean): boolean {
  return configured || hostname === "mimir-realm.web.app";
}
