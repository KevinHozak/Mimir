import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { localNpmCli } from "./run-local-config.mjs";

// One persistent allocation, never a per-run budget. The separate dev UI avoids
// injecting the AI endpoint into the ordinary observer's built preview assets.
const build = spawn(process.execPath, [localNpmCli(), "run", "build"], { stdio: "inherit", windowsHide: true });
const code = await new Promise(resolveExit => build.once("exit", resolveExit));
if (code !== 0) process.exit(code ?? 1);
const goals = process.argv.includes("--goals");
const port = process.env.PORT ?? (goals ? "8891" : "8890"), webPort = process.env.WEB_PORT ?? (goals ? "4176" : "4175");
const origin = `http://127.0.0.1:${webPort}`;
const env = { ...process.env, AI_ENABLED: "true", AI_RUNTIME_MODE: "spark-live", MIMIR_SPARK_AI_BUDGET_USD: "5", MIMIR_SPARK_AI_KILL_SWITCH: "enabled", MIMIR_SPARK_GOALS: String(goals), DATABASE_PATH: resolve(goals ? "data/local/mimir-ai-goals.db" : "data/local/mimir-ai.db"), AUTO_PULSE: process.env.AUTO_PULSE ?? "false", PORT: port, OBSERVER_ORIGIN: origin, VITE_API_URL: `http://127.0.0.1:${port}` };
const server = spawn(process.execPath, [resolve("packages/server/dist/index.js")], { stdio: "inherit", windowsHide: true, env });
const web = spawn(process.execPath, [resolve("node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", webPort, "--strictPort"], { cwd: resolve("packages/web"), stdio: "inherit", windowsHide: true, env });
let closing = false;
function close(code = 0) { if (closing) return; closing = true; server.kill(); web.kill(); process.exitCode = code; }
for (const child of [server, web]) { child.on("error", () => close(1)); child.once("exit", code => close(code ?? 1)); }
process.once("SIGINT", () => close()); process.once("SIGTERM", () => close());
console.log(`Spark AI observer: ${origin}/ (paused; USD 5 persistent cap)`);
