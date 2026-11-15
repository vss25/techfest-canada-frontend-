import React from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import AnnouncedSoon from "../components/AnnouncedSoon";
import { EventTemplate } from "./EventLanding";
import useSeo from "../hooks/useSeo";
import {
  CITIES, LIFECYCLE_LABEL, eventPath, featuredEvent, formatDateRange, lifecycleOf, useEvents,
} from "../lib/events";

/* =========================================================
   The seasonal homepage (Phase 4): "/" does not merely
   feature an event — it ACTS AS that season's event home
   (Admin Auto: the next upcoming event by date), rendered
   with the very same template as the event's own landing.
   Below it, always, the Choose-your-city list stays.

   STATUS: built but NOT routed in this PR. The standing rule
   is "never remove anything live", and pointing "/" here
   would displace the current homepage (src/pages/Home.jsx)
   and its sections. Activation is a one-line route change in
   App.jsx, gated on an explicit decision to retire or fold
   in the current homepage's content. Until then the featured
   event's home is its own landing page, same template.
========================================================= */

export function CityList({ events }) {
  return (
    <section aria-label="Choose your city" style={{ padding: "clamp(36px, 6vw, 64px) 0 8px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
        <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(1.35rem, 3vw, 1.9rem)", fontWeight: 800, margin: 0 }}>
          Choose your city
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginTop: 22 }}>
          {CITIES.map((c) => {
            const next = (events || [])
              .filter((e) => e.city === c.name && ["coming-up", "live"].includes(lifecycleOf(e)))
              .sort((a, b) => String(a.startDate || "9999").localeCompare(String(b.startDate || "9999")))[0];
            return (
              <Link key={c.slug} to={`/${c.slug}`}
                style={{ display: "block", borderRadius: 18, padding: "18px 20px", textDecoration: "none", color: "inherit",
                  border: "1px solid rgba(127,90,240,0.25)", background: "rgba(127,90,240,0.06)" }}>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "1.1rem" }}>{c.name}</div>
                <div style={{ marginTop: 6, fontSize: "0.86rem", opacity: 0.78 }}>
                  {next ? `${next.type === "main-event" ? "Main Event" : "Briefing"} · ${formatDateRange(next)}` : "Announced soon"}
                </div>
              </Link>
            );
          })}
        </div>
        {(events || []).filter((e) => !["coming-up", "live"].includes(lifecycleOf(e))).length > 0 && (
          <p style={{ marginTop: 18, fontSize: "0.92rem", opacity: 0.75 }}>
            Earlier editions:{" "}
            {(events || [])
              .filter((e) => !["coming-up", "live"].includes(lifecycleOf(e)))
              .map((e, i, arr) => (
                <span key={e._id}>
                  <Link to={eventPath(e)} style={{ color: "inherit", fontWeight: 600 }}>
                    {e.name} ({LIFECYCLE_LABEL[lifecycleOf(e)]})
                  </Link>
                  {i < arr.length - 1 ? " · " : ""}
                </span>
              ))}
          </p>
        )}
      </div>
    </section>
  );
}

export default function FeaturedHome() {
  const { events, loading } = useEvents();
  const featured = featuredEvent(events);
  useSeo(
    featured ? featured.name : "The Tech Festival Canada",
    featured?.description || "The Tech Festival Canada: briefings across five cities and the Toronto Main Event."
  );

  return (
    <>
      <SiteHeader />
      <main style={{ background: "#070313", color: "#f4f1ff", minHeight: "100vh" }}>
        {loading ? (
          <div aria-busy="true" style={{ minHeight: "70vh" }} />
        ) : featured ? (
          <EventTemplate ev={featured} below={<CityList events={events} />} />
        ) : (
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "130px 20px 20px" }}>
            <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(2rem, 6vw, 3.6rem)", fontWeight: 900, margin: 0 }}>
              The Tech Festival Canada
            </h1>
            <p style={{ margin: "14px 0 26px", maxWidth: 620, lineHeight: 1.65, opacity: 0.88 }}>
              One festival, five cities: Briefings across the country and the two-day Main Event in Toronto. New editions are announced here first.
            </p>
            <AnnouncedSoon source="home" title="Next edition announced soon" message="The next TTFC edition hasn't been announced yet — check back, or leave your email and you'll be among the first to know." />
            <CityList events={events} />
          </div>
        )}
        <div style={{ paddingBottom: 56 }} />
      </main>
      <Footer />
    </>
  );
}
