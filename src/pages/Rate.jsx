import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import StoreBadges from "../components/StoreBadges";
import { detectOS } from "../lib/pwaPlatform";
import { RATE_TEXT, rateTarget, storeParam } from "../lib/rate";

/* =========================================================
   /rate: "Rate the app" (Oct 27 2026). One tap from a notification
   opens the right store: an iPhone / iPad goes straight to the App
   Store's "Write a Review", an Android phone to Google Play
   (index.html does it before the site even loads; this page is the
   fallback). ?store=ios|android picks one. Anything else (a
   computer) sees both store badges and neutral words, never a
   request for a particular rating. noindex. src/lib/rate.js.
========================================================= */

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

export default function Rate() {
  const dark = useDarkMode();
  const [target] = useState(() => rateTarget(detectOS(), storeParam(typeof location !== "undefined" ? location.search : "")));

  useEffect(() => {
    const prev = document.title;
    document.title = "Rate the TTFC app | The Tech Festival Canada";
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    if (target) window.location.replace(target);
    return () => { document.title = prev; robots.remove(); };
  }, [target]);

  const c = dark
    ? { bg: "#06020f", text: "#ffffff", mid: "rgba(225,215,255,0.82)", card: "rgba(255,255,255,0.045)", line: "rgba(155,135,245,0.18)", accent: "#c4adff" }
    : { bg: "#faf9ff", text: "#0d0520", mid: "rgba(13,5,32,0.7)", card: "#ffffff", line: "rgba(122,63,209,0.14)", accent: "#6a2fc4" };

  return (
    <>
      <Navbar />
      <main style={{ background: c.bg, color: c.text, minHeight: "100vh" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "clamp(108px, 14vw, 140px) 16px 80px", textAlign: "center" }}>
          <div style={{ padding: "28px 22px", borderRadius: 22, background: c.card, border: `1px solid ${c.line}` }}>
            <img src="/app/icons/icon-192.png" alt="" width="72" height="72" style={{ borderRadius: 18, margin: "0 auto", display: "block" }} />
            <h1 style={{ margin: "16px 0 0", fontSize: "clamp(24px, 5vw, 30px)", fontWeight: 800, lineHeight: 1.2 }}>Rate the TTFC app</h1>
            {target ? (
              <>
                <p style={{ margin: "10px 0 0", fontSize: 17, lineHeight: 1.55, color: c.mid }} role="status">Opening the store…</p>
                <p style={{ margin: "14px 0 0" }}>
                  <a href={target} style={{ color: c.accent, fontWeight: 700 }}><Star size={16} aria-hidden="true" style={{ verticalAlign: -2, marginRight: 6 }} />Open the store</a>
                </p>
              </>
            ) : (
              <>
                <p style={{ margin: "10px 0 18px", fontSize: 17, lineHeight: 1.55, color: c.mid }}>{RATE_TEXT}</p>
                <StoreBadges where="rate" os="desktop" />
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
