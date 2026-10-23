/* =========================================================
   TTFC Check-in: the device's own things
   ---------------------------------------------------------
   • The chime (Web Audio): browsers, iOS especially, only allow sound
     after a tap, so a station starts with "Start the desk"; that tap
     unlocks it. Chimes queue (one at a time, 0.7 s apart) so several
     arrivals at once are each heard.
   • Keep the screen awake (Wake Lock, where the browser has it; asked
     again whenever the app comes back to the front). Best effort: on an
     iPad also set Settings › Display & Brightness › Auto-Lock › Never.
   • The station, theme and last snapshot remembered per device.
   Works the same in a browser tab and installed (Home Screen).
========================================================= */

let ctx = null;
let chimeQueue = 0;
let playing = false;

/** Call from a tap: unlocks sound for this visit. */
export function unlockAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx ||= new AC();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    // A silent blip: iOS unlocks on the first sound made inside a tap.
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.02);
    return true;
  } catch { return false; }
}

export const audioReady = () => !!ctx && ctx.state === "running";

function tone(freq, start, dur, vol = 0.32) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(start);
  o.stop(start + dur + 0.05);
}

function playNext() {
  if (!chimeQueue || !audioReady()) { playing = false; chimeQueue = 0; return; }
  playing = true;
  chimeQueue -= 1;
  const t = ctx.currentTime + 0.01;
  tone(988, t, 0.22);        // B5
  tone(1319, t + 0.16, 0.42); // E6: "ding-dong", up
  setTimeout(playNext, 700);
}

/** One chime per arrival (queued). → false when sound isn't unlocked yet. */
export function chime() {
  if (!audioReady()) {
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    return false;
  }
  chimeQueue = Math.min(chimeQueue + 1, 6);
  if (!playing) playNext();
  return true;
}

/* ---------- Screen awake ---------- */

let lock = null;
let wantLock = false;
export async function keepAwake() {
  wantLock = true;
  try {
    if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return false;
    lock = await navigator.wakeLock.request("screen");
    lock.addEventListener?.("release", () => { lock = null; });
    return true;
  } catch { return false; }
}
export const awake = () => !!lock;
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => { if (wantLock && document.visibilityState === "visible" && !lock) keepAwake(); });
}

/* ---------- Remembered on this device ---------- */

const get = (k, d = null) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } };
const set = (k, v) => { try { if (v === null || v === undefined) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* blocked */ } };
export const remember = { get, set };

export const STATION_KEY = "ttfc.desk.station";
export const THEME_KEY = "ttfc.desk.theme";
export const SNAPSHOT_KEY = "ttfc.desk.snapshot.v1";

/** Dark by default (high contrast at arm's length); "light" or "auto" (the device's) if chosen. */
export function applyTheme(t = get(THEME_KEY, "dark")) {
  const dark = t === "dark" || (t === "auto" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0B0823" : "#F6F4FB");
  return dark ? "dark" : "light";
}

/** The app badge (installed apps that support it) and the tab title: how many are on the way up. */
export function setCount(n) {
  try { document.title = n > 0 ? `(${n}) TTFC Check-in` : "TTFC Check-in"; } catch { /* no document */ }
  try {
    if (n > 0) navigator.setAppBadge?.(n)?.catch?.(() => {});
    else navigator.clearAppBadge?.()?.catch?.(() => {});
  } catch { /* not supported */ }
}
