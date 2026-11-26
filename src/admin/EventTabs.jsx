import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { EVENT_TABS, menuHomeOf, navItemFor } from "./nav";
import { useAdminEvent } from "./eventContext";

/* One screen per event (Nov 26 2026, step 1 of the admin redesign): the chosen event's name and its pages as
   tabs (Page · Agenda · Speakers · Partners · Tickets · Settings), across the top of each of those pages. The
   pages and their addresses are the ones staff already know; this replaces six menu entries with one, "Events".
   The event itself is still chosen in the top bar. */
const pathOf = (to) => `/admin/${to}`;

/* The height of the panel's top bar (the computer's, or the phone's with its event chip), so the tabs can stay
   just under it while the page scrolls (Nov 26 2026, the owner: "freeze pane here as I scroll down"). */
function useTopBarHeight() {
  const [h, setH] = useState(64);
  useEffect(() => {
    const bars = [...document.querySelectorAll(".ttfc-admin header")];
    const measure = () => { const bar = bars.find((b) => b.offsetHeight > 0); if (bar) setH(bar.offsetHeight); };
    measure();
    if (!window.ResizeObserver) return undefined;
    const ro = new ResizeObserver(measure);
    bars.forEach((b) => ro.observe(b));
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, []);
  return h;
}

export default function EventTabs() {
  const { pathname } = useLocation();
  const { current } = useAdminEvent();
  const top = useTopBarHeight();
  const item = navItemFor(pathname)?.item;
  if (menuHomeOf(item) !== "content/events") return null;
  const here = item.parent || item.to;
  return (
    // Stays under the top bar while the page scrolls; the negative margins let its background reach the edges.
    <div className="sticky z-20 -mx-4 mb-5 border-b border-[#E3E0EE] px-4 pt-3 sm:-mx-6 sm:px-6 lg:-mx-7 lg:px-7" style={{ top, backgroundColor: "var(--a-bg)" }}>
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
