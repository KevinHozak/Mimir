import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Phaser from "phaser";
import "./styles.css";

type TilePosition = { x: number; y: number };
type Villager = { id: string; name: string; tradition: string; activity: string; location: string; hunger: number; trust: number; position: TilePosition; route: TilePosition[] };
type State = { tick: number; season: number; foodReserve: number; villagers: Villager[] };
type Event = { id: string; tick: number; message: string; kind: string };
const api = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function VillageCanvas({ villagers }: { villagers: Villager[] }) {
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
    const tileSize = 24;
    let isActive = true;
    const game = new Phaser.Game({ type: Phaser.AUTO, pixelArt: true, transparent: true, width: 768, height: 360, parent: "village-canvas", scene: { create() {
      const scene = this as Phaser.Scene;
      if (!isActive) return;
      sceneRef.current = scene;
      scene.add.text(24, 22, "THE FIRST WINTER", { color: "#fff7e8", fontSize: "22px", fontFamily: "monospace", stroke: "#493b2a", strokeThickness: 4 });
      for (let x = 0; x < 768; x += tileSize) for (let y = 0; y < 360; y += tileSize) scene.add.rectangle(x + tileSize / 2, y + tileSize / 2, tileSize, tileSize, 0xf2d27d, 0.06).setOrigin(0.5);
      for (let x = 7; x <= 11; x += 1) for (let y = 10; y <= 13; y += 1) scene.add.line(0, 0, x * tileSize + 3, y * tileSize + 18, x * tileSize + 19, y * tileSize + 5, 0x9b713f, 0.8).setOrigin(0);
      syncVillagers(scene, villagersRef.current);
    } } });
    return () => { isActive = false; sceneRef.current = null; peopleRef.current.clear(); game.destroy(true); };
  }, []);
  useEffect(() => {
    if (sceneRef.current && peopleRef.current.size > 0) syncVillagers(sceneRef.current, villagers);
  }, [villagers]);
  return <div id="village-canvas" />;
}

function App() {
  const [world, setWorld] = useState<State | null>(null);
  const [liveWorld, setLiveWorld] = useState<State | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [viewTick, setViewTick] = useState<number | null>(null);
  const [clockPaused, setClockPaused] = useState(false);
  const [selected, setSelected] = useState<Villager | null>(null);
  const loadLive = async () => {
    const [worldResponse, eventsResponse] = await Promise.all([fetch(`${api}/api/world`), fetch(`${api}/api/events?limit=200`)]);
    const worldPayload = await worldResponse.json() as { state: State; schedulerPaused?: boolean };
    const nextWorld = worldPayload.state;
    setLiveWorld(nextWorld);
    if (typeof worldPayload.schedulerPaused === "boolean") setClockPaused(worldPayload.schedulerPaused);
    setEvents((await eventsResponse.json()).events as Event[]);
    if (viewTick === null) setWorld(nextWorld);
  };
  useEffect(() => {
    void loadLive();
    const stream = new EventSource(`${api}/api/live`);
    stream.onmessage = (message) => {
      const payload = JSON.parse(message.data) as { state: State; events?: Event[] };
      setLiveWorld(payload.state);
      if (payload.events?.length) setEvents((current) => Array.from(new Map([...current, ...payload.events!].map((event) => [event.id, event])).values()).slice(-200));
      if (viewTick === null) setWorld(payload.state);
    };
    const timer = window.setInterval(() => void loadLive(), 15000);
    return () => { stream.close(); window.clearInterval(timer); };
  }, [viewTick]);
  const showTick = async (tick: number | null) => {
    if (tick === null) { setViewTick(null); if (liveWorld) setWorld(liveWorld); return; }
    const result = await (await fetch(`${api}/api/world?tick=${tick}`)).json();
    setViewTick(tick); setWorld(result.state as State);
  };
  const tick = async () => { await fetch(`${api}/api/tick`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }); await loadLive(); };
  const toggleClock = async () => { const response = await fetch(`${api}/api/scheduler`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ paused: !clockPaused }) }); const result = await response.json() as { schedulerPaused: boolean }; setClockPaused(result.schedulerPaused); };
  if (!world) return <main><h1>Philosophy World</h1><p>Connecting to the village…</p></main>;
  const maximumTick = liveWorld?.tick ?? world.tick;
  return <main><header><div><h1>Philosophy World</h1><p>Season {world.season} · Tick {world.tick} · <span className={viewTick === null ? "live" : "history"}>● {viewTick === null ? "LIVE" : "HISTORY"}</span></p></div><div className="controls"><button onClick={toggleClock}>{clockPaused ? "Resume clock" : "Pause clock"}</button><button onClick={tick} disabled={viewTick !== null || world.tick >= 60}>Advance one tick</button></div></header><section className="timeline"><label htmlFor="timeline">History</label><input id="timeline" type="range" min="0" max={Math.max(1, maximumTick)} value={viewTick ?? maximumTick} onChange={(event) => void showTick(Number(event.target.value))} /><button className="return-live" onClick={() => void showTick(null)} disabled={viewTick === null}>Return to Live</button><span>Tick {viewTick ?? maximumTick} / {maximumTick}</span></section><section className="layout"><div><VillageCanvas villagers={world.villagers} /><div className="villagers">{world.villagers.map((villager) => <button className="villager" key={villager.id} onClick={() => setSelected(villager)}><span className={`dot ${villager.tradition.toLowerCase()}`} />{villager.name}<small>{villager.activity}</small></button>)}</div><section className="events"><h2>Recent events</h2>{events.filter((event) => event.tick <= world.tick).slice(-6).reverse().map((event) => <p key={event.id}><strong>Tick {event.tick}:</strong> {event.message}</p>)}</section></div><aside><h2>{selected?.name ?? "Select a villager"}</h2>{selected ? <><p className="tradition">{selected.tradition}</p><p>At <strong>{selected.location}</strong>, choosing to <strong>{selected.activity}</strong>.</p><dl><dt>Hunger</dt><dd>{selected.hunger}</dd><dt>Trust</dt><dd>{selected.trust}</dd></dl></> : <p>Click a villager to inspect their current situation.</p>}<div className="reserve">Food reserve <strong>{world.foodReserve}</strong></div></aside></section></main>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
