import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowDown } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import JourneyView from "../components/StayJourney";
import WaitlistForm from "../components/WaitlistForm";
import useSiteSettings from "../hooks/useSiteSettings";
import useSeo from "../hooks/useSeo";
import { goToWaitlistForm, heroParts, sourceFrom, stayFrom } from "../lib/stayUpdated";
import { journeyFrom } from "../lib/stayJourney";

/* =========================================================
   /stay-updated: the TTFC 2027 waitlist (Oct 23 2026).
   The organiser: "Stay-updated to have preview of 2027 events and
   an bar to add the email and join the waitlist to attend. Also
   tickmark on sponsorship, exhibitor or delegation interest."
   No invented facts: the hero ("TTFC 2027 · Toronto · November
   2027"), the waitlist bar right under it (email + phone, both
   required, three ticks, the consent line, an in-place thank-you
   with the server's message), then the 2027 journey (the
   organiser, Oct 23 2026: "Put canada's map and show cities to
   show the journey"): a map of Canada with the stops in order and
   the list of stops (components/StayJourney.jsx; the stops are the
   stay.journey key, edited in Admin › Sales & emails › 2027
   waitlist › 2027 journey). The 5 × 5 programme and "What to
   expect" were removed the same day; no attendee count on 2027
   material. Every word is a stay.* app content key (… › Wording),
   with the defaults in src/lib/stayUpdated.js. ?source=ios|android|
   webapp (links from the apps) is sent with the form. No store
   badges on this page. Light and dark like the rest of the site.
   The web app has the same page at /app/stay-updated. The form
   itself is components/WaitlistForm.jsx (Oct 24 2026), shared
   with the "Stay updated for TTFC 2027" section of /programme.
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

export default function StayUpdated() {
  const settings = useSiteSettings();
  const copy = stayFrom(settings);
  const dark = useDarkMode();
  const { search, hash } = useLocation();
  // Arriving from the footer button (/stay-updated#join): straight to the form, after the page has rendered.
  useEffect(() => {
    if (hash !== "#join") return undefined;
    const id = setTimeout(goToWaitlistForm, 60);
    return () => clearTimeout(id);
  }, [hash]);
  const source = sourceFrom(search);
  useSeo(copy["stay.seo_title"], copy["stay.seo_description"]);

  const hero = heroParts(copy["stay.hero_title"]);
  const stops = journeyFrom(copy["stay.journey"]);

  const t = dark
    ? { bg: "#06020f", bg2: "#0b0518", text: "#ffffff", mid: "rgba(225,215,255,0.8)", dim: "rgba(200,185,255,0.6)", card: "rgba(255,255,255,0.045)", line: "rgba(155,135,245,0.2)", accent: "#c4adff", chip: "rgba(155,135,245,0.16)", input: "rgba(255,255,255,0.06)", err: "#ff9b9b", skyline: 0.16 }
    : { bg: "#faf9ff", bg2: "#f2eefc", text: "#0d0520", mid: "rgba(13,5,32,0.72)", dim: "rgba(13,5,32,0.55)", card: "#ffffff", line: "rgba(122,63,209,0.16)", accent: "#6a2fc4", chip: "rgba(122,63,209,0.09)", input: "#ffffff", err: "#b42318", skyline: 0.22 };
  // The journey's map and list (components/StayJourney.jsx): the land in a soft brand tint, opaque labels.
  const journeyVars = {
    "--jv-text": t.text, "--jv-mid": t.mid, "--jv-card": dark ? "#0f0820" : "#ffffff", "--jv-line": t.line, "--jv-accent": t.accent, "--jv-chip": t.chip,
    "--jv-land": dark ? "rgba(155,135,245,0.2)" : "rgba(122,63,209,0.09)", "--jv-land-edge": dark ? "rgba(196,173,255,0.45)" : "rgba(122,63,209,0.3)",
    "--jv-route": dark ? "#c4adff" : "#6a2fc4", "--jv-label-bg": dark ? "#150b2c" : "#ffffff",
  };

  return (
    <>
      <Navbar />
      <main className="su" style={{
        "--su-bg": t.bg, "--su-bg2": t.bg2, "--su-text": t.text, "--su-mid": t.mid, "--su-dim": t.dim, "--su-card": t.card, "--su-line": t.line,
        "--su-accent": t.accent, "--su-chip": t.chip, "--su-input": t.input, "--su-err": t.err,
      }}>
        <style>{`
          .su { background: var(--su-bg); color: var(--su-text); min-height: 100vh; overflow-x: hidden; overflow-x: clip; }
          .su-wrap { max-width: 1080px; margin: 0 auto; padding: 0 16px; }
          .su-hero { position: relative; padding: clamp(100px, 12vw, 132px) 0 clamp(56px, 7vw, 88px); text-align: center; isolation: isolate; }
          .su-hero::before { content: ""; position: absolute; inset: 0; z-index: -2;
            background: radial-gradient(ellipse 70% 55% at 50% 0%, rgba(122,63,209,${dark ? 0.35 : 0.16}) 0%, transparent 70%),
                        radial-gradient(ellipse 45% 35% at 85% 30%, rgba(245,166,35,${dark ? 0.16 : 0.12}) 0%, transparent 70%); }
          .su-skyline { position: absolute; left: 0; right: 0; bottom: 0; height: min(22vw, 190px); z-index: -1; pointer-events: none;
            background: url(/toronto-skyline.png) center bottom / cover no-repeat; opacity: ${t.skyline};
            ${dark ? "filter: invert(1) brightness(0.9);" : "mix-blend-mode: multiply;"}
            -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 55%, #000 75%, transparent 100%);
                    mask-image: linear-gradient(to bottom, transparent 0%, #000 55%, #000 75%, transparent 100%); }
          .su-chip { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 999px; background: var(--su-chip); color: var(--su-accent);
            font-size: 13px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; }
          .su-h1 { margin: 18px 0 0; font-family: 'Orbitron', sans-serif; font-weight: 900; line-height: 1.05; letter-spacing: -0.5px; }
          .su-h1-lead { display: block; font-size: clamp(44px, 9vw, 92px);
            background: linear-gradient(135deg, #7a3fd1 10%, #d9468f 55%, #f5a623 95%); -webkit-background-clip: text; background-clip: text; color: transparent; }
          .su-h1-rest { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 20px; font-family: inherit; }
          .su-h1-rest > span { display: inline-flex; align-items: center; min-height: 40px; padding: 0 18px; border-radius: 999px; border: 1px solid var(--su-line);
            background: var(--su-card); font-size: clamp(13px, 2vw, 17px); font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; color: var(--su-text); }
          .su-intro { max-width: 640px; margin: 22px auto 0; font-size: clamp(16px, 2.1vw, 19px); line-height: 1.6; color: var(--su-mid); }
          .su-hero-cta { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 12px 18px; margin-top: 30px; }
          .su-sec { padding: clamp(48px, 7vw, 80px) 0; }
          .su-sec--alt { background: var(--su-bg2); }
          .su-h2 { margin: 0; font-family: 'Orbitron', sans-serif; font-size: clamp(24px, 3.6vw, 34px); font-weight: 800; line-height: 1.15; }
          .su-journey { margin-top: 28px; }
          .su-join { position: relative; border-radius: 26px; padding: clamp(24px, 4vw, 40px); background: var(--su-card); border: 1px solid var(--su-line);
            box-shadow: 0 24px 60px rgba(122,63,209,${dark ? 0.22 : 0.12}); overflow: hidden; }
          .su-join::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 4px; background: linear-gradient(90deg, #7a3fd1 0 40%, #d9468f 40% 75%, #f5a623 75% 100%); }
        `}</style>

        <section className="su-hero" aria-labelledby="su-h1">
          <div className="su-skyline" aria-hidden="true" />
          <div className="su-wrap">
            <p className="su-chip" style={{ margin: 0 }}>{copy["stay.eyebrow"]}</p>
            <h1 id="su-h1" className="su-h1">
              <span className="su-h1-lead">{hero.lead}</span>
              {hero.rest.length > 0 && (
                <span className="su-h1-rest">
                  {hero.rest.map((p, i) => <span key={i}><span className="su-sr"> · </span>{p}</span>)}
                </span>
              )}
            </h1>
            <p className="su-intro">{copy["stay.hero_intro"]}</p>
            <div className="su-hero-cta">
              <a href="#join" className="su-btn su-cta">{copy["stay.button"]} <ArrowDown size={16} aria-hidden="true" /></a>
            </div>
          </div>
        </section>

        {/* The form straight after the hero (the organiser, Oct 23 2026: "Bring the contact form up"). */}
        <section id="join" className="su-sec su-sec--alt" aria-labelledby="su-join" style={{ scrollMarginTop: 80, paddingTop: "clamp(24px, 4vw, 40px)" }}>
          <div className="su-wrap">
            <div className="su-join">
              <h2 id="su-join" className="su-h2">{copy["stay.form_title"]}</h2>
              <WaitlistForm copy={copy} source={source} />
            </div>
          </div>
        </section>

        {/* The 2027 journey (the organiser, Oct 23 2026): the map of Canada and the stops, in order. */}
        <section className="su-sec" aria-labelledby="su-journey">
          <div className="su-wrap">
            <h2 id="su-journey" className="su-h2">{copy["stay.journey_title"]}</h2>
            {copy["stay.journey_intro"] && <p className="su-lede">{copy["stay.journey_intro"]}</p>}
            <div className="su-journey" style={journeyVars}>
              <JourneyView stops={stops} mapTitle={`Map of Canada: ${copy["stay.journey_title"]}`} />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
