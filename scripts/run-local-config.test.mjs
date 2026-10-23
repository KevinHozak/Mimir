import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { localNpmCli, localObserverConfig } from "./run-local-config.mjs";

test("local defaults pair the API with the exact loopback preview origin", () => {
  assert.deepEqual(localObserverConfig({}), { port: "8888", webPort: "4173", apiUrl: "http://127.0.0.1:8888", previewOrigin: "http://127.0.0.1:4173", observerOrigin: "http://127.0.0.1:4173" });
  const custom = localObserverConfig({ PORT: "8899", WEB_PORT: "4190" });
  assert.equal(custom.apiUrl, "http://127.0.0.1:8899");
  assert.equal(custom.observerOrigin, "http://127.0.0.1:4190");
  assert.equal(localObserverConfig({ WEB_PORT: "80" }).observerOrigin, "http://127.0.0.1");
  assert.equal(localObserverConfig({ WEB_PORT: "04173" }).observerOrigin, "http://127.0.0.1:4173");
  for (const port of ["0", "-1", "1.5", "65536", ""]) assert.throws(() => localObserverConfig({ WEB_PORT: port }), /WEB_PORT/);
});

test("explicit API and origin policies, including an empty deny policy, survive", () => {
  assert.equal(localObserverConfig({ OBSERVER_ORIGIN: "https://observer.example" }).observerOrigin, "https://observer.example");
  assert.equal(localObserverConfig({ OBSERVER_ORIGIN: "" }).observerOrigin, "");
  assert.equal(localObserverConfig({ VITE_API_URL: "https://api.example" }).apiUrl, "https://api.example");
});

test("npm discovery honors the invoking CLI and supports both installation layouts", () => {
  const node = resolve(".tmp", "node-layout", "bin", "node");
  const windows = resolve(node, "..", "node_modules", "npm", "bin", "npm-cli.js");
  const unix = resolve(node, "..", "..", "lib", "node_modules", "npm", "bin", "npm-cli.js");
  const explicit = resolve(".tmp", "custom-npm", "npm-cli.js");
  assert.equal(localNpmCli({ npm_execpath: explicit }, node, path => [explicit, windows, unix].includes(path)), explicit);
  assert.equal(localNpmCli({}, node, path => path === windows), windows);
  assert.equal(localNpmCli({}, node, path => path === unix), unix);
  assert.equal(localNpmCli({ npm_execpath: "missing" }, node, path => path === unix), unix);
  assert.throws(() => localNpmCli({}, node, () => false), /Cannot locate npm/);
});
