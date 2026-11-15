import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import YearPills from "../components/YearPills";
import AnnouncedSoon from "../components/AnnouncedSoon";
import useSeo from "../hooks/useSeo";
import { client, urlFor } from "../utils/sanity";
import {
  editionYears, getPillSelection, resolvePillSelection, setPillSelection, useEvents,
} from "../lib/events";
import { ALL_SELECTION, mostRecentEvent } from "../components/EventScopeBar";

/* =========================================================
   National Partners (Phase 4): the roll-up page above the
   single events, with year pills including future editions.
   Briefing partners roll up here automatically (a partner's
   `events` refs say which editions it belongs to; empty =
   every edition, as before). Package/pricing displays obey
   §10: this page shows who partners are, never what packages
   cost — pricing lives behind each event's announced flag.
========================================================= */

const CATEGORY_TITLES = {
  partnersAndSupporters: "Our Partners and Supporters",
  governmentPartners: "Government Partners",
  industryAssociates: "Industry Associates",
  academicResearchInstitutions: "Academic and Research Institutions",
  corporateEnterprisePartners: "Corporate and Enterprise Partners",
  startupEcosystemPartners: "Startup and Ecosystem Partners",
  internationalTradeBodies: "International Trade Bodies",
  other: "Partners",
};

export default function NationalPartners() {
  const params = useParams();
  const navigate = useNavigate();
  const { events } = useEvents();
  const years = editionYears(events);
  // Partners are YEAR-level only — never filtered to a single Briefing: a
  // partner shows under a year when any of its tagged events fall in it.
  // The URL year wins; on the landing the default is the shared pill
  // selection's year when one is set, else the most recent year (the newest
  // edition that has happened). "All years" — the national roll-up — is the
  // shared slot's "all" sentinel, or the All years pill below.
  const [storedSel] = useState(() => getPillSelection());
  const [allYears, setAllYears] = useState(false);
  const sharedYear = useMemo(() => {
    if (!storedSel || storedSel === ALL_SELECTION) return null;
    const resolved = resolvePillSelection(events, storedSel);
    return resolved && resolved.event ? Number(resolved.event.year) : null;
  }, [events, storedSel]);
  const recentYear = useMemo(() => {
    const mr = mostRecentEvent(events);
    return mr ? Number(mr.year) : null;
  }, [events]);
  const urlYear = params.year ? Number(params.year) : null;
  const selected = urlYear != null
    ? urlYear
    : (allYears || storedSel === ALL_SELECTION ? null : (sharedYear ?? recentYear ?? years[0] ?? null));
  const chooseAllYears = () => {
    setPillSelection(ALL_SELECTION);
    setAllYears(true);
    if (urlYear != null) navigate("/partners");
  };
  const clearAllSentinel = () => { if (getPillSelection() === ALL_SELECTION) setPillSelection(null); };
  const [partners, setPartners] = useState(null);
  useSeo(`TTFC partners ${selected || ""}`.trim(), "The partners of The Tech Festival Canada, across every city and edition.");

  useEffect(() => {
    let live = true;
    client
      .fetch(`*[_type == "partner" && active != false && showOnWebsite != false]{ _id, name, category, logo, url, logoScale, "eventIds": events[]._ref } | order(order asc)`)
      .then((rows) => { if (live) setPartners(rows || []); })
      .catch(() => { if (live) setPartners([]); });
    return () => { live = false; };
  }, []);

  const yearEventIds = new Set(events.filter((e) => Number(e.year) === selected).map((e) => e._id));
  const mine = selected == null
    ? (partners || [])
    : (partners || []).filter(
        (p) => !p.eventIds || p.eventIds.length === 0 || p.eventIds.some((id) => yearEventIds.has(id))
      );
  const groups = Object.entries(CATEGORY_TITLES)
    .map(([key, title]) => ({ key, title, items: mine.filter((p) => (p.category || "other") === key) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <SiteHeader />
      <main style={{ background: "#070313", color: "#f4f1ff", minHeight: "100vh", paddingTop: 76 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "44px 20px 64px" }}>
          <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(2rem, 5.5vw, 3.2rem)", fontWeight: 900, margin: 0 }}>
            Partners
          </h1>
          <p style={{ margin: "12px 0 0", opacity: 0.85, maxWidth: 640, lineHeight: 1.65 }}>
            The organisations behind The Tech Festival Canada, across every city. Partner and sponsor packages for each
            edition are announced with that event&rsquo;s pricing.
          </p>
          <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
            <button type="button" aria-pressed={selected == null} onClick={chooseAllYears}
              style={{
                padding: "8px 18px", borderRadius: 999, cursor: "pointer",
                fontFamily: "'Orbitron', sans-serif", fontSize: "0.72rem", fontWeight: 800, letterSpacing: 1,
                border: `1.5px solid ${selected == null ? "#f5a623" : "rgba(127,90,240,0.35)"}`,
                background: selected == null ? "rgba(245,166,35,0.14)" : "transparent",
                color: "inherit",
              }}>
              All years
            </button>
            <div style={{ display: "contents" }} onClick={clearAllSentinel}>
              <YearPills years={years} current={selected} basePath="/partners" />
            </div>
          </div>

          {partners === null ? (
            <p aria-busy="true" style={{ opacity: 0.7, marginTop: 30 }}>Loading partners…</p>
          ) : groups.length === 0 ? (
            <div style={{ marginTop: 30 }}>
              <AnnouncedSoon source={`partners:${selected || ""}`} title={`Partners ${selected || ""} — announced soon`}
                message="Partners for this edition haven't been announced yet. Leave your email and we'll keep you updated." />
            </div>
          ) : (
            groups.map((g) => (
              <section key={g.key} aria-label={g.title} style={{ marginTop: 38 }}>
                <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>{g.title}</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 18, alignItems: "center" }}>
                  {g.items.map((p) => {
                    const logo = p.logo?.asset ? urlFor(p.logo).width(320).quality(80).auto("format").url() : null;
                    const inner = logo
                      ? <img src={logo} alt={p.name} loading="lazy" style={{ height: 48, width: "auto", maxWidth: 190, objectFit: "contain" }} />
                      : <span style={{ fontWeight: 800 }}>{p.name}</span>;
                    return p.url
                      ? <a key={p._id} href={p.url} target="_blank" rel="noreferrer" aria-label={p.name} style={{ display: "inline-flex" }}>{inner}</a>
                      : <span key={p._id} style={{ display: "inline-flex" }}>{inner}</span>;
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
