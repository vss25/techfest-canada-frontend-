import React, { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import EventHero from "../components/EventHero";
import TicketsBlock from "../components/TicketsBlock";
import EventFaqs from "../components/EventFaqs";
import SpeakerCard, { speakerPathIn } from "../components/SpeakerCard";
import PortableText, { PlainParagraphs } from "../components/PortableText";
import AnnouncedSoon from "../components/AnnouncedSoon";
import NotFound from "./NotFound";
import useSeo from "../hooks/useSeo";
import { urlFor } from "../utils/sanity";
import { speakerSlug } from "../seo/slug";
import {
  LIFECYCLE_LABEL, cityBySlug, eventAgendaPath, eventPath, eventSpeakersPath,
  eventTicketsPath, findEvent, formatDateRange, lifecycleOf, useEventContent, useEvents,
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
========================================================= */

const wrap = { maxWidth: 1200, margin: "0 auto", padding: "0 20px" };
const h2 = { fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(1.35rem, 3vw, 1.9rem)", fontWeight: 800, margin: 0 };
const section = { padding: "clamp(36px, 6vw, 64px) 0 8px" };

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

function PartnersStrip({ partners }) {
  if (!partners.length) return null;
  return (
    <section style={section} aria-label="Partners">
      <div style={wrap}>
        <h2 style={h2}>Partners</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginTop: 22, alignItems: "center" }}>
          {partners.map((p) => {
            const logo = p.logo?.asset ? urlFor(p.logo).width(320).quality(80).auto("format").url() : null;
            const img = logo ? (
              <img src={logo} alt={p.name} loading="lazy" style={{ height: 44, width: "auto", maxWidth: 180, objectFit: "contain", transform: `scale(${Math.min(2.5, Math.max(0.3, (Number(p.logoScale) || 100) / 100))})` }} />
            ) : (
              <span style={{ fontWeight: 800 }}>{p.name}</span>
            );
            return p.url ? (
              <a key={p._id} href={p.url} target="_blank" rel="noreferrer" aria-label={p.name} style={{ display: "inline-flex" }}>{img}</a>
            ) : (
              <span key={p._id} style={{ display: "inline-flex" }}>{img}</span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Gallery({ ev }) {
  const images = (ev.gallery || []).filter((g) => g?.asset);
  if (!images.length) return null;
  return (
    <section style={section} aria-label="Gallery">
      <div style={wrap}>
        <h2 style={h2}>Gallery</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, marginTop: 22 }}>
          {images.map((g, i) => (
            <img key={i} alt={g.alt || `${ev.name} — photo ${i + 1}`} loading="lazy"
              src={urlFor(g).width(720).quality(80).auto("format").url()}
              srcSet={[480, 720, 1080].map((w) => `${urlFor(g).width(w).quality(80).auto("format").url()} ${w}w`).join(", ")}
              sizes="(max-width: 640px) 90vw, 360px"
              style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 14, display: "block" }} />
          ))}
        </div>
      </div>
    </section>
  );
}

const AppLine = () => (
  <p style={{ ...wrap, paddingTop: 28, fontSize: "0.92rem", opacity: 0.72 }}>
    Coming? Get the TTFC app for your pass, the schedule and live updates —{" "}
    <a href="/app/install?from=event" style={{ color: "inherit", fontWeight: 700 }}>download the app</a>.
  </p>
);

/** The shared landing template. `below` renders extra sections (the home page's city list). */
export function EventTemplate({ ev, below, heroHeadingAs }) {
  const { sessions, speakers, partners } = useEventContent(ev);
  const lifecycle = lifecycleOf(ev);
  const past = lifecycle === "past";
  const base = eventPath(ev);
  const highlights = useMemo(() => {
    const featured = sessions.filter((s) => s.featured);
    return (featured.length ? featured : sessions).slice(0, 6);
  }, [sessions]);

  return (
    <>
      <EventHero ev={ev} headingAs={heroHeadingAs} />
      <div style={{ ...wrap, paddingTop: 22, display: "flex", flexWrap: "wrap", gap: "8px 22px", fontSize: "0.92rem", opacity: 0.85 }}>
        <span>{LIFECYCLE_LABEL[lifecycle]}</span>
        {ev.venueName && <span>{ev.venueName}{ev.venueAddress ? ` — ${ev.venueAddress}` : ""}</span>}
        {ev.statusNote && <span>{ev.statusNote}</span>}
      </div>

      {ev.description && (
        <section style={section} aria-label="About this event">
          <div style={{ ...wrap, maxWidth: 860 }}>
            {String(ev.description).split(/\n\s*\n/).filter(Boolean).map((p, i) => (
              <p key={i} style={{ margin: i ? "14px 0 0" : 0, fontSize: "1.05rem", lineHeight: 1.7, opacity: 0.92 }}>{p}</p>
            ))}
          </div>
        </section>
      )}

      {!past && highlights.length > 0 && (
        <section style={section} aria-label="Agenda highlights">
          <div style={wrap}>
            <h2 style={h2}>Agenda highlights</h2>
            <div style={{ marginTop: 10 }}>{highlights.map((s) => <SessionRow key={s._id} s={s} />)}</div>
            <p style={{ marginTop: 14 }}><Link to={eventAgendaPath(ev)} style={{ fontWeight: 700, color: "inherit" }}>See the full agenda →</Link></p>
          </div>
        </section>
      )}

      {!past && speakers.length > 0 && (
        <section style={section} aria-label="Speakers">
          <div style={wrap}>
            <h2 style={h2}>Speakers</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginTop: 22 }}>
              {speakers.slice(0, 8).map((sp) => (
                <SpeakerCard key={sp._id} speaker={sp} to={speakerPathIn(base, sp)} />
              ))}
            </div>
            {speakers.length > 8 && (
              <p style={{ marginTop: 16 }}><Link to={eventSpeakersPath(ev)} style={{ fontWeight: 700, color: "inherit" }}>All speakers →</Link></p>
            )}
          </div>
        </section>
      )}

      {!past && <PartnersStrip partners={partners} />}

      {!past && (
        <section style={section} aria-label="Tickets" id="tickets">
          <div style={wrap}>
            <h2 style={h2}>Tickets — {ev.name}</h2>
            <p style={{ margin: "8px 0 20px", opacity: 0.8, fontSize: "0.95rem" }}>
              {formatDateRange(ev)}{ev.venueName ? ` · ${ev.venueName}` : ""}
            </p>
            <TicketsBlock ev={ev} />
          </div>
        </section>
      )}

      <Gallery ev={ev} />
      {past && (
        <section style={section} aria-label="Tickets">
          <div style={wrap}><TicketsBlock ev={ev} /></div>
        </section>
      )}

      {ev.brochureUrl && (
        <p style={{ ...wrap, paddingTop: 24 }}>
          <a href={ev.brochureUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: "inherit" }}>Download the event brochure (PDF) →</a>
        </p>
      )}

      {below}
      {!past && <EventFaqs ev={ev} />}
      <AppLine />
    </>
  );
}

