import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";

// The production home page's rotating globe with the pillars and sectors: loaded only when Next up is shown.
const PillarGlobe = lazy(() => import("./PillarGlobe"));

/* The new look's sections and pages (Nov 25 2026, the owner approved the preview and asked for "all of them"):
   the home page's Next up / Who's on stage / Last year in numbers / Partners, the hero buttons, the event page's
   "The day at a glance" and "Choose your pass", the Agenda page, the speaker page and the awards key dates.
   Plain components fed with live data by LiveSite.jsx / LivePhone.jsx; they work on both layouts (newLook.css).
   Colours come from the --nl-* variables (siteLook.css, and siteDark.css for the dark preview). */

const act = (fn) => (e) => { if (e && e.preventDefault) e.preventDefault(); if (fn) fn(e); };
const Arrow = () => <i aria-hidden="true">→</i>;

export function More({ onClick, children }) {
  return <a href="#" className="nx-more" onClick={act(onClick)}>{children} <Arrow /></a>;
}

/** A title with one word in the accent gradient: the last word, or the first with first = true. */
function Fancy({ text, first }) {
  const words = String(text || "").trim().split(/\s+/);
  if (words.length < 2) return text || null;
  return first
    ? <><em>{words[0]}</em> {words.slice(1).join(" ")}</>
    : <>{words.slice(0, -1).join(" ")} <em>{words[words.length - 1]}</em></>;
}

function Head({ label, title, lead, more, onMore, children, ghost = true }) {
  return (
    <div className="nx-head">
      {ghost ? <span className="nx-ghost-word" aria-hidden="true">{String(title || "").split(/\s+/).pop()}</span> : null}
      <div>
        {label ? <span className="nx-label">{label}</span> : null}
        <h2 className="nx-h2"><Fancy text={title} /></h2>
        {lead ? <p className="nx-lead">{lead}</p> : null}
      </div>
      {more ? <More onClick={onMore}>{more}</More> : null}
      {children}
    </div>
  );
}

/** Get tickets (gold) + Explore <city> (ghost) on the home page's hero. */
export function HeroCtas({ onTickets, onExplore, city, ticketsLabel = "Get tickets" }) {
  return (
    <div className="nx-row nx-hero-ctas">
      {onTickets ? <a href="#" className="nx-btn nx-buy" onClick={act(onTickets)}>{ticketsLabel}</a> : null}
      <a href="#" className="nx-btn nx-ghost nx-on-dark" onClick={act(onExplore)}>Explore {city || "the event"}</a>
    </div>
  );
}

// The festival's 5 × 5: five tech pillars across five applied sectors (the names on the production home page).
const PILLARS = ["Artificial Intelligence", "Quantum Computing", "Cybersecurity & Digital Trust", "Robotics & Automation", "Sustainability & CleanTech"];
const SECTORS = [["Healthcare", "Healthcare & Lifesciences"], ["Finance", "Banking, Financial Services & Insurance"], ["Industry", "Supply Chain, Manufacturing & Infrastructure"], ["Defence", "Defence & Public Safety"], ["Energy", "Energy & Utilities"]];

/** The 5 × 5 matrix: pillars down the side, sectors across the top, a lit cell where each pair meets. */
export function PillarMatrix() {
  return (
    <div className="nx-matrix" role="img" aria-label={`Five tech pillars (${PILLARS.join(", ")}) across five applied sectors (${SECTORS.map((x) => x[1]).join(", ")})`}>
      <div className="nx-mx-top" aria-hidden="true">
        <span className="nx-mx-corner"><b>5 × 5</b><small>pillars × sectors</small></span>
        {SECTORS.map(([short, full]) => <span key={short} className="nx-mx-col" title={full}>{short}</span>)}
      </div>
      {PILLARS.map((p, r) => (
        <div key={p} className="nx-mx-row" aria-hidden="true">
          <span className="nx-mx-name">{p}</span>
          {SECTORS.map(([short, full], c) => <i key={short} className="nx-mx-cell" title={`${p} × ${full}`} style={{ animationDelay: `${((r * 5 + c) % 7) * 0.45}s` }} />)}
        </div>
      ))}
    </div>
  );
}

