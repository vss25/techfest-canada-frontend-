/* Test helper (not a test, never in the app): just enough of a browser to load lib/desk.js in node. Import it BEFORE
   desk.js (await import(...) after it). fetch is fake: each test sets `net.route(url, opts)`; nothing leaves this
   process. The page's timers don't keep node running; the tests' own waits do (wait()). */

const realSetTimeout = globalThis.setTimeout;
const realSetInterval = globalThis.setInterval;
globalThis.setTimeout = (...a) => { const t = realSetTimeout(...a); t?.unref?.(); return t; };
globalThis.setInterval = (...a) => { const t = realSetInterval(...a); t?.unref?.(); return t; };
/** Wait (keeps node running, unlike the page's own timers). */
export const wait = (ms = 20) => new Promise((r) => realSetTimeout(r, ms));

const store = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); }, key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; }, clear: () => m.clear() };
};
globalThis.localStorage = store();
globalThis.sessionStorage = store();

const on = {};
const docOn = {};
globalThis.window = globalThis;
globalThis.addEventListener = (t, fn) => { (on[t] ||= []).push(fn); };
globalThis.removeEventListener = (t, fn) => { on[t] = (on[t] || []).filter((x) => x !== fn); };
globalThis.document = {
  visibilityState: "visible",
  addEventListener: (t, fn) => { (docOn[t] ||= []).push(fn); },
  removeEventListener: (t, fn) => { docOn[t] = (docOn[t] || []).filter((x) => x !== fn); },
  documentElement: { dataset: {}, style: { setProperty() {} } },
  querySelector: () => null,
  title: "",
};
/* The address bar and the history (lib/routes.js: the station is the address). A test sets the starting address with
   go(path) before importing desk.js; history.pushState / replaceState change it; back() pops (and fires popstate). */
const ORIGIN = "https://www.thetechfestival.com";
const entries = [{ url: new URL("/checkin/", ORIGIN), state: null }];
let at = 0;
const cur = () => entries[at].url;
globalThis.location = {
  get pathname() { return cur().pathname; },
  get search() { return cur().search; },
  get hash() { return cur().hash; },
  get href() { return cur().href; },
  get origin() { return ORIGIN; },
  reload() { globalThis.__reloads = (globalThis.__reloads || 0) + 1; },
};
globalThis.history = {
  get state() { return entries[at].state; },
  get length() { return entries.length; },
  pushState(state, _t, url) { entries.splice(at + 1); entries.push({ url: new URL(url, cur()), state }); at = entries.length - 1; },
  replaceState(state, _t, url) { entries[at] = { url: new URL(url ?? cur().href, cur()), state }; },
};
/** Open the page at `path` (a fresh history). */
export function go(path) { entries.splice(0, entries.length, { url: new URL(path, ORIGIN), state: null }); at = 0; }
/** The browser's back / forward button: the address changes, then popstate. */
export function back() { if (at > 0) { at -= 1; fire("popstate", { state: entries[at].state }); } }
export function forward() { if (at < entries.length - 1) { at += 1; fire("popstate", { state: entries[at].state }); } }
export const historyLength = () => entries.length;

/** Fire a window (or, with doc: true, a document) event. */
export function fire(type, e = {}, { doc = false } = {}) { for (const fn of [...((doc ? docOn : on)[type] || [])]) fn({ type, ...e }); }
Object.defineProperty(globalThis, "navigator", { value: { onLine: true }, configurable: true, writable: true });

/** The fake network: `net.route = (url, opts) => Response | Promise<Response> | null`. */
export const net = { route: () => null, calls: [] };
globalThis.fetch = async (url, opts = {}) => {
  net.calls.push({ url: String(url), opts });
  const out = net.route(String(url), opts);
  if (out) return out;
  throw new TypeError(`no route (fake fetch): ${url}`);
};
export const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
/** A response the test hands over later: → { promise, release(data, status) }. */
export function later() {
  let release;
  const promise = new Promise((res) => { release = (data, status = 200) => res(json(data, status)); });
  return { promise, release: (data, status) => release(data, status) };
}
/** The bearer token a fake request was sent with. */
export const tokenOf = (opts) => String(opts?.headers?.Authorization || "").replace(/^Bearer /, "");

/**
 * A live stream (GET /checkin/desk/stream) the test feeds frame by frame, each written on its own like the server does.
 * → { response(), frame(event, data), close() }: hand response() to the route; frames go to the latest response.
 */
export function liveStream() {
  let ctl = null;
  const enc = new TextEncoder();
  return {
    response() {
      const body = new ReadableStream({ start(c) { ctl = c; } });
      return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
    },
    frame(event, data) { ctl?.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)); },
    close() { try { ctl?.close(); } catch { /* closed */ } ctl = null; },
    get open() { return !!ctl; },
  };
}
