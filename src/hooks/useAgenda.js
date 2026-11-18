import { useSyncExternalStore } from "react";
import { client } from "../utils/sanity";
import { SESSIONS } from "../data/agenda";

/* =========================================================
   The agenda, edited by staff in the admin panel (Website
   content → Agenda) and stored in Sanity as "session" docs.
   Fetched once per page load. Until it arrives — or if the
   fetch fails / there are no sessions yet — the bundled
   SESSIONS from src/data/agenda.js are used, so the page
   always has something to show.
========================================================= */

const QUERY = `*[_type == "session" && !(_id in path("drafts.**"))] | order(day asc, time asc) {
  _id, sessionId, day, time, endTime, title, type, format, featured, isBreak,
  pillar, sector, speakers[]{ name, org, tentative }, moderator{ name, org }, stage, description
}`;

const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ""));

const person = (p) => (p && p.name ? clean({ name: p.name, org: p.org, tentative: p.tentative === true ? true : undefined }) : null);

/** Sanity session doc → the agenda.js session shape. Exported for tests/reuse. */
export function toSession(d) {
  return clean({
    id: d.sessionId || d._id,
    day: Number(d.day),
    time: d.time,
    endTime: d.endTime || d.time,
    title: d.title,
    type: d.type,
    format: d.format,
    featured: d.featured === true ? true : undefined,
    isBreak: d.isBreak === true ? true : undefined,
    pillar: d.pillar,
    sector: d.sector,
    speakers: (d.speakers || []).map(person).filter(Boolean),
    moderator: person(d.moderator) || undefined,
    stage: d.stage,
    description: d.description,
  });
}

let state = { sessions: SESSIONS, source: "bundled", loaded: false };
let started = false;
const listeners = new Set();

function load() {
  if (started || typeof window === "undefined") return;
  started = true;
  client.fetch(QUERY)
    .then((docs) => {
      const list = (Array.isArray(docs) ? docs : []).map(toSession).filter((s) => s.title && s.time && (s.day === 1 || s.day === 2));
      state = list.length ? { sessions: list, source: "cms", loaded: true } : { ...state, loaded: true };
    })
    .catch(() => { state = { ...state, loaded: true }; })
    .finally(() => listeners.forEach((fn) => fn()));
}

function subscribe(fn) {
  listeners.add(fn);
  load();
  return () => listeners.delete(fn);
}
const snapshot = () => state;

/** { sessions, source: "cms" | "bundled", loaded } */
export default function useAgenda() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