/** Home: the next event, with its photo (or the 5 × 5 matrix in its place). */
export function NextUp({ label, title, lead, img, alt, onTickets, onEvent, stub, matrix, ticketsLabel = "Get tickets" }) {
  return (
    <section className="nx-s nx-stage"><div className={`nx-wrap nx-two${matrix ? " nx-two-wide" : ""}`}>
      <div>
        <span className="nx-label">{label}</span>
        <h2 className="nx-h2 nx-big"><Fancy text={title} first /></h2>
        {lead ? <p className="nx-lead">{lead}</p> : null}
        <div className="nx-row" style={{ marginTop: 24 }}>
          {onTickets ? <a href="#" className="nx-btn nx-buy" onClick={act(onTickets)}>{ticketsLabel}</a> : null}
          <More onClick={onEvent}>See the event</More>
        </div>
      </div>
      {matrix ? <Suspense fallback={<PillarMatrix />}><PillarGlobe /></Suspense> : (
        <div className="nx-frame">
          <div className="nx-media">{img ? <img src={img} alt={alt || ""} loading="lazy" /> : null}</div>
          {stub ? <div className="nx-float">{stub}</div> : null}
        </div>
      )}
    </div></section>
  );
}

/** A speaker with a ring that turns on hover. sp = { name, role, kind, img }. */
export function SpeakerCard({ sp, onOpen }) {
  return (
    <a href="#" className="nx-card nx-sp" onClick={act(onOpen)} aria-label={`${sp.name}: open profile`}>
      <span className="nx-sp-ph" style={sp.img ? { backgroundImage: `url(${sp.img})` } : undefined} />
      <span className="nx-sp-in">
        {sp.kind ? <span className="nx-chip">{sp.kind}</span> : null}
        <b>{sp.name}</b>
        {sp.role ? <span className="nx-muted">{sp.role}</span> : null}
      </span>
    </a>
  );
}

/** "Who's on stage": up to four speakers, with See all speakers. */
export function OnStage({ label = "Speakers", title = "Who's on stage", lead, speakers, onAll, alt, id, three }) {
  if (!speakers || !speakers.length) return null;
  return (
    <section className={`nx-s${alt ? " nx-alt" : ""}`} id={id}><div className="nx-wrap">
      <Head label={label} title={title} lead={lead} more="See all speakers" onMore={onAll} />
      <div className={three ? "nx-grid3 nx-grid3-sp" : "nx-grid4"}>{speakers.map((sp, i) => <SpeakerCard key={sp.name + i} sp={sp} onOpen={sp.open} />)}</div>
    </div></section>
  );
}

const LAST_YEAR = [["1,000+", "Attendees"], ["95", "Speakers"], ["130+", "Partners and exhibitors"], ["50", "Sessions"]];

/** A number that counts up the first time it scrolls into view ("1,000+" → 0 … 1,000+). */
function CountUp({ value }) {
  const m = /^([\d,]+)(.*)$/.exec(String(value));
  const end = m ? Number(m[1].replace(/,/g, "")) : 0;
  const tail = m ? m[2] : "";
  const el = useRef(null);
  const [n, setN] = useState(end);
  useEffect(() => {
    const node = el.current;
    const still = typeof window === "undefined" || !window.IntersectionObserver || !window.requestAnimationFrame
      || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (!node || still || !end) return undefined;
    let raf = 0;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((x) => x.isIntersecting)) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / 1400);
        setN(Math.round(end * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, { threshold: 0.4 });
    io.observe(node);
    // If the frames stop coming (a background tab), the real number still shows.
    const safety = setTimeout(() => setN(end), 6000);
    return () => { io.disconnect(); cancelAnimationFrame(raf); clearTimeout(safety); };
  }, [end]);
  return <b ref={el}>{m ? n.toLocaleString("en-CA") + tail : value}</b>;
}

