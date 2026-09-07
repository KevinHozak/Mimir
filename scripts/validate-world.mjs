import { readFileSync } from "node:fs";
import { validateWorldBundle } from "@mimir/world-data";
const path = process.argv[2]; if (!path) throw new Error("usage: npm run world:validate -- <world.json>"); const world = JSON.parse(readFileSync(path, "utf8")); validateWorldBundle(world); console.log(`valid ${world.bundle.contentHash}`);
