import { tierKey } from "./config";

/* =========================================================
   What a pass includes (My pass › What's included), as the
   iOS and Android apps show it (iOS MockData.inclusions,
   Android TicketCatalog.inclusions).
   • The server's own list first: /auth/me tickets[].inclusions,
     the pass's list with the meals and events staff switched on
     or off for that pass (CxO Breakfasts, luncheons, the Gala
     Dinner, the Awards Night), in the website's wording.
   • An older server without it: the pass's list below, with the
     per-ticket `cxoBreakfast` (true adds the CxO Breakfasts after
     the conference days, false takes them off).
   Same lists and wording as the apps (and the website's Tickets
   page). The Speaker Pass is internal: never sold or listed.
========================================================= */

export const CXO_BREAKFASTS = "2× CxO Breakfasts";
export const SPEAKER_LOUNGE = "VIP Lounge Access (both days)";

const CONNECT = ["2× Day Conference Access", "Expo Floor Access", "Networking Breaks"];
const INFLUENCE = ["2× Day Conference Access", "2× Luncheons", "Expo Floor Access", "Networking Breaks"];
const POWER = ["2× Day Conference Access", "2× Luncheons", "1× Gala Dinner & Networking Reception", "1× Awards Night", "Expo Floor Access", "Networking Breaks"];

export const PASS_INCLUSIONS = {
  connect: CONNECT,
  influence: INFLUENCE,
  power: POWER,
  apex: [
    "2× Pre-Matched Business Meetings", CXO_BREAKFASTS, "Preferential Seating", "Private Scotch & Cocktail Lounge (19+)",
    ...POWER,
  ],
  // Power's list with both CxO Breakfasts after the conference days, and the VIP Lounge.
  speaker: [POWER[0], CXO_BREAKFASTS, ...POWER.slice(1), SPEAKER_LOUNGE],
};

/** A pass type's own list (older keys follow the passes: "All Access" = Power, "VIP" = Apex). */
export const tierInclusions = (type) => [...(PASS_INCLUSIONS[tierKey(type)] || [])];

/**
 * What this ticket includes: the server's `inclusions` when it sent any, else the pass type's list with
 * the ticket's `cxoBreakfast` (null / missing = the list as it is).
 */
export function passInclusions(ticket) {
  const server = Array.isArray(ticket?.inclusions) ? ticket.inclusions.filter((x) => typeof x === "string" && x.trim()) : [];
  if (server.length) return server;
  const list = tierInclusions(ticket?.type);
  const cxo = ticket?.cxoBreakfast;
  if (typeof cxo !== "boolean") return list;
  const without = list.filter((x) => x !== CXO_BREAKFASTS);
  if (!cxo) return without;
  if (without.length < list.length) return list; // the pass has them already
  const at = without.indexOf("2× Day Conference Access");
  without.splice(at < 0 ? 0 : at + 1, 0, CXO_BREAKFASTS);
  return without;
}