/** "Last year in numbers": the Toronto 2026 figures and five photos. photos = [{ src, alt }]. */
export function LastYear({ photos, onGallery, alt, more = 0 }) {
  return (
    <section className={`nx-s nx-stage${alt ? " nx-alt" : ""}`}><div className="nx-wrap">
      <Head label="Toronto 2026" title="Last year in numbers" more="See the gallery" onMore={onGallery} />
      <div className="nx-stats">{LAST_YEAR.map(([n, t]) => <div key={t}><CountUp value={n} /><span>{t}</span></div>)}</div>
      {photos && photos.length ? (
        // Five is the designed mosaic (one large, four small); any other number flows in an even grid.
        <div className={`nx-gal${photos.length === 5 ? "" : " nx-gal-auto"}`}>{photos.map((p) => <img key={p.src} src={p.src} alt={p.alt || ""} loading="lazy" />)}</div>
      ) : null}
      {more > 0 ? <a href="#" className="nx-more nx-gal-more" onClick={act(onGallery)}>See {more} more in the gallery →</a> : null}
    </div></section>
  );
}

/** "In good company": up to six partner logos. logos = [{ title, logo }] (logo: an <img> or a name). */
export function PartnersStrip({ label = "Partners", logos, onAll, alt }) {
  if (!logos || !logos.length) return null;
  return (
    <section className={`nx-s${alt ? " nx-alt" : ""}`}><div className="nx-wrap">
      <Head label={label} title="In good company" more="All partners" onMore={onAll} />
      {/* A steady, readable pace however many logos there are: about 6 seconds per logo. */}
      <div className="nx-logo-run"><div className="nx-logo-track" style={{ animationDuration: `${Math.max(12, logos.length * 2) * 3}s` }}>
        {[...logos, ...logos, ...logos, ...logos].slice(0, Math.max(12, logos.length * 2)).map((p, i) => <div key={i} title={p.title || undefined}>{p.logo}</div>)}
      </div></div>
    </div></section>
  );
}

/** A session card's picture, GIF or video. media = sessionCardMedia() (src/lib/sessionMedia.js). */
export function CardMedia({ media, title, small }) {
  if (!media) return null;
  return (
    <div className={`nx-cardmedia${small ? " nx-cardmedia-sm" : ""}`}>
      {media.kind === "video"
        ? <video src={media.src} poster={media.poster || undefined} muted loop autoPlay playsInline preload="metadata" aria-label={title || undefined} />
        : <img src={media.src} alt={title || ""} loading="lazy" />}
    </div>
  );
}

/** One agenda row: time, kind, title, what it is, who. s = toDesignSessions() row. */
function SessionRow({ s }) {
  return (
    <div className={`nx-card nx-it${s.media ? " nx-it-media" : ""}`}>
      {s.media ? <CardMedia small media={s.media} title={s.title} /> : null}
      <time>{s.time || "Soon"}</time>
      <div>
        <span className="nx-kind nx-kind-chip">{s.kind}</span>
        <h3>{s.title}</h3>
        {s.desc ? <p className="nx-muted">{s.desc}</p> : null}
        {s.who ? <p className="nx-who">{s.who}</p> : null}
      </div>
    </div>
  );
}

/** Home › Agenda highlights: pick an event that has an agenda, see its first six sessions (two rows of three),
    then open that event's whole agenda. events = [{ id, label, rows }], rows from toDesignSessions(). */
