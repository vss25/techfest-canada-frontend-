import { useEffect, useRef, useState } from "react";
import { useDesk, setStation, requestSignOut } from "../lib/desk.js";
import { dayHeading } from "../lib/timers.js";
import { stationPath } from "../lib/routes.js";
import { DESK_PATH } from "../deskPath.js";
import { homeDays, moreTiles } from "../lib/home.js";

/* The home (/checkin/, Oct 24 2026, the organiser: "On the checkin home page — only show lobby, floor1, CXO breakfast,
   lunch, evening entry for day 1 and day 2. Hide media, av station, exhibitor desk under More at the bottom right.
   But still follow the same URL slug structure."). Two sections, Day 1 · Mon 26 Oct and Day 2 · Tue 27 Oct, each with
   Lobby, Floor 1, CxO Breakfast, Lunch and Evening entry and their times from the agenda (lib/home.js). Today's is
   highlighted; the other day's tiles are visibly off ("Opens Tue 27 Oct"). A day that isn't an event day: both are
   open, for practice. "More" (bottom right): Media desk, AV station, Exhibitor desk. Every tile is a link to the
   station's own address (lib/routes.js), so a laptop can open one in a new tab. */

const ICONS = { lobby: "🚪", desk: "🎫", breakfast: "☕", lunch: "🍽", evening: "🌙", media: "🎙", av: "🎚", exhibitor: "🏷", drinks: "🥤" };

/** A plain click opens the station here (its address, then its Start screen); ⌘ / Ctrl / middle click: a new tab. */
const pick = (key) => (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  setStation(key);
};

function Tile({ t }) {
  const body = (
    <>
      <span className="ci-tile-top">
        <span className="ci-station-icon" aria-hidden="true">{ICONS[t.key]}</span>
        {t.badge && <span className={`ci-tile-badge is-${t.badgeTone || "info"}`}>{t.badge}</span>}
      </span>
      <span className="ci-station-name">{t.label}</span>
      <span className="ci-station-sub">{t.sub}</span>
      {t.time && <span className="ci-tile-time">{t.time}</span>}
      {t.doors && <span className="ci-tile-doors">{t.doors}</span>}
      {t.state && <span className={`ci-station-state is-${t.stateCode}`}>{t.state}</span>}
    </>
  );
  if (t.disabled) {
    return <span className="ci-station-tile is-off" aria-disabled="true" title={t.state}>{body}</span>;
  }
  return <a className={`ci-station-tile${t.today ? " is-today" : ""}`} href={stationPath(t.key)} onClick={pick(t.key)}>{body}</a>;
}

export default function Stations() {
  const d = useDesk();
  const s = d.state;
  const [more, setMore] = useState(false);
  const days = homeDays(s);
  const extra = moreTiles(s);
  return (
    <main className="ci-stations ci-home">
      <header className="ci-stations-head">
        <div className="ci-home-title">
          <img src={`${DESK_PATH}icons/icon-96.png`} alt="" width="40" height="40" className="ci-logo" />
          <div>
            <h1>TTFC Check-in</h1>
            <p className="ci-muted">{dayHeading(s?.today)} · Signed in as {d.session?.user?.name} ({d.session?.staff ? "staff" : "volunteer"})</p>
          </div>
        </div>
        <button type="button" className="ci-btn ci-btn-ghost ci-btn-s" onClick={requestSignOut} disabled={d.signingOut}>{d.signingOut ? "Sending taps…" : "Sign out"}</button>
      </header>
      {s?.today?.date && !s.today.eventDay && <p className="ci-notice">Not an event day: every station is in practice mode (taps are practice marks: they check nobody in and can be undone).</p>}
      <p className="ci-home-hint ci-muted">Pick this device's station. Each one has its own link (e.g. thetechfestival.com/checkin/lobby): it stays on that station after a reload.</p>
      {days.map((day) => (
        <section key={day.key} className={`ci-day${day.today ? " is-today" : ""}${day.off ? " is-off" : ""}`} aria-labelledby={`ci-day-${day.key}`}>
          <h2 className="ci-day-head" id={`ci-day-${day.key}`}>
            <span>{day.title}</span>
            {day.today && <span className="ci-day-badge">Today</span>}
            {day.note && <span className="ci-day-note">{day.note}</span>}
          </h2>
          <div className="ci-day-grid">{day.tiles.map((t) => <Tile key={t.key} t={t} />)}</div>
        </section>
      ))}
      <MoreMenu open={more} setOpen={setMore} tiles={extra} />
    </main>
  );
}

/** "More" at the bottom right: the Media desk, the AV station and the Exhibitor desk (open all day, both days). */
function MoreMenu({ open, setOpen, tiles }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", key); };
  }, [open, setOpen]);
  if (!tiles.length) return null;
  return (
    <div className="ci-more" ref={ref}>
      {open && (
        <div className="ci-more-panel" role="menu" aria-label="More stations">
          <p className="ci-more-title">More stations · open all day</p>
          {tiles.map((t) => (
            t.disabled
              ? <span key={t.key} className="ci-more-item is-off" aria-disabled="true"><span aria-hidden="true">{ICONS[t.key]}</span><span><b>{t.label}</b><small>{t.state || t.sub}</small></span></span>
              : (
                <a key={t.key} role="menuitem" className="ci-more-item" href={stationPath(t.key)} onClick={(e) => { pick(t.key)(e); setOpen(false); }}>
                  <span aria-hidden="true">{ICONS[t.key]}</span>
                  <span><b>{t.label}</b><small>{t.state || t.sub}</small></span>
                </a>
              )
          ))}
        </div>
      )}
      <button type="button" className="ci-more-btn" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}>
        {open ? "Close" : "More"} <span aria-hidden="true">{open ? "×" : "▴"}</span>
      </button>
    </div>
  );
}
