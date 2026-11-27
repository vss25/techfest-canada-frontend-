import { useEffect, useState } from "react";
import { client } from "../utils/sanity";
import { GRACE_DAYS, citySlugOf, compareEvents, compareEventsDesc, eventSortKey, formatDateRange, lifecycleOf, monthFromStatusNote } from "./eventDates.js";
export { GRACE_DAYS, citySlugOf, compareEvents, compareEventsDesc, eventSortKey, formatDateRange, lifecycleOf, monthFromStatusNote };

/* =========================================================
   Phase 4 (IA build-out): the event layer.
   One place for the city list, the event URLs, the lifecycle
   maths and the Sanity reads every Phase 4 page shares.

   URLs (city before year, no country segment):
     /:city                                  city hub
     /:city/:year/briefing                   a one-day Briefing
     /:city/:year/national-festival          the Toronto Flagship (/main-event redirects to it)
     …/agenda · …/speakers · …/tickets       under the event, always

   Lifecycle (from the event's own dates + a 7-day grace):
     coming-up → live → just-ended → past
   Surfaces obey it with no manual archiving: a Past event's
   pages keep highlights + gallery only and its Tickets button
   becomes "Next edition · Notify me".
========================================================= */

export const CITIES = [
  { slug: "vancouver", name: "Vancouver" },
  { slug: "calgary", name: "Calgary" },
  { slug: "ottawa", name: "Ottawa" },
  { slug: "toronto", name: "Toronto" },
  { slug: "montreal", name: "Montreal" },
];



export const cityBySlug = (slug) => CITIES.find((c) => c.slug === String(slug || "").toLowerCase()) || null;

/* The address word for each kind of event. The record's type stays "main-event"; its page is /national-festival
   (Nov 25 2026, the owner renamed the Main Event to Flagship). /main-event still opens: it redirects. */
export const NATIONAL_SEGMENT = "national-festival";
export const OLD_NATIONAL_SEGMENT = "main-event";

/** The event's public path, e.g. /toronto/2027/national-festival. */
export function eventPath(ev) {
  if (!ev) return "/";
  return `/${citySlugOf(ev.city)}/${ev.year}/${ev.type === "main-event" ? NATIONAL_SEGMENT : "briefing"}`;
}
/** "/toronto/2027/main-event/agenda" → "/toronto/2027/national-festival/agenda"; any other path unchanged. */
export function currentEventPath(pathname) {
  return String(pathname || "").replace(/^(\/[a-z-]+\/\d{4}\/)main-event(?=\/|$)/i, `$1${NATIONAL_SEGMENT}`);
}
export const eventTicketsPath = (ev) => `${eventPath(ev)}/tickets`;
export const eventAgendaPath = (ev) => `${eventPath(ev)}/agenda`;
export const eventSpeakersPath = (ev) => `${eventPath(ev)}/speakers`;

/** Parse /:city/:year/:type (+ optional subpage) out of a pathname. */
export function parseEventPath(pathname) {
  const m = String(pathname || "").match(/^\/([a-z-]+)\/(\d{4})\/(briefing|main-event|national-festival)(?:\/(agenda|speakers|tickets))?\/?$/i);
  if (!m) return null;
  // The record's type is "main-event" under either address word.
  const type = m[3].toLowerCase() === NATIONAL_SEGMENT ? "main-event" : m[3].toLowerCase();
  return { city: m[1].toLowerCase(), year: Number(m[2]), type, sub: m[4] ? m[4].toLowerCase() : null };
}

export function findEvent(events, { city, year, type }) {
  return (events || []).find(
    (e) => citySlugOf(e.city) === city && Number(e.year) === Number(year) && e.type === type
  ) || null;
}

export const LIFECYCLE_LABEL = {
  "coming-up": "Coming up",
  live: "Live now",
  "just-ended": "Just ended",
  past: "Past event",
};

/** Tickets can be sold only while an event is coming up or live. */
export const ticketsOpen = (ev, now = new Date()) => ["coming-up", "live"].includes(lifecycleOf(ev, now));

/* ---------------- Sanity reads (one fetch per page load) ---------------- */

const EVENT_FIELDS = `
  _id, name, "eventKey": eventKey.current, city, type, year, startDate, endDate,
  venueName, venueAddress, heroImage, heroVideoUrl, heroShade, heroMedia, heroFocus, heroHeight, citySkyline, description,
  whyEyebrow, whyHeading, whyBody, whyMedia, whyVideoUrl, whyHeight, whyFit, whyFocusX, whyFocusY, whyLoop,
  "whyImageUrl": whyImage.asset->url, "whyPosterUrl": whyPoster.asset->url,
  statusNote, pricingAnnounced, gallery, "brochureUrl": brochure.asset->url,
  photoCredit, theme, tagline, formatLine, audience, pageMode, knownSoFar, comingNext,
  notifyHeading, showReport,
  standInSpeakersFrom, standInSpeakers, standInSpeakersHeading, standInSpeakersText,
  standInPartnersFrom, standInPartners, standInPartnersHeading, standInPartnersText
`;

