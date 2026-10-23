import { useEffect, useMemo, useState } from "react";
import { desk, useDesk, load, markStarted, pending, setStation, signOut } from "./lib/desk.js";
import { counters } from "./lib/state.js";
import { applyTheme, audioReady, chime, keepAwake, remember, THEME_KEY, unlockAudio } from "./lib/device.js";
import { applyUpdate, isUpdateReady, onUpdate } from "./lib/pwa.js";
import { dayHeading } from "./lib/timers.js";
import { Banners, ConfirmDialog, ConnPill, Counters, Toasts } from "./components.jsx";
import { useLayout } from "./hooks.js";
import Login from "./screens/Login.jsx";
import Stations from "./screens/Stations.jsx";
import Lobby from "./screens/Lobby.jsx";
import Desk from "./screens/Desk.jsx";
import Meal from "./screens/Meal.jsx";
import Av from "./screens/Av.jsx";
import Exhibitor from "./screens/Exhibitor.jsx";
import Media from "./screens/Media.jsx";
import GuestSheet from "./screens/GuestSheet.jsx";

/* TTFC Check-in: sign in → pick the station → Start (sound + keep the screen on) → the station. Header: the station
   (tap to switch), today and what's on ("Day 1 · CxO Breakfast · open until 9:25 AM" and where the times come from),
   Live / Reconnecting / Offline, taps waiting to be sent. Counters across the top. Works the same in a browser tab
   and installed. */

const SCREENS = { lobby: Lobby, desk: Desk, breakfast: Meal, lunch: Meal, evening: Meal, av: Av, exhibitor: Exhibitor, media: Media };
const ANNOUNCES = new Set(["desk", "av", "exhibitor", "media"]);
const pct = (n, of) => (of ? `${n}/${of}` : `${n}`);

