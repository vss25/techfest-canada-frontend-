import { useEffect, useState } from "react";
import { API } from "./forms";

/* =========================================================
   Promo links: /tickets?promo=APP50 (the web app's guest offer).
   The code is remembered for this browser session so it survives
   moving between pages, checked against every pass with the public
   POST /api/promos/validate, and dropped once it ends or is refused.
========================================================= */

const KEY = "ttfc.promo";
const PASSES = ["connect", "influence", "power", "apex"];

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

/** { code, discount, expiresAt, tiers: Set } for a live promo link, else null. */
export function usePromoOffer() {
  const [offer, setOffer] = useState(null);
  useEffect(() => {
    const code = promoFromUrl();
    if (!code) return undefined;
    let cancelled = false;
    Promise.all(PASSES.map((tier) =>
      fetch(`${API}/promos/validate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, tier }) })
        .then((r) => r.json().then((d) => ({ tier, ok: r.ok && d.valid, d })))
        .catch(() => ({ tier, ok: false, d: {} })),
    )).then((rows) => {
      if (cancelled) return;
      const live = rows.filter((r) => r.ok);
      if (!live.length) { forgetPromo(); setOffer(null); return; }
      const first = live[0].d;
      setOffer({ code: first.code || code, discount: Number(first.discount) || 0, expiresAt: first.expiresAt || null, tiers: new Set(live.map((r) => r.tier)) });
    });
    return () => { cancelled = true; };
  }, []);
  return offer;
}

/** Ticks every second until `iso`; null when there's no end date. */
export function useCountdown(iso) {
  const end = iso ? new Date(iso).getTime() : NaN;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!Number.isFinite(end)) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [end]);
  if (!Number.isFinite(end)) return null;
  const left = Math.max(0, end - now);
  const s = Math.floor(left / 1000);
  return { left, days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

/** "Wed 21 Oct, 11:59 PM ET" */
export function endsLabel(iso) {
  if (!iso) return "";
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Toronto", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  }).formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${parts.weekday} ${parts.day} ${parts.month}, ${parts.hour}:${parts.minute} ${parts.dayPeriod} ET`;
}

export const discounted = (price, pct) => Math.round(price * (1 - pct / 100) * 100) / 100;

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
