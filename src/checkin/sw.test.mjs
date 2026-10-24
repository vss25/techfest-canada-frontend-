/* node --test src/checkin/sw.test.mjs (W6): the desk's service worker, run in a stand-in service worker (caches,
   fetch, events). A version installs whole (its page and every script that page names) or not at all, and the
   working version stays; opening the app serves the active version's own page and never writes a page fetched
   meanwhile over it, so a flaky load after a deploy can't leave a page whose scripts are missing; activate swaps the
   caches. Run on src/checkin/sw.js as the build renders it, and on the built file in dist/ when there is one. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import vm from "node:vm";
import { DESK_PATH } from "./deskPath.js";

const ORIGIN = "https://site.test";
const ROOT = new URL("../../", import.meta.url);
const SCOPE = DESK_PATH;

/** src/checkin/sw.js with the placeholders filled in, as vite.config.js ttfcDeskPwa does. */
const render = (files, version) => readFileSync(new URL("src/checkin/sw.js", ROOT), "utf8")
  .replace("self.__DESK_PRECACHE__", JSON.stringify(files))
  .replace("self.__DESK_VERSION__", JSON.stringify(version))
  .replace("self.__DESK_SCOPE__", JSON.stringify(SCOPE));

/** A device: its Cache Storage (shared by every worker version) and a network the test controls. */
function device() {
  const store = new Map();
  const keyOf = (req) => new URL(typeof req === "string" ? req : req.url, ORIGIN).pathname;
  const toRes = (e) => new Response(e.body, { status: e.status, headers: { "Content-Type": e.type } });
  class Cache {
    constructor(m) { this.m = m; }
    async match(req) { const e = this.m.get(keyOf(req)); return e ? toRes(e) : undefined; }
    async put(req, res) { this.m.set(keyOf(req), { body: await res.text(), status: res.status, type: res.headers.get("Content-Type") || "" }); }
  }
  const caches = {
    async open(n) { if (!store.has(n)) store.set(n, new Map()); return new Cache(store.get(n)); },
    async keys() { return [...store.keys()]; },
    async delete(n) { return store.delete(n); },
    async match(req) { for (const m of store.values()) { const e = m.get(keyOf(req)); if (e) return toRes(e); } return undefined; },
  };
  const net = { files: new Map(), down: new Set(), offline: false, fetched: [] };
  const fetch = async (req) => {
    const path = keyOf(req);
    net.fetched.push(path);
    if (net.offline || net.down.has(path)) throw new TypeError("Failed to fetch");
    const f = net.files.get(path);
    return f ? new Response(f, { status: 200, headers: { "Content-Type": path.endsWith(".js") ? "text/javascript" : "text/html" } }) : new Response("", { status: 404 });
  };
  /** Load one version of the worker. → { install(), activate(), open(path), get(path) } */
  function worker(code) {
    const on = {};
    const self = { addEventListener: (t, fn) => { on[t] = fn; }, registration: { active: null }, skipWaiting: async () => {}, clients: { claim: async () => {} }, location: { origin: ORIGIN } };
    class R extends Request { constructor(u, o) { super(new URL(typeof u === "string" ? u : u.url, ORIGIN), o); } }
    vm.runInContext(code, vm.createContext({ self, caches, fetch, Request: R, Response, URL, setTimeout, clearTimeout, Promise, Error, TypeError, Set, Map, JSON, String }));
    const run = async (type, extra = {}) => { let p; on[type]({ ...extra, waitUntil: (x) => { p = x; }, respondWith: (x) => { p = x; } }); return p; };
    return {
      install: () => run("install"),
      activate: () => run("activate"),
      open: async (path) => (await run("fetch", { request: { method: "GET", url: ORIGIN + path, mode: "navigate" } })).text(),
      get: async (path) => run("fetch", { request: { method: "GET", url: ORIGIN + path, mode: "cors" } }),
    };
  }
  return { store, net, worker };
}

const page = (...assets) => `<!doctype html><title>Desk</title>${assets.map((a) => (a.endsWith(".css") ? `<link rel="stylesheet" href="${a}">` : `<script type="module" src="${a}"></script>`)).join("")}<div id="ci-root"></div>`;
const shellOf = (dev) => [...dev.store.keys()].filter((n) => n.startsWith("ttfc-desk-shell-"));

