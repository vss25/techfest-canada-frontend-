import { useEffect, useMemo, useState } from "react";
import { useApi } from "../hooks";
import { fetchTicketTypes } from "../../lib/ticketsApi";
import { forEvent, readinessFor } from "./readiness";

/** The event's checklist from what's in the panel now (form = the editor's current values, unsaved edits too). */
export function useReadiness(ev, form, dirty) {
  const sessions = useApi("/cms/session?drafts=1");
  const speakers = useApi("/cms/speaker?drafts=1");
  const partners = useApi("/cms/partner?drafts=1");
  const publishing = useApi("/cms/publishing");
  const key = ev?.eventKey?.current || ev?.eventKey || "";
  const [ticketTypes, setTicketTypes] = useState(undefined);
  useEffect(() => {
    let live = true;
    if (!key) return undefined;
    fetchTicketTypes(key).then((t) => { if (live) setTicketTypes(t); });
    return () => { live = false; };
  }, [key]);
  const loading = sessions.loading || speakers.loading || partners.loading || ticketTypes === undefined;
  const r = useMemo(() => {
    const mine = {
      sessions: forEvent(sessions.data, ev?._id),
      speakers: forEvent(speakers.data, ev?._id),
      partners: forEvent(partners.data, ev?._id),
    };
    const unsent = [...mine.sessions, ...mine.speakers, ...mine.partners].filter((d) => d.hasDraft).length + (ev?.hasDraft || dirty ? 1 : 0);
    return readinessFor(form, { ...mine, ticketTypes: ticketTypes ?? null, unsent });
  }, [sessions.data, speakers.data, partners.data, ticketTypes, form, ev, dirty]);
  return { ...r, loading, paused: publishing.data?.paused === true };
}

