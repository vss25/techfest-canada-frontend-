import { useEffect, useState } from "react";
import { BadgeCheck, Smartphone, Trophy, UserRoundPlus, Gift } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import StoreBadges from "../components/StoreBadges";
import useSiteSettings, { PUBLIC_API } from "../hooks/useSiteSettings";
import { SWAG_ALT, SWAG_PHOTO, fetchSwag, swagFrom, swagHowTo } from "../lib/swag";
import { detectOS } from "../lib/pwaPlatform";
import { isNativeVisit } from "../lib/nativeVisit";

/* Who isn't involved, named for this device: an iPhone never sees Google named (App Store guideline 2.3.10). */
const NOT_SPONSORS = {
  ios: "Apple Inc. is not a sponsor of this giveaway and is not involved in it in any way.",
  android: "Google LLC is not a sponsor of this giveaway and is not involved in it in any way.",
  other: "Apple Inc. and Google LLC are not sponsors of this giveaway and are not involved in it in any way.",
};

/* =========================================================
   /swag: "Win the TTFC swag kit" (Oct 22 2026). The rules page the
   app invite email ("Win the swag kit"), the apps' Points banner and
   the install page link to: the photo, the title, how to win in
   three lines, the App Store and Google Play badges (Oct 22 2026,
   StoreBadges: this phone's own store first) and the rules
   staff write in Admin › Website & app › Swag kit giveaway (with the
   number of kits and the times filled in): GET /api/app/swag, or the
   same worked out from the site settings until it answers
   (src/lib/swag.js). Light and dark like the rest of the site.
   It's an advert for the app (the organiser, Oct 22 2026): the hero
   says "Download the TTFC app to win" and, as loud as the button,
   "Only people using the TTFC app can win" (the server's `pitch`);
   winners are told at the end of Day 1. Opened from the iPhone or
   Android app (?source=ios …, lib/nativeVisit.js), the "Get the app"
   badges are left out: they have it (Oct 24 2026).
========================================================= */

const HOW_ICONS = [Smartphone, UserRoundPlus, Trophy];

