import { useCallback, useEffect, useMemo, useState } from "react";
import { desk, useDesk, load, markStarted, openTray, pending, requestSignOut, setStation, signOut, unlock } from "./lib/desk.js";
import { counters } from "./lib/state.js";
import { applyTheme, audioReady, keepAwake, remember, THEME_KEY, unlockAudio } from "./lib/device.js";
import { applyUpdate, isUpdateReady, onUpdate, setAppScreen } from "./lib/pwa.js";
import { dayHeading } from "./lib/timers.js";
import { ArrivalFlash, AttentionSheet, Banners, ConfirmDialog, ConnPill, Counters, Toasts } from "./components.jsx";
import { useKeyboard, useLayout } from "./hooks.js";
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
   Live / Reconnecting / Offline, taps waiting to be sent, refused taps (Needs attention). Counters across the top.
   Works the same in a browser tab and installed. */

const SCREENS = { lobby: Lobby, desk: Desk, breakfast: Meal, lunch: Meal, evening: Meal, av: Av, exhibitor: Exhibitor, media: Media };
const ANNOUNCES = new Set(["desk", "av", "exhibitor", "media"]);
const pct = (n, of) => (of ? `${n}/${of}` : `${n}`);
const VOLUME_HINT = "If you can't hear the chime, check the iPad volume (and that this device's sound isn't muted).";

/** Sound on, from a tap: the chime once now, the screen kept awake, arrivals chime from now on. */
function soundOn() {
  unlockAudio({ ring: true });
  keepAwake();
  markStarted();
}

