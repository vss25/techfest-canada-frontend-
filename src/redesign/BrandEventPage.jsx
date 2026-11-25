import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import "./brand.css";
import BrandHeader from "./BrandHeader";
import BrandFooter from "./BrandFooter";
import TicketsBlock from "../components/TicketsBlock";
import WaitlistForm from "../components/WaitlistForm";
import { speakerPhoto, speakerPathIn } from "../components/SpeakerCard";
import useSiteSettings from "../hooks/useSiteSettings";
import { stayFrom } from "../lib/stayUpdated";
import { urlFor } from "../utils/sanity";
import {
  eventPageMode, eventPath, eventTicketsPath, formatDateRange, lifecycleOf, ticketsOpen,
  useEventContent, useEvents, compareEvents,
} from "../lib/events";

/* =========================================================
   The approved event page (redesign step 1, Nov 2026), in the
   TTFC brand. Everything on it comes from the event's record,
   edited in Admin › Website content › Event pages:
   photo + credit, name, tagline, theme, format, audience,
   dates or month, venue, description, "What we know so far",
   "Coming next", the notify heading, the report card switch,
   and which version shows (auto / full / coming soon).
   Sessions and speakers are the ones tied to this event in
   Admin › Agenda and Admin › Speakers. Tickets are the event's
   ticket types (Admin › Prices & stock).
========================================================= */

const KIND = { briefing: "Briefing", "main-event": "Main Event" };

/* Toronto 2026, from its published results (thetechfestival.com). */
const REPORT_STATS = [["1,000+", "attendees"], ["95", "speakers"], ["50", "sessions"], ["13", "Catalyst winners"]];

