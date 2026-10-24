/* =========================================================
   Which pass includes what: the "Compare passes" table on
   /tickets (src/pages/Tickets.jsx), and the "Included with …"
   line under the key times on /programme (src/lib/programme.js),
   so the two always say the same. Only what the Tickets page
   states publicly; the internal Speaker Pass and staff's own
   extras (backend services/passExtras.js) are not listed here.
   Pure (no imports).
========================================================= */

export const PASS_FEATURES = Object.freeze([
  "2x Day Conference Access", "Expo Floor Access", "Networking Breaks", "2x Luncheons", "1x Gala Dinner & Networking Reception",
  "1x Awards Night", "2x CxO Breakfasts", "Preferential Seating", "2x Pre-Matched Business Meetings", "Private Scotch & Cocktail Lounge (19+)",
]);

export const PASS_FEATURE_MAP = Object.freeze({
  //          conf   expo   break  lunch  gala   awards cxo    seating meetings lounge
  connect:   [true,  true,  true,  false, false, false, false, false,  false,   false],
  influence: [true,  true,  true,  true,  false, false, false, false,  false,   false],
  power:     [true,  true,  true,  true,  true,  true,  false, false,  false,   false],
  apex:      [true,  true,  true,  true,  true,  true,  true,  true,   true,    true ],
});

/** The four passes, cheapest first, as the Tickets page names them. */
export const PASS_NAMES = Object.freeze({ connect: "Connect", influence: "Influence", power: "Power", apex: "Apex" });

/** The passes that include `feature` (one of PASS_FEATURES), cheapest first: ["Influence", "Power", "Apex"]. */
export function passesWith(feature) {
  const i = PASS_FEATURES.indexOf(feature);
  if (i < 0) return [];
  return Object.keys(PASS_NAMES).filter((k) => PASS_FEATURE_MAP[k]?.[i]).map((k) => PASS_NAMES[k]);
}
