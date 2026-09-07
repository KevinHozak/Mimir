import { createHash } from "node:crypto";
import type { WorldBundle } from "./types.js";

export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, child]) => [key, canonicalize(child)]));
  return value;
}
export function canonicalBundle(bundle: WorldBundle): string {
  const copy = { ...bundle, bundle: { ...bundle.bundle, contentHash: "" } };
  return JSON.stringify(canonicalize(copy));
}
export function bundleHash(bundle: WorldBundle): string { return `sha256-${createHash("sha256").update(canonicalBundle(bundle)).digest("hex")}`; }
