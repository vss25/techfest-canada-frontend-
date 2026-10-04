import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import useSiteSettings, { safeUrl } from "../hooks/useSiteSettings";

/* Public-site pieces driven by Site settings → Website options in the admin panel. */

const isStaffPath = (p) => p === "/admin" || p.startsWith("/admin/") || p === "/admin-login";

function useBodyDark() {
  const [dark, setDark] = useState(() => typeof document !== "undefined" && document.body.classList.contains("dark-mode"));
  useEffect(() => {
    const sync = () => setDark(document.body.classList.contains("dark-mode"));
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

const DISMISS_KEY = "ttfc_announcement_dismissed";
const readDismissed = () => { try { return localStorage.getItem(DISMISS_KEY) || ""; } catch { return ""; } };

/** Slim bar above the navbar on every public page. Dismissal is remembered per message. */
export function AnnouncementBar() {
  const s = useSiteSettings();
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(readDismissed);
  const ref = useRef(null);
  const text = s["site.announcement"];
  const link = safeUrl(s["site.announcement_link"]);
  const show = !!text && dismissed !== text && !isStaffPath(pathname);

  useLayoutEffect(() => {
    const body = document.body;
    if (!show || !ref.current) { body.classList.remove("ttfc-has-announcement"); return undefined; }
    const apply = () => document.documentElement.style.setProperty("--ttfc-announce-h", `${ref.current?.offsetHeight || 0}px`);
    apply();
    body.classList.add("ttfc-has-announcement");
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
    ro?.observe(ref.current);
    return () => { ro?.disconnect(); body.classList.remove("ttfc-has-announcement"); };
  }, [show, text]);

  if (!show) return null;
  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, text); } catch { /* ignore */ }
    setDismissed(text);
  };
  const isExternal = link && !link.startsWith(window.location.origin);

  return (
    <>
      <style>{`
        body.ttfc-has-announcement { padding-top: var(--ttfc-announce-h, 0px); }
        body.ttfc-has-announcement .tfc-navbar-wrap { top: var(--ttfc-announce-h, 0px) !important; }
      `}</style>
      <div
        ref={ref}
        role="region"
        aria-label="Announcement"
        style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 10000, background: "linear-gradient(90deg, #7a3fd1, #d9468f 55%, #f5a623)", color: "#ffffff", fontFamily: "'Montserrat', sans-serif" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "8px 48px 8px 16px", position: "relative", textAlign: "center", fontSize: "0.82rem", fontWeight: 600, lineHeight: 1.45 }}>
          {link ? (
            <a href={link} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener noreferrer" : undefined}
              style={{ color: "#ffffff", textDecoration: "underline", textUnderlineOffset: 3 }}>
              {text} <span aria-hidden="true">→</span>
            </a>
          ) : text}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss announcement"
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 28, height: 28, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.16)", color: "#ffffff", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      </div>
    </>
  );
}

/** A friendly closed/coming-soon card used inside existing pages. */
export function ClosedNotice({ title, body, dark, cta }) {
  return (
    <div
      role="status"
      style={{ textAlign: "center", padding: "clamp(32px,5vw,56px) 24px", borderRadius: 20, border: "1px solid " + (dark ? "rgba(155,135,245,0.18)" : "rgba(122,63,209,0.16)"), background: dark ? "rgba(255,255,255,0.03)" : "rgba(122,63,209,0.03)" }}
    >
      <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "clamp(1.1rem,2.5vw,1.4rem)", color: dark ? "#ffffff" : "#0d0520", margin: "0 0 10px" }}>{title}</h3>
      {body && <p style={{ fontSize: "0.92rem", lineHeight: 1.7, color: dark ? "rgba(220,210,255,0.78)" : "rgba(13,5,32,0.68)", maxWidth: 520, margin: "0 auto" }}>{body}</p>}
      {cta}
    </div>
  );
}

/** Banner shown on Tickets / Checkout while ticket sales are paused. */
export function TicketSalesNotice({ message, dark, style }) {
  return (
    <div
      role="status"
      style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 18px", borderRadius: 14, border: "1px solid " + (dark ? "rgba(245,166,35,0.45)" : "rgba(217,138,20,0.45)"), background: dark ? "rgba(245,166,35,0.10)" : "rgba(245,166,35,0.10)", color: dark ? "#ffd8a0" : "#7a4a00", fontSize: "0.9rem", lineHeight: 1.6, textAlign: "left", ...style }}
    >
      <span aria-hidden="true" style={{ fontSize: "1.1rem", lineHeight: 1.3 }}>⏸</span>
      <span><strong style={{ fontWeight: 800 }}>Ticket sales are paused.</strong> {message}</span>
    </div>
  );
}

/** Wraps /agenda and /programme: shows "Agenda coming soon" while the agenda is switched off. */
export function AgendaGate({ children }) {
  const s = useSiteSettings();
  const dark = useBodyDark();
  if (s["site.show_agenda"] !== false) return children;
  return (
    <div style={{ background: dark ? "#06020f" : "#faf9ff", color: dark ? "#ffffff" : "#0d0520", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(140px,16vw,180px) 6% 80px" }}>
        <div style={{ maxWidth: 640, width: "100%" }}>
          <ClosedNotice
            dark={dark}
            title="Agenda coming soon"
            body="We're putting the finishing touches on the programme. Check back soon for sessions, speakers and timings."
            cta={<Link to="/speakers" style={{ display: "inline-block", marginTop: 22, padding: "12px 24px", borderRadius: 50, background: "linear-gradient(135deg,#7a3fd1,#f5a623)", color: "#fff", fontFamily: "'Orbitron', sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", textDecoration: "none" }}>See the speakers</Link>}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
