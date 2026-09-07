import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Phaser from "phaser";
import { parseWorldDefinition } from "@mimir/engine";
import type { Cell, MovementModel, WorldDefinition } from "@mimir/engine";
import "./styles.css";

type TilePosition = Cell;
type Villager = { id: string; name: string; tradition: string; activity: string; location: string; hunger: number; trust: number; position: TilePosition; route: TilePosition[]; settlementId: string; destination?: TilePosition; intendedActivity?: string; targetLocation?: string; status?: string; waitReason?: string; destinationObjectId?: string; destinationSlotId?: string; remainingCost?: number; travelPlan?: { toSettlementId: string; remainingTicks: number } };
type SharedStore = { status: string; contributions: number; distributions: number; dissent: number; contributionRule: string; distributionRule: string };
type DilemmaResolution = { id: string; tick: number; title: string; choiceLabel: string; summary: string; foodDelta: number; trustDelta: number };
type Settlement = { id: string; name: string; foodReserve: number; villagerIds: string[]; worldDefinition?: WorldDefinition; worldRuntime?: { blockedObjectIds: string[] } };
type Trade = { id: string; tick: number; villagerId: string; fromSettlementId: string; toSettlementId: string; amount: number; summary: string };
type Hazard = { id: string; kind: string; status: string; summary: string };
type State = { tick: number; season: number; foodReserve: number; scenario: { name: string; seasonTickLimit: number }; villagers: Villager[]; settlements?: Settlement[]; tradeHistory?: Trade[]; weather?: { kind: string; severity: number; forecast: string }; hazards?: Hazard[]; dilemmaHistory?: DilemmaResolution[]; sharedStore?: SharedStore; worldDefinition?: WorldDefinition; worldRuntime?: { blockedObjectIds: string[] }; spatialModel?: "structured-v1" | "structured-v2" | "legacy-backdrop-v0"; simulationVersion?: string; movementModel?: MovementModel; structuredState?: unknown };
type Event = { id: string; tick: number; message: string; kind: string };
type Metric = { tick: number; foodReserve: number; averageTrust: number; hungryVillagers: number; travelingVillagers: number; collectingVillagers: number };
type CharacterCard = { id: string; name: string; tradition: string; disposition: string; strength: string; tension: string; beliefSignals: { cooperation: number; selfReliance: number; reflection: number } };
type DilemmaCard = { id: string; title: string; prompt: string; competingValues: string[]; choices: { id: string; label: string; tradeoff: string }[] };
type Interpretation = { id: string; tick: number; eventId: string; villagerId: string; source: "rules" | "ai"; fallbackReason?: string; belief: string; confidence: number; trustDelta: number; summary: string; evidenceEventIds: string[] };
type Report = { timeline: { id: string; parent_id: string | null; created_at: string; status: string; archived_at: string | null }; tick: number; schedulerPaused: boolean; tickIntervalMs: number; databaseBytes: number; socialMode: string; socialBudgetCents: number; fallbackCount: number; checkpoints: number; events: number; interpretations: number; summary?: { season: number; scenarioName: string; finalFood: number; averageTrust: number; villagers: number; dilemmasResolved?: number; latestDilemma?: DilemmaResolution | null } };
const api = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:3000";

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

