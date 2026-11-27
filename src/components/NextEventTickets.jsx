import { Navigate, useLocation } from "react-router-dom";
import { eventTicketsPath, nextEvent, useEvents } from "../lib/events";

/* /tickets in the new design (Nov 2026): the next event's tickets (Vancouver until it has passed),
   which open the event page's ticket drawer. The old /tickets page sold TTFC 2026's passes.
   Any ?promo= or other query is kept. While the events load, nothing is shown. */
export default function NextEventTickets() {
  const { events, loading } = useEvents();
  const { search } = useLocation();
  if (loading) return <div style={{ minHeight: "100vh" }} aria-busy="true" />;
  const ev = nextEvent(events);
  return <Navigate to={ev ? `${eventTicketsPath(ev)}${search}` : `/stay-updated${search}`} replace />;
}
