import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import useSiteSettings from "../hooks/useSiteSettings";
import { track } from "../lib/pwaEvents";
import { isMobileDevice } from "../lib/pwaPlatform";
import { isNativeVisit } from "../lib/nativeVisit";
import {
  CITIES, LIFECYCLE_LABEL, citySlugOf, eventPath, eventTicketsPath, featuredEvent,
  findEvent, formatDateRange, lifecycleOf, parseEventPath, ticketsOpen, useEvents,
} from "../lib/events";

/* =========================================================
   The one sticky header (Phase 4, IA doc): it morphs.
   - Left never changes: the logo, then the event pill.
   - Right never changes: Log in / avatar + the ONE gold
     Tickets button (the only primary button on any screen).
   - The middle swaps: global links on global pages, the
     event's own nav inside an event.
   The pill NEVER disappears. On global pages it reads
   "Choose a city · All Events" and its dropdown IS the city
   list; inside an event it names that event and its dropdown
   carries the global links. There is no separate Events link.
   Tickets is contextual: inside an event it buys only that
   event; when that event is Past (or Just Ended, tickets off)
   it becomes "Next edition · Notify me".
========================================================= */

const AuthModal = lazy(() => import("./AuthModal"));
// "Get the TTFC app" on a computer: the store badges and a QR code to the phone (Navbar parity). Loaded on first use.
const PhoneAppPanel = lazy(() => import("./PhoneAppPanel"));

const GLOBAL_LINKS = [
  { label: "Awards", path: "/awards" },
  { label: "Speakers", path: "/speakers" },
  { label: "Sponsors", path: "/sponsors" },
  { label: "Partners", path: "/partners" },
  { label: "About", path: "/about" },
];

/* Parity with the existing Navbar (components/Navbar.tsx): every destination it
   offers stays reachable from this header too — the primary five above in the
   middle, the rest here (pill dropdown + phone sheet). Nothing the old header
   links to is dropped. */
const MORE_LINKS = [
  { label: "Programme", path: "/programme", agendaGated: true },
  { label: "Agenda", path: "/agenda", agendaGated: true },
  { label: "2026 Partners", path: "/partners2026" },
  { label: "Sponsor", path: "/sponsor" },
  { label: "Exhibit", path: "/exhibit" },
  { label: "Venue", path: "/venue" },
  { label: "Brochure", path: "/brochures" },
  { label: "Volunteer", path: "/volunteer" },
  { label: "Organizers", path: "/organizers" },
  { label: "Media", path: "/media" },
  { label: "Contact", path: "/contact" },
];

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

