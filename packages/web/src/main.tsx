import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Phaser from "phaser";
import "./styles.css";

type TilePosition = { x: number; y: number };
type Villager = { id: string; name: string; tradition: string; activity: string; location: string; hunger: number; trust: number; position: TilePosition; route: TilePosition[] };
type WorldDefinition = { width: number; height: number; terrain: string[][]; objects: { id: string; definitionId: string; position: TilePosition }[]; definitions: Record<string, { footprint: TilePosition[] }> };
type State = { tick: number; season: number; foodReserve: number; scenario: { name: string; seasonTickLimit: number }; villagers: Villager[]; worldDefinition?: WorldDefinition; worldRuntime?: { blockedObjectIds: string[] } };
type Event = { id: string; tick: number; message: string; kind: string };
type Interpretation = { id: string; tick: number; eventId: string; villagerId: string; source: "rules" | "ai"; fallbackReason?: string; belief: string; confidence: number; trustDelta: number; summary: string; evidenceEventIds: string[] };
type Report = { timeline: { id: string; parent_id: string | null; created_at: string; status: string; archived_at: string | null }; tick: number; schedulerPaused: boolean; tickIntervalMs: number; databaseBytes: number; socialMode: string; socialBudgetCents: number; fallbackCount: number; checkpoints: number; events: number; interpretations: number; summary?: { season: number; scenarioName: string; finalFood: number; averageTrust: number; villagers: number } };
const api = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function VillageCanvas({ villagers, worldDefinition, worldRuntime, playbackRate, zoom }: { villagers: Villager[]; worldDefinition?: WorldDefinition; worldRuntime?: { blockedObjectIds: string[] }; playbackRate: number; zoom: number }) {
  const villagersRef = useRef(villagers);
  const peopleRef = useRef(new Map<string, Phaser.GameObjects.Container>());
  const sceneRef = useRef<Phaser.Scene | null>(null);
  const syncVillagers = (scene: Phaser.Scene, nextVillagers: Villager[]) => {
    const tileSize = 24;
    const colors = { Hearthkeepers: 0xc5664a, Freehands: 0x5c8eaa, Seekers: 0x8b6b9d };
    const nextIds = new Set(nextVillagers.map((villager) => villager.id));
    peopleRef.current.forEach((person, id) => {
      if (!nextIds.has(id)) { person.destroy(); peopleRef.current.delete(id); }
    });
    nextVillagers.forEach((villager, index) => {
      const route = villager.route.length > 0 ? villager.route : [villager.position];
      let person = peopleRef.current.get(villager.id);
      let isNew = false;
      if (!person) {
        isNew = true;
        const start = route[0] ?? villager.position;
        person = scene.add.container(start.x * tileSize + tileSize / 2, start.y * tileSize + tileSize / 2);
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
      route.slice(1).forEach((step, stepIndex) => {
        scene.tweens.add({ targets: person, x: step.x * tileSize + tileSize / 2, y: step.y * tileSize + tileSize / 2, duration: 180, delay: stepIndex * 180, ease: "Stepped" });
      });
      if (index === nextVillagers.length - 1) person.setDepth(2);
    });
  };
  useEffect(() => {
    villagersRef.current = villagers;
  }, [villagers]);
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.tweens.timeScale = playbackRate;
  }, [playbackRate]);
  useEffect(() => {
    const tileSize = 24;
    let isActive = true;
    const game = new Phaser.Game({ type: Phaser.AUTO, pixelArt: true, transparent: true, width: 768, height: 384, parent: "village-canvas", scene: { create() {
      const scene = this as Phaser.Scene;
      if (!isActive) return;
      sceneRef.current = scene;
       const terrainColors: Record<string, number> = { grass: 0x9dbc72, road: 0xd8b878, water: 0x5797b5 };
       for (let y = 0; y < (worldDefinition?.height ?? 16); y += 1) for (let x = 0; x < (worldDefinition?.width ?? 32); x += 1) {
         const kind = worldDefinition?.terrain[y]?.[x] ?? "grass";
         scene.add.rectangle(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, tileSize, tileSize, terrainColors[kind] ?? terrainColors.grass).setOrigin(0.5).setStrokeStyle(1, 0x6f8154, 0.2);
       }
       worldDefinition?.objects.forEach((object) => {
         const definition = worldDefinition.definitions[object.definitionId];
         const color = worldRuntime?.blockedObjectIds.includes(object.id) ? 0xb54f4f : object.definitionId === "tree" ? 0x3e7046 : object.definitionId === "bridge" ? 0x8b5e3c : object.definitionId === "granary" ? 0x9d5f3f : 0x76563c;
         definition?.footprint.forEach((offset) => scene.add.rectangle((object.position.x + offset.x) * tileSize + tileSize / 2, (object.position.y + offset.y) * tileSize + tileSize / 2, tileSize - 2, tileSize - 2, color).setOrigin(0.5).setStrokeStyle(2, 0x493b2a));
       });
       scene.add.text(24, 22, "THE FIRST WINTER", { color: "#fff7e8", fontSize: "22px", fontFamily: "monospace", stroke: "#493b2a", strokeThickness: 4 });
      syncVillagers(scene, villagersRef.current);
    } } });
    return () => { isActive = false; sceneRef.current = null; peopleRef.current.clear(); game.destroy(true); };
  }, []);
  useEffect(() => {
    if (sceneRef.current && peopleRef.current.size > 0) syncVillagers(sceneRef.current, villagers);
  }, [villagers]);
  return <div className="village-stage"><div className="village-zoom" style={{ transform: `scale(${zoom})`, transformOrigin: "top left", marginBottom: `${384 * (zoom - 1)}px` }}><div id="village-canvas" /></div></div>;
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

