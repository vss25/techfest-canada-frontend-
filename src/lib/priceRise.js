/* =========================================================
   The Oct 23 2026 price rise: at 3:00 PM Toronto the four passes
   went up 10% (Connect 749 → 824, Influence 849 → 934, Power
   999 → 1,099, Apex 1,499 → 1,649; booths unchanged). The new
   prices themselves come from the backend's scheduled prices
   (TicketInventory nextPrice / nextPriceAt). The organiser: "Once
   updated, show the previous prices to make people realize they
   missed the deal." From `at` on, the Tickets page shows each
   pass's earlier price crossed out, and a "prices go up" notice
   in the announcement bar turns into RISE_NOTICE.
   Pure: node --test src/lib/priceRise.test.mjs.
========================================================= */

export const PRICE_RISE = Object.freeze({
  at: Date.parse("2026-10-23T19:00:00Z"), // 3:00 PM EDT
  label: "Oct 23",
  was: Object.freeze({ connect: 749, influence: 849, power: 999, apex: 1499 }),
});

export const RISE_NOTICE = "Prices went up on Oct 23. The earlier prices are gone.";

export const riseHappened = (now = Date.now()) => now >= PRICE_RISE.at;

/** The earlier price to show crossed out next to `price`, or null (before the rise, or no rise for this pass). */
export function wasPrice(tier, price, now = Date.now()) {
  const was = PRICE_RISE.was[tier];
  return riseHappened(now) && was && Number(price) > was ? was : null;
}

/** The announcement bar's text: a "prices go up" notice reads as gone up once the rise has happened. */
export function announcementText(text, now = Date.now()) {
  if (!text || !riseHappened(now)) return text;
  return /\bprices?\s+(go|goes|are going)\s+up\b/i.test(text) ? RISE_NOTICE : text;
}
