import React, { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import EventHero from "../components/EventHero";
import TicketsBlock from "../components/TicketsBlock";
import EventFaqs from "../components/EventFaqs";
import SpeakerCard, { speakerPathIn, speakerPhoto } from "../components/SpeakerCard";
import Reveal, { GradientRule } from "../components/Reveal";
import PortableText, { PlainParagraphs } from "../components/PortableText";
import AnnouncedSoon from "../components/AnnouncedSoon";
import NotFound from "./NotFound";
import useSeo from "../hooks/useSeo";
import { urlFor } from "../utils/sanity";
import { speakerSlug } from "../seo/slug";
import {
  LIFECYCLE_LABEL, cityBySlug, eventAgendaPath, eventPath, eventSpeakersPath,
  eventTicketsPath, findEvent, formatDateRange, lifecycleOf, pastEditionLabel,
  useEventContent, useEvents, usePastEditionFallback,
} from "../lib/events";

/* =========================================================
   One event, one template (Phase 4): "same skeleton,
   different size — no event feels second-class." A Briefing
   and the Main Event render the same landing; the Main Event
   only adds depth (Day 1 / Day 2 tabs on its agenda).
   Sections: hero · about · agenda highlights · speakers ·
   partners · contextual tickets · gallery · brochure · its
   own FAQs · one quiet app line. A Past event's landing is
   highlights + gallery only, tickets off.

   No empty sections (2026-11-15): an event whose own agenda
   or speakers are not published yet shows the previous
   edition's (Toronto Main Event 2026), banner-labelled as
   borrowed — on this landing and on its agenda / speakers
   subpages alike. See usePastEditionFallback in lib/events.

   Visual enrichment: the template borrows the home page's
   own language — full-bleed cinematic hero, brand aurora
   washes, alternating dark / violet-band / light sections,
   photo-forward cards, a logo wall, a full-bleed photo
   strip, and Home.jsx's blur-rise reveal on scroll. The IA
   is unchanged: same sections, same order, same words —
   richness comes from media, colour, motion and layout.
========================================================= */

const wrap = { maxWidth: 1200, margin: "0 auto", padding: "0 20px" };
const h2 = { fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(1.9rem, 4.6vw, 2.9rem)", fontWeight: 900, letterSpacing: "-0.01em", margin: 0 };

const LANDING_CSS = `
  /* Agenda highlight cards */
  .ev-cards { display: grid; gap: 18px; grid-template-columns: 1fr; }
  @media (min-width: 720px) { .ev-cards { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1080px) {
    .ev-cards { grid-template-columns: repeat(3, 1fr); }
    .ev-cards .ev-wide { grid-column: span 2; }
  }
  .ev-session-card {
    height: 100%; display: flex; flex-direction: column; overflow: hidden; border-radius: 20px;
    background: rgba(255,255,255,0.045); border: 1px solid rgba(155,135,245,0.20);
    transition: transform .35s ease, box-shadow .35s ease, border-color .35s ease;
  }
  @media (hover: hover) and (pointer: fine) {
    .ev-session-card:hover { transform: translateY(-5px); box-shadow: 0 22px 48px rgba(2,0,10,0.5); border-color: rgba(155,135,245,0.45); }
    .ev-session-card:hover .ev-session-media img { transform: scale(1.06); }
  }
  .ev-session-media { position: relative; aspect-ratio: 16 / 9; overflow: hidden; flex-shrink: 0; }
  .ev-session-media img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .6s ease; }
  .ev-session-fallback {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; overflow: hidden;
  }
  .ev-session-fallback::after {
    content: ""; position: absolute; inset: 0;
    background-image: radial-gradient(rgba(255,255,255,0.13) 1px, transparent 1.6px);
    background-size: 18px 18px;
  }
  .ev-session-initials {
    font-family: 'Orbitron', sans-serif; font-weight: 900; letter-spacing: 0.04em;
    font-size: clamp(2.6rem, 6vw, 4rem); color: rgba(255,255,255,0.30); position: relative; z-index: 1;
  }
  .ev-chip {
    position: absolute; z-index: 2; padding: 5px 11px; border-radius: 999px;
    font-size: 0.68rem; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase;
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  }
  .ev-chip-type { left: 12px; bottom: 12px; background: rgba(10,4,26,0.62); border: 1px solid rgba(255,255,255,0.22); color: #fff; }
  .ev-chip-star { right: 12px; top: 12px; background: rgba(245,166,35,0.88); color: #23130a; }
  .ev-session-desc {
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
  }
  /* Speakers grid hover (cards themselves come from SpeakerCard) */
  .ev-speaker-grid article { height: 100%; transition: transform .35s ease, box-shadow .35s ease; }
  @media (hover: hover) and (pointer: fine) {
    .ev-speaker-grid article:hover { transform: translateY(-5px); box-shadow: 0 18px 42px rgba(2,0,10,0.48); }
  }
  /* Partners logo wall (mirrors PartnerMarquee's white tiles) */
  .ev-logo-wall { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
  .ev-logo-tile {
    background: #ffffff; border-radius: 16px; min-height: 96px; padding: 18px 22px;
    display: flex; align-items: center; justify-content: center;
    border: 1px solid rgba(23,11,51,0.07); box-shadow: 0 2px 14px rgba(23,11,51,0.08);
    transition: transform .3s ease, box-shadow .3s ease;
  }
  @media (hover: hover) and (pointer: fine) {
    .ev-logo-tile:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(23,11,51,0.14); }
  }
  /* Full-bleed gallery strip */
  .ev-gallery-viewport { overflow: hidden; }
  .ev-gallery-track { display: flex; width: max-content; animation: ev-gallery-scroll 72s linear infinite; }
  @media (hover: hover) and (pointer: fine) {
    .ev-gallery-viewport:hover .ev-gallery-track { animation-play-state: paused; }
  }
  @keyframes ev-gallery-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  .ev-gallery-img {
    height: clamp(220px, 30vw, 330px); aspect-ratio: 4 / 3; object-fit: cover;
    border-radius: 16px; margin-right: 14px; display: block; flex-shrink: 0;
  }
  .ev-gallery-row { display: flex; gap: 14px; padding: 0 14px; }
  .ev-gallery-row .ev-gallery-img { flex: 1 1 0; width: 100%; min-width: 0; margin-right: 0; }
  @media (prefers-reduced-motion: reduce) {
    .ev-gallery-track { animation: none; }
    .ev-gallery-viewport { overflow-x: auto; }
  }
  /* Brochure card */
  .ev-brochure {
    display: flex; justify-content: space-between; align-items: center; gap: 16px;
    padding: 20px 24px; border-radius: 18px; text-decoration: none; color: inherit; font-weight: 700;
    background: linear-gradient(120deg, rgba(127,90,240,0.16), rgba(245,166,35,0.10));
    border: 1px solid rgba(127,90,240,0.32);
    transition: transform .3s ease, box-shadow .3s ease;
  }
  @media (hover: hover) and (pointer: fine) {
    .ev-brochure:hover { transform: translateY(-2px); box-shadow: 0 14px 34px rgba(2,0,10,0.4); }
  }
`;

/** A landing section with the page's rhythm: the deep page tone,
    a violet aurora band, or a light band (the partners wall). */
function Section({ tone = "dark", label, id, children }) {
  const tones = {
    dark: { background: "transparent", color: "#f4f1ff" },
    band: {
      background:
        "radial-gradient(720px 340px at 12% 0%, rgba(127,90,240,0.20), transparent 70%)," +
        "radial-gradient(640px 300px at 88% 100%, rgba(245,166,35,0.07), transparent 70%)," +
        "linear-gradient(180deg, #150a33 0%, #0b0522 55%, #070313 100%)",
      color: "#f4f1ff",
    },
    light: { background: "linear-gradient(180deg, #f7f4ff 0%, #eee8ff 100%)", color: "#170b33" },
  };
  return (
    <section aria-label={label} id={id} style={{ position: "relative", padding: "clamp(56px, 8vw, 96px) 0", ...tones[tone] }}>
      {children}
    </section>
  );
}

function SectionHead({ title, children }) {
  return (
    <Reveal>
      <h2 style={h2}>{title}</h2>
      <GradientRule style={{ marginTop: 16 }} />
      {children}
    </Reveal>
  );
}

function SessionRow({ s }) {
  const people = [...(s.speakers || []), ...(s.moderator?.name ? [{ ...s.moderator, org: s.moderator.org }] : [])];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 14, padding: "14px 0", borderBottom: "1px solid rgba(127,90,240,0.14)" }}>
      <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.8rem", fontWeight: 700, opacity: 0.85 }}>
        {s.time}{s.endTime ? `–${s.endTime}` : ""}
      </div>
      <div>
        <div style={{ fontWeight: 700 }}>
          {s.featured ? "★ " : ""}{s.title}
          {s.type ? <span style={{ marginLeft: 10, fontSize: "0.72rem", fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", padding: "3px 9px", borderRadius: 999, background: "rgba(127,90,240,0.16)" }}>{s.type}</span> : null}
        </div>
        {people.length > 0 && (
          <div style={{ marginTop: 4, fontSize: "0.88rem", opacity: 0.78 }}>
            {people.map((p) => (p.org ? `${p.name} (${p.org})` : p.name)).join(" · ")}
          </div>
        )}
        {s.stage && <div style={{ marginTop: 2, fontSize: "0.82rem", opacity: 0.6 }}>{s.stage}</div>}
        {s.description && <p style={{ margin: "8px 0 0", fontSize: "0.92rem", lineHeight: 1.6, opacity: 0.85 }}>{s.description}</p>}
      </div>
    </div>
  );
}

const CARD_GRADIENTS = [
  "linear-gradient(135deg, #2a1160 0%, #7a3fd1 55%, #e8458b 135%)",
  "linear-gradient(135deg, #1b0b45 0%, #5b2bb0 52%, #f5a623 140%)",
  "linear-gradient(135deg, #12082f 0%, #3d1a86 55%, #7a3fd1 125%)",
];
function gradientFor(seed) {
  let h = 0;
  const s = String(seed || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return CARD_GRADIENTS[h % CARD_GRADIENTS.length];
}
function initialsFor(s) {
  const words = String(s.stage || s.title || "TTFC").split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "T";
}

/** A photo-forward agenda card for the landing's highlights. Sessions
    carry no image of their own in Sanity, so the card borrows the
    photo of its first speaker (agenda names match the Speakers list
    by design); with no photo it wears a brand-gradient treatment
    with the stage's initials — never a grey empty box. Every line
    the agenda row shows (time, type, people, stage, description)
    is on the card. */
function SessionCard({ s, speakersByName }) {
  const people = [...(s.speakers || []), ...(s.moderator?.name ? [{ ...s.moderator, org: s.moderator.org }] : [])];
  const lead = people.map((p) => speakersByName.get(speakerSlug(p.name))).find((sp) => sp?.image?.asset);
  const photo = lead ? speakerPhoto(lead.image, 880, 495) : null;
  return (
    <article className="ev-session-card">
      <div className="ev-session-media">
        {photo ? (
          <img src={photo} alt={lead.image?.alt || lead.name} loading="lazy" />
        ) : (
          <div className="ev-session-fallback" style={{ background: gradientFor(s._id || s.title) }} aria-hidden="true">
            <span className="ev-session-initials">{initialsFor(s)}</span>
          </div>
        )}
        {s.type ? <span className="ev-chip ev-chip-type">{s.type}</span> : null}
        {s.featured ? <span className="ev-chip ev-chip-star">★ Featured</span> : null}
      </div>
      <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.74rem", fontWeight: 800, letterSpacing: 1.2, color: "#f5c86e" }}>
          {s.time}{s.endTime ? `–${s.endTime}` : ""}{s.stage ? ` · ${s.stage}` : ""}
        </div>
        <h3 style={{ margin: "9px 0 0", fontSize: "1.08rem", fontWeight: 800, lineHeight: 1.35 }}>{s.title}</h3>
        {people.length > 0 && (
          <div style={{ marginTop: 7, fontSize: "0.88rem", opacity: 0.78 }}>
            {people.map((p) => (p.org ? `${p.name} (${p.org})` : p.name)).join(" · ")}
          </div>
        )}
        {s.description && (
          <p className="ev-session-desc" style={{ margin: "9px 0 0", fontSize: "0.92rem", lineHeight: 1.6, opacity: 0.85 }}>{s.description}</p>
        )}
      </div>
    </article>
  );
}

/** The partners logo wall: white tiles on a light band, the way
    PartnerMarquee presents logos elsewhere on the site. */
function PartnersWall({ partners }) {
  if (!partners.length) return null;
  return (
    <Section tone="light" label="Partners">
      <div style={wrap}>
        <SectionHead title="Partners" />
        <div className="ev-logo-wall" style={{ marginTop: 32 }}>
          {partners.map((p) => {
            const logo = p.logo?.asset ? urlFor(p.logo).width(320).quality(80).auto("format").url() : null;
            const tile = (
              <div className="ev-logo-tile">
                {logo ? (
                  <img src={logo} alt={p.name} loading="lazy" style={{ height: 44, width: "auto", maxWidth: 180, objectFit: "contain", transform: `scale(${Math.min(2.5, Math.max(0.3, (Number(p.logoScale) || 100) / 100))})` }} />
                ) : (
                  <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, color: "#170b33", textAlign: "center" }}>{p.name}</span>
                )}
              </div>
            );
            return p.url ? (
              <a key={p._id} href={p.url} target="_blank" rel="noreferrer" aria-label={p.name} style={{ display: "block", textDecoration: "none" }}>{tile}</a>
            ) : (
              <div key={p._id}>{tile}</div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

/* The site's own festival photography (public/, as used on the
   Resources page) — the gallery strip's ambience for an event
   that has no photos of its own yet. */
const FESTIVAL_PHOTOS = [
  { src: "/ft-conference.jpg", alt: "Keynote presentation at The Tech Festival Canada" },
  { src: "/ft-expo.jpg", alt: "The Tech Festival Canada expo and networking floor" },
  { src: "/ft-gala.jpg", alt: "Gala dinner and networking reception at The Tech Festival Canada" },
  { src: "/ft-awards.jpg", alt: "Canada Tech Titans Awards Night ceremony" },
  { src: "/ft-breakfast.jpg", alt: "CxO breakfast with senior leaders at The Tech Festival Canada" },
  { src: "/ft-audience.webp", alt: "The audience at The Tech Festival Canada" },
  { src: "/ft-panel.webp", alt: "A panel discussion at The Tech Festival Canada" },
  { src: "/ft-clinic.jpg", alt: "Inside a clinic session at The Tech Festival Canada" },
];

/** A full-bleed photo strip: the event's own gallery as a slow
    marquee (a still row when there are only a few), or — when the
    event has no gallery yet — the festival's own photography
    under an honest heading. */
function GalleryStrip({ ev }) {
  const own = (ev.gallery || []).filter((g) => g?.asset);
  const usingOwn = own.length > 0;
  const photos = usingOwn
    ? own.map((g, i) => ({
        key: `own-${i}`,
        src: urlFor(g).width(1080).quality(80).auto("format").url(),
        srcSet: [480, 720, 1080].map((w) => `${urlFor(g).width(w).quality(80).auto("format").url()} ${w}w`).join(", "),
        alt: g.alt || `${ev.name} — photo ${i + 1}`,
      }))
    : FESTIVAL_PHOTOS.map((p, i) => ({ key: `fest-${i}`, src: p.src, alt: p.alt }));
  const title = usingOwn ? "Gallery" : "The festival in pictures";
  const marquee = photos.length >= 4;
  return (
    <Section label={title}>
      <div style={wrap}>
        <SectionHead title={title} />
      </div>
      <div className="ev-gallery-viewport" style={{ marginTop: 32 }}>
        {marquee ? (
          <div className="ev-gallery-track">
            {[...photos, ...photos].map((p, i) => (
              <img key={`${p.key}-${i}`} src={p.src} srcSet={p.srcSet} sizes="440px" alt={i < photos.length ? p.alt : ""} aria-hidden={i >= photos.length} loading="lazy" className="ev-gallery-img" />
            ))}
          </div>
        ) : (
          <div className="ev-gallery-row">
            {photos.map((p) => (
              <img key={p.key} src={p.src} srcSet={p.srcSet} sizes="(max-width: 640px) 90vw, 400px" alt={p.alt} loading="lazy" className="ev-gallery-img" />
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

const AppLine = () => (
  <p style={{ ...wrap, paddingTop: 28, fontSize: "0.92rem", opacity: 0.72 }}>
    Coming? Get the TTFC app for your pass, the schedule and live updates —{" "}
    <a href="/app/install?from=event" style={{ color: "inherit", fontWeight: 700 }}>download the app</a>.
  </p>
);

/** The past-edition notice: sits at the top of a section that is
    borrowing the previous edition's content, so the borrowed
    sessions / speakers are never mistaken for this event's own.
    Text only — it adds no calls to action. */
function PastEditionBanner({ kind, ev, source }) {
  const edition = pastEditionLabel(source);
  const city = source?.city || "Toronto";
  return (
    <div role="note" style={{ padding: "18px 22px", borderRadius: 16, background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.38)" }}>
      <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "0.98rem", letterSpacing: 0.3 }}>
        From the {edition}
      </div>
      <p style={{ margin: "8px 0 0", fontSize: "0.95rem", lineHeight: 1.65, opacity: 0.92 }}>
        {kind === "agenda" ? (
          <>The {ev.name} agenda will be published here as it&rsquo;s confirmed. Until then, here&rsquo;s the agenda from the most recent edition, in {city}.</>
        ) : (
          <>The {ev.name} speaker lineup will be announced here. Until then, meet some of the speakers from the {edition}.</>
        )}
      </p>
    </div>
  );
}

/** The shared landing template. `below` renders extra sections (the home page's city list). */
export function EventTemplate({ ev, below, heroHeadingAs }) {
  const { sessions, speakers, partners, loading } = useEventContent(ev);
  const fb = usePastEditionFallback(ev);
  const lifecycle = lifecycleOf(ev);
  const past = lifecycle === "past";
  const base = eventPath(ev);
  /* No empty sections: an event with no agenda / speakers of its
     own yet shows the previous edition's, banner-labelled as such.
     The decision waits for both fetches to settle, so an event
     with its own content never flashes the borrowed edition. */
  const settled = !loading && !fb.loading;
  const agendaFallback = settled && !fb.isSource && sessions.length === 0 && fb.sessions.length > 0;
  const speakersFallback = settled && !fb.isSource && speakers.length === 0 && fb.speakers.length > 0;
  const edition = pastEditionLabel(fb.source);
  const shownSessions = agendaFallback ? fb.sessions : sessions;
  const shownSpeakers = speakersFallback ? fb.speakers : speakers;
  const highlights = useMemo(() => {
    const featured = shownSessions.filter((s) => s.featured);
    return (featured.length ? featured : shownSessions).slice(0, 6);
  }, [shownSessions]);
  const speakersByName = useMemo(
    () => new Map(shownSpeakers.map((sp) => [speakerSlug(sp.name), sp])),
    [shownSpeakers]
  );

  return (
    <>
      <EventHero ev={ev} headingAs={heroHeadingAs} />
      <div style={{ ...wrap, paddingTop: 22, display: "flex", flexWrap: "wrap", gap: "8px 22px", fontSize: "0.92rem", opacity: 0.85 }}>
        {/* The status strip, as a glass bar floating over the hero's
            base — the same glass treatment as the home hero's pill.
            The bar rides inside the template's original status row;
            its own -68 margin (the row's 22px padding + 46) pulls it
            up over the hero exactly as the standalone bar did. */}
        <Reveal style={{ flex: "1 1 100%" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 26px", padding: "16px 22px", borderRadius: 18, fontSize: "0.92rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 14px 38px rgba(2,0,10,0.4)", position: "relative", zIndex: 3, marginTop: -68 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
              <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: "linear-gradient(135deg, #7a3fd1, #f5a623)", flexShrink: 0 }} />
              {LIFECYCLE_LABEL[lifecycle]}
            </span>
            {ev.venueName && <span style={{ opacity: 0.88 }}>{ev.venueName}{ev.venueAddress ? ` — ${ev.venueAddress}` : ""}</span>}
            {ev.statusNote && <span style={{ opacity: 0.88 }}>{ev.statusNote}</span>}
          </div>
        </Reveal>
      </div>

      {ev.description && (
        <Section label="About this event">
          <div style={{ ...wrap, maxWidth: 880, position: "relative" }}>
            <div aria-hidden="true" style={{ position: "absolute", inset: "-30px -60px", background: "radial-gradient(560px 260px at 12% 0%, rgba(127,90,240,0.15), transparent 70%)", pointerEvents: "none" }} />
            <Reveal>
              {String(ev.description).split(/\n\s*\n/).filter(Boolean).map((p, i) => (
                <p key={i} style={i === 0
                  ? { margin: 0, position: "relative", fontSize: "clamp(1.24rem, 2.4vw, 1.55rem)", lineHeight: 1.6, fontWeight: 500 }
                  : { margin: "16px 0 0", position: "relative", fontSize: "1.05rem", lineHeight: 1.7, opacity: 0.92 }}>
                  {p}
                </p>
              ))}
            </Reveal>
          </div>
        </Section>
      )}

      {!past && highlights.length > 0 && (
        <Section tone="band" label="Agenda highlights">
          <div style={wrap}>
            <SectionHead title={agendaFallback ? `Agenda · ${edition}` : "Agenda highlights"} />
            {agendaFallback && (
              <div style={{ marginTop: 24 }}>
                <PastEditionBanner kind="agenda" ev={ev} source={fb.source} />
              </div>
            )}
            <div className="ev-cards" style={{ marginTop: 32 }}>
              {highlights.map((s, i) => (
                <Reveal key={s._id} delay={Math.min(i, 5) * 0.06} className={i === 0 && highlights.length > 2 ? "ev-wide" : undefined} style={{ height: "100%" }}>
                  <SessionCard s={s} speakersByName={speakersByName} />
                </Reveal>
              ))}
            </div>
            <p style={{ marginTop: 24 }}><Link to={eventAgendaPath(ev)} style={{ fontWeight: 700, color: "inherit" }}>See the full agenda →</Link></p>
          </div>
        </Section>
      )}

      {!past && shownSpeakers.length > 0 && (
        <Section label="Speakers">
          <div style={wrap}>
            <SectionHead title={speakersFallback ? `Speakers · ${edition}` : "Speakers"} />
            {speakersFallback && (
              <div style={{ marginTop: 24 }}>
                <PastEditionBanner kind="speakers" ev={ev} source={fb.source} />
              </div>
            )}
            <div className="ev-speaker-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginTop: 32 }}>
              {shownSpeakers.slice(0, 8).map((sp, i) => (
                <Reveal key={sp._id} delay={Math.min(i, 7) * 0.05} style={{ height: "100%" }}>
                  {/* Borrowed speakers render unlinked: their profiles
                      live under the previous edition, not this event. */}
                  <SpeakerCard speaker={sp} to={speakersFallback ? undefined : speakerPathIn(base, sp)} />
                </Reveal>
              ))}
            </div>
            {shownSpeakers.length > 8 && (
              <p style={{ marginTop: 20 }}><Link to={eventSpeakersPath(ev)} style={{ fontWeight: 700, color: "inherit" }}>All speakers →</Link></p>
            )}
          </div>
        </Section>
      )}

      {!past && <PartnersWall partners={partners} />}

      {!past && (
        <Section tone="band" label="Tickets" id="tickets">
          <div style={wrap}>
            <SectionHead title={`Tickets — ${ev.name}`}>
              <p style={{ margin: "14px 0 0", opacity: 0.8, fontSize: "0.95rem" }}>
                {formatDateRange(ev)}{ev.venueName ? ` · ${ev.venueName}` : ""}
              </p>
            </SectionHead>
            <div style={{ marginTop: 26 }}>
              <TicketsBlock ev={ev} />
            </div>
          </div>
        </Section>
      )}

      <GalleryStrip ev={ev} />
      {past && (
        <Section label="Tickets">
          <div style={wrap}><TicketsBlock ev={ev} /></div>
        </Section>
      )}

      {ev.brochureUrl && (
        <div style={{ ...wrap, paddingTop: 4, paddingBottom: 4 }}>
          <Reveal>
            <a href={ev.brochureUrl} target="_blank" rel="noreferrer" className="ev-brochure">
              <span>Download the event brochure (PDF)</span>
              <span aria-hidden="true">→</span>
            </a>
          </Reveal>
        </div>
      )}

      {below}
      {!past && <EventFaqs ev={ev} />}
      <AppLine />
      <style>{LANDING_CSS}</style>
    </>
  );
}

/* ---------------- Subpages ---------------- */

function PageShell({ ev, title, children }) {
  return (
    <>
      <SiteHeader />
      <main style={{ background: "#070313", color: "#f4f1ff", minHeight: "100vh", paddingTop: 76 }}>
        <div style={{ background: "radial-gradient(680px 260px at 16% -60px, rgba(127,90,240,0.24), transparent 70%)", borderBottom: "1px solid rgba(127,90,240,0.14)" }}>
          <div style={{ ...wrap, paddingTop: 38, paddingBottom: 30 }}>
            <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.75 }}>
              <Link to={eventPath(ev)} style={{ color: "inherit", fontWeight: 700 }}>{ev.name}</Link>
              {" · "}{formatDateRange(ev)}{ev.venueName ? ` · ${ev.venueName}` : ""}
            </p>
            <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(1.9rem, 5vw, 3rem)", fontWeight: 900, margin: "12px 0 0" }}>{title}</h1>
            <GradientRule style={{ marginTop: 16 }} />
          </div>
        </div>
        {children}
        <div style={{ paddingBottom: 56 }} />
      </main>
      <Footer />
    </>
  );
}

function AgendaPage({ ev }) {
  const { sessions, loading } = useEventContent(ev);
  const fb = usePastEditionFallback(ev);
  /* Same no-empty-pages rule as the landing: no agenda of its own
     yet → the previous edition's, banner-labelled. */
  const fallback = !loading && !fb.loading && !fb.isSource && sessions.length === 0 && fb.sessions.length > 0;
  const shown = fallback ? fb.sessions : sessions;
  const days = useMemo(() => [...new Set(shown.map((s) => s.day || 1))].sort((a, b) => a - b), [shown]);
  const [day, setDay] = useState(null);
  const activeDay = day ?? days[0];
  const showTabs = ev.type === "main-event" || days.length > 1;
  useSeo(`${ev.name} agenda`, `The agenda for ${ev.name}: sessions, speakers and stages.`);
  return (
    <PageShell ev={ev} title={fallback ? `Agenda · ${pastEditionLabel(fb.source)}` : "Agenda"}>
      <div style={wrap}>
        {fallback && (
          <div style={{ margin: "18px 0 6px" }}>
            <PastEditionBanner kind="agenda" ev={ev} source={fb.source} />
          </div>
        )}
        {showTabs && days.length > 1 && (
          <div role="tablist" aria-label="Day" style={{ display: "flex", gap: 8, margin: "14px 0 6px" }}>
            {days.map((d) => (
              <button key={d} role="tab" aria-selected={d === activeDay} onClick={() => setDay(d)}
                style={{ padding: "9px 20px", borderRadius: 999, cursor: "pointer", fontFamily: "'Orbitron', sans-serif", fontSize: "0.72rem", fontWeight: 800, letterSpacing: 1,
                  border: `1.5px solid ${d === activeDay ? "#f5a623" : "rgba(127,90,240,0.35)"}`,
                  background: d === activeDay ? "rgba(245,166,35,0.14)" : "transparent", color: "inherit" }}>
                Day {d}
              </button>
            ))}
          </div>
        )}
        {loading ? <p aria-busy="true" style={{ opacity: 0.7 }}>Loading the agenda…</p>
          : shown.length === 0 ? <p style={{ opacity: 0.75 }}>Sessions, speakers and stages will be published here as the agenda is confirmed.</p>
          : shown.filter((s) => !showTabs || (s.day || 1) === activeDay).map((s) => <SessionRow key={s._id} s={s} />)}
      </div>
      <EventFaqs ev={ev} />
    </PageShell>
  );
}

function SpeakersPage({ ev }) {
  const { speakers, loading } = useEventContent(ev);
  const fb = usePastEditionFallback(ev);
  /* Same no-empty-pages rule as the landing: no lineup of its own
     yet → the previous edition's, banner-labelled. */
  const fallback = !loading && !fb.loading && !fb.isSource && speakers.length === 0 && fb.speakers.length > 0;
  const shown = fallback ? fb.speakers : speakers;
  useSeo(`${ev.name} speakers`, `Who is speaking at ${ev.name}.`);
  return (
    <PageShell ev={ev} title={fallback ? `Speakers · ${pastEditionLabel(fb.source)}` : "Speakers"}>
      <div style={wrap}>
        {fallback && (
          <div style={{ margin: "18px 0 6px" }}>
            <PastEditionBanner kind="speakers" ev={ev} source={fb.source} />
          </div>
        )}
        {loading ? <p aria-busy="true" style={{ opacity: 0.7 }}>Loading speakers…</p>
          : shown.length === 0 ? <p style={{ opacity: 0.75 }}>The speaker lineup will be announced here — expect the people deploying this technology, not just describing it.</p>
          : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginTop: 12 }}>
              {shown.map((sp) => <SpeakerCard key={sp._id} speaker={sp} to={fallback ? undefined : speakerPathIn(eventPath(ev), sp)} />)}
            </div>
          )}
      </div>
      <EventFaqs ev={ev} />
    </PageShell>
  );
}

function SpeakerDetailPage({ ev, slug }) {
  const { speakers, sessions, loading } = useEventContent(ev);
  const speaker = speakers.find((sp) => speakerSlug(sp.name) === slug);
  useSeo(speaker ? `${speaker.name} — ${ev.name}` : ev.name, speaker?.shortBio || speaker?.bio || "");
  if (loading) {
    return <PageShell ev={ev} title="Speaker"><div style={wrap}><p aria-busy="true" style={{ opacity: 0.7 }}>Loading…</p></div></PageShell>;
  }
  if (!speaker) return <Navigate to={eventSpeakersPath(ev)} replace />;
  const mine = sessions.filter((s) => (s.speakers || []).some((p) => speakerSlug(p.name) === slug));
  const banner = speaker.bannerImage?.asset ? urlFor(speaker.bannerImage).width(1600).quality(80).auto("format").url() : null;
  const photo = speaker.image?.asset ? urlFor(speaker.image).width(640).height(800).fit("crop").quality(80).auto("format").url() : null;
  return (
    <PageShell ev={ev} title={speaker.name}>
      {banner && (
        <div style={{ ...wrap, marginTop: 10 }}>
          <img src={banner} alt={speaker.bannerImage?.alt || ""} loading="lazy"
            style={{ width: "100%", aspectRatio: "16 / 6", objectFit: "cover", borderRadius: 18, display: "block" }} />
        </div>
      )}
      <div style={{ ...wrap, display: "grid", gridTemplateColumns: "minmax(0, 300px) 1fr", gap: 28, marginTop: 24 }} className="sp-detail-grid">
        <style>{`@media (max-width: 720px) { .sp-detail-grid { grid-template-columns: 1fr !important; } }`}</style>
        <div>
          {photo && <img src={photo} alt={speaker.image?.alt || speaker.name} style={{ width: "100%", aspectRatio: "4 / 5", objectFit: "cover", borderRadius: 18, display: "block" }} />}
          <p style={{ margin: "14px 0 0", fontWeight: 700 }}>{[speaker.title, speaker.company].filter(Boolean).join(" · ")}</p>
          <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: "0.9rem" }}>
            {speaker.linkedin && <a href={speaker.linkedin} target="_blank" rel="noreferrer" style={{ color: "inherit", fontWeight: 700 }}>LinkedIn</a>}
            {speaker.twitter && <a href={speaker.twitter} target="_blank" rel="noreferrer" style={{ color: "inherit", fontWeight: 700 }}>X</a>}
            {speaker.website && <a href={speaker.website} target="_blank" rel="noreferrer" style={{ color: "inherit", fontWeight: 700 }}>Website</a>}
          </div>
        </div>
        <div style={{ fontSize: "1rem", lineHeight: 1.7 }}>
          {Array.isArray(speaker.fullBio) && speaker.fullBio.length > 0
            ? <PortableText value={speaker.fullBio} />
            : <PlainParagraphs text={speaker.shortBio || speaker.bio} />}
          {mine.length > 0 && (
            <>
              <h2 style={{ ...h2, fontSize: "1.15rem", marginTop: 30 }}>On stage at this event</h2>
              {mine.map((s) => <SessionRow key={s._id} s={s} />)}
            </>
          )}
          <p style={{ marginTop: 26 }}><Link to={eventSpeakersPath(ev)} style={{ fontWeight: 700, color: "inherit" }}>← All speakers</Link></p>
        </div>
      </div>
    </PageShell>
  );
}

function TicketsPage({ ev }) {
  useSeo(`${ev.name} tickets`, `Tickets for ${ev.name}: types, what's included, and booking.`);
  return (
    <PageShell ev={ev} title="Tickets">
      <div style={wrap}>
        <p style={{ margin: "0 0 20px", opacity: 0.85 }}>
          {ev.name} · {formatDateRange(ev)}{ev.venueName ? ` · ${ev.venueName}` : ""}{ev.venueAddress ? ` — ${ev.venueAddress}` : ""}
        </p>
        <TicketsBlock ev={ev} />
      </div>
      <div style={{ paddingTop: 40 }}><EventFaqs ev={ev} /></div>
    </PageShell>
  );
}

/* ---------------- Route wrapper ---------------- */

export default function EventLanding({ section = "overview", type = "" }) {
  const routeParams = useParams();
  const params = { ...routeParams, eventType: routeParams.eventType || type };
  const { events, loading } = useEvents();
  const city = cityBySlug(params.city);
  const ev = events.length ? findEvent(events, { city: params.city, year: params.year, type: params.eventType }) : null;
  useSeo(ev ? ev.name : "TTFC events", ev?.description || "");

  if (!city || !["briefing", "main-event"].includes(params.eventType) || !/^\d{4}$/.test(params.year || "")) {
    return <NotFound />;
  }
  if (loading) {
    return (
      <>
        <SiteHeader />
        <main style={{ background: "#070313", minHeight: "100vh" }} aria-busy="true" />
        <Footer />
      </>
    );
  }
  if (!ev) {
    // A real city/year/type with no published event yet: an announced state, not a 404.
    return (
      <>
        <SiteHeader />
        <main style={{ background: "#070313", color: "#f4f1ff", minHeight: "100vh", paddingTop: 76 }}>
          <div style={{ ...wrap, paddingTop: 44, paddingBottom: 64 }}>
            <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(1.7rem, 4.5vw, 2.6rem)", fontWeight: 900, margin: 0 }}>
              {city.name} {params.year} · {params.eventType === "main-event" ? "Main Event" : "Briefing"}
            </h1>
            <p style={{ margin: "12px 0 26px", opacity: 0.85, maxWidth: 620, lineHeight: 1.65 }}>
              This event hasn&rsquo;t been announced yet. Check back — or leave your email and we&rsquo;ll keep you updated, including the moment it&rsquo;s announced and when pricing goes live.
            </p>
            <AnnouncedSoon source={`event:${city.slug}-${params.year}-${params.eventType}`} title="Not announced yet" message="When it's announced, everything lands here first. Leave your email below and we'll keep you updated." />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (section === "agenda") return <AgendaPage ev={ev} />;
  if (section === "speakers") return <SpeakersPage ev={ev} />;
  if (section === "speaker") return <SpeakerDetailPage ev={ev} slug={params.speakerSlug} />;
  if (section === "tickets") return <TicketsPage ev={ev} />;

  return (
    <>
      <SiteHeader />
      <main style={{ background: "#070313", color: "#f4f1ff", minHeight: "100vh" }}>
        <EventTemplate ev={ev} />
        <div style={{ paddingBottom: 56 }} />
      </main>
      <Footer />
    </>
  );
}