function App() {
  const [world, setWorld] = useState<State | null>(null);
  const [liveWorld, setLiveWorld] = useState<State | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [interpretations, setInterpretations] = useState<Interpretation[]>([]);
  const [viewTick, setViewTick] = useState<number | null>(null);
  const [clockPaused, setClockPaused] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState<Villager | null>(null);
  const [ownerToken, setOwnerToken] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [operationMessage, setOperationMessage] = useState("");
  const viewTickRef = useRef<number | null>(null);
  const loadLive = async () => {
    const [worldResponse, eventsResponse, interpretationsResponse] = await Promise.all([fetch(`${api}/api/world`), fetch(`${api}/api/events?limit=200`), fetch(`${api}/api/interpretations?limit=200`)]);
    const worldPayload = await worldResponse.json() as { state: State; schedulerPaused?: boolean };
    const nextWorld = worldPayload.state;
    setLiveWorld(nextWorld);
    if (typeof worldPayload.schedulerPaused === "boolean") setClockPaused(worldPayload.schedulerPaused);
    setEvents((await eventsResponse.json()).events as Event[]);
    setInterpretations((await interpretationsResponse.json()).interpretations as Interpretation[]);
    if (viewTickRef.current === null) setWorld(nextWorld);
  };
  useEffect(() => {
    void loadLive();
    void loadReport();
    const stream = new EventSource(`${api}/api/live`);
    stream.onmessage = (message) => {
      const payload = JSON.parse(message.data) as { state: State; events?: Event[]; interpretations?: Interpretation[] };
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
  return <main><header><div><h1>Mimir</h1><p>A Thousand Worlds · Season {world.season} · Tick {world.tick} · <span className={viewTick === null ? "live" : "history"}>● {viewTick === null ? "LIVE" : "HISTORY"}</span></p></div><div className="controls"><button onClick={toggleClock}>{clockPaused ? "Resume clock" : "Pause clock"}</button><button onClick={tick} disabled={viewTick !== null || world.tick >= 60}>Advance one tick</button><span className="clock-speed">Tick speed</span>{[1000, 5000, 15000].map((intervalMs) => <button className={report?.tickIntervalMs === intervalMs ? "selected-rate" : ""} key={intervalMs} onClick={() => void setClockSpeed(intervalMs)}>{intervalMs / 1000}s</button>)}</div></header><section className="timeline"><label htmlFor="timeline">History</label><input id="timeline" type="range" min="0" max={Math.max(1, maximumTick)} value={viewTick ?? maximumTick} onChange={(event) => void showTick(Number(event.target.value))} /><button className="return-live" onClick={() => void showTick(null)} disabled={viewTick === null}>Return to Live</button><span>Tick {viewTick ?? maximumTick} / {maximumTick}</span><div className="playback"><span>Playback</span>{[0.5, 1, 2].map((rate) => <button className={playbackRate === rate ? "selected-rate" : ""} key={rate} onClick={() => setPlaybackRate(rate)}>{rate}×</button>)}</div><div className="zoom-controls"><span>Map</span><button onClick={() => setZoom((current) => Math.max(0.8, Number((current - 0.1).toFixed(1))))}>−</button><button onClick={() => setZoom(1)}>Fit</button><button onClick={() => setZoom((current) => Math.min(1.4, Number((current + 0.1).toFixed(1))))}>+</button></div></section><section className="layout"><div><VillageCanvas villagers={world.villagers} worldDefinition={world.worldDefinition} worldRuntime={world.worldRuntime} playbackRate={playbackRate} zoom={zoom} /><div className="villagers">{world.villagers.map((villager) => <button className="villager" key={villager.id} onClick={() => setSelected(villager)}><span className={`dot ${villager.tradition.toLowerCase()}`} />{villager.name}<small>{villager.activity}</small></button>)}</div><section className="events"><h2>Recent events</h2>{events.filter((event) => event.tick <= world.tick).slice(-6).reverse().map((event) => <p key={event.id}><strong>Tick {event.tick}:</strong> {event.message}</p>)}</section><section className="interpretations"><h2>Social interpretations</h2>{interpretations.filter((interpretation) => interpretation.tick <= world.tick).slice(-4).reverse().map((interpretation) => <article key={interpretation.id}><p><strong>Tick {interpretation.tick} · {interpretation.source === "rules" ? "Rules fallback" : "AI"}</strong></p><p>{interpretation.summary}</p><small>Evidence: {interpretation.evidenceEventIds.join(", ")} · confidence {Math.round(interpretation.confidence * 100)}%</small></article>)}</section><OwnerPanel ownerToken={ownerToken} setOwnerToken={setOwnerToken} report={report} message={operationMessage} onCommand={(path, body) => void runOwnerCommand(path, body)} onRefresh={() => void loadReport()} /></div><aside><h2>{selected?.name ?? "Select a villager"}</h2>{selected ? <><p className="tradition">{selected.tradition}</p><p>At <strong>{selected.location}</strong>, choosing to <strong>{selected.activity}</strong>.</p><dl><dt>Hunger</dt><dd>{selected.hunger}</dd><dt>Trust</dt><dd>{selected.trust}</dd></dl><div className="signals"><h3>Belief signals</h3><div><span>Cooperation</span><strong>{selected.beliefs.cooperation}</strong><i style={{ width: `${selected.beliefs.cooperation}%` }} /></div><div><span>Self-reliance</span><strong>{selected.beliefs.selfReliance}</strong><i style={{ width: `${selected.beliefs.selfReliance}%` }} /></div><div><span>Reflection</span><strong>{selected.beliefs.reflection}</strong><i style={{ width: `${selected.beliefs.reflection}%` }} /></div></div></> : <p>Click a villager to inspect their current situation.</p>}<div className="reserve">Food reserve <strong>{world.foodReserve}</strong></div></aside></section></main>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
