import React from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import AnnouncedSoon from "../components/AnnouncedSoon";
import Reveal, { GradientRule } from "../components/Reveal";
import { SkylineSvg } from "../components/Skyline";
import { EventTemplate } from "./EventLanding";
import useSeo from "../hooks/useSeo";
import { urlFor } from "../utils/sanity";
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
    <section aria-label="Choose your city" style={{ padding: "clamp(48px, 7vw, 80px) 0 8px" }}>
      <style>{`
        .ev-city-card { transition: transform .35s ease, box-shadow .35s ease, border-color .35s ease; }
        @media (hover: hover) and (pointer: fine) {
          .ev-city-card:hover { transform: translateY(-5px); box-shadow: 0 22px 48px rgba(2,0,10,0.5); border-color: rgba(240,106,176,0.45); }
          .ev-city-card:hover .ev-city-media img { transform: scale(1.06); }
        }
        .ev-city-media img { transition: transform .6s ease; }
      `}</style>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
        <Reveal>
          <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(1.9rem, 4.6vw, 2.9rem)", fontWeight: 900, letterSpacing: "-0.01em", margin: 0 }}>
            Choose your city
          </h2>
          <GradientRule style={{ marginTop: 16 }} />
        </Reveal>
        <p style={{ margin: "18px 0 0", opacity: 0.85, maxWidth: 620, lineHeight: 1.65 }}>
          One festival, five cities. Every Briefing is a single senior, curated day; the Main Event is the two-day national gathering in Toronto.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginTop: 28 }}>
          {CITIES.map((c, i) => {
            const next = (events || [])
              .filter((e) => e.city === c.name && ["coming-up", "live"].includes(lifecycleOf(e)))
              .sort((a, b) => String(a.startDate || "9999").localeCompare(String(b.startDate || "9999")))[0];
            const photo = next?.heroImage?.asset ? urlFor(next.heroImage).width(720).quality(80).auto("format").url() : null;
            return (
              <Reveal key={c.slug} delay={Math.min(i, 4) * 0.06} style={{ height: "100%" }}>
                <Link to={`/${c.slug}`} className="ev-city-card"
                  style={{ display: "block", height: "100%", borderRadius: 18, overflow: "hidden", textDecoration: "none", color: "inherit",
                    border: "1px solid rgba(127,90,240,0.25)", background: "rgba(127,90,240,0.06)" }}>
                  <div className="ev-city-media" style={{ position: "relative", height: 96, overflow: "hidden", background: "linear-gradient(150deg, #2a1160 0%, #D6308C 60%, #e8458b 135%)" }}>
                    {photo ? (
                      <img src={photo} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 74, color: "rgba(8,3,20,0.55)" }}>
                        <SkylineSvg citySlug={c.slug} />
                      </div>
                    )}
                    <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(7,3,19,0.4), transparent 55%)" }} />
                  </div>
                  <div style={{ padding: "16px 20px 18px" }}>
                    <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "1.1rem" }}>{c.name}</div>
                    <div style={{ marginTop: 6, fontSize: "0.86rem", opacity: 0.78 }}>
                      {next ? `${next.type === "main-event" ? "Main Event" : "Briefing"} · ${formatDateRange(next)}` : "Announced soon"}
                    </div>
                  </div>
                </Link>
              </Reveal>
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