export function AgendaHighlights({ events, initial, onAll }) {
  const [pick, setPick] = useState(null);
  if (!events || !events.length) return null;
  const cur = events.find((e) => e.id === pick) || events.find((e) => e.id === initial) || events[0];
  const rows = cur.rows.slice(0, 6);
  return (
    <section className="nx-s nx-stage" id="p-agenda"><div className="nx-wrap">
      <Head label="Agenda" title="Agenda highlights">
        <div className="nx-tabs" role="group" aria-label="Choose an event">
          {events.map((e) => <button key={e.id} type="button" aria-pressed={e.id === cur.id} className={e.id === cur.id ? "on" : ""} onClick={() => setPick(e.id)}>{e.label}</button>)}
        </div>
      </Head>
      <div className="nx-grid3" key={cur.id}>
        {rows.map((s, i) => (
          <article key={i} className="nx-card nx-agcard">
            {s.media ? <CardMedia media={s.media} title={s.title} /> : null}
            <span className="nx-agtime">{s.time || "Soon"}</span>
            <span className="nx-kind nx-kind-chip">{s.kind}</span>
            <h3>{s.title}</h3>
            {s.who ? <p className="nx-who">{s.who}</p> : null}
          </article>
        ))}
      </div>
      <div className="nx-agmore">
        <a href="#" className="nx-btn nx-ghost" onClick={act(() => onAll(cur.id))}>
          {cur.rows.length > rows.length ? `See all ${cur.rows.length} sessions · ${cur.label}` : `See the full agenda · ${cur.label}`} <Arrow />
        </a>
      </div>
    </div></section>
  );
}

/** Event page: the first few sessions, with See the full agenda. */
export function DayGlance({ sessions, onFull, id = "ev-agenda", alt }) {
  const rows = (sessions || []).slice(0, 4);
  return (
    <section className={`nx-s${alt ? " nx-alt" : ""}`} id={id}><div className="nx-wrap">
      <Head label="Agenda" title="The day at a glance" more="See the full agenda" onMore={onFull} />
      <div className="nx-ag">{rows.map((s, i) => <SessionRow key={i} s={s} />)}</div>
    </div></section>
  );
}

const money = (cents) => {
  const n = Math.round(Number(cents) || 0) / 100;
  return "$" + (Number.isInteger(n) ? n.toLocaleString("en-CA") : n.toFixed(2));
};
const perks = (note) => String(note || "").split(/\n|•|;|·/).map((x) => x.replace(/^[-*\s]+/, "").trim()).filter(Boolean).slice(0, 5);

/** Event page: "Choose your pass", one ticket-shaped card per ticket type. Only while tickets are on sale. */
export function Passes({ types, onBuy, id = "ev-passes" }) {
  if (!types || !types.length) return null;
  return (
    // Nov 26 2026 (the design review): the designer's gradient behind the passes, and no giant "pass" word.
    <section className="nx-s nx-stage nx-passbg" id={id}><div className="nx-wrap">
      <Head ghost={false} title="Choose your pass" lead="Prices in CAD. Taxes are shown at payment." />
      <div className={`nx-passes n${Math.min(types.length, 4)}`}>
        {types.map((t) => (
          <div key={t.id || t.name} className="nx-pass">
            <h3>{t.name}</h3>
            <div className="nx-price">{money(t.cents)}</div>
            <div className="nx-perf" />
            {/* What the ticket includes (Admin › Tickets) when it has a list; else the bits of its one-line description. */}
            <ul>{(t.inclusions && t.inclusions.length ? t.inclusions.slice(0, 8) : perks(t.note)).map((p) => <li key={p}>{p}</li>)}</ul>
            <a href="#" className="nx-btn nx-buy" onClick={act(onBuy)}>Get tickets</a>
            <div className="nx-code" aria-hidden="true" />
          </div>
        ))}
      </div>
    </div></section>
  );
}

