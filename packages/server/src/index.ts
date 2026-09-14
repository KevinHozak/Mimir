// @ts-nocheck
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import { DatabaseSync } from "node:sqlite";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import type { ServerResponse } from "node:http";
import { advanceWorld, applyCrossingVoicesChoice, applyShelterLoomChoice, CHARACTER_CARDS, createCrossingVoicesAnchor, createShelterLoomAnchor, createWorld, createWorldFromBundle, createWorldV2, FIRST_GLOW_DESIGN, FIRST_WINTER_DILEMMAS, FIRST_WINTER_SCENARIO, HOME_SETTLEMENT, observeResonance, setObjectBlocked, type ResonanceCandidateRecord, type ResonanceObservationEvent, type ResonanceObservationRule, type ResonanceState, type ShelterLoomChoice, type SocialInterpretation, type WorldEvent, type WorldState } from "@mimir/engine";
import { createFirstGlowServerAIConfig, FirstGlowServerAIRuntime } from "./first-glow-ai-runtime.js";
import { bundleHash, decodeWorldBundle, validateWorldBundle, type DecodedWorldBundle, type WorldBundle } from "@mimir/world-data";
import { normalizeState } from "./state.js";
import { createBundleInclusiveBackup } from "./backup-lib.js";
import { replicateBackup, type BackupReplicationStatus } from "./backup-replication.js";
import { observerAuthRequired, verifyObserverToken } from "./observer-auth.js";

