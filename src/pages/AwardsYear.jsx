import React from "react";
import { Navigate, useParams } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import YearPills from "../components/YearPills";
import AnnouncedSoon from "../components/AnnouncedSoon";
import useSeo from "../hooks/useSeo";
import { editionYears, useEvents } from "../lib/events";

/* =========================================================
   /awards/:year (Phase 4): the Awards page is one of the
   higher-level pages with year pills, future years included.
   The 2026 edition is the existing full /awards page, so its
   pill goes there. Any other year is a real, clickable
   announced state: what is known, and the stay-updated form.
   A future year's pill appears here as soon as that year's
   edition exists in the event data.
========================================================= */

export default function AwardsYear() {
  const params = useParams();
  const { events } = useEvents();
  const year = Number(params.year);
  const years = [...new Set([2026, ...editionYears(events)])].sort((a, b) => b - a);
  useSeo(`Catalyst Awards ${year || ""}`.trim(), "The Catalyst Awards: celebrating Canada's tech catalysts.");

  if (year === 2026) return <Navigate to="/awards" replace />;
  if (!/^\d{4}$/.test(params.year || "")) return <Navigate to="/awards" replace />;

  return (
    <>
      <SiteHeader />
      <main style={{ background: "#070313", color: "#f4f1ff", minHeight: "100vh", paddingTop: 76 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "44px 20px 64px" }}>
          <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(2rem, 5.5vw, 3.2rem)", fontWeight: 900, margin: 0 }}>
            Catalyst Awards {year}
          </h1>
          <div style={{ marginTop: 20 }}>
            <YearPills years={years} current={year} basePath="/awards" />
          </div>
          <div style={{ marginTop: 30 }}>
            <AnnouncedSoon source={`awards:${year}`} title={`Catalyst Awards ${year} — announced soon`}
              message={`The ${year} Catalyst Awards haven't been announced yet — nominations, key dates and the ceremony will appear here. Leave your email and we'll keep you updated.`} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
