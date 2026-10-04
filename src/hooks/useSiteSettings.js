import { useSyncExternalStore } from "react";

/* =========================================================
   Website options edited in the admin panel (Site settings →
   Website options). Read once per page load from the public
   GET /api/app/content (no auth). If that fails, the built-in
   defaults below are used, so the site always works.
========================================================= */

export const PUBLIC_API =
  import.meta.env.VITE_ADMIN_API_URL || "https://techfest-canada-backend.onrender.com/api";

export const SITE_DEFAULTS = {
  "site.announcement": "",
  "site.announcement_link": "",
  "site.ticket_sales_open": true,
  "site.ticket_sales_message": "Ticket sales are paused right now. Please check back soon.",
  "site.nominations_open": true,
  "site.volunteer_open": true,
  "site.show_agenda": true,
  "site.hero_tagline": "",
  "site.contact_email": "info@thetechfestival.com",
  "site.linkedin_url": "",
  "site.instagram_url": "",
  "site.x_url": "",
};

let state = { ...SITE_DEFAULTS, loaded: false };
let started = false;
const listeners = new Set();

const bool = (v, d) => (typeof v === "boolean" ? v : v === "true" ? true : v === "false" ? false : d);
const str = (v, d) => (typeof v === "string" ? v.trim() : d);

function normalize(raw) {
  const out = {};
  for (const [k, d] of Object.entries(SITE_DEFAULTS)) {
    const v = raw?.[k];
    out[k] = typeof d === "boolean" ? bool(v, d) : str(v, d);
  }
  // Empty message/email fall back to the defaults so the UI never shows a blank.
  if (!out["site.ticket_sales_message"]) out["site.ticket_sales_message"] = SITE_DEFAULTS["site.ticket_sales_message"];
  if (!out["site.contact_email"]) out["site.contact_email"] = SITE_DEFAULTS["site.contact_email"];
  return out;
}

function load() {
  if (started || typeof window === "undefined") return;
  started = true;
  fetch(`${PUBLIC_API}/app/content`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((raw) => { state = { ...normalize(raw), loaded: true }; })
    .catch(() => { state = { ...state, loaded: true }; })
    .finally(() => listeners.forEach((fn) => fn()));
}

function subscribe(fn) {
  listeners.add(fn);
  load();
  return () => listeners.delete(fn);
}

const getSnapshot = () => state;

/** Returns the website options: { "site.ticket_sales_open": true, …, loaded }. */
export default function useSiteSettings() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Only allow http(s) links from settings. */
export const safeUrl = (u) => (/^https?:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "");
