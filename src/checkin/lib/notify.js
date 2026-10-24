/* =========================================================
   TTFC Check-in: who hears about an arrival, and the banners
   ---------------------------------------------------------
   When the lobby marks a guest Arrived:
     - the Pass desk, always ("Priya Sharma is on the way up · Power
       Pass · Box S");
     - the AV station too for a speaker ("Dr X arrived · speaks 10:30,
       Harbour Ballroom");
     - the Exhibitor desk too for an exhibitor;
     - the Media desk too for a media guest.
   (The same rule as the backend's services/checkinDesk.js
   notifyStations.) Banners must not be missed: they queue, the newest
   on top, three show at once with "+N more", each stays until someone
   taps Got it or the guest is checked in at that station.
   Pure; node --test src/checkin/lib/notify.test.mjs
========================================================= */

import { badgeOf } from "./passColors.js";
import { boxLetter } from "./search.js";
import { clock12, nextSession, untilText } from "./timers.js";

/** The stations that announce a lobby arrival of this guest. */
export function notifyStations(guest) {
  const m = guest?.marks || {};
  return ["desk", ...(m.speaker ? ["av"] : []), ...(m.exhibitor ? ["exhibitor"] : []), ...(m.media ? ["media"] : [])];
}

/**
 * The banner's words at a station, in parts: { name, lead, facts }. A phone shows them on two lines (the name, then
 * the facts: pass type and box letter at the desk), so the facts are never cut off; wider screens on one.
 */
export function bannerParts(guest, station, { eventDay = null, now = Date.now() } = {}) {
  const b = badgeOf(guest);
  const name = guest.name;
  if (station === "av") {
    const n = nextSession(guest.sessions || [], { eventDay, now });
    return { name, lead: "arrived", facts: [n ? `speaks ${clock12(n.session.start)}, ${n.session.room} (${untilText(n.minutesUntil)})` : "no session today"] };
  }
  if (station === "exhibitor") return { name, lead: "arrived", facts: [guest.company || "Exhibitor", ...(guest.booth ? [`Booth ${String(guest.booth).toUpperCase()}`] : [])] };
  if (station === "media") return { name, lead: "arrived", facts: [b.full, ...(guest.company ? [guest.company] : [])] };
  return { name, lead: "is on the way up", facts: [b.full, `Box ${boxLetter(guest)}`] };
}

/** The banner's words at a station, as one line ("Priya Sharma is on the way up · Power Pass · Box S"). */
export function bannerText(guest, station, opts = {}) {
  const p = bannerParts(guest, station, opts);
  return [`${p.name}${p.lead ? ` ${p.lead}` : ""}`, ...p.facts].join(" · ");
}

export const MAX_VISIBLE = 3;

/**
 * A station's banner queue: add(arrival) (one per guest: a repeat moves it to the top), clear(key) (checked in, Got it),
 * view() → { visible: [...], more: n, all }.
 */
export function createBanners({ max = MAX_VISIBLE } = {}) {
  let list = [];
  return {
    add(a) {
      list = [a, ...list.filter((x) => x.key !== a.key)];
      return list.length;
    },
    clear(key) {
      const n = list.length;
      list = list.filter((x) => x.key !== key);
      return n !== list.length;
    },
    keep(fn) { const n = list.length; list = list.filter(fn); return n !== list.length; },
    view() { return { visible: list.slice(0, max), more: Math.max(0, list.length - max), all: list.slice() }; },
    size: () => list.length,
  };
}
