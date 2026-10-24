/* node --test src/checkin/sw.test.mjs (W6): the desk's service worker, run in a stand-in service worker (caches,
   fetch, events). A version installs whole (its page and every script that page names) or not at all, and the
   working version stays; opening the app serves the active version's own page and never writes a page fetched
   meanwhile over it, so a flaky load after a deploy can't leave a page whose scripts are missing; activate swaps the
   caches. The version (the cache's name) changes with anything a device gets from the worker: the files, the page,
   the worker's own code, the manifest, the icons. Run on src/checkin/sw.js as the build renders it, and on the built
   file in dist/ when there is one. The worker at the app's earlier address (src/checkin/retiredSw.js) sends every visit
   there to /checkin/ (offline too), takes over at once and removes only the old app's caches. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import vm from "node:vm";
import { DESK_PATH, RETIRED_DESK_PATHS } from "./deskPath.js";
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
  const net = { files: new Map(), down: new Set(), offline: false, fetched: [], gate: new Map() };
  const fetch = async (req) => {
    const path = keyOf(req);
    net.fetched.push(path);
    if (net.gate.has(path)) await net.gate.get(path);
    if (net.offline || net.down.has(path)) throw new TypeError("Failed to fetch");
    const f = net.files.get(path);
    return f ? new Response(f, { status: 200, headers: { "Content-Type": path.endsWith(".js") ? "text/javascript" : "text/html" } }) : new Response("", { status: 404 });
  };
  /**
   * Load one version of the worker. → { install(), activate(), open(path), get(path), registration }. `registration`:
   * its registration as the worker sees it ({ active, waiting, installing }; a test sets waiting / installing).
   */
  function worker(code) {
    const on = {};
    const registration = { active: null, waiting: null, installing: null };
    const calls = { skipWaiting: 0, claim: 0 };
    /** The window tabs this worker controls (a test adds them: { url, navigate }). */
    const tabs = [];
    const self = { addEventListener: (t, fn) => { on[t] = fn; }, registration, skipWaiting: async () => { calls.skipWaiting++; },
      clients: { claim: async () => { calls.claim++; }, matchAll: async (o) => (o && o.type === "window" ? [...tabs] : []) }, location: { origin: ORIGIN } };
    class R extends Request { constructor(u, o) { super(new URL(typeof u === "string" ? u : u.url, ORIGIN), o); } }
    vm.runInContext(code, vm.createContext({ self, caches, fetch, Request: R, Response, URL, setTimeout, clearTimeout, Promise, Error, TypeError, Set, Map, JSON, String, MessageChannel }));
    // The event's own promise (respondWith's answer for a fetch), once everything it waits for (waitUntil) is done.
    const run = async (type, extra = {}) => {
      let answer;
      const waits = [];
      on[type]({ ...extra, waitUntil: (x) => { waits.push(x); }, respondWith: (x) => { answer = x; } });
      if (answer === undefined) return Promise.all(waits).then(() => undefined);
      const res = await answer;
      await Promise.all(waits);
      return res;
    };
    return {
      registration,
      calls,
      tabs,
      /** A navigation to `path`: the response itself (undefined when the worker leaves it to the network). */
      navigate: (path) => run("fetch", { request: { method: "GET", url: ORIGIN + path, mode: "navigate" } }),
      /** Any request (a path on the site, or a full URL): the response, or undefined when the worker leaves it to the network. */
      request: (path, init) => run("fetch", { request: { url: /^https?:/.test(path) ? path : ORIGIN + path, ...init } }),
      /** Another worker (or the page) messaging this one, as on a ServiceWorker object. */
      postMessage: (data, ports = []) => { on.message?.({ data, ports }); },
      install: () => run("install"),
      activate: () => run("activate"),
      open: async (path) => (await run("fetch", { request: { method: "GET", url: ORIGIN + path, mode: "navigate" } })).text(),
      get: async (path) => run("fetch", { request: { method: "GET", url: ORIGIN + path, mode: "cors" } }),
    };
  }
  return { store, net, worker };
}

const page = (...assets) => `<!doctype html><title>Desk</title>${assets.map((a) => (a.endsWith(".css") ? `<link rel="stylesheet" href="${a}">` : `<script type="module" src="${a}"></script>`)).join("")}<div id="ci-root"></div>`;
const shellOf = (dev) => [...dev.store.keys()].filter((n) => n.startsWith("ttfc-checkin-shell-"));

