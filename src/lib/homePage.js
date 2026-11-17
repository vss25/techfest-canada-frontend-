import { useEffect, useState } from "react";
import { client } from "../utils/sanity";

/* The home page's content (redesign step 2): one Sanity document, id "homePage", edited in
   Admin › Content › Home page (draft → preview → publish). Every field falls back to the
   wording below, so the page is complete before anyone edits it. Featured partners are the
   "featured" row of the Partners page. Reads go through the preview-aware client. */

export const HOME_DEFAULTS = {
  heroEyebrow: "The Tech Festival Canada · 2027 season",
  heroHeadline: "Canada's technology decision-makers, in one room",
  heroText: "Briefings in five cities and the Toronto Main Event. Real deployments, real buyers, and the partnerships that follow.",
  primaryCtaLabel: "Get Vancouver tickets",
  primaryCtaUrl: "/vancouver/2027/briefing",
  secondaryCtaLabel: "Partner with us",
  secondaryCtaUrl: "/sponsor",
  eventsHeading: "2027 events",
  eventsText: "Six events across the country. Vancouver opens the season in February.",
  highlightsHeading: "Toronto 2026, in numbers",
  highlightsText: "Two days at The Westin Harbour Castle with the people building, buying and regulating Canadian technology.",
  stats: [
    { value: 1000, suffix: "+", label: "attendees" },
    { value: 95, label: "speakers" },
    { value: 50, label: "sessions" },
    { value: 13, label: "Catalyst Award winners" },
  ],
  reportTitle: "Toronto 2026 post-show report",
  reportText: "Who came, what they talked about and what happened next.",
  reportUrl: "/highlights/2026",
  partnersHeading: "Partners who make it happen",
  partnerCtaHeading: "Put your brand in the room",
  partnerCtaText: "Sponsorship, demo pods and speaking slots across the 2027 season. Write to sales@thetechfestival.com.",
};

const FIELDS = `heroEyebrow, heroHeadline, heroText, heroImage, heroVideoUrl, primaryCtaLabel, primaryCtaUrl,
  secondaryCtaLabel, secondaryCtaUrl, eventsHeading, eventsText, highlightsHeading, highlightsText, stats,
  highlightPhotos, recapVideoUrl, reportTitle, reportText, reportUrl, partnersHeading, partnerCtaHeading, partnerCtaText`;

export function useHomePage() {
  const [state, setState] = useState({ home: HOME_DEFAULTS, partners: [], loading: true });
  useEffect(() => {
    let live = true;
    Promise.all([
      client.fetch(`*[_id == "homePage"][0]{ ${FIELDS} }`).catch(() => null),
      client.fetch(`*[_type == "partner" && matrixGroup == "featured" && active != false && showOnWebsite != false]{ _id, name, logo, url, logoScale } | order(order asc)`).catch(() => []),
    ]).then(([doc, partners]) => {
      if (!live) return;
      const home = { ...HOME_DEFAULTS };
      for (const [k, v] of Object.entries(doc || {})) if (v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && !v.length)) home[k] = v;
      setState({ home, partners: partners || [], loading: false });
    });
    return () => { live = false; };
  }, []);
  return state;
}
