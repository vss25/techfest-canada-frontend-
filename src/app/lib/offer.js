import { createStore, session, useStore } from "./store";
import { get, post } from "./api";
import { content, flag, optionalText } from "./content";
import { LINKS } from "./config";
import { useEffect } from "react";
import { auth } from "./auth";
import { useNow } from "./ui";

/* =========================================================
   The guest ticket offer (app content, set by staff):
     flag.guestOffer      on/off                 (true)
     offer.guest_code     the promo code         ("APP50")
     offer.guest_discount percent off            (50)
     offer.guest_ends     ISO deadline           ("2026-10-21T23:59:00-04:00")
     offer.guest_passes   which passes           ("Connect, Influence and Power")
   Shown to guests only, while it's on, before the deadline,
   once the server confirms the code is live, and only for the
   passes still on sale (both checked once per session). The
   deadline is real: nothing else is implied.
========================================================= */

const DEFAULTS = {
  code: "APP50",
  discount: 50,
  ends: "2026-10-21T23:59:00-04:00",
  passes: "Connect, Influence and Power",
};
const TZ = "America/Toronto";

export function offerConfig(ct) {
  const code = (optionalText(ct, "offer.guest_code") || DEFAULTS.code).toUpperCase();
  const pct = Number(ct?.values?.["offer.guest_discount"]);
  const ends = new Date(optionalText(ct, "offer.guest_ends") || DEFAULTS.ends);
  return {
    on: flag(ct, "flag.guestOffer", true),
    code,
    discount: Number.isFinite(pct) && pct > 0 && pct < 100 ? Math.round(pct) : DEFAULTS.discount,
    ends: Number.isNaN(ends.getTime()) ? new Date(DEFAULTS.ends) : ends,
    passes: optionalText(ct, "offer.guest_passes") || DEFAULTS.passes,
  };
}

export const offerUrl = (code) => `${LINKS.tickets}?promo=${encodeURIComponent(code)}`;

/** "live" once POST /promos/validate says the code works; "off" otherwise. passes: the ones still on sale. */
export const offer = createStore({ status: "unknown", code: "", passes: "" });

const TIERS = ["connect", "influence", "power", "apex"];
const NAME = { connect: "Connect", influence: "Influence", power: "Power", apex: "Apex" };
/** "Connect, Influence and Power" → ["connect", "influence", "power"]. */
const parsePasses = (txt) => TIERS.filter((t) => new RegExp(`\\b${t}\\b`, "i").test(txt));
const listOf = (names) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`);

/** The offer's passes that are still on sale (GET /admin/inventory/public: total − sold > 0); null if unknown. */
async function onSale(tiers) {
  try {
    const inv = await get("admin/inventory/public", { auth: false });
    if (!Array.isArray(inv)) return null;
    return tiers.filter((t) => { const i = inv.find((x) => x.tier === t); return i && Number(i.total) - Number(i.sold) > 0; });
  } catch { return null; }
}

export async function checkOffer(code, passesText) {
  const st = offer.get();
  if (st.code === code && st.status !== "unknown") return st.status;
  const key = `ttfc.offer.${code}`;
  try {
    const cached = JSON.parse(session.get(key) || "null");
    if (cached && (cached.status === "live" || cached.status === "off")) { offer.set({ ...cached, code }); return cached.status; }
  } catch { /* re-check */ }
  offer.set({ status: "checking", code, passes: "" });
  let status = "off", passes = "";
  const covered = parsePasses(passesText);
  const selling = await onSale(covered);
  const tiers = selling || covered; // inventory unreachable: the configured list
  if (tiers.length) {
    try {
      const r = await post("promos/validate", { code, tier: tiers[0] }, { auth: false });
      if (r?.valid) { status = "live"; passes = selling ? listOf(selling.map((t) => NAME[t])) : passesText; }
    } catch { status = "off"; }
  }
  session.set(key, JSON.stringify({ status, passes }));
  offer.set({ status, code, passes });
  return status;
}

const dayKey = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

/** Toronto-time labels for the deadline. */
export function deadlineLabels(ends, now) {
  const weekday = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, weekday: "long" }).format(ends);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(ends);
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(ends);
  return { weekday, time, date, lastDay: dayKey(new Date(now)) === dayKey(ends) };
}

// ---------- Hook for screens ----------


/** { show, cfg, now, left } — show is true only for guests while the offer is real and live. */
export function useGuestOffer() {
  const a = useStore(auth);
  const ct = useStore(content);
  const st = useStore(offer);
  const now = useNow(1000);
  const cfg = offerConfig(ct);
  const left = cfg.ends.getTime() - now;
  const eligible = a.mode === "guest" && cfg.on && left > 0;
  useEffect(() => { if (eligible) checkOffer(cfg.code, cfg.passes); }, [eligible, cfg.code, cfg.passes]);
  const show = eligible && st.status === "live" && st.code === cfg.code && !!st.passes;
  return { show, cfg: show ? { ...cfg, passes: st.passes } : cfg, now, left };
}
