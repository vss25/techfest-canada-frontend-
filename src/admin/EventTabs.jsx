import { NavLink, useLocation } from "react-router-dom";
import { EVENT_TABS, menuHomeOf, navItemFor } from "./nav";
import { useAdminEvent } from "./eventContext";

/* One screen per event (Nov 26 2026, step 1 of the admin redesign): the chosen event's name and its pages as
   tabs (Page · Agenda · Speakers · Partners · Tickets · Settings), across the top of each of those pages. The
   pages and their addresses are the ones staff already know; this replaces six menu entries with one, "Events".
   The event itself is still chosen in the top bar. */
const pathOf = (to) => `/admin/${to}`;

export default function EventTabs() {
  const { pathname } = useLocation();
  const { current } = useAdminEvent();
  const item = navItemFor(pathname)?.item;
  if (menuHomeOf(item) !== "content/events") return null;
  const here = item.parent || item.to;
  return (
    <div className="mb-5 border-b border-[#E3E0EE]">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8A86A0]">Event</p>
      <p className="mb-2.5 mt-0.5 text-lg font-bold text-[#151035]">{current?.name || "Choose an event in the top bar"}</p>
      {/* Not a <nav>: the public site's CSS turns every <nav> into its header bar. */}
      <div role="navigation" aria-label="This event's pages" className="-mb-px flex gap-1 overflow-x-auto">
        {EVENT_TABS.map((t) => {
          const on = t.to === here;
          return (
            <NavLink key={t.to} to={pathOf(t.to)} aria-current={on ? "page" : undefined}
              className={`whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#D6308C] ${on ? "border-[#D6308C] text-[#151035]" : "border-transparent text-[#6B6688] hover:text-[#151035]"}`}>
              {t.label}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
