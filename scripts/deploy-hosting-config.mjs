const observerBridgeOrigin = "https://mimir-observer-bridge-mah4b2udkq-uc.a.run.app";

export function resolveObserverApiOrigin(environment = process.env) {
  const origin = environment.VITE_LIVE_API_URL ?? environment.VITE_API_URL ?? observerBridgeOrigin;
  if (origin !== observerBridgeOrigin) throw new Error("Hosting builds must target the existing authenticated observer bridge directly");
  return origin;
}
