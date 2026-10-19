import { APP_STORE_URL, PLAY_STORE_URL } from "../lib/appStores";
import { track } from "../lib/pwaEvents";

/* =========================================================
   Text-styled store badges (no official artwork in the repo):
   Google Play, plus the App Store once APP_STORE_URL is set.
   Used by the /app desktop page and the website's desktop
   "Get the TTFC app on your phone" panel. Inline styles, so it
   looks the same on both.
========================================================= */

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const badge = {
  display: "inline-flex", alignItems: "center", gap: 10, minHeight: 52, padding: "8px 16px 8px 12px", boxSizing: "border-box",
  borderRadius: 12, background: "#000", color: "#fff", border: "1px solid rgba(255,255,255,0.32)", textDecoration: "none",
  fontFamily: FONT, textAlign: "left", lineHeight: 1.1,
};

function Glyph({ store }) {
  return store === "play" ? (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" style={{ flex: "none" }}>
      <path d="M5 3.6v16.8c0 .8.9 1.3 1.6.9l14.5-8.4c.7-.4.7-1.4 0-1.8L6.6 2.7C5.9 2.3 5 2.8 5 3.6Z" fill="#fff" />
    </svg>
  ) : (
    <svg width="22" height="24" viewBox="0 0 22 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ flex: "none" }}>
      <rect x="4" y="1.5" width="14" height="21" rx="3" /><path d="M9 19h4" />
    </svg>
  );
}

export default function StoreBadges({ where, style }) {
  const stores = [
    { id: "play", url: PLAY_STORE_URL, top: "GET IT ON", name: "Google Play", label: "Get the TTFC app on Google Play" },
    ...(APP_STORE_URL ? [{ id: "appstore", url: APP_STORE_URL, top: "Download on the", name: "App Store", label: "Download the TTFC app on the App Store" }] : []),
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, ...style }}>
      {stores.map((s) => (
        <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label} style={badge}
          onClick={() => track("pwa_store_click", { store: s.id, where })}>
          <Glyph store={s.id} />
          <span>
            <span style={{ display: "block", fontSize: 10.5, fontWeight: 500, letterSpacing: 0.4 }}>{s.top}</span>
            <span style={{ display: "block", fontSize: 18, fontWeight: 600, letterSpacing: -0.2 }}>{s.name}</span>
          </span>
        </a>
      ))}
    </div>
  );
}
