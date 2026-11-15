import React, { useMemo, useState } from "react";
import {
  compareEvents,
  compareEventsDesc,
  eventPillLabel,
  eventSortKey,
  getPillSelection,
  lifecycleOf,
  resolvePillSelection,
  setPillSelection,
  useEvents,
} from "../lib/events";

/* =========================================================
   The on-page event selector for the section pages (Awards,
   Speakers, Sponsors — and the Programme/Agenda listings):
   one pill per event plus "All events". The selector IS the
   header pill's selection, shared through the same
   sessionStorage slot (ttfc.pillSelection, via lib/events):

   - a stored eventKey / city choice names the scope, if it
     names an applicable event;
   - an explicit "All events" choice is stored as the "all"
     sentinel, so All survives navigation (the header pill
     itself simply falls back to its own default for it);
   - with nothing stored, the scope defaults to the MOST
     RECENT event — the latest edition that is on or has
     happened (today: Toronto Main Event 2026), never the
     next upcoming one.

   Changing a pill filters the page to that event's tagged
   documents and writes the choice back to the slot, so the
   header pill agrees afterwards. An event with nothing
   tagged yet gets the announced state (ScopedEmptyState) —
   never a silent fall-back to the full list.
========================================================= */

export const ALL_SELECTION = "all";

/** A doc belongs to an event when its Sanity `events` refs include it.
    Accepts the projected `"eventIds": events[]._ref` shape, a raw
    `events` array of reference objects, or plain id strings. */
export function matchesEventScope(doc, eventId) {
  if (!doc || !eventId) return false;
  const ids = Array.isArray(doc.eventIds)
    ? doc.eventIds
    : (Array.isArray(doc.events) ? doc.events.map((e) => (e && typeof e === "object" ? e._ref : e)) : []);
  return ids.includes(eventId);
}

/** Docs usable as scope pills: a real event record, not an empty
    Studio shell (name / city / year / eventKey all present, and a
    usable ordering key). Soonest first, like the pill dropdown. */
export function validScopeEvents(events) {
  return (events || [])
    .filter((e) => e && e.name && e.city && e.year && e.eventKey && eventSortKey(e))
    .slice()
    .sort(compareEvents);
}

/** The most recent event: the latest one that is live, just ended
    or past — the newest edition that exists yet, as opposed to
    nextEvent()'s soonest upcoming. Null when nothing has happened. */
export function mostRecentEvent(events) {
  const held = validScopeEvents(events).filter((e) => ["live", "just-ended", "past"].includes(lifecycleOf(e)));
  held.sort(compareEventsDesc);
  return held[0] || null;
}

/** The shared scope state for a listing page.
    Returns { events, scopedEvent, select, loading }:
      events      — the valid events, pill order
      scopedEvent — the resolved scope, or null for All events
      select(ev)  — write the choice back to the pill slot (null = All) */
export function useEventScope() {
  const { events, loading } = useEvents();
  const [stored, setStored] = useState(() => getPillSelection());

  const valid = useMemo(() => validScopeEvents(events), [events]);

  const scopedEvent = useMemo(() => {
    if (stored === ALL_SELECTION) return null;
    if (stored) {
      const resolved = resolvePillSelection(events, stored);
      const ev = resolved && resolved.event;
      if (ev && valid.some((v) => v._id === ev._id)) return ev;
    }
    return mostRecentEvent(events);
  }, [events, valid, stored]);

  const select = (ev) => {
    setPillSelection(ev ? ev.eventKey : ALL_SELECTION);
    setStored(ev ? ev.eventKey : ALL_SELECTION);
  };

  return { events: valid, scopedEvent, select, loading };
}

const chipStyle = (active) => ({
  padding: "8px 18px",
  borderRadius: 999,
  fontFamily: "'Orbitron', sans-serif",
  fontSize: "0.72rem",
  fontWeight: 800,
  letterSpacing: 1,
  cursor: "pointer",
  border: `1.5px solid ${active ? "#f5a623" : "rgba(127,90,240,0.35)"}`,
  background: active ? "rgba(245,166,35,0.14)" : "transparent",
  color: "inherit",
});

/** The pill row itself: "All events" + one pill per event. On phones
    (≤640px) the row stops wrapping and scrolls horizontally instead —
    see the .ev-scope-bar rules rendered with it. */
export default function EventScopeBar({ events, scopedEvent, onSelect, style }) {
  if (!events || events.length === 0) return null;
  return (
    <>
      <style>{`
        .ev-scope-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        @media (max-width: 640px) {
          .ev-scope-bar { flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
          .ev-scope-bar::-webkit-scrollbar { display: none; }
          .ev-scope-bar > button { flex-shrink: 0; white-space: nowrap; }
        }
      `}</style>
      <nav aria-label="Choose an event" className="ev-scope-bar" style={{ ...style }}>
        <button type="button" onClick={() => onSelect(null)} aria-pressed={!scopedEvent} style={chipStyle(!scopedEvent)}>
          All events
        </button>
        {events.map((ev) => {
          const active = !!scopedEvent && scopedEvent._id === ev._id;
          return (
            <button key={ev._id} type="button" onClick={() => onSelect(ev)} aria-pressed={active} style={chipStyle(active)}>
              {eventPillLabel(ev)}
            </button>
          );
        })}
      </nav>
    </>
  );
}

/** The explicit announced state for a scoped listing with nothing
    tagged to the event yet — never a silent fall-back to the full
    list. `noun` is the plural thing the page lists ("speakers",
    "sponsors", "sessions"). */
export function ScopedEmptyState({ event, noun }) {
  if (!event) return null;
  return (
    <div style={{ textAlign: "center", padding: "3.5rem 1rem", maxWidth: 560, margin: "0 auto" }}>
      <p style={{
        fontFamily: "'Orbitron', sans-serif", fontSize: "0.95rem", fontWeight: 800,
        letterSpacing: "0.04em", lineHeight: 1.6, margin: 0,
      }}>
        {eventPillLabel(event)} — {noun} will be announced here.
      </p>
      <p style={{ fontSize: "0.92rem", lineHeight: 1.7, opacity: 0.65, marginTop: 10 }}>
        Nothing has been announced for this event yet. Choose &ldquo;All events&rdquo; above to browse everything so far.
      </p>
    </div>
  );
}