export default function SiteHeader({ homeEvent = null } = {}) {
  const location = useLocation();
  const { events } = useEvents();
  const dark = useDarkMode();
  const site = useSiteSettings();
  const showAgenda = site["site.show_agenda"] !== false;
  const moreLinks = MORE_LINKS.filter((l) => showAgenda || !l.agendaGated);
  // Theme behaviour identical to Navbar's: localStorage "theme", body.dark-mode.
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    const saved = localStorage.getItem("theme") || "light";
    setTheme(saved);
    document.body.classList.toggle("dark-mode", saved === "dark");
    document.documentElement.classList.toggle("dark", saved === "dark");
  }, []);
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.body.classList.toggle("dark-mode", next === "dark");
    document.documentElement.classList.toggle("dark", next === "dark");
  };
  const [pillOpen, setPillOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [phoneQr, setPhoneQr] = useState(false);
  // Came from the iPhone or Android app (?source=ios …, lib/nativeVisit.js): they have it, so no "Get the TTFC app" row (Navbar parity).
  const [fromStoreApp] = useState(() => isNativeVisit());
  const [user, setUser] = useState(null);
  const pillRef = useRef(null);

  const parsed = parseEventPath(location.pathname);
  // On the homepage the composed page (pages/HomeFeatured.jsx) hands over its featured
  // event: "/" acts as that event's home, so the pill names it and the header behaves
  // exactly as it does on the event's own landing. Everywhere else the prop is absent.
  const current = parsed ? findEvent(events, parsed) : (location.pathname === "/" ? homeEvent : null);
  const currentCity = parsed ? parsed.city : (current ? citySlugOf(current.city) : null);
  const featured = useMemo(() => featuredEvent(events), [events]);

  useEffect(() => { setPillOpen(false); setMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!pillOpen) return undefined;
    const onDoc = (e) => { if (pillRef.current && !pillRef.current.contains(e.target)) setPillOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setPillOpen(false); };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); window.removeEventListener("keydown", onKey); };
  }, [pillOpen]);

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      if (!token) { setUser(null); return; }
      try {
        const { fetchMe } = await import("../utils/api");
        setUser(await fetchMe());
      } catch { setUser(null); }
    };
    load();
    window.addEventListener("authChanged", load);
    return () => window.removeEventListener("authChanged", load);
  }, []);

  const bg = dark ? "rgba(6,2,15,0.92)" : "rgba(255,255,255,0.94)";
  const border = dark ? "rgba(155,135,245,0.14)" : "rgba(122,63,209,0.10)";
  const textMain = dark ? "#ffffff" : "#0d0520";
  const textMuted = dark ? "rgba(200,185,255,0.72)" : "rgba(13,5,32,0.62)";
  const dropBg = dark ? "#0e0820" : "#ffffff";
  const pillBg = dark ? "rgba(255,255,255,0.06)" : "rgba(122,63,209,0.06)";

  // The ONE gold button: contextual Tickets.
  let ticketsTo = "/stay-updated#join";
  let ticketsLabel = "Tickets";
  let ticketsNotify = false;
  if (current) {
    if (ticketsOpen(current)) { ticketsTo = eventTicketsPath(current); }
    else { ticketsLabel = "Next edition · Notify me"; ticketsNotify = true; }
  } else if (featured && ticketsOpen(featured)) {
    ticketsTo = eventTicketsPath(featured);
  } else if (featured) {
    ticketsLabel = "Next edition · Notify me"; ticketsNotify = true;
  }

  const pillLabel = current ? current.name : "Choose a city · All Events";
  const byLifecycle = (want) => events.filter((e) => want.includes(lifecycleOf(e)));

  const eventRow = (ev) => (
    <Link key={ev._id} to={eventPath(ev)} className="sh-drop-row">
      <span style={{ fontWeight: 700, color: textMain }}>{ev.name}</span>
      <span style={{ color: textMuted, fontSize: "0.78rem" }}>
        {formatDateRange(ev)}{ev.venueName ? ` · ${ev.venueName}` : ""} · {LIFECYCLE_LABEL[lifecycleOf(ev)]}
      </span>
    </Link>
  );

  const middleLinks = current
    ? [
        { label: "Overview", path: eventPath(current) },
        { label: "Agenda", path: `${eventPath(current)}/agenda` },
        { label: "Speakers", path: `${eventPath(current)}/speakers` },
        { label: "Tickets", path: eventTicketsPath(current) },
      ]
    : GLOBAL_LINKS;

  return (
    <>
      <style>{`
        .sh-wrap { position: fixed; top: 0; left: 0; right: 0; z-index: 9999; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
        .sh-bar { display: flex; align-items: center; gap: 14px; max-width: 1400px; margin: 0 auto; padding: 0 2%; height: 76px; }
        .sh-logo { height: 52px; width: auto; max-width: 190px; object-fit: contain; display: block; }
        .sh-pill { position: relative; flex-shrink: 1; min-width: 0; }
        .sh-pill-btn { display: inline-flex; align-items: center; gap: 8px; max-width: 340px; padding: 9px 14px; border-radius: 999px; cursor: pointer;
          font-family: 'Orbitron', sans-serif; font-size: 0.66rem; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sh-drop { position: absolute; top: calc(100% + 10px); left: 0; width: min(380px, 86vw); max-height: 70vh; overflow-y: auto; border-radius: 18px; padding: 10px; z-index: 200;
          box-shadow: 0 18px 48px rgba(10,2,30,0.35); }
        .sh-drop-label { font-family: 'Orbitron', sans-serif; font-size: 0.58rem; font-weight: 800; letter-spacing: 1.6px; text-transform: uppercase; margin: 10px 8px 6px; }
        .sh-drop-row { display: flex; flex-direction: column; gap: 2px; padding: 9px 10px; border-radius: 12px; text-decoration: none; }
        .sh-drop-row:hover { background: rgba(122,63,209,0.09); }
        .sh-city-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 10px; border-radius: 12px; text-decoration: none; font-weight: 700; }
        .sh-city-row:hover { background: rgba(122,63,209,0.09); }
        /* The middle group must sit INLINE in the bar. src/styles.css carries a legacy
           global rule, nav:not(.tfc-nav), that restyles any bare <nav> as a full-width
           sticky bar (background: var(--bg-nav) — near-white in light mode — height: 80px,
           padding: 1rem 5%, width: 100%). It hit this <nav> and rendered the middle links
           as an overlapping white panel. The nav below carries the tfc-nav opt-out class
           (the codebase's own marker; the class has no styles of its own), and these
           resets keep .sh-mid inline and transparent regardless. */
        .sh-mid { flex: 1; display: flex; justify-content: center; align-items: center; min-width: 0;
          position: static; width: auto; height: auto; padding: 0; background: transparent;
          border-bottom: none; backdrop-filter: none; -webkit-backdrop-filter: none; }
        .sh-mid ul { display: flex; align-items: center; gap: 2px; list-style: none; margin: 0; padding: 4px 5px; border-radius: 999px;
          min-width: 0; flex-wrap: nowrap; overflow: hidden; }
        .sh-link { font-family: 'Orbitron', sans-serif; font-size: 0.62rem; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; padding: 8px 12px; border-radius: 999px; text-decoration: none; white-space: nowrap; }
        .sh-link:hover { background: rgba(122,63,209,0.10); }
        .sh-link.active { background: rgba(122,63,209,0.15); }
        .sh-right { margin-left: auto; display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .sh-gold { display: inline-flex; align-items: center; padding: 10px 20px; border-radius: 999px; border: none; cursor: pointer; text-decoration: none;
          background: linear-gradient(135deg, #f7b733 0%, #f5a623 55%, #e8890c 100%); color: #1d1204;
          font-family: 'Orbitron', sans-serif; font-size: 0.66rem; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; white-space: nowrap;
          box-shadow: 0 6px 18px rgba(245,166,35,0.35); }
        .sh-login { background: none; border: none; cursor: pointer; font-family: 'Orbitron', sans-serif; font-size: 0.64rem; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; padding: 8px 6px; }
        .sh-avatar { width: 36px; height: 36px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem;
          background: linear-gradient(135deg, #7a3fd1, #f5a623); color: #fff; }
        .sh-burger { display: none; width: 40px; height: 40px; border-radius: 12px; align-items: center; justify-content: center; cursor: pointer; }
        .sh-sheet { position: fixed; left: 0; right: 0; bottom: 0; z-index: 9998; overflow-y: auto; padding: 10px 20px 28px; }
        .sh-sheet a { display: block; padding: 13px 4px; text-decoration: none; font-family: 'Orbitron', sans-serif; font-size: 0.82rem; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
        @media (max-width: 1100px) { .sh-mid { display: none; } .sh-burger { display: inline-flex; } }
        @media (max-width: 560px) { .sh-logo { height: 42px; max-width: 132px; } .sh-pill-btn { max-width: 168px; font-size: 0.58rem; padding: 8px 10px; } .sh-gold { padding: 9px 13px; font-size: 0.58rem; } .sh-login { display: none; } .sh-2027 { display: none !important; } }
      `}</style>

      <header className="sh-wrap" style={{ background: bg, borderBottom: `1px solid ${border}` }}>
        <div className="sh-bar">
          <Link to="/" aria-label="The Tech Festival Canada — home" style={{ flexShrink: 0, display: "flex" }}>
            <img className="sh-logo" src={dark ? "/Tech_Festival_Canada_Logo_Dark_Transparent.webp" : "/Tech_Festival_Canada_Logo_Light_Transparent.webp"} alt="The Tech Festival Canada" />
          </Link>

          {/* The pill: right after the logo, always. */}
          <div className="sh-pill" ref={pillRef}>
            <button type="button" className="sh-pill-btn" aria-haspopup="true" aria-expanded={pillOpen}
              onClick={() => setPillOpen((o) => !o)}
              style={{ background: pillBg, border: `1px solid ${border}`, color: textMain }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{pillLabel}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: pillOpen ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }}><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {pillOpen && (
              <div className="sh-drop" style={{ background: dropBg, border: `1px solid ${border}` }}>
                {current ? (
                  <>
                    <div className="sh-drop-label" style={{ color: textMuted }}>This event</div>
                    {middleLinks.map((l) => (
                      <Link key={l.path} to={l.path} className="sh-drop-row"><span style={{ fontWeight: 700, color: textMain }}>{l.label}</span></Link>
                    ))}
                    <div className="sh-drop-label" style={{ color: textMuted }}>Everywhere</div>
                    <Link to="/" className="sh-drop-row"><span style={{ fontWeight: 700, color: textMain }}>Home</span></Link>
                    {GLOBAL_LINKS.map((l) => (
                      <Link key={l.path} to={l.path} className="sh-drop-row"><span style={{ fontWeight: 700, color: textMain }}>{l.label}</span></Link>
                    ))}
                    {moreLinks.map((l) => (
                      <Link key={l.path} to={l.path} className="sh-drop-row"><span style={{ fontWeight: 700, color: textMain }}>{l.label}</span></Link>
                    ))}
                    <div className="sh-drop-label" style={{ color: textMuted }}>Other cities</div>
                    {CITIES.filter((c) => c.slug !== currentCity).map((c) => (
                      <Link key={c.slug} to={`/${c.slug}`} className="sh-city-row" style={{ color: textMain }}>{c.name}<span aria-hidden="true">→</span></Link>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="sh-drop-label" style={{ color: textMuted }}>Choose a city</div>
                    {CITIES.map((c) => {
                      const next = events.filter((e) => e.city === c.name && ["coming-up", "live"].includes(lifecycleOf(e)))
                        .sort((a, b) => String(a.startDate || "9999").localeCompare(String(b.startDate || "9999")))[0];
                      return (
                        <Link key={c.slug} to={`/${c.slug}`} className="sh-city-row" style={{ color: textMain }}>
                          {c.name}
                          <span style={{ color: textMuted, fontSize: "0.76rem", fontWeight: 500 }}>{next ? formatDateRange(next) : ""}</span>
                        </Link>
                      );
                    })}
                    <div className="sh-drop-label" style={{ color: textMuted }}>Coming up</div>
                    {byLifecycle(["coming-up", "live"]).map(eventRow)}
                    {byLifecycle(["past", "just-ended"]).length > 0 && (
                      <details>
                        <summary className="sh-drop-label" style={{ color: textMuted, cursor: "pointer" }}>Past events</summary>
                        {byLifecycle(["past", "just-ended"]).map(eventRow)}
                      </details>
                    )}
                    <div className="sh-drop-label" style={{ color: textMuted }}>More</div>
                    {moreLinks.map((l) => (
                      <Link key={l.path} to={l.path} className="sh-drop-row"><span style={{ fontWeight: 700, color: textMain }}>{l.label}</span></Link>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* The middle: swaps with context. (tfc-nav = opt-out from the legacy
              global nav:not(.tfc-nav) bar styling in src/styles.css — see .sh-mid.) */}
          <nav className="sh-mid tfc-nav" aria-label={current ? "Event" : "Site"}>
            <ul style={{ background: pillBg, border: `1px solid ${border}` }}>
              {middleLinks.map((l) => (
                <li key={l.path}>
                  <Link to={l.path} className={"sh-link" + (location.pathname === l.path ? " active" : "")} style={{ color: textMain }}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Right: never changes. */}
          <div className="sh-right">
            <Link to="/stay-updated" className="sh-2027" aria-label="Stay updated for TTFC 2027"
              style={{ padding: "0 16px", height: 38, borderRadius: 999, background: "transparent", border: `2px solid ${border}`, color: textMain, fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "0.62rem", letterSpacing: "0.8px", textDecoration: "none", display: "flex", alignItems: "center", textTransform: "uppercase" }}>
              2027
            </Link>
            <button type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              style={{ width: 38, height: 38, borderRadius: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: pillBg, border: `1px solid ${border}`, color: textMain }}>
              {theme === "dark" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
              )}
            </button>
            {user ? (
              <span className="sh-avatar" title={user.name || user.email || "Signed in"} aria-label="Signed in">
                {String(user.name || user.email || "?").trim().charAt(0).toUpperCase()}
              </span>
            ) : (
              <button type="button" className="sh-login" style={{ color: textMain }} onClick={() => setAuthOpen(true)}>Log in</button>
            )}
            <Link to={ticketsTo} className="sh-gold" aria-label={ticketsNotify ? ticketsLabel : `Tickets${current ? ` for ${current.name}` : ""}`}>
              {ticketsLabel}
            </Link>
            <button type="button" className="sh-burger" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
              style={{ background: pillBg, border: `1px solid ${border}`, color: textMain }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="sh-sheet" style={{ top: 76, background: dropBg, borderTop: `1px solid ${border}` }}>
            {middleLinks.map((l) => (
              <Link key={l.path} to={l.path} style={{ color: textMain, borderBottom: `1px solid ${border}` }}>{l.label}</Link>
            ))}
            <div className="sh-drop-label" style={{ color: textMuted, margin: "18px 4px 4px" }}>Cities</div>
            {CITIES.map((c) => (
              <Link key={c.slug} to={`/${c.slug}`} style={{ color: textMain, borderBottom: `1px solid ${border}` }}>{c.name}</Link>
            ))}
            <div className="sh-drop-label" style={{ color: textMuted, margin: "18px 4px 4px" }}>More</div>
            {moreLinks.map((l) => (
              <Link key={l.path} to={l.path} style={{ color: textMain, borderBottom: `1px solid ${border}` }}>{l.label}</Link>
            ))}
            {/* Navbar parity: on a phone this row opens /app/install; on a computer it presents
                the QR PhoneAppPanel instead (and store-app visitors don't see the row at all). */}
            {!fromStoreApp && (
              <a href="/app/install?from=drawer"
                onClick={(e) => {
                  setMenuOpen(false);
                  if (!isMobileDevice()) { e.preventDefault(); setPhoneQr(true); track("pwa_phone_qr_open", { where: "drawer" }); return; }
                  track("pwa_guide_open", { where: "drawer" });
                }}
                style={{ color: textMain, borderBottom: `1px solid ${border}`, display: "block", padding: "13px 4px", textDecoration: "none", fontFamily: "'Orbitron', sans-serif", fontSize: "0.82rem", fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>
                Get the TTFC app
              </a>
            )}
            <Link to="/stay-updated" style={{ color: textMain, borderBottom: `1px solid ${border}` }}>Stay updated for 2027</Link>
            {!user && (
              <button type="button" onClick={() => { setMenuOpen(false); setAuthOpen(true); }}
                style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "13px 4px", cursor: "pointer", fontFamily: "'Orbitron', sans-serif", fontSize: "0.82rem", fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: textMain }}>
                Log in
              </button>
            )}
          </div>
        )}
      </header>

      {authOpen && (
        <Suspense fallback={null}>
          <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
        </Suspense>
      )}
      {phoneQr && (
        <Suspense fallback={null}>
          <PhoneAppPanel where="drawer" onDismiss={() => setPhoneQr(false)} actions={[{ label: "Close", onClick: () => setPhoneQr(false) }]} />
        </Suspense>
      )}
    </>
  );
}

