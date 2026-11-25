import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import "./brand.css";
import BrandHeader from "./BrandHeader";
import BrandFooter from "./BrandFooter";
import useSeo from "../hooks/useSeo";
import { urlFor } from "../utils/sanity";
import { useHomePage } from "../lib/homePage";
import { compareEvents, eventPath, featuredEvent, lifecycleOf, ticketsOpen, useEvents } from "../lib/events";

/* The approved home page (redesign step 2). Every word and photo comes from the home page
   record in Admin › Content › Home page (with built-in wording until it is edited); the
   events strip comes from the event records; partner logos from the Partners page's
   featured row. */

const FALLBACK_PHOTOS = ["/ft-conference.jpg", "/ft-expo.jpg", "/ft-panel.webp", "/ft-audience.webp"];
const isInternal = (u) => typeof u === "string" && u.startsWith("/");

function Cta({ to, label, kind }) {
  if (!to || !label) return null;
  const cls = `tb-btn ${kind}`;
  return isInternal(to) ? <Link className={cls} to={to}>{label}</Link> : <a className={cls} href={to}>{label}</a>;
}

function whenOf(ev) {
  if (ev.startDate) return new Date(`${ev.startDate}T12:00:00`).toLocaleDateString("en-CA", { month: "long", year: "numeric" });
  return ev.statusNote ? String(ev.statusNote).split("·")[0].trim() : String(ev.year);
}

