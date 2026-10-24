/* =========================================================
   TTFC Check-in: the device's own things
   ---------------------------------------------------------
   • The chime. Browsers, iOS especially, only allow sound after a tap,
     so a station starts with "Start the desk"; that tap unlocks it.
     It plays through an <audio> element (a short sound made here, no
     download), which iOS plays even with the Silent switch on, and
     asks for the "playback" audio session where Safari has it; Web
     Audio is the fallback. Chimes queue (one at a time) so several
     arrivals at once are each heard. Every arrival also flashes the
     screen (App.jsx), for when the sound is down.
   • Keep the screen awake (Wake Lock, where the browser has it) on
     every station screen; asked again whenever the app comes back to
     the front and on the next tap or key (some browsers only grant it
     then). Best effort: on an iPad also set Settings › Display &
     Brightness › Auto-Lock › Never.
   • The theme and the last snapshot remembered per device (the station
     is the page's address since Oct 24 2026: lib/routes.js).
   Works the same in a browser tab and installed (Home Screen).
   chimeWav is pure; node --test src/checkin/lib/device.test.mjs
========================================================= */

/* ---------- The chime's sound ---------- */

/**
 * The "ding-dong" (B5 then E6, up) as a WAV file: 16-bit mono PCM. → Uint8Array
 */
export function chimeWav({ rate = 22050 } = {}) {
  const tones = [{ f: 987.77, start: 0, dur: 0.22 }, { f: 1318.51, start: 0.16, dur: 0.42 }];
  const seconds = 0.66;
  const n = Math.round(rate * seconds);
  const pcm = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    let v = 0;
    for (const x of tones) {
      const u = t - x.start;
      if (u < 0 || u > x.dur + 0.05) continue;
      const attack = Math.min(1, u / 0.02);
      const decay = Math.exp(-4.6 * Math.max(0, u - 0.02) / x.dur); // ~1 % at the end
      v += 0.42 * attack * decay * Math.sin(2 * Math.PI * x.f * u);
    }
    pcm[i] = Math.max(-1, Math.min(1, v)) * 0x7fff;
  }
  const bytes = new Uint8Array(44 + n * 2);
  const dv = new DataView(bytes.buffer);
  const text = (o, s) => { for (let i = 0; i < s.length; i++) bytes[o + i] = s.charCodeAt(i); };
  text(0, "RIFF"); dv.setUint32(4, 36 + n * 2, true); text(8, "WAVE");
  text(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, rate, true); dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  text(36, "data"); dv.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) dv.setInt16(44 + i * 2, pcm[i], true);
  return bytes;
}

/* ---------- Playing it ---------- */

let ctx = null;
let el = null;
let elOk = false;
let chimeQueue = 0;
let playing = false;
const audioListeners = new Set();
const notifyAudio = () => audioListeners.forEach((fn) => { try { fn(); } catch { /* a listener's problem */ } });
/** Sound became ready (or not): fn(). */
export const onAudio = (fn) => { audioListeners.add(fn); return () => audioListeners.delete(fn); };

function audioEl() {
  if (el || typeof Audio === "undefined" || typeof Blob === "undefined" || !globalThis.URL?.createObjectURL) return el;
  try {
    el = new Audio(URL.createObjectURL(new Blob([chimeWav()], { type: "audio/wav" })));
    el.preload = "auto";
    el.setAttribute?.("playsinline", "");
  } catch { el = null; }
  return el;
}

function unlockWebAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx ||= new AC();
    if (ctx.state === "suspended") ctx.resume().then(notifyAudio, () => {});
    // A silent blip: iOS unlocks Web Audio on the first sound made inside a tap.
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.02);
  } catch { /* no Web Audio */ }
}

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
/** The chime through Web Audio (the fallback). */
function webChime() {
  if (!ctx || ctx.state !== "running") return false;
  const t = ctx.currentTime + 0.01;
  tone(988, t, 0.22);         // B5
  tone(1319, t + 0.16, 0.42); // E6: "ding-dong", up
  return true;
}

