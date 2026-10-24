import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, Coffee, ExternalLink, MapPin, Mic, Search, Trophy, UtensilsCrossed, Wine, X } from "lucide-react";
import Navbar from "../components/Navbar.tsx";
import Footer from "../components/Footer";
import WaitlistForm from "../components/WaitlistForm";
import useAgenda from "../hooks/useAgenda";
import useSiteSettings, { PUBLIC_API } from "../hooks/useSiteSettings";
import useSeo from "../hooks/useSeo";
import { client, speakerPhotoUrl } from "../utils/sanity";
import { FORMAT_MAP, PILLARS, SECTORS } from "../data/sessionFormats";
import { DAYS, buildSpeakerIndex, formatTime12, getDuration, matchSpeaker, slugifyName } from "../data/agenda";
import {
  boothLabel, byZone, dayParts, initialOf, keyTimes, loadExhibitors, momentOf, peopleLine, sessionCount, sessionWhen, siteLabel, speakerMatches,
} from "../lib/programme";
import { stayFrom } from "../lib/stayUpdated";

/* =========================================================
   /programme: TTFC 2026 at a glance (Oct 24 2026).
   The organiser: "Create a thetechfestival.com/programme page.
   This is summary of agenda, clickable view of speakers,
   exhibitors, breakfast, lunch, catalyst awards, gala dinner
   time." and "Add the stay-updated section for someone to sign
   up for 2027".
   - Key times: each day's CxO Breakfast, lunch, the Catalyst
     Awards evening and the Gala Dinner, from the live agenda
     (useAgenda: the CMS sessions /agenda shows), with the known
     times while it can't be read (src/lib/programme.js
     keyTimes); "Included with" is the Tickets page's public
     pass table (src/data/passFeatures.js).
   - The agenda, day by day: time, title, format, pillar /
     sector, speakers; a session opens for its people and a link
     to it on /agenda (?session=<id>).
   - Speakers: the CMS speakers the Speakers page shows, the
     same order, searchable; each opens /speakers/<slug>.
   - Exhibitors: GET {API}/app/exhibitors (backend services/
     exhibitors.js): company, booth, zone, logo, website, by
     zone; each opens a card.
   - Stay updated for TTFC 2027: the /stay-updated form
     (components/WaitlistForm.jsx, the staff-edited stay.* words),
     sent with source "programme".
   No discounts, no attendee numbers, no install prompts (the
   footer has the store badges). Shown while the agenda is on
   (AgendaGate in App.jsx, like /agenda). Light and dark.
========================================================= */

const SEO_TITLE = "TTFC 2026 Programme at a Glance | The Tech Festival Canada";
const SEO_DESCRIPTION = "Key times, the agenda, speakers and exhibitors of The Tech Festival Canada, October 26–27, 2026 at The Westin Harbour Castle, Toronto.";

// The Speakers page's list and order (src/pages/Speakers.jsx).
const SPEAKER_QUERY = '*[_type == "speaker"] | order(order asc, coalesce(rowPosition, 9999) asc) { _id, name, title, company, image }';
const SPEAKERS_SHOWN = 12;

const PILLAR_LABEL = Object.fromEntries(PILLARS.map((p) => [p.value, p.label]));
const SECTOR_LABEL = Object.fromEntries(SECTORS.map((p) => [p.value, p.label]));
const MOMENT_ICON = { breakfast: Coffee, lunch: UtensilsCrossed, awards: Trophy, gala: Wine };

const weekday = (day) => DAYS[day].longDate.split(",")[0];                       // "Monday"
const dayDate = (day) => DAYS[day].longDate.replace(/, \d{4}$/, "");             // "Monday, October 26"
const isoDay = (day) => (Number(day) === 1 ? "2026-10-26" : "2026-10-27");
const andList = (list) => (list.length <= 1 ? list.join("") : `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`);