export default function App() {
  const d = useDesk();
  const layout = useLayout();
  const kb = useKeyboard();
  const [open, setOpen] = useState(null);
  const closeSheet = useCallback(() => setOpen(null), []);
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

  const s = d.state;
  const stationInfo = s?.stations.find((x) => x.key === d.station);
  const screen = !d.session?.token || d.needSignIn ? "login"
    : !s ? "loading"
      : !d.station || !stationInfo || stationInfo.enabled === false || picking ? "stations"
        : !d.started && d.picked ? "start"
          : d.locked ? "locked" : "station";
  // A new version applies itself only while no station is running (lib/updatePolicy.js).
  useEffect(() => { setAppScreen(screen === "locked" ? "station" : screen); }, [screen]);
  // Every station screen keeps the screen awake, after a reload too (asked again on the next tap if refused now).
  useEffect(() => { if (screen === "station" || screen === "locked") keepAwake(); }, [screen, d.station]);

  if (screen === "login") return <><Login again={!!d.session?.token && d.needSignIn} notice={d.authNotice} /><Toasts /></>;
  if (screen === "loading") {
    return (
      <main className="ci-loading">
        {d.loadError ? (<><p>{d.loadError}</p><button type="button" className="ci-btn ci-btn-primary" onClick={() => load()}>Try again</button><button type="button" className="ci-btn ci-btn-ghost" onClick={() => signOut()}>Sign out</button></>)
          : <p>Loading the guest list…</p>}
      </main>
    );
  }
  if (screen === "stations") return <><Stations onPicked={() => setPicking(false)} /><ConfirmDialog /><Toasts /></>;
  if (screen === "start") return <StartGate station={stationInfo} />;
  if (screen === "locked") return <><LockScreen /><ConfirmDialog /><Toasts /></>;

  const Screen = SCREENS[d.station] || Lobby;
  const st = s.stationStates?.[d.station];
  const waiting = d.queueItems.filter((x) => x.state !== "failed").length;
  return (
    <div className={`ci-app is-${layout.kind}${keys ? " is-keys" : ""}${kb ? " is-kb" : ""}`}>
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
        {ANNOUNCES.has(d.station) && <Banners station={d.station} onOpen={setOpen} max={kb || layout.kind === "phone" ? 1 : layout.short || window.innerHeight < 950 ? 2 : 3} />}
      </header>
      {!d.persistOk && <p className="ci-update is-bad" role="alert">⚠ Taps can't be saved on this device (its storage is full or blocked). Keep the app open until they're sent; still trying to save them.</p>}
      {update && (
        <button type="button" className="ci-update" onClick={() => applyUpdate(d.station)}>
          Update ready · tap to reload{waiting ? ` (the ${waiting} tap${waiting === 1 ? "" : "s"} waiting stay on this device)` : ""}
        </button>
      )}
      {ANNOUNCES.has(d.station) && !audioReady() && <button type="button" className="ci-update is-warn" onClick={soundOn}>🔇 Sound is off · tap to turn the chime on</button>}
      {d.othersHere > 0 && <p className="ci-update is-warn" role="status">{stationInfo.label} is also open in another tab or window on this device. Use one and close the other.</p>}
      {d.dayStale && <p className="ci-update is-warn" role="status">{dayHeading(s.today)}: today's list hasn't loaded yet (no connection). Guests can be marked; earlier marks from today show once it loads.</p>}
      {s.today?.date && !s.today.eventDay && <p className="ci-update" role="status">Not an event day: taps are practice marks only (they don't check anyone in, and can be undone).</p>}
      <StationCounters station={d.station} item={st?.item || null} />
      <main className="ci-main"><Screen onOpen={setOpen} layout={layout} /></main>
      {layout.kind === "laptop" && <p className="ci-keys">Type to search · ↑ ↓ to pick · Enter = {{ lobby: "Arrived", desk: "Checked in", breakfast: "Admitted", lunch: "Admitted", evening: "Admitted", media: "Checked in", av: "AV checked", exhibitor: "Checked in" }[d.station]} · Esc clears</p>}
      {open && <GuestSheet guest={open} onClose={closeSheet} />}
      {d.trayOpen && <AttentionSheet />}
      {ANNOUNCES.has(d.station) && <ArrivalFlash />}
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
    // The tap unlocks sound (the chime once now, for the stations that announce arrivals) and keeps the screen awake.
    unlockAudio({ ring: announces });
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
        <p className="ci-small ci-muted">{announces ? `This turns on the arrival chime (you'll hear it once now) and keeps the screen awake. Each arrival also flashes the screen. ${VOLUME_HINT}` : "This keeps the screen awake while you work."} On an iPad, also set Settings › Display & Brightness › Auto-Lock to Never.</p>
        <button type="button" className="ci-btn ci-btn-ghost" onClick={() => setStation("")}>Pick another station</button>
      </div>
    </main>
  );
}

/** A staff sign-in left unused for 30 minutes on this device: the password again (or sign out, then in as yourself). */
function LockScreen() {
  const d = useDesk();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    if (!password) { setError("Enter the password."); return; }
    setBusy(true);
    setError("");
    try { await unlock(password); } catch (err) { setError(err.message || "That didn't work."); } finally { setBusy(false); }
  };
  return (
    <main className="ci-login">
      <form className="ci-login-card" onSubmit={submit} noValidate>
        <h1>Locked</h1>
        <p className="ci-muted">This device is signed in as staff ({d.session?.user?.name}) and hasn't been used for 30 minutes. Enter the password to carry on, or sign out so someone else can sign in. Arrivals still come in meanwhile.</p>
        <label className="ci-field">
          <span>Password for {d.session?.email || d.session?.user?.name}</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </label>
        {error && <p className="ci-error" role="alert">{error}</p>}
        <button type="submit" className="ci-btn ci-btn-primary ci-btn-xl" disabled={busy}>{busy ? "Checking…" : "Unlock"}</button>
        <button type="button" className="ci-btn ci-btn-ghost" onClick={requestSignOut} disabled={d.signingOut}>{d.signingOut ? "Sending taps…" : "Sign out"}</button>
      </form>
    </main>
  );
}

function Menu({ onClose, onPick }) {
  const d = useDesk();
  const [theme, setTheme] = useState(remember.get(THEME_KEY, "dark"));
  const pick = (t) => { remember.set(THEME_KEY, t); setTheme(t); applyTheme(t); };
  const failed = d.queueItems.filter((x) => x.state === "failed").length;
  return (
    <div className="ci-menu" role="menu" onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
      <p className="ci-menu-who"><b>{d.session.user?.name}</b><br /><span className="ci-muted">{d.session.staff ? "Staff" : "Volunteer"}</span></p>
      <button type="button" role="menuitem" onClick={onPick}>Switch station</button>
      {failed > 0 && <button type="button" role="menuitem" className="is-bad" onClick={() => { onClose(); openTray(); }}>Needs attention ({failed})</button>}
      <button type="button" role="menuitem" onClick={() => { load({ quiet: false, refresh: true }); onClose(); }}>Reload the guest list</button>
      <button type="button" role="menuitem" onClick={soundOn}>Test the chime</button>
      <p className="ci-small ci-muted ci-menu-hint">{VOLUME_HINT}</p>
      <div className="ci-menu-theme" role="group" aria-label="Theme">
        {["dark", "light", "auto"].map((t) => <button key={t} type="button" className={theme === t ? "is-on" : ""} onClick={() => pick(t)}>{t === "auto" ? "Auto" : t === "dark" ? "Dark" : "Light"}</button>)}
      </div>
      {d.session.staff && <a role="menuitem" href="/admin/check-in" target="_blank" rel="noreferrer">Desk settings (Admin)</a>}
      <button type="button" role="menuitem" className="is-bad" disabled={d.signingOut} onClick={() => { onClose(); requestSignOut(); }}>{d.signingOut ? "Sending taps…" : "Sign out"}</button>
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
