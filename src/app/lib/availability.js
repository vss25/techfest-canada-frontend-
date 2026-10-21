/* =========================================================
   Free to meet (the same rules as the iOS and Android apps):
   two-hour blocks "d1-08" … "d2-18" (day 1 = Mon Oct 26, the
   day runs 8 AM–8 PM), a place per block (availabilitySpots)
   and meetingSpot as the default place. The one-line summary
   merges touching blocks by time ("12–8 PM"; all six = "All
   day"); the detail rows also split where the place changes
   ("12–4 PM · Harbour Ballroom foyer", "4–8 PM · Expo floor").
   Pure: no imports.
   Tests: node --test src/app/lib/availability.test.mjs
========================================================= */

export const AVAIL_DAYS = [
  { n: 1, label: "Mon, Oct 26", short: "Oct 26" },
  { n: 2, label: "Tue, Oct 27", short: "Oct 27" },
];
export const AVAIL_HOURS = [8, 10, 12, 14, 16, 18];
/** Chips in the place picker (free text is fine too). */
export const SUGGESTED_PLACES = ["Harbour Ballroom foyer", "Pier 4 & 5 foyer", "Expo floor", "Registration desk", "Coffee bar", "Hotel lobby"];
export const MAX_PLACE = 60;
const MAX_SPOTS = 12;
const BLOCK = /^d[12]-(08|10|12|14|16|18)$/;

export const blockId = (day, hour) => `d${day}-${String(hour).padStart(2, "0")}`;
export const isBlockId = (id) => BLOCK.test(String(id));
/** Every block of a day, in order. */
export const dayBlocks = (day) => AVAIL_HOURS.map((h) => blockId(day, h));
const ORDER = AVAIL_DAYS.flatMap((d) => dayBlocks(d.n));

const hour12 = (h) => h % 12 || 12;
const meridiem = (h) => (h < 12 || h >= 24 ? "AM" : "PM");

/** 12, 20 → "12–8 PM"; 8, 14 → "8 AM–2 PM"; 10, 12 → "10 AM–12 PM" (the meridiem once when both ends share it). */
export function rangeLabel(start, end) {
  const a = meridiem(start), b = meridiem(end);
  return a === b ? `${hour12(start)}–${hour12(end)} ${b}` : `${hour12(start)} ${a}–${hour12(end)} ${b}`;
}

/** "d1-12" → "12–2 PM" */
export const blockLabel = (id) => {
  const h = Number(String(id).slice(3));
  return rangeLabel(h, h + 2);
};

/** Where you'll be for a block: its own place, else the default (meetingSpot), else "". */
export function placeOf(id, spots, meetingSpot) {
  const own = spots && typeof spots[id] === "string" ? spots[id].trim() : "";
  return own || String(meetingSpot || "").trim();
}

/** One day's picked blocks as ranges: [{ start, end, ids, place, label, allDay }]. Touching blocks merge when their
    place is the same; `byTime` merges them whatever the place (place is then the first block's). */
export function dayRanges(day, slots = [], spots = {}, meetingSpot = "", { byTime = false } = {}) {
  const picked = new Set(slots || []);
  const out = [];
  for (const h of AVAIL_HOURS) {
    const id = blockId(day, h);
    if (!picked.has(id)) continue;
    const place = byTime ? "" : placeOf(id, spots, meetingSpot);
    const last = out[out.length - 1];
    if (last && last.end === h && last.place === place) { last.end = h + 2; last.ids.push(id); } else out.push({ start: h, end: h + 2, ids: [id], place });
  }
  const allDay = out.length === 1 && out[0].ids.length === AVAIL_HOURS.length;
  return out.map((r) => ({ ...r, allDay, label: allDay ? "All day" : rangeLabel(r.start, r.end) }));
}

/** People cards and lists: "Oct 26: All day · Oct 27: 12–8 PM": times only, merged whatever the places.
    "" when nothing is picked. (spots / meetingSpot don't change it; kept so every caller reads the same.) */
export function availabilitySummary(slots, spots, meetingSpot) {
  return AVAIL_DAYS.map((d) => {
    const ranges = dayRanges(d.n, slots, spots, meetingSpot, { byTime: true });
    return ranges.length ? `${d.short}: ${ranges.map((r) => r.label).join(", ")}` : null;
  }).filter(Boolean).join(" · ");
}

/** Profiles: one row per day with a line per range.
    → [{ day, label: "Mon, Oct 26", lines: [{ label: "12–4 PM", place, text: "12–4 PM · Expo floor" }] }] */
export function availabilityDetail(slots, spots, meetingSpot) {
  return AVAIL_DAYS.map((d) => ({
    day: d.n,
    label: d.label,
    lines: dayRanges(d.n, slots, spots, meetingSpot).map((r) => ({ label: r.label, place: r.place, ids: r.ids, text: r.place ? `${r.label} · ${r.place}` : r.label })),
  })).filter((d) => d.lines.length);
}

/** Known block ids, once each, in day order (what the profile saves). */
export function cleanSlots(slots) {
  const picked = new Set((slots || []).filter(isBlockId));
  return ORDER.filter((id) => picked.has(id));
}

/** availabilitySpots as the server keeps them: known keys of picked blocks, trimmed, ≤ 60 characters, no empty
    values, at most 12. */
export function cleanSpots(spots, slots) {
  const picked = new Set(cleanSlots(slots));
  const out = {};
  for (const id of ORDER) {
    if (!picked.has(id) || !spots || typeof spots[id] !== "string") continue;
    const place = spots[id].trim().slice(0, MAX_PLACE).trim();
    if (place) out[id] = place;
    if (Object.keys(out).length >= MAX_SPOTS) break;
  }
  return out;
}

// ---------- Editing (Availability screen) ----------

/** Picks or drops one block. */
export function toggleBlock(slots, id) {
  return slots.includes(id) ? slots.filter((x) => x !== id) : cleanSlots([...slots, id]);
}

export const isAllDay = (slots, day) => dayBlocks(day).every((id) => slots.includes(id));

/** "All day": picks the whole day; when it's all picked already, clears it. */
export function toggleAllDay(slots, day) {
  const ids = dayBlocks(day);
  return isAllDay(slots, day) ? slots.filter((x) => !ids.includes(x)) : cleanSlots([...slots, ...ids]);
}

/** Sets the place for some blocks; "" removes their own place (they follow the default again). */
export function setPlaces(spots, ids, place) {
  const next = { ...(spots || {}) };
  const p = String(place || "").trim().slice(0, MAX_PLACE).trim();
  for (const id of ids) {
    if (p) next[id] = p;
    else delete next[id];
  }
  return next;
}
