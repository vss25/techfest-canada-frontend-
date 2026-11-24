import { CalendarX } from "lucide-react";
import { adminEventKey, useAdminEvent } from "./eventContext";
import { Button, EmptyState, PageHeader } from "./ui";

/* =========================================================
   Pages whose data is one event's for now (Nov 23 2026, like the attendee survey, app/Survey.jsx): with another
   event chosen in the top bar they say there's nothing for it yet, instead of showing Toronto 2026's records under
   every event. With that event chosen (or none), the page itself.
     <EventOnly title="Promo codes" eyebrow="Marketing" what="promo codes" because="…">…</EventOnly>
========================================================= */

const MAIN_EVENT_KEY = "ttfc-2026-main";

export default function EventOnly({ forKey = MAIN_EVENT_KEY, title, eyebrow, what, because, icon = CalendarX, children }) {
  const { current, events, setCurrent } = useAdminEvent();
  const key = adminEventKey(current);
  if (!key || key === forKey) return children;
  const home = (events || []).find((e) => adminEventKey(e) === forKey);
  const homeName = home?.name || "The Tech Festival Canada 2026";
  const name = current?.name || "this event";
  return (
    <div>
      {title && <PageHeader eyebrow={eyebrow} title={title} description={`For ${name}.`} />}
      <EmptyState icon={icon} title={`No ${what} for ${name} yet`}
        body={because || `The ${what} here are ${homeName}'s. They stay with that event.`}
        action={home ? <Button onClick={() => setCurrent(home._id)}>Open {homeName}</Button> : null} />
    </div>
  );
}