export default function Swag() {
  const settings = useSiteSettings();
  const [api, setApi] = useState(null);
  const s = api || swagFrom(settings);
  const [dark, setDark] = useState(false);
  const [fromStoreApp] = useState(() => isNativeVisit());

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
    document.title = `${s.title} | The Tech Festival Canada`;
    return () => { document.title = before; };
  }, [s.title]);

  const c = dark
    ? { bg: "#06020f", text: "#ffffff", mid: "rgba(225,215,255,0.82)", card: "rgba(255,255,255,0.045)", line: "rgba(155,135,245,0.18)", accent: "#c4adff", chip: "rgba(155,135,245,0.16)" }
    : { bg: "#faf9ff", text: "#0d0520", mid: "rgba(13,5,32,0.7)", card: "#ffffff", line: "rgba(122,63,209,0.14)", accent: "#6a2fc4", chip: "rgba(122,63,209,0.09)" };
  const loaded = !!api || settings.loaded;
  const note = !loaded ? null
    : s.stage === "off" ? "The giveaway opens soon. Get the app now and start earning points."
      : s.stage === "closed" ? `Points are in. Winners are told in the app at the end of Day 1 (${s.announceLabel}).`
        : s.stage === "announced" ? "The winners have been told in the app. Congratulations, and thank you for taking part!"
          : `Open now. Points count until ${s.cutoffLabel}. Winners are told at the end of Day 1.`;

  return (
    <>
      <Navbar />
      <main style={{ background: c.bg, color: c.text, minHeight: "100vh" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "clamp(88px, 12vw, 120px) 16px 72px" }}>
          <div style={{ display: "grid", gap: 28, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", alignItems: "center" }}>
            <figure style={{ margin: 0, borderRadius: 22, overflow: "hidden", border: `1px solid ${c.line}`, background: "#e9e7ee" }}>
              <img src={SWAG_PHOTO} alt={SWAG_ALT} width="1200" height="1016" decoding="async" style={{ display: "block", width: "100%", height: "auto" }} />
            </figure>
            <div>
              <p style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 999, background: c.chip, color: c.accent, fontSize: 13, fontWeight: 700, letterSpacing: 0.3 }}>
                <Gift size={15} aria-hidden="true" /> {s.title}
              </p>
              <h1 style={{ margin: "14px 0 0", fontSize: "clamp(32px, 6vw, 48px)", lineHeight: 1.08, fontWeight: 800, letterSpacing: -0.5 }}>Download the TTFC app to win</h1>
              <p style={{
                margin: "16px 0 0", display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 14,
                background: c.chip, border: `1px solid ${c.line}`, color: c.text, fontSize: 18, lineHeight: 1.4, fontWeight: 800,
              }}>
                <BadgeCheck size={22} aria-hidden="true" style={{ flex: "none", marginTop: 1, color: c.accent }} />
                <span>{s.pitch || "Only people using the TTFC app can win"}.</span>
              </p>
              <p style={{ margin: "14px 0 0", fontSize: 18, lineHeight: 1.55, color: c.mid }}>
                A TTFC backpack, bottle, mug, notebook, phone stand, umbrella and more. Download the app, sign in and earn points: the top {s.kits} on the leaderboard each win one.
              </p>
              {note && <p style={{ margin: "12px 0 0", fontSize: 15, fontWeight: 600, color: c.accent }}>{note}</p>}
              {!fromStoreApp && (
                <>
                  <p style={{ margin: "22px 0 10px", display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 800, color: c.text }}>
                    <Smartphone size={18} aria-hidden="true" style={{ color: c.accent }} /> Get the app
                  </p>
                  <StoreBadges where="swag" align="start" />
                </>
              )}
              <a href="#rules" style={{ display: "inline-flex", alignItems: "center", minHeight: 44, marginTop: 14, padding: "0 20px", borderRadius: 999, border: `1px solid ${c.line}`, color: c.text, fontSize: 15, fontWeight: 600, textDecoration: "none" }}>
                Read the rules
              </a>
              <p style={{ margin: "12px 0 0", fontSize: 13, color: c.mid }}>Free to enter for TTFC 2026 pass holders. Quebec residents excluded.</p>
            </div>
          </div>

          <section aria-labelledby="how-h" style={{ marginTop: 56 }}>
            <h2 id="how-h" style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>How to win</h2>
            <ol style={{ listStyle: "none", margin: "18px 0 0", padding: 0, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))" }}>
              {swagHowTo(s).map((line, i) => {
                const Icon = HOW_ICONS[i];
                return (
                  <li key={line} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: 18, borderRadius: 18, background: c.card, border: `1px solid ${c.line}` }}>
                    <span aria-hidden="true" style={{ flex: "none", width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: c.chip, color: c.accent }}><Icon size={20} /></span>
                    <span>
                      <b style={{ display: "block", fontSize: 13, color: c.accent, letterSpacing: 0.4, textTransform: "uppercase" }}>Step {i + 1}</b>
                      <span style={{ display: "block", marginTop: 4, fontSize: 16, lineHeight: 1.5 }}>{line}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>

          <section id="rules" aria-labelledby="rules-h" style={{ marginTop: 48, padding: "24px 22px", borderRadius: 20, background: c.card, border: `1px solid ${c.line}`, scrollMarginTop: 96 }}>
            <h2 id="rules-h" style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>The rules</h2>
            <p style={{ margin: "12px 0 0", fontSize: 16, lineHeight: 1.65, color: c.mid, whiteSpace: "pre-line" }}>{s.rules}</p>
            {/* Always shown, whatever staff write in the rules: the App Store requires it (guideline 5.3, Oct 23 2026). */}
            <p style={{ margin: "12px 0 0", fontSize: 16, lineHeight: 1.65, color: c.mid }}>
              This giveaway is run and sponsored by AtlasLink Markets Inc., the organiser of The Tech Festival Canada. {NOT_SPONSORS[detectOS()] || NOT_SPONSORS.other}
            </p>
            <p style={{ margin: "14px 0 0", fontSize: 14, color: c.mid }}>
              Questions? Email <a href="mailto:enquire@thetechfestival.com" style={{ color: c.accent, fontWeight: 600 }}>enquire@thetechfestival.com</a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