export default function App() {
  const d = useDesk();
  const layout = useLayout();
  const [open, setOpen] = useState(null);
  const [picking, setPicking] = useState(false);
  const [menu, setMenu] = useState(false);
  const [update, setUpdate] = useState(isUpdateReady());
  useEffect(() => onUpdate(setUpdate), []);
  useEffect(() => { document.documentElement.dataset.layout = layout.kind; }, [layout.kind]);
  // Show the keyboard's highlighted result once a key is used (touch-only devices never see it).
  const [keys, setKeys] = useState(false);
  useEffect(() => {
    const on = (e) => { if (["ArrowDown", "ArrowUp", "Enter"].includes(e.key) || e.key.length === 1) setKeys(true); };
    const off = (e) => { if (e.pointerType === "touch") setKeys(false); };
    document.addEventListener("keydown", on);
    document.addEventListener("pointerdown", off);
    return () => { document.removeEventListener("keydown", on); document.removeEventListener("pointerdown", off); };
  }, []);

  if (!d.session?.token) return <><Login /><Toasts /></>;
  if (d.needSignIn) return <><Login again /><Toasts /></>;
  const s = d.state;
  if (!s) {
    return (
      <main className="ci-loading">
        {d.loadError ? (<><p>{d.loadError}</p><button type="button" className="ci-btn ci-btn-primary" onClick={() => load()}>Try again</button><button type="button" className="ci-btn ci-btn-ghost" onClick={signOut}>Sign out</button></>)
          : <p>Loading the guest list…</p>}
      </main>
    );
  }
  const stationInfo = s.stations.find((x) => x.key === d.station);
  if (!d.station || !stationInfo || stationInfo.enabled === false || picking) {
    return <><Stations onPicked={() => setPicking(false)} /><Toasts /></>;
  }
  if (!d.started && d.picked) return <StartGate station={stationInfo} />;

  const Screen = SCREENS[d.station] || Lobby;
  const st = s.stationStates?.[d.station];
  return (
    <div className={`ci-app is-${layout.kind}${keys ? " is-keys" : ""}`}>
      <header className="ci-header">
        <div className="ci-header-row">
          <img src="icons/icon-96.png" alt="" width="36" height="36" className="ci-logo" />
          <button type="button" className="ci-station-btn" onClick={() => setPicking(true)} aria-label={`Station: ${stationInfo.label}. Switch station`}>
            <span className="ci-station-btn-name">{stationInfo.label}</span>
            <span className="ci-station-btn-sub">{stationInfo.sub} ▾</span>
          </button>
          <div className="ci-header-spacer" />
          <ConnPill />
          <button type="button" className="ci-icon-btn ci-me" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Menu">
            {(d.session.user?.name || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
          </button>
        </div>
        <div className={`ci-when is-${st?.code || "open"}`}>
          <span className="ci-when-text">{st?.text || dayHeading(s.today)}</span>
          {st?.detail && <span className="ci-when-detail">{st.detail}</span>}
        </div>
        {menu && <Menu onClose={() => setMenu(false)} onPick={() => { setMenu(false); setPicking(true); }} />}
        {ANNOUNCES.has(d.station) && <Banners station={d.station} onOpen={setOpen} max={layout.kind === "phone" ? 1 : layout.short || window.innerHeight < 950 ? 2 : 3} />}
      </header>
      {update && <button type="button" className="ci-update" onClick={applyUpdate}>A new version is ready · tap to update</button>}
      {ANNOUNCES.has(d.station) && !audioReady() && <button type="button" className="ci-update is-warn" onClick={() => { unlockAudio(); chime(); keepAwake(); markStarted(); }}>🔇 Sound is off · tap to turn the chime on</button>}
      <StationCounters station={d.station} item={st?.item || null} />
      <main className="ci-main"><Screen onOpen={setOpen} layout={layout} /></main>
      {layout.kind === "laptop" && <p className="ci-keys">Type to search · ↑ ↓ to pick · Enter = {{ lobby: "Arrived", desk: "Checked in", breakfast: "Admitted", lunch: "Admitted", evening: "Admitted", media: "Checked in", av: "AV checked", exhibitor: "Checked in" }[d.station]} · Esc clears</p>}
      {open && <GuestSheet guest={open} onClose={() => setOpen(null)} />}
      <ConfirmDialog />
      <Toasts />
    </div>
  );
}

function StationCounters({ station, item }) {
  const d = useDesk();
  const s = d.state;
  const p = pending();
  const c = useMemo(() => counters(s, station, { pending: p, item }), [s, s.version, station, item, p.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const t = c.totals;
  // Yes / no marks counted on their own (they overlap the colour groups). VIP and Media are also colour groups: shown
  // here only when they differ from their group (a VIP who is also Media is in the VIP group). Exhibitor always.
  const groupOf = (k) => c.groups.find((g) => g.group === k);
  const marks = (field) => ["vip", "media", "exhibitor"]
    .filter((k) => c.marks[k].total > 0 && (k === "exhibitor" || c.marks[k].total !== (groupOf(k)?.total || 0)))
    .map((k) => ({ label: k === "exhibitor" ? "Exhibitor" : `${k === "vip" ? "VIP" : "Media"} (all)`, text: pct(c.marks[k][field], c.marks[k].total) }));
  let big;
  let groups;
  let mk;
  if (station === "lobby" || station === "desk") {
    big = [
      { label: "Checked in today", n: t.checkedIn, of: t.total, tone: "good" },
      { label: "Passes collected", n: t.collected, of: t.total },
      { label: "On the way up", n: t.onTheWay, tone: t.onTheWay ? "info" : "" },
      { label: "Arrived today", n: t.arrived },
    ];
    groups = c.groups.map((g) => ({ group: g.group, text: pct(g.checkedIn, g.total) }));
    mk = marks("checkedIn");
  } else if (["breakfast", "lunch", "evening"].includes(station)) {
    big = item ? [
      { label: `Admitted · ${item.label}`, n: t.admitted, tone: "good" },
      { label: "Included", n: t.entitled },
      { label: "RSVP'd", n: t.rsvpd },
    ] : [{ label: "Admitted today", n: t.admitted }];
    groups = c.groups.filter((g) => g.entitled || g.admitted).map((g) => ({ group: g.group, text: pct(g.admitted, g.entitled) }));
    mk = ["vip", "media", "exhibitor"].filter((k) => c.marks[k].entitled && (k === "exhibitor" || c.marks[k].entitled !== (groupOf(k)?.entitled || 0)))
      .map((k) => ({ label: k === "exhibitor" ? "Exhibitor" : `${k === "vip" ? "VIP" : "Media"} (all)`, text: pct(c.marks[k].admitted, c.marks[k].entitled) }));
  } else if (station === "av") {
    big = [{ label: "AV checked", n: t.done, of: t.total, tone: "good" }, { label: "Speakers arrived", n: t.arrived, of: t.total }];
    groups = c.groups.map((g) => ({ group: g.group, text: pct(g.done, g.total) }));
    mk = [];
  } else if (station === "exhibitor") {
    big = [{ label: "Booths set up", n: c.booths.setUp, of: c.booths.total, tone: "good" }, { label: "Exhibitors checked in", n: t.done, of: t.total }, { label: "Arrived today", n: t.arrived }];
    groups = c.groups.map((g) => ({ group: g.group, text: pct(g.done, g.total) }));
    mk = [];
  } else {
    big = [{ label: "Media checked in", n: t.done, of: t.total, tone: "good" }, { label: "Arrived today", n: t.arrived }, { label: "Open queries", n: c.queriesOpen }];
    groups = c.groups.map((g) => ({ group: g.group, text: pct(g.done, g.total) }));
    mk = [];
  }
  return <Counters big={big} groups={groups} marks={mk} />;
}

function StartGate({ station }) {
  const d = useDesk();
  const announces = ANNOUNCES.has(station.key);
  const start = () => {
    unlockAudio();
    if (announces) setTimeout(() => chime(), 50);
    keepAwake();
    markStarted();
  };
  return (
    <main className="ci-start">
      <div className="ci-start-card">
        <p className="ci-muted">{dayHeading(d.state?.today)}</p>
        <h1>{station.label}</h1>
        <p className="ci-start-sub">{station.sub}</p>
        <p className="ci-when-text">{d.state?.stationStates?.[station.key]?.text}</p>
        <button type="button" className="ci-btn ci-btn-primary ci-btn-xxl" onClick={start} autoFocus>Start the {station.key === "desk" ? "desk" : "station"}</button>
        <p className="ci-small ci-muted">{announces ? "This turns on the arrival chime (you'll hear it once now) and keeps the screen awake." : "This keeps the screen awake while you work."} On an iPad, also set Settings › Display & Brightness › Auto-Lock to Never.</p>
        <button type="button" className="ci-btn ci-btn-ghost" onClick={() => setStation("")}>Pick another station</button>
      </div>
    </main>
  );
}

function Menu({ onClose, onPick }) {
  const d = useDesk();
  const [theme, setTheme] = useState(remember.get(THEME_KEY, "dark"));
  const pick = (t) => { remember.set(THEME_KEY, t); setTheme(t); applyTheme(t); };
  const waiting = d.queueItems.length;
  return (
    <div className="ci-menu" role="menu" onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
      <p className="ci-menu-who"><b>{d.session.user?.name}</b><br /><span className="ci-muted">{d.session.staff ? "Staff" : "Volunteer"}</span></p>
      <button type="button" role="menuitem" onClick={onPick}>Switch station</button>
      <button type="button" role="menuitem" onClick={() => { load({ quiet: false, refresh: true }); onClose(); }}>Reload the guest list</button>
      <button type="button" role="menuitem" onClick={() => { unlockAudio(); chime(); }}>Test the chime</button>
      <div className="ci-menu-theme" role="group" aria-label="Theme">
        {["dark", "light", "auto"].map((t) => <button key={t} type="button" className={theme === t ? "is-on" : ""} onClick={() => pick(t)}>{t === "auto" ? "Auto" : t === "dark" ? "Dark" : "Light"}</button>)}
      </div>
      {d.session.staff && <a role="menuitem" href="/admin/check-in" target="_blank" rel="noreferrer">Desk settings (Admin)</a>}
      <button type="button" role="menuitem" className="is-bad" onClick={() => {
        if (waiting && !window.confirm(`${waiting} tap(s) on this device haven't reached the server yet. Signing out keeps them and sends them after the next sign-in on this device. Sign out?`)) return;
        signOut();
      }}>Sign out</button>
      <button type="button" role="menuitem" onClick={onClose}>Close</button>
      {d.session.staff && <Attendance rows={d.state?.attendance || []} />}
      <p className="ci-small ci-muted">{desk.state?.agendaRead ? "Times from the live agenda." : "Agenda not readable: times as of Oct 23."}</p>
    </div>
  );
}

/** Staff: attendance per day so far (passes marked arrived / checked in each day; from the last list load). */
function Attendance({ rows }) {
  const days = [...new Set(rows.map((r) => r.day))].sort();
  if (!days.length) return null;
  const n = (day, point) => rows.find((r) => r.day === day && r.point === point)?.rows || 0;
  const label = (day) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(`${day}T12:00:00Z`));
  return (
    <div className="ci-small ci-menu-who">
      <b>Attendance by day</b>
      {days.map((day) => <div key={day}>{label(day)}: {n(day, "arrived")} arrived · {n(day, "checked_in")} checked in</div>)}
    </div>
  );
}
