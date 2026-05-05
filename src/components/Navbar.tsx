import React, { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AuthModal from "./AuthModal";

const PARTNERS_DROPDOWN = [
  { label: "2026 Partners", path: "/partners2026" }
  { label: "Sponsor", path: "/sponsor" },
  { label: "Exhibit", path: "/exhibit" },
  { label: "KYC Form", path: "/kyc" },

];

const MORE_DROPDOWN = [
  { label: "Venue", path: "/venue" },
  { label: "Volunteer", path: "/volunteer" },
  { label: "Organizers", path: "/organizers" }
];


export default function Navbar() {
  const [authOpen, setAuthOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const isDark = theme === "dark";
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [partnersOpen, setPartnersOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobilePartnersOpen, setMobilePartnersOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const location = useLocation();

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
    setMobilePartnersOpen(false);
    setMobileMoreOpen(false);
  }, [location.pathname]);

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

  const navItems = [
    { label: "HOME", path: "/" },
    { label: "FIRST TIMERS", path: "/first-timers" },
    { label: "PARTNERS", hasDropdown: true, dropKey: "partners" },
    { label: "SPEAKERS", path: "/speakers" },
    { label: "AGENDA", path: "/agenda" },
    { label: "AWARDS", path: "/awards" },
    { label: "MORE", hasDropdown: true, dropKey: "more" },
  ];

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

  const getMobileDropConfig = (dropKey) => {
    if (dropKey === "partners") return { open: mobilePartnersOpen, setOpen: setMobilePartnersOpen, items: PARTNERS_DROPDOWN };
    if (dropKey === "more") return { open: mobileMoreOpen, setOpen: setMobileMoreOpen, items: MORE_DROPDOWN };
    return { open: false, setOpen: () => {}, items: [] };
  };

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

  return (
    <>
      <style>{`
        .tfc-navbar-wrap { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; width: 100%; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
        .tfc-nav-container { display: flex; align-items: center; justify-content: space-between; height: 72px; max-width: 1400px; margin: 0 auto; padding: 0 2%; gap: 12px; }
        .tfc-nav-left { flex-shrink: 0; display: flex; align-items: center; }
        .tfc-nav-center { flex: 1; display: flex; justify-content: center; align-items: center; min-width: 0; overflow: visible; }
        .tfc-nav-right { flex-shrink: 0; display: flex; justify-content: flex-end; align-items: center; gap: 8px; }
        .tfc-nav-logo { height: 42px; width: auto; max-width: 160px; object-fit: contain; display: block; }
        .tfc-nav-link { font-family: 'Orbitron', sans-serif; font-size: 0.6rem; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; padding: 8px 11px; border-radius: 999px; text-decoration: none; transition: background 0.2s ease, color 0.2s ease; white-space: nowrap; line-height: 1; display: flex; align-items: center; height: 32px; }
        .tfc-nav-link:hover { background: rgba(122,63,209,0.10); }
        .tfc-nav-link.active { background: rgba(122,63,209,0.14); }
        .tfc-drop-btn { font-family: 'Orbitron', sans-serif; font-size: 0.6rem; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; padding: 8px 11px; border-radius: 999px; white-space: nowrap; display: flex; align-items: center; gap: 5px; background: none; border: none; cursor: pointer; transition: background 0.2s ease; line-height: 1; height: 32px; margin: 0; }
        .tfc-drop-btn:hover { background: rgba(122,63,209,0.10); }
        .tfc-drop-btn.active { background: rgba(122,63,209,0.14); }
        .tfc-hamburger { display: none; flex-direction: column; gap: 5px; cursor: pointer; background: none; border: none; padding: 6px; }
        .tfc-hamburger span { display: block; width: 22px; height: 2px; border-radius: 2px; transition: all 0.25s ease; }
        .tfc-hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .tfc-hamburger.open span:nth-child(2) { opacity: 0; }
        .tfc-hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
        .tfc-mobile-ticket { display: none !important; }
        .tfc-desktop-ticket { display: inline-flex !important; }
        .tfc-desktop-nav { display: flex; }

        @media (max-width: 1280px) {
          .tfc-desktop-nav { display: none !important; }
          .tfc-hamburger { display: flex !important; }
          .tfc-nav-center { display: none !important; }
          .tfc-nav-logo { height: 46px !important; max-width: 170px !important; }
          .tfc-desktop-ticket { display: inline-flex !important; }
          .tfc-mobile-ticket { display: none !important; }
        }

        @media (max-width: 640px) {
          .tfc-nav-container { height: auto !important; padding: 12px 3% !important; }
          .tfc-nav-logo { height: 38px !important; max-width: 130px !important; }
          .tfc-mobile-ticket { display: inline-flex !important; padding: 9px 16px !important; font-size: 0.6rem !important; }
          .tfc-desktop-ticket { display: none !important; }
          .tfc-brochure-btn { display: none !important; }
        }
      `}</style>

      <nav className="tfc-navbar-wrap" style={{ background: bg, borderBottom: "1px solid " + border }}>
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

            <button onClick={toggleTheme} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", padding: "4px", lineHeight: 1 }} aria-label="Toggle theme">
              {dark ? "☀️" : "🌙"}
            </button>

            <button className={"tfc-hamburger" + (mobileOpen ? " open" : "")} onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
              <span style={{ background: textMain }} />
              <span style={{ background: textMain }} />
              <span style={{ background: textMain }} />
            </button>
          </div>

        </div>

        {/* MOBILE MENU */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.2 }}
              style={{ position: "absolute", top: "100%", left: 0, width: "100%", height: "calc(100vh - 72px)", overflowY: "auto", background: mobileBg, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderTop: "1px solid " + border }}
            >
              <div style={{ padding: "20px 24px 80px", display: "flex", flexDirection: "column", gap: 4 }}>
                {navItems.map((item) => {
                  if (item.hasDropdown) {
                    var mdc = getMobileDropConfig(item.dropKey);
                    return (
                      <div key={item.dropKey} style={{ display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span
                            style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", padding: "12px 16px", borderRadius: 12, flex: 1, color: isActive(item) ? "#7a3fd1" : textMain, background: isActive(item) ? "rgba(122,63,209,0.08)" : "transparent" }}
                          >{item.label}</span>
                          <button onClick={() => mdc.setOpen(!mdc.open)} style={{ background: "transparent", border: "none", color: textMain, cursor: "pointer", padding: "10px 16px", display: "flex", alignItems: "center" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: mdc.open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </button>
                        </div>
                        <AnimatePresence>
                          {mdc.open && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                              <div style={{ paddingLeft: 16, marginTop: 4, display: "flex", flexDirection: "column", gap: 4 }}>
                                {mdc.items.map((d) => (
                                  <Link key={d.path} to={d.path} onClick={() => setMobileOpen(false)}
                                    style={{ display: "block", fontFamily: "'Orbitron', sans-serif", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", textDecoration: "none", padding: "10px 16px", borderRadius: 10, color: location.pathname === d.path ? "#7a3fd1" : textMuted, background: location.pathname === d.path ? "rgba(122,63,209,0.08)" : "transparent" }}
                                  >— {d.label}</Link>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }
                  return (
                    <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
                      style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", textDecoration: "none", padding: "12px 16px", borderRadius: 12, color: location.pathname === item.path ? "#7a3fd1" : textMain, background: location.pathname === item.path ? "rgba(122,63,209,0.08)" : "transparent" }}
                    >{item.label}</Link>
                  );
                })}

                <Link to="/brochures" onClick={() => setMobileOpen(false)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 12, padding: "14px", borderRadius: 14, fontFamily: "'Orbitron', sans-serif", fontSize: "0.76rem", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", textDecoration: "none", border: "1px solid " + (isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.18)"), color: isDark ? "#fff" : "#0f0520" }}
                >BROCHURE</Link>

                <div style={{ marginTop: 8, padding: 2, borderRadius: 16 }}>
                  <Link to="/tickets" onClick={() => setMobileOpen(false)} className="btn-primary"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "14px", borderRadius: 14, fontFamily: "'Orbitron', sans-serif", fontSize: "0.82rem", fontWeight: 900, letterSpacing: "1.2px", textTransform: "uppercase", textDecoration: "none" }}
                  >TICKETS</Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
