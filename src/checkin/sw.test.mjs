/* node --test src/checkin/sw.test.mjs (W6): the desk's service worker, run in a stand-in service worker (caches,
   fetch, events). A version installs whole (its page and every script that page names) or not at all, and the
   working version stays; opening the app serves the active version's own page and never writes a page fetched
   meanwhile over it, so a flaky load after a deploy can't leave a page whose scripts are missing; activate swaps the
   caches. The version (the cache's name) changes with anything a device gets from the worker: the files, the page,
   the worker's own code, the manifest, the icons. Run on src/checkin/sw.js as the build renders it, and on the built
   file in dist/ when there is one. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import vm from "node:vm";
import { DESK_PATH } from "./deskPath.js";
import { deskSwVersion } from "./swVersion.js";

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
    async has(n) { return store.has(n); },
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
  assert.deepEqual(shellOf(dev), ["ttfc-desk-shell-v1"], "the failed try left no partial cache behind");
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

test("failed installs never pile up partial caches; one by the same name that was already there stays", async () => {
  const dev = device();
  dev.net.files.set(SCOPE, page("/assets/desk-v1.js"));
  dev.net.files.set("/assets/desk-v1.js", "/* v1 */");
  const v1 = dev.worker(render([SCOPE, "/assets/desk-v1.js"], "v1"));
  await v1.install();
  await v1.activate();
  // Three deploys in a row on bad Wi-Fi: each new version's script fails, each try is cleaned up.
  for (const v of ["v2", "v3", "v4"]) {
    dev.net.files.set(SCOPE, page(`/assets/desk-${v}.js`));
    dev.net.down.add(`/assets/desk-${v}.js`);
    await assert.rejects(dev.worker(render([SCOPE, `/assets/desk-${v}.js`], v)).install(), /didn't download/);
  }
  assert.deepEqual(shellOf(dev), ["ttfc-desk-shell-v1"]);
  assert.equal(dev.store.get("ttfc-desk-shell-v1").size, 2, "the working version's cache is whole");
  // A cache by the same name that was there before the try (another worker's) is never this install's to remove.
  dev.store.set("ttfc-desk-shell-v5", new Map([["/marker", { body: "x", status: 200, type: "text/plain" }]]));
  dev.net.files.set(SCOPE, page("/assets/desk-v5.js"));
  dev.net.down.add("/assets/desk-v5.js");
  await assert.rejects(dev.worker(render([SCOPE, "/assets/desk-v5.js"], "v5")).install(), /didn't download/);
  assert.ok(dev.store.get("ttfc-desk-shell-v5")?.has("/marker"), "kept");
  dev.net.offline = true;
  assert.match(await v1.open(SCOPE), /desk-v1\.js/);
});

test("before any version is installed, opening offline says so (with Try again)", async () => {
  const dev = device();
  dev.net.offline = true;
  const w = dev.worker(render([SCOPE], "v1"));
  assert.match(await w.open(SCOPE), /No connection[\s\S]*Try again/);
});

test("the version changes with the page alone, the worker's code alone, the manifest or an icon (never the same cache twice)", () => {
  const base = { files: [SCOPE, "/assets/desk-a1.js"], page: page("/assets/desk-a1.js"), template: "/* sw */", manifest: "{}", icons: [new Uint8Array([1, 2, 3])] };
  const v = deskSwVersion(base);
  assert.match(v, /^[0-9a-f]{12}$/);
  assert.equal(deskSwVersion({ ...base, icons: [new Uint8Array([1, 2, 3])] }), v, "the same build: the same version");
  const changed = {
    "the page only (desk/index.html)": { page: `${base.page}<meta name="x">` },
    "the worker's code only (src/checkin/sw.js)": { template: "/* sw, fixed */" },
    "the files": { files: [SCOPE, "/assets/desk-b2.js"] },
    "the manifest": { manifest: '{"name":"x"}' },
    "an icon (same name, new picture)": { icons: [new Uint8Array([1, 2, 4])] },
  };
  for (const [what, patch] of Object.entries(changed)) assert.notEqual(deskSwVersion({ ...base, ...patch }), v, what);
});

test("a change to the page alone installs beside the running version and swaps on activate (installed devices get it)", async () => {
  const dev = device();
  const list = [SCOPE, "/assets/desk-v1.js"];
  dev.net.files.set("/assets/desk-v1.js", "/* v1 */");
  const p1 = page("/assets/desk-v1.js");
  dev.net.files.set(SCOPE, p1);
  const v1 = deskSwVersion({ files: list, page: p1 });
  const w1 = dev.worker(render(list, v1));
  await w1.install();
  await w1.activate();
  // Only the page changes (same scripts): a new version, so a new worker and its own cache.
  const p2 = `${p1}<!-- new page text -->`;
  dev.net.files.set(SCOPE, p2);
  const v2 = deskSwVersion({ files: list, page: p2 });
  assert.notEqual(v2, v1);
  const w2 = dev.worker(render(list, v2));
  await w2.install();
  assert.deepEqual(shellOf(dev).sort(), [`ttfc-desk-shell-${v1}`, `ttfc-desk-shell-${v2}`].sort(), "installed beside it");
  assert.equal(await w1.open(SCOPE), p1, "the running version is untouched while the new one installs");
  await w2.activate();
  assert.deepEqual(shellOf(dev), [`ttfc-desk-shell-${v2}`]);
  dev.net.offline = true;
  assert.equal(await w2.open(SCOPE), p2, "the new page");
});

const BUILT = new URL(`dist${SCOPE}sw.js`, ROOT);
test("the built worker's version covers its page, its own code, the manifest and the icons", { skip: !existsSync(BUILT) && "no dist/ (run vite build first)" }, () => {
  const code = readFileSync(BUILT, "utf8");
  const list = JSON.parse(code.match(/const PRECACHE = (\[[^\]]*\]);/)[1]);
  const version = JSON.parse(code.match(/const VERSION = ("[^"]*");/)[1]);
  const icons = ["icon-192.png", "icon-512.png", "maskable-512.png", "apple-touch-icon.png", "icon-96.png", "favicon-64.png"].map((n) => readFileSync(new URL(`dist${SCOPE}icons/${n}`, ROOT)));
  const expected = deskSwVersion({
    files: list,
    page: readFileSync(new URL(`dist${SCOPE}index.html`, ROOT), "utf8"),
    template: readFileSync(new URL("src/checkin/sw.js", ROOT), "utf8"),
    manifest: readFileSync(new URL(`dist${SCOPE}manifest.webmanifest`, ROOT), "utf8"),
    icons,
  });
  assert.equal(version, expected);
});


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
