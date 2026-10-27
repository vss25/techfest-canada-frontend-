/* =========================================================
   "Earn points" cards inside the feed (Oct 22 2026, the organiser:
   "bring 'tell the world you are attending' into the feed … not at
   the top … randomize this and other call to actions for gamified
   networking"). Pure (node --test src/app/lib/feedCtas.test.mjs);
   components/FeedCta.jsx draws them.
     - which cards apply to this person (each only while not done),
     - their order: a shuffle seeded by (user id + Toronto day), so
       it's random but doesn't jump around on every refresh,
     - where they go: never first; after the 3rd post (or at the end
       when there are fewer), then one every 6 posts; each card once.
   Same rules as iOS FeedCallToActions and Android FeedCtas.
   Batch 7 (Oct 22 2026): the leaderboard card joins the rotation
   (swagOpen; since Oct 27 2026 "Top networkers of TTFC 2026",
   appreciation not a prize, while the celebration is still to come).
========================================================= */

export const CTA_KEYS = ["attending", "linkedin", "topics", "availability", "sessions", "reachout", "scan", "poll", "swag"];
export const FIRST_AFTER = 3;
export const EVERY = 6;
export const DISMISS_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Which cards apply now. `st` = {
 *   counted(key) → the rule's counted number from GET points/me (breakdown[].count: profile.linkedin,
 *     profile.topics, linkedin.attending are 1 once done), or null while points aren't loaded,
 *   activity(key) → the raw count (activity{}: session.saved, network.request), or null,
 *   attendingPosted (GET app/attending-link), linkedinUrl, topics: [], availabilitySlots: [] (social/me),
 *   saved: n, requestsSent: n (this device's numbers, used too),
 *   festivalDay: bool (Oct 26–27 in Toronto), liveSession: { id, title } | null (a saved session that's live),
 *   swagOpen: bool (the top networkers are still to be celebrated, src/lib/swag.js networkersView().before),
 *   dismissed: { key: untilMs }, now }
 */
export function eligibleCtas(st) {
  const counted = (key) => (st.counted ? st.counted(key) : null);
  const raw = (key, local = 0) => Math.max(local || 0, (st.activity ? st.activity(key) : 0) || 0);
  const done = (key, fallback) => { const n = counted(key); return (n != null && n >= 1) || fallback; };
  const out = [];
  if (!st.attendingPosted && !done("linkedin.attending", false)) out.push("attending");
  if (!done("profile.linkedin", !!st.linkedinUrl)) out.push("linkedin");
  if (!done("profile.topics", (st.topics || []).length >= 3)) out.push("topics");
  if (!(st.availabilitySlots || []).length) out.push("availability");
  if (raw("session.saved", st.saved) < 3) out.push("sessions");
  if (raw("network.request", st.requestsSent) === 0) out.push("reachout");
  if (st.festivalDay) out.push("scan");
  if (st.festivalDay && st.liveSession) out.push("poll");
  if (st.swagOpen) out.push("swag");
  const now = st.now ?? Date.now();
  return out.filter((k) => !(st.dismissed?.[k] > now));
}

/** A small stable hash (FNV-1a) of a string. */
export function hash(s) {
  let h = 0x811c9dc5;
  for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

/** Fisher–Yates with a seeded generator (mulberry32): the same seed gives the same order. */
export function seededShuffle(list, seed) {
  let a = hash(seed) || 1;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The day in Toronto, "2026-10-22" (the seed changes once a day). */
export function torontoDay(ms) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
}

/** After how many posts each card goes: [3, 9, 15, …] while there are posts for them; at the end when there are 1–2
    posts; none in an empty feed (a card is never the first thing). */
export function ctaSlots(postCount, ctaCount) {
  if (!ctaCount || !postCount) return [];
  if (postCount < FIRST_AFTER) return [postCount];
  const slots = [];
  for (let after = FIRST_AFTER; after <= postCount && slots.length < ctaCount; after += EVERY) slots.push(after);
  return slots;
}

/** Posts with the cards placed: [{ type: "post", post } | { type: "cta", key }]. Never a card first. */
export function feedWithCtas(posts, ctaKeys) {
  const slots = ctaSlots(posts.length, ctaKeys.length);
  const out = [];
  let k = 0;
  posts.forEach((post, i) => {
    out.push({ type: "post", post });
    if (slots[k] === i + 1) out.push({ type: "cta", key: ctaKeys[k++] });
  });
  return out;
}