const port = Number(process.env.PORT ?? 8888);
const DEFAULT_PULSE_INTERVAL_MS = 4000;
let pulseIntervalMs = Number(process.env.PULSE_INTERVAL_MS ?? DEFAULT_PULSE_INTERVAL_MS);
const autoPulse = process.env.AUTO_PULSE !== "false";
const seasonPulseLimit = Number(process.env.SEASON_PULSE_LIMIT ?? 360);
const socialBudgetCents = Number(process.env.SOCIAL_BUDGET_CENTS ?? 0);
const aiRuntimeConfig = createFirstGlowServerAIConfig();
const aiRuntime = new FirstGlowServerAIRuntime(aiRuntimeConfig);
const aiEnabled = aiRuntimeConfig.enabled;
const socialMode = aiEnabled ? "ai-bounded" : "rules-only";
const ownerToken = process.env.OWNER_TOKEN;
const databasePath = process.env.DATABASE_PATH ?? join(process.cwd(), "data", "local", "mimir.db");
const backupIntervalMs = Number(process.env.BACKUP_INTERVAL_MS ?? 0);
const backupDirectory = resolve(process.env.BACKUP_DIR ?? join(process.cwd(), "data", "backups"));
const backupReplicationUri = process.env.BACKUP_GCS_URI?.trim();
const backupFreshnessMaxAgeMs = Number(process.env.BACKUP_FRESHNESS_MAX_AGE_MS ?? Math.max(backupIntervalMs * 2, 172800000));
const serveWeb = process.env.SERVE_WEB === "true";
const webDistDirectory = resolve(process.env.WEB_DIST_DIR ?? join(process.cwd(), "packages/web/dist"));
const worldBundleRoot = resolve(process.env.WORLD_BUNDLE_ROOT ?? join(process.cwd(), "assets/world/generated"));
const defaultFirstGlowBundleHash = "sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e";
mkdirSync(dirname(databasePath), { recursive: true });
const database = new DatabaseSync(databasePath);
database.exec("PRAGMA journal_mode = WAL;");
database.exec(`CREATE TABLE IF NOT EXISTS checkpoints (pulse INTEGER PRIMARY KEY, state_json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, pulse INTEGER NOT NULL, event_json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS interpretations (id TEXT PRIMARY KEY, pulse INTEGER NOT NULL, interpretation_json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS timelines (id TEXT PRIMARY KEY, parent_id TEXT, created_at TEXT NOT NULL, status TEXT NOT NULL, archived_at TEXT); CREATE TABLE IF NOT EXISTS timeline_checkpoints (timeline_id TEXT NOT NULL, pulse INTEGER NOT NULL, state_json TEXT NOT NULL, PRIMARY KEY (timeline_id, pulse)); CREATE TABLE IF NOT EXISTS timeline_events (timeline_id TEXT NOT NULL, id TEXT NOT NULL, pulse INTEGER NOT NULL, event_json TEXT NOT NULL, PRIMARY KEY (timeline_id, id)); CREATE TABLE IF NOT EXISTS timeline_interpretations (timeline_id TEXT NOT NULL, id TEXT NOT NULL, pulse INTEGER NOT NULL, interpretation_json TEXT NOT NULL, PRIMARY KEY (timeline_id, id)); CREATE TABLE IF NOT EXISTS pending_commands (id TEXT PRIMARY KEY, timeline_id TEXT NOT NULL, ordering INTEGER NOT NULL, target_pulse INTEGER NOT NULL, settlement_id TEXT NOT NULL, object_id TEXT NOT NULL, blocked INTEGER NOT NULL, idempotency_key TEXT NOT NULL, status TEXT NOT NULL, result_json TEXT, created_at TEXT NOT NULL, UNIQUE(timeline_id, idempotency_key)); CREATE TABLE IF NOT EXISTS runtime_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
if (!database.prepare("SELECT id FROM timelines WHERE id = ?").get("main")) database.prepare("INSERT INTO timelines (id, parent_id, created_at, status) VALUES (?, NULL, ?, 'active')").run("main", new Date().toISOString());
const migrated = database.prepare("SELECT COUNT(*) AS count FROM timeline_checkpoints WHERE timeline_id = ?").get("main") as { count: number };
if (migrated.count === 0) {
  database.exec("INSERT INTO timeline_checkpoints (timeline_id, pulse, state_json) SELECT 'main', pulse, state_json FROM checkpoints;");
  database.exec("INSERT INTO timeline_events (timeline_id, id, pulse, event_json) SELECT 'main', id, pulse, event_json FROM events;");
  database.exec("INSERT INTO timeline_interpretations (timeline_id, id, pulse, interpretation_json) SELECT 'main', id, pulse, interpretation_json FROM interpretations;");
}
const savedTimeline = database.prepare("SELECT value FROM runtime_metadata WHERE key = 'active_timeline'").get() as { value: string } | undefined;
let activeTimelineId = savedTimeline?.value ?? "main";
let schedulerPaused = !autoPulse;
let scheduler: NodeJS.Timeout | undefined;
let shuttingDown = false;
const backupReplicationStatus: BackupReplicationStatus = { enabled: Boolean(backupReplicationUri), destination: backupReplicationUri, freshnessMaxAgeMs: backupFreshnessMaxAgeMs, consecutiveFailures: 0 };
let backupReplicationInFlight = false;
function currentBackupReplicationStatus(): BackupReplicationStatus & { stale: boolean } {
  const stale = backupReplicationStatus.enabled && (!backupReplicationStatus.lastSuccessAt || Date.now() - Date.parse(backupReplicationStatus.lastSuccessAt) > backupReplicationStatus.freshnessMaxAgeMs);
  return { ...backupReplicationStatus, stale };
}
async function createScheduledBackup(reason: string) {
  const destination = join(backupDirectory, `mimir-${new Date().toISOString().replaceAll(":", "-")}-${reason}.db`);
  if (!existsSync(databasePath)) return;
  try {
    const manifest = createBundleInclusiveBackup(databasePath, destination, worldBundleRoot);
    app.log.info({ destination, bundleHashes: manifest.bundleHashes }, "scheduled bundle-inclusive backup created");
    if (backupReplicationUri) {
      if (backupReplicationInFlight) { app.log.warn("skipping scheduled backup replication because the previous upload is still running"); return; }
      backupReplicationInFlight = true;
      backupReplicationStatus.lastAttemptAt = new Date().toISOString();
      try {
        const result = await replicateBackup(destination, backupReplicationUri);
        backupReplicationStatus.lastSuccessAt = new Date().toISOString();
        backupReplicationStatus.lastObjectUri = result.objectUri;
        backupReplicationStatus.lastArchiveSha256 = result.archiveSha256;
        backupReplicationStatus.lastArchiveBytes = result.archiveBytes;
        backupReplicationStatus.lastError = undefined;
        backupReplicationStatus.consecutiveFailures = 0;
        app.log.info({ objectUri: result.objectUri, archiveSha256: result.archiveSha256, archiveBytes: result.archiveBytes }, "independent backup replication verified");
      } catch (error) {
        backupReplicationStatus.lastError = error instanceof Error ? error.message : String(error);
        backupReplicationStatus.consecutiveFailures += 1;
        app.log.error({ error }, "independent backup replication failed");
      } finally { backupReplicationInFlight = false; }
    }
  } catch (error) {
    app.log.error({ destination, error }, "scheduled backup failed");
    if (backupReplicationUri) { backupReplicationStatus.lastAttemptAt = new Date().toISOString(); backupReplicationStatus.lastError = error instanceof Error ? error.message : String(error); backupReplicationStatus.consecutiveFailures += 1; }
  }
}

function loadState(timelineId: string): WorldState {
  const row = database.prepare("SELECT state_json FROM timeline_checkpoints WHERE timeline_id = ? ORDER BY pulse DESC LIMIT 1").get(timelineId) as { state_json: string } | undefined;
  if (row) return normalizeState(JSON.parse(row.state_json) as WorldState);
  if (timelineId === "main") {
    const bundlePath = resolve(worldBundleRoot, defaultFirstGlowBundleHash, "world.json");
    if (!existsSync(bundlePath)) throw new Error(`default First Glow bundle not found: ${defaultFirstGlowBundleHash}`);
    const bundle = decodeWorldBundle(JSON.parse(readFileSync(bundlePath, "utf8")));
    if (bundle.schemaVersion !== 3) throw new Error("default First Glow bundle must use schema 3");
    return normalizeState(createWorldFromBundle(bundle, 20260906, timelineId, 12));
  }
  return normalizeState(createWorld(20260906, timelineId));
}
function validateBundleAssetsAtStartup(bundle: DecodedWorldBundle): void {
  const bundleRoot = resolve(worldBundleRoot, bundle.bundle.contentHash);
  for (const asset of bundle.assets) {
    const candidate = resolve(bundleRoot, asset.path);
    const containment = relative(bundleRoot, candidate);
    if (containment.startsWith("..") || isAbsolute(containment) || !existsSync(candidate) || !statSync(candidate).isFile()) throw new Error(`missing First Glow bundle asset: ${asset.path}`);
    const actualHash = createHash("sha256").update(readFileSync(candidate)).digest("hex");
    if (actualHash !== asset.sha256 && `sha256-${actualHash}` !== asset.sha256) throw new Error(`bundle asset checksum mismatch at startup: ${asset.path}`);
  }
}
let state = loadState(activeTimelineId);
for (const bundle of [...(state.structuredState?.settlements ?? []).map(settlement => settlement.bundle), ...(state.firstGlowState?.settlements ?? []).map(settlement => settlement.bundle)]) validateBundleAssetsAtStartup(bundle);
if (!database.prepare("SELECT 1 FROM timeline_checkpoints WHERE timeline_id = ? LIMIT 1").get(activeTimelineId)) database.prepare("INSERT INTO timeline_checkpoints (timeline_id, pulse, state_json) VALUES (?, ?, ?)").run(activeTimelineId, state.pulse, JSON.stringify(state));
database.prepare("INSERT INTO runtime_metadata (key, value) VALUES ('active_timeline', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(activeTimelineId);
const liveClients = new Set<ServerResponse>();
const app = Fastify({ logger: true });
await app.register(cors, { origin: true });
function requireOwner(request: FastifyRequest, reply: FastifyReply): boolean { if (!ownerToken || request.headers["x-owner-token"] === ownerToken) return true; reply.code(401).send({ error: "owner authorization required" }); return false; }
async function requireObserver(request: FastifyRequest, reply: FastifyReply): Promise<boolean> { if (!observerAuthRequired) return true; if (await verifyObserverToken(request.headers.authorization)) return true; reply.code(401).send({ error: "approved Google account required" }); return false; }
app.addHook("onRequest", async (request, reply) => { const path = (request.url ?? "").split("?", 1)[0]; if (observerAuthRequired && path.startsWith("/api/") && !path.startsWith("/api/owner/") && !(await requireObserver(request, reply))) return reply; });
function currentTimeline() { return database.prepare("SELECT id, parent_id, created_at, status, archived_at FROM timelines WHERE id = ?").get(activeTimelineId) as { id: string; parent_id: string | null; created_at: string; status: string; archived_at: string | null }; }
function saveActiveTimeline() { database.prepare("INSERT INTO runtime_metadata (key, value) VALUES ('active_timeline', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(activeTimelineId); }
type PendingBlockCommand = { id: string; ordering: number; target_pulse: number; settlement_id: string; object_id: string; blocked: number; idempotency_key: string; status: string; result_json: string | null };
function currentObjectFootprint(objectId: string): Set<string> { const glow = state.firstGlowState.settlements.flatMap(settlement => settlement.bundle.objects.map(object => ({ settlement, object }))).find(candidate => candidate.object.id === objectId); if (!glow) return new Set(); const definition = glow.settlement.bundle.objectDefinitions[glow.object.definitionId]; return new Set(definition.footprint.map(offset => `${glow.object.origin.x + offset.x},${glow.object.origin.y + offset.y}`)); }
function occupiedActorIds(objectId: string): string[] { const footprint = currentObjectFootprint(objectId); const villagers = (state.villagers ?? []).filter(villager => footprint.has(`${villager.position.x},${villager.position.y}`)).map(villager => villager.id); const sparks = state.firstGlowState?.settlements.flatMap(settlement => settlement.sparks.filter(spark => footprint.has(`${spark.position.x},${spark.position.y}`)).map(spark => spark.id)) ?? []; return [...villagers, ...sparks].sort(); }
function pendingCommandsForPulse(pulse: number): PendingBlockCommand[] { return database.prepare("SELECT id, ordering, target_pulse, settlement_id, object_id, blocked, idempotency_key, status, result_json FROM pending_commands WHERE timeline_id = ? AND status = 'pending' AND target_pulse <= ? ORDER BY ordering ASC").all(activeTimelineId, pulse) as PendingBlockCommand[]; }
function applyPendingCommands(base: WorldState, pulse: number): { state: WorldState; events: WorldEvent[]; commands: PendingBlockCommand[] } { let next = base; const events: WorldEvent[] = []; const commands = pendingCommandsForPulse(pulse); for (const command of commands) { const occupied = command.blocked ? occupiedActorIds(command.object_id) : []; if (occupied.length) { events.push({ id: `event-${pulse}-command-${command.id}`, pulse, kind: "world-object", message: `Object ${command.object_id} could not be blocked because it contains actors: ${occupied.join(", ")}.`, villagerIds: occupied, settlementIds: [command.settlement_id] }); continue; } if (next.structuredState) { const structuredState = structuredClone(next.structuredState); const settlement = structuredState.settlements.find(candidate => candidate.id === command.settlement_id); const object = settlement?.bundle.objects.find(candidate => candidate.id === command.object_id); if (!settlement || !object) continue; const current = settlement.runtime.objects.find(item => item.objectId === command.object_id); const previousBlocked = current?.blocked ?? false; if (previousBlocked !== Boolean(command.blocked)) { if (current) current.blocked = Boolean(command.blocked); else settlement.runtime.objects.push({ objectId: command.object_id, blocked: Boolean(command.blocked) }); settlement.runtime.navigationRevision += 1; } next = { ...next, structuredState, worldRuntime: { ...(next.worldRuntime ?? { blockedObjectIds: [] }), blockedObjectIds: command.blocked ? [...new Set([...(next.worldRuntime?.blockedObjectIds ?? []), command.object_id])] : (next.worldRuntime?.blockedObjectIds ?? []).filter(id => id !== command.object_id) } }; if (previousBlocked !== Boolean(command.blocked)) events.push({ id: `event-${pulse}-command-${command.id}`, pulse, kind: "world-object", message: `Object ${command.object_id} is now ${command.blocked ? "blocked" : "open"}.`, villagerIds: [], settlementIds: [command.settlement_id] }); continue; } const before = next.worldRuntime?.blockedObjectIds ?? []; const after = setObjectBlocked(next.worldDefinition!, next.worldRuntime ?? { blockedObjectIds: [] }, command.object_id, Boolean(command.blocked)).blockedObjectIds; const changed = before.join(",") !== after.join(","); next = { ...next, worldRuntime: { ...(next.worldRuntime ?? { blockedObjectIds: [] }), blockedObjectIds: after }, settlements: next.settlements.map(settlement => settlement.id === command.settlement_id ? { ...settlement, worldRuntime: { ...settlement.worldRuntime, blockedObjectIds: after } } : settlement) }; if (changed) events.push({ id: `event-${pulse}-command-${command.id}`, pulse, kind: "world-object", message: `Object ${command.object_id} is now ${command.blocked ? "blocked" : "open"}.`, villagerIds: [], settlementIds: [command.settlement_id] }); } return { state: next, events, commands }; }

function applyFirstGlowPendingCommands(base: WorldState, pulse: number): { state: WorldState; events: WorldEvent[]; commands: PendingBlockCommand[] } {
  if (!base.firstGlowState) throw new Error("First Glow command path requires First Glow state");
  const next = { ...structuredClone(base), firstGlowState: structuredClone(base.firstGlowState) }; const events: WorldEvent[] = []; const commands = pendingCommandsForPulse(pulse);
  for (const command of commands) {
    const settlement = next.firstGlowState.settlements.find(candidate => candidate.id === command.settlement_id); const object = settlement?.bundle.objects.find(candidate => candidate.id === command.object_id); if (!settlement || !object) continue;
    const definition = settlement.bundle.objectDefinitions[object.definitionId]; const footprint = new Set(definition.footprint.map(offset => `${object.origin.x + offset.x},${object.origin.y + offset.y}`)); const occupied = command.blocked ? settlement.sparks.filter(spark => footprint.has(`${spark.position.x},${spark.position.y}`)).map(spark => spark.id).sort() : [];
    if (occupied.length) { events.push({ id: `event-${pulse}-command-${command.id}`, pulse, kind: "world-object", message: `Object ${command.object_id} could not be blocked because it contains Sparks: ${occupied.join(", ")}.`, villagerIds: [], settlementIds: [command.settlement_id] }); continue; }
    const current = settlement.runtime.objects.find(item => item.objectId === command.object_id); const previousBlocked = current?.blocked ?? false; if (previousBlocked === Boolean(command.blocked)) continue;
    if (current) current.blocked = Boolean(command.blocked); else settlement.runtime.objects.push({ objectId: command.object_id, blocked: Boolean(command.blocked) }); settlement.runtime.navigationRevision += 1;
    next.worldRuntime = { ...(next.worldRuntime ?? { blockedObjectIds: [] }), blockedObjectIds: command.blocked ? [...new Set([...(next.worldRuntime?.blockedObjectIds ?? []), command.object_id])] : (next.worldRuntime?.blockedObjectIds ?? []).filter(id => id !== command.object_id) };
    next.settlements = next.settlements.map(item => item.id === settlement.id ? { ...item, worldRuntime: { ...item.worldRuntime, blockedObjectIds: next.worldRuntime?.blockedObjectIds ?? [] } } : item);
    events.push({ id: `event-${pulse}-command-${command.id}`, pulse, kind: "world-object", message: `Object ${command.object_id} is now ${command.blocked ? "blocked" : "open"}.`, villagerIds: [], settlementIds: [command.settlement_id] });
  }
  return { state: next, events, commands };
}

app.get("/health", async () => ({ ok: true, pulse: state.pulse, schedulerPaused, databasePath, timeline: currentTimeline(), socialMode, socialBudgetCents, backupReplication: currentBackupReplicationStatus() }));
app.get("/api/backup/status", async () => currentBackupReplicationStatus());
app.get("/api/social/config", async () => ({ mode: socialMode, ...aiRuntime.status(), aiEnabled, budgetCents: socialBudgetCents }));
app.get("/api/design", async () => state.firstGlowState ? { themeId: "living-circuit", ageId: "first-glow", characterCards: [], dilemmas: [], sharedStore: undefined, firstGlow: FIRST_GLOW_DESIGN } : ({ characterCards: CHARACTER_CARDS, dilemmas: FIRST_WINTER_DILEMMAS, sharedStore: state.sharedStore }));
app.get("/api/resonance", async () => {
  const fixturePath = resolve(process.cwd(), "docs", "resonance-anchor-fixtures.json");
  if (!existsSync(fixturePath)) return { source: "committed-objective-events", observations: [], currentPulse: state.pulse };
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as { schemaVersion: number; rule: ResonanceObservationRule; cases: Array<{ id: string; events: ResonanceObservationEvent[] }> };
  return {
    source: "resonance-contract-fixtures",
    schemaVersion: fixture.schemaVersion,
    rule: fixture.rule,
    currentPulse: state.pulse,
    committedEventCount: state.firstGlowState?.events.length ?? 0,
    observations: fixture.cases.map((item) => ({ fixtureId: item.id, ...observeResonance(item.events, fixture.rule), evidence: item.events.slice().sort((left, right) => left.pulse - right.pulse || left.id.localeCompare(right.id)) })),
  };
});
app.get("/api/resonance/anchors", async () => ({ resonance: state.resonance ?? { schemaVersion: 1, candidates: [], anchors: [] } }));
app.get("/api/region", async () => ({ settlements: state.settlements, routes: state.routes, tradeHistory: state.tradeHistory, weather: state.weather, hazards: state.hazards, timelineId: activeTimelineId }));
app.get("/api/timelines", async () => ({ activeTimelineId, timelines: database.prepare("SELECT id, parent_id, created_at, status, archived_at FROM timelines ORDER BY created_at").all() }));
app.get("/api/history", async (request, reply) => {
  const query = request.query as { timelineId?: string; pulse?: string };
  const timelineId = query.timelineId ?? activeTimelineId;
  const timeline = database.prepare("SELECT id, parent_id, created_at, status, archived_at FROM timelines WHERE id = ?").get(timelineId) as { id: string; parent_id: string | null; created_at: string; status: string; archived_at: string | null } | undefined;
  if (!timeline) return reply.code(404).send({ state: "unavailable", error: "timeline not found" });
  const checkpoints = database.prepare("SELECT pulse FROM timeline_checkpoints WHERE timeline_id = ? ORDER BY pulse ASC").all(timelineId) as { pulse: number }[];
  if (!checkpoints.length) return reply.send({ state: "empty", activeTimelineId, timeline, checkpoints: [] });
  const selectedPulse = query.pulse === undefined ? checkpoints[checkpoints.length - 1].pulse : Number(query.pulse);
  if (!Number.isInteger(selectedPulse) || selectedPulse < 0) return reply.code(400).send({ state: "unavailable", error: "pulse must be a non-negative integer" });
  const checkpoint = database.prepare("SELECT state_json FROM timeline_checkpoints WHERE timeline_id = ? AND pulse = ?").get(timelineId, selectedPulse) as { state_json: string } | undefined;
  if (!checkpoint) return reply.code(404).send({ state: "unavailable", error: `No checkpoint exists for pulse ${selectedPulse}` });
  try {
    const world = normalizeState(JSON.parse(checkpoint.state_json) as WorldState);
    const eventRows = database.prepare("SELECT event_json FROM timeline_events WHERE timeline_id = ? AND pulse <= ? ORDER BY pulse ASC, id ASC").all(timelineId, selectedPulse) as { event_json: string }[];
    const interpretationRows = database.prepare("SELECT interpretation_json FROM timeline_interpretations WHERE timeline_id = ? AND pulse <= ? ORDER BY pulse ASC, id ASC").all(timelineId, selectedPulse) as { interpretation_json: string }[];
    return { state: "ready", activeTimelineId, timeline, checkpoints: checkpoints.map(item => item.pulse), selectedPulse, world, events: eventRows.map(row => JSON.parse(row.event_json) as WorldEvent[]).flat(), interpretations: interpretationRows.map(row => JSON.parse(row.interpretation_json) as SocialInterpretation), movementRecords: world.firstGlowState.history?.movements ?? [], decisionRecords: world.firstGlowState.history?.decisions ?? [] };
  } catch (error) {
    return reply.code(409).send({ state: "incompatible", activeTimelineId, timeline, checkpoints: checkpoints.map(item => item.pulse), error: error instanceof Error ? error.message : "checkpoint is incompatible with First Glow" });
  }
});
app.get("/api/world/bundles/:hash", async (request, reply) => { const hash = (request.params as { hash?: string }).hash; if (!hash || !/^sha256-[a-f0-9]{64}$/.test(hash)) return reply.code(400).send({ error: "invalid bundle hash" }); const bundlePath = resolve(worldBundleRoot, hash, "world.json"); const relativeBundlePath = relative(worldBundleRoot, bundlePath); if (relativeBundlePath.startsWith("..") || isAbsolute(relativeBundlePath) || !existsSync(bundlePath)) return reply.code(404).send({ error: "bundle not found" }); try { const bundle = decodeWorldBundle(JSON.parse(readFileSync(bundlePath, "utf8"))); if (bundleHash(bundle) !== hash) return reply.code(409).send({ error: "bundle content hash mismatch" }); return { bundle }; } catch (error) { return reply.code(409).send({ error: error instanceof Error ? error.message : "invalid bundle" }); } });
app.get("/api/world/bundles/:hash/assets/*", async (request, reply) => { const params = request.params as { hash?: string; "*"?: string }; const hash = params.hash; const wildcard = params["*"]; const assetPath = wildcard ? `assets/${wildcard}` : undefined; if (!hash || !/^sha256-[a-f0-9]{64}$/.test(hash) || !assetPath) return reply.code(400).send({ error: "invalid bundle asset path" }); const bundlePath = resolve(worldBundleRoot, hash, "world.json"); if (!existsSync(bundlePath)) return reply.code(404).send({ error: "bundle not found" }); try { const bundle = decodeWorldBundle(JSON.parse(readFileSync(bundlePath, "utf8"))); if (bundleHash(bundle) !== hash) return reply.code(409).send({ error: "bundle content hash mismatch" }); const manifest = bundle.assets.find(asset => asset.path === assetPath); if (!manifest) return reply.code(404).send({ error: "asset is not referenced by bundle" }); const candidate = resolve(worldBundleRoot, hash, assetPath); const bundleRoot = resolve(worldBundleRoot, hash); const containment = relative(bundleRoot, candidate); if (containment.startsWith("..") || isAbsolute(containment) || !existsSync(candidate) || !statSync(candidate).isFile()) return reply.code(404).send({ error: "bundle asset not found" }); const bytes = readFileSync(candidate); const actualHash = createHash("sha256").update(bytes).digest("hex"); if (actualHash !== manifest.sha256 && `sha256-${actualHash}` !== manifest.sha256) return reply.code(409).send({ error: "bundle asset checksum mismatch" }); return reply.type(manifest.mediaType).send(bytes); } catch (error) { return reply.code(409).send({ error: error instanceof Error ? error.message : "invalid bundle asset" }); } });
app.get("/api/live", async (request, reply) => { if (!(await requireObserver(request, reply))) return; reply.hijack(); const response = reply.raw; response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive", "access-control-allow-origin": "*" }); response.write(`data: ${JSON.stringify({ state, timelineId: activeTimelineId, schedulerPaused })}\n\n`); liveClients.add(response); response.on("close", () => liveClients.delete(response)); });
app.get("/api/world", async (request, reply) => { const query = request.query as { pulse?: string }; if (query.pulse === undefined) return { state, timelineId: activeTimelineId, schedulerPaused }; const pulse = Number(query.pulse); if (!Number.isInteger(pulse) || pulse < 0) return reply.code(400).send({ error: "pulse must be a non-negative integer" }); const row = database.prepare("SELECT state_json FROM timeline_checkpoints WHERE timeline_id = ? AND pulse = ?").get(activeTimelineId, pulse) as { state_json: string } | undefined; if (!row) return reply.code(404).send({ error: `No checkpoint exists for pulse ${pulse}` }); return { state: normalizeState(JSON.parse(row.state_json) as WorldState), timelineId: activeTimelineId, schedulerPaused }; });
app.get("/api/events", async (request) => { const query = request.query as { limit?: string }; const limit = Math.min(200, Math.max(1, Number(query.limit ?? 50))); const rows = database.prepare("SELECT event_json FROM timeline_events WHERE timeline_id = ? ORDER BY pulse DESC LIMIT ?").all(activeTimelineId, limit) as { event_json: string }[]; return { events: rows.reverse().map((row) => JSON.parse(row.event_json) as WorldEvent[]).flat(), timelineId: activeTimelineId }; });
app.get("/api/interpretations", async (request) => { const query = request.query as { limit?: string }; const limit = Math.min(200, Math.max(1, Number(query.limit ?? 50))); const rows = database.prepare("SELECT interpretation_json FROM timeline_interpretations WHERE timeline_id = ? ORDER BY pulse DESC, id DESC LIMIT ?").all(activeTimelineId, limit) as { interpretation_json: string }[]; return { interpretations: rows.reverse().map((row) => JSON.parse(row.interpretation_json) as SocialInterpretation), timelineId: activeTimelineId }; });
app.get("/api/metrics", async () => {
  const rows = database.prepare("SELECT pulse, state_json FROM timeline_checkpoints WHERE timeline_id = ? ORDER BY pulse ASC").all(activeTimelineId) as { pulse: number; state_json: string }[];
  return {
    timelineId: activeTimelineId,
    metrics: rows.map((row) => {
      const snapshot = normalizeState(JSON.parse(row.state_json) as WorldState);
      if (snapshot.firstGlowState) {
        const sparks = snapshot.firstGlowState.settlements.flatMap((settlement) => settlement.sparks);
        return {
          pulse: row.pulse,
          foodReserve: 0,
          averageTrust: 0,
          hungryVillagers: sparks.filter((spark) => spark.chargeDeficit > 0).length,
          travelingVillagers: sparks.filter((spark) => spark.status === "traveling").length,
          collectingVillagers: sparks.filter((spark) => spark.status === "drawing-charge").length,
          sourceCharge: snapshot.firstGlowState.settlements.reduce((total, settlement) => total + settlement.sourceCharge, 0),
          communalCharge: snapshot.firstGlowState.settlements.reduce((total, settlement) => total + settlement.communalCharge, 0),
          averageReadiness: sparks.length ? Math.round(sparks.reduce((total, spark) => total + spark.readiness, 0) / sparks.length) : 0,
          averageChargeDeficit: sparks.length ? Math.round(sparks.reduce((total, spark) => total + spark.chargeDeficit, 0) / sparks.length) : 0
        };
      }
      return {
        pulse: row.pulse,
        foodReserve: snapshot.foodReserve,
        averageTrust: Math.round(snapshot.villagers.reduce((total, villager) => total + villager.trust, 0) / snapshot.villagers.length),
        hungryVillagers: snapshot.villagers.filter((villager) => villager.hunger >= 45).length,
        travelingVillagers: snapshot.villagers.filter((villager) => villager.activity === "travel").length,
        collectingVillagers: snapshot.villagers.filter((villager) => villager.activity === "collect").length
      };
    })
  };
});
function reportSummary() { const sparks = state.firstGlowState.settlements.flatMap(settlement => settlement.sparks); return { season: 0, scenarioName: "The First Glow", finalFood: 0, averageTrust: 0, villagers: 0, dilemmasResolved: 0, latestDilemma: null, firstGlow: { sourceCharge: state.firstGlowState.settlements.reduce((total, settlement) => total + settlement.sourceCharge, 0), communalCharge: state.firstGlowState.settlements.reduce((total, settlement) => total + settlement.communalCharge, 0), carriedCharge: sparks.reduce((total, spark) => total + spark.carriedCharge, 0), chargeDeficit: sparks.reduce((total, spark) => total + spark.chargeDeficit, 0), sparks: sparks.length } }; }
app.get("/api/report", async () => { const timeline = currentTimeline(); const counts = database.prepare("SELECT (SELECT COUNT(*) FROM timeline_checkpoints WHERE timeline_id = ?) AS checkpoints, (SELECT COUNT(*) FROM timeline_events WHERE timeline_id = ?) AS events, (SELECT COUNT(*) FROM timeline_interpretations WHERE timeline_id = ?) AS interpretations").get(activeTimelineId, activeTimelineId, activeTimelineId) as { checkpoints: number; events: number; interpretations: number }; return { timeline, pulse: state.pulse, schedulerPaused, pulseIntervalMs, databaseBytes: existsSync(databasePath) ? statSync(databasePath).size : 0, socialMode, socialBudgetCents, fallbackCount: counts.interpretations, summary: reportSummary(), ...counts }; });
app.post("/api/scheduler", async (request, reply) => { if (!requireOwner(request, reply)) return; const body = request.body as { paused?: unknown; intervalMs?: unknown } | undefined; if (body?.paused !== undefined && typeof body.paused !== "boolean") return reply.code(400).send({ error: "paused must be a boolean" }); if (body?.intervalMs !== undefined && (!Number.isInteger(body.intervalMs) || Number(body.intervalMs) < 250 || Number(body.intervalMs) > 300000)) return reply.code(400).send({ error: "intervalMs must be an integer between 250 and 300000" }); if (typeof body?.intervalMs === "number") pulseIntervalMs = body.intervalMs; if (typeof body?.paused === "boolean") schedulerPaused = body.paused; restartScheduler(); return { schedulerPaused, pulseIntervalMs }; });
app.post("/api/owner/world/object", async (request, reply) => { if (!requireOwner(request, reply)) return; const body = request.body as { settlementId?: unknown; objectId?: unknown; blocked?: unknown; idempotencyKey?: unknown } | undefined; if (typeof body?.objectId !== "string" || typeof body.blocked !== "boolean" || typeof body.idempotencyKey !== "string" || body.idempotencyKey.length === 0) return reply.code(400).send({ error: "settlementId, objectId, blocked, and idempotencyKey are required" }); const settlementId = typeof body.settlementId === "string" ? body.settlementId : HOME_SETTLEMENT.id; const existing = database.prepare("SELECT id, ordering, target_pulse, settlement_id, object_id, blocked, idempotency_key, status, result_json FROM pending_commands WHERE timeline_id = ? AND idempotency_key = ?").get(activeTimelineId, body.idempotencyKey) as PendingBlockCommand | undefined; if (existing) return reply.code(existing.status === "rejected" ? 409 : 202).send(existing.result_json ? JSON.parse(existing.result_json) : { commandId: existing.id, effectivePulse: existing.target_pulse, status: existing.status }); try { const objectExists = state.firstGlowState.settlements.some(settlement => settlement.bundle.objects.some(object => object.id === body.objectId)); if (!objectExists) return reply.code(400).send({ error: `unknown world object: ${body.objectId}` }); if (!(state.settlements ?? []).some(settlement => settlement.id === settlementId)) return reply.code(400).send({ error: `unknown settlement: ${settlementId}` }); const occupied = body.blocked ? occupiedActorIds(body.objectId) : []; if (occupied.length) return reply.code(409).send({ error: "blocking would cover occupied cells", actorIds: occupied }); const id = `command-${randomUUID()}`; const ordering = Number((database.prepare("SELECT COALESCE(MAX(ordering), 0) AS ordering FROM pending_commands WHERE timeline_id = ?").get(activeTimelineId) as { ordering: number }).ordering) + 1; const targetPulse = state.pulse + 1; const result = { commandId: id, effectivePulse: targetPulse, status: "pending", objectId: body.objectId, blocked: body.blocked, idempotencyKey: body.idempotencyKey }; database.prepare("INSERT INTO pending_commands (id, timeline_id, ordering, target_pulse, settlement_id, object_id, blocked, idempotency_key, status, result_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)").run(id, activeTimelineId, ordering, targetPulse, settlementId, body.objectId, body.blocked ? 1 : 0, body.idempotencyKey, JSON.stringify(result), new Date().toISOString()); return reply.code(202).send(result); } catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : "invalid world object command" }); } });
app.post("/api/owner/resonance-choice", async (request, reply) => {
  if (!requireOwner(request, reply)) return;
  const body = request.body as { anchorId?: unknown; actorSparkId?: unknown; beneficiarySparkId?: unknown; choice?: unknown; evidenceEventIds?: unknown } | undefined;
  if (typeof body?.anchorId !== "string" || typeof body.actorSparkId !== "string" || typeof body.beneficiarySparkId !== "string" || (body.choice !== "yield-rest" && body.choice !== "hold-rest") || !Array.isArray(body.evidenceEventIds) || !body.evidenceEventIds.every(item => typeof item === "string")) return reply.code(400).send({ error: "anchorId, actorSparkId, beneficiarySparkId, choice, and evidenceEventIds are required" });
  const resonance = state.resonance;
  const anchor = resonance?.anchors.find(item => item.id === body.anchorId);
  if (resonance?.decisions?.some(item => item.anchorId === body.anchorId && item.actorSparkId === body.actorSparkId && item.beneficiarySparkId === body.beneficiarySparkId)) return reply.code(409).send({ error: "a Shelter Loom choice already exists for this pair" });
  const evidenceIds = body.evidenceEventIds as string[];
  const knownEventIds = new Set((database.prepare("SELECT id FROM timeline_events WHERE timeline_id = ?").all(activeTimelineId) as { id: string }[]).map(event => event.id));
  const missingEvidence = evidenceIds.filter(id => !knownEventIds.has(id)).sort();
  if (missingEvidence.length) return reply.code(409).send({ error: "choice references uncommitted evidence", missingEvidence });
  const result = applyShelterLoomChoice(state.firstGlowState, anchor, body.actorSparkId, body.beneficiarySparkId, body.choice as ShelterLoomChoice, evidenceIds);
  if (!result.ok) return reply.code(409).send({ error: `Shelter Loom choice rejected: ${result.code}`, code: result.code });
  const nextResonance: ResonanceState = { schemaVersion: 1, candidates: resonance?.candidates ?? [], anchors: resonance?.anchors ?? [], decisions: [...(resonance?.decisions ?? []), result.decision].sort((left, right) => left.id.localeCompare(right.id)) };
  const nextState = { ...state, firstGlowState: result.state, resonance: nextResonance, events: [...(state.events ?? []), { id: result.event.id, pulse: result.event.pulse, kind: "world-object" as const, message: result.event.message, villagerIds: [body.actorSparkId, body.beneficiarySparkId], settlementIds: [state.firstGlowState.settlements[0].id] }] };
  const worldEvent = nextState.events[nextState.events.length - 1] as WorldEvent;
  database.exec("BEGIN IMMEDIATE");
  try { database.prepare("UPDATE timeline_checkpoints SET state_json = ? WHERE timeline_id = ? AND pulse = ?").run(JSON.stringify(nextState), activeTimelineId, state.pulse); database.prepare("INSERT INTO timeline_events (timeline_id, id, pulse, event_json) VALUES (?, ?, ?, ?)").run(activeTimelineId, worldEvent.id, worldEvent.pulse, JSON.stringify(worldEvent)); database.exec("COMMIT"); } catch (error) { database.exec("ROLLBACK"); throw error; }
  state = nextState;
  for (const client of liveClients) { if (!client.destroyed) client.write(`data: ${JSON.stringify({ state, events: [worldEvent], interpretations: [], timelineId: activeTimelineId, schedulerPaused })}\n\n`); else liveClients.delete(client); }
  return { decision: result.decision, event: worldEvent };
});
app.post("/api/owner/resonance-crossing-anchor", async (request, reply) => {
  if (!requireOwner(request, reply)) return;
  const body = request.body as { candidate?: unknown } | undefined;
  const candidate = body?.candidate as ResonanceCandidateRecord | undefined;
  if (!candidate || typeof candidate.id !== "string" || typeof candidate.ruleId !== "string" || !candidate.location || !Array.isArray(candidate.qualifyingEventIds) || !Array.isArray(candidate.participantSparkIds) || !Array.isArray(candidate.auditEvidenceEventIds) || !Number.isInteger(candidate.totalChargeCost) || !Number.isInteger(candidate.formedPulse)) return reply.code(400).send({ error: "a complete Crossing of Voices candidate is required" });
  const settlement = state.firstGlowState.settlements[0];
  const knownEventIds = new Set((database.prepare("SELECT id FROM timeline_events WHERE timeline_id = ?").all(activeTimelineId) as { id: string }[]).map(event => event.id));
  const missingEvidence = [...new Set([...candidate.qualifyingEventIds, ...candidate.auditEvidenceEventIds])].filter(id => !knownEventIds.has(id)).sort();
  if (missingEvidence.length) return reply.code(409).send({ error: "candidate references uncommitted evidence", missingEvidence });
  const existing = state.resonance?.candidates.find(item => item.id === candidate.id);
  if (existing?.status === "created") return { candidate: existing, anchor: state.resonance?.anchors.find(item => item.candidateId === candidate.id), idempotent: true };
  const result = createCrossingVoicesAnchor(candidate, settlement.bundle, state.pulse);
  if (!result.ok) return reply.code(409).send({ error: `Crossing of Voices creation failed: ${result.code}`, code: result.code });
  const resonance: ResonanceState = { schemaVersion: 1, candidates: [...(state.resonance?.candidates ?? []).filter(item => item.id !== candidate.id), result.candidate].sort((left, right) => left.id.localeCompare(right.id)), anchors: [...(state.resonance?.anchors ?? []).filter(item => item.id !== result.anchor.id), result.anchor].sort((left, right) => left.id.localeCompare(right.id)), decisions: state.resonance?.decisions, crossingDecisions: state.resonance?.crossingDecisions };
  const creationEvent: WorldEvent = { id: `event-${state.pulse}-resonance-${result.anchor.id}`, pulse: state.pulse, kind: "world-object", message: `The Crossing of Voices was formed at ${result.anchor.authoredObjectId}:${result.anchor.authoredSlotId}.`, villagerIds: [], settlementIds: [settlement.id] };
  const nextState = { ...state, resonance, events: [...(state.events ?? []), creationEvent] };
  database.exec("BEGIN IMMEDIATE");
  try { database.prepare("UPDATE timeline_checkpoints SET state_json = ? WHERE timeline_id = ? AND pulse = ?").run(JSON.stringify(nextState), activeTimelineId, state.pulse); database.prepare("INSERT INTO timeline_events (timeline_id, id, pulse, event_json) VALUES (?, ?, ?, ?)").run(activeTimelineId, creationEvent.id, creationEvent.pulse, JSON.stringify(creationEvent)); database.exec("COMMIT"); } catch (error) { database.exec("ROLLBACK"); throw error; }
  state = nextState;
  for (const client of liveClients) { if (!client.destroyed) client.write(`data: ${JSON.stringify({ state, events: [creationEvent], interpretations: [], timelineId: activeTimelineId, schedulerPaused })}\n\n`); else liveClients.delete(client); }
  return { candidate: result.candidate, anchor: result.anchor, event: creationEvent };
});
app.post("/api/owner/resonance-crossing-choice", async (request, reply) => {
  if (!requireOwner(request, reply)) return;
  const body = request.body as { anchorId?: unknown; actorSparkId?: unknown; choice?: unknown; evidenceEventIds?: unknown } | undefined;
  if (typeof body?.anchorId !== "string" || typeof body.actorSparkId !== "string" || (body.choice !== "follow-signal" && body.choice !== "hold-course") || !Array.isArray(body.evidenceEventIds) || !body.evidenceEventIds.every(item => typeof item === "string")) return reply.code(400).send({ error: "anchorId, actorSparkId, choice, and evidenceEventIds are required" });
  const resonance = state.resonance;
  const anchor = resonance?.anchors.find(item => item.id === body.anchorId);
  if (resonance?.crossingDecisions?.some(item => item.anchorId === body.anchorId && item.actorSparkId === body.actorSparkId)) return reply.code(409).send({ error: "a Crossing of Voices choice already exists for this Spark" });
  const evidenceIds = body.evidenceEventIds as string[];
  const knownEventIds = new Set((database.prepare("SELECT id FROM timeline_events WHERE timeline_id = ?").all(activeTimelineId) as { id: string }[]).map(event => event.id));
  const missingEvidence = evidenceIds.filter(id => !knownEventIds.has(id)).sort();
  if (missingEvidence.length) return reply.code(409).send({ error: "choice references uncommitted evidence", missingEvidence });
  const result = applyCrossingVoicesChoice(state.firstGlowState, anchor, body.actorSparkId, body.choice as "follow-signal" | "hold-course", evidenceIds);
  if (!result.ok) return reply.code(409).send({ error: `Crossing of Voices choice rejected: ${result.code}`, code: result.code });
  const nextResonance: ResonanceState = { schemaVersion: 1, candidates: resonance?.candidates ?? [], anchors: resonance?.anchors ?? [], decisions: resonance?.decisions, crossingDecisions: [...(resonance?.crossingDecisions ?? []), result.decision].sort((left, right) => left.id.localeCompare(right.id)) };
  const nextState = { ...state, firstGlowState: result.state, resonance: nextResonance, events: [...(state.events ?? []), { id: result.event.id, pulse: result.event.pulse, kind: "world-object" as const, message: result.event.message, villagerIds: [body.actorSparkId], settlementIds: [state.firstGlowState.settlements[0].id] }] };
  const worldEvent = nextState.events[nextState.events.length - 1] as WorldEvent;
  database.exec("BEGIN IMMEDIATE");
  try { database.prepare("UPDATE timeline_checkpoints SET state_json = ? WHERE timeline_id = ? AND pulse = ?").run(JSON.stringify(nextState), activeTimelineId, state.pulse); database.prepare("INSERT INTO timeline_events (timeline_id, id, pulse, event_json) VALUES (?, ?, ?, ?)").run(activeTimelineId, worldEvent.id, worldEvent.pulse, JSON.stringify(worldEvent)); database.exec("COMMIT"); } catch (error) { database.exec("ROLLBACK"); throw error; }
  state = nextState;
  for (const client of liveClients) { if (!client.destroyed) client.write(`data: ${JSON.stringify({ state, events: [worldEvent], interpretations: [], timelineId: activeTimelineId, schedulerPaused })}\n\n`); else liveClients.delete(client); }
  return { decision: result.decision, event: worldEvent };
});
app.post("/api/owner/resonance-anchor", async (request, reply) => {
  if (!requireOwner(request, reply)) return;
  const body = request.body as { candidate?: unknown } | undefined;
  const candidate = body?.candidate as ResonanceCandidateRecord | undefined;
  if (!candidate || typeof candidate.id !== "string" || typeof candidate.ruleId !== "string" || !candidate.location || !Array.isArray(candidate.qualifyingEventIds) || !Array.isArray(candidate.participantSparkIds) || !Array.isArray(candidate.auditEvidenceEventIds) || !Number.isInteger(candidate.totalChargeCost) || !Number.isInteger(candidate.formedPulse)) return reply.code(400).send({ error: "a complete Resonance candidate is required" });
  const settlement = state.firstGlowState.settlements[0];
  const knownEventIds = new Set((database.prepare("SELECT id FROM timeline_events WHERE timeline_id = ?").all(activeTimelineId) as { id: string }[]).map((event) => event.id));
  const missingEvidence = [...new Set([...candidate.qualifyingEventIds, ...candidate.auditEvidenceEventIds])].filter((id) => !knownEventIds.has(id)).sort();
  if (missingEvidence.length) return reply.code(409).send({ error: "candidate references uncommitted evidence", missingEvidence });
  const existing = state.resonance?.candidates.find((item) => item.id === candidate.id);
  if (existing?.status === "created") return { candidate: existing, anchor: state.resonance?.anchors.find((item) => item.candidateId === candidate.id), idempotent: true };
  const result = createShelterLoomAnchor(candidate, settlement.bundle, state.pulse);
  if (!result.ok) return reply.code(409).send({ error: `Shelter Loom creation failed: ${result.code}`, code: result.code });
  const resonance: ResonanceState = { schemaVersion: 1, candidates: [...(state.resonance?.candidates ?? []).filter((item) => item.id !== candidate.id), result.candidate].sort((left, right) => left.id.localeCompare(right.id)), anchors: [...(state.resonance?.anchors ?? []).filter((item) => item.id !== result.anchor.id), result.anchor].sort((left, right) => left.id.localeCompare(right.id)) };
  const creationEvent: WorldEvent = { id: `event-${state.pulse}-resonance-${result.anchor.id}`, pulse: state.pulse, kind: "world-object", message: `The Shelter Loom was formed at ${result.anchor.authoredObjectId}:${result.anchor.authoredSlotId}.`, villagerIds: [], settlementIds: [settlement.id] };
  const nextState = { ...state, resonance, events: [...(state.events ?? []), creationEvent] };
  database.exec("BEGIN IMMEDIATE");
  try { database.prepare("UPDATE timeline_checkpoints SET state_json = ? WHERE timeline_id = ? AND pulse = ?").run(JSON.stringify(nextState), activeTimelineId, state.pulse); database.prepare("INSERT INTO timeline_events (timeline_id, id, pulse, event_json) VALUES (?, ?, ?, ?)").run(activeTimelineId, creationEvent.id, creationEvent.pulse, JSON.stringify(creationEvent)); database.exec("COMMIT"); } catch (error) { database.exec("ROLLBACK"); throw error; }
  state = nextState;
  for (const client of liveClients) { if (!client.destroyed) client.write(`data: ${JSON.stringify({ state, events: [creationEvent], interpretations: [], timelineId: activeTimelineId, schedulerPaused })}\n\n`); else liveClients.delete(client); }
  return { candidate: result.candidate, anchor: result.anchor, event: creationEvent };
});

async function commitPulse(): Promise<{ state: WorldState; events: WorldEvent[]; interpretations: SocialInterpretation[] } | null> {
  if (state.pulse >= seasonPulseLimit || currentTimeline().status !== "active") return null;
  const pending = state.firstGlowState ? applyFirstGlowPendingCommands(state, state.pulse + 1) : applyPendingCommands(state, state.pulse + 1);
  const advanced = advanceWorld(pending.state);
  let result = { ...advanced, events: [...pending.events, ...advanced.events].map(event => ({ ...event, pulse: advanced.state.pulse })) };
  if (advanced.state.firstGlowState) {
    const previousIds = new Set(pending.state.firstGlowState.events.map(event => event.id));
    const committedStructuredEvents = advanced.state.firstGlowState.events.filter(event => !previousIds.has(event.id));
    const evaluated = await aiRuntime.evaluate(advanced.state.firstGlowState, committedStructuredEvents);
    if (evaluated.interpretations.length) {
      const replacedEventIds = new Set(evaluated.interpretations.map(interpretation => interpretation.eventId));
      result = {
        ...result,
        state: { ...result.state, firstGlowState: evaluated.state },
        interpretations: [...result.interpretations.filter(interpretation => !replacedEventIds.has(interpretation.eventId)), ...evaluated.interpretations]
      };
    }
  }
  database.exec("BEGIN IMMEDIATE");
  try {
    database.prepare("INSERT INTO timeline_checkpoints (timeline_id, pulse, state_json) VALUES (?, ?, ?)").run(activeTimelineId, result.state.pulse, JSON.stringify(result.state));
    const insertEvent = database.prepare("INSERT INTO timeline_events (timeline_id, id, pulse, event_json) VALUES (?, ?, ?, ?)");
    for (const event of result.events) insertEvent.run(activeTimelineId, event.id, event.pulse, JSON.stringify(event));
    const updateCommand = database.prepare("UPDATE pending_commands SET status = ?, result_json = ? WHERE id = ? AND status = 'pending'");
    for (const command of pending.commands) { const rejected = pending.events.some(event => event.id === `event-${result.state.pulse}-command-${command.id}` && event.message.includes("could not")); updateCommand.run(rejected ? "rejected" : "applied", JSON.stringify({ commandId: command.id, effectivePulse: result.state.pulse, status: rejected ? "rejected" : "applied", objectId: command.object_id, blocked: Boolean(command.blocked), idempotencyKey: command.idempotency_key }), command.id); }
    const insertInterpretation = database.prepare("INSERT INTO timeline_interpretations (timeline_id, id, pulse, interpretation_json) VALUES (?, ?, ?, ?)");
    for (const interpretation of result.interpretations) insertInterpretation.run(activeTimelineId, interpretation.id, interpretation.pulse, JSON.stringify(interpretation));
    database.exec("COMMIT");
  } catch (error) { database.exec("ROLLBACK"); throw error; }
  state = result.state;
  const message = `data: ${JSON.stringify({ state, events: result.events, interpretations: result.interpretations, timelineId: activeTimelineId, schedulerPaused })}\n\n`;
  for (const client of liveClients) { if (!client.destroyed) client.write(message); else liveClients.delete(client); }
  return result;
}
app.post("/api/pulse", async (request, reply) => { if (!requireOwner(request, reply)) return; const result = await commitPulse(); if (!result) return reply.code(409).send({ error: "timeline is archived or season boundary reached", state }); return result; });
app.post("/api/owner/archive", async (request, reply) => { if (!requireOwner(request, reply)) return; database.prepare("UPDATE timelines SET status = 'archived', archived_at = ? WHERE id = ?").run(new Date().toISOString(), activeTimelineId); schedulerPaused = true; return { timeline: currentTimeline(), schedulerPaused }; });
app.post("/api/owner/continue", async (request, reply) => { if (!requireOwner(request, reply)) return; database.prepare("UPDATE timelines SET status = 'active', archived_at = NULL WHERE id = ?").run(activeTimelineId); return { timeline: currentTimeline(), schedulerPaused }; });
app.post("/api/owner/branch", async (request, reply) => { if (!requireOwner(request, reply)) return; const body = request.body as { pulse?: unknown } | undefined; const branchPulse = body?.pulse === undefined ? state.pulse : Number(body.pulse); if (!Number.isInteger(branchPulse) || branchPulse < 0) return reply.code(400).send({ error: "pulse must be a non-negative integer" }); const source = database.prepare("SELECT state_json FROM timeline_checkpoints WHERE timeline_id = ? AND pulse = ?").get(activeTimelineId, branchPulse) as { state_json: string } | undefined; if (!source) return reply.code(404).send({ error: "branch source checkpoint not found" }); const newId = `timeline-${randomUUID()}`; database.exec("BEGIN IMMEDIATE"); try { database.prepare("INSERT INTO timelines (id, parent_id, created_at, status) VALUES (?, ?, ?, 'active')").run(newId, activeTimelineId, new Date().toISOString()); database.prepare("INSERT INTO timeline_checkpoints (timeline_id, pulse, state_json) SELECT ?, pulse, state_json FROM timeline_checkpoints WHERE timeline_id = ? AND pulse <= ?").run(newId, activeTimelineId, branchPulse); database.prepare("INSERT INTO timeline_events (timeline_id, id, pulse, event_json) SELECT ?, id, pulse, event_json FROM timeline_events WHERE timeline_id = ? AND pulse <= ?").run(newId, activeTimelineId, branchPulse); database.prepare("INSERT INTO timeline_interpretations (timeline_id, id, pulse, interpretation_json) SELECT ?, id, pulse, interpretation_json FROM timeline_interpretations WHERE timeline_id = ? AND pulse <= ?").run(newId, activeTimelineId, branchPulse); database.exec("COMMIT"); } catch (error) { database.exec("ROLLBACK"); throw error; } activeTimelineId = newId; state = { ...normalizeState(JSON.parse(source.state_json) as WorldState), worldId: newId }; saveActiveTimeline(); return { timeline: currentTimeline(), state }; });
app.post("/api/owner/reset", async (request, reply) => { if (!requireOwner(request, reply)) return; const body = request.body as { seed?: unknown } | undefined; const seed = body?.seed === undefined ? 20260906 : Number(body.seed); if (!Number.isInteger(seed)) return reply.code(400).send({ error: "seed must be an integer" }); const parent = activeTimelineId; database.prepare("UPDATE timelines SET status = 'archived', archived_at = ? WHERE id = ?").run(new Date().toISOString(), parent); activeTimelineId = `timeline-${randomUUID()}`; state = createWorld(seed, activeTimelineId); database.prepare("INSERT INTO timelines (id, parent_id, created_at, status) VALUES (?, ?, ?, 'active')").run(activeTimelineId, parent, new Date().toISOString()); database.prepare("INSERT INTO timeline_checkpoints (timeline_id, pulse, state_json) VALUES (?, 0, ?)").run(activeTimelineId, JSON.stringify(state)); schedulerPaused = true; saveActiveTimeline(); return { timeline: currentTimeline(), state, schedulerPaused }; });

app.post("/api/owner/reset-v2", async (request, reply) => { if (!requireOwner(request, reply)) return; const body = request.body as { bundleHash?: unknown; seed?: unknown } | undefined; if (typeof body?.bundleHash !== "string" || !/^sha256-[a-f0-9]{64}$/.test(body.bundleHash)) return reply.code(400).send({ error: "bundleHash is required" }); const bundlePath = resolve(worldBundleRoot, body.bundleHash, "world.json"); const relativeBundlePath = relative(worldBundleRoot, bundlePath); if (relativeBundlePath.startsWith("..") || isAbsolute(relativeBundlePath) || !existsSync(bundlePath)) return reply.code(404).send({ error: "bundle not found" }); try { const bundle = JSON.parse(readFileSync(bundlePath, "utf8")) as WorldBundle; validateWorldBundle(bundle); if (bundleHash(bundle) !== body.bundleHash) return reply.code(409).send({ error: "bundle content hash mismatch" }); const seed = body.seed === undefined ? 20260906 : Number(body.seed); if (!Number.isInteger(seed)) return reply.code(400).send({ error: "seed must be an integer" }); const parent = activeTimelineId; database.prepare("UPDATE timelines SET status = 'archived', archived_at = ? WHERE id = ?").run(new Date().toISOString(), parent); activeTimelineId = `timeline-${randomUUID()}`; state = createWorldV2(bundle, seed, activeTimelineId); database.prepare("INSERT INTO timelines (id, parent_id, created_at, status) VALUES (?, ?, ?, 'active')").run(activeTimelineId, parent, new Date().toISOString()); database.prepare("INSERT INTO timeline_checkpoints (timeline_id, pulse, state_json) VALUES (?, 0, ?)").run(activeTimelineId, JSON.stringify(state)); schedulerPaused = true; saveActiveTimeline(); return { timeline: currentTimeline(), state, schedulerPaused, bundleHash: body.bundleHash }; } catch (error) { return reply.code(409).send({ error: error instanceof Error ? error.message : "invalid bundle" }); } });

app.post("/api/owner/reset-v3", async (request, reply) => { if (!requireOwner(request, reply)) return; const body = request.body as { bundleHash?: unknown; seed?: unknown; sparkCount?: unknown } | undefined; if (typeof body?.bundleHash !== "string" || !/^sha256-[a-f0-9]{64}$/.test(body.bundleHash)) return reply.code(400).send({ error: "bundleHash is required" }); const bundlePath = resolve(worldBundleRoot, body.bundleHash, "world.json"); const relativeBundlePath = relative(worldBundleRoot, bundlePath); if (relativeBundlePath.startsWith("..") || isAbsolute(relativeBundlePath) || !existsSync(bundlePath)) return reply.code(404).send({ error: "bundle not found" }); try { const bundle = decodeWorldBundle(JSON.parse(readFileSync(bundlePath, "utf8"))); if (bundle.schemaVersion !== 3) return reply.code(409).send({ error: "reset-v3 requires a schema-3 First Glow bundle" }); if (bundleHash(bundle) !== body.bundleHash) return reply.code(409).send({ error: "bundle content hash mismatch" }); const seed = body.seed === undefined ? 20260906 : Number(body.seed); const sparkCount = body.sparkCount === undefined ? 1 : Number(body.sparkCount); if (!Number.isInteger(seed)) return reply.code(400).send({ error: "seed must be an integer" }); if (!Number.isInteger(sparkCount) || sparkCount < 1 || sparkCount > 64) return reply.code(400).send({ error: "sparkCount must be an integer between 1 and 64" }); const parent = activeTimelineId; database.prepare("UPDATE timelines SET status = 'archived', archived_at = ? WHERE id = ?").run(new Date().toISOString(), parent); activeTimelineId = `timeline-${randomUUID()}`; state = createWorldFromBundle(bundle, seed, activeTimelineId, sparkCount); database.prepare("INSERT INTO timelines (id, parent_id, created_at, status) VALUES (?, ?, ?, 'active')").run(activeTimelineId, parent, new Date().toISOString()); database.prepare("INSERT INTO timeline_checkpoints (timeline_id, pulse, state_json) VALUES (?, 0, ?)").run(activeTimelineId, JSON.stringify(state)); schedulerPaused = true; saveActiveTimeline(); return { timeline: currentTimeline(), state, schedulerPaused, bundleHash: body.bundleHash, sparkCount }; } catch (error) { return reply.code(409).send({ error: error instanceof Error ? error.message : "invalid bundle" }); } });

if (serveWeb) {
  app.get("/*", async (request, reply) => {
    const requestedPath = decodeURIComponent((request.url ?? "/").split("?", 1)[0]);
    if (requestedPath.startsWith("/api/") || requestedPath === "/health") return reply.code(404).send({ error: "not found" });
    const relativePath = requestedPath === "/" ? "index.html" : requestedPath.replace(/^\/+/, "");
    const candidate = resolve(webDistDirectory, relativePath);
    const safePath = relative(webDistDirectory, candidate);
    const safe = safePath === "" || (!safePath.startsWith("..") && !isAbsolute(safePath));
    const indexPath = join(webDistDirectory, "index.html");
    const filePath = safe && existsSync(candidate) && statSync(candidate).isFile() ? candidate : indexPath;
    if (!existsSync(filePath)) return reply.code(404).send({ error: "web build not found" });
    const contentTypes: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp" };
    return reply.type(contentTypes[extname(filePath)] ?? "application/octet-stream").send(readFileSync(filePath));
  });
}

await app.listen({ port, host: "0.0.0.0" });
function restartScheduler() { if (scheduler) clearInterval(scheduler); if (pulseIntervalMs > 0) { scheduler = setInterval(() => { if (!shuttingDown && !schedulerPaused && state.pulse < seasonPulseLimit) commitPulse(); }, pulseIntervalMs); scheduler.unref(); } }
restartScheduler();
app.log.info({ pulseIntervalMs, seasonPulseLimit, schedulerPaused }, "automatic pulse scheduler configured");
let backupScheduler: NodeJS.Timeout | undefined;
if (backupIntervalMs > 0) { backupScheduler = setInterval(() => { if (!shuttingDown) void createScheduledBackup("interval"); }, backupIntervalMs); backupScheduler.unref(); app.log.info({ backupIntervalMs, backupDirectory, backupReplicationUri, backupFreshnessMaxAgeMs }, "scheduled database backups configured"); }
async function shutdown(signal: string) { if (shuttingDown) return; shuttingDown = true; if (scheduler) clearInterval(scheduler); if (backupScheduler) clearInterval(backupScheduler); for (const client of liveClients) client.end(); await app.close(); database.exec("PRAGMA wal_checkpoint(FULL);"); database.close(); app.log.info({ signal, pulse: state.pulse, timelineId: activeTimelineId }, "server shut down cleanly"); process.exit(0); }
process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