/** A short photo hero for the Agenda, Speakers and speaker pages. */
export function PageHero({ img, label, title, line, back, onBack }) {
  return (
    <section className="nx-hero">
      {img ? <img src={img} alt="" aria-hidden="true" /> : null}
      <div className="nx-shade" />
      <div className="nx-wrap nx-hero-in">
        {back ? <a href="#" className="nx-back" onClick={act(onBack)}>← {back}</a> : null}
        {label ? <span className="nx-label nx-on-dark"><i className="nl-dot" aria-hidden="true" />{label}</span> : null}
        <h1>{title}</h1>
        {line ? <p>{line}</p> : null}
      </div>
    </section>
  );
}

/** The Agenda page: filters by session type, the whole day, Get tickets. */
export function AgendaPage({ hero, rail, sessions, onTickets, ticketsLabel = "Get tickets" }) {
  const [f, setF] = useState("All");
  const kinds = useMemo(() => ["All", ...new Set((sessions || []).map((s) => s.kind).filter(Boolean))], [sessions]);
  const rows = (sessions || []).filter((s) => f === "All" || s.kind === f);
  return (
    <main className="nx-page">
      <PageHero {...hero} />
      {rail}
      <section className="nx-s"><div className="nx-wrap">
        <div className="nx-head">
          <div className="nx-tabs" role="group" aria-label="Filter by session type">
            {kinds.length > 2 ? kinds.map((k) => <button key={k} type="button" aria-pressed={f === k} className={f === k ? "on" : ""} onClick={() => setF(k)}>{k}</button>) : null}
          </div>
          {onTickets ? <a href="#" className="nx-btn nx-buy nx-sm nx-hide-phone" onClick={act(onTickets)}>{ticketsLabel}</a> : null}
        </div>
        <div className="nx-ag">{rows.map((s, i) => <SessionRow key={i} s={s} />)}</div>
      </div></section>
    </main>
  );
}

/** The speaker page. sp = { name, role, kind, img, bio, linkedin }; talks = session rows; others = 4 speakers. */
export function SpeakerPage({ sp, eventLabel, eventTitle, talks, others, onBack, onAll, onAgenda, onTickets, rail }) {
  if (!sp) {
    return (
      <main className="nx-page"><section className="nx-s"><div className="nx-wrap">
        <h1 className="nx-h2">Speaker not found</h1>
        <p className="nx-lead">This speaker isn't listed any more.</p>
        <div style={{ marginTop: 18 }}><More onClick={onAll}>See all speakers</More></div>
      </div></section></main>
    );
  }
  return (
    <main className="nx-page">
      <section className="nx-s"><div className="nx-wrap nx-prof">
        <div className="nx-ph" style={sp.img ? { backgroundImage: `url(${sp.img})` } : undefined} role="img" aria-label={sp.name} />
        <div>
          <a href="#" className="nx-back nx-muted" onClick={act(onBack)}>← All speakers</a>
          {sp.kind ? <span className="nx-label" style={{ marginTop: 16 }}>{sp.kind}{eventLabel ? " · " + eventLabel : ""}</span> : null}
          <h1>{sp.name}</h1>
          {sp.role ? <p className="nx-role">{sp.role}</p> : null}
          {sp.bio ? <p className="nx-lead">{sp.bio}</p> : null}
          <div className="nx-row" style={{ marginTop: 24 }}>
            {sp.linkedin ? <a className="nx-btn nx-ghost" href={sp.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a> : null}
            {onTickets ? <a href="#" className="nx-btn nx-buy" onClick={act(onTickets)}>Get tickets</a> : null}
          </div>
        </div>
      </div></section>
      {rail}
      {talks && talks.length ? (
        <section className="nx-s nx-alt"><div className="nx-wrap">
          <Head label="Speaking at" title={eventTitle} more="See the full agenda" onMore={onAgenda} />
          <div className="nx-ag">{talks.map((s, i) => <SessionRow key={i} s={s} />)}</div>
        </div></section>
      ) : null}
      {others && others.length ? (
        <section className="nx-s"><div className="nx-wrap">
          <Head label="Also speaking" title="More speakers" more="See all speakers" onMore={onAll} />
          <div className="nx-grid4">{others.map((o, i) => <SpeakerCard key={o.name + i} sp={o} onOpen={o.open} />)}</div>
        </div></section>
      ) : null}
    </main>
  );
}

/** The event hero's countdown, ticking every second: days, hours, min, sec. target = ms since 1970. */
export function Countdown({ target }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const left = Math.floor((target - now) / 1000);
  if (!(left > 0)) return null;
  const pad = (n) => String(n).padStart(2, "0");
  const parts = [[String(Math.floor(left / 86400)), "Days"], [pad(Math.floor((left % 86400) / 3600)), "Hours"], [pad(Math.floor((left % 3600) / 60)), "Min"], [pad(left % 60), "Sec"]];
  return (
    <div className="nx-cd" role="timer" aria-label={`${parts[0][0]} days ${parts[1][0]} hours to go`}>
      {parts.map(([n, t]) => <div key={t} className="nl-cd"><strong>{n}</strong><span>{t}</span></div>)}
    </div>
  );
}

/** The date as a ticket stub: FEB over 24. date = "YYYY-MM-DD". */
export function DateStub({ date }) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ""));
  if (!m) return null;
  const mon = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][Number(m[2]) - 1];
  return <span className="nx-stub" aria-hidden="true"><small>{mon}</small><b>{m[3]}</b></span>;
}

