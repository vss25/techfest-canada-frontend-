import React from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import AnnouncedSoon from "../components/AnnouncedSoon";
import Reveal from "../components/Reveal";
import { SkylineSvg } from "../components/Skyline";
import NotFound from "./NotFound";
import useSeo from "../hooks/useSeo";
import { urlFor } from "../utils/sanity";
import {
  LIFECYCLE_LABEL, cityBySlug, citySlugOf, eventPath, formatDateRange, lifecycleOf, useEvents,
} from "../lib/events";

/* =========================================================
   The city hub (Phase 4): /:city. A city page shows its
   events — never an agenda, never tickets (those live under
   an event). Toronto hosts two events a year and shows both;
   a single-event city goes straight to its Briefing.

   Visual enrichment: the hub opens with a cinematic city
   hero — the city's skyline silhouetted over a brand aurora
   sky (or the next event's own hero photo when it has one) —
   and its events are photo cards. Same words, same links,
   same routing as before.
========================================================= */

const HUB_CSS = `
  .ev-hub-card { transition: transform .35s ease, box-shadow .35s ease, border-color .35s ease; }
  @media (hover: hover) and (pointer: fine) {
    .ev-hub-card:hover { transform: translateY(-5px); box-shadow: 0 22px 48px rgba(2,0,10,0.5); border-color: rgba(155,135,245,0.45); }
    .ev-hub-card:hover .ev-hub-media img { transform: scale(1.06); }
  }
  .ev-hub-media img { transition: transform .6s ease; }
  /* Mobile pass (≤640px): tighter hero padding, and the skyline layers
     capped in viewport units like the event hero's. */
  @media (max-width: 640px) {
    .ev-hub-hero-inner { padding: 110px 20px 84px !important; }
    .ev-hub-backlight { height: 18vh !important; }
    .ev-hub-skyline { height: 14vh !important; }
  }
`;

function EventCard({ ev }) {
  const photo = ev.heroImage?.asset ? urlFor(ev.heroImage).width(960).quality(80).auto("format").url() : null;
  return (
    <Link to={eventPath(ev)} className="ev-hub-card"
      style={{ display: "block", borderRadius: 20, overflow: "hidden", textDecoration: "none", color: "inherit",
        border: "1px solid rgba(127,90,240,0.25)", background: "rgba(127,90,240,0.06)" }}>
      <div className="ev-hub-media" style={{ position: "relative", height: 168, overflow: "hidden", background: "linear-gradient(150deg, #2a1160 0%, #7a3fd1 60%, #e8458b 135%)" }}>
        {photo ? (
          <img src={photo} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 120, color: "rgba(8,3,20,0.55)" }}>
            <SkylineSvg citySlug={citySlugOf(ev.city)} />
          </div>
        )}
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(7,3,19,0.45), transparent 55%)" }} />
      </div>
      <div style={{ padding: "20px 24px 22px" }}>
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
      </div>
    </Link>
  );
}

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

  const sorted = mine.slice().sort((a, b) => String(a.startDate || "9999").localeCompare(String(b.startDate || "9999")));
  const heroPhoto = sorted.find((e) => e.heroImage?.asset)?.heroImage;

  return (
    <>
      <SiteHeader />
      <main style={{ background: "#070313", color: "#f4f1ff", minHeight: "100vh" }}>
        <style>{HUB_CSS}</style>

        {/* The city hero: the next event's photo when there is one,
            otherwise the aurora sky — the skyline anchors both. The
            layer stack is explicit (media 0, shade 1, backlight 2,
            skyline 3, text 4) and the silhouette carries a violet
            drop-shadow edge, so the city outline always paints above
            the photo and stays visible over any backdrop. */}
        <section aria-label={city.name} style={{ position: "relative", overflow: "hidden", background: "#0a0618" }}>
          {heroPhoto ? (
            <img src={urlFor(heroPhoto).width(1920).quality(80).auto("format").url()} alt="" aria-hidden="true"
              srcSet={[480, 960, 1440, 1920].map((w) => `${urlFor(heroPhoto).width(w).quality(80).auto("format").url()} ${w}w`).join(", ")}
              sizes="100vw"
              style={{ position: "absolute", inset: 0, zIndex: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, background: "radial-gradient(58% 60% at 18% 24%, rgba(127,90,240,0.5), transparent 70%), radial-gradient(46% 50% at 84% 16%, rgba(232,69,139,0.28), transparent 70%), linear-gradient(160deg, #150a33 0%, #0a0618 60%, #070313 100%)" }} />
          )}
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(to bottom, rgba(5,2,14,0.5) 0%, transparent 30%, transparent 55%, rgba(7,3,19,0.96) 100%)" }} />
          <div aria-hidden="true" className="ev-hub-backlight" style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 2, height: 150, color: "rgba(127,90,240,0.35)", filter: "blur(4px)", pointerEvents: "none" }}>
            <SkylineSvg citySlug={city.slug} />
          </div>
          <div aria-hidden="true" className="ev-hub-skyline" style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 3, height: 118, color: "rgba(6,2,15,0.94)", filter: "drop-shadow(0 -4px 16px rgba(127,90,240,0.45))", pointerEvents: "none" }}>
            <SkylineSvg citySlug={city.slug} />
          </div>
          <div className="ev-hub-hero-inner" style={{ position: "relative", zIndex: 4, maxWidth: 1200, margin: "0 auto", padding: "168px 20px 120px" }}>
            <Reveal>
              <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(3rem, 9vw, 6rem)", fontWeight: 900, lineHeight: 0.99, letterSpacing: "-0.01em", margin: 0, textShadow: "0 6px 44px rgba(3,0,10,0.55)" }}>
                {city.name}
              </h1>
              <p style={{ margin: "16px 0 0", opacity: 0.88, maxWidth: 620, lineHeight: 1.65, fontSize: "clamp(1rem, 1.8vw, 1.15rem)" }}>
                {intro}
              </p>
            </Reveal>
          </div>
        </section>

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "44px 20px 64px" }}>
          {loading ? (
            <p aria-busy="true" style={{ opacity: 0.7 }}>Loading events…</p>
          ) : mine.length === 0 ? (
            <AnnouncedSoon source={`city:${city.slug}`} title={`${city.name} — announced soon`}
              message={`The next TTFC event in ${city.name} hasn't been announced yet — when it is, it lands on this page first. Leave your email and we'll keep you updated.`} />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))", gap: 18 }}>
              {sorted.map((ev, i) => (
                <Reveal key={ev._id} delay={Math.min(i, 5) * 0.06} style={{ height: "100%" }}>
                  <EventCard ev={ev} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
