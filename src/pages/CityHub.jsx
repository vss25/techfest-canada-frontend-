import React from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import AnnouncedSoon from "../components/AnnouncedSoon";
import NotFound from "./NotFound";
import useSeo from "../hooks/useSeo";
import {
  LIFECYCLE_LABEL, cityBySlug, eventPath, formatDateRange, lifecycleOf, useEvents,
} from "../lib/events";

/* =========================================================
   The city hub (Phase 4): /:city. A city page shows its
   events — never an agenda, never tickets (those live under
   an event). Toronto hosts two events a year and shows both;
   a single-event city goes straight to its Briefing.
========================================================= */

export default function CityHub() {
  const params = useParams();
  const city = cityBySlug(params.city);
  const { events, loading } = useEvents();
  const mine = events.filter((e) => e.city === city?.name);
/* Per-city hub intros (marketing copy pass, 2026-11-15):
   one or two sentences that make the city unmistakable,
   in the festival's voice. Facts only — no dates, venues
   or themes beyond what each event's record states. */
const CITY_INTROS = {
  vancouver:
    "Vancouver opens the TTFC season. Its Briefing takes on energy and critical infrastructure — one senior, curated day on the west coast, where Alberta molecules meet BC tidewater.",
  calgary:
    "Calgary is the festival in Canada's energy capital. Its Briefing brings builders, buyers and policymakers into one room for a single focused day.",
  ottawa:
    "Ottawa is the capital edition — technology within reach of policy and procurement. Its Briefing is one senior day where the public sector meets the people building for it.",
  toronto:
    "Toronto is TTFC's home stage, with two events in 2027: the one-day Briefing in June and the two-day Main Event in November. Each event has its own agenda, speakers and tickets — pick yours.",
  montreal:
    "Montreal brings the research depth — home to an artificial intelligence community recognised around the world. Its Briefing runs from the lab to the deal in one curated day.",
};

  const intro = city
    ? CITY_INTROS[city.slug] || `The Tech Festival Canada in ${city.name}. Every event has its own agenda, speakers and tickets — pick an event to see them.`
    : "";
  useSeo(city ? `TTFC ${city.name}` : "TTFC cities", intro);

  if (!city) return <NotFound />;
  if (!loading && mine.length === 1 && city.slug !== "toronto") {
    return <Navigate to={eventPath(mine[0])} replace />;
  }

  return (
    <>
      <SiteHeader />
      <main style={{ background: "#070313", color: "#f4f1ff", minHeight: "100vh", paddingTop: 76 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "44px 20px 64px" }}>
          <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(2rem, 5.5vw, 3.4rem)", fontWeight: 900, margin: 0 }}>
            {city.name}
          </h1>
          <p style={{ margin: "12px 0 0", opacity: 0.85, maxWidth: 620, lineHeight: 1.65 }}>
            The Tech Festival Canada in {city.name}. Pick an event — agendas, speakers and tickets live on each event&rsquo;s own pages.
          </p>

          {loading ? (
            <p aria-busy="true" style={{ opacity: 0.7, marginTop: 28 }}>Loading events…</p>
          ) : mine.length === 0 ? (
            <div style={{ marginTop: 30 }}>
              <AnnouncedSoon source={`city:${city.slug}`} title={`${city.name} — announced soon`}
                message={`The next TTFC event in ${city.name} hasn't been announced yet. Leave your email and we'll keep you updated.`} />
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18, marginTop: 30 }}>
              {mine
                .slice()
                .sort((a, b) => String(a.startDate || "9999").localeCompare(String(b.startDate || "9999")))
                .map((ev) => (
                  <Link key={ev._id} to={eventPath(ev)}
                    style={{ display: "block", borderRadius: 20, padding: "22px 24px", textDecoration: "none", color: "inherit",
                      border: "1px solid rgba(127,90,240,0.25)", background: "rgba(127,90,240,0.06)" }}>
                    <div style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", color: "#f5c86e", fontFamily: "'Orbitron', sans-serif" }}>
                      {ev.type === "main-event" ? "Main Event" : "Briefing"} · {LIFECYCLE_LABEL[lifecycleOf(ev)]}
                    </div>
                    <div style={{ marginTop: 8, fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "1.25rem", lineHeight: 1.25 }}>{ev.name}</div>
                    <div style={{ marginTop: 8, fontSize: "0.92rem", opacity: 0.8 }}>
                      {formatDateRange(ev)}{ev.venueName ? ` · ${ev.venueName}` : ""}
                    </div>
                    {ev.description && (
                      <p style={{ margin: "10px 0 0", fontSize: "0.92rem", lineHeight: 1.6, opacity: 0.78 }}>
                        {String(ev.description).split(/(?<=[.!?])\s/)[0]}
                      </p>
                    )}
                    <div style={{ marginTop: 14, fontWeight: 700 }}>Open the event →</div>
                  </Link>
                ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
