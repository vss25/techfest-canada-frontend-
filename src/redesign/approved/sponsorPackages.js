/* The 2027 partnership packages (Nov 26 2026, from the owner's "Sponsorships and Entitlements TTFC" sheet).
   One package covers the whole season: the National Festival in Toronto and the five City Briefings. The sheet's
   "Value per offering" and "Perceived value" columns are internal and are not here.

   TIERS are compared side by side; each row holds the five tiers' numbers in the same order. A row with `main`
   and `city` differs by where it happens (the City Briefing numbers are season totals across the five briefings);
   a row with `all` is the same either way. 0 = not included; 1 on a yes/no row = included. */

export const TIERS = [
  { id: "presenting", name: "Presenting", price: 34999, available: 1 },
  { id: "platinum", name: "Platinum", price: 24999, available: 2 },
  { id: "gold", name: "Gold", price: 19999, available: 3 },
  { id: "silver", name: "Silver", price: 14999, available: 4 },
  { id: "bronze", name: "Bronze", price: 9999, available: 5 },
];

export const GROUPS = [
  { name: "Booth and presence", rows: [
    { label: "Exhibition booths", key: true, main: [2, 1, 1, 1, 1], city: [5, 5, 3, 1, 1] },
    { label: "Digital screen on the booth wall", yes: true, main: [1, 1, 1, 1, 1], city: [1, 1, 1, 1, 1] },
    { label: "Branded signage", yes: true, note: "National Festival", all: [1, 1, 1, 1, 1] },
    { label: "Product demo", yes: true, all: [1, 1, 0, 0, 0] },
  ] },
  { name: "Speaking and content", rows: [
    { label: "Curated conference sessions", key: true, main: [1, 1, 1, 0, 0], city: [5, 1, 1, 0, 0] },
    { label: "Live podcast recordings", main: [1, 1, 0, 0, 0], city: [5, 2, 0, 0, 0] },
    { label: "Opening ceremony guest of honour", yes: true, all: [1, 1, 0, 0, 0] },
    { label: "Award presenting opportunity", yes: true, all: [1, 0, 0, 0, 0] },
  ] },
  { name: "Passes and meetings", rows: [
    { label: "Delegate passes", key: true, main: [10, 6, 4, 3, 2], city: [25, 15, 10, 5, 5] },
    { label: "VIP lounge access", note: "National Festival", all: [10, 6, 4, 2, 2] },
    { label: "1:1 meetings arranged for you", key: true, main: [6, 4, 2, 2, 1], city: [10, 5, 2, 0, 0] },
  ] },
  { name: "Marketing and media", rows: [
    { label: "Email spotlights to our audience", key: true, all: [10, 5, 2, 1, 1] },
    { label: "Press releases", main: [2, 1, 1, 0, 0], city: [5, 2, 1, 0, 0] },
    { label: "Delegate bag inserts", main: [1, 1, 1, 1, 0], city: [5, 5, 0, 0, 0] },
    { label: "Post-event video on social media", yes: true, main: [1, 1, 1, 1, 0], city: [1, 1, 1, 1, 0] },
    { label: "e-Show Directory placement", yes: true, note: "National Festival", all: [1, 1, 1, 1, 1] },
    { label: "Website showcase (50-word profile)", yes: true, all: [1, 1, 1, 1, 1] },
  ] },
];

/* Single sponsorships: one moment or item each. Pillar and Industry have a price and no entitlements listed yet. */
export const ADDONS = [
  { name: "Gala Dinner Partner", price: 19999, available: 2,
    points: ["1 festival booth and 3 briefing booths", "A conference session at the festival and at a briefing", "3 festival and 5 briefing passes", "2 email spotlights and a press release"] },
  { name: "Luncheon Partner", price: 14999, available: 2,
    points: ["2 festival and 5 briefing passes", "2 arranged 1:1 meetings", "Branded signage and a bag insert at the festival", "Email spotlight and post-event videos"] },
  { name: "CxO Breakfast Partner", price: 9999, available: 2,
    points: ["2 festival and 5 briefing passes", "2 arranged 1:1 meetings", "Bag insert at the festival", "Email spotlight and post-event videos"] },
  { name: "Pillar Partner", price: 10000, available: null, left: "One per pillar",
    points: ["Own one tech pillar: AI, Quantum, Cybersecurity, Robotics or CleanTech"] },
  { name: "Industry Partner", price: 10000, available: null, left: "One per sector",
    points: ["Own one sector: Healthcare, Financial Services, Manufacturing, Energy or Defence"] },
  { name: "Delegate Kit Partner", price: 4999, available: 1,
    points: ["Your brand on the delegate kit", "2 festival and 5 briefing passes", "Bag insert at the festival and a briefing"] },
  { name: "Lanyard or Badge Partner", price: 4999, available: 2,
    points: ["Your brand on every lanyard or badge", "2 festival and 5 briefing passes", "Branded signage at the festival"] },
  { name: "WiFi Partner", price: 2499, available: 1,
    points: ["Your brand on the event WiFi", "1 festival pass"] },
];

export const cad = (n) => "$" + Number(n).toLocaleString("en-CA");

/** One row's five numbers for where it's being read: "main" (the National Festival) or "city" (City Briefings). */
export function rowValues(row, scope) {
  return row.all || (scope === "city" ? row.city : row.main) || [];
}
export const ROW_COUNT = GROUPS.reduce((n, g) => n + g.rows.length, 0);
