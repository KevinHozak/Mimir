import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { localNpmCli } from "./run-local-config.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

const credentialPatterns = [
  /\b(?:gh[opsur]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})/g,
  /\bya29\.[A-Za-z0-9_.-]{20,}/g,
  /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----[\s\S]*/g,
  /\bBearer\s+[A-Za-z0-9_.~+\/-]{32,}=*/gi,
  /(["'](?:access_token|refresh_token|id_token)["']\s*:\s*["'])[^"'\r\n]{20,}(["'])/gi,
];

// Buffer complete lines so a credential split between child chunks is never
// written first. Overlong lines are withheld and fail closed rather than flush
// an unexamined fragment. This is a pattern guard, not a proof of secret absence.
export function createOutputGuard(write, maxLineLength = 65536) {
  let pending = "", dropping = false, failed = false, privateKeyOpen = false;
  const emit = line => {
    if (privateKeyOpen) { if (/-----END (?:[A-Z]+ )?PRIVATE KEY-----/.test(line)) privateKeyOpen = false; return; }
    if (/-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/.test(line)) privateKeyOpen = !/-----END (?:[A-Z]+ )?PRIVATE KEY-----/.test(line);
    let safe = line;
    for (const pattern of credentialPatterns) {
      pattern.lastIndex = 0;
      safe = safe.replace(pattern, () => { failed = true; return "[REDACTED CREDENTIAL]"; });
    }
    write(safe);
  };
  return {
    push(chunk) {
      for (const character of String(chunk)) {
        if (dropping) { if (character === "\n") dropping = false; continue; }
        pending += character;
        if (pending.length > maxLineLength) { pending = ""; dropping = true; failed = true; write("[OUTPUT WITHHELD: overlong line]\n"); }
        else if (character === "\n") { emit(pending); pending = ""; }
      }
    },
    end() { if (pending) emit(pending); pending = ""; },
    get failed() { return failed; },
  };
}