/* Which version of the event page shows (redesign step 1). Staff choose on the event in
   Admin › Website content › Event pages: "full", "coming-soon", or "auto" (the default):
   the full page once the event has sessions of its own, else the coming-soon page.
   A past event always gets the full page (its highlights). */
export function eventPageMode(ev, ownSessions = [], now = new Date()) {
  if (!ev) return "coming-soon";
  if (ev.pageMode === "full" || ev.pageMode === "coming-soon") return ev.pageMode;
  if (lifecycleOf(ev, now) === "past") return "full";
  return (ownSessions || []).length ? "full" : "coming-soon";
}

let eventsPromise = null;
export function fetchEvents() {
  if (!eventsPromise) {
    eventsPromise = client
      .fetch(`*[_type == "event"]{ ${EVENT_FIELDS} } | order(startDate asc, year asc)`)
      // Drop empty Studio shells (docs with no name, city or year): they are
      // not events — they must never render, sort, or be picked as next/featured.
      .then((events) => (events || []).filter((e) => e && e.name && e.city && e.year))
      .catch((err) => { eventsPromise = null; throw err; });
  }
  return eventsPromise;
}

/** All events, soonest first. { events, loading, error } */
export function useEvents() {
  const [state, setState] = useState({ events: [], loading: true, error: null });
  useEffect(() => {
    let live = true;
    fetchEvents()
      .then((events) => { if (live) setState({ events: events || [], loading: false, error: null }); })
      .catch((error) => { if (live) setState({ events: [], loading: false, error }); });
    return () => { live = false; };
  }, []);
  return state;
}

/* ---------------- "Next event": ONE definition ----------------
   The header pill's default selection, the gold Tickets button and
   the homepage's featured event (Admin Auto) all mean the same
   thing by "next": the soonest event that is not Past. Dated
   events order by their startDate; dateless events (the 2027
   Briefings — month announced, day not yet) order by the month
   named in their statusNote ("February 2027 · One day") within
   their year. One comparable key — [year, month, day] — orders
   both kinds together: a dated event precedes a dateless one only
   when it is actually earlier. */


/** 1–12 from a statusNote like "February 2027 · One day"; 0 when it names no month. */
/** THE next event: the soonest Coming Up / Live event; null when none is upcoming.
    Keyless docs (empty Studio shells) are excluded outright: a shell with no
    year at all slips past lifecycleOf as "coming-up", and it is never next. */
export function nextEvent(events, now = new Date()) {
  const upcoming = (events || []).filter((e) => eventSortKey(e) && ["coming-up", "live"].includes(lifecycleOf(e, now)));
  upcoming.sort(compareEvents);
  return upcoming[0] || null;
}

/** One city's next event: its soonest upcoming, else its most recent. */
export function nextEventForCity(events, cityNameOrSlug, now = new Date()) {
  const slug = citySlugOf(cityNameOrSlug);
  const mine = (events || []).filter((e) => citySlugOf(e.city) === slug);
  if (!mine.length) return null;
  return nextEvent(mine, now) || mine.slice().sort(compareEventsDesc)[0] || null;
}

/** Admin Auto: the next event; else the most recent past one. The homepage's
    featured event and the header's default both resolve through here, so the
    pill, the Tickets button and "/" can never disagree about what is next. */
export function featuredEvent(events, now = new Date()) {
  const list = events || [];
  const next = nextEvent(list, now);
  if (next) return next;
  const past = list
    .filter((e) => lifecycleOf(e, now) === "past" && eventSortKey(e))
    .sort(compareEventsDesc);
  return past[0] || list[0] || null;
}

/** The pill's label for an event — "Vancouver · Briefing 2027" — one format in
    every context: default, remembered selection, city hub, event page, home. */
export function eventPillLabel(ev) {
  if (!ev) return "";
  if (!ev.city || !ev.year) return ev.name || "";
  return `${ev.city} · ${ev.type === "main-event" ? "Main Event" : "Briefing"} ${ev.year}`;
}

/** Parse /:city (a city hub) out of a pathname; null for anything else,
    including one-segment global pages (/awards, /about, …). */
export function parseCityPath(pathname) {
  const m = String(pathname || "").match(/^\/([a-z-]+)\/?$/i);
  return m ? cityBySlug(m[1]) : null;
}

/* The pill's remembered selection, per tab session: an eventKey chosen from
   the dropdown, or "city:<slug>" for a city. Viewing an event page or a city
   hub refreshes it (see SiteHeader), so the pill keeps naming the city/event
   the user is with as they move across the new pages. */