function VillageCanvas({ villagers, worldDefinition, worldRuntime, playbackRate, zoom, debugOverlay = import.meta.env.DEV }: { villagers: Villager[]; worldDefinition?: WorldDefinition; worldRuntime?: { blockedObjectIds: string[] }; playbackRate: number; zoom: number; debugOverlay?: boolean }) {
  const villagersRef = useRef(villagers);
  const peopleRef = useRef(new Map<string, Phaser.GameObjects.Container>());
  const sceneRef = useRef<Phaser.Scene | null>(null);
  const syncVillagers = (scene: Phaser.Scene, nextVillagers: Villager[]) => {
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
      route.slice(1).forEach((step, stepIndex) => {
        const destination = screenPosition(step);
        scene.tweens.add({ targets: person, x: destination.x, y: destination.y, duration: 180, delay: stepIndex * 180, ease: "Stepped" });
      });
      person.setDepth(10 + villager.position.y);
    });
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
    camera.setZoom(zoom);
    const mapWidth = (worldDefinition?.width ?? 100) * 24;
    const mapHeight = (worldDefinition?.height ?? 100) * 24;
    camera.scrollX = Phaser.Math.Clamp(camera.scrollX, 0, Math.max(0, mapWidth - camera.width / camera.zoom));
    camera.scrollY = Phaser.Math.Clamp(camera.scrollY, 0, Math.max(0, mapHeight - camera.height / camera.zoom));
  }, [zoom, worldDefinition]);
  useEffect(() => {
    const tileSize = 24;
    let isActive = true;
    const game = new Phaser.Game({ type: Phaser.AUTO, pixelArt: true, transparent: true, width: 768, height: 768, parent: "village-canvas", scene: { create() {
      const scene = this as Phaser.Scene;
      if (!isActive) return;
      sceneRef.current = scene;
      const mapWidth = (worldDefinition?.width ?? 100) * tileSize;
      const mapHeight = (worldDefinition?.height ?? 100) * tileSize;
      const camera = scene.cameras.main;
      camera.setBounds(0, 0, mapWidth, mapHeight);
      camera.setZoom(zoom);
      camera.centerOn(mapWidth / 2, mapHeight / 2);
      let dragging = false;
      let dragStart = { x: 0, y: 0, scrollX: 0, scrollY: 0 };
      const canvas = scene.game.canvas;
      const onPointerDown = (event: PointerEvent) => { dragging = true; canvas.setPointerCapture(event.pointerId); dragStart = { x: event.clientX, y: event.clientY, scrollX: camera.scrollX, scrollY: camera.scrollY }; canvas.style.cursor = "grabbing"; };
      const onPointerMove = (event: PointerEvent) => {
        if (!dragging) return;
        camera.scrollX = Phaser.Math.Clamp(dragStart.scrollX - (event.clientX - dragStart.x) / camera.zoom, 0, Math.max(0, mapWidth - camera.width / camera.zoom));
        camera.scrollY = Phaser.Math.Clamp(dragStart.scrollY - (event.clientY - dragStart.y) / camera.zoom, 0, Math.max(0, mapHeight - camera.height / camera.zoom));
      };
      const onPointerUp = (event: PointerEvent) => { dragging = false; if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); canvas.style.cursor = "grab"; };
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.style.cursor = "grab";
       const terrainColors: Record<string, number> = { grass: 0x9dbc72, road: 0xd8b878, water: 0x5797b5 };
       for (let y = 0; y < (worldDefinition?.height ?? 100); y += 1) for (let x = 0; x < (worldDefinition?.width ?? 100); x += 1) {
         const kind = worldDefinition?.terrain[y]?.[x] ?? "grass";
         scene.add.rectangle(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, tileSize, tileSize, terrainColors[kind] ?? terrainColors.grass).setOrigin(0.5).setStrokeStyle(1, 0x6f8154, 0.2);
       }
       worldDefinition?.objects.forEach((object) => {
         const definition = worldDefinition.definitions[object.definitionId];
         const color = worldRuntime?.blockedObjectIds.includes(object.id) ? 0xb54f4f : object.definitionId === "tree" ? 0x3e7046 : object.definitionId === "bridge" ? 0x8b5e3c : object.definitionId === "granary" ? 0x9d5f3f : 0x76563c;
         const objectCells = definition?.footprint ?? [];
         objectCells.forEach((offset) => scene.add.rectangle((object.position.x + offset.x) * tileSize + tileSize / 2, (object.position.y + offset.y) * tileSize + tileSize / 2, tileSize - 2, tileSize - 2, color).setOrigin(0.5).setDepth(5 + object.position.y + offset.y).setStrokeStyle(2, 0x493b2a));
         if (debugOverlay) { scene.add.text(object.position.x * tileSize + 2, object.position.y * tileSize + 2, object.id, { color: "#fff7e8", fontSize: "8px", backgroundColor: "#493b2a" }).setDepth(1000); definition?.interactionSlots.forEach((slot, slotIndex) => scene.add.rectangle((object.position.x + slot.x) * tileSize + tileSize / 2, (object.position.y + slot.y) * tileSize + tileSize / 2, tileSize - 8, tileSize - 8, 0x3d8c72, 0.45).setDepth(1001).setStrokeStyle(1, 0x2a5d4b)); }
       });
       if (debugOverlay) { const legend = scene.add.text(8, 44, "DEBUG: green slots · red blockers · labels = stable IDs", { color: "#fff7e8", fontSize: "10px", backgroundColor: "#493b2a" }).setScrollFactor(0).setDepth(2000); void legend; }
       scene.add.text(24, 22, "THE FIRST WINTER", { color: "#fff7e8", fontSize: "22px", fontFamily: "monospace", stroke: "#493b2a", strokeThickness: 4 });
      syncVillagers(scene, villagersRef.current);
    } } });
    return () => { isActive = false; sceneRef.current = null; peopleRef.current.clear(); game.destroy(true); };
  }, [debugOverlay, worldDefinition, worldRuntime]);
  useEffect(() => {
    if (sceneRef.current && peopleRef.current.size > 0) syncVillagers(sceneRef.current, villagers);
  }, [villagers]);
  return <div className="village-stage"><div className="village-zoom"><div id="village-canvas" /></div></div>;
}

