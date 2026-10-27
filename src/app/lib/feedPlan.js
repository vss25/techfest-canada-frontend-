import { AVAIL_DAYS, dayRanges, rangeLabel } from "./availability.js";

/* =========================================================
   The top of Home's feed and "People to meet" (Oct 26 2026, the
   organiser: "Show the survey in the feed of the app, winners of
   the networking in the feed, and people-to-meet recommendations
   to book time in the feed"). Pure (node --test
   src/app/lib/feedPlan.test.mjs).
     1. The top networkers, pinned first for 24 h after they were
        announced (until hidden on this device).
     2. The survey card while GET /api/app/survey says show (its
        "Not now" hides it for a day).
     3. The posts, with "People to meet" after the 2nd post and
        again after the 12th (at the end of a shorter feed), and
        the "Earn points" cards where lib/feedCtas.js puts them.
   nextFreeSlot(): someone's next "Free to meet" range from now
   (two-hour blocks, lib/availability.js; Toronto is UTC−4 for the
   whole festival), e.g. "Free 2–4 PM · Harbour Ballroom foyer";
   meetMessage(): the chat message "Book time" starts with (they
   read it and send it themselves).
========================================================= */

export const WINNERS_PIN_MS = 24 * 3600 * 1000;
export const SURVEY_SNOOZE_MS = 24 * 3600 * 1000;
export const PEOPLE_AFTER = Object.freeze([2, 12]);
export const PEOPLE_MAX = 8;

/** The winners card is pinned at the top: announced with winners, within 24 h of `announcedAt`, not hidden here. */
export function winnersPinned({ stage, winners, announcedAt, now, hidden = false }) {
  if (hidden || stage !== "announced" || !Array.isArray(winners) || !winners.length) return false;
  return !Number.isFinite(announcedAt) || now < announcedAt + WINNERS_PIN_MS;
}

/** The survey card shows while the server says so and it isn't snoozed ("Not now") on this device. */
export const surveyInFeed = ({ data, snoozedUntil = 0, now }) => !!data?.show && !(Number(snoozedUntil) > now);

/** The cards above the posts, in order: "winners", then "survey". */
export function pinnedCards({ winners = false, survey = false }) {
  return [winners && "winners", survey && "survey"].filter(Boolean);
}

/**
 * The feed's items (lib/feedCtas.js feedWithCtas: [{ type: "post" } | { type: "cta" }]) with "People to meet" after the
 * 2nd and the 12th post; a feed with fewer than 2 posts gets it once at the end. `show` false: unchanged.
 */
export function withPeopleToMeet(items, show, after = PEOPLE_AFTER) {
  if (!show) return items;
  const out = [];
  let posts = 0;
  let placed = 0;
  for (const it of items) {
    out.push(it);
    if (it.type !== "post") continue;
    posts += 1;
    if (after.includes(posts)) { out.push({ type: "people", key: `people-${posts}` }); placed += 1; }
  }
  if (!placed) out.push({ type: "people", key: "people-end" });
  return out;
}

/** The first people recommended (lib/people.js recommend(): not connected, contactable, best first), at most 8. */
export const peopleToMeet = (recs, max = PEOPLE_MAX) => (Array.isArray(recs) ? recs : []).filter((r) => r?.person?.id).slice(0, max);

// ---------- Free to meet ----------

const OFFSET_H = 4; // EDT, all festival long
const DAY_SHORT = { 1: "Mon", 2: "Tue" };
const at = (day, hour) => Date.UTC(2026, 9, 25 + day, hour + OFFSET_H);
const torontoDayOf = (ms) => new Date(ms - OFFSET_H * 3600000).getUTCDate() - 25;
const hourWord = (h) => `${h % 12 || 12} ${h < 12 || h >= 24 ? "AM" : "PM"}`;

/**
 * Their next free range from `now` (ms): the one on now, else the next one; touching blocks at the same place are one
 * range. → { day, start, end, startMs, endMs, place, isNow, when, text } or null (nothing shared, or all past).
 * when: "now until 4 PM" | "2–4 PM" (today) | "Tue 12–2 PM" (another day); text: "Free " + when (+ " · place").
 */
export function nextFreeSlot(person, now) {
  const slots = person?.availabilitySlots;
  if (!Array.isArray(slots) || !slots.length) return null;
  const today = torontoDayOf(now);
  for (const d of AVAIL_DAYS) {
    for (const r of dayRanges(d.n, slots, person.availabilitySpots || {}, person.meetingSpot || "")) {
      const startMs = at(d.n, r.start);
      const endMs = at(d.n, r.end);
      if (endMs <= now) continue;
      const isNow = startMs <= now;
      const when = isNow ? `now until ${hourWord(r.end)}` : d.n === today ? rangeLabel(r.start, r.end) : `${DAY_SHORT[d.n]} ${rangeLabel(r.start, r.end)}`;
      return { day: d.n, start: r.start, end: r.end, startMs, endMs, place: r.place, isNow, when, text: `Free ${when}${r.place ? ` · ${r.place}` : ""}` };
    }
  }
  return null;
}

/** The chat message "Book time" starts with: "Hi Maya, I'd like to meet at TTFC. Are you free 2–4 PM (Expo floor)?" */
export function meetMessage(given, slot) {
  const hi = given ? `Hi ${given}, ` : "Hi, ";
  if (!slot) return `${hi}I'd like to meet at TTFC. When suits you?`;
  const when = slot.isNow ? `before ${hourWord(slot.end)}` : slot.when;
  const today = slot.isNow || /^\d/.test(slot.when) ? " today" : "";
  return `${hi}I'd like to meet at TTFC. Are you free ${when}${today}${slot.place ? ` (${slot.place})` : ""}?`;
}
