import { lazy, Suspense, useState } from "react";
import StoreBadges from "./StoreBadges";
import { storeNames } from "../lib/appStores";
import { detectOS } from "../lib/pwaPlatform";
import { isMobileDevice } from "../lib/pwaPlatform";
import { track } from "../lib/pwaEvents";
import { isNativeVisit } from "../lib/nativeVisit";

// Computers only (it carries the QR code library): phones never download it.
const PhoneAppPanel = lazy(() => import("./PhoneAppPanel"));

/* =========================================================
   "Get the TTFC app" on the homepage, right under the hero
   (Oct 22 2026, the organiser: "Prompt the users to download
   Android/iOS … Make sure this is available on the website
   also"): the App Store and Google Play badges (this phone's own
   store first, StoreBadges) and, on a computer, "Get it on your
   phone" with a QR code (PhoneAppPanel). Light and dark like the
   page (`dark`). Nothing when neither store link is set, or for
   visitors who came from the iPhone or Android app (?source=ios …,
   lib/nativeVisit.js: they have it already, Oct 24 2026).
========================================================= */

export default function GetAppSection({ dark }) {
  const [qr, setQr] = useState(false);
  const [computer] = useState(() => !isMobileDevice());
  const [fromStoreApp] = useState(() => isNativeVisit());
  const names = storeNames(undefined, detectOS());
  if (!names || fromStoreApp) return null;

  const c = dark
    ? { bg: "#06020f", card: "linear-gradient(135deg, rgba(122,63,209,0.22), rgba(245,166,35,0.08))", edge: "rgba(155,135,245,0.32)", text: "#ffffff", mid: "rgba(225,215,255,0.78)", accent: "#c4adff" }
    : { bg: "#ffffff", card: "linear-gradient(135deg, rgba(122,63,209,0.08), rgba(245,166,35,0.06))", edge: "rgba(122,63,209,0.22)", text: "#0d0520", mid: "rgba(13,5,32,0.68)", accent: "#6a2fc4" };

  return (
    <section id="get-the-app" aria-labelledby="get-app-title" style={{ background: c.bg, padding: "28px 16px 8px" }}>
      <div style={{
        maxWidth: 760, margin: "0 auto", padding: "22px clamp(18px, 4vw, 32px)", borderRadius: 24, background: c.card, border: `1px solid ${c.edge}`,
        display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "16px 28px", textAlign: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, textAlign: "left", flex: "1 1 280px", minWidth: 0 }}>
          <img src="/app/icons/icon-192.png" alt="" width="60" height="60" loading="lazy" decoding="async" style={{ flex: "none", borderRadius: 14, boxShadow: "0 6px 18px rgba(0,0,0,0.25)" }} />
          <div style={{ minWidth: 0 }}>
            <h2 id="get-app-title" style={{ margin: 0, fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(1.05rem, 3.6vw, 1.3rem)", fontWeight: 900, lineHeight: 1.25, color: c.text }}>Get the TTFC app</h2>
            <p style={{ margin: "6px 0 0", fontSize: "0.95rem", lineHeight: 1.5, color: c.mid }}>
              Your pass, the schedule, live polls and chat. Free on {names}.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <StoreBadges where="home_section" />
          {computer && (
            <button type="button" onClick={() => { setQr(true); track("pwa_phone_qr_open", { where: "home_section" }); }}
              style={{ background: "none", border: 0, padding: "6px 8px", minHeight: 36, color: c.accent, font: "inherit", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>
              Get it on your phone with a QR code
            </button>
          )}
        </div>
      </div>
      {qr && (
        <Suspense fallback={null}>
          <PhoneAppPanel where="home_section" onDismiss={() => setQr(false)} actions={[{ label: "Close", onClick: () => setQr(false) }]} />
        </Suspense>
      )}
    </section>
  );
}
