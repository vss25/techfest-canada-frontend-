import { useEffect, useState } from "react";
import { Handshake, MessagesSquare, ScanLine, Smartphone, Trophy } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import StoreBadges from "../components/StoreBadges";
import useSiteSettings, { PUBLIC_API } from "../hooks/useSiteSettings";
import { LEADERBOARD_PAGE_TITLE, fetchSwag, leaderboardHowTo, networkersView, swagFrom } from "../lib/swag";
import { isNativeVisit } from "../lib/nativeVisit";

/* =========================================================
   /swag: "How the leaderboard works" (Oct 27 2026). The page the
   apps' leaderboard banner opens. The organiser: the leaderboard is
   "appreciation for starting conversations and meeting people",
   not a prize (the kits go to every attendee who tags TTFC on
   LinkedIn or Instagram), so nothing here talks about winning or
   prizes, and there's no photo or entry. The words are the
   appreciation text staff write in Admin › Website & app › Top
   networkers (swag.rules, {kits} and {announce} filled in): GET
   /api/app/swag, or the same worked out from the site settings until
   it answers (src/lib/swag.js). Then three lines on how points come,
   when the top networkers are celebrated (or "they're in, see them in
   the app" afterwards), and the App Store and Google Play badges
   (left out when opened from the iPhone or Android app). Light and
   dark like the rest of the site.
========================================================= */

const HOW_ICONS = [MessagesSquare, ScanLine, Trophy];

export default function Swag() {
  const settings = useSiteSettings();
  const [api, setApi] = useState(null);
  const s = api || swagFrom(settings);
  const [dark, setDark] = useState(false);
  const [fromStoreApp] = useState(() => isNativeVisit());
  const [now] = useState(() => Date.now());
  const v = networkersView(s, now);

  useEffect(() => {
    let alive = true;
    fetchSwag(PUBLIC_API).then((r) => { if (alive && r) setApi(r); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const read = () => setDark(document.body.classList.contains("dark-mode"));
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const before = document.title;
    document.title = `${LEADERBOARD_PAGE_TITLE} | The Tech Festival Canada`;
    return () => { document.title = before; };
  }, []);

  const c = dark
    ? { bg: "#06020f", text: "#ffffff", mid: "rgba(225,215,255,0.82)", card: "rgba(255,255,255,0.045)", line: "rgba(155,135,245,0.18)", accent: "#c4adff", chip: "rgba(155,135,245,0.16)" }
    : { bg: "#faf9ff", text: "#0d0520", mid: "rgba(13,5,32,0.7)", card: "#ffffff", line: "rgba(122,63,209,0.14)", accent: "#6a2fc4", chip: "rgba(122,63,209,0.09)" };
  const loaded = !!api || settings.loaded;
  const when = !loaded || !v.on ? null
    : v.announced ? "Our top networkers are in. See them on the leaderboard in the TTFC app. Thank you for every conversation."
      : String(s.rules || "").includes(v.announceLabel) ? null // the appreciation text already says when
        : `At ${v.announceLabel} we'll celebrate the top ${v.kits} networkers in the app.`;

  return (
    <>
      <Navbar />
      <main style={{ background: c.bg, color: c.text, minHeight: "100vh" }}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "clamp(88px, 12vw, 120px) 16px 72px" }}>
          <p style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 999, background: c.chip, color: c.accent, fontSize: 13, fontWeight: 700, letterSpacing: 0.3 }}>
            <Handshake size={15} aria-hidden="true" /> {s.title}
          </p>
          <h1 style={{ margin: "14px 0 0", fontSize: "clamp(32px, 6vw, 48px)", lineHeight: 1.08, fontWeight: 800, letterSpacing: -0.5 }}>{LEADERBOARD_PAGE_TITLE}</h1>
          <p style={{ margin: "16px 0 0", fontSize: 18, lineHeight: 1.6, color: c.mid, whiteSpace: "pre-line" }}>{s.rules}</p>
          {when && (
            <p style={{
              margin: "18px 0 0", display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 14,
              background: c.chip, border: `1px solid ${c.line}`, color: c.text, fontSize: 17, lineHeight: 1.45, fontWeight: 700,
            }}>
              <Trophy size={20} aria-hidden="true" style={{ flex: "none", marginTop: 2, color: c.accent }} />
              <span>{when}</span>
            </p>
          )}

          <section aria-labelledby="how-h" style={{ marginTop: 44 }}>
            <h2 id="how-h" style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>How points come</h2>
            <ol style={{ listStyle: "none", margin: "18px 0 0", padding: 0, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))" }}>
              {leaderboardHowTo(s).map((line, i) => {
                const Icon = HOW_ICONS[i];
                return (
                  <li key={line} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: 18, borderRadius: 18, background: c.card, border: `1px solid ${c.line}` }}>
                    <span aria-hidden="true" style={{ flex: "none", width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: c.chip, color: c.accent }}><Icon size={20} /></span>
                    <span style={{ fontSize: 16, lineHeight: 1.5 }}>{line}</span>
                  </li>
                );
              })}
            </ol>
          </section>

          {!fromStoreApp && (
            <section aria-labelledby="app-h" style={{ marginTop: 44, padding: "22px 20px", borderRadius: 20, background: c.card, border: `1px solid ${c.line}` }}>
              <h2 id="app-h" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontSize: 20, fontWeight: 800 }}>
                <Smartphone size={20} aria-hidden="true" style={{ color: c.accent }} /> The TTFC app
              </h2>
              <p style={{ margin: "8px 0 14px", fontSize: 16, lineHeight: 1.55, color: c.mid }}>Connect, chat and see the leaderboard in the TTFC app.</p>
              <StoreBadges where="swag" align="start" />
            </section>
          )}

          <p style={{ margin: "28px 0 0", fontSize: 14, color: c.mid }}>
            Questions? Email <a href="mailto:enquire@thetechfestival.com" style={{ color: c.accent, fontWeight: 600 }}>enquire@thetechfestival.com</a>.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
