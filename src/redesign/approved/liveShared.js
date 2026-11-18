import { PUBLIC_API } from "../../hooks/useSiteSettings";
import { parseEventPath } from "../../lib/events";

/* Shared by the live desktop (LiveSite.jsx) and phone (LivePhone.jsx) versions of the
   approved design: addresses for each screen, reading a form's fields, backend calls. */

export const API = String(PUBLIC_API).replace(/\/+$/, "");

export const CITY_EVENT = {
  van: { city: "vancouver", year: 2027, type: "briefing" },
  mtl: { city: "montreal", year: 2027, type: "briefing" },
  cgy: { city: "calgary", year: 2027, type: "briefing" },
  tob: { city: "toronto", year: 2027, type: "briefing" },
  ott: { city: "ottawa", year: 2027, type: "briefing" },
  tor: { city: "toronto", year: 2027, type: "main-event" },
};
export const cityPath = (id) => { const c = CITY_EVENT[id] || CITY_EVENT.van; return `/${c.city}/${c.year}/${c.type}`; };
export const cityOfPath = (p) => Object.keys(CITY_EVENT).find((id) => {
  const c = CITY_EVENT[id];
  return p && p.city === c.city && p.year === c.year && p.type === c.type;
}) || null;

export const PAGE_PATH = {
  exhibitors: "/exhibitors", venue: "/venue", faqs: "/faqs", exhibit: "/exhibit", partner: "/sponsor", speak: "/speak",
  media: "/media", volunteer: "/volunteer", about: "/about", news: "/news", contact: "/contact", app: "/app",
};
export const SCREEN_PATH = { home: "/", speakers: "/speakers", partners: "/partners", awards: "/awards", past: "/highlights/2026" };
// Which backend form each page's form goes to (POST /api/forms/:form).
export const PAGE_FORM = { exhibit: "exhibit", partner: "sponsor", speak: "speaker", volunteer: "volunteer", media: "inquiry", contact: "inquiry" };

/** The design's screen for an address, or null when the address isn't one of its screens. */
export function routeFor(pathname) {
  const path = String(pathname || "/").replace(/\/+$/, "") || "/";
  const screen = Object.keys(SCREEN_PATH).find((k) => SCREEN_PATH[k] === path);
  if (screen) return { screen, city: screen === "speakers" ? "van" : undefined };
  if (path === "/toronto/2026/main-event") return { screen: "past" };
  const page = Object.keys(PAGE_PATH).find((k) => PAGE_PATH[k] === path);
  if (page) return { screen: "page", page, faq: 0 };
  const ev = parseEventPath(path);
  const city = cityOfPath(ev);
  if (!city) return null;
  if (ev.sub === "speakers") return { screen: "speakers", city };
  return { screen: "event", city, sec: ev.sub === "agenda" ? "agenda" : "", drawer: ev.sub === "tickets" };
}

export const monthYear = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("en-CA", { month: "long", year: "numeric" });
/** "February 3, 2027": an event's exact date once it's fixed (the card and "When" show this, not just the month). */
export const fullDate = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

/* The countdown on an event page (Nov 2026: the board's "90 days 08 hours" was fixed sample text).
   Counts to 9:00 AM local time on the first day, in the event city's time zone. */
const CITY_TZ = { van: "America/Vancouver", cgy: "America/Edmonton" };
function tzOffsetMinutes(tz, t) {
  const o = {};
  new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .formatToParts(new Date(t)).forEach((x) => { o[x.type] = x.value; });
  return (Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour, +o.minute) - t) / 60000;
}
/** { hasCountdown, cdDays, cdHours, cdMins } for a "YYYY-MM-DD" start date; hasCountdown false once it has started. */
export function countdownTo(startDate, cityId, now = Date.now()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(startDate || ""));
  if (!m) return { hasCountdown: false };
  const tz = CITY_TZ[cityId] || "America/Toronto";
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], 9, 0);
  const ms = guess - tzOffsetMinutes(tz, guess) * 60000 - now;
  if (!(ms > 0)) return { hasCountdown: false };
  const mins = Math.floor(ms / 60000);
  const pad = (n) => String(n).padStart(2, "0");
  return { hasCountdown: true, cdDays: String(Math.floor(mins / 1440)), cdHours: pad(Math.floor((mins % 1440) / 60)), cdMins: pad(mins % 60) };
}

export const monthShort = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("en-CA", { month: "short" });

// Read what a visitor typed: every field in the block that holds the clicked button,
// keyed by its label (or placeholder / type).
export function fieldsNear(target) {
  let el = target && target.closest ? target : null;
  while (el && el.parentElement && !(el.querySelectorAll("input, textarea, select").length)) el = el.parentElement;
  const out = {};
  if (!el) return out;
  el.querySelectorAll("input, textarea, select").forEach((f) => {
    if (f.type === "checkbox" || f.type === "radio" || f.type === "hidden") return;
    const label = f.closest("label");
    const text = label ? Array.from(label.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join(" ") : "";
    let key = (text || f.placeholder || f.getAttribute("aria-label") || f.type || "field").trim().toLowerCase();
    if (f.type === "email" || /e-?mail/.test(key)) key = out.email ? key : "email";
    else if (f.tagName === "TEXTAREA") key = out.message ? key : "message";
    if (out[key] === undefined) out[key] = f.value.trim();
  });
  return out;
}
export const pick = (f, ...keys) => { for (const k of Object.keys(f)) if (keys.some((x) => k.includes(x)) && f[k]) return f[k]; return ""; };
export const splitName = (name) => { const p = String(name || "").trim().split(/\s+/); return { firstName: p[0] || "", lastName: p.slice(1).join(" ") }; };

export async function post(path, body) {
  const res = await fetch(`${API}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || "Something went wrong. Please try again.");
  return data;
}

/** The backend form call for any of the design's forms (POST /api/forms/:form). */
export function sendForm(name, f, extra) {
  const page = typeof window !== "undefined" ? window.location.pathname : "";
  return post(`/forms/${name}`, {
    name: f.name || [f["first name"], f["last name"]].filter(Boolean).join(" ") || pick(f, "name"),
    email: f.email, company: pick(f, "company", "organisation", "organization"), jobTitle: pick(f, "title", "role"),
    phone: pick(f, "phone"), message: f.message || "", page, fields: { ...f, ...(extra || {}) }, _hp: "",
  });
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
