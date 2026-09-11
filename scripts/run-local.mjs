import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const node = process.execPath;
const serverEntry = resolve(root, "packages/server/dist/index.js");
const viteEntry = resolve(root, "node_modules/vite/bin/vite.js");
const apiUrl = process.env.VITE_API_URL ?? `http://127.0.0.1:${process.env.PORT ?? "8888"}`;

function run(command, args, options = {}) {
  return spawn(command, args, { cwd: options.cwd ?? root, stdio: "inherit", env: { ...process.env, ...options.env } });
}

if (!existsSync(serverEntry) || !existsSync(resolve(root, "packages/web/dist/index.html")) || process.env.VITE_API_URL || process.env.PORT || process.env.WEB_PORT) {
  const npmCli = resolve(node, "..", "node_modules", "npm", "bin", "npm-cli.js");
  const build = run(node, [npmCli, "run", "build"], { env: { VITE_API_URL: apiUrl } });
  const buildExit = await new Promise((resolveExit) => build.once("exit", (code) => resolveExit(code ?? 1)));
  if (buildExit !== 0) process.exit(buildExit);
}

const server = run(node, [serverEntry], {
  env: {
    PORT: process.env.PORT ?? "8888",
    AUTO_TICK: process.env.AUTO_TICK ?? "true",
    TICK_INTERVAL_MS: process.env.TICK_INTERVAL_MS ?? "4000",
    DATABASE_PATH: process.env.DATABASE_PATH ?? join(root, "data", "local", "mimir.db"),
  },
});
const webPort = process.env.WEB_PORT ?? "4173";
const web = run(node, [viteEntry, "preview", "--host", "127.0.0.1", "--port", webPort], {
  cwd: resolve(root, "packages/web"),
  env: { VITE_API_URL: apiUrl },
});

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  server.kill();
  web.kill();
  process.exit(code);
}

server.once("exit", (code) => { if (!shuttingDown) shutdown(code ?? 1); });
web.once("exit", (code) => { if (!shuttingDown) shutdown(code ?? 1); });
process.once("SIGINT", () => shutdown(0));
process.once("SIGTERM", () => shutdown(0));

console.log(`Mimir is running at http://127.0.0.1:${webPort}/`);