/* ---------------- Subpages ---------------- */

function PageShell({ ev, title, children }) {
  return (
    <>
      <SiteHeader />
      <main style={{ background: "#070313", color: "#f4f1ff", minHeight: "100vh", paddingTop: 76 }}>
        <div style={{ ...wrap, paddingTop: 34 }}>
          <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.75 }}>
            <Link to={eventPath(ev)} style={{ color: "inherit", fontWeight: 700 }}>{ev.name}</Link>
            {" · "}{formatDateRange(ev)}{ev.venueName ? ` · ${ev.venueName}` : ""}
          </p>
          <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(1.7rem, 4.5vw, 2.6rem)", fontWeight: 900, margin: "10px 0 8px" }}>{title}</h1>
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
  const days = useMemo(() => [...new Set(sessions.map((s) => s.day || 1))].sort((a, b) => a - b), [sessions]);
  const [day, setDay] = useState(null);
  const activeDay = day ?? days[0];
  const showTabs = ev.type === "main-event" || days.length > 1;
  useSeo(`${ev.name} agenda`, `The agenda for ${ev.name}: sessions, speakers and stages.`);
  return (
    <PageShell ev={ev} title="Agenda">
      <div style={wrap}>
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
          : sessions.length === 0 ? <p style={{ opacity: 0.75 }}>Sessions, speakers and stages will be published here as the agenda is confirmed.</p>
          : sessions.filter((s) => !showTabs || (s.day || 1) === activeDay).map((s) => <SessionRow key={s._id} s={s} />)}
      </div>
      <EventFaqs ev={ev} />
    </PageShell>
  );
}

function SpeakersPage({ ev }) {
  const { speakers, loading } = useEventContent(ev);
  useSeo(`${ev.name} speakers`, `Who is speaking at ${ev.name}.`);
  return (
    <PageShell ev={ev} title="Speakers">
      <div style={wrap}>
        {loading ? <p aria-busy="true" style={{ opacity: 0.7 }}>Loading speakers…</p>
          : speakers.length === 0 ? <p style={{ opacity: 0.75 }}>The speaker lineup will be announced here — expect the people deploying this technology, not just describing it.</p>
          : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginTop: 12 }}>
              {speakers.map((sp) => <SpeakerCard key={sp._id} speaker={sp} to={speakerPathIn(eventPath(ev), sp)} />)}
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

export default function EventLanding({ section = "overview" }) {
  const params = useParams();
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
