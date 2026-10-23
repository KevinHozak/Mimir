import { existsSync } from "node:fs";
import { resolve } from "node:path";

/** Prefer npm's own entry point; support standalone Node on Windows and Unix layouts. */
export function localNpmCli(env = process.env, node = process.execPath, exists = existsSync) {
  const candidates = [env.npm_execpath, resolve(node, "..", "node_modules", "npm", "bin", "npm-cli.js"), resolve(node, "..", "..", "lib", "node_modules", "npm", "bin", "npm-cli.js")];
  const cli = candidates.find(candidate => candidate && exists(candidate));
  if (!cli) throw new Error("Cannot locate npm; start with npm start or install npm alongside Node");
  return cli;
}

/** The launcher exposes one loopback preview; an explicit CORS policy takes precedence. */
export function localObserverConfig(env = process.env) {
  const port = env.PORT ?? "8888";
  const webPort = env.WEB_PORT ?? "4173";
  if (!/^\d+$/.test(webPort) || Number(webPort) < 1 || Number(webPort) > 65535) throw new Error("WEB_PORT must be an integer from 1 to 65535");
  const previewOrigin = new URL(`http://127.0.0.1:${webPort}`).origin;
  return { port, webPort, previewOrigin, apiUrl: env.VITE_API_URL ?? `http://127.0.0.1:${port}`, observerOrigin: env.OBSERVER_ORIGIN ?? previewOrigin };
}
