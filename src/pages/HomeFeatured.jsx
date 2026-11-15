import React, { Suspense, lazy } from "react";
import SiteHeader from "../components/SiteHeader";
import Home from "./Home";
import useSeo from "../hooks/useSeo";
import { featuredEvent, useEvents } from "../lib/events";

/* =========================================================
   The seasonal homepage, composed (Phase 4 follow-up): "/"
   ACTS AS the featured event's home (Admin Auto: the next
   upcoming event by date) — WITHOUT removing anything from
   the current homepage.

   Composition, top to bottom:
   1. SiteHeader — the one morphing header; on "/" it is
      handed the featured event, so the pill names that event
      and Tickets is contextual to it, exactly as on the
      event's own landing page.
   2. The featured-event experience (the same EventTemplate
      as the event's landing, with the Choose-your-city list
      below it) — loaded as its own chunk so the homepage's
      own code is never held up by it.
   3. EVERY section of the existing homepage (pages/Home.jsx)
      in its original order, header slot and "before" slot
      aside byte-for-byte the page as it has always rendered:
      hero, app section, community, MEET BUILD SCALE, About,
      sponsors, newsletter, footer and the three pop-ups.

   Fallback: Sanity returns no events (or hasn't answered
   yet) → the featured block hides itself and the page is the
   current homepage under the site header. The front door can
   never look emptier than today.

   Home.jsx renders through two additive slots (header /
   before) added for this composition; with no props it is
   unchanged. FeaturedHome.jsx remains the standalone
   featured-only page (still unrouted); its CityList and the
   EventTemplate are reused here rather than duplicated.
========================================================= */

const EventTemplate = lazy(() =>
  import("./EventLanding").then((m) => ({ default: m.EventTemplate }))
);
const CityList = lazy(() =>
  import("./FeaturedHome").then((m) => ({ default: m.CityList }))
);

export default function HomeFeatured() {
  const { events } = useEvents();
  const featured = featuredEvent(events);
  useSeo(
    featured ? featured.name : "The Tech Festival Canada",
    featured?.description || "The Tech Festival Canada: briefings across five cities and the Toronto Main Event."
  );

  const featuredBlock = featured ? (
    <main style={{ background: "#070313", color: "#f4f1ff" }}>
      <Suspense fallback={null}>
        {/* heroHeadingAs="h2": the homepage keeps its one <h1> — Home's logo, as today. */}
        <EventTemplate ev={featured} heroHeadingAs="h2" below={<CityList events={events} />} />
      </Suspense>
      <div style={{ paddingBottom: 56 }} />
    </main>
  ) : null;

  return <Home header={<SiteHeader homeEvent={featured} />} before={featuredBlock} />;
}