export default function BrandHome() {
  const { home, partners } = useHomePage();
  const { events } = useEvents();
  const featured = featuredEvent(events);
  useSeo(home.heroHeadline, home.heroText);
  const strip = useMemo(() => {
    const list = (events || []).filter((e) => Number(e.year) >= 2027).sort(compareEvents);
    const past = (events || []).find((e) => e.eventKey === "ttfc-2026-main");
    return past ? [...list, past] : list;
  }, [events]);
  const heroImg = home.heroImage?.asset ? urlFor(home.heroImage) : null;
  const photos = (home.highlightPhotos || []).filter((p) => p?.asset).slice(0, 6);
  const onSale = featured && featured.pricingAnnounced && ticketsOpen(featured);

  return (
    <div className="tb">
      <BrandHeader ev={featured} />
      <main>
        <section className="tb-hero" aria-labelledby="tb-home-title">
          {home.heroVideoUrl ? (
            <video className="tb-hero-img" src={home.heroVideoUrl} autoPlay muted loop playsInline poster={heroImg ? heroImg.width(1600).url() : "/hero-poster.jpg"} />
          ) : (
            <img className="tb-hero-img" alt="" src={heroImg ? heroImg.width(1600).quality(78).auto("format").url() : "/toronto-skyline.jpg"}
              srcSet={heroImg ? [640, 1024, 1600, 2200].map((w) => `${heroImg.width(w).quality(78).auto("format").url()} ${w}w`).join(", ") : undefined} sizes="100vw" />
          )}
          <div className="tb-hero-shade" aria-hidden="true" />
          <div className="tb-wrap" style={{ paddingTop: 96, paddingBottom: 88 }}>
            <span className="tb-eyebrow">{home.heroEyebrow}</span>
            <h1 id="tb-home-title" style={{ maxWidth: "20ch" }}>{home.heroHeadline}</h1>
            <p className="tb-hero-tag">{home.heroText}</p>
            <div className="tb-hero-ctas">
              <Cta to={home.primaryCtaUrl} label={home.primaryCtaLabel} kind="tb-btn-gold" />
              <Cta to={home.secondaryCtaUrl} label={home.secondaryCtaLabel} kind="tb-btn-ghost" />
            </div>
          </div>
        </section>

        {onSale && (
          <section className="tb-section" style={{ paddingBottom: 0 }}>
            <div className="tb-wrap">
              <div className="tb-onsale">
                <span>Tickets on sale now: <b>{featured.name}</b> · {whenOf(featured)}</span>
                <Link className="tb-btn tb-btn-gold tb-btn-sm" to={eventPath(featured)}>See the event</Link>
              </div>
            </div>
          </section>
        )}

        <section className="tb-section" aria-labelledby="tb-events-h">
          <div className="tb-wrap">
            <div className="tb-head">
              <div>
                <h2 id="tb-events-h" className="tb-h2">{home.eventsHeading}</h2>
                {home.eventsText && <p className="tb-lede">{home.eventsText}</p>}
              </div>
            </div>
            <div className="tb-event-grid">
              {strip.map((ev) => {
                const past = lifecycleOf(ev) === "past";
                const img = ev.heroImage?.asset ? urlFor(ev.heroImage).width(720).height(440).fit("crop").quality(75).auto("format").url() : null;
                return (
                  <Link key={ev._id} to={eventPath(ev)} className={`tb-event-card${past ? " is-past" : ""}`}>
                    <span className="tb-event-photo" style={img ? { backgroundImage: `url(${img})` } : undefined} />
                    <span className="tb-event-body">
                      <span className="tb-event-when">{past ? "Past event · " : ""}{whenOf(ev)}</span>
                      <b>{ev.name}</b>
                      <span>{ev.theme || (ev.type === "main-event" ? "Two days · the national gathering" : "One-day Briefing")}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="tb-section tb-section-soft" aria-labelledby="tb-highlights-h">
          <div className="tb-wrap" style={{ display: "grid", gap: 28 }}>
            <div className="tb-head" style={{ marginBottom: 0 }}>
              <div>
                <h2 id="tb-highlights-h" className="tb-h2">{home.highlightsHeading}</h2>
                {home.highlightsText && <p className="tb-lede">{home.highlightsText}</p>}
              </div>
              {home.recapVideoUrl && <a className="tb-link" href={home.recapVideoUrl} target="_blank" rel="noreferrer">Watch the recap →</a>}
            </div>
            <div className="tb-stats">
              {(home.stats || []).map((st) => (
                <div key={st._key || st.label} className="tb-card"><b>{Number(st.value).toLocaleString("en-CA")}{st.suffix || ""}</b><span>{st.label}</span></div>
              ))}
            </div>
            <div className="tb-photo-grid">
              {(photos.length ? photos.map((p) => urlFor(p).width(800).height(560).fit("crop").quality(75).auto("format").url()) : FALLBACK_PHOTOS)
                .map((src, i) => <img key={src} src={src} alt={photos[i]?.alt || ""} loading="lazy" />)}
            </div>
            <div className="tb-report">
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>{home.reportTitle}</h3>
                <p style={{ margin: "6px 0 0", color: "var(--tb-muted)" }}>{home.reportText}</p>
              </div>
              <Cta to={home.reportUrl} label="See the highlights" kind="tb-btn-magenta" />
            </div>
          </div>
        </section>

        {partners.length > 0 && (
          <section className="tb-section" aria-labelledby="tb-partners-h">
            <div className="tb-wrap">
              <div className="tb-head">
                <h2 id="tb-partners-h" className="tb-h2">{home.partnersHeading}</h2>
                <Link className="tb-link" to="/partners">All partners →</Link>
              </div>
              <div className="tb-logo-row">
                {partners.slice(0, 12).map((p) => p.logo?.asset && (
                  <img key={p._id} src={urlFor(p.logo).height(96).fit("max").auto("format").url()} alt={p.name} loading="lazy" />
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="tb-section tb-section-navy" aria-labelledby="tb-home-partner-h">
          <div className="tb-wrap tb-partner">
            <div>
              <h2 id="tb-home-partner-h" className="tb-h2">{home.partnerCtaHeading}</h2>
              <p className="tb-lede">{home.partnerCtaText}</p>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link className="tb-btn tb-btn-gold" to="/sponsor">Partner with us</Link>
              <Link className="tb-btn tb-btn-ghost" to="/exhibit">Exhibit</Link>
            </div>
          </div>
        </section>
      </main>
      <BrandFooter />
    </div>
  );
}
