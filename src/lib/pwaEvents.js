/* global __TTFC_APP_BUILD__ */
/* =========================================================
   Install / launch analytics for the website prompt and the app.
   POST {API}/app/events (Render, not Vercel), batched, flushed
   with fetch keepalive when the page is hidden.
     body { platform:"web", deviceId, appVersion, events:[{name, at, props, screen?, target?}] }
   • deviceId: random UUID kept in localStorage (the iPhone Home
     Screen app has its own storage, so it gets its own id).
   • Bearer token when signed in, so the device is tied to the person.
   • Honours the website's cookie choice: "Essential only" sends nothing.
   • Dev builds, the app's demo mode and QA overrides never send
     (they log to the console / window.__ttfcEvents instead).
========================================================= */

import { isForcedPlatform, platformProps } from "./pwaPlatform";

const API = import.meta.env.VITE_ADMIN_API_URL || "https://techfest-canada-backend.onrender.com/api";
const ENDPOINT = import.meta.env.VITE_PWA_EVENTS_URL || `${API}/app/events`;
const DEVICE_KEY = "ttfc.deviceId";
const CONSENT_KEY = "tfc_cookie_consent";
const APP_VERSION = ("web-" + (typeof __TTFC_APP_BUILD__ !== "undefined" ? __TTFC_APP_BUILD__ : "dev")).slice(0, 20);

let queue = [];
let timer = null;
let tokenFn = () => "";
let blocked = () => false;

/** The app tells us how to find its token and when not to send (demo mode). */
export function configureEvents({ getToken, isBlocked } = {}) {
  if (getToken) tokenFn = getToken;
  if (isBlocked) blocked = isBlocked;
}

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) { id = uuid(); localStorage.setItem(DEVICE_KEY, id); }
    return id.slice(0, 64);
  } catch {
    if (!window.__ttfcDeviceId) window.__ttfcDeviceId = uuid();
    return window.__ttfcDeviceId;
  }
}

function optedOut() {
  try { return localStorage.getItem(CONSENT_KEY) === "essential"; } catch { return false; }
}

const live = () => !import.meta.env.DEV || !!import.meta.env.VITE_PWA_EVENTS_URL;

/** Queue one event. `props` gets os / browser / displayMode added. */
export function track(name, props = {}, extra = {}) {
  if (typeof window === "undefined" || optedOut()) return;
  const event = { name, at: new Date().toISOString(), props: { ...platformProps(), ...props }, ...extra };
  if (!live() || blocked() || isForcedPlatform()) {
    (window.__ttfcEvents = window.__ttfcEvents || []).push(event);
    if (import.meta.env.DEV) console.info("[ttfc event]", name, event.props);
    return;
  }
  queue.push(event);
  if (queue.length >= 10) flush();
  else if (!timer) timer = setTimeout(flush, 4000);
}

/** Sends what's queued. `keepalive` lets it finish while the page closes. */
export function flush() {
  clearTimeout(timer);
  timer = null;
  if (!queue.length) return;
  const events = queue.splice(0, 50);
  const token = tokenFn();
  try {
    fetch(ENDPOINT, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ platform: "web", deviceId: deviceId(), appVersion: APP_VERSION, events }),
    }).catch(() => { /* analytics never get in the way */ });
  } catch { /* old browsers without keepalive */ }
  if (queue.length) timer = setTimeout(flush, 1000);
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
  window.addEventListener("pagehide", flush);
}
