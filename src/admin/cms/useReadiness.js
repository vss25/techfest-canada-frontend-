import { useEffect, useMemo, useState } from "react";
import { useApi } from "../hooks";
import { fetchTicketTypes } from "../../lib/ticketsApi";
import { forEvent, readinessFor } from "./readiness";

/* "As soon as the required content is ready, Publish to live becomes active. Otherwise you can
   only publish to staging and review." (Nov 17 2026). One rule for the event page's button and
   for Website changes. */

const keyOf = (ev) => ev?.eventKey?.current || ev?.eventKey || "";
const refIds = (d) => (d?.events || []).map((r) => r?._ref).filter(Boolean);

/** { [eventKey]: ticket types | null } for these events (undefined while loading). */
function useTicketTypes(keys) {
  const [types, setTypes] = useState({});
  const wanted = keys.filter(Boolean).sort().join("|");
  useEffect(() => {
    let live = true;
    const list = wanted ? wanted.split("|") : [];
    list.forEach((k) => fetchTicketTypes(k).then((t) => { if (live) setTypes((m) => ({ ...m, [k]: t })); }));
    return () => { live = false; };
  }, [wanted]);
  return types;
}

function useContentLists() {
  return {
    sessions: useApi("/cms/session?drafts=1"),
    speakers: useApi("/cms/speaker?drafts=1"),
    partners: useApi("/cms/partner?drafts=1"),
  };
}

function readinessOf(ev, form, lists, ticketTypes, dirty = false) {
  const mine = {
    sessions: forEvent(lists.sessions.data, ev?._id),
    speakers: forEvent(lists.speakers.data, ev?._id),
    partners: forEvent(lists.partners.data, ev?._id),
  };
  const unsent = [...mine.sessions, ...mine.speakers, ...mine.partners].filter((d) => d.hasDraft).length + (ev?.hasDraft || dirty ? 1 : 0);
  return readinessFor(form, { ...mine, ticketTypes: ticketTypes ?? null, unsent });
}

/** One event's checklist from what's in the panel now (form = the editor's current values, unsaved edits too). */
export function useReadiness(ev, form, dirty) {
  const lists = useContentLists();
  const key = keyOf(ev);
  const types = useTicketTypes([key]);
  const loading = lists.sessions.loading || lists.speakers.loading || lists.partners.loading || (key && !(key in types));
  const r = useMemo(() => readinessOf(ev, form, lists, types[key], dirty),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lists.sessions.data, lists.speakers.data, lists.partners.data, types, key, form, ev, dirty]);
  return { ...r, loading: !!loading };
}

/**
 * Every event's readiness, for Website changes.
 * → { loading, eventName(id), readiness(id), blockedBy(item) → [{ id, name, pct }] (the events it belongs to that aren't ready) }
 */
export function useAllReadiness() {
  const lists = useContentLists();
  const events = useApi("/cms/event?drafts=1");
  const evs = useMemo(() => (events.data || []).filter((e) => e?._id), [events.data]);
  const types = useTicketTypes(evs.map(keyOf));
  const loading = events.loading || lists.sessions.loading || lists.speakers.loading || lists.partners.loading
    || evs.some((e) => keyOf(e) && !(keyOf(e) in types));
  return useMemo(() => {
    const byId = new Map(evs.map((e) => [e._id, { ev: e, r: readinessOf(e, e, lists, types[keyOf(e)]) }]));
    const docs = new Map();
    for (const l of [lists.sessions, lists.speakers, lists.partners]) for (const d of l.data || []) docs.set(d._id, d);
    const eventsOf = (item) => (item.type === "event" ? [item.id] : refIds(docs.get(item.id)));
    return {
      loading: !!loading,
      eventName: (id) => byId.get(id)?.ev.name || "this event",
      readiness: (id) => byId.get(id)?.r || null,
      blockedBy: (item) => eventsOf(item)
        .map((id) => byId.get(id))
        .filter((x) => x && !x.r.ready)
        .map((x) => ({ id: x.ev._id, name: x.ev.name, pct: x.r.pct })),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evs, lists.sessions.data, lists.speakers.data, lists.partners.data, types, loading]);
}