test("a deploy plus a flaky load never leaves the cached page pointing at scripts that aren't cached", async () => {
  const dev = device();
  // v1, installed and running.
  dev.net.files.set(SCOPE, page("/assets/desk-v1.js", "/assets/desk-v1.css"));
  dev.net.files.set("/assets/desk-v1.js", "/* v1 */");
  dev.net.files.set("/assets/desk-v1.css", "/* v1 css */");
  const v1 = dev.worker(render([SCOPE, "/assets/desk-v1.js", "/assets/desk-v1.css"], "v1"));
  await v1.install();
  await v1.activate();
  assert.deepEqual(shellOf(dev), ["ttfc-checkin-shell-v1"]);
  // v2 is deployed: the network now has v2's page; its script won't download (venue Wi-Fi).
  dev.net.files.set(SCOPE, page("/assets/desk-v2.js"));
  dev.net.files.set("/assets/desk-v2.js", "/* v2 */");
  dev.net.down.add("/assets/desk-v2.js");
  // Opening the app (online) under v1: v1's own page, and nothing fetched is written over it.
  assert.match(await v1.open(`${SCOPE}?source=pwa`), /desk-v1\.js/);
  // v2 tries to install: its script fails, so it doesn't; v1 stays whole.
  const v2 = dev.worker(render([SCOPE, "/assets/desk-v2.js"], "v2"));
  await assert.rejects(v2.install(), /didn't download/);
  assert.deepEqual(shellOf(dev), ["ttfc-checkin-shell-v1"], "the failed try left no partial cache behind");
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
  assert.deepEqual(shellOf(dev), ["ttfc-checkin-shell-v2"]);
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
  assert.deepEqual(shellOf(dev), ["ttfc-checkin-shell-v1"]);
  assert.equal(dev.store.get("ttfc-checkin-shell-v1").size, 2, "the working version's cache is whole");
  // A cache by the same name that was there before the try (another worker's) is never this install's to remove.
  dev.store.set("ttfc-checkin-shell-v5", new Map([["/marker", { body: "x", status: 200, type: "text/plain" }]]));
  dev.net.files.set(SCOPE, page("/assets/desk-v5.js"));
  dev.net.down.add("/assets/desk-v5.js");
  await assert.rejects(dev.worker(render([SCOPE, "/assets/desk-v5.js"], "v5")).install(), /didn't download/);
  assert.ok(dev.store.get("ttfc-checkin-shell-v5")?.has("/marker"), "kept");
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
  w1.registration.waiting = w2;
  assert.deepEqual(shellOf(dev).sort(), [`ttfc-checkin-shell-${v1}`, `ttfc-checkin-shell-${v2}`].sort(), "installed beside it");
  assert.equal(await w1.open(SCOPE), p1, "the running version is untouched while the new one installs");
  assert.deepEqual(shellOf(dev).sort(), [`ttfc-checkin-shell-${v1}`, `ttfc-checkin-shell-${v2}`].sort(), "opening the app keeps the waiting version's cache");
  await w2.activate();
  assert.deepEqual(shellOf(dev), [`ttfc-checkin-shell-${v2}`]);
  dev.net.offline = true;
  assert.equal(await w2.open(SCOPE), p2, "the new page");
});

test("an install cut off half way: opening the app removes what it left, never the active or a waiting version's, never while one installs", async () => {
  const dev = device();
  const ok = (v) => { dev.net.files.set(SCOPE, page(`/assets/desk-${v}.js`)); dev.net.files.set(`/assets/desk-${v}.js`, `/* ${v} */`); return dev.worker(render([SCOPE, `/assets/desk-${v}.js`], v)); };
  const v1 = ok("v1");
  await v1.install();
  await v1.activate();
  v1.registration.active = v1;
  // v2's install was cut off (the iPad turned off mid-download): its cleanup never ran, a partial cache stays.
  const partial = (v) => dev.store.set(`ttfc-checkin-shell-${v}`, new Map([[SCOPE, { body: page(`/assets/desk-${v}.js`), status: 200, type: "text/html" }]]));
  partial("v2");
  assert.deepEqual(shellOf(dev).sort(), ["ttfc-checkin-shell-v1", "ttfc-checkin-shell-v2"]);
  dev.net.files.set(SCOPE, page("/assets/desk-v1.js"));
  assert.match(await v1.open(SCOPE), /desk-v1\.js/, "the app opens on its own version");
  assert.deepEqual(shellOf(dev), ["ttfc-checkin-shell-v1"], "the partial cache is gone on the next open, not at the next update");
  assert.equal(dev.store.get("ttfc-checkin-shell-v1").size, 2, "the active version's cache is whole");

  // A version installed whole and waiting (a station is running): its cache stays; another cut-off try's goes.
  const v3 = ok("v3");
  await v3.install();
  v1.registration.waiting = v3;
  partial("v4");
  await v1.open(SCOPE);
  assert.deepEqual(shellOf(dev).sort(), ["ttfc-checkin-shell-v1", "ttfc-checkin-shell-v3"], "the waiting version's cache stays");
  // A waiting version that can't say which it is: nothing goes.
  partial("v5");
  v1.registration.waiting = { postMessage() { throw new Error("gone"); } };
  await v1.open(SCOPE);
  assert.ok(dev.store.has("ttfc-checkin-shell-v5"), "kept while unsure");
  // Another version installing right now: nothing goes (its cache isn't finished).
  v1.registration.waiting = v3;
  v1.registration.installing = {};
  await v1.open(SCOPE);
  assert.ok(dev.store.has("ttfc-checkin-shell-v5"), "kept while one installs");
  v1.registration.installing = null;
  await v1.open(SCOPE);
  assert.deepEqual(shellOf(dev).sort(), ["ttfc-checkin-shell-v1", "ttfc-checkin-shell-v3"]);
  // The waiting version takes over: on activate, everything but its own goes.
  partial("v6");
  v3.registration.active = v3;
  await v3.activate();
  assert.deepEqual(shellOf(dev), ["ttfc-checkin-shell-v3"]);
});

test("an install whose cache is removed while it downloads (a tidy that began first) doesn't install; the next try does", async () => {
  const dev = device();
  dev.net.files.set(SCOPE, page("/assets/desk-v2.js"));
  dev.net.files.set("/assets/desk-v2.js", "/* v2 */");
  let release;
  dev.net.gate.set("/assets/desk-v2.js", new Promise((r) => { release = r; }));
  const w = dev.worker(render([SCOPE, "/assets/desk-v2.js"], "v2"));
  const installing = w.install();
  await new Promise((r) => setTimeout(r, 10));
  await dev.store.delete("ttfc-checkin-shell-v2");
  release();
  await assert.rejects(installing, /removed during the install/);
  dev.net.gate.clear();
  const again = dev.worker(render([SCOPE, "/assets/desk-v2.js"], "v2"));
  await again.install();
  assert.equal(dev.store.get("ttfc-checkin-shell-v2").size, 2, "installed whole");
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

/* ---------- The earlier address (/checkin-<token>/, until Oct 24): its replacement worker ---------- */

const OLD = RETIRED_DESK_PATHS[0];
/** src/checkin/retiredSw.js as vite.config.js ttfcDeskPwa writes it to <earlier address>sw.js. */
const retired = () => readFileSync(new URL("src/checkin/retiredSw.js", ROOT), "utf8").replace("self.__DESK_TARGET__", JSON.stringify(SCOPE));
const cacheWith = (dev, name) => dev.store.set(name, new Map([["/x", { body: "x", status: 200, type: "text/plain" }]]));

test("the earlier address: its new worker takes over at once, moves its open tabs and sends every visit to /checkin/ (offline too), removes only the old app's caches", async () => {
  const dev = device();
  for (const n of ["ttfc-desk-shell-a1b2c3", "ttfc-desk-shell-d4e5f6", "ttfc-checkin-shell-v1", "ttfc-app-shell-9", "ttfc-meta"]) cacheWith(dev, n);
  const w = dev.worker(retired());
  // Two tabs of the old app are open (one from the home-screen icon), one browser can't move tabs, one tab fails.
  const moved = [];
  w.tabs.push({ url: `${ORIGIN}${OLD}?source=pwa`, navigate: async (u) => { moved.push(u); return null; } });
  w.tabs.push({ url: `${ORIGIN}${OLD}`, navigate: async (u) => { moved.push(u); return null; } });
  w.tabs.push({ url: `${ORIGIN}${OLD}` });
  w.tabs.push({ url: `${ORIGIN}${OLD}`, navigate: async () => { throw new TypeError("not allowed"); } });
  await w.install();
  assert.equal(w.calls.skipWaiting, 1, "doesn't wait for the old app's tabs to close");
  await w.activate();
  assert.equal(w.calls.claim, 1, "takes over the old app's open tabs");
  assert.deepEqual(moved, [`${ORIGIN}${SCOPE}?source=pwa`, `${ORIGIN}${SCOPE}`], "its open tabs go to the new address");
  assert.deepEqual([...dev.store.keys()].sort(), ["ttfc-app-shell-9", "ttfc-checkin-shell-v1", "ttfc-meta"], "the old app's caches only");
  // Opening the old address (home-screen icon: ?source=pwa; a bookmark; a reload), online or offline.
  for (const offline of [false, true]) {
    dev.net.offline = offline;
    for (const [from, to] of [[`${OLD}?source=pwa`, `${SCOPE}?source=pwa`], [OLD, SCOPE], [`${OLD}index.html`, SCOPE], [`${OLD}a/b?x=1`, `${SCOPE}?x=1`]]) {
      const res = await w.navigate(from);
      assert.equal(res.status, 302, from);
      assert.equal(res.headers.get("Location"), ORIGIN + to, from);
    }
  }
  assert.deepEqual(dev.net.fetched, [], "the redirect is made on the device: nothing is fetched");
  // Anything else goes to the network as it is (the API on its own host, files, posts).
  assert.equal(await w.request("/assets/desk-v1.js", { method: "GET", mode: "cors" }), undefined);
  assert.equal(await w.request(`${OLD}manifest.webmanifest`, { method: "GET", mode: "cors" }), undefined);
  assert.equal(await w.request(OLD, { method: "POST", mode: "navigate" }), undefined);
  assert.equal(await w.request("https://api.example.com/api/x", { method: "GET", mode: "navigate" }), undefined);
  // The old app asks its waiting worker to take over and for its version before it reloads: answered.
  w.postMessage({ type: "SKIP_WAITING" });
  assert.equal(w.calls.skipWaiting, 2);
  const ch = new MessageChannel();
  const got = new Promise((r) => { ch.port1.onmessage = (e) => { ch.port1.close(); r(e.data); }; });
  w.postMessage({ type: "VERSION" }, [ch.port2]);
  assert.deepEqual(await got, { version: "retired" });
});

test("the old and new apps' caches never touch each other: the new worker keeps the old app's caches, and the old worker's tidy (every ttfc-desk-shell- cache but its own) can't match the new ones", async () => {
  const dev = device();
  cacheWith(dev, "ttfc-desk-shell-a1b2c3");
  dev.net.files.set(SCOPE, page("/assets/desk-v1.js"));
  dev.net.files.set("/assets/desk-v1.js", "/* v1 */");
  const v1 = dev.worker(render([SCOPE, "/assets/desk-v1.js"], "v1"));
  await v1.install();
  await v1.activate();
  await v1.open(SCOPE);
  assert.ok(dev.store.has("ttfc-desk-shell-a1b2c3"), "left to the earlier address's worker");
  const mine = [...dev.store.keys()].filter((n) => n.startsWith("ttfc-checkin-shell-"));
  assert.deepEqual(mine, ["ttfc-checkin-shell-v1"]);
  assert.ok(mine.every((n) => !n.startsWith("ttfc-desk-shell-")));
  // The old app's worker opened once more before its replacement arrives: it removes its own kind only.
  const oldTidy = (names) => names.filter((n) => n.startsWith("ttfc-desk-shell-") && n !== "ttfc-desk-shell-a1b2c3");
  assert.deepEqual(oldTidy([...dev.store.keys()]), []);
  // The new worker answers only its own address's pages.
  assert.match(await v1.open(`${SCOPE}?source=pwa`), /desk-v1\.js/);
});

test("the earlier address: a tab that never answers doesn't hold the new worker's activation up for more than 3 s", async () => {
  const dev = device();
  const w = dev.worker(retired());
  w.tabs.push({ url: `${ORIGIN}${OLD}`, navigate: () => new Promise(() => {}) });
  await w.install();
  const t0 = Date.now();
  await w.activate();
  const ms = Date.now() - t0;
  assert.ok(ms >= 2900 && ms < 4500, `${ms} ms`);
});

const BUILT_RETIRED = new URL(`dist${OLD}sw.js`, ROOT);
test("the built replacement worker (dist/) sends the earlier address to /checkin/", { skip: !existsSync(BUILT_RETIRED) && "no dist/ (run vite build first)" }, async () => {
  const code = readFileSync(BUILT_RETIRED, "utf8");
  assert.equal(code, retired(), "the template with /checkin/ filled in");
  const dev = device();
  cacheWith(dev, "ttfc-desk-shell-a1b2c3");
  const w = dev.worker(code);
  await w.install();
  await w.activate();
  assert.equal(dev.store.size, 0);
  const res = await w.navigate(`${OLD}?source=pwa`);
  assert.equal(res.headers.get("Location"), `${ORIGIN}${SCOPE}?source=pwa`);
});
