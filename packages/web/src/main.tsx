import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Phaser from "phaser";
import { parseWorldDefinition } from "@mimir/engine";
import type { Cell, MovementModel, WorldDefinition } from "@mimir/engine";
import { FirstGlowInspector, type FirstGlowObject, type FirstGlowSpark } from "./first-glow.js";
import { firstGlowAssetKey, firstGlowAssetUrl } from "./first-glow-assets.js";
import { firstGlowSceneLifecycle } from "./first-glow-lifecycle.js";
import { firstGlowPlaybackStepMs } from "./first-glow-playback.js";
import { firstGlowSparkDepth, firstGlowSparkScreenPosition } from "./first-glow-rendering.js";
import { firstGlowBlockedSummary, firstGlowCellQuery, firstGlowGroundDepth } from "./first-glow-scene.js";
import { HistoryRequestSequencer } from "./history-sequencing.js";
import "./styles.css";

type TilePosition = Cell;
type Villager = { id: string; name: string; tradition: string; activity: string; location: string; hunger: number; trust: number; position: TilePosition; route: TilePosition[]; settlementId: string; destination?: TilePosition; intendedActivity?: string; targetLocation?: string; status?: string; waitReason?: string; destinationObjectId?: string; destinationSlotId?: string; remainingCost?: number; travelPlan?: { toSettlementId: string; remainingTicks: number } };
type SharedStore = { status: string; contributions: number; distributions: number; dissent: number; contributionRule: string; distributionRule: string };
type DilemmaResolution = { id: string; tick: number; title: string; choiceLabel: string; summary: string; foodDelta: number; trustDelta: number };
type Settlement = { id: string; name: string; foodReserve: number; villagerIds: string[]; worldDefinition?: WorldDefinition; worldRuntime?: { blockedObjectIds: string[] } };
type Trade = { id: string; tick: number; villagerId: string; fromSettlementId: string; toSettlementId: string; amount: number; summary: string };
type Hazard = { id: string; kind: string; status: string; summary: string };
type State = { tick: number; season: number; foodReserve: number; scenario: { name: string; seasonTickLimit: number }; villagers: Villager[]; settlements?: Settlement[]; tradeHistory?: Trade[]; weather?: { kind: string; severity: number; forecast: string }; hazards?: Hazard[]; dilemmaHistory?: DilemmaResolution[]; sharedStore?: SharedStore; worldDefinition?: WorldDefinition; worldRuntime?: { blockedObjectIds: string[] }; spatialModel?: "structured-v1" | "structured-v2" | "legacy-backdrop-v0"; simulationVersion?: string; movementModel?: MovementModel; structuredState?: unknown; firstGlowState?: { settlements: { id: string; bundle: unknown; sparks: Spark[]; runtime: { navigationRevision: number; objects: { objectId: string; blocked: boolean }[]; reservations: { actorId: string; objectId: string; slotId: string }[] } }[] } };
type Spark = FirstGlowSpark;
type FirstGlowBundle = { id: string; width: number; height: number; terrain: string[][]; terrainDefinitions?: Record<string, { walkable: boolean; movementCost?: number }>; bundle: { contentHash: string; assetVersion: string }; assets?: { path: string; mediaType: string }[]; objectDefinitions: Record<string, { footprint: Cell[]; slots: { id: string; offset: Cell }[]; blocksMovement: boolean; capabilities: string[]; visualAsset?: string; groundContact?: Cell; foreground?: boolean }>; objects: { id: string; definitionId: string; origin: Cell }[]; surfaces: { id: string; cells: TilePosition[]; movementCost: number; enabled: boolean }[]; spawns: { id: string; cell: TilePosition; settlementId: string; entrance?: boolean }[]; layers: { id: string; role: string; order: number }[] };
type Event = { id: string; tick: number; message: string; kind: string };
type Metric = { tick: number; foodReserve: number; averageTrust: number; hungryVillagers: number; travelingVillagers: number; collectingVillagers: number };
type CharacterCard = { id: string; name: string; tradition: string; disposition: string; strength: string; tension: string; beliefSignals: { cooperation: number; selfReliance: number; reflection: number } };
type DilemmaCard = { id: string; title: string; prompt: string; competingValues: string[]; choices: { id: string; label: string; tradeoff: string }[] };
type FirstGlowDesign = { openingQuestion: string; boundary: string; cards: { id: string; name: string; tendency: string; description: string; openingQuestion: string }[]; events: { id: string; title: string; prompt: string; observableOutcome: string }[] };
type Interpretation = { id: string; tick: number; eventId: string; villagerId: string; source: "rules" | "ai"; fallbackReason?: string; belief: string; confidence: number; trustDelta: number; summary: string; evidenceEventIds: string[] };
type HoveredCell = { x: number; y: number; clientX: number; clientY: number };
type Report = { timeline: { id: string; parent_id: string | null; created_at: string; status: string; archived_at: string | null }; tick: number; schedulerPaused: boolean; tickIntervalMs: number; databaseBytes: number; socialMode: string; socialBudgetCents: number; fallbackCount: number; checkpoints: number; events: number; interpretations: number; summary?: { season: number; scenarioName: string; finalFood: number; averageTrust: number; villagers: number; dilemmasResolved?: number; latestDilemma?: DilemmaResolution | null; firstGlow?: { sourceCharge: number; communalCharge: number; carriedCharge: number; chargeDeficit: number; sparks: number } } };
const api = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:3000";
const FIRST_GLOW_MIN_ZOOM = 1;
const MAX_ZOOM = 4;

function cameraScrollBounds(camera: Phaser.Cameras.Scene2D.Camera, mapWidth: number, mapHeight: number) {
  const viewWidth = camera.width / camera.zoom;
  const viewHeight = camera.height / camera.zoom;
  const centeredX = mapWidth / 2 - camera.width / 2;
  const centeredY = mapHeight / 2 - camera.height / 2;
  return {
    minX: viewWidth >= mapWidth ? centeredX : viewWidth / 2 - camera.width / 2,
    maxX: viewWidth >= mapWidth ? centeredX : mapWidth - viewWidth / 2 - camera.width / 2,
    minY: viewHeight >= mapHeight ? centeredY : viewHeight / 2 - camera.height / 2,
    maxY: viewHeight >= mapHeight ? centeredY : mapHeight - viewHeight / 2 - camera.height / 2,
  };
}

function cameraWorldOrigin(camera: Phaser.Cameras.Scene2D.Camera) {
  return {
    x: camera.scrollX + (camera.width - camera.width / camera.zoom) / 2,
    y: camera.scrollY + (camera.height - camera.height / camera.zoom) / 2,
  };
}

function validateClientWorld(state: State): void {
  if (state.worldDefinition) parseWorldDefinition(state.worldDefinition);
  state.settlements?.forEach((settlement) => { if (settlement.worldDefinition) parseWorldDefinition(settlement.worldDefinition); });
}