const PILL_SELECTION_KEY = "ttfc.pillSelection";
export function getPillSelection() {
  try { return window.sessionStorage.getItem(PILL_SELECTION_KEY) || null; } catch { return null; }
}
export function setPillSelection(value) {
  try {
    if (value) window.sessionStorage.setItem(PILL_SELECTION_KEY, value);
    else window.sessionStorage.removeItem(PILL_SELECTION_KEY);
  } catch { /* storage unavailable — the pill just falls back to context/default */ }
}
/** Resolve a stored selection to { event, city } (either may be null). */
export function resolvePillSelection(events, value, now = new Date()) {
  if (!value) return null;
  if (value.startsWith("city:")) {
    const city = cityBySlug(value.slice(5));
    return city ? { event: nextEventForCity(events, city.slug, now), city } : null;
  }
  const ev = (events || []).find((e) => e.eventKey && e.eventKey === value) || null;
  return ev ? { event: ev, city: cityBySlug(citySlugOf(ev.city)) } : null;
}

/* Sessions / speakers / partners scoped to one event. The Phase 1 rule:
   an empty `events` list means "every event" (today's behaviour). */
const SCOPED = `(!defined(events) || count(events) == 0 || $eventId in events[]._ref)`;

export function fetchEventContent(eventId) {
  const sessions = client.fetch(
    `*[_type == "session" && ${SCOPED}]{ _id, title, day, time, endTime, type, format, featured, isBreak, stage, description, speakers, moderator, image, mediaUrl, "eventIds": events[]._ref } | order(day asc, time asc)`,
    { eventId }
  );
  const speakers = client.fetch(
    `*[_type == "speaker" && ${SCOPED}]{ _id, name, title, company, bio, shortBio, fullBio, image, bannerImage, featured, speakerType, linkedin, twitter, website, "eventIds": events[]._ref } | order(coalesce(featured, false) desc, order asc)`,
    { eventId }
  );
  const partners = client.fetch(
    `*[_type == "partner" && active != false && showOnWebsite != false && ${SCOPED}]{ _id, name, category, logo, url, logoScale, matrixGroup, eventRows } | order(order asc)`,
    { eventId }
  );
  return Promise.all([sessions, speakers, partners]).then(([s, sp, p]) => ({
    sessions: s || [], speakers: sp || [], partners: p || [],
  }));
}

export function useEventContent(ev) {
  const [state, setState] = useState({ sessions: [], speakers: [], partners: [], loading: !!ev });
  const id = ev?._id;
  useEffect(() => {
    if (!id) { setState({ sessions: [], speakers: [], partners: [], loading: false }); return undefined; }
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    fetchEventContent(id)
      .then((c) => { if (live) setState({ ...c, loading: false }); })
      .catch(() => { if (live) setState({ sessions: [], speakers: [], partners: [], loading: false }); });
    return () => { live = false; };
  }, [id]);
  return state;
}

/* ---------------- Past-edition fallback ----------------
   The no-empty-pages rule (2026-11-15): an event whose own
   agenda / speakers are not published yet shows the most
   recent completed edition's instead — always the Toronto
   Main Event 2026 — clearly labelled as the previous
   edition (see PastEditionBanner in EventLanding.jsx). The
   fallback source never falls back to itself, and an event
   with any content of its own never borrows. */

export const FALLBACK_EVENT_KEY = "ttfc-2026-main";

/** "2026 Toronto Main Event" — the previous edition's label. */
export function pastEditionLabel(source) {
  if (!source) return "2026 Toronto Main Event";
  const kind = source.type === "main-event" ? "Main Event" : "Briefing";
  return `${source.year} ${source.city} ${kind}`;
}

/** The fallback source event + its sessions/speakers, for an
    event page. `isSource` is true when `ev` IS the fallback
    source — its own page never borrows from itself. Content
    loads only when a source exists and `ev` is not it. */
export function usePastEditionFallback(ev) {
  const { events } = useEvents();
  const source = (events || []).find((e) => e.eventKey === FALLBACK_EVENT_KEY) || null;
  const isSource = !!ev && ev.eventKey === FALLBACK_EVENT_KEY;
  const content = useEventContent(isSource ? null : source);
  return {
    source, isSource,
    sessions: content.sessions, speakers: content.speakers, loading: content.loading,
  };
}

/** Layered FAQs for an event page: event first, then its city, then global. */
export function useEventFaqs(ev) {
  const [faqs, setFaqs] = useState([]);
  const id = ev?._id;
  const city = ev?.city;
  useEffect(() => {
    if (!id) { setFaqs([]); return undefined; }
    let live = true;
    client
      .fetch(`*[_type == "faq"]{ _id, question, answer, scope, city, "eventId": event._ref, order } | order(order asc)`)
      .then((all) => {
        if (!live) return;
        const rows = all || [];
        const mine = rows.filter((f) => f.scope === "event" && f.eventId === id);
        const cityRows = rows.filter((f) => f.scope === "city" && f.city === city);
        const global = rows.filter((f) => f.scope === "global" || !f.scope);
        setFaqs([...mine, ...cityRows, ...global]);
      })
      .catch(() => { if (live) setFaqs([]); });
    return () => { live = false; };
  }, [id, city]);
  return faqs;
}

/** Distinct edition years across all events, newest first. */
export function editionYears(events) {
  return [...new Set((events || []).map((e) => Number(e.year)).filter(Boolean))].sort((a, b) => b - a);
}