const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = String(t).split(":").map(Number);
  if (!Number.isFinite(h)) return t;
  return `${h % 12 || 12}:${String(m || 0).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
};
const mins = (t) => { const [h, m] = String(t || "").split(":").map(Number); return h * 60 + (m || 0); };

function whenLine(ev) {
  if (ev.startDate) return formatDateRange(ev);
  return ev.statusNote ? String(ev.statusNote).split("·")[0].trim() : String(ev.year || "");
}

function Hero({ ev, soon }) {
  const img = ev.heroImage?.asset ? urlFor(ev.heroImage) : null;
  const facts = [
    ["When", whenLine(ev)],
    ["Where", ev.venueName ? `${ev.venueName}, ${ev.city}` : `${ev.city} · venue to be announced`],
    ev.formatLine ? ["Format", ev.formatLine] : null,
    ev.audience ? ["Who", ev.audience] : null,
  ].filter(Boolean);
  const open = ticketsOpen(ev) && ev.pricingAnnounced;
  return (
    <section className="tb-hero" aria-labelledby="tb-ev-title">
      {img && (
        <img
          className="tb-hero-img"
          src={img.width(1600).quality(78).auto("format").url()}
          srcSet={[640, 1024, 1600, 2200].map((w) => `${img.width(w).quality(78).auto("format").url()} ${w}w`).join(", ")}
          sizes="100vw"
          alt=""
        />
      )}
      <div className="tb-hero-shade" aria-hidden="true" />
      <div className="tb-wrap">
        <span className="tb-eyebrow">{ev.city} · {KIND[ev.type] || "Event"} {ev.year}{ev.theme ? ` · ${ev.theme}` : ""}</span>
        {soon && <span className="tb-pill"><span className="tb-pill-dot" aria-hidden="true" />Details coming soon</span>}
        <h1 id="tb-ev-title">{ev.name}</h1>
        {ev.tagline && <p className="tb-hero-tag">{ev.tagline}</p>}
        <ul className="tb-facts">
          {facts.map(([k, v]) => <li key={k}><b>{k}:</b> {v}</li>)}
        </ul>
        <div className="tb-hero-ctas">
          {open
            ? <a className="tb-btn tb-btn-gold" href="#tickets">Get tickets</a>
            : <a className="tb-btn tb-btn-gold" href="#notify">Notify me</a>}
          <Link className="tb-btn tb-btn-ghost" to="/sponsor">Partner with us</Link>
        </div>
      </div>
      {ev.photoCredit && <span className="tb-credit">{ev.photoCredit}</span>}
    </section>
  );
}

function ReportCard() {
  return (
    <div className="tb-report">
      <div>
        <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Toronto 2026 post-show report</h3>
        <p style={{ margin: "6px 0 0", color: "var(--tb-muted)" }}>Who came, what they talked about and what happened next at the last Main Event.</p>
        <div className="tb-report-stats">
          {REPORT_STATS.map(([n, l]) => <span key={l}><b>{n}</b>{l}</span>)}
        </div>
      </div>
      <Link className="tb-btn tb-btn-magenta" to="/highlights/2026">See the highlights</Link>
    </div>
  );
}

function PartnerBand({ ev }) {
  return (
    <section className="tb-section tb-section-navy" aria-labelledby="tb-partner-h">
      <div className="tb-wrap tb-partner">
        <div>
          <h2 id="tb-partner-h" className="tb-h2">Put your brand in the room</h2>
          <p className="tb-lede">Sponsorship, demo pods and speaking slots at {ev.name}. Write to <b style={{ color: "#fff" }}>sales@thetechfestival.com</b> or send us the form.</p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link className="tb-btn tb-btn-gold" to="/sponsor">Partner with us</Link>
          <Link className="tb-btn tb-btn-ghost" to="/exhibit">Exhibit</Link>
        </div>
      </div>
    </section>
  );
}

function Agenda({ sessions }) {
  const rows = [];
  let prev = null;
  for (const s of sessions) {
    if (prev && (prev.day || 1) === (s.day || 1) && prev.endTime && s.time) {
      const gap = mins(s.time) - mins(prev.endTime);
      if (gap >= 15) rows.push(<div key={`g-${s._id}`} className="tb-break">{gap} min break · {fmtTime(prev.endTime)} – {fmtTime(s.time)}</div>);
    }
    const people = [
      ...(s.moderator?.name ? [`${s.moderator.name}${s.moderator.org ? `, ${s.moderator.org}` : ""} (moderator)`] : []),
      ...(s.speakers || []).filter((p) => p?.name).map((p) => `${p.name}${p.org ? `, ${p.org}` : ""}`),
    ];
    rows.push(
      <article key={s._id} className="tb-session">
        <div className="tb-session-time">{fmtTime(s.time)}<small>to {fmtTime(s.endTime)}</small></div>
        <div>
          {(s.type || s.stage) && <span className="tb-tag">{[s.type, s.stage].filter(Boolean).join(" · ")}</span>}
          <h3>{s.title}</h3>
          {s.description && <p>{s.description}</p>}
          {people.length > 0 && <p className="tb-who">{people.join(" · ")}</p>}
        </div>
      </article>
    );
    prev = s;
  }
  return <div className="tb-agenda">{rows}</div>;
}

function FullPage({ ev, sessions, speakers }) {
  const past = lifecycleOf(ev) === "past";
  const paras = String(ev.description || "").split(/\n\s*\n/).filter(Boolean);
  return (
    <>
      <section className="tb-section" aria-labelledby="tb-about-h">
        <div className="tb-wrap tb-about">
          <div>
            <h2 id="tb-about-h" className="tb-h2" style={{ marginBottom: 18 }}>About {ev.name}</h2>
            {paras.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <div className="tb-card">
            <dl className="tb-kv">
              <div><dt>When</dt><dd>{whenLine(ev)}</dd></div>
              <div><dt>Where</dt><dd>{ev.venueName || "Venue to be announced"}{ev.venueAddress ? <><br /><span style={{ fontWeight: 400, color: "var(--tb-muted)" }}>{ev.venueAddress}</span></> : null}</dd></div>
              {ev.theme && <div><dt>Theme</dt><dd>{ev.theme}</dd></div>}
              {ev.formatLine && <div><dt>Format</dt><dd>{ev.formatLine}</dd></div>}
              {ev.audience && <div><dt>Who's in the room</dt><dd>{ev.audience}</dd></div>}
            </dl>
          </div>
        </div>
      </section>

      {sessions.length > 0 && (
        <section className="tb-section tb-section-soft" aria-labelledby="tb-agenda-h">
          <div className="tb-wrap">
            <div className="tb-head">
              <div>
                <h2 id="tb-agenda-h" className="tb-h2">Agenda</h2>
                <p className="tb-lede">Times are local. Sessions may still change.</p>
              </div>
            </div>
            <Agenda sessions={sessions} />
          </div>
        </section>
      )}

      {speakers.length > 0 && (
        <section className="tb-section" aria-labelledby="tb-speakers-h">
          <div className="tb-wrap">
            <div className="tb-head"><h2 id="tb-speakers-h" className="tb-h2">Speakers</h2></div>
            <div className="tb-speakers">
              {speakers.slice(0, 12).map((sp) => (
                <Link key={sp._id} className="tb-speaker" to={speakerPathIn(eventPath(ev), sp)}>
                  {speakerPhoto(sp.image, 400, 500) ? <img src={speakerPhoto(sp.image, 400, 500)} alt="" loading="lazy" /> : <img alt="" />}
                  <b>{sp.name}</b>
                  <span>{[sp.title, sp.company].filter(Boolean).join(", ")}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {!past && (
        <section className="tb-section tb-section-soft" id="tickets" aria-labelledby="tb-tickets-h">
          <div className="tb-wrap">
            <div className="tb-head">
              <div>
                <h2 id="tb-tickets-h" className="tb-h2">Tickets</h2>
                <p className="tb-lede">{whenLine(ev)}{ev.venueName ? ` · ${ev.venueName}` : ""}. Prices are in Canadian dollars, before tax.</p>
              </div>
              <Link className="tb-link" to={eventTicketsPath(ev)}>Tickets page →</Link>
            </div>
            <div className="tb-tickets"><TicketsBlock ev={ev} /></div>
          </div>
        </section>
      )}
    </>
  );
}

function ComingSoon({ ev, settings, nextOnSale }) {
  const known = ev.knownSoFar?.length ? ev.knownSoFar : [
    { label: "When", value: whenLine(ev) },
    { label: "Where", value: ev.venueName || `${ev.city}, venue to be announced` },
    ev.formatLine ? { label: "Format", value: ev.formatLine } : { label: "Format", value: ev.type === "main-event" ? "Two days" : "One day" },
    { label: "Theme", value: ev.theme || "To be announced" },
  ];
  const steps = ev.comingNext?.length ? ev.comingNext : [
    { label: "Theme and venue announced" },
    { label: "Speakers and agenda published" },
    { label: "Tickets on sale" },
  ];
  const paras = String(ev.description || "").split(/\n\s*\n/).filter(Boolean);
  return (
    <>
      <section className="tb-section" aria-labelledby="tb-known-h">
        <div className="tb-wrap">
          <div className="tb-head">
            <div>
              <h2 id="tb-known-h" className="tb-h2">What we know so far</h2>
              {paras[0] && <p className="tb-lede">{paras[0]}</p>}
            </div>
          </div>
          <dl className="tb-known" style={{ margin: 0 }}>
            {known.map((f) => (
              <div key={f._key || f.label} className="tb-card"><dt>{f.label}</dt><dd>{f.value}</dd></div>
            ))}
          </dl>
        </div>
      </section>

      <section className="tb-section tb-section-soft" aria-labelledby="tb-next-h">
        <div className="tb-wrap tb-two">
          <div>
            <h2 id="tb-next-h" className="tb-h2" style={{ marginBottom: 22 }}>Coming next</h2>
            <ol className="tb-steps">
              {steps.map((st) => (
                <li key={st._key || st.label} className={st.done ? "done" : undefined}>
                  <b>{st.label}</b>{st.when && <span>{st.when}</span>}
                </li>
              ))}
            </ol>
            <div className="tb-links">
              <Link to="/sponsor">Partner with us <span>Sponsorship and demo pods</span></Link>
              <Link to="/contact">Speak at {ev.city} <span>Tell us your topic</span></Link>
              <Link to="/exhibit">Exhibit <span>Booths and pods</span></Link>
            </div>
          </div>
          <div id="notify" className="tb-card tb-form">
            <h2 className="tb-h2" style={{ fontSize: "1.35rem" }}>{ev.notifyHeading || `Hear first about ${ev.name}`}</h2>
            <p className="tb-lede" style={{ marginBottom: 8 }}>We'll email you when the agenda, speakers and tickets go live. Nothing else.</p>
            <WaitlistForm copy={stayFrom(settings)} source={`event:${ev.eventKey}`} />
          </div>
        </div>
      </section>

      {nextOnSale && (
        <section className="tb-section" style={{ paddingBottom: 0 }}>
          <div className="tb-wrap">
            <div className="tb-onsale">
              <span>Tickets on sale now: <b>{nextOnSale.name}</b> · {whenLine(nextOnSale)}</span>
              <Link className="tb-btn tb-btn-gold tb-btn-sm" to={eventPath(nextOnSale)}>See the event</Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

export default function BrandEventPage({ ev }) {
  const { sessions, speakers, loading } = useEventContent(ev);
  const { events } = useEvents();
  const settings = useSiteSettings();
  // Only what is tied to THIS event counts as its own (untagged items belong to every event).
  const own = useMemo(() => ({
    sessions: sessions.filter((s) => (s.eventIds || []).includes(ev._id)),
    speakers: speakers.filter((s) => (s.eventIds || []).includes(ev._id)),
  }), [sessions, speakers, ev._id]);
  const mode = loading ? null : eventPageMode(ev, own.sessions);
  const nextOnSale = useMemo(() => (events || [])
    .filter((e) => e._id !== ev._id && e.pricingAnnounced && ticketsOpen(e))
    .sort(compareEvents)[0] || null, [events, ev._id]);

  return (
    <div className="tb">
      <BrandHeader ev={ev} />
      <main>
        <Hero ev={ev} soon={mode === "coming-soon"} />
        {mode === null && <div style={{ minHeight: 400 }} aria-busy="true" />}
        {mode === "full" && <FullPage ev={ev} sessions={own.sessions} speakers={own.speakers} />}
        {mode === "coming-soon" && <ComingSoon ev={ev} settings={settings} nextOnSale={nextOnSale} />}
        {mode && ev.showReport !== false && (
          <section className="tb-section">
            <div className="tb-wrap"><ReportCard /></div>
          </section>
        )}
        {mode && <PartnerBand ev={ev} />}
      </main>
      <BrandFooter />
    </div>
  );
}