function structuredWorldDefinition(structuredState: unknown, settlementId: string): WorldDefinition | undefined {
  const state = structuredState as { settlements?: { id: string; bundle: { id: string; width: number; height: number; terrain: string[][]; bundle: { contentHash: string; assetVersion: string }; terrainDefinitions: Record<string, unknown>; objectDefinitions: Record<string, { footprint: Cell[]; slots: { offset: Cell }[]; capabilities: string[]; blocksMovement: boolean }>; objects: { id: string; definitionId: string; origin: Cell }[] } }[] } | undefined;
  const bundle = state?.settlements?.find((settlement) => settlement.id === settlementId)?.bundle;
  if (!bundle) return undefined;
  const definitions = Object.fromEntries(Object.entries(bundle.objectDefinitions).map(([id, definition]) => [id, { id, footprint: definition.footprint, interactionSlots: definition.slots.map((slot) => slot.offset), blocksMovement: definition.blocksMovement, activities: definition.capabilities }]));
  return { schemaVersion: 1, id: bundle.id, bundle: { bundleId: bundle.id, schemaVersion: 1, contentHash: bundle.bundle.contentHash, assetVersion: bundle.bundle.assetVersion }, width: bundle.width, height: bundle.height, terrain: bundle.terrain as WorldDefinition["terrain"], objects: bundle.objects.map((object) => ({ id: object.id, definitionId: object.definitionId as WorldDefinition["objects"][number]["definitionId"], position: object.origin })), definitions: definitions as WorldDefinition["definitions"] };
}

function firstGlowWorldDefinition(bundle: FirstGlowBundle): WorldDefinition & { firstGlowBundle: FirstGlowBundle } {
  const definitions = Object.fromEntries(Object.entries(bundle.objectDefinitions).map(([id, definition]) => [id, { id, footprint: definition.footprint, interactionSlots: definition.slots.map(slot => slot.offset), blocksMovement: definition.blocksMovement, activities: definition.capabilities }]));
  return { schemaVersion: 1, id: bundle.id, bundle: { bundleId: bundle.id, schemaVersion: 1, contentHash: bundle.bundle.contentHash, assetVersion: bundle.bundle.assetVersion }, width: bundle.width, height: bundle.height, terrain: bundle.terrain as WorldDefinition["terrain"], objects: bundle.objects.map(object => ({ id: object.id, definitionId: object.definitionId as WorldDefinition["objects"][number]["definitionId"], position: object.origin })), definitions: definitions as WorldDefinition["definitions"], firstGlowBundle: bundle };
}

type VillageCanvasProps = { villagers: Villager[]; sparks?: Spark[]; firstGlowBundle?: FirstGlowBundle; firstGlowRuntime?: { navigationRevision: number; objects: { objectId: string; blocked: boolean }[]; reservations: { actorId: string; objectId: string; slotId: string }[] }; assetBaseUrl?: string; worldDefinition?: WorldDefinition; worldRuntime?: { blockedObjectIds: string[] }; playbackRate: number; zoom: number; onZoomChange: (nextZoom: number | ((currentZoom: number) => number)) => void; tick: number; history: boolean; regionName?: string; selectedEntityId?: string | null; onSelectEntity?: (entityId: string) => void; debugOverlay?: boolean };

