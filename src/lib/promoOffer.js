
/* =========================================================
   Promo codes people were given. A ?promo= link only pre-fills the
   code at checkout (remembered for this browser session); the site
   never advertises a discount.
   Also: the admin's promo end-date field (Toronto time).
========================================================= */

const KEY = "ttfc.promo";

export function promoFromUrl() {
  if (typeof window === "undefined") return "";
  const fromUrl = new URLSearchParams(window.location.search).get("promo");
  const clean = (s) => String(s || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40);
  if (fromUrl) {
    try { sessionStorage.setItem(KEY, clean(fromUrl)); } catch { /* private mode */ }
    return clean(fromUrl);
  }
  try { return clean(sessionStorage.getItem(KEY)); } catch { return ""; }
}

export function forgetPromo() {
  try { sessionStorage.removeItem(KEY); } catch { /* private mode */ }
}

/* Toronto wall-clock time ↔ ISO, for the admin's end-date field (an <input type="datetime-local">). */
function torontoOffsetMs(utcMs) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Toronto", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - utcMs;
}

/** "2026-10-21T23:59" (Toronto) → "2026-10-22T03:59:00.000Z"; "" → null. */
export function torontoLocalToIso(local) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(local || ""));
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const first = guess - torontoOffsetMs(guess);
  return new Date(guess - torontoOffsetMs(first)).toISOString();
}

/** ISO → "2026-10-21T23:59" in Toronto; empty → "". */
export function isoToTorontoLocal(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  return new Date(t + torontoOffsetMs(t)).toISOString().slice(0, 16);
}

/** "Wed 21 Oct, 11:59 PM ET" (admin list and hints). */
export function endsLabel(iso) {
  if (!iso) return "";
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Toronto", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  }).formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${parts.weekday} ${parts.day} ${parts.month}, ${parts.hour}:${parts.minute} ${parts.dayPeriod} ET`;
}
