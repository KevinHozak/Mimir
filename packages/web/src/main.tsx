import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Phaser from "phaser";
import "./styles.css";

type Villager = { id: string; name: string; tradition: string; activity: string; location: string; hunger: number; trust: number };
type State = { tick: number; season: number; foodReserve: number; villagers: Villager[] };
const api = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function VillageCanvas() {
  useEffect(() => {
    const game = new Phaser.Game({ type: Phaser.AUTO, width: 760, height: 360, parent: "village-canvas", backgroundColor: "#d9c7a3", scene: { create() {
      const scene = this as Phaser.Scene;
      scene.add.text(24, 22, "THE FIRST WINTER", { color: "#493b2a", fontSize: "22px" });
      [[120, 150, "Homes"], [330, 150, "Granary"], [540, 150, "Workshop"], [220, 285, "Fields"], [500, 285, "Woodland"]].forEach(([x, y, label]) => {
        scene.add.rectangle(Number(x), Number(y), 150, 72, 0xb18c67).setStrokeStyle(3, 0x6a5138);
        scene.add.text(Number(x) - 45, Number(y) - 8, String(label), { color: "#fff7e8", fontSize: "16px" });
      });
    } } });
    return () => game.destroy(true);
  }, []);
  return <div id="village-canvas" />;
}

function App() {
  const [world, setWorld] = useState<State | null>(null);
  const [selected, setSelected] = useState<Villager | null>(null);
  const load = async () => setWorld((await (await fetch(`${api}/api/world`)).json()).state);
  useEffect(() => { void load(); }, []);
  const tick = async () => { const result = await (await fetch(`${api}/api/tick`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).json(); setWorld(result.state); };
  if (!world) return <main><h1>Philosophy World</h1><p>Connecting to the village…</p></main>;
  return <main><header><div><h1>Philosophy World</h1><p>Season {world.season} · Tick {world.tick} · <span className="live">● LIVE</span></p></div><button onClick={tick}>Advance one tick</button></header><section className="layout"><div><VillageCanvas /><div className="villagers">{world.villagers.map((villager) => <button className="villager" key={villager.id} onClick={() => setSelected(villager)}><span className={`dot ${villager.tradition.toLowerCase()}`} />{villager.name}<small>{villager.activity}</small></button>)}</div></div><aside><h2>{selected?.name ?? "Select a villager"}</h2>{selected ? <><p className="tradition">{selected.tradition}</p><p>At <strong>{selected.location}</strong>, choosing to <strong>{selected.activity}</strong>.</p><dl><dt>Hunger</dt><dd>{selected.hunger}</dd><dt>Trust</dt><dd>{selected.trust}</dd></dl></> : <p>Click a villager to inspect their current situation.</p>}<div className="reserve">Food reserve <strong>{world.foodReserve}</strong></div></aside></section></main>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
