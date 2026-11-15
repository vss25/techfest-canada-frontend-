import { useEffect, useState } from "react";
import { client } from "../utils/sanity";

/* =========================================================
   Phase 4 (IA build-out): the event layer.
   One place for the city list, the event URLs, the lifecycle
   maths and the Sanity reads every Phase 4 page shares.

   URLs (city before year, no country segment):
     /:city                                  city hub
     /:city/:year/briefing                   a one-day Briefing
     /:city/:year/main-event                 the Toronto Main Event
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

export const GRACE_DAYS = 7;

export const cityBySlug = (slug) => CITIES.find((c) => c.slug === String(slug || "").toLowerCase()) || null;
export const citySlugOf = (name) => String(name || "").trim().toLowerCase().replace(/\s+/g, "-");

/** The event's public path, e.g. /toronto/2027/main-event. */
export function eventPath(ev) {
  if (!ev) return "/";
  return `/${citySlugOf(ev.city)}/${ev.year}/${ev.type === "main-event" ? "main-event" : "briefing"}`;
}
export const eventTicketsPath = (ev) => `${eventPath(ev)}/tickets`;
export const eventAgendaPath = (ev) => `${eventPath(ev)}/agenda`;
export const eventSpeakersPath = (ev) => `${eventPath(ev)}/speakers`;

/** Parse /:city/:year/:type (+ optional subpage) out of a pathname. */
export function parseEventPath(pathname) {
  const m = String(pathname || "").match(/^\/([a-z-]+)\/(\d{4})\/(briefing|main-event)(?:\/(agenda|speakers|tickets))?\/?$/i);
  if (!m) return null;
  return { city: m[1].toLowerCase(), year: Number(m[2]), type: m[3].toLowerCase(), sub: m[4] ? m[4].toLowerCase() : null };
}

export function findEvent(events, { city, year, type }) {
  return (events || []).find(
    (e) => citySlugOf(e.city) === city && Number(e.year) === Number(year) && e.type === type
  ) || null;
}

const dayMs = 24 * 60 * 60 * 1000;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

/** coming-up | live | just-ended | past — derived from dates alone. */
export function lifecycleOf(ev, now = new Date()) {
  if (!ev?.startDate) return ev && Number(ev.year) < now.getFullYear() ? "past" : "coming-up";
  const start = startOfDay(ev.startDate);
  const end = startOfDay(ev.endDate || ev.startDate);
  const today = startOfDay(now);
  if (today < start) return "coming-up";
  if (today <= end) return "live";
  if (today <= new Date(end.getTime() + GRACE_DAYS * dayMs)) return "just-ended";
  return "past";
}
export const LIFECYCLE_LABEL = {
  "coming-up": "Coming up",
  live: "Live now",
  "just-ended": "Just ended",
  past: "Past event",
};

/** Tickets can be sold only while an event is coming up or live. */
export const ticketsOpen = (ev, now = new Date()) => ["coming-up", "live"].includes(lifecycleOf(ev, now));

export function formatDateRange(ev) {
  if (!ev?.startDate) return ev?.year ? String(ev.year) : "";
  const fmt = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
  const a = fmt(ev.startDate);
  if (!ev.endDate || ev.endDate === ev.startDate) return a;
  return `${a} – ${fmt(ev.endDate)}`;
}

/* ---------------- Sanity reads (one fetch per page load) ---------------- */

const EVENT_FIELDS = `
  _id, name, "eventKey": eventKey.current, city, type, year, startDate, endDate,
  venueName, venueAddress, heroImage, heroVideoUrl, citySkyline, description,
  statusNote, pricingAnnounced, gallery, "brochureUrl": brochure.asset->url
`;

let eventsPromise = null;
export function fetchEvents() {
  if (!eventsPromise) {
    eventsPromise = client
      .fetch(`*[_type == "event"]{ ${EVENT_FIELDS} } | order(startDate asc, year asc)`)
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

/** Admin Auto: the next upcoming (or live) event by date; else the most recent past one. */
export function featuredEvent(events, now = new Date()) {
  const list = events || [];
  const upcoming = list
    .filter((e) => ["coming-up", "live"].includes(lifecycleOf(e, now)))
    .sort((a, b) => String(a.startDate || "9999").localeCompare(String(b.startDate || "9999")));
  if (upcoming.length) return upcoming[0];
  const past = list
    .filter((e) => lifecycleOf(e, now) === "past")
    .sort((a, b) => String(b.startDate || "").localeCompare(String(a.startDate || "")));
  return past[0] || list[0] || null;
}

/* Sessions / speakers / partners scoped to one event. The Phase 1 rule:
   an empty `events` list means "every event" (today's behaviour). */
const SCOPED = `(!defined(events) || count(events) == 0 || $eventId in events[]._ref)`;

export function fetchEventContent(eventId) {
  const sessions = client.fetch(
    `*[_type == "session" && ${SCOPED}]{ _id, title, day, time, endTime, type, format, featured, isBreak, stage, description, speakers, moderator } | order(day asc, time asc)`,
    { eventId }
  );
  const speakers = client.fetch(
    `*[_type == "speaker" && ${SCOPED}]{ _id, name, title, company, bio, shortBio, fullBio, image, bannerImage, featured, speakerType, linkedin, twitter, website } | order(featured desc, order asc)`,
    { eventId }
  );
  const partners = client.fetch(
    `*[_type == "partner" && active != false && showOnWebsite != false && ${SCOPED}]{ _id, name, category, logo, url, logoScale } | order(order asc)`,
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
