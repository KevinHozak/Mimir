import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Phaser from "phaser";
import "./styles.css";

type Villager = { id: string; name: string; tradition: string; activity: string; location: string; hunger: number; trust: number };
type State = { tick: number; season: number; foodReserve: number; villagers: Villager[] };
type Event = { id: string; tick: number; message: string; kind: string };
const api = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const locationPoints: Record<string, [number, number]> = {
  Homes: [120, 150], Granary: [330, 150], Workshop: [540, 150], "Meeting Place": [330, 278], Fields: [220, 285], Woodland: [500, 285]
};

function VillageCanvas({ villagers }: { villagers: Villager[] }) {
  useEffect(() => {
    const game = new Phaser.Game({ type: Phaser.AUTO, pixelArt: true, width: 760, height: 360, parent: "village-canvas", backgroundColor: "#d9c7a3", scene: { create() {
      const scene = this as Phaser.Scene;
      scene.add.text(24, 22, "THE FIRST WINTER", { color: "#493b2a", fontSize: "22px", fontFamily: "monospace" });
      for (let x = 0; x < 760; x += 24) scene.add.line(0, 0, x, 0, x, 360, 0xcbb891, 0.35).setOrigin(0);
      for (let y = 0; y < 360; y += 24) scene.add.line(0, 0, 0, y, 760, y, 0xcbb891, 0.35).setOrigin(0);
      [[120, 150, "Homes"], [330, 150, "Granary"], [540, 150, "Workshop"], [330, 278, "Meeting Place"], [220, 285, "Fields"], [500, 285, "Woodland"]].forEach(([x, y, label]) => {
        scene.add.rectangle(Number(x), Number(y), 150, 72, 0xb18c67).setStrokeStyle(3, 0x6a5138);
        scene.add.text(Number(x) - (String(label).length * 4), Number(y) - 8, String(label), { color: "#fff7e8", fontSize: "14px", fontFamily: "monospace" });
      });
      villagers.forEach((villager, index) => {
        const [targetX, targetY] = locationPoints[villager.location] ?? locationPoints.Homes;
        const startX = 70 + (index % 6) * 112;
        const startY = 72 + Math.floor(index / 6) * 34;
        const colors = { Hearthkeepers: 0xc5664a, Freehands: 0x5c8eaa, Seekers: 0x8b6b9d };
        const person = scene.add.container(startX, startY);
        person.add(scene.add.rectangle(0, 0, 12, 12, colors[villager.tradition as keyof typeof colors] ?? 0x76563c).setOrigin(0.5));
        person.add(scene.add.rectangle(0, -9, 10, 4, 0x493b2a).setOrigin(0.5));
        person.add(scene.add.text(-18, 10, villager.name, { color: "#493b2a", fontSize: "10px", fontFamily: "monospace" }));
        scene.tweens.add({ targets: person, x: targetX + ((index % 3) - 1) * 18, y: targetY + ((index % 2) - 0.5) * 18, duration: 900, ease: "Linear" });
      });
    } } });
    return () => game.destroy(true);
  }, [villagers]);
  return <div id="village-canvas" />;
}

function App() {
  const [world, setWorld] = useState<State | null>(null);
  const [liveWorld, setLiveWorld] = useState<State | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [viewTick, setViewTick] = useState<number | null>(null);
  const [selected, setSelected] = useState<Villager | null>(null);
  const loadLive = async () => {
    const [worldResponse, eventsResponse] = await Promise.all([fetch(`${api}/api/world`), fetch(`${api}/api/events?limit=200`)]);
    const nextWorld = (await worldResponse.json()).state as State;
    setLiveWorld(nextWorld);
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
  if (!world) return <main><h1>Philosophy World</h1><p>Connecting to the village…</p></main>;
  const maximumTick = liveWorld?.tick ?? world.tick;
  return <main><header><div><h1>Philosophy World</h1><p>Season {world.season} · Tick {world.tick} · <span className={viewTick === null ? "live" : "history"}>● {viewTick === null ? "LIVE" : "HISTORY"}</span></p></div><button onClick={tick} disabled={viewTick !== null || world.tick >= 60}>Advance one tick</button></header><section className="timeline"><label htmlFor="timeline">History</label><input id="timeline" type="range" min="0" max={Math.max(1, maximumTick)} value={viewTick ?? maximumTick} onChange={(event) => void showTick(Number(event.target.value))} /><button className="return-live" onClick={() => void showTick(null)} disabled={viewTick === null}>Return to Live</button><span>Tick {viewTick ?? maximumTick} / {maximumTick}</span></section><section className="layout"><div><VillageCanvas villagers={world.villagers} /><div className="villagers">{world.villagers.map((villager) => <button className="villager" key={villager.id} onClick={() => setSelected(villager)}><span className={`dot ${villager.tradition.toLowerCase()}`} />{villager.name}<small>{villager.activity}</small></button>)}</div><section className="events"><h2>Recent events</h2>{events.filter((event) => event.tick <= world.tick).slice(-6).reverse().map((event) => <p key={event.id}><strong>Tick {event.tick}:</strong> {event.message}</p>)}</section></div><aside><h2>{selected?.name ?? "Select a villager"}</h2>{selected ? <><p className="tradition">{selected.tradition}</p><p>At <strong>{selected.location}</strong>, choosing to <strong>{selected.activity}</strong>.</p><dl><dt>Hunger</dt><dd>{selected.hunger}</dd><dt>Trust</dt><dd>{selected.trust}</dd></dl></> : <p>Click a villager to inspect their current situation.</p>}<div className="reserve">Food reserve <strong>{world.foodReserve}</strong></div></aside></section></main>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
