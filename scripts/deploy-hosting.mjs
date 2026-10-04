import { createHash } from "node:crypto";
import { resolveObserverApiOrigin } from "./deploy-hosting-config.mjs";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const projectId = "mimir-realm";
const hostingSite = "mimir-realm";
const liveOrigin = "https://mimir-realm.web.app";

function run(command, args, options = {}) {
  const windowsCmd = new Set(["firebase", "npm"]);
  const executable = process.platform === "win32" && windowsCmd.has(command) ? `${command}.cmd` : command;
  const result = spawnSync(executable, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: options.capture === false ? "inherit" : ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32" && windowsCmd.has(command),
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}\n${result.stderr ?? ""}`);
  }
  return result.stdout ?? "";
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function verifyLiveAssets() {
  const distRoot = resolve(repoRoot, "packages/web/dist");
  const localIndexPath = resolve(distRoot, "index.html");
  assert(existsSync(localIndexPath), "packages/web/dist/index.html was not produced by the build");

  const localIndex = readFileSync(localIndexPath, "utf8");
  const assets = [...localIndex.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map((match) => match[1]);
  assert(assets.length > 0, "the built index did not reference any hashed assets");

  const liveIndexResponse = await fetch(`${liveOrigin}/`);
  assert(liveIndexResponse.ok, `live site returned HTTP ${liveIndexResponse.status} for /`);
  const liveIndex = await liveIndexResponse.text();
  assert(liveIndex === localIndex, "live index.html differs from the just-built index.html");

  for (const asset of assets) {
    const localPath = resolve(distRoot, `.${asset}`);
    assert(existsSync(localPath), `built asset is missing: ${asset}`);
    const localBytes = readFileSync(localPath);
    const liveResponse = await fetch(`${liveOrigin}${asset}`);
    assert(liveResponse.ok, `live site returned HTTP ${liveResponse.status} for ${asset}`);
    const liveBytes = Buffer.from(await liveResponse.arrayBuffer());
    assert(sha256(liveBytes) === sha256(localBytes), `live asset differs from build: ${asset}`);
  }

  return assets;
}

try {
  const observerApiOrigin = resolveObserverApiOrigin();
  const status = run("git", ["status", "--porcelain"]);
  assert(status.trim() === "", "working tree is not clean; deploy from a clean checkout");

  run("git", ["fetch", "origin", "main"], { capture: false });
  const head = run("git", ["rev-parse", "HEAD"]).trim();
  const originMain = run("git", ["rev-parse", "origin/main"]).trim();
  assert(head === originMain, `checkout is not at origin/main (HEAD ${head}, origin/main ${originMain})`);

  console.log(`Building ${head}...`);
  run("npm", ["run", "build"], { capture: false, env: { ...process.env, VITE_FIREBASE_AUTH_ENABLED: "true", VITE_API_URL: observerApiOrigin } });

  console.log(`Deploying Firebase Hosting site ${hostingSite} in project ${projectId}...`);
  const deploymentOutput = run("firebase", ["deploy", "--only", `hosting:${hostingSite}`, "--project", projectId, "--json"]);
  let deployment;
  try {
    deployment = JSON.parse(deploymentOutput);
  } catch {
    throw new Error(`Firebase did not return parseable JSON:\n${deploymentOutput}`);
  }
  assert(deployment.status === "success", `Firebase deployment was not successful: ${deploymentOutput}`);
  const version = deployment.result?.hosting;
  assert(version, `Firebase did not return a Hosting version: ${deploymentOutput}`);

  console.log("Verifying the live index and every hashed asset...");
  const assets = await verifyLiveAssets();
  console.log(`Deployment verified: ${version}`);
  console.log(`Live URL: ${liveOrigin}/`);
  console.log(`Verified assets: ${assets.length}`);
} catch (error) {
  console.error(`Deployment failed: ${error.message}`);
  process.exitCode = 1;
}
