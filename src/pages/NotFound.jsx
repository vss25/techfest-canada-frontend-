import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import useSeo from "../hooks/useSeo";
import { NOT_FOUND_ROBOTS, SITE_NAME } from "../seo/routes";

/* =========================================================
   An address the site doesn't have (App.jsx's last route, Oct 31
   2026). Static hosting answers every address with the site, so
   this can't be a real 404: it says so, links to the main pages,
   and tells search engines not to index it (noindex, no
   canonical), instead of an empty page under the home page's
   title. The look is /contact's.
========================================================= */

const WHERE = [
  { to: "/", label: "Home" },
  { to: "/stay-updated", label: "Stay updated for 2027" },
  { to: "/awards", label: "Catalyst Awards 2026 winners" },
  { to: "/speakers", label: "TTFC 2026 speakers" },
];

export default function NotFound() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const read = () => setIsDark(document.body.classList.contains("dark-mode"));
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  useSeo(`Page not found | ${SITE_NAME}`, undefined, { canonical: null, robots: NOT_FOUND_ROBOTS, jsonLd: null });

  const bg = isDark ? "#06020f" : "#f4f0ff";
  const textMain = isDark ? "#ffffff" : "#0f0520";
  const textMuted = isDark ? "rgba(200,180,255,0.8)" : "rgba(60,30,110,0.85)";
  const accent = isDark ? "#b99eff" : "#7a3fd1";

  return (
    <div style={{ background: bg, color: textMain, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "140px 16px 80px", textAlign: "center" }}>
        <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", color: accent, marginBottom: "1.2rem" }}>
          404
        </p>
        <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(1.8rem, 5vw, 3rem)", fontWeight: 900, letterSpacing: "1px", margin: "0 0 1rem", background: "linear-gradient(135deg, #7a3fd1, #f5a623)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Page not found
        </h1>
        <p style={{ fontSize: "1.1rem", color: textMuted, lineHeight: 1.8, maxWidth: 560, margin: "0 auto 2rem" }}>
          There&apos;s no page at this address. It may have moved, or the link may have a typo.
        </p>
        {/* tfc-nav: styles.css makes any other <nav> the sticky menu bar. */}
        <nav aria-label="Main pages" className="tfc-nav">
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
            {WHERE.map((w) => (
              <li key={w.to}>
                <Link to={w.to} style={{ display: "inline-block", padding: "12px 22px", borderRadius: 999, border: `1.5px solid ${accent}`, color: accent, fontFamily: "'Orbitron', sans-serif", fontSize: "0.7rem", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", textDecoration: "none" }}>
                  {w.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
      <Footer />
    </div>
  );
}