export function sourceIdentity() {
  const git = args => execFileSync("git", args, { cwd: root, encoding: "utf8" });
  const paths = [...new Set(git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"]).split("\0").filter(Boolean))]
    .filter(path => !path.split("/").some(part => ["node_modules", "dist", "data", ".tmp", ".git"].includes(part))).sort();
  const hash = createHash("sha256");
  for (const path of paths) {
    hash.update(path + "\0");
    const absolute = join(root, path);
    if (!existsSync(absolute)) { hash.update("deleted\0"); continue; }
    const bytes = readFileSync(absolute);
    hash.update(String(bytes.length) + "\0"); hash.update(bytes);
  }
  return { head: git(["rev-parse", "HEAD"]).trim(), algorithm: "sha256", sourceHash: hash.digest("hex"), paths };
}

export function checkedRestorePath(workspace, target) {
  const absolute = resolve(target), within = relative(resolve(workspace), absolute);
  if (!within || isAbsolute(within) || within === ".." || within.startsWith("..\\") || within.startsWith("../")) throw new Error("Restore path must be inside the workspace");
  return absolute;
}

export function identityChanged(before, after) {
  return before.head !== after.head || before.sourceHash !== after.sourceHash;
}
// Every former CI build-and-test script, in its original order. Builds inside
// package test scripts are omitted after the initial full workspace build.
export const checks = [
  [".", "test"],
  ...["state", "first-glow-commands", "first-glow-command-acceptance", "first-glow-restart", "backup-restore", "backup-replication", "ai-runtime", "pulse-gate", "owner-auth", "security-p4", "security-p5", "chronicle"].map(name => ["packages/server", `test:${name}`]),
  ["packages/web", "test:hosted-auth-boundary"],
  ...["public-archive", "observer-bridge-auth", "observer-bridge-sse", "observer-bridge-lifecycle", "observer-bridge-http2", "observer-rehearsal", "deploy-hosting-config"].map(name => [".", `test:${name}`]),
  ...["first-glow", "observer-zoom", "first-glow-header", "first-glow-live-panel", "first-glow-issue-42", "first-glow-audio-p5"].map(name => ["packages/web", `test:${name}`]),
  [".", "world:test"],
  ["packages/web", "test:history"], ["packages/web", "test:history-viewer"],
  [".", "test:local-observer"],
];

export function expandScript(directory, name) {
  const script = JSON.parse(readFileSync(join(root, directory, "package.json"), "utf8")).scripts[name];
  if (!script) throw new Error(`Missing verification script ${directory}:${name}`);
  return script.split(/\s*&&\s*/).flatMap(command => {
    const parts = command.trim().split(/\s+/);
    if (parts[0] === "npm" && parts[1] === "run" && parts[2] === "build") return [];
    if (parts[0] === "npm" && parts[1] === "run" && parts[3] === "--workspace") {
      const workspace = parts[4].replace("@mimir/", "packages/");
      return expandScript(workspace, parts[2]);
    }
    if (!["node", "tsx"].includes(parts[0])) throw new Error(`Unsupported verification command: ${command}`);
    return [{ label: `${directory}:${name} — ${command}`, cwd: join(root, directory), args: parts[0] === "tsx" ? [join(root, "node_modules/tsx/dist/cli.mjs"), ...parts.slice(1)] : parts.slice(1) }];
  });
}

export async function runSequential(steps, execute, record) {
  for (const step of steps) {
    const result = await execute(step);
    record({ label: step.label, ...result });
    if (result.exitCode !== 0) return result.exitCode ?? 1;
  }
  return 0;
}

async function main() {
  const runDir = join(root, ".tmp/verification", new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(runDir, { recursive: true });
  const summary = { startedAt: new Date().toISOString(), status: "running", steps: [] };
  const save = () => writeFileSync(join(runDir, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
  save();
  let snapshotReady = false;
  let exitCode = 1;
  let activeChild, interruptedSignal;
  const interrupt = signal => {
    interruptedSignal = signal;
    if (!activeChild?.pid) return;
    try {
      if (process.platform === "win32") execFileSync("taskkill", ["/PID", String(activeChild.pid), "/T", "/F"], { stdio: "ignore", timeout: 10000 });
      else process.kill(-activeChild.pid, signal);
    } catch { activeChild.kill(signal); }
  };
  const onInterrupt = () => interrupt("SIGINT"), onTerminate = () => interrupt("SIGTERM");
  process.on("SIGINT", onInterrupt); process.on("SIGTERM", onTerminate);
  try {
    summary.source = sourceIdentity(); save();
    if (!existsSync(join(root, "node_modules/tsx"))) throw new Error("Run npm ci before npm run verify:local.");
    const { chromium } = await import("playwright");
    if (!existsSync(chromium.executablePath())) throw new Error("Install the browser first: npx playwright install --with-deps chromium");
    const npmCli = localNpmCli();
    const env = { ...process.env, HOST: "127.0.0.1", AUTO_PULSE: "false", AI_ENABLED: "false", MIMIR_HOSTED: "false", PUBLIC_OBSERVER_AUTH_REQUIRED: "false", VITE_API_URL: process.env.VERIFY_PREVIEW_API_URL ?? process.env.VITE_API_URL ?? "http://127.0.0.1:8888" };
    delete env.VITE_LIVE_API_URL;
    const steps = [
      { label: "Verification runner regression checks", cwd: root, args: ["--test", "scripts/verify-local.test.mjs"] },
      { label: "CI policy regression checks", cwd: root, args: ["--test", "scripts/ci-policy.test.mjs"] },
      { label: "Full workspace build", cwd: root, args: [npmCli, "run", "build"] },
      ...checks.flatMap(([directory, name]) => expandScript(directory, name)),
    ];
    const snapshot = join(runDir, "built-web");
    exitCode = await runSequential(steps, step => new Promise(resolveExit => {
      console.log(`\n▶ ${step.label}`);
      const startedAt = new Date().toISOString();
      const log = join(runDir, `${String(summary.steps.length + 1).padStart(2, "0")}.log`);
      writeFileSync(log, "");
      const child = spawn(process.execPath, step.args, { cwd: step.cwd, env, detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"] });
      activeChild = child;
      const guards = [];
      for (const [stream, target] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
        const guard = createOutputGuard(safe => { target.write(safe); writeFileSync(log, safe, { flag: "a" }); });
        guards.push(guard); stream.setEncoding("utf8"); stream.on("data", chunk => guard.push(chunk));
      }
      let spawnError;
      child.on("error", error => { spawnError = error.message; });
      child.once("close", (code, signal) => {
        activeChild = undefined;
        guards.forEach(guard => guard.end());
        const outputGuardFailed = guards.some(guard => guard.failed);
        if (step.label === "Full workspace build" && code === 0) { cpSync(join(root, "packages/web/dist"), snapshot, { recursive: true }); snapshotReady = true; }
        resolveExit({ exitCode: interruptedSignal ? 130 : outputGuardFailed ? 1 : code ?? 1, processExitCode: code, outputGuardFailed, signal, startedAt, finishedAt: new Date().toISOString(), log, ...(spawnError ? { error: spawnError } : {}) });
      });
    }), result => { summary.steps.push(result); save(); });
  } catch (error) {
    summary.error = error.message;
    console.error(error.message);
  } finally {
    // Launcher acceptance deliberately rebuilds for disposable ports. Restore
    // this run's freshly built preview so an existing review stays on its API.
    if (snapshotReady) {
      try { const target = checkedRestorePath(root, join(root, "packages/web/dist")); rmSync(target, { recursive: true, force: true }); cpSync(join(runDir, "built-web"), target, { recursive: true }); summary.previewRestored = true; }
      catch (error) { summary.restoreError = error.message; exitCode = 1; }
    }
    if (summary.source) {
      try {
        summary.finalSource = sourceIdentity();
        summary.sourceChanged = identityChanged(summary.source, summary.finalSource);
        if (summary.sourceChanged) { summary.error = "Source changed during verification; rerun against the final content."; exitCode = 1; }
      } catch { summary.error = "Unable to verify final source identity; rerun verification."; exitCode = 1; }
    }
    if (interruptedSignal) { summary.interruptedSignal = interruptedSignal; exitCode = 130; }
    summary.exitCode = exitCode;
    summary.status = interruptedSignal ? "interrupted" : exitCode === 0 ? "passed" : "failed";
    summary.finishedAt = new Date().toISOString();
    save();
    console.log(`\nLocal verification ${summary.status}. Summary: ${join(runDir, "summary.json")}`);
    process.off("SIGINT", onInterrupt); process.off("SIGTERM", onTerminate);
  }
  process.exitCode = exitCode;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