test("a deploy plus a flaky load never leaves the cached page pointing at scripts that aren't cached", async () => {
  const dev = device();
  // v1, installed and running.
  dev.net.files.set(SCOPE, page("/assets/desk-v1.js", "/assets/desk-v1.css"));
  dev.net.files.set("/assets/desk-v1.js", "/* v1 */");
  dev.net.files.set("/assets/desk-v1.css", "/* v1 css */");
  const v1 = dev.worker(render([SCOPE, "/assets/desk-v1.js", "/assets/desk-v1.css"], "v1"));
  await v1.install();
  await v1.activate();
  assert.deepEqual(shellOf(dev), ["ttfc-desk-shell-v1"]);
  // v2 is deployed: the network now has v2's page; its script won't download (venue Wi-Fi).
  dev.net.files.set(SCOPE, page("/assets/desk-v2.js"));
  dev.net.files.set("/assets/desk-v2.js", "/* v2 */");
  dev.net.down.add("/assets/desk-v2.js");
  // Opening the app (online) under v1: v1's own page, and nothing fetched is written over it.
  assert.match(await v1.open(`${SCOPE}?source=pwa`), /desk-v1\.js/);
  // v2 tries to install: its script fails, so it doesn't; v1 stays whole.
  const v2 = dev.worker(render([SCOPE, "/assets/desk-v2.js"], "v2"));
  await assert.rejects(v2.install(), /didn't download/);
  dev.net.offline = true;
  const html = await v1.open(SCOPE);
  assert.match(html, /desk-v1\.js/, "offline: v1's page");
  for (const m of html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)) assert.equal((await v1.get(m[1])).status, 200, `${m[1]} is cached`);
  // Back online, v2 installs whole; activate swaps: v2's page, v2's scripts, v1's cache gone.
  dev.net.offline = false;
  dev.net.down.clear();
  const v2b = dev.worker(render([SCOPE, "/assets/desk-v2.js"], "v2"));
  await v2b.install();
  await v2b.activate();
  assert.deepEqual(shellOf(dev), ["ttfc-desk-shell-v2"]);
  dev.net.offline = true;
  assert.match(await v2b.open(SCOPE), /desk-v2\.js/);
  assert.equal((await v2b.get("/assets/desk-v2.js")).status, 200);
});

test("a page newer than the worker's list (a deploy during the install) gets the scripts it names, or doesn't install", async () => {
  const dev = device();
  dev.net.files.set(SCOPE, page("/assets/desk-v3.js"));
  dev.net.files.set("/assets/desk-v2.js", "/* v2 */");
  dev.net.files.set("/assets/desk-v3.js", "/* v3 */");
  const w = dev.worker(render([SCOPE, "/assets/desk-v2.js"], "v2"));
  await w.install();
  dev.net.offline = true;
  assert.equal((await w.get("/assets/desk-v3.js")).status, 200, "the page's own script was cached with it");
  const dev2 = device();
  dev2.net.files.set(SCOPE, page("/assets/desk-v3.js"));
  dev2.net.files.set("/assets/desk-v2.js", "/* v2 */");
  const w2 = dev2.worker(render([SCOPE, "/assets/desk-v2.js"], "v2"));
  await assert.rejects(w2.install(), /desk-v3\.js didn't download/);
});

test("before any version is installed, opening offline says so (with Try again)", async () => {
  const dev = device();
  dev.net.offline = true;
  const w = dev.worker(render([SCOPE], "v1"));
  assert.match(await w.open(SCOPE), /No connection[\s\S]*Try again/);
});

const BUILT = new URL(`dist${SCOPE}sw.js`, ROOT);
test("the built worker (dist/) installs its whole app, serves its own page, and keeps it when a load fails", { skip: !existsSync(BUILT) && "no dist/ (run vite build first)" }, async () => {
  const dev = device();
  const code = readFileSync(BUILT, "utf8");
  const list = JSON.parse(code.match(/const PRECACHE = (\[[^\]]*\]);/)[1]);
  assert.ok(list.includes(SCOPE) && list.some((f) => /^\/assets\/desk-.*\.js$/.test(f)), "the page and the desk's scripts are precached");
  for (const f of list) {
    const file = new URL(`dist${f === SCOPE ? `${SCOPE}index.html` : f}`, ROOT);
    dev.net.files.set(f, existsSync(file) ? readFileSync(file, "utf8") : "x");
  }
  const w = dev.worker(code);
  await w.install();
  await w.activate();
  // A new deploy's page appears on the network; the app still opens on its own, cached page.
  const cached = await w.open(SCOPE);
  dev.net.files.set(SCOPE, page("/assets/desk-NEW.js"));
  assert.equal(await w.open(SCOPE), cached);
  dev.net.offline = true;
  assert.equal(await w.open(SCOPE), cached);
  for (const m of cached.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)) assert.equal((await w.get(m[1])).status, 200, m[1]);
  // One of its scripts failing to download: that version doesn't install.
  const dev2 = device();
  for (const [k, v] of dev.net.files) dev2.net.files.set(k, v);
  dev2.net.files.set(SCOPE, cached);
  dev2.net.down.add(list.find((f) => /^\/assets\/desk-.*\.js$/.test(f)));
  await assert.rejects(dev2.worker(code).install(), /didn't download/);
});