function OwnerPanel({ ownerToken, setOwnerToken, report, message, onCommand, onRefresh }: { ownerToken: string; setOwnerToken: (value: string) => void; report: Report | null; message: string; onCommand: (path: string, body?: Record<string, unknown>) => void; onRefresh: () => void }) {
  const summary = report?.summary ?? { scenarioName: "Legacy server", finalFood: "—", averageTrust: "—" };
  return <section className="operations">
    <div className="operations-heading"><div><h2>Owner operations</h2><p>Local timeline controls and recovery checks.</p></div><button onClick={onRefresh}>Refresh report</button></div>
    <label className="owner-token">Owner token <input type="password" value={ownerToken} onChange={(event) => setOwnerToken(event.target.value)} placeholder="Only needed when OWNER_TOKEN is set" /></label>
    <div className="operation-buttons"><button onClick={() => onCommand("/api/owner/archive")}>Archive</button><button onClick={() => onCommand("/api/owner/continue")}>Continue</button><button onClick={() => onCommand("/api/owner/branch", { tick: report?.tick })}>Branch here</button><button onClick={() => { if (window.confirm("Reset this timeline into a new season?")) onCommand("/api/owner/reset", {}); }}>Reset season</button></div>
    {message && <p className="operation-message">{message}</p>}
    {report && <div className="report-grid"><span>Timeline <strong>{report.timeline.id.slice(0, 18)}…</strong></span><span>Status <strong>{report.timeline.status}</strong></span><span>Tick <strong>{report.tick}</strong></span><span>Scenario <strong>{summary.scenarioName}</strong></span><span>Final food <strong>{summary.finalFood}</strong></span><span>Average trust <strong>{summary.averageTrust}</strong></span><span>Checkpoints <strong>{report.checkpoints}</strong></span><span>Events <strong>{report.events}</strong></span><span>Interpretations <strong>{report.interpretations}</strong></span><span>Database <strong>{Math.round(report.databaseBytes / 1024)} KB</strong></span><span>Social <strong>{report.socialMode}</strong></span></div>}
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

function RegionOverview({ world, activeSettlementId, onSelect }: { world: State; activeSettlementId: string; onSelect: (id: string) => void }) {
  const settlements = world.settlements ?? [];
  const trades = world.tradeHistory ?? [];
  const activeHazards = (world.hazards ?? []).filter((hazard) => hazard.status === "active");
  return <section className="region-overview"><div className="season-review-heading"><div><h2>Regional view</h2><p>Select a settlement to inspect its map and people.</p></div><strong>{settlements.length} settlements</strong></div><div className="region-cards">{settlements.map((settlement) => <button className={`region-card${settlement.id === activeSettlementId ? " selected" : ""}`} key={settlement.id} onClick={() => onSelect(settlement.id)}><strong>{settlement.name}</strong><span>{settlement.villagerIds.length} villagers</span><span>{settlement.foodReserve} food reserve</span><small>Inspect settlement</small></button>)}</div><p className="weather-status">Weather: <strong>{world.weather?.kind ?? "clear"}</strong> · forecast {world.weather?.forecast ?? "rain"}</p>{activeHazards.map((hazard) => <p className="hazard-status" key={hazard.id}>⚠️ {hazard.summary}</p>)}{trades.length > 0 && <div className="trade-history"><h3>Cross-village trade</h3>{trades.slice(-3).reverse().map((trade) => <p key={trade.id}><strong>Tick {trade.tick}:</strong> {trade.summary}</p>)}</div>}</section>;
}

function App() {
  const [world, setWorld] = useState<State | null>(null);
  const [liveWorld, setLiveWorld] = useState<State | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [interpretations, setInterpretations] = useState<Interpretation[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [characterCards, setCharacterCards] = useState<CharacterCard[]>([]);
  const [dilemmas, setDilemmas] = useState<DilemmaCard[]>([]);
  const [designStore, setDesignStore] = useState<SharedStore | undefined>();
  const [viewTick, setViewTick] = useState<number | null>(null);
  const [clockPaused, setClockPaused] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [debugOverlay, setDebugOverlay] = useState(import.meta.env.DEV);
  const [selectedVillagerId, setSelectedVillagerId] = useState<string | null>(null);
  const [ownerToken, setOwnerToken] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [operationMessage, setOperationMessage] = useState("");
  const [activeSettlementId, setActiveSettlementId] = useState("first-village");
  const viewTickRef = useRef<number | null>(null);
  const activeSettlement = world?.settlements?.find((settlement) => settlement.id === activeSettlementId);
  const visibleVillagers = world?.villagers.filter((villager) => villager.settlementId === activeSettlementId) ?? [];
  const selected = visibleVillagers.find((villager) => villager.id === selectedVillagerId);
  const setSelected = (villager: Villager | null) => setSelectedVillagerId(villager?.id ?? null);
  const displayedWorldDefinition = activeSettlement?.worldDefinition ?? world?.worldDefinition ?? structuredWorldDefinition(world?.structuredState, activeSettlementId);
  const fitZoom = Math.min(1, 768 / ((displayedWorldDefinition?.width ?? 100) * 24), 768 / ((displayedWorldDefinition?.height ?? 100) * 24));
  useEffect(() => { setZoom(fitZoom); }, [fitZoom]);
  useEffect(() => { if (world?.settlements && !world.settlements.some((settlement) => settlement.id === activeSettlementId)) { setActiveSettlementId(world.settlements[0]?.id ?? "first-village"); setSelectedVillagerId(null); } }, [world?.settlements, activeSettlementId]);
  const loadLive = async () => {
    const [worldResponse, eventsResponse, interpretationsResponse, metricsResponse, designResponse, regionResponse] = await Promise.all([fetch(`${api}/api/world`), fetch(`${api}/api/events?limit=200`), fetch(`${api}/api/interpretations?limit=200`), fetch(`${api}/api/metrics`), fetch(`${api}/api/design`), fetch(`${api}/api/region`)]);
    const worldPayload = await worldResponse.json() as { state: State; schedulerPaused?: boolean };
    const nextWorld = worldPayload.state;
    validateClientWorld(nextWorld);
    setLiveWorld(nextWorld);
    if (typeof worldPayload.schedulerPaused === "boolean") setClockPaused(worldPayload.schedulerPaused);
    setEvents((await eventsResponse.json()).events as Event[]);
    setInterpretations((await interpretationsResponse.json()).interpretations as Interpretation[]);
    setMetrics((await metricsResponse.json()).metrics as Metric[]);
    const design = await designResponse.json() as { characterCards: CharacterCard[]; dilemmas: DilemmaCard[]; sharedStore?: SharedStore };
    setCharacterCards(design.characterCards);
    setDilemmas(design.dilemmas);
    setDesignStore(design.sharedStore);
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
    if (tick === null) { viewTickRef.current = null; setViewTick(null); if (liveWorld) setWorld(liveWorld); return; }
    const result = await (await fetch(`${api}/api/world?tick=${tick}`)).json();
    viewTickRef.current = tick;
    setViewTick(tick); setWorld(result.state as State);
  };
  const ownerRequest = async (path: string, body: Record<string, unknown> = {}) => fetch(`${api}${path}`, { method: "POST", headers: { "content-type": "application/json", ...(ownerToken ? { "x-owner-token": ownerToken } : {}) }, body: JSON.stringify(body) });
  const loadReport = async () => { const response = await fetch(`${api}/api/report`); if (response.ok) setReport(await response.json() as Report); };
  const runOwnerCommand = async (path: string, body: Record<string, unknown> = {}) => { const response = await ownerRequest(path, body); const result = await response.json() as { error?: string; timeline?: Report["timeline"]; schedulerPaused?: boolean }; if (!response.ok) { setOperationMessage(result.error ?? `Request failed (${response.status})`); return; } if (typeof result.schedulerPaused === "boolean") setClockPaused(result.schedulerPaused); setOperationMessage(`${path.split("/").pop()} complete`); await loadLive(); await loadReport(); };
  const tick = async () => { await ownerRequest("/api/tick"); await loadLive(); await loadReport(); };
  const toggleClock = async () => { const response = await ownerRequest("/api/scheduler", { paused: !clockPaused }); const result = await response.json() as { schedulerPaused?: boolean; error?: string }; if (typeof result.schedulerPaused === "boolean") setClockPaused(result.schedulerPaused); else if (result.error) setOperationMessage(result.error); await loadReport(); };
  const setClockSpeed = async (intervalMs: number) => { const response = await ownerRequest("/api/scheduler", { intervalMs }); const result = await response.json() as { tickIntervalMs?: number; error?: string }; if (typeof result.tickIntervalMs === "number") setOperationMessage(`tick speed set to ${intervalMs / 1000}s`); else if (result.error) setOperationMessage(result.error); await loadReport(); };
  if (!world) return <main><h1>Mimir</h1><p>A Thousand Worlds · Connecting to the village…</p></main>;
  const maximumTick = liveWorld?.tick ?? world.tick;
  return <main>
    <header><div><h1>Mimir</h1><p>A Thousand Worlds · Season {world.season} · Tick {world.tick} · <span className={viewTick === null ? "live" : "history"}>● {viewTick === null ? "LIVE" : "HISTORY"}</span></p></div><div className="controls"><button onClick={toggleClock}>{clockPaused ? "Resume clock" : "Pause clock"}</button><button onClick={tick} disabled={viewTick !== null || world.tick >= world.scenario.seasonTickLimit}>Advance one tick</button><span className="clock-speed">Tick speed</span>{[1000, 5000, 15000].map((intervalMs) => <button className={report?.tickIntervalMs === intervalMs ? "selected-rate" : ""} key={intervalMs} onClick={() => void setClockSpeed(intervalMs)}>{intervalMs / 1000}s</button>)}</div></header>
    <section className="timeline"><label htmlFor="timeline">History</label><input id="timeline" type="range" min="0" max={Math.max(1, maximumTick)} value={viewTick ?? maximumTick} onChange={(event) => void showTick(Number(event.target.value))} /><button className="return-live" onClick={() => void showTick(null)} disabled={viewTick === null}>Return to Live</button><span>Tick {viewTick ?? maximumTick} / {maximumTick}</span><div className="playback"><span>Playback</span>{[0.5, 1, 2].map((rate) => <button className={playbackRate === rate ? "selected-rate" : ""} key={rate} onClick={() => setPlaybackRate(rate)}>{rate}×</button>)}</div><div className="zoom-controls"><span>Map</span><button onClick={() => setZoom((current) => Math.max(0.25, Number((current - 0.1).toFixed(2))))}>−</button><button onClick={() => setZoom(fitZoom)}>Fit</button><button onClick={() => setZoom((current) => Math.min(2, Number((current + 0.1).toFixed(2))))}>+</button><button onClick={() => setDebugOverlay((current) => !current)}>{debugOverlay ? "Hide IDs" : "Show IDs"}</button><small>Drag to pan</small></div></section>
    <section className="layout"><div><VillageCanvas villagers={visibleVillagers} worldDefinition={displayedWorldDefinition} worldRuntime={activeSettlement?.worldRuntime ?? world.worldRuntime} playbackRate={playbackRate} zoom={zoom} debugOverlay={debugOverlay} /><RegionOverview world={world} activeSettlementId={activeSettlementId} onSelect={(id) => { setActiveSettlementId(id); setSelected(null); }} /><section className="events"><h2>Recent events</h2>{events.filter((event) => event.tick <= world.tick).slice(-6).reverse().map((event) => <p key={event.id}><strong>Tick {event.tick}:</strong> {event.message}</p>)}</section><SeasonReview world={world} metrics={metrics} /><section className="interpretations"><h2>Social interpretations</h2>{interpretations.filter((interpretation) => interpretation.tick <= world.tick).slice(-4).reverse().map((interpretation) => <article key={interpretation.id}><p><strong>Tick {interpretation.tick} · {interpretation.source === "rules" ? "Rules fallback" : "AI"}</strong></p><p>{interpretation.summary}</p><small>Evidence: {interpretation.evidenceEventIds.join(", ")} · confidence {Math.round(interpretation.confidence * 100)}%</small></article>)}</section><DesignBench cards={characterCards} dilemmas={dilemmas} store={world.sharedStore ?? designStore} /><OwnerPanel ownerToken={ownerToken} setOwnerToken={setOwnerToken} report={report} message={operationMessage} onCommand={(path, body) => void runOwnerCommand(path, body)} onRefresh={() => void loadReport()} /></div>
      <aside><h2>{selected?.name ?? `${activeSettlement?.name ?? "Settlement"}: Select a villager`}</h2><div className="villager-list">{visibleVillagers.map((villager) => <button className={`villager${selected?.id === villager.id ? " selected" : ""}`} key={villager.id} onClick={() => setSelected(villager)}><span className={`dot ${villager.tradition.toLowerCase()}`} />{villager.name}<small>{villager.activity}</small></button>)}</div>{selected ? <><p className="tradition">{selected.tradition}</p><p>Current cell <strong>({selected.position.x}, {selected.position.y})</strong> in <strong>{activeSettlement?.name ?? selected.settlementId}</strong>.</p><p>Destination <strong>{selected.destinationObjectId && selected.destinationSlotId ? `${selected.destinationObjectId} / ${selected.destinationSlotId}` : "none"}</strong>; intent <strong>{selected.intendedActivity ?? selected.activity}</strong>.</p><p>Status <strong>{selected.status ?? selected.activity}</strong>{selected.waitReason ? ` · waiting: ${selected.waitReason}` : ""} · progress <strong>{selected.route.length} cell(s), ${selected.remainingCost ?? 0} cost pending</strong>.</p><dl><dt>Hunger</dt><dd>{selected.hunger}</dd><dt>Trust</dt><dd>{selected.trust}</dd></dl><div className="signals"><h3>Belief signals</h3><div><span>Cooperation</span><strong>{selected.beliefs.cooperation}</strong><i style={{ width: `${selected.beliefs.cooperation}%` }} /></div><div><span>Self-reliance</span><strong>{selected.beliefs.selfReliance}</strong><i style={{ width: `${selected.beliefs.selfReliance}%` }} /></div><div><span>Reflection</span><strong>{selected.beliefs.reflection}</strong><i style={{ width: `${selected.beliefs.reflection}%` }} /></div></div></> : <p>Click a villager to inspect their current situation.</p>}<div className="reserve">Food reserve <strong>{activeSettlement?.foodReserve ?? world.foodReserve}</strong></div></aside>
    </section>
  </main>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
