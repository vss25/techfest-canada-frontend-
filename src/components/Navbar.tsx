import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AuthModal from "./AuthModal";
import useSiteSettings from "../hooks/useSiteSettings";

const PARTNERS_DROPDOWN = [
  { label: "2026 Partners", path: "/partners2026" },
  { label: "Sponsor", path: "/sponsor" },
  { label: "Exhibit", path: "/exhibit" },
  { label: "KYC Form", path: "/kyc" },
];

const MORE_DROPDOWN = [
  { label: "Briefings", path: "/briefings" },
  { label: "Venue", path: "/venue" },
  { label: "Volunteer", path: "/volunteer" },
  { label: "Organizers", path: "/organizers" },
  { label: "Media", path: "/media" },
];


export default function Navbar() {
  const [authOpen, setAuthOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const isDark = theme === "dark";
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [partnersOpen, setPartnersOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const [navHeight, setNavHeight] = useState(92);
  const location = useLocation();
  const site = useSiteSettings();
  const showAgenda = site["site.show_agenda"] !== false;

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

  useEffect(() => {
    setMobileOpen(false);
    setPartnersOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  // Phone menu: sit exactly under the bar, freeze the page behind it, close on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    if (navRef.current) setNavHeight(navRef.current.getBoundingClientRect().bottom);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [mobileOpen]);

  const dark = theme === "dark";
  const bg = dark ? "rgba(6,2,15,0.92)" : "rgba(255,255,255,0.94)";
  const border = dark ? "rgba(155,135,245,0.12)" : "rgba(122,63,209,0.10)";
  const textMain = dark ? "#ffffff" : "#0d0520";
  const textMuted = dark ? "rgba(200,185,255,0.70)" : "rgba(13,5,32,0.60)";
  const pillBg = dark ? "rgba(255,255,255,0.06)" : "rgba(122,63,209,0.06)";
  const pillBorder = dark ? "rgba(155,135,245,0.18)" : "rgba(122,63,209,0.18)";
  const dropBg = dark ? "#0e0820" : "#ffffff";
  const dropBorder = dark ? "rgba(155,135,245,0.18)" : "rgba(122,63,209,0.14)";
  const mobileBg = dark ? "rgba(10,5,24,0.95)" : "rgba(255,255,255,0.95)";

  // Monochrome theme toggle colors
  const themeBtnBg = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const themeBtnBorder = dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.14)";
  const themeBtnHoverBg = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
  const themeBtnIcon = dark ? "#ffffff" : "#0d0520";

  const navItems = [
    { label: "HOME", path: "/" },
    { label: "PARTNERS", hasDropdown: true, dropKey: "partners" },
    { label: "SPEAKERS", path: "/speakers" },
    { label: "AGENDA", path: "/agenda" },
    { label: "AWARDS", path: "/awards" },
    { label: "MORE", hasDropdown: true, dropKey: "more" },
  ].filter((item) => showAgenda || (item.path !== "/agenda" && item.path !== "/programme"));

  const isActive = (item) => {
    if (item.dropKey === "partners") return PARTNERS_DROPDOWN.some(d => d.path === location.pathname);
    if (item.dropKey === "more") return MORE_DROPDOWN.some(d => d.path === location.pathname);
    return location.pathname === item.path;
  };

  const getDropConfig = (dropKey) => {
    if (dropKey === "partners") return { open: partnersOpen, setOpen: setPartnersOpen, items: PARTNERS_DROPDOWN };
    if (dropKey === "more") return { open: moreOpen, setOpen: setMoreOpen, items: MORE_DROPDOWN };
    return { open: false, setOpen: () => {}, items: [] };
  };

  const mobileGroups = [
    { title: "Partners", items: PARTNERS_DROPDOWN },
    { title: "More", items: MORE_DROPDOWN },
  ];

  const renderDropdown = (items, open, setOpen) => (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ duration: 0.18 }}
          style={{ position: "absolute", top: "calc(100% + 12px)", left: "50%", transform: "translateX(-50%)", background: dropBg, border: "1px solid " + dropBorder, borderRadius: 16, padding: "8px", minWidth: 180, boxShadow: dark ? "0 8px 32px rgba(0,0,0,0.5)" : "0 8px 32px rgba(122,63,209,0.12)", zIndex: 200 }}
        >
          {items.map((d) => (
            <Link key={d.path} to={d.path} onClick={() => setOpen(false)}
              style={{ display: "block", padding: "10px 16px", borderRadius: 10, fontFamily: "'Orbitron', sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: location.pathname === d.path ? "#7a3fd1" : textMain, textDecoration: "none", background: location.pathname === d.path ? "rgba(122,63,209,0.08)" : "transparent", transition: "background 0.15s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(122,63,209,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = location.pathname === d.path ? "rgba(122,63,209,0.08)" : "transparent"; }}
            >{d.label}</Link>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Custom monochrome theme toggle — clean SVG sun/moon, no color
  const ThemeToggle = () => (
    <button
      onClick={toggleTheme}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="tfc-theme-toggle"
      style={{
        background: themeBtnBg,
        border: "1px solid " + themeBtnBorder,
        color: themeBtnIcon,
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {dark ? (
          <motion.svg
            key="sun"
            initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </motion.svg>
        ) : (
          <motion.svg
            key="moon"
            initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </motion.svg>
        )}
      </AnimatePresence>
    </button>
  );

  return (
    <>
      <style>{`
        /* ── NAVBAR — locked to top, never scrolls away ── */
        .tfc-navbar-wrap {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 9999 !important;
          width: 100% !important;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          will-change: transform;
        }

        /* ── CONTAINER — significantly taller for a bigger logo ── */
        .tfc-nav-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 110px;
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 2%;
          gap: 12px;
        }

        .tfc-nav-left { flex-shrink: 0; display: flex; align-items: center; }
        .tfc-nav-center { flex: 1; display: flex; justify-content: center; align-items: center; min-width: 0; overflow: visible; }
        .tfc-nav-right { flex-shrink: 0; display: flex; justify-content: flex-end; align-items: center; gap: 10px; }

        /* ── LOGO — large and prominent ── */
        .tfc-nav-logo {
          height: 82px;
          width: auto;
          max-width: 280px;
          object-fit: contain;
          display: block;
        }

        .tfc-nav-link { font-family: 'Orbitron', sans-serif; font-size: 0.6rem; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; padding: 8px 11px; border-radius: 999px; text-decoration: none; transition: background 0.2s ease, color 0.2s ease; white-space: nowrap; line-height: 1; display: flex; align-items: center; height: 32px; }
        .tfc-nav-link:hover { background: rgba(122,63,209,0.10); }
        .tfc-nav-link.active { background: rgba(122,63,209,0.14); }
        .tfc-drop-btn { font-family: 'Orbitron', sans-serif; font-size: 0.6rem; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; padding: 8px 11px; border-radius: 999px; white-space: nowrap; display: flex; align-items: center; gap: 5px; background: none; border: none; cursor: pointer; transition: background 0.2s ease; line-height: 1; height: 32px; margin: 0; }
        .tfc-drop-btn:hover { background: rgba(122,63,209,0.10); }
        .tfc-drop-btn.active { background: rgba(122,63,209,0.14); }

        /* ── HAMBURGER ── */
        .tfc-hamburger { display: none; flex-direction: column; align-items: center; justify-content: center; gap: 5px; cursor: pointer; width: 40px; height: 40px; border-radius: 12px; padding: 0; flex-shrink: 0; }
        .tfc-hamburger span { display: block; width: 18px; height: 2px; border-radius: 2px; transition: all 0.25s ease; }
        .tfc-hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .tfc-hamburger.open span:nth-child(2) { opacity: 0; }
        .tfc-hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

        /* ── MONOCHROME THEME TOGGLE ── */
        .tfc-theme-toggle {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
          flex-shrink: 0;
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
          overflow: hidden;
          position: relative;
        }
        .tfc-theme-toggle:hover {
          background: ${themeBtnHoverBg} !important;
          transform: translateY(-1px);
        }
        .tfc-theme-toggle:active {
          transform: translateY(0);
        }
        .tfc-theme-toggle svg {
          position: absolute;
        }

        .tfc-mobile-ticket { display: none !important; }
        .tfc-desktop-ticket { display: inline-flex !important; }
        .tfc-desktop-nav { display: flex; }

        /* ── TABLET ── */
        @media (max-width: 1280px) {
          .tfc-desktop-nav { display: none !important; }
          .tfc-hamburger { display: flex !important; }
          .tfc-nav-center { display: none !important; }
          .tfc-nav-container { height: 108px; }
          .tfc-nav-logo { height: 84px !important; max-width: 290px !important; }
          .tfc-desktop-ticket { display: inline-flex !important; }
          .tfc-mobile-ticket { display: none !important; }
        }

        /* ── MOBILE ── */
        @media (max-width: 640px) {
          .tfc-nav-container { height: auto !important; min-height: 92px !important; padding: 14px 3% !important; gap: 8px !important; }
          .tfc-nav-logo { height: 68px !important; max-width: 220px !important; }
          .tfc-mobile-ticket { display: inline-flex !important; padding: 9px 16px !important; font-size: 0.6rem !important; }
          .tfc-desktop-ticket { display: none !important; }
          .tfc-brochure-btn { display: none !important; }
          .tfc-theme-toggle { width: 38px; height: 38px; }
        }

        @media (max-width: 380px) {
          .tfc-nav-logo { height: 60px !important; max-width: 180px !important; }
        }

        /* ── PHONE MENU ── */
        .tfc-m-row { display: flex; align-items: center; justify-content: space-between; min-height: 56px; padding: 0 4px; font-family: 'Orbitron', sans-serif; font-size: 1rem; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; border-bottom: 1px solid ${border}; }
        .tfc-m-row svg { opacity: 0.45; transition: transform 0.2s ease, opacity 0.2s ease; }
        .tfc-m-row:active svg, .tfc-m-row.active svg { opacity: 1; transform: translateX(3px); }
        .tfc-m-label { font-family: 'Orbitron', sans-serif; font-size: 0.6rem; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin: 26px 4px 10px; }
        .tfc-m-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .tfc-m-tile { display: flex; align-items: center; min-height: 52px; padding: 0 14px; border-radius: 14px; font-family: 'Orbitron', sans-serif; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; text-decoration: none; border: 1px solid ${pillBorder}; transition: background 0.15s ease; }
        .tfc-m-tile:active { background: rgba(122,63,209,0.14) !important; }
      `}</style>

      <nav ref={navRef} className="tfc-navbar-wrap" style={{ background: bg, borderBottom: "1px solid " + border }}>
        <div className="tfc-nav-container">

          {/* LEFT: LOGO */}
          <div className="tfc-nav-left">
            <Link to="/" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
              <img className="tfc-nav-logo" src={dark ? "/Tech_Festival_Canada_Logo_Dark_Transparent.png" : "/Tech_Festival_Canada_Logo_Light_Transparent.webp"} alt="The Tech Festival Canada" />
            </Link>
          </div>

          {/* CENTER: DESKTOP NAV */}
          <div className="tfc-nav-center">
            <div className="tfc-desktop-nav">
              <ul style={{ display: "flex", alignItems: "center", gap: 2, listStyle: "none", margin: 0, padding: "4px 5px", background: pillBg, border: "1px solid " + pillBorder, borderRadius: 999, height: 42 }}>
                {navItems.map((item) => {
                  if (item.hasDropdown) {
                    var dc = getDropConfig(item.dropKey);
                    return (
                      <li key={item.dropKey} style={{ position: "relative", display: "flex", alignItems: "center" }}
                        onMouseEnter={() => dc.setOpen(true)}
                        onMouseLeave={() => dc.setOpen(false)}
                      >
                        <button
                          onClick={() => dc.setOpen(!dc.open)}
                          className={"tfc-drop-btn" + (isActive(item) ? " active" : "")}
                          style={{ color: isActive(item) ? textMain : textMuted }}
                        >
                          {item.label}
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: dc.open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </button>
                        {renderDropdown(dc.items, dc.open, dc.setOpen)}
                      </li>
                    );
                  }
                  return (
                    <li key={item.path} style={{ display: "flex", alignItems: "center" }}>
                      <Link to={item.path} className={"tfc-nav-link" + (isActive(item) ? " active" : "")} style={{ color: isActive(item) ? textMain : textMuted }}>{item.label}</Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            <Link to="/tickets" className="tfc-mobile-ticket btn-primary"
              style={{ padding: "10px 24px", borderRadius: 999, fontFamily: "'Orbitron', sans-serif", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", textDecoration: "none", transition: "all 0.2s ease" }}
            >TICKETS</Link>
          </div>

          {/* RIGHT: ACTIONS */}
          <div className="tfc-nav-right">
            <Link to="/brochures" className="tfc-brochure-btn"
              style={{ padding: "0 18px", height: 38, borderRadius: 999, background: "transparent", border: "2px solid " + (isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.18)"), color: isDark ? "#fff" : "#0f0520", fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "0.62rem", letterSpacing: "0.8px", textDecoration: "none", display: "flex", alignItems: "center", textTransform: "uppercase" }}
            >BROCHURE</Link>

            <Link to="/tickets" className="tfc-desktop-ticket btn-primary"
              style={{ alignItems: "center", gap: 8, padding: "9px 20px", borderRadius: 999, fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", textDecoration: "none", transition: "all 0.2s ease" }}
            >TICKETS</Link>

            <ThemeToggle />

            <button className={"tfc-hamburger" + (mobileOpen ? " open" : "")} onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen}
              style={{ background: themeBtnBg, border: "1px solid " + themeBtnBorder }}>
              <span style={{ background: textMain }} />
              <span style={{ background: textMain }} />
              <span style={{ background: textMain }} />
            </button>
          </div>

        </div>

        {/* MOBILE MENU — full-height sheet: big rows, grouped tiles, tickets always in reach.
            Portalled to <body>: the bar's backdrop-filter would otherwise trap position:fixed inside it. */}
        {createPortal(<AnimatePresence>
          {mobileOpen && (
            <motion.div
              data-lenis-prevent
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              style={{ position: "fixed", top: navHeight, left: 0, right: 0, bottom: 0, zIndex: 9998, display: "flex", flexDirection: "column", background: mobileBg, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderTop: "1px solid " + border }}
            >
              <motion.div
                initial="hidden" animate="show"
                variants={{ show: { transition: { staggerChildren: 0.035 } } }}
                style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", padding: "8px 20px 24px" }}
              >
                {navItems.filter((item) => !item.hasDropdown).map((item) => {
                  const active = location.pathname === item.path;
                  return (
                    <motion.div key={item.path} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                      <Link to={item.path} onClick={() => setMobileOpen(false)}
                        className={"tfc-m-row" + (active ? " active" : "")}
                        style={{ color: active ? "#7a3fd1" : textMain }}
                      >
                        {item.label}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                      </Link>
                    </motion.div>
                  );
                })}

                {mobileGroups.map((group) => (
                  <motion.div key={group.title} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                    <div className="tfc-m-label" style={{ color: textMuted }}>{group.title}</div>
                    <div className="tfc-m-grid">
                      {group.items.map((d) => {
                        const active = location.pathname === d.path;
                        return (
                          <Link key={d.path} to={d.path} onClick={() => setMobileOpen(false)} className="tfc-m-tile"
                            style={{ color: active ? "#7a3fd1" : textMain, background: active ? "rgba(122,63,209,0.10)" : pillBg }}
                          >{d.label}</Link>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              <div style={{ display: "flex", gap: 10, padding: "12px 20px calc(14px + env(safe-area-inset-bottom))", borderTop: "1px solid " + border, background: mobileBg }}>
                <Link to="/brochures" onClick={() => setMobileOpen(false)}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", height: 50, borderRadius: 14, fontFamily: "'Orbitron', sans-serif", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", textDecoration: "none", border: "1.5px solid " + (isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.18)"), color: isDark ? "#fff" : "#0f0520" }}
                >Brochure</Link>
                <Link to="/tickets" onClick={() => setMobileOpen(false)} className="btn-primary"
                  style={{ flex: 1.4, display: "flex", alignItems: "center", justifyContent: "center", height: 50, borderRadius: 14, fontFamily: "'Orbitron', sans-serif", fontSize: "0.78rem", fontWeight: 900, letterSpacing: "1.2px", textTransform: "uppercase", textDecoration: "none" }}
                >Get tickets</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>, document.body)}
      </nav>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
