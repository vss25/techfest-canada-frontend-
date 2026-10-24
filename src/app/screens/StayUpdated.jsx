import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useStore } from "../lib/store";
import { content, refreshContent } from "../lib/content";
import { TopBar } from "../components/ui";
import { StayForm } from "../components/StaySignup";
import { heroParts, stayFrom } from "../../lib/stayUpdated";
import { journeyFrom } from "../../lib/stayJourney";
import JourneyView from "../../components/StayJourney";

/* =========================================================
   Stay updated (/app/stay-updated, Oct 23 2026): the TTFC 2027
   waitlist, the same page as thetechfestival.com/stay-updated in
   the web app's look: the hero, email + phone (both required), the
   three ticks and the consent line (the server's thank-you
   replaces the form), then the 2027 journey: the map of Canada and
   the stops (components/StayJourney.jsx, compact; stay.journey).
   The 5 × 5 programme and "What to expect" were removed on Oct 23
   2026; no attendee count on 2027 material. Same API (POST /api/stay-updated,
   source "webapp"), same staff-edited wording (stay.* app content
   keys, src/lib/stayUpdated.js; the form is components/
   StaySignup.jsx, also at the end of the Schedule). For everyone,
   guests and signed-out visitors included. Reached from Profile ›
   Settings, the guest Profile and Home's "Stay updated for TTFC
   2027" card (/stay-updated#wl-join lands on the form). No store
   badges here. In the demo nothing is sent (an in-app answer only).
========================================================= */

export default function StayUpdated() {
  const c = useStore(content);
  const { hash } = useLocation();
  useEffect(() => { refreshContent(); }, []);
  // From Home's card (#wl-join): straight to the form, once the screen has its height.
  useEffect(() => {
    if (hash !== "#wl-join") return undefined;
    const f = requestAnimationFrame(() => document.getElementById("wl-join")?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(f);
  }, [hash]);
  const copy = stayFrom(c.values);
  const hero = heroParts(copy["stay.hero_title"]);
  const stops = journeyFrom(copy["stay.journey"]);

  return (
    <div className="page">
      <TopBar title={copy["stay.eyebrow"]} />
      <main id="main" className="pad stack-lg" style={{ paddingTop: 16, paddingBottom: 32 }}>
        <section className="card wl-hero" aria-labelledby="wl-hero-h">
          <h2 id="wl-hero-h" className="wl-hero-title">
            <span className="wl-hero-lead">{hero.lead}</span>
            {hero.rest.length > 0 && <span className="wl-hero-rest">{hero.rest.map((p, i) => <span key={i}><span className="sr-only"> · </span>{p}</span>)}</span>}
          </h2>
          <p className="wl-hero-intro">{copy["stay.hero_intro"]}</p>
          <a href="#wl-join" className="btn btn-primary pressable wl-hero-btn" onClick={(e) => { e.preventDefault(); document.getElementById("wl-join")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>{copy["stay.button"]}</a>
        </section>

        {/* The form straight after the hero (the organiser, Oct 23 2026: "Bring the contact form up"). */}
        <div id="wl-join" style={{ scrollMarginTop: 72 }}>
          <StayForm copy={copy} />
        </div>

        {/* The 2027 journey (the organiser, Oct 23 2026): the map of Canada and the stops, in order. */}
        <section className="stack-sm" aria-labelledby="wl-journey-h">
          <h2 id="wl-journey-h" className="eyebrow">{copy["stay.journey_title"]}</h2>
          {copy["stay.journey_intro"] && <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>{copy["stay.journey_intro"]}</p>}
          <div className="wl-journey">
            <JourneyView stops={stops} compact mapTitle={`Map of Canada: ${copy["stay.journey_title"]}`} />
          </div>
        </section>
      </main>
    </div>
  );
}
