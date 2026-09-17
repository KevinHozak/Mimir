import { timingSafeEqual } from "node:crypto";

export function isLoopbackHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1" || normalized === "[::1]";
}

export function ownerAuthRequired(host: string, serveWeb: boolean, hostedStart: boolean): boolean {
  return serveWeb || hostedStart || !isLoopbackHost(host);
}

export function assertOwnerAuthConfiguration(host: string, serveWeb: boolean, hostedStart: boolean, ownerToken: string | undefined): void {
  if (ownerAuthRequired(host, serveWeb, hostedStart) && !ownerToken) throw new Error("OWNER_TOKEN is required for hosted or non-loopback server binds");
}

export function hasValidOwnerToken(expected: string | undefined, provided: string | string[] | undefined): boolean {
  if (!expected || typeof provided !== "string") return false;
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes);
}
