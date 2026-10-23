import { API, ApiError, api, getToken } from "./api.js";
import { createSseParser } from "./sse.js";

/* =========================================================
   TTFC Check-in: live updates
   ---------------------------------------------------------
   The live stream (GET /api/checkin/desk/stream, Server-Sent Events
   read with fetch so the sign-in stays in a header) with the device's
   cursor: after any gap (venue Wi-Fi, the iPad asleep, the app in the
   background) the server sends everything after it first. While the
   stream is down the device polls GET /events?since=<cursor> every
   2.5 s, and keeps trying the stream (1, 2, 4 … 15 s; at once when the
   device is back online or back in front). The server pings every 5 s:
   a stream silent for 7 s is suspect (a Wi-Fi drop can leave a
   connection hanging without an error), so polling starts alongside it
   at once, and after 12 s the stream is dropped and opened again.
   status: "live" (stream open) | "reconnecting" (stream down; polling)
           | "offline" (no network, or nothing answering)
========================================================= */

const POLL_MS = 2500;
const SUSPECT_MS = 7000;
const WATCHDOG_MS = 12000;
const BACKOFF = [1000, 2000, 4000, 8000, 15000];

export function createLive({ getCursor, onEvents, onCursor, onReset, onServerTime, onStatus, onAuth }) {
  let ctl = null;
  let running = false;
  let streamOpen = false;
  let lastData = 0;
  let attempt = 0;
  let pollTimer = null;
  let retryTimer = null;
  let watchdog = null;
  let pollFails = 0;
  let status = "reconnecting";

  const setStatus = (s) => { if (s !== status) { status = s; onStatus?.(s); } };
  const offlineNow = () => typeof navigator !== "undefined" && navigator.onLine === false;

  async function connect() {
    if (!running) return;
    clearTimeout(retryTimer);
    ctl?.abort();
    ctl = new AbortController();
    const mine = ctl;
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API}/checkin/desk/stream?since=${encodeURIComponent(getCursor() || 0)}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" }, cache: "no-store", signal: mine.signal,
      });
      if (res.status === 401 || res.status === 403) { onAuth?.(res.status); throw new ApiError("signed out", res.status); }
      if (!res.ok || !res.body) throw new ApiError(`stream ${res.status}`, res.status);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      const parser = createSseParser(handleFrame);
      streamOpen = true;
      lastData = Date.now();
      attempt = 0;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        lastData = Date.now();
        parser.feed(dec.decode(value, { stream: true }));
      }
    } catch { /* dropped, aborted or refused: retried below */ }
    if (mine !== ctl) return; // a newer connection took over
    streamOpen = false;
    if (!running) return;
    setStatus(offlineNow() ? "offline" : "reconnecting");
    retryTimer = setTimeout(connect, BACKOFF[Math.min(attempt++, BACKOFF.length - 1)]);
  }

  function handleFrame({ event, data }) {
    if (!data || typeof data !== "object") return;
    if (data.serverTime) onServerTime?.(data.serverTime);
    if (event === "hello" || event === "ping" || event === "cursor" || event === "events") setStatus("live");
    if (event === "events") {
      onEvents?.(data.events || [], { live: !data.catchUp });
      if (Number.isFinite(data.cursor)) onCursor?.(data.cursor);
    } else if (event === "cursor" && Number.isFinite(data.cursor)) onCursor?.(data.cursor);
    else if (event === "reset") onReset?.();
    else if (event === "bye") { ctl?.abort(); streamOpen = false; retryTimer = setTimeout(connect, 200); }
  }

  const streamHealthy = () => streamOpen && Date.now() - lastData < SUSPECT_MS;

  async function poll() {
    if (!running || streamHealthy() || !getToken()) return;
    if (streamOpen) setStatus("reconnecting"); // open but silent: don't trust it
    try {
      const r = await api(`/checkin/desk/events?since=${encodeURIComponent(getCursor() || 0)}`, { timeoutMs: 8000 });
      pollFails = 0;
      if (r.serverTime) onServerTime?.(r.serverTime);
      if (r.reset) { onReset?.(); return; }
      onEvents?.(r.events || [], { live: false });
      if (Number.isFinite(r.cursor)) onCursor?.(r.cursor);
      if (!streamHealthy()) setStatus("reconnecting");
    } catch (err) {
      if (err.status === 401 || err.status === 403) onAuth?.(err.status);
      pollFails += 1;
      if (offlineNow() || pollFails >= 2) setStatus("offline");
    }
  }

  const wake = () => {
    if (!running) return;
    if (!streamOpen) { attempt = 0; connect(); poll(); }
  };
  const onVisible = () => { if (document.visibilityState === "visible") wake(); };
  // The device says it's offline: drop the stream now (it would otherwise hang until the watchdog).
  const onOffline = () => { setStatus("offline"); ctl?.abort(); };

  return {
    start() {
      if (running) return;
      running = true;
      connect();
      pollTimer = setInterval(poll, POLL_MS);
      watchdog = setInterval(() => { if (streamOpen && Date.now() - lastData > WATCHDOG_MS) { ctl?.abort(); } }, 2000);
      window.addEventListener("online", wake);
      window.addEventListener("offline", onOffline);
      document.addEventListener("visibilitychange", onVisible);
    },
    stop() {
      running = false;
      ctl?.abort();
      clearInterval(pollTimer);
      clearInterval(watchdog);
      clearTimeout(retryTimer);
      streamOpen = false;
      window.removeEventListener("online", wake);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
    },
    /** Reconnect now (after signing in again). */
    kick: wake,
    status: () => status,
  };
}