/** A tour-poster ticker of the season's cities, solid and outlined in turn. */
export function Ticker({ items, big }) {
  if (!items || items.length < 2) return null;
  const run = [...items, ...items, ...items, ...items];
  return (
    <div className={`nx-ticker${big ? " nx-ticker-xl" : ""}`} aria-hidden="true">
      <div className="nx-track">{run.map((t, i) => <span key={i} className={i % 2 ? "o" : ""}>{t}</span>)}</div>
    </div>
  );
}

/** A moving strip of partner logos (under the home page's top section). logos = [{ title, logo }]. */
export function LogoStrip({ label, logos }) {
  if (!logos || logos.length < 3) return null;
  const run = [...logos, ...logos];
  return (
    <div className="nx-logostrip" aria-label={label}>
      {label ? <span className="nx-logostrip-ttl">{label}</span> : null}
      <div className="nx-logo-run"><div className="nx-logo-track" style={{ animationDuration: `${Math.max(36, logos.length * 6)}s` }}>
        {run.map((p, i) => <div key={i} title={p.title || undefined} aria-hidden={i >= logos.length ? "true" : undefined}>{p.logo}</div>)}
      </div></div>
    </div>
  );
}

/** A row of key dates (the awards page). items = [{ t, d, now }]. */
export function KeyDates({ title = "Key dates", items }) {
  return (
    <nav className="nl-rail" aria-label={title}>
      <div className="nl-rail-in">
        <span className="nl-rail-ttl">{title}</span>
        <ol className="nl-stops nx-dates">
          {items.map((x) => (
            <li key={x.t}><span className={`nl-stop${x.now ? " next" : ""}`}><i className="nl-pt" aria-hidden="true" /><span><b>{x.t}</b><small>{x.d}</small></span></span></li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

/* What the Contact form turns into once the message is sent. */
export function ContactDone({ email, topic, inbox, onAgain }) {
  return (
    <div className="nx-sent" role="status" aria-live="polite">
      <span className="nx-sent-tick" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      </span>
      <h2>Message sent</h2>
      <p>Thanks. Your {String(topic || "").toLowerCase()} message is with the team, and we reply within two working days.</p>
      <p>A confirmation is on its way to <strong>{email}</strong>. If it doesn&apos;t arrive in a few minutes, check your spam folder, or write to <a href={`mailto:${inbox}`}>{inbox}</a>.</p>
      <a href="#" className="nx-btn" onClick={onAgain}>Send another message</a>
    </div>
  );
}