function VillageCanvas({ villagers, sparks = [], firstGlowBundle, firstGlowRuntime, assetBaseUrl, worldDefinition, worldRuntime, playbackRate, zoom, onZoomChange, tick, history, regionName = "Opening region", selectedEntityId, onSelectEntity, debugOverlay = false }: VillageCanvasProps) {
  const villagersRef = useRef(villagers);
  const peopleRef = useRef(new Map<string, Phaser.GameObjects.Container>());
  const sceneRef = useRef<Phaser.Scene | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const [hoveredCell, setHoveredCell] = useState<HoveredCell | null>(null);
  const displayResolution = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const syncVillagers = (scene: Phaser.Scene, nextVillagers: Villager[]) => {
    const interpolate = !history && lastTickRef.current !== null && tick === lastTickRef.current + 1;
    const tileSize = 24;
    const colors = { Hearthkeepers: 0xc5664a, Freehands: 0x5c8eaa, Seekers: 0x8b6b9d };
    const visualOffsets = [{ x: 0, y: 0 }, { x: -6, y: 0 }, { x: 6, y: 0 }, { x: 0, y: -6 }, { x: 0, y: 6 }, { x: -6, y: -6 }, { x: 6, y: -6 }, { x: -6, y: 6 }, { x: 6, y: 6 }];
    const cellSlots = new Map<string, number>();
    const nextIds = new Set(nextVillagers.map((villager) => villager.id));
    peopleRef.current.forEach((person, id) => {
      if (!nextIds.has(id)) { person.destroy(); peopleRef.current.delete(id); }
    });
    nextVillagers.forEach((villager, index) => {
      const route = villager.route.length > 0 ? villager.route : [villager.position];
      const cellKey = `${villager.position.x},${villager.position.y}`;
      const slot = cellSlots.get(cellKey) ?? 0;
      cellSlots.set(cellKey, slot + 1);
      const offset = visualOffsets[slot % visualOffsets.length];
      const screenPosition = (position: TilePosition) => ({ x: position.x * tileSize + tileSize / 2 + offset.x, y: position.y * tileSize + tileSize / 2 + offset.y });
      let person = peopleRef.current.get(villager.id);
      let isNew = false;
      if (!person) {
        isNew = true;
        const start = route[0] ?? villager.position;
        person = scene.add.container(screenPosition(start).x, screenPosition(start).y);
        person.add(scene.add.ellipse(0, 11, 17, 6, 0x493b2a, 0.38));
        person.add(scene.add.rectangle(0, 2, 16, 16, colors[villager.tradition as keyof typeof colors] ?? 0x76563c).setOrigin(0.5).setStrokeStyle(2, 0x493b2a));
        person.add(scene.add.rectangle(0, -8, 12, 10, 0xe2b783).setOrigin(0.5).setStrokeStyle(2, 0x493b2a));
        person.add(scene.add.rectangle(0, -15, 15, 5, 0x493b2a).setOrigin(0.5));
        person.add(scene.add.rectangle(-3, -8, 2, 2, 0x493b2a).setOrigin(0.5));
        person.add(scene.add.rectangle(3, -8, 2, 2, 0x493b2a).setOrigin(0.5));
        peopleRef.current.set(villager.id, person);
      }
      scene.tweens.killTweensOf(person);
      if (isNew) scene.tweens.add({ targets: person.list.slice(1), y: "+=1", duration: 360, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      if (route.length <= 1) person.setPosition(screenPosition(route[0]).x, screenPosition(route[0]).y);
      if (interpolate && route.length > 1) route.slice(1).forEach((step, stepIndex) => {
        const destination = screenPosition(step);
        const stepMs = firstGlowPlaybackStepMs(playbackRate);
        scene.tweens.add({ targets: person, x: destination.x, y: destination.y, duration: stepMs, delay: stepIndex * stepMs, ease: "Stepped" });
      });
      if (!interpolate || route.length <= 1) { const endpoint = screenPosition(route.at(-1) ?? villager.position); person.setPosition(endpoint.x, endpoint.y); }
      person.setDepth(firstGlowGroundDepth(villager.position));
    });
    lastTickRef.current = tick;
  };
  const syncSparks = (scene: Phaser.Scene, nextSparks: Spark[]) => {
    const tileSize = 24; const nextIds = new Set(nextSparks.map(spark => spark.id));
    peopleRef.current.forEach((person, id) => { if (!nextIds.has(id)) { person.destroy(); peopleRef.current.delete(id); } });
     nextSparks.forEach((spark) => { const position = firstGlowSparkScreenPosition(spark.position, tileSize); let core = peopleRef.current.get(spark.id); if (!core) { core = scene.add.container(position.x, position.y); core.add(scene.add.circle(0, 0, 9, 0x8addf2, 0.16)); core.add(scene.add.circle(0, 0, 5, 0xedf7ff, 1)); core.add(scene.add.circle(6, -6, 2, 0xc7b7ff, 1)); core.setBlendMode(Phaser.BlendModes.ADD); peopleRef.current.set(spark.id, core); scene.tweens.add({ targets: core.list[0], scale: 1.25, alpha: 0.08, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" }); } core.setPosition(position.x, position.y); core.setDepth(firstGlowSparkDepth(spark.position)); });
    document.getElementById("village-canvas")?.setAttribute("data-rendered-spark-coordinates", JSON.stringify(Object.fromEntries(nextSparks.map(spark => [spark.id, { x: spark.position.x * tileSize + tileSize / 2, y: spark.position.y * tileSize + tileSize / 2 }]))));
  };
  useEffect(() => {
    villagersRef.current = villagers;
  }, [villagers]);
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.tweens.timeScale = playbackRate;
  }, [playbackRate]);
  useEffect(() => {
    if (!sceneRef.current) return;
    const camera = sceneRef.current.cameras.main;
    camera.setZoom(zoom * displayResolution);
    const mapWidth = (worldDefinition?.width ?? 100) * 24;
    const mapHeight = (worldDefinition?.height ?? 100) * 24;
    const bounds = cameraScrollBounds(camera, mapWidth, mapHeight);
    camera.setScroll(Phaser.Math.Clamp(camera.scrollX, bounds.minX, bounds.maxX), Phaser.Math.Clamp(camera.scrollY, bounds.minY, bounds.maxY));
    const origin = cameraWorldOrigin(camera);
    sceneRef.current.game.canvas.dataset.cameraZoom = String(zoom);
    sceneRef.current.game.canvas.dataset.cameraViewCells = String(Math.round(768 / (24 * zoom)));
    sceneRef.current.game.canvas.dataset.cameraScroll = `${Math.round(origin.x)},${Math.round(origin.y)}`;
  }, [displayResolution, zoom, worldDefinition]);
  useEffect(() => {
    const tileSize = 24;
    let isActive = true;
    let disposeInput = () => undefined;
    document.getElementById("village-canvas")?.replaceChildren();
    const game = new Phaser.Game({ type: Phaser.AUTO, pixelArt: debugOverlay, transparent: true, width: 768 * displayResolution, height: 768 * displayResolution, parent: "village-canvas", scene: { create() {
      const scene = this as Phaser.Scene;
      if (!isActive) return;
      sceneRef.current = scene;
      const mapWidth = (worldDefinition?.width ?? 100) * tileSize;
      const mapHeight = (worldDefinition?.height ?? 100) * tileSize;
      const camera = scene.cameras.main;
      camera.setBounds(0, 0, mapWidth, mapHeight);
      camera.setZoom(zoom * displayResolution);
      camera.centerOn(mapWidth / 2, mapHeight / 2);
      let dragging = false;
      let activePointerId: number | null = null;
      let dragOrigin = { x: 0, y: 0 };
      let lastPointer = { x: 0, y: 0 };
      const canvas = scene.game.canvas;
      canvas.dataset.renderResolution = String(displayResolution);
      canvas.dataset.cameraZoom = String(zoom);
      canvas.dataset.cameraViewCells = String(Math.round(768 / (tileSize * zoom)));
      const initialOrigin = cameraWorldOrigin(camera);
      canvas.dataset.cameraScroll = `${Math.round(initialOrigin.x)},${Math.round(initialOrigin.y)}`;
      const setCameraScroll = (x: number, y: number) => {
        const bounds = cameraScrollBounds(camera, mapWidth, mapHeight);
        camera.setScroll(Phaser.Math.Clamp(x, bounds.minX, bounds.maxX), Phaser.Math.Clamp(y, bounds.minY, bounds.maxY));
        const origin = cameraWorldOrigin(camera);
        canvas.dataset.cameraScroll = `${Math.round(origin.x)},${Math.round(origin.y)}`;
      };
      const worldPointFromEvent = (event: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = camera.width / rect.width;
        const scaleY = camera.height / rect.height;
        const origin = cameraWorldOrigin(camera);
        return { x: origin.x + ((event.clientX - rect.left) * scaleX) / camera.zoom, y: origin.y + ((event.clientY - rect.top) * scaleY) / camera.zoom };
      };
      const onPointerMove = (event: PointerEvent) => {
        if (dragging) return;
        const worldPoint = worldPointFromEvent(event);
        const cell = { x: Math.floor(worldPoint.x / tileSize), y: Math.floor(worldPoint.y / tileSize) };
        if (sparks.length && cell.x >= 0 && cell.y >= 0 && cell.x < (worldDefinition?.width ?? 0) && cell.y < (worldDefinition?.height ?? 0)) setHoveredCell({ ...cell, clientX: event.clientX, clientY: event.clientY });
        else setHoveredCell(null);
      };
      const onDragMove = (event: PointerEvent) => {
        if (!dragging || event.pointerId !== activePointerId) return;
        const rect = canvas.getBoundingClientRect();
        const worldDeltaX = ((event.clientX - lastPointer.x) * camera.width / rect.width) / camera.zoom;
        const worldDeltaY = ((event.clientY - lastPointer.y) * camera.height / rect.height) / camera.zoom;
        setCameraScroll(camera.scrollX - worldDeltaX, camera.scrollY - worldDeltaY);
        lastPointer = { x: event.clientX, y: event.clientY };
      };
      const onPointerUp = (event: PointerEvent) => {
        if (event.pointerId !== activePointerId) return;
        const wasClick = Math.hypot(event.clientX - dragOrigin.x, event.clientY - dragOrigin.y) < 6;
        dragging = false;
        activePointerId = null;
        window.removeEventListener("pointermove", onDragMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
        canvas.style.cursor = "grab";
        if (!wasClick || !onSelectEntity) return;
        const rect = canvas.getBoundingClientRect();
        // The backing store may be 2x larger at high-DPR displays; pointer
        // conversion must use the camera's logical viewport in CSS pixels.
        const scaleX = camera.width / rect.width;
        const scaleY = camera.height / rect.height;
        const origin = cameraWorldOrigin(camera);
        const worldPoint = { x: origin.x + ((event.clientX - rect.left) * scaleX) / camera.zoom, y: origin.y + ((event.clientY - rect.top) * scaleY) / camera.zoom };
        const spark = sparks.find((candidate) => Math.hypot(candidate.position.x * tileSize + tileSize / 2 - worldPoint.x, candidate.position.y * tileSize + tileSize / 2 - worldPoint.y) <= tileSize * 0.7);
        if (spark) { onSelectEntity(`spark:${spark.id}`); return; }
        const object = worldDefinition?.objects.find((candidate) => {
          const definition = worldDefinition.definitions[candidate.definitionId];
          return (definition?.footprint ?? []).some((offset) => Math.floor(worldPoint.x / tileSize) === candidate.position.x + offset.x && Math.floor(worldPoint.y / tileSize) === candidate.position.y + offset.y);
        });
        if (object) onSelectEntity(`object:${object.id}`);
      };
      const onPointerDown = (event: PointerEvent) => {
        if (event.button !== 0 || activePointerId !== null) return;
        event.preventDefault();
        dragging = true;
        activePointerId = event.pointerId;
        dragOrigin = { x: event.clientX, y: event.clientY };
        lastPointer = dragOrigin;
        setHoveredCell(null);
        canvas.style.cursor = "grabbing";
        window.addEventListener("pointermove", onDragMove);
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerUp);
      };
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerleave", () => setHoveredCell(null));
      const onWheel = (event: WheelEvent) => {
        event.preventDefault();
        const direction = event.deltaY < 0 ? 1 : -1;
        onZoomChange((currentZoom) => Number(Math.max(FIRST_GLOW_MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom + direction * 0.1)).toFixed(2)));
      };
      canvas.addEventListener("wheel", onWheel, { passive: false });
      canvas.style.touchAction = "none";
      canvas.style.cursor = "grab";
      disposeInput = () => {
        window.removeEventListener("pointermove", onDragMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
      };
       const glowBundle = firstGlowBundle ?? (worldDefinition as (WorldDefinition & { firstGlowBundle?: FirstGlowBundle }) | undefined)?.firstGlowBundle;
        if (sparks.length && glowBundle && assetBaseUrl && glowBundle.assets?.length) { const assetKeys = new Map(glowBundle.assets.map(asset => [asset.path, firstGlowAssetKey(glowBundle.bundle.contentHash, asset.path)])); for (const asset of glowBundle.assets) scene.load.image(assetKeys.get(asset.path)!, firstGlowAssetUrl(assetBaseUrl, glowBundle.bundle.contentHash, asset.path)); scene.load.once("complete", () => { worldDefinition?.objects.forEach(object => { const visualAsset = glowBundle.objectDefinitions[object.definitionId]?.visualAsset; const key = visualAsset ? assetKeys.get(visualAsset) : undefined; if (!key || !scene.textures.exists(key)) return; const definition = glowBundle.objectDefinitions[object.definitionId]; const contact = definition?.groundContact ?? { x: 0, y: 0 }; const foregroundDepth = definition?.foreground ? 200 : 0; const image = scene.add.image((object.position.x + 0.5) * tileSize, (object.position.y + 0.5) * tileSize, key).setDisplaySize(tileSize, tileSize).setDepth(firstGlowGroundDepth({ x: object.position.x + contact.x, y: object.position.y + contact.y }) + 2 + foregroundDepth); image.setAlpha(0.9); }); }); scene.load.start(); }
       const terrainColors: Record<string, number> = sparks.length ? { open: 0x050912, gap: 0x02040b } : { grass: 0x9dbc72, road: 0xd8b878, water: 0x5797b5 };
       for (let y = 0; y < (worldDefinition?.height ?? 100); y += 1) for (let x = 0; x < (worldDefinition?.width ?? 100); x += 1) {
         const kind = worldDefinition?.terrain[y]?.[x] ?? "grass";
         scene.add.rectangle(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, tileSize, tileSize, terrainColors[kind] ?? terrainColors.grass).setOrigin(0.5).setStrokeStyle(1, sparks.length ? 0x23344a : 0x6f8154, sparks.length ? 0.45 : 0.2);
       }
       if (sparks.length && glowBundle) { glowBundle.surfaces.filter(surface => surface.enabled).forEach(surface => { surface.cells.forEach(cell => scene.add.rectangle(cell.x * tileSize + tileSize / 2, cell.y * tileSize + tileSize / 2, tileSize - 4, tileSize - 4, surface.movementCost === 1 ? 0x6cdbff : 0x243d63, 0.3).setOrigin(0.5).setStrokeStyle(1, 0x9eeaff, 0.75).setDepth(3)); if (debugOverlay && surface.cells[0]) scene.add.text(surface.cells[0].x * tileSize + 2, surface.cells[0].y * tileSize + 2, `surface:${surface.id} cost:${surface.movementCost}`, { color: "#9eeaff", fontSize: "8px", backgroundColor: "#081426" }).setDepth(1002); }); if (debugOverlay) { glowBundle.spawns.forEach(spawn => scene.add.text(spawn.cell.x * tileSize + 2, spawn.cell.y * tileSize + 2, `spawn:${spawn.id}`, { color: "#9eeaff", fontSize: "8px", backgroundColor: "#081426" }).setDepth(1002)); } }
       worldDefinition?.objects.forEach((object) => {
         const definition = worldDefinition.definitions[object.definitionId];
         const blocked = sparks.length ? Boolean(firstGlowRuntime?.objects.find(item => item.objectId === object.id)?.blocked) : Boolean(worldRuntime?.blockedObjectIds?.includes(object.id));
         const color = sparks.length ? (blocked ? 0xb05dff : object.definitionId === "relay-crossing" ? 0x9eeaff : 0x527aa8) : (blocked ? 0xb54f4f : object.definitionId === "tree" ? 0x3e7046 : object.definitionId === "bridge" ? 0x8b5e3c : object.definitionId === "granary" ? 0x9d5f3f : 0x76563c);
         const objectCells = definition?.footprint ?? [];
          const objectDefinition = glowBundle?.objectDefinitions[object.definitionId]; const contact = (objectDefinition?.groundContact ?? { x: 0, y: 0 }); const objectDepth = firstGlowGroundDepth({ x: object.position.x + contact.x, y: object.position.y + contact.y }) + (objectDefinition?.foreground ? 200 : 0);
          objectCells.forEach((offset) => scene.add.rectangle((object.position.x + offset.x) * tileSize + tileSize / 2, (object.position.y + offset.y) * tileSize + tileSize / 2, tileSize - 2, tileSize - 2, color).setOrigin(0.5).setDepth(objectDepth).setStrokeStyle(2, sparks.length ? 0x9eeaff : 0x493b2a));
         if (debugOverlay) { scene.add.text(object.position.x * tileSize + 2, object.position.y * tileSize + 2, `${object.id}${blocked ? " [blocked]" : ""}`, { color: "#fff7e8", fontSize: "8px", backgroundColor: sparks.length ? "#081426" : "#493b2a" }).setDepth(1000); definition?.interactionSlots.forEach((slot) => { const reservation = firstGlowRuntime?.reservations.find(item => item.objectId === object.id && item.slotId === slot.id); scene.add.rectangle((object.position.x + slot.x) * tileSize + tileSize / 2, (object.position.y + slot.y) * tileSize + tileSize / 2, tileSize - 8, tileSize - 8, reservation ? 0xf4c95d : 0x3d8c72, 0.45).setDepth(1001).setStrokeStyle(1, reservation ? 0xfff2ad : 0x2a5d4b); scene.add.text((object.position.x + slot.x) * tileSize + 1, (object.position.y + slot.y) * tileSize + 1, reservation ? `contact:${slot.id} <- ${reservation.actorId}` : `contact:${slot.id}`, { color: reservation ? "#fff2ad" : "#9eeaff", fontSize: "7px", backgroundColor: "#081426" }).setDepth(1002); }); }
       });
        if (debugOverlay) { const legend = scene.add.text(8, 44, sparks.length ? `DEBUG: shared spatial query · contacts · reservations · nav:${firstGlowRuntime?.navigationRevision ?? 0}` : "DEBUG: green slots · red blockers · labels = stable IDs", { color: sparks.length ? "#dceeff" : "#fff7e8", fontSize: "10px", backgroundColor: sparks.length ? "#081426" : "#493b2a" }).setScrollFactor(0).setDepth(2000); void legend; if (sparks.length && glowBundle) { let walkable = 0; let blocked = 0; for (let y = 0; y < glowBundle.height; y += 1) for (let x = 0; x < glowBundle.width; x += 1) { const query = firstGlowCellQuery(glowBundle, firstGlowRuntime, { x, y }); if (query.walkable) walkable += 1; else { blocked += 1; scene.add.rectangle(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, tileSize - 2, tileSize - 2, 0xff5f8f, 0.08).setOrigin(0.5).setDepth(4).setStrokeStyle(1, 0xff9cbd, 0.45); } } scene.add.text(8, 58, `effective cells: ${walkable} walkable · ${blocked} blocked · ${firstGlowBlockedSummary(glowBundle, firstGlowRuntime)}`, { color: "#9eeaff", fontSize: "9px", backgroundColor: "#081426" }).setScrollFactor(0).setDepth(2000); } }
        if (!sparks.length) scene.add.text(8, 22, "THE FIRST WINTER", { color: "#fff7e8", fontSize: "22px", fontFamily: "monospace", stroke: "#493b2a", strokeThickness: 4 });
       if (sparks.length) { syncVillagers(scene, []); syncSparks(scene, sparks); } else syncVillagers(scene, villagersRef.current);
    } } });
    return () => { isActive = false; disposeInput(); sceneRef.current = null; peopleRef.current.clear(); lastTickRef.current = null; if (firstGlowSceneLifecycle.dispose === "destroy") game.destroy(true); };
   }, [debugOverlay, firstGlowBundle?.bundle.contentHash, firstGlowRuntime?.navigationRevision, firstGlowRuntime?.objects.map(item => `${item.objectId}:${item.blocked}`).join(","), worldDefinition?.id, worldDefinition?.bundle.contentHash]);
  useEffect(() => {
    if (sceneRef.current && sparks.length) syncSparks(sceneRef.current, sparks); else if (sceneRef.current && peopleRef.current.size > 0) syncVillagers(sceneRef.current, villagers);
  }, [villagers, sparks]);
   const overlaySummary = firstGlowBundle && firstGlowRuntime ? `nav:${firstGlowRuntime.navigationRevision} · blocked:${firstGlowBlockedSummary(firstGlowBundle, firstGlowRuntime)} · reservations:${firstGlowRuntime.reservations.map(item => `${item.objectId}:${item.slotId}`).join(",") || "none"}` : "";
   const hoveredLabel = hoveredCell && firstGlowBundle ? (() => { const { x, y } = hoveredCell; const terrain = firstGlowBundle.terrain[y]?.[x] ?? "unknown"; const surface = firstGlowBundle.surfaces.find(item => item.enabled && item.cells.some(cell => cell.x === x && cell.y === y)); const spawn = firstGlowBundle.spawns.find(item => item.cell.x === x && item.cell.y === y); const object = worldDefinition?.objects.find(candidate => candidate.position.x === x && candidate.position.y === y || (worldDefinition.definitions[candidate.definitionId]?.footprint ?? []).some(offset => candidate.position.x + offset.x === x && candidate.position.y + offset.y === y)); const spark = sparks.find(candidate => candidate.position.x === x && candidate.position.y === y); const query = firstGlowCellQuery(firstGlowBundle, firstGlowRuntime, { x, y }); return [`Cell (${x}, ${y})`, `Terrain: ${terrain}`, `Effective: ${query.walkable ? `walkable cost ${query.cost}` : `blocked ${query.reason}`}`, surface && `Surface: ${surface.id}`, spawn && `Spawn: ${spawn.id}`, object && `Object: ${object.id} · ${object.definitionId}`, spark && `Spark: ${spark.id}`].filter((value): value is string => Boolean(value)); })() : null;
  const adjustZoom = (delta: number) => onZoomChange(Number(Math.max(FIRST_GLOW_MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta)).toFixed(2)));
  const fitZoom = sparks.length ? 2 : 1;
   return <div className="village-stage"><div className="village-zoom"><div id="village-canvas" />{worldDefinition?.width === 32 && worldDefinition.height === 32 && <div className="first-glow-map-controls" aria-label="Map zoom controls"><button className="compact-button" onClick={() => adjustZoom(0.1)} aria-label="+" title="Zoom in"><span aria-hidden="true">+</span></button><button className="compact-button" onClick={() => onZoomChange(fitZoom)} aria-label="Fit" title="Show a 16 by 16 view"><span aria-hidden="true">⌖</span></button><button className="compact-button" onClick={() => adjustZoom(-0.1)} aria-label="−" title="Zoom out"><span aria-hidden="true">−</span></button></div>}</div>{hoveredLabel && hoveredCell && <div className="first-glow-cell-tooltip" data-testid="first-glow-cell-tooltip" style={{ left: `${Math.max(8, Math.min(window.innerWidth - 240, hoveredCell.clientX + 12))}px`, top: `${Math.max(8, Math.min(window.innerHeight - 140, hoveredCell.clientY + 12))}px` }}>{hoveredLabel.map((label) => <span key={label}>{label}</span>)}</div>}{sparks.length > 0 && debugOverlay && <p className="first-glow-overlay-summary" data-testid="first-glow-overlay-summary">{overlaySummary}</p>}{sparks.length > 0 && <FirstGlowInspector regionName={regionName} sparks={sparks} objects={worldDefinition?.objects.map((object) => { const definition = worldDefinition.definitions[object.definitionId]; return { id: object.id, label: (definition as { label?: string } | undefined)?.label, definitionId: object.definitionId, position: object.position, blocked: Boolean(firstGlowRuntime?.objects.find((item) => item.objectId === object.id)?.blocked), capabilities: (definition as { activities?: string[] } | undefined)?.activities ?? [], slots: firstGlowBundle?.objectDefinitions[object.definitionId]?.slots ?? [] }; }) ?? []} selectedEntityId={selectedEntityId} onSelectEntity={onSelectEntity ?? (() => undefined)} debugOverlay={debugOverlay} />}</div>;
}

function OwnerPanel({ ownerToken, setOwnerToken, report, message, onCommand, onRefresh }: { ownerToken: string; setOwnerToken: (value: string) => void; report: Report | null; message: string; onCommand: (path: string, body?: Record<string, unknown>) => void; onRefresh: () => void }) {
  const summary = report?.summary ?? { scenarioName: "Legacy server", finalFood: "—", averageTrust: "—" };
  const firstGlow = summary.scenarioName === "The First Glow";
  return <section className="operations">
    <div className="operations-heading"><div><h2>{firstGlow ? "First Glow operations" : "Owner operations"}</h2><p>{firstGlow ? "Local timeline controls and recovery checks for the opening age." : "Local timeline controls and recovery checks."}</p></div><button onClick={onRefresh}>Refresh report</button></div>
    <label className="owner-token">Owner token <input type="password" value={ownerToken} onChange={(event) => setOwnerToken(event.target.value)} placeholder="Only needed when OWNER_TOKEN is set" /></label>
    <div className="operation-buttons"><button onClick={() => onCommand("/api/owner/archive")}>Archive</button><button onClick={() => onCommand("/api/owner/continue")}>Continue</button><button onClick={() => onCommand("/api/owner/branch", { tick: report?.tick })}>Branch here</button>{!firstGlow && <button onClick={() => { if (window.confirm("Reset this timeline into a new season?")) onCommand("/api/owner/reset", {}); }}>Reset season</button>}</div>
    {message && <p className="operation-message">{message}</p>}
    {report && <div className="report-grid"><span>Timeline <strong>{report.timeline.id.slice(0, 18)}…</strong></span><span>Status <strong>{report.timeline.status}</strong></span><span>Tick <strong>{report.tick}</strong></span><span>Scenario <strong>{summary.scenarioName}</strong></span><span>{firstGlow ? "Source charge" : "Final food"} <strong>{firstGlow ? summary.firstGlow?.sourceCharge ?? 0 : summary.finalFood}</strong></span><span>{firstGlow ? "Sparks" : "Average trust"} <strong>{firstGlow ? summary.firstGlow?.sparks ?? 0 : summary.averageTrust}</strong></span><span>Checkpoints <strong>{report.checkpoints}</strong></span><span>Events <strong>{report.events}</strong></span><span>Interpretations <strong>{report.interpretations}</strong></span><span>Database <strong>{Math.round(report.databaseBytes / 1024)} KB</strong></span><span>Social <strong>{report.socialMode}</strong></span></div>}
  </section>;
}

function SeasonReview({ world, metrics }: { world: State; metrics: Metric[] }) {
  const visible = metrics.filter((metric) => metric.tick <= world.tick);
  const latest = visible.at(-1);
  const maxTick = Math.max(1, visible.at(-1)?.tick ?? world.tick);
  const maxFood = Math.max(1, ...visible.map((metric) => metric.foodReserve));
  const point = (metric: Metric, value: number, max: number) => `${(metric.tick / maxTick) * 560},${154 - (value / max) * 124}`;
  const foodPoints = visible.map((metric) => point(metric, metric.foodReserve, maxFood)).join(" ");
  const trustPoints = visible.map((metric) => point(metric, metric.averageTrust, 100)).join(" ");
  const complete = world.tick >= world.scenario.seasonTickLimit;
  const dilemmas = world.dilemmaHistory ?? [];
  return <section className="season-review">
    <div className="season-review-heading"><div><h2>{complete ? "Season review" : "Season progress"}</h2><p>{complete ? `${world.scenario.name} is complete.` : `${world.scenario.name} is recording its outcome.`}</p></div><strong>Tick {world.tick} / {world.scenario.seasonTickLimit}</strong></div>
    {latest ? <>
      <div className="metric-cards"><span>Food reserve<strong>{latest.foodReserve}</strong></span><span>Average trust<strong>{latest.averageTrust}</strong></span><span>Hungry<strong>{latest.hungryVillagers}</strong></span><span>Dilemmas<strong>{dilemmas.length}</strong></span></div>
      <svg className="metric-chart" viewBox="0 0 560 170" role="img" aria-label="Food reserve and average trust over the recorded season"><line x1="0" y1="154" x2="560" y2="154" /><polyline className="food-line" points={foodPoints} /><polyline className="trust-line" points={trustPoints} /></svg>
      <div className="metric-legend"><span><i className="food-key" /> Food reserve</span><span><i className="trust-key" /> Average trust</span></div>
      {dilemmas.map((dilemma) => <article className="dilemma-outcome" key={dilemma.id}><strong>Tick {dilemma.tick}: {dilemma.title}</strong><p>{dilemma.choiceLabel} · {dilemma.summary}</p><small>Food {dilemma.foodDelta >= 0 ? "+" : ""}{dilemma.foodDelta} · trust {dilemma.trustDelta >= 0 ? "+" : ""}{dilemma.trustDelta}</small></article>)}
    </> : <p>Metrics will appear after the first committed tick.</p>}
  </section>;
}

function DesignBench({ cards, dilemmas, store }: { cards: CharacterCard[]; dilemmas: DilemmaCard[]; store?: SharedStore }) {
  return <section className="design-bench"><h2>Values and dilemmas</h2><p>Authored tensions guide the first season; the engine records consequences rather than choosing a winning philosophy.</p><details><summary>Six character cards</summary><div className="card-grid">{cards.map((card) => <article key={card.id}><strong>{card.name}</strong><small>{card.tradition}</small><p>{card.disposition}</p><small>Strength: {card.strength}</small><small>Tension: {card.tension}</small></article>)}</div></details><details><summary>Three first-winter dilemmas</summary>{dilemmas.map((dilemma) => <article className="dilemma" key={dilemma.id}><strong>{dilemma.title}</strong><p>{dilemma.prompt}</p><small>Values: {dilemma.competingValues.join(" · ")}</small><ul>{dilemma.choices.map((choice) => <li key={choice.id}><strong>{choice.label}:</strong> {choice.tradeoff}</li>)}</ul></article>)}</details>{store && <div className="store-card"><strong>Shared granary · {store.status}</strong><p>{store.contributionRule} {store.distributionRule}</p><small>{store.contributions} contributions · {store.distributions} distributions · {store.dissent} dissent signals</small></div>}</section>;
}

function FirstGlowDesignBench({ design }: { design?: FirstGlowDesign }) {
  if (!design) return null;
  return <section className="first-glow-design" data-testid="first-glow-design"><h2>Opening question</h2><p className="opening-question">{design.openingQuestion}</p><p>{design.boundary}</p><div className="glow-tendencies">{design.cards.map(card => <article key={card.id}><strong>{card.name}</strong><small>{card.tendency}</small><p>{card.description}</p><small>{card.openingQuestion}</small></article>)}</div><h3>Early signals</h3><div className="glow-events">{design.events.map(event => <article key={event.id}><strong>{event.title}</strong><p>{event.prompt}</p><small>{event.observableOutcome}</small></article>)}</div></section>;
}

function RegionOverview({ world, activeSettlementId, onSelect }: { world: State; activeSettlementId: string; onSelect: (id: string) => void }) {
  const settlements = world.settlements ?? [];
  const firstGlow = world.simulationVersion === "mimir-sim-v3-first-glow";
  const trades = world.tradeHistory ?? [];
  const activeHazards = (world.hazards ?? []).filter((hazard) => hazard.status === "active");
  return <section className="region-overview"><div className="season-review-heading"><div><h2>{firstGlow ? "Local region" : "Regional view"}</h2><p>{firstGlow ? "Select a region to inspect its Sparks and light sites." : "Select a settlement to inspect its map and people."}</p></div><strong>{settlements.length} {firstGlow ? "regions" : "settlements"}</strong></div><div className="region-cards">{settlements.map((settlement) => { const glowSettlement = world.firstGlowState?.settlements.find(candidate => candidate.id === settlement.id); return <button className={`region-card${settlement.id === activeSettlementId ? " selected" : ""}`} key={settlement.id} onClick={() => onSelect(settlement.id)}><strong>{settlement.name}</strong><span>{firstGlow ? `${glowSettlement?.sparks.length ?? 0} Sparks` : `${settlement.villagerIds.length} villagers`}</span><span>{firstGlow ? `${glowSettlement?.sourceCharge ?? 0} source charge` : `${settlement.foodReserve} food reserve`}</span><small>Inspect {firstGlow ? "region" : "settlement"}</small></button>; })}</div>{!firstGlow && <><p className="weather-status">Weather: <strong>{world.weather?.kind ?? "clear"}</strong> · forecast {world.weather?.forecast ?? "rain"}</p>{activeHazards.map((hazard) => <p className="hazard-status" key={hazard.id}>⚠️ {hazard.summary}</p>)}{trades.length > 0 && <div className="trade-history"><h3>Cross-village trade</h3>{trades.slice(-3).reverse().map((trade) => <p key={trade.id}><strong>Tick {trade.tick}:</strong> {trade.summary}</p>)}</div>}</>}</section>;
}

function App() {
  const [world, setWorld] = useState<State | null>(null);
  const [liveWorld, setLiveWorld] = useState<State | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [interpretations, setInterpretations] = useState<Interpretation[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [characterCards, setCharacterCards] = useState<CharacterCard[]>([]);
  const [dilemmas, setDilemmas] = useState<DilemmaCard[]>([]);
  const [firstGlowDesign, setFirstGlowDesign] = useState<FirstGlowDesign | undefined>();
  const [designStore, setDesignStore] = useState<SharedStore | undefined>();
  const [viewTick, setViewTick] = useState<number | null>(null);
  const [clockPaused, setClockPaused] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [zoom, setZoom] = useState(2);
  const debugOverlay = import.meta.env.VITE_DEBUG_OVERLAY === "true";
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedVillagerId, setSelectedVillagerId] = useState<string | null>(null);
  const [ownerToken, setOwnerToken] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [operationMessage, setOperationMessage] = useState("");
  const [activeSettlementId, setActiveSettlementId] = useState("first-village");
  const viewTickRef = useRef<number | null>(null);
  const historyRequestRef = useRef(new HistoryRequestSequencer());
  const liveContextRef = useRef<string | null>(null);
  const invalidateHistoryRequest = () => historyRequestRef.current.invalidate();
  const activeSettlement = world?.settlements?.find((settlement) => settlement.id === activeSettlementId);
  const visibleVillagers = (world?.villagers ?? []).filter((villager) => villager.settlementId === activeSettlementId);
  const selected = visibleVillagers.find((villager) => villager.id === selectedVillagerId);
  const isFirstGlow = world?.simulationVersion === "mimir-sim-v3-first-glow";
  const firstGlowSparks = world?.firstGlowState?.settlements.find((settlement) => settlement.id === activeSettlementId)?.sparks ?? [];
  const firstGlowBundle = isFirstGlow ? world?.firstGlowState?.settlements.find((settlement) => settlement.id === activeSettlementId)?.bundle as FirstGlowBundle | undefined : undefined;
  const firstGlowRuntime = isFirstGlow ? world?.firstGlowState?.settlements.find((settlement) => settlement.id === activeSettlementId)?.runtime : undefined;
  const setSelected = (villager: Villager | null) => setSelectedVillagerId(villager?.id ?? null);
  const displayedWorldDefinition = activeSettlement?.worldDefinition ?? world?.worldDefinition ?? (isFirstGlow && firstGlowBundle ? firstGlowWorldDefinition(firstGlowBundle) : structuredWorldDefinition(world?.structuredState, activeSettlementId));
  const fitZoom = (isFirstGlow || !displayedWorldDefinition ? 2 : Math.min(1, 768 / ((displayedWorldDefinition.width ?? 100) * 24), 768 / ((displayedWorldDefinition.height ?? 100) * 24)));
  useEffect(() => { setZoom(fitZoom); }, [fitZoom]);
  useEffect(() => { if (world?.settlements && !world.settlements.some((settlement) => settlement.id === activeSettlementId)) { invalidateHistoryRequest(); setActiveSettlementId(world.settlements[0]?.id ?? "first-village"); setSelectedVillagerId(null); } }, [world?.settlements, activeSettlementId]);
  const loadLive = async () => {
    const [worldResponse, eventsResponse, interpretationsResponse, metricsResponse, designResponse, regionResponse] = await Promise.all([fetch(`${api}/api/world`), fetch(`${api}/api/events?limit=200`), fetch(`${api}/api/interpretations?limit=200`), fetch(`${api}/api/metrics`), fetch(`${api}/api/design`), fetch(`${api}/api/region`)]);
    const worldPayload = await worldResponse.json() as { state: State; schedulerPaused?: boolean };
    const nextWorld = worldPayload.state;
    validateClientWorld(nextWorld);
    const nextContext = `${nextWorld.worldId}:${nextWorld.firstGlowState?.settlements.map((settlement) => settlement.bundle.bundle.contentHash).join(",") ?? "legacy"}`;
    if (liveContextRef.current !== null && liveContextRef.current !== nextContext) invalidateHistoryRequest();
    liveContextRef.current = nextContext;
    setLiveWorld(nextWorld);
    if (typeof worldPayload.schedulerPaused === "boolean") setClockPaused(worldPayload.schedulerPaused);
    setEvents((await eventsResponse.json()).events as Event[]);
    setInterpretations((await interpretationsResponse.json()).interpretations as Interpretation[]);
    setMetrics((await metricsResponse.json()).metrics as Metric[]);
    const design = await designResponse.json() as { characterCards: CharacterCard[]; dilemmas: DilemmaCard[]; sharedStore?: SharedStore; firstGlow?: FirstGlowDesign };
    setCharacterCards(design.characterCards);
    setDilemmas(design.dilemmas);
    setDesignStore(design.sharedStore);
    setFirstGlowDesign(design.firstGlow);
    const region = await regionResponse.json() as { settlements: Settlement[]; tradeHistory: Trade[] };
    setLiveWorld((current) => current ? { ...current, settlements: region.settlements, tradeHistory: region.tradeHistory } : { ...nextWorld, settlements: region.settlements, tradeHistory: region.tradeHistory });
    if (viewTickRef.current === null) setWorld({ ...nextWorld, settlements: region.settlements, tradeHistory: region.tradeHistory });
  };
  useEffect(() => {
    void loadLive();
    void loadReport();
    const stream = new EventSource(`${api}/api/live`);
    stream.onmessage = (message) => {
      const payload = JSON.parse(message.data) as { state: State; events?: Event[]; interpretations?: Interpretation[] };
      validateClientWorld(payload.state);
      setLiveWorld(payload.state);
      if (payload.events?.length) setEvents((current) => Array.from(new Map([...current, ...payload.events!].map((event) => [event.id, event])).values()).slice(-200));
      if (payload.interpretations?.length) setInterpretations((current) => Array.from(new Map([...current, ...payload.interpretations!].map((interpretation) => [interpretation.id, interpretation])).values()).slice(-200));
      if (viewTickRef.current === null) setWorld(payload.state);
    };
    const timer = window.setInterval(() => void loadLive(), 15000);
    return () => { stream.close(); window.clearInterval(timer); };
  }, []);
  const showTick = async (tick: number | null) => {
    if (tick === null) invalidateHistoryRequest();
    if (tick === null) { viewTickRef.current = null; setViewTick(null); if (liveWorld) setWorld(liveWorld); return; }
    const request = historyRequestRef.current.begin();
    try {
      const response = await fetch(`${api}/api/world?tick=${tick}`, { signal: request.signal });
      const result = await response.json() as { state: State };
      if (!historyRequestRef.current.isCurrent(request)) return;
      viewTickRef.current = tick;
      setViewTick(tick); setWorld(result.state);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) throw error;
    } finally {
      historyRequestRef.current.complete(request);
    }
  };
  const ownerRequest = async (path: string, body: Record<string, unknown> = {}) => fetch(`${api}${path}`, { method: "POST", headers: { "content-type": "application/json", ...(ownerToken ? { "x-owner-token": ownerToken } : {}) }, body: JSON.stringify(body) });
  const loadReport = async () => { const response = await fetch(`${api}/api/report`); if (response.ok) setReport(await response.json() as Report); };
  const runOwnerCommand = async (path: string, body: Record<string, unknown> = {}) => { const response = await ownerRequest(path, body); const result = await response.json() as { error?: string; timeline?: Report["timeline"]; schedulerPaused?: boolean }; if (!response.ok) { setOperationMessage(result.error ?? `Request failed (${response.status})`); return; } if (typeof result.schedulerPaused === "boolean") setClockPaused(result.schedulerPaused); setOperationMessage(`${path.split("/").pop()} complete`); await loadLive(); await loadReport(); };
  const tick = async () => { await ownerRequest("/api/tick"); await loadLive(); await loadReport(); };
  const toggleClock = async () => { const response = await ownerRequest("/api/scheduler", { paused: !clockPaused }); const result = await response.json() as { schedulerPaused?: boolean; error?: string }; if (typeof result.schedulerPaused === "boolean") setClockPaused(result.schedulerPaused); else if (result.error) setOperationMessage(result.error); await loadReport(); };
  const setClockSpeed = async (intervalMs: number) => { const response = await ownerRequest("/api/scheduler", { intervalMs }); const result = await response.json() as { tickIntervalMs?: number; error?: string }; if (typeof result.tickIntervalMs === "number") setOperationMessage(`tick speed set to ${intervalMs / 1000}s`); else if (result.error) setOperationMessage(result.error); await loadReport(); };
  if (!world) return <main className="first-glow first-glow-loading" data-theme="living-circuit"><div><h1>Mimir</h1><p>A Light of Our Own · Connecting…</p></div></main>;
  const maximumTick = liveWorld?.tick ?? world.tick;
  return <main className={isFirstGlow ? "first-glow" : ""} data-theme={isFirstGlow ? "living-circuit" : "village"}>
    <header><div><h1>Mimir</h1><p className="season-label">Season {world.season}: {isFirstGlow ? "The First Glow" : world.scenario.name}</p><p>A Light of Our Own · Tick {world.tick} · <span className={viewTick === null ? "live" : "history"}>● {viewTick === null ? "LIVE" : "HISTORY"}</span></p></div><div className="controls"><button className="compact-button" onClick={toggleClock} aria-label={clockPaused ? "Resume clock" : "Pause clock"} title={clockPaused ? "Play: resume the clock" : "Pause the clock"}><span aria-hidden="true">{clockPaused ? "▶" : "⏸"}</span></button><button className="compact-button" onClick={tick} disabled={viewTick !== null || world.tick >= world.scenario.seasonTickLimit} aria-label="Advance one tick" title="Advance one tick"><span aria-hidden="true">⏭</span></button><span className="clock-speed">Tick speed</span>{[1000, 5000, 15000].map((intervalMs) => <button className={report?.tickIntervalMs === intervalMs ? "selected-rate" : ""} key={intervalMs} onClick={() => void setClockSpeed(intervalMs)} aria-label={`Set tick speed to ${intervalMs / 1000} seconds`} title={`Set tick speed to ${intervalMs / 1000} seconds`}>{intervalMs / 1000}s</button>)}</div></header>
    <section className="timeline"><label htmlFor="timeline">History</label><input id="timeline" type="range" min="0" max={Math.max(1, maximumTick)} value={viewTick ?? maximumTick} onChange={(event) => void showTick(Number(event.target.value))} /><button className="return-live compact-button" onClick={() => void showTick(null)} disabled={viewTick === null} aria-label="Return to Live" title="Rewind: return to the live timeline"><span aria-hidden="true">↩</span></button><span>Tick {viewTick ?? maximumTick} / {maximumTick}</span><div className="playback"><span>Playback</span>{[0.5, 1, 2].map((rate) => <button className={playbackRate === rate ? "selected-rate" : ""} key={rate} onClick={() => setPlaybackRate(rate)} aria-label={`${rate}×`} title={`Set playback speed to ${rate}x`}>{rate}×</button>)}</div></section>
     <section className="layout"><div><VillageCanvas villagers={visibleVillagers} sparks={firstGlowSparks} firstGlowBundle={firstGlowBundle} firstGlowRuntime={firstGlowRuntime} assetBaseUrl={api} worldDefinition={displayedWorldDefinition} worldRuntime={activeSettlement?.worldRuntime ?? world.worldRuntime} playbackRate={playbackRate} zoom={zoom} onZoomChange={setZoom} tick={world.tick} history={viewTick !== null} selectedEntityId={selectedEntityId} onSelectEntity={setSelectedEntityId} debugOverlay={debugOverlay} /><RegionOverview world={world} activeSettlementId={activeSettlementId} onSelect={(id) => { invalidateHistoryRequest(); setActiveSettlementId(id); setSelected(null); setSelectedEntityId(null); }} /><section className="events"><h2>Recent events</h2>{events.filter((event) => event.tick <= world.tick).slice(-6).reverse().map((event) => <p key={event.id}><strong>Tick {event.tick}:</strong> {event.message}</p>)}</section><SeasonReview world={world} metrics={metrics} /><section className="interpretations"><h2>Social interpretations</h2>{interpretations.filter((interpretation) => interpretation.tick <= world.tick).slice(-4).reverse().map((interpretation) => <article key={interpretation.id}><p><strong>Tick {interpretation.tick} · {interpretation.source === "rules" ? "Rules fallback" : "AI"}</strong></p><p>{interpretation.summary}</p><small>Evidence: {interpretation.evidenceEventIds.join(", ")} · confidence {Math.round(interpretation.confidence * 100)}%</small></article>)}</section>{isFirstGlow ? <FirstGlowDesignBench design={firstGlowDesign} /> : <DesignBench cards={characterCards} dilemmas={dilemmas} store={world.sharedStore ?? designStore} />}<OwnerPanel ownerToken={ownerToken} setOwnerToken={setOwnerToken} report={report} message={operationMessage} onCommand={(path, body) => void runOwnerCommand(path, body)} onRefresh={() => void loadReport()} /></div>
      <aside><h2>{selected?.name ?? `${activeSettlement?.name ?? "Settlement"}: Select a villager`}</h2><div className="villager-list">{visibleVillagers.map((villager) => <button className={`villager${selected?.id === villager.id ? " selected" : ""}`} key={villager.id} onClick={() => setSelected(villager)}><span className={`dot ${villager.tradition.toLowerCase()}`} />{villager.name}<small>{villager.activity}</small></button>)}</div>{selected ? <><p className="tradition">{selected.tradition}</p><p>Current cell <strong>({selected.position.x}, {selected.position.y})</strong> in <strong>{activeSettlement?.name ?? selected.settlementId}</strong>.</p><p>Destination <strong>{selected.destinationObjectId && selected.destinationSlotId ? `${selected.destinationObjectId} / ${selected.destinationSlotId}` : "none"}</strong>; intent <strong>{selected.intendedActivity ?? selected.activity}</strong>.</p><p>Status <strong>{selected.status ?? selected.activity}</strong>{selected.waitReason ? ` · waiting: ${selected.waitReason}` : ""} · progress <strong>{selected.route.length} cell(s), ${selected.remainingCost ?? 0} cost pending</strong>.</p><dl><dt>Hunger</dt><dd>{selected.hunger}</dd><dt>Trust</dt><dd>{selected.trust}</dd></dl><div className="signals"><h3>Belief signals</h3><div><span>Cooperation</span><strong>{selected.beliefs.cooperation}</strong><i style={{ width: `${selected.beliefs.cooperation}%` }} /></div><div><span>Self-reliance</span><strong>{selected.beliefs.selfReliance}</strong><i style={{ width: `${selected.beliefs.selfReliance}%` }} /></div><div><span>Reflection</span><strong>{selected.beliefs.reflection}</strong><i style={{ width: `${selected.beliefs.reflection}%` }} /></div></div></> : <p>Click a villager to inspect their current situation.</p>}<div className="reserve">Food reserve <strong>{activeSettlement?.foodReserve ?? world.foodReserve}</strong></div></aside>
    </section>
  </main>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