/**
 * Call from a tap: unlocks sound for this visit (and asks for the "playback" audio session, so the Silent switch
 * doesn't mute it). `ring`: chime once now ("you'll hear it once now").
 */
export function unlockAudio({ ring = false } = {}) {
  try { const s = navigator.audioSession; if (s && s.type !== "playback") s.type = "playback"; } catch { /* not Safari */ }
  unlockWebAudio();
  const a = audioEl();
  if (!a) { if (ring) webChime(); notifyAudio(); return; }
  try {
    a.muted = !ring;
    a.currentTime = 0;
    const p = a.play();
    const ok = () => {
      elOk = true;
      if (!ring) { a.pause(); try { a.currentTime = 0; } catch { /* not loaded */ } }
      a.muted = false;
      notifyAudio();
    };
    const fail = () => { a.muted = false; if (ring) webChime(); notifyAudio(); };
    if (p && typeof p.then === "function") p.then(ok, fail); else ok();
  } catch { if (ring) webChime(); notifyAudio(); }
}

/** Can the app make a sound now (unlocked by a tap)? */
export const audioReady = () => elOk || (!!ctx && ctx.state === "running");

function playNext() {
  if (!chimeQueue || !audioReady()) { playing = false; chimeQueue = 0; return; }
  playing = true;
  chimeQueue -= 1;
  if (elOk && el) {
    try {
      el.currentTime = 0;
      const p = el.play();
      p?.catch?.(() => webChime());
    } catch { webChime(); }
  } else webChime();
  setTimeout(playNext, 750);
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
let asking = false;
/** Keep the screen on (every station screen asks). */
export async function keepAwake() {
  wantLock = true;
  if (lock || asking) return !!lock;
  try {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator) || document.visibilityState !== "visible") return false;
    asking = true;
    lock = await navigator.wakeLock.request("screen");
    lock.addEventListener?.("release", () => { lock = null; });
    return true;
  } catch { return false; } finally { asking = false; }
}
/** The screen may sleep again (signed out, no station open). */
export function letSleep() {
  wantLock = false;
  const l = lock;
  lock = null;
  try { l?.release?.()?.catch?.(() => {}); } catch { /* gone */ }
}
export const awake = () => !!lock;
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => { if (wantLock && document.visibilityState === "visible" && !lock) keepAwake(); });
  // Some browsers grant it only after a tap or key: ask again on the next one.
  const again = () => { if (wantLock && !lock) keepAwake(); };
  document.addEventListener("pointerdown", again, { capture: true, passive: true });
  document.addEventListener("keydown", again, { capture: true, passive: true });
}

/* ---------- Remembered on this device ---------- */

const get = (k, d = null) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } };
const set = (k, v) => { try { if (v === null || v === undefined) localStorage.removeItem(k); else localStorage.setItem(k, v); return true; } catch { return false; } };
export const remember = { get, set };

export const THEME_KEY = "ttfc.desk.theme";
export const SNAPSHOT_KEY = "ttfc.desk.snapshot.v1";
/** Set just before reloading for an update the person tapped: the station opens on its Start screen (sound back on). */
export const RESUME_KEY = "ttfc.desk.resume";

/** Dark by default (high contrast at arm's length); "light" or "auto" (the device's) if chosen. */
export function applyTheme(t = get(THEME_KEY, "dark")) {
  const dark = t === "dark" || (t === "auto" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0B0823" : "#F6F4FB");
  return dark ? "dark" : "light";
}

/** The app badge (installed apps that support it) and the tab title: how many are on the way up, and the station
    ("(2) Floor 1 · TTFC Check-in": a laptop's tabs and the browser's history say which is which). */
export function setCount(n, station = "") {
  try { document.title = `${n > 0 ? `(${n}) ` : ""}${station ? `${station} · ` : ""}TTFC Check-in`; } catch { /* no document */ }
  try {
    if (n > 0) navigator.setAppBadge?.(n)?.catch?.(() => {});
    else navigator.clearAppBadge?.()?.catch?.(() => {});
  } catch { /* not supported */ }
}
