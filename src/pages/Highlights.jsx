import React from "react";
import { Link, useParams } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import YearPills from "../components/YearPills";
import AnnouncedSoon from "../components/AnnouncedSoon";
import useSeo from "../hooks/useSeo";
import { urlFor } from "../utils/sanity";
import {
  editionYears, eventPath, formatDateRange, lifecycleOf, useEvents,
} from "../lib/events";

/* =========================================================
   Highlights (Phase 4): the past-events archive, one of the
   higher-level pages with year pills — past years AND future
   announced editions. A past year shows that year's events
   (their own pages keep highlights + gallery); a future year
   is an announced state with the stay-updated form.
========================================================= */

export default function Highlights() {
  const params = useParams();
  const { events, loading } = useEvents();
  const years = editionYears(events);
  const pastYears = years.filter((y) => events.some((e) => Number(e.year) === y && ["past", "just-ended"].includes(lifecycleOf(e))));
  const selected = params.year ? Number(params.year) : (pastYears[0] ?? years[0]);
  const mine = events.filter((e) => Number(e.year) === selected);
  const isFuture = mine.length > 0 && mine.every((e) => lifecycleOf(e) === "coming-up");
  useSeo(`TTFC highlights ${selected || ""}`.trim(), "Past editions of The Tech Festival Canada: highlights and galleries.");

  return (
    <>
      <SiteHeader />
      <main style={{ background: "#070313", color: "#f4f1ff", minHeight: "100vh", paddingTop: 76 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "44px 20px 64px" }}>
          <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(2rem, 5.5vw, 3.2rem)", fontWeight: 900, margin: 0 }}>
            Highlights
          </h1>
          <div style={{ marginTop: 20 }}>
            <YearPills years={years} current={selected} basePath="/highlights" />
          </div>

          {loading ? (
            <p aria-busy="true" style={{ opacity: 0.7, marginTop: 30 }}>Loading…</p>
          ) : mine.length === 0 ? (
            <p style={{ marginTop: 30, opacity: 0.8 }}>No edition is recorded for {selected} yet.</p>
          ) : isFuture ? (
            <div style={{ marginTop: 30 }}>
              <AnnouncedSoon source={`highlights:${selected}`} title={`${selected} — announced`}
                message={`The ${selected} edition is on its way. Leave your email and we'll keep you updated — dates, speakers and pricing as they're announced.`} />
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18, marginTop: 30 }}>
              {mine.map((ev) => (
                <Link key={ev._id} to={eventPath(ev)}
                  style={{ display: "block", borderRadius: 20, overflow: "hidden", textDecoration: "none", color: "inherit", border: "1px solid rgba(127,90,240,0.25)", background: "rgba(127,90,240,0.06)" }}>
                  {ev.heroImage?.asset && (
                    <img src={urlFor(ev.heroImage).width(720).quality(80).auto("format").url()} alt="" loading="lazy"
                      style={{ width: "100%", aspectRatio: "16 / 8", objectFit: "cover", display: "block" }} />
                  )}
                  <div style={{ padding: "18px 22px 22px" }}>
                    <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "1.15rem", lineHeight: 1.3 }}>{ev.name}</div>
                    <div style={{ marginTop: 6, fontSize: "0.9rem", opacity: 0.8 }}>
                      {formatDateRange(ev)}{ev.venueName ? ` · ${ev.venueName}` : ""}
                    </div>
                    <div style={{ marginTop: 12, fontWeight: 700 }}>Highlights & gallery →</div>
                  </div>
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
