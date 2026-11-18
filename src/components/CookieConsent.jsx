import { useEffect, useState } from "react";
import {
  getConsent, setConsent, clearConsent, loadTrackers, trackersLoaded, OPEN_SETTINGS_EVENT,
} from "../lib/trackers";

/* The cookie banner in the approved design's style language (Nov 2026): Poppins, navy #151035
   text and primary button, an outlined secondary button, a white card with a #E8E5F1 edge and
   12px corners, no gradients or emoji. Same choices as before: Accept all loads the analytics
   and advertising tags (src/lib/trackers.js); Essential only (and closing) loads none; a
   choice already saved isn't asked again until "Cookie settings" in the footer reopens it. */

const NAVY = "#151035";
const LINE = "#E8E5F1";
const MUTED = "#52525B";

const KINDS = [
  { label: "Essential", desc: "Signing in, security, your tickets and settings. Always on.", always: true },
  { label: "Analytics", desc: "Google Analytics: which pages are used, so we can improve them." },
  { label: "Advertising", desc: "Meta Pixel and a visitor-identification service, to measure our campaigns." },
];

const btn = (primary) => ({
  height: 36, padding: "0 14px", borderRadius: 8, cursor: "pointer",
  fontFamily: "inherit", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
  border: primary ? "0" : `1px solid #D4D4D8`,
  background: primary ? NAVY : "#FFFFFF",
  color: primary ? "#FFFFFF" : NAVY,
});

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [details, setDetails] = useState(false);

  useEffect(() => {
    if (getConsent()) return undefined;
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);

  // "Cookie settings" in the footer: forget the saved choice and ask again.
  useEffect(() => {
    const open = () => { clearConsent(); setDetails(true); setVisible(true); };
    window.addEventListener(OPEN_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, open);
  }, []);

  // Analytics/advertising tags load only on "all". Choosing "essential" after they were loaded
  // on this page reloads it so they stop.
  const accept = (type) => {
    setConsent(type);
    setVisible(false);
    if (type === "all") loadTrackers();
    else if (trackersLoaded()) window.location.reload();
  };

  if (!visible) return null;
  return (
    <section
      role="dialog"
      aria-label="Cookies"
      aria-describedby="cookie-text"
      className="ttfc-cookie"
      style={{
        position: "fixed", left: 16, right: 16, bottom: "calc(16px + var(--ttfc-staging-bar, 0px))", zIndex: 99999,
        maxWidth: 420, margin: "0 auto", boxSizing: "border-box",
        background: "#FFFFFF", color: NAVY, border: `1px solid ${LINE}`, borderRadius: 12,
        boxShadow: "0 10px 30px rgba(21,16,53,0.14)", padding: 14,
        fontFamily: "Poppins, system-ui, sans-serif",
        display: "flex", flexDirection: "column", gap: 10,
      }}
    >
      <style>{`
        .ttfc-cookie button:focus-visible, .ttfc-cookie a:focus-visible { outline: 2px solid #D6308C; outline-offset: 2px; }
        .ttfc-cookie .ttfc-cookie-row { display: flex; gap: 8px; flex-wrap: wrap; }
        @media (prefers-reduced-motion: no-preference) { .ttfc-cookie { animation: ttfc-cookie-in .25s ease-out; } }
        @keyframes ttfc-cookie-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
      `}</style>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <strong style={{ fontSize: 14, lineHeight: "20px" }}>Cookies</strong>
          <p id="cookie-text" style={{ margin: 0, fontSize: 12.5, lineHeight: "18px", color: MUTED }}>
            Essential cookies run the site. With your OK we also use analytics and advertising cookies.{" "}
            <a href="/privacy" style={{ color: NAVY, fontWeight: 600, textUnderlineOffset: 3 }}>Privacy</a>
          </p>
        </div>
        <button type="button" onClick={() => accept("essential")} aria-label="Close: essential cookies only"
          style={{ border: 0, background: "transparent", color: MUTED, cursor: "pointer", padding: 4, lineHeight: 0, borderRadius: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      </div>

      {details && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, border: `1px solid ${LINE}`, borderRadius: 10 }}>
          {KINDS.map((k, i) => (
            <li key={k.label} style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "7px 10px", borderTop: i ? `1px solid ${LINE}` : 0 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, minWidth: 78 }}>{k.label}</span>
              <span style={{ flex: 1, fontSize: 12, lineHeight: "17px", color: MUTED }}>{k.desc}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: k.always ? "#15803D" : MUTED, whiteSpace: "nowrap" }}>{k.always ? "Always on" : "Accept all"}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="ttfc-cookie-row">
        <button type="button" onClick={() => accept("all")} style={{ ...btn(true), flex: "1 1 auto" }}>Accept all</button>
        <button type="button" onClick={() => accept("essential")} style={{ ...btn(false), flex: "1 1 auto" }}>Essential only</button>
        <button type="button" onClick={() => setDetails((v) => !v)} aria-expanded={details}
          style={{ ...btn(false), border: 0, padding: "0 6px", textDecoration: "underline", textUnderlineOffset: 4 }}>
          {details ? "Hide" : "Details"}
        </button>
      </div>
    </section>
  );
}