function useDarkMode() {
  const [dark, setDark] = useState(() => typeof document !== "undefined" && document.body.classList.contains("dark-mode"));
  useEffect(() => {
    const read = () => setDark(document.body.classList.contains("dark-mode"));
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/* ---------------- key times ---------------- */

function KeyTimes({ data }) {
  return (
    <div className="pg-key-grid">
      {data.days.map((d) => (
        <article key={d.day} className="pg-card pg-key-day" aria-labelledby={`pg-key-d${d.day}`}>
          <h3 id={`pg-key-d${d.day}`} className="pg-key-dayname">
            <span className="pg-key-daylabel">{d.label}</span> {dayDate(d.day)}
          </h3>
          <ul className="pg-key-list">
            {d.items.map((it) => {
              const Icon = MOMENT_ICON[it.key] || Coffee;
              return (
                <li key={it.key} className={`pg-key-item pg-key-item--${it.key}`}>
                  <span className="pg-key-ico" aria-hidden="true"><Icon size={20} /></span>
                  <div className="pg-key-body">
                    <p className="pg-key-kicker">{it.label}</p>
                    <p className="pg-key-name">{it.name}</p>
                    {it.stage && <p className="pg-key-meta"><MapPin size={14} aria-hidden="true" />{it.stage}</p>}
                    {it.description && <p className="pg-key-desc">{it.description}</p>}
                    {it.includedWith.length > 0 && (
                      <p className="pg-key-incl">Included with the {andList(it.includedWith)} {it.includedWith.length > 1 ? "passes" : "Pass"}</p>
                    )}
                  </div>
                  <p className="pg-key-when"><time dateTime={`${isoDay(d.day)}T${it.time}`}>{it.when}</time></p>
                </li>
              );
            })}
          </ul>
        </article>
      ))}
    </div>
  );
}

/* ---------------- the agenda, day by day ---------------- */

function FormatChip({ s, dark }) {
  const f = FORMAT_MAP[s.format];
  const label = f?.label || s.type;
  if (!label) return null;
  const style = f ? { background: dark ? f.bg : f.bgL, color: dark ? f.tc : f.tcL } : undefined;
  return <span className="pg-chip pg-chip--format" style={style}>{label}</span>;
}

function PersonLink({ person, doc, role }) {
  const org = person.org || doc?.company || "";
  const photo = doc ? speakerPhotoUrl(doc.image, 96) : null;
  const inner = (
    <>
      <span className="pg-person-photo" aria-hidden="true">
        {photo ? <img src={photo} alt="" loading="lazy" width={36} height={36} /> : <Mic size={16} />}
      </span>
      <span className="pg-person-text">
        <span className="pg-person-name">{person.name}{person.tentative ? " (to be confirmed)" : ""}</span>
        {(org || role === "moderator") && <span className="pg-person-org">{role === "moderator" ? (org ? `Moderator · ${org}` : "Moderator") : org}</span>}
      </span>
    </>
  );
  return (
    <li className="pg-person">
      {doc ? <Link to={"/speakers/" + slugifyName(doc.name)} className="pg-person-link">{inner}</Link> : <span className="pg-person-link is-plain">{inner}</span>}
    </li>
  );
}

function SessionRow({ s, open, onToggle, speakerIndex, dark }) {
  const moment = momentOf(s);
  const when = sessionWhen(s);
  if (moment || s.isBreak) {
    const Icon = MOMENT_ICON[moment];
    return (
      <li className={`pg-row ${moment ? "pg-row--key" : "pg-row--break"}`}>
        <span className="pg-row-time"><time dateTime={`${isoDay(s.day)}T${s.time}`}>{formatTime12(s.time)}</time></span>
        <span className="pg-row-main">
          <span className="pg-row-title">{Icon && <Icon size={16} aria-hidden="true" className="pg-row-ico" />}{s.title}</span>
          {moment && <span className="pg-row-people">{when}{s.stage ? ` · ${s.stage}` : ""}</span>}
        </span>
      </li>
    );
  }
  const { names, more, moderator } = peopleLine(s);
  const panelId = `pg-session-${s.id}`;
  const people = (s.speakers || []).filter((p) => p?.name);
  return (
    <li className={"pg-row pg-row--session" + (open ? " is-open" : "")}>
      <button type="button" className="pg-row-btn" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
        <span className="pg-row-time">
          <time dateTime={`${isoDay(s.day)}T${s.time}`}>{formatTime12(s.time)}</time>
          <span className="pg-row-dur">{getDuration(s.time, s.endTime)}</span>
        </span>
        <span className="pg-row-main">
          <span className="pg-row-title">{s.title}</span>
          <span className="pg-row-meta">
            <FormatChip s={s} dark={dark} />
            {PILLAR_LABEL[s.pillar] && <span className="pg-chip">{PILLAR_LABEL[s.pillar]}</span>}
            {SECTOR_LABEL[s.sector] && <span className="pg-chip">{SECTOR_LABEL[s.sector]}</span>}
            {(names.length > 0 || moderator) && (
              <span className="pg-row-people">
                {names.join(", ")}{more > 0 ? ` +${more} more` : ""}
                {moderator ? `${names.length ? " · " : ""}Moderator: ${moderator}` : ""}
              </span>
            )}
          </span>
        </span>
        <ChevronDown size={18} className="pg-row-chev" aria-hidden="true" />
      </button>
      <div id={panelId} className="pg-row-more" hidden={!open}>
        {open && (
          <>
            <p className="pg-row-when">{when} · {getDuration(s.time, s.endTime)}{s.type ? ` · ${s.type}` : ""}</p>
            {(people.length > 0 || s.moderator?.name) ? (
              <ul className="pg-people" aria-label="Speakers">
                {people.map((p, i) => <PersonLink key={p.name + i} person={p} doc={matchSpeaker(speakerIndex, p.name)} role="speaker" />)}
                {s.moderator?.name && <PersonLink person={s.moderator} doc={matchSpeaker(speakerIndex, s.moderator.name)} role="moderator" />}
              </ul>
            ) : <p className="pg-muted">Speakers to be announced.</p>}
            {s.description && <p className="pg-row-desc">{s.description}</p>}
            <Link to={`/agenda?session=${encodeURIComponent(s.id)}`} className="pg-link">Open in the full agenda <ArrowRight size={16} aria-hidden="true" /></Link>
          </>
        )}
      </div>
    </li>
  );
}

function AgendaSummary({ sessions, loaded, speakerIndex, dark }) {
  const [day, setDay] = useState(1);
  const [open, setOpen] = useState(null);
  const tabRefs = useRef({});
  const pick = (d) => { setDay(d); setOpen(null); };
  const onKey = (e) => {
    const target = e.key === "ArrowRight" || e.key === "ArrowLeft" ? (day === 1 ? 2 : 1) : e.key === "Home" ? 1 : e.key === "End" ? 2 : null;
    if (!target) return;
    e.preventDefault();
    pick(target);
    tabRefs.current[target]?.focus();
  };
  const parts = useMemo(() => dayParts(sessions, day), [sessions, day]);
  return (
    <>
      <div role="tablist" aria-label="Festival days" className="pg-tabs">
        {[1, 2].map((d) => (
          <button key={d} ref={(el) => { tabRefs.current[d] = el; }} type="button" role="tab" id={`pg-tab-${d}`}
            aria-selected={day === d} aria-controls="pg-day-panel" tabIndex={day === d ? 0 : -1}
            className={"pg-tab" + (day === d ? " is-on" : "")} onClick={() => pick(d)} onKeyDown={onKey}>
            <span className="pg-tab-day">{DAYS[d].label}</span>
            <span className="pg-tab-date">{weekday(d).slice(0, 3)}, {DAYS[d].date}</span>
            {loaded && <span className="pg-tab-count">{sessionCount(sessions, d)} sessions</span>}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="pg-day-panel" aria-labelledby={`pg-tab-${day}`} tabIndex={0} className="pg-card pg-panel" aria-busy={!loaded || undefined}>
        {!loaded ? (
          <div className="pg-skel-list" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <span key={i} className="pg-skel pg-skel--row" />)}</div>
        ) : parts.length === 0 ? (
          <p className="pg-muted">The agenda for this day is coming soon.</p>
        ) : (
          // Wide screens: the morning beside the afternoon and evening, so a day fits about one screen.
          <div className="pg-cols">
            {[parts.filter((p) => p.part === "Morning"), parts.filter((p) => p.part !== "Morning")].filter((col) => col.length).map((col, ci) => (
              <div key={ci} className="pg-col">
                {col.map((p) => (
                  <div key={p.part} className="pg-part">
                    <h3 className="pg-part-title">{p.part}</h3>
                    <ol className="pg-rows">
                      {p.sessions.map((s) => (
                        <SessionRow key={s.id} s={s} dark={dark} speakerIndex={speakerIndex}
                          open={open === s.id} onToggle={() => setOpen((x) => (x === s.id ? null : s.id))} />
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ---------------- speakers ---------------- */

function SpeakerGrid({ docs, failed }) {
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);
  const list = useMemo(() => (docs || []).filter((d) => d?.name && speakerMatches(d, q)), [docs, q]);
  const searching = q.trim() !== "";
  const shown = searching || all ? list : list.slice(0, SPEAKERS_SHOWN);
  const total = (docs || []).filter((d) => d?.name).length;

  if (failed) {
    return <p className="pg-muted">The speakers couldn't be loaded right now. <Link to="/speakers" className="pg-inline">See the speakers page</Link>.</p>;
  }
  return (
    <>
      <div className="pg-search">
        <label htmlFor="pg-speaker-q" className="pg-sr">Search speakers by name or organisation</label>
        <Search size={18} aria-hidden="true" className="pg-search-ico" />
        <input id="pg-speaker-q" type="search" className="pg-search-input" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or organisation" autoComplete="off" spellCheck={false} disabled={!docs} />
        {q && <button type="button" className="pg-search-clear" onClick={() => setQ("")} aria-label="Clear the search"><X size={16} aria-hidden="true" /></button>}
      </div>
      <p className="pg-count" aria-live="polite">
        {!docs ? "Loading the speakers…" : searching ? `${list.length} of ${total} speakers match` : `${total} speakers`}
      </p>
      {!docs ? (
        <ul className="pg-spk-grid" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <li key={i} className="pg-skel pg-skel--card" />)}</ul>
      ) : shown.length === 0 ? (
        <p className="pg-muted">No speakers match “{q.trim()}”.</p>
      ) : (
        <ul className="pg-spk-grid">
          {shown.map((d) => {
            const photo = speakerPhotoUrl(d.image, 320);
            return (
              <li key={d._id}>
                <Link to={"/speakers/" + slugifyName(d.name)} className="pg-spk">
                  <span className="pg-spk-photo">
                    {photo ? <img src={photo} alt={`Photo of ${d.name.trim()}`} loading="lazy" width={160} height={160} /> : <Mic size={36} aria-hidden="true" />}
                  </span>
                  <span className="pg-spk-name">{d.name.trim()}</span>
                  {d.title && <span className="pg-spk-title">{d.title.trim()}</span>}
                  {d.company && <span className="pg-spk-org">{d.company.trim()}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <div className="pg-actions">
        {docs && !searching && list.length > SPEAKERS_SHOWN && (
          <button type="button" className="pg-ghost" aria-expanded={all} onClick={() => setAll((v) => !v)}>
            {all ? "Show fewer speakers" : `Show all ${total} speakers`}
          </button>
        )}
        <Link to="/speakers" className="pg-link">The speakers page <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
    </>
  );
}

/* ---------------- exhibitors ---------------- */

function Logo({ x, size = "md" }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className={`pg-logo pg-logo--${size}`}>
      {x.logo && !broken
        ? <img src={x.logo} alt={`${x.name} logo`} loading="lazy" onError={() => setBroken(true)} />
        : <span className="pg-monogram" aria-hidden="true">{initialOf(x.name)}</span>}
    </span>
  );
}

function ExhibitorDialog({ x, zone, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (x && !d.open) {
      if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
    }
    if (!x && d.open) d.close?.();
  }, [x]);
  const close = () => { const d = ref.current; if (d?.open && typeof d.close === "function") d.close(); else onClose(); };
  return (
    <dialog ref={ref} className="pg-dialog" aria-labelledby="pg-dialog-title" onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) close(); }}>
      {x && (
        <div className="pg-dialog-card">
          <button type="button" className="pg-dialog-x" onClick={close} aria-label="Close" autoFocus><X size={20} aria-hidden="true" /></button>
          <Logo x={x} size="lg" />
          <h3 id="pg-dialog-title" className="pg-dialog-title">{x.name}</h3>
          <p className="pg-dialog-booth">{boothLabel(x)}</p>
          {zone?.area && <p className="pg-dialog-zone"><MapPin size={15} aria-hidden="true" />{zone.name} · {zone.area}</p>}
          <div className="pg-dialog-actions">
            {x.website && (
              <a href={x.website} target="_blank" rel="noopener noreferrer" className="pg-btn">
                Visit {siteLabel(x.website) || "their website"} <ExternalLink size={16} aria-hidden="true" />
                <span className="pg-sr"> (opens in a new tab)</span>
              </a>
            )}
            <Link to="/venue" className="pg-ghost">The venue floor plan</Link>
          </div>
        </div>
      )}
    </dialog>
  );
}

function Exhibitors({ state, onRetry }) {
  const [openKey, setOpenKey] = useState(null);
  if (state.status === "loading") {
    return <ul className="pg-ex-grid" aria-hidden="true">{Array.from({ length: 4 }, (_, i) => <li key={i} className="pg-skel pg-skel--tile" />)}</ul>;
  }
  if (state.status === "error") {
    return (
      <div className="pg-card pg-empty" role="status">
        <p>The exhibitor list couldn't be loaded right now.</p>
        <button type="button" className="pg-ghost" onClick={onRetry}>Try again</button>
      </div>
    );
  }
  const groups = byZone(state.data);
  if (!groups.length) {
    return (
      <div className="pg-card pg-empty">
        <p>The exhibitor list is coming soon, as booths are confirmed.</p>
        <Link to="/venue" className="pg-link">The venue floor plan <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
    );
  }
  const all = groups.flatMap((g) => g.items);
  const current = all.find((x) => x.key === openKey) || null;
  const zoneOf = (x) => state.data.zones.find((z) => z.key === x?.zone) || null;
  return (
    <>
      {groups.map((g) => (
        <div key={g.key} className="pg-zone">
          <h3 className="pg-zone-title">
            {g.area ? <>{g.name} <span className="pg-zone-area">· {g.area}</span></> : g.name}
            {g.booths && <span className="pg-zone-booths">Booths {g.booths}</span>}
          </h3>
          <ul className="pg-ex-grid">
            {g.items.map((x) => (
              <li key={x.key}>
                <button type="button" className="pg-ex" aria-haspopup="dialog" onClick={() => setOpenKey(x.key)}>
                  <span className="pg-ex-booth">{boothLabel(x)}</span>
                  <Logo x={x} />
                  <span className="pg-ex-name">{x.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <ExhibitorDialog x={current} zone={zoneOf(current)} onClose={() => setOpenKey(null)} />
    </>
  );
}

/* ---------------- the page ---------------- */

export default function Programme() {
  const dark = useDarkMode();
  useSeo(SEO_TITLE, SEO_DESCRIPTION);
  const settings = useSiteSettings();
  const copy = stayFrom(settings);
  const { sessions, source, loaded } = useAgenda();
  const times = useMemo(() => keyTimes(sessions, { live: source === "cms" }), [sessions, source]);

  const [speakerDocs, setSpeakerDocs] = useState(null);
  const [speakersFailed, setSpeakersFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    client.fetch(SPEAKER_QUERY)
      .then((data) => { if (alive) setSpeakerDocs(Array.isArray(data) ? data : []); })
      .catch(() => { if (alive) setSpeakersFailed(true); });
    return () => { alive = false; };
  }, []);
  const speakerIndex = useMemo(() => buildSpeakerIndex(speakerDocs || []), [speakerDocs]);

  const [ex, setEx] = useState({ status: "loading", data: null });
  const [exTry, setExTry] = useState(0);
  useEffect(() => {
    const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    loadExhibitors(PUBLIC_API, { signal: ctl?.signal })
      .then((data) => setEx({ status: "ok", data }))
      .catch((err) => { if (err?.name !== "AbortError") setEx({ status: "error", data: null }); });
    return () => ctl?.abort();
  }, [exTry]);

  const t = dark
    ? { bg: "#06020f", bg2: "#0b0518", text: "#ffffff", mid: "rgba(225,215,255,0.8)", dim: "rgba(200,185,255,0.62)", card: "rgba(255,255,255,0.045)", cardSolid: "#0f0820",
        line: "rgba(155,135,245,0.2)", accent: "#c4adff", chip: "rgba(155,135,245,0.16)", input: "rgba(255,255,255,0.06)", err: "#ff9b9b", key: "rgba(245,166,35,0.12)", keyText: "#ffd08a", skel: "rgba(255,255,255,0.07)" }
    : { bg: "#f8f7fc", bg2: "#f0ecfa", text: "#0d0520", mid: "rgba(13,5,32,0.72)", dim: "rgba(13,5,32,0.56)", card: "#ffffff", cardSolid: "#ffffff",
        line: "rgba(122,63,209,0.16)", accent: "#6a2fc4", chip: "rgba(122,63,209,0.09)", input: "#ffffff", err: "#b42318", key: "rgba(245,166,35,0.12)", keyText: "#8a5200", skel: "rgba(122,63,209,0.08)" };

  const vars = {
    "--pg-bg": t.bg, "--pg-bg2": t.bg2, "--pg-text": t.text, "--pg-mid": t.mid, "--pg-dim": t.dim, "--pg-card": t.card, "--pg-card-solid": t.cardSolid,
    "--pg-line": t.line, "--pg-accent": t.accent, "--pg-chip": t.chip, "--pg-key": t.key, "--pg-key-text": t.keyText, "--pg-skel": t.skel,
    // The waitlist form's colours (components/WaitlistForm.jsx).
    "--su-text": t.text, "--su-mid": t.mid, "--su-dim": t.dim, "--su-line": t.line, "--su-input": t.input, "--su-chip": t.chip, "--su-accent": t.accent, "--su-err": t.err,
  };

  return (
    <>
      <Navbar />
      <main className="pg" style={vars}>
        <style>{`
          .pg { background: var(--pg-bg); color: var(--pg-text); min-height: 100vh; overflow-x: hidden; overflow-x: clip; font-family: 'Montserrat', sans-serif; }
          .pg-wrap { max-width: 1120px; margin: 0 auto; padding: 0 16px; }
          .pg-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
          .pg a { color: inherit; }
          .pg :focus-visible { outline: 3px solid var(--pg-accent); outline-offset: 2px; }

          .pg-hero { position: relative; padding: clamp(112px, 15vw, 168px) 0 clamp(36px, 5vw, 56px); text-align: center; isolation: isolate; }
          .pg-hero::before { content: ""; position: absolute; inset: 0; z-index: -1;
            background: radial-gradient(ellipse 75% 55% at 50% 0%, rgba(122,63,209,${dark ? 0.3 : 0.12}) 0%, transparent 70%),
                        radial-gradient(ellipse 40% 35% at 88% 25%, rgba(245,166,35,${dark ? 0.14 : 0.1}) 0%, transparent 70%); }
          .pg-eyebrow { margin: 0; font-family: 'Orbitron', sans-serif; font-size: 12px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: var(--pg-accent); }
          .pg-h1 { margin: 16px 0 0; font-family: 'Orbitron', sans-serif; font-size: clamp(34px, 6.4vw, 68px); font-weight: 900; line-height: 1.08; letter-spacing: -0.5px; }
          .pg-grad { background: linear-gradient(135deg, #7a3fd1 10%, #d9468f 55%, #f5a623 95%); -webkit-background-clip: text; background-clip: text; color: transparent; }
          .pg-intro { max-width: 640px; margin: 18px auto 0; font-size: clamp(16px, 2vw, 19px); line-height: 1.65; color: var(--pg-mid); }
          .pg-jump { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 26px 0 0; padding: 0; list-style: none; }
          .pg-jump a { display: inline-flex; align-items: center; min-height: 44px; padding: 0 16px; border-radius: 999px; border: 1px solid var(--pg-line); background: var(--pg-card);
            font-size: 14px; font-weight: 700; text-decoration: none; color: var(--pg-text); }
          .pg-jump a:hover { border-color: var(--pg-accent); }

          .pg-sec { padding: clamp(40px, 6vw, 72px) 0; scroll-margin-top: 84px; }
          .pg-sec--alt { background: var(--pg-bg2); }
          .pg-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px 24px; margin-bottom: 22px; }
          .pg-h2 { margin: 0; font-family: 'Orbitron', sans-serif; font-size: clamp(24px, 3.4vw, 34px); font-weight: 800; line-height: 1.15; }
          .pg-lede { max-width: 720px; margin: 10px 0 0; font-size: 16px; line-height: 1.6; color: var(--pg-mid); }
          .pg-muted { margin: 0; color: var(--pg-dim); font-size: 15px; line-height: 1.55; }
          .pg-card { background: var(--pg-card); border: 1px solid var(--pg-line); border-radius: 20px; box-shadow: 0 10px 30px rgba(122,63,209,${dark ? 0.12 : 0.06}); }

          .pg-link { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; font-weight: 700; color: var(--pg-accent) !important; text-decoration: none; }
          .pg-link:hover { text-decoration: underline; text-underline-offset: 3px; }
          .pg-inline { color: var(--pg-accent) !important; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }
          .pg-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 0 22px; border: 0; border-radius: 999px;
            background: linear-gradient(135deg, #7a3fd1 0%, #f5a623 100%); color: #fff !important; font-family: 'Orbitron', sans-serif; font-size: 12px; font-weight: 800;
            letter-spacing: 1px; text-transform: uppercase; text-decoration: none; cursor: pointer; box-shadow: 0 6px 20px rgba(122,63,209,0.28); }
          .pg-ghost { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 44px; padding: 0 18px; border-radius: 999px;
            border: 1.5px solid var(--pg-line); background: transparent; color: var(--pg-text) !important; font: inherit; font-size: 15px; font-weight: 700; text-decoration: none; cursor: pointer; }
          .pg-ghost:hover { border-color: var(--pg-accent); }
          .pg-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 22px; margin-top: 22px; }
          .pg-cta-row { display: flex; justify-content: center; margin-top: 26px; }

          /* key times */
          .pg-key-grid { display: grid; gap: 18px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .pg-key-day { padding: clamp(18px, 2.6vw, 26px); }
          .pg-key-dayname { margin: 0 0 6px; font-family: 'Montserrat', sans-serif; font-size: 18px; font-weight: 800; letter-spacing: 0; }
          .pg-key-daylabel { display: inline-flex; align-items: center; min-height: 28px; margin-right: 8px; padding: 0 12px; border-radius: 999px; background: var(--pg-chip);
            color: var(--pg-accent); font-family: 'Orbitron', sans-serif; font-size: 12px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; vertical-align: 2px; }
          .pg-key-list { list-style: none; margin: 0; padding: 0; }
          .pg-key-item { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; gap: 4px 14px; align-items: start; padding: 16px 0; border-top: 1px solid var(--pg-line); }
          .pg-key-item:first-child { border-top: 0; }
          .pg-key-ico { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; background: var(--pg-key); color: var(--pg-key-text); }
          .pg-key-body > p { margin: 0; }
          .pg-key-kicker { font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 1.6px; text-transform: uppercase; color: var(--pg-dim); }
          .pg-key-body > .pg-key-name { margin-top: 2px; font-size: 17px; font-weight: 800; line-height: 1.3; }
          .pg-key-body > .pg-key-meta { display: flex; align-items: center; gap: 5px; margin-top: 4px; font-size: 14px; color: var(--pg-mid); }
          .pg-key-body > .pg-key-desc { margin-top: 4px; font-size: 14px; line-height: 1.5; color: var(--pg-mid); }
          .pg-key-body > .pg-key-incl { margin-top: 6px; font-size: 13px; font-weight: 600; color: var(--pg-dim); }
          .pg-key-when { margin: 0; font-family: 'Orbitron', sans-serif; font-size: 15px; font-weight: 800; white-space: nowrap; color: var(--pg-accent); text-align: right; padding-top: 2px; }

          /* the agenda */
          .pg-tabs { display: flex; gap: 10px; margin-bottom: 14px; }
          .pg-tab { flex: 1 1 0; display: grid; justify-items: start; gap: 2px; min-height: 64px; padding: 10px 16px; border-radius: 16px; border: 1.5px solid var(--pg-line);
            background: var(--pg-card); color: var(--pg-text); font: inherit; text-align: left; cursor: pointer; }
          .pg-tab.is-on { border-color: var(--pg-accent); background: var(--pg-chip); box-shadow: inset 0 -3px 0 var(--pg-accent); }
          .pg-tab-day { font-family: 'Orbitron', sans-serif; font-size: 14px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
          .pg-tab-date { font-size: 14px; font-weight: 600; color: var(--pg-mid); }
          .pg-tab-count { font-size: 12px; font-weight: 600; color: var(--pg-dim); }
          .pg-panel { padding: clamp(8px, 2vw, 18px) clamp(10px, 2.4vw, 24px); }
          .pg-cols { display: grid; gap: 0 32px; }
          .pg-col { min-width: 0; }
          .pg-part + .pg-part { margin-top: 6px; }
          .pg-part-title { margin: 14px 0 4px; padding: 0 6px; font-family: 'Orbitron', sans-serif; font-size: 12px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: var(--pg-dim); }
          .pg-rows { list-style: none; margin: 0; padding: 0; }
          .pg-row { border-top: 1px solid var(--pg-line); }
          .pg-part .pg-row:first-child { border-top: 0; }
          .pg-row--break, .pg-row--key { display: grid; grid-template-columns: 76px minmax(0, 1fr); gap: 12px; padding: 8px 6px; }
          .pg-row--break .pg-row-title { font-weight: 500; color: var(--pg-dim); font-size: 14px; }
          .pg-row--key { background: var(--pg-key); border-radius: 12px; border-top-color: transparent; margin: 4px 0; }
          .pg-row--key + .pg-row { border-top-color: transparent; }
          .pg-row--key .pg-row-title { color: var(--pg-key-text); }
          .pg-row-ico { display: inline-block; margin-right: 6px; vertical-align: -2px; }
          .pg-row-btn { width: 100%; display: grid; grid-template-columns: 76px minmax(0, 1fr) 20px; gap: 12px; align-items: start; padding: 9px 6px; border: 0; border-radius: 12px;
            background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
          .pg-row-btn:hover { background: var(--pg-chip); }
          .pg-row-time { display: grid; gap: 1px; align-content: start; font-family: 'Orbitron', sans-serif; font-size: 13px; font-weight: 800; color: var(--pg-accent); white-space: nowrap; padding-top: 2px; }
          .pg-row--break .pg-row-time { color: var(--pg-dim); font-weight: 700; }
          .pg-row--key .pg-row-time { color: var(--pg-key-text); }
          .pg-row-dur { font-family: 'Montserrat', sans-serif; font-size: 12px; font-weight: 600; color: var(--pg-dim); }
          .pg-row-main { display: grid; gap: 4px; min-width: 0; }
          .pg-row-title { font-size: 15px; font-weight: 700; line-height: 1.36; }
          .pg-row-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; }
          .pg-row-meta:empty { display: none; }
          .pg-chip { display: inline-flex; align-items: center; min-height: 22px; padding: 0 9px; border-radius: 6px; background: var(--pg-chip); color: var(--pg-mid);
            font-family: 'Orbitron', sans-serif; font-size: 10px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; }
          .pg-row-people { font-size: 13px; line-height: 1.45; color: var(--pg-mid); }
          .pg-row-chev { margin-top: 3px; color: var(--pg-dim); transition: transform .2s; }
          .is-open .pg-row-chev { transform: rotate(180deg); }
          .pg-row-more { padding: 0 6px 14px calc(76px + 18px); }
          .pg-row-more > * + * { margin-top: 12px; }
          .pg-row-when { margin: 0; font-size: 14px; font-weight: 600; color: var(--pg-mid); }
          .pg-row-desc { margin: 0; font-size: 15px; line-height: 1.6; color: var(--pg-mid); }
          .pg-people { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 4px 18px; }
          .pg-person-link { display: inline-flex; align-items: center; gap: 10px; min-height: 44px; text-decoration: none; }
          .pg-person-link:not(.is-plain):hover .pg-person-name { text-decoration: underline; text-underline-offset: 3px; }
          .pg-person-photo { width: 36px; height: 36px; flex-shrink: 0; border-radius: 50%; overflow: hidden; display: grid; place-items: center; background: var(--pg-chip); color: var(--pg-dim); }
          .pg-person-photo img { width: 100%; height: 100%; object-fit: cover; object-position: center top; }
          .pg-person-text { display: grid; min-width: 0; }
          .pg-person-name { font-size: 14px; font-weight: 700; color: var(--pg-text); }
          .pg-person-link:not(.is-plain) .pg-person-name { color: var(--pg-accent); }
          .pg-person-org { font-size: 12px; color: var(--pg-dim); }

          /* speakers */
          .pg-search { position: relative; max-width: 520px; }
          .pg-search-ico { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--pg-dim); pointer-events: none; }
          .pg-search-input { width: 100%; box-sizing: border-box; min-height: 50px; padding: 0 46px; border-radius: 999px; border: 1.5px solid var(--pg-line);
            background: var(--su-input); color: var(--pg-text); font: inherit; font-size: 16px; -webkit-appearance: none; appearance: none; }
          .pg-search-input::placeholder { color: var(--pg-dim); }
          .pg-search-input::-webkit-search-cancel-button { display: none; }
          .pg-search-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 40px; height: 40px; display: grid; place-items: center;
            border: 0; border-radius: 50%; background: transparent; color: var(--pg-dim); cursor: pointer; padding: 0; }
          .pg-count { margin: 12px 0 16px; font-size: 14px; font-weight: 600; color: var(--pg-dim); }
          .pg-spk-grid { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
          .pg-spk { display: flex; flex-direction: column; height: 100%; padding: 10px 10px 14px; border-radius: 18px; border: 1px solid var(--pg-line);
            background: var(--pg-card); text-decoration: none; transition: transform .2s, border-color .2s; }
          .pg-spk:hover { transform: translateY(-3px); border-color: var(--pg-accent); }
          .pg-spk-photo { display: grid; place-items: center; aspect-ratio: 1 / 1; border-radius: 12px; overflow: hidden; background: var(--pg-chip); color: var(--pg-accent); margin-bottom: 10px; }
          .pg-spk-photo img { width: 100%; height: 100%; object-fit: cover; object-position: center top; }
          .pg-spk-name { font-size: 15px; font-weight: 800; line-height: 1.3; color: var(--pg-text); }
          .pg-spk-title { margin-top: 4px; font-size: 13px; line-height: 1.4; color: var(--pg-mid); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
          .pg-spk-org { margin-top: 4px; font-size: 13px; font-weight: 600; line-height: 1.4; color: var(--pg-dim); }

          /* exhibitors */
          .pg-zone + .pg-zone { margin-top: 30px; }
          .pg-zone-title { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; margin: 0 0 14px; font-family: 'Montserrat', sans-serif; font-size: 18px; font-weight: 800; letter-spacing: 0; }
          .pg-zone-area { font-weight: 600; color: var(--pg-mid); }
          .pg-zone-booths { font-size: 13px; font-weight: 700; color: var(--pg-dim); }
          .pg-ex-grid { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
          .pg-ex { position: relative; width: 100%; height: 100%; display: grid; align-content: start; gap: 10px; padding: 12px; border-radius: 18px; border: 1px solid var(--pg-line);
            background: var(--pg-card); color: var(--pg-text); font: inherit; text-align: left; cursor: pointer; transition: transform .2s, border-color .2s; }
          .pg-ex:hover { transform: translateY(-3px); border-color: var(--pg-accent); }
          .pg-ex-booth { position: absolute; top: 18px; left: 18px; z-index: 1; padding: 3px 10px; border-radius: 999px; background: #7a3fd1; color: #fff;
            font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 0.8px; }
          .pg-ex-name { font-size: 15px; font-weight: 800; line-height: 1.3; padding: 0 2px; }
          .pg-logo { display: grid; place-items: center; overflow: hidden; border-radius: 12px; background: #ffffff; border: 1px solid rgba(13,5,32,0.06); }
          .pg-logo--md { aspect-ratio: 16 / 10; padding: 32px 18px 12px; }
          .pg-logo--lg { width: min(260px, 100%); aspect-ratio: 16 / 9; padding: 18px; margin: 0 auto; }
          .pg-logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
          .pg-monogram { display: grid; place-items: center; width: 56px; height: 56px; border-radius: 16px; background: linear-gradient(135deg, #7a3fd1, #d9468f);
            color: #fff; font-family: 'Orbitron', sans-serif; font-size: 26px; font-weight: 900; }
          .pg-empty { display: grid; justify-items: start; gap: 8px; padding: 22px; }
          .pg-empty p { margin: 0; color: var(--pg-mid); }
          .pg-dialog { margin: auto; width: min(460px, calc(100vw - 32px)); max-height: calc(100vh - 48px); padding: 0; border: 0; border-radius: 22px; background: var(--pg-card-solid);
            color: var(--pg-text); box-shadow: 0 30px 80px rgba(0,0,0,0.35); }
          .pg-dialog::backdrop { background: rgba(6,2,15,0.6); }
          .pg-dialog-card { position: relative; display: grid; gap: 8px; justify-items: center; text-align: center; padding: 30px 22px 24px; border: 1px solid var(--pg-line); border-radius: 22px; }
          .pg-dialog-x { position: absolute; top: 10px; right: 10px; width: 44px; height: 44px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 50%;
            background: var(--pg-chip); color: var(--pg-text); cursor: pointer; }
          .pg-dialog-title { margin: 10px 0 0; font-family: 'Orbitron', sans-serif; font-size: 22px; font-weight: 800; line-height: 1.2; }
          .pg-dialog-booth { margin: 0; font-family: 'Orbitron', sans-serif; font-size: 14px; font-weight: 800; letter-spacing: 1px; color: var(--pg-accent); text-transform: uppercase; }
          .pg-dialog-zone { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 15px; color: var(--pg-mid); }
          .pg-dialog-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 12px; }

          /* skeletons */
          .pg-skel { display: block; background: var(--pg-skel); border-radius: 14px; animation: pgPulse 1.4s ease-in-out infinite; }
          .pg-skel-list { display: grid; gap: 10px; padding: 8px 0; }
          .pg-skel--row { height: 56px; }
          .pg-skel--card { aspect-ratio: 3 / 4; }
          .pg-skel--tile { height: 170px; }
          @keyframes pgPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }

          /* stay updated */
          .pg-stay-card { margin-top: 18px; position: relative; overflow: hidden; padding: clamp(22px, 4vw, 38px); }
          .pg-stay-card::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 4px; background: linear-gradient(90deg, #7a3fd1 0 40%, #d9468f 40% 75%, #f5a623 75% 100%); }
          .pg-stay-title { margin: 0; font-family: 'Orbitron', sans-serif; font-size: clamp(20px, 2.6vw, 26px); font-weight: 800; line-height: 1.2; }

          @media (min-width: 1024px) {
            .pg-cols { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          }
          @media (max-width: 860px) {
            .pg-key-grid { grid-template-columns: 1fr; }
          }
          @media (max-width: 560px) {
            .pg-key-item { grid-template-columns: 40px minmax(0, 1fr); }
            .pg-key-ico { width: 40px; height: 40px; grid-row: span 2; }
            .pg-key-when { grid-column: 2; grid-row: 1; text-align: left; font-size: 14px; }
            .pg-key-body { grid-column: 2; }
            .pg-tab { padding: 10px 12px; }
            .pg-row--break, .pg-row--key { grid-template-columns: 64px minmax(0, 1fr); gap: 10px; }
            .pg-row-btn { grid-template-columns: 64px minmax(0, 1fr) 18px; gap: 10px; }
            .pg-row-time { font-size: 12px; }
            .pg-row-title { font-size: 14.5px; }
            .pg-row-more { padding-left: 6px; }
            .pg-spk-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
            .pg-ex-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
            .pg-ex-booth { top: 16px; left: 16px; font-size: 10px; padding: 2px 8px; }
            .pg-logo--md { aspect-ratio: 4 / 3; padding: 30px 10px 10px; }
            .pg-logo--md .pg-monogram { width: 46px; height: 46px; font-size: 22px; border-radius: 13px; }
            .pg-ex-name { font-size: 14px; }
          }
          @media (prefers-reduced-motion: reduce) {
            .pg-spk, .pg-ex, .pg-row-chev { transition: none; }
            .pg-spk:hover, .pg-ex:hover { transform: none; }
            .pg-skel { animation: none; }
          }
        `}</style>

        <section className="pg-hero" aria-labelledby="pg-h1">
          <div className="pg-wrap">
            <p className="pg-eyebrow">TTFC 2026 · October 26–27 · Toronto</p>
            <h1 id="pg-h1" className="pg-h1">The <span className="pg-grad">Programme</span></h1>
            <p className="pg-intro">
              Two days at The Westin Harbour Castle, Toronto: the key times, the sessions, the speakers and the exhibitors, on one page.
            </p>
            {/* Not a <nav>: the site's styles.css turns every other <nav> into a sticky bar. */}
            <div role="navigation" aria-label="On this page">
              <ul className="pg-jump">
                <li><a href="#key-times">Key times</a></li>
                <li><a href="#agenda">Agenda</a></li>
                <li><a href="#speakers">Speakers</a></li>
                <li><a href="#exhibitors">Exhibitors</a></li>
                <li><a href="#stay-updated">TTFC 2027</a></li>
              </ul>
            </div>
          </div>
        </section>

        <section id="key-times" className="pg-sec" aria-labelledby="pg-key-h" style={{ paddingTop: 8 }}>
          <div className="pg-wrap">
            <div className="pg-head">
              <div>
                <h2 id="pg-key-h" className="pg-h2">Key times</h2>
                <p className="pg-lede">Breakfast, lunch and the evenings, both days. All times are Toronto time.</p>
              </div>
              <Link to="/tickets" className="pg-link">What each pass includes <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
            <KeyTimes data={times} />
          </div>
        </section>

        <section id="agenda" className="pg-sec pg-sec--alt" aria-labelledby="pg-agenda-h">
          <div className="pg-wrap">
            <div className="pg-head">
              <div>
                <h2 id="pg-agenda-h" className="pg-h2">The agenda at a glance</h2>
                <p className="pg-lede">Every session, day by day. Open one for its speakers, or see it in the full agenda.</p>
              </div>
            </div>
            <AgendaSummary sessions={sessions} loaded={loaded} speakerIndex={speakerIndex} dark={dark} />
            <div className="pg-cta-row">
              <Link to="/agenda" className="pg-btn">See the full agenda <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
          </div>
        </section>

        <section id="speakers" className="pg-sec" aria-labelledby="pg-speakers-h">
          <div className="pg-wrap">
            <div className="pg-head">
              <div>
                <h2 id="pg-speakers-h" className="pg-h2">Speakers</h2>
                <p className="pg-lede">Select a speaker for their profile and sessions.</p>
              </div>
            </div>
            <SpeakerGrid docs={speakerDocs} failed={speakersFailed} />
          </div>
        </section>

        <section id="exhibitors" className="pg-sec pg-sec--alt" aria-labelledby="pg-ex-h">
          <div className="pg-wrap">
            <div className="pg-head">
              <div>
                <h2 id="pg-ex-h" className="pg-h2">Exhibitors</h2>
                <p className="pg-lede">On the expo floor in two zones: Zone A in the Harbour Ballroom Foyer and Zone B in the Pier 4 &amp; 5 Foyer. Select one for its booth and website.</p>
              </div>
              <Link to="/venue" className="pg-link">The venue <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
            <Exhibitors state={ex} onRetry={() => { setEx({ status: "loading", data: null }); setExTry((n) => n + 1); }} />
          </div>
        </section>

        <section id="stay-updated" className="pg-sec" aria-labelledby="pg-stay-h">
          <div className="pg-wrap">
            <p className="pg-eyebrow">TTFC 2027</p>
            <h2 id="pg-stay-h" className="pg-h2" style={{ marginTop: 10 }}>Stay updated for TTFC 2027</h2>
            {copy["stay.journey_intro"] && <p className="pg-lede">{copy["stay.journey_intro"]}</p>}
            <Link to="/stay-updated" className="pg-link">See the 2027 journey <ArrowRight size={16} aria-hidden="true" /></Link>
            <div className="pg-card pg-stay-card">
              <h3 className="pg-stay-title">{copy["stay.form_title"]}</h3>
              <WaitlistForm copy={copy} source="programme" />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
