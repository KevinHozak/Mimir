import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { bundleHash, validateWorldBundle } from "@mimir/world-data";

const source = resolve(process.argv[2] ?? "assets/world/first-winter.tiled.json");
const outputRoot = resolve(process.env.WORLD_BUNDLE_ROOT ?? "assets/world/generated");
const map = JSON.parse(readFileSync(source, "utf8"));
if (map.orientation !== "orthogonal" || map.infinite || map.tilewidth !== 24 || map.tileheight !== 24) throw new Error(`${source}: only finite orthogonal 24px maps are supported`);
const terrainLayer = map.layers.find(layer => layer.type === "tilelayer" && layer.name === "Terrain");
if (!terrainLayer || terrainLayer.data.length !== map.width * map.height) throw new Error(`${source}: named Terrain layer is missing or incomplete`);
const terrain = Array.from({ length: map.height }, (_, y) => Array.from({ length: map.width }, (_, x) => ({ 1: "grass", 2: "water", 3: "road" }[terrainLayer.data[y * map.width + x]] ?? (() => { throw new Error(`${source}: unsupported terrain GID ${terrainLayer.data[y * map.width + x]}`); })())));
const slots = (prefix, offsets) => offsets.map((offset, index) => ({ id: `${prefix}-${index + 1}`, offset, capacity: 1 }));
const objectDefinitions = {
  house: { id: "house", footprint: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }], slots: slots("rest", [{ x: 0, y: 2 }, { x: 1, y: 2 }]), capabilities: ["rest"], capacity: 2, visualAsset: "provisional/house", groundContact: { x: 24, y: 48 }, blocksMovement: true },
  tree: { id: "tree", footprint: [{ x: 0, y: 0 }], slots: [], capabilities: ["gather"], capacity: 0, visualAsset: "provisional/tree", groundContact: { x: 12, y: 24 }, blocksMovement: true, foreground: true },
  granary: { id: "granary", footprint: [{ x: 0, y: 0 }, { x: 1, y: 0 }], slots: slots("food", [{ x: 0, y: 1 }, { x: 1, y: 1 }]), capabilities: ["collect", "share"], capacity: 2, visualAsset: "provisional/granary", groundContact: { x: 24, y: 24 }, blocksMovement: true },
  bridge: { id: "bridge", footprint: [], slots: [], capabilities: [], capacity: 0, visualAsset: "provisional/bridge", groundContact: { x: 36, y: 24 }, blocksMovement: false }
};
const objectLayer = map.layers.find(layer => layer.type === "objectgroup" && layer.name === "Objects");
if (!objectLayer) throw new Error(`${source}: named Objects layer is missing`);
const objects = objectLayer.objects.map(object => { const definitionId = String(object.class ?? object.type ?? ""); if (!(definitionId in objectDefinitions)) throw new Error(`${source}: object ${object.id} has unsupported class ${definitionId}`); if (object.x % 24 || object.y % 24) throw new Error(`${source}: object ${object.id} is not grid aligned`); return { id: `tiled-${object.id}`, definitionId, origin: { x: object.x / 24, y: object.y / 24 }, orientation: 0 }; });
const bridge = objects.find(object => object.definitionId === "bridge");
const surfaces = bridge ? [{ id: `${bridge.id}-surface`, cells: [{ x: bridge.origin.x, y: bridge.origin.y }, { x: bridge.origin.x + 1, y: bridge.origin.y }, { x: bridge.origin.x + 2, y: bridge.origin.y }], movementCost: 1, enabled: true, visualAsset: "provisional/bridge" }] : [];
const world = { schemaVersion: 2, spatialModel: "structured-v2", simulationVersion: "mimir-sim-v2", id: "first-winter-v2", width: map.width, height: map.height, cellSizePx: 24, terrain, terrainDefinitions: { grass: { id: "grass", walkable: true, movementCost: 2, visualAsset: "provisional/grass" }, road: { id: "road", walkable: true, movementCost: 1, visualAsset: "provisional/road" }, water: { id: "water", walkable: false, visualAsset: "provisional/water" } }, surfaces, objectDefinitions, objects: [...objects, { id: "tiled-tree-5", definitionId: "tree", origin: { x: 0, y: 6 }, orientation: 0 }], layers: [{ id: "terrain", role: "ground", order: 0 }, { id: "surfaces", role: "surface", order: 1 }, { id: "objects", role: "objects", order: 2 }, { id: "foreground", role: "foreground", order: 3 }, { id: "spawns", role: "spawns", order: 4 }], spawns: [{ id: "home-spawn", cell: { x: 0, y: 0 }, settlementId: "first-village", entrance: true }, { id: "granary-spawn", cell: { x: 7, y: 7 }, settlementId: "first-village" }], assets: [], bundle: { bundleId: "first-winter-v2", contentHash: "", schemaVersion: 2, assetVersion: "provisional-v1" } };
world.bundle.contentHash = bundleHash(world); validateWorldBundle(world);
const destination = join(outputRoot, world.bundle.contentHash); mkdirSync(destination, { recursive: true }); const bundlePath = join(destination, "world.json"); const bytes = JSON.stringify(world, null, 2) + "\n"; if (existsSync(bundlePath) && readFileSync(bundlePath, "utf8") !== bytes) throw new Error(`immutable bundle collision at ${bundlePath}`); writeFileSync(bundlePath, bytes); writeFileSync(join(destination, "manifest.json"), JSON.stringify({ bundle: world.bundle, source, generatedAt: "source-independent" }, null, 2) + "\n"); console.log(JSON.stringify({ source, bundle: world.bundle, path: bundlePath }, null, 2));
