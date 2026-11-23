import React from "react";
import { Link } from "react-router-dom";
import "./brand.css";
import useSiteSettings, { safeUrl } from "../hooks/useSiteSettings";
import { openCookieSettings } from "../lib/trackers";
import StoreBadges from "../components/StoreBadges";
import { compareEvents, eventPath, useEvents } from "../lib/events";

/* The approved footer (redesign step 2): navy, four columns, the 2027 events listed from
   the event records, contact inboxes, social links from Website switches.
   The link columns are <div role="navigation">, not <nav>: the old global stylesheet turns
   every bare <nav> into an 80px sticky bar, which stacked the columns on top of each other
   on phones and iPads (mobile audit, Nov 23 2026). */

const DEFAULT_SOCIAL = {
  linkedin: "https://www.linkedin.com/company/thetechfestival/",
  x: "https://x.com/thetechfestival",
  instagram: "https://www.instagram.com/thetechfestival",
};

const GET_INVOLVED = [
  ["Partner with us", "/sponsor"], ["Exhibit", "/exhibit"], ["Speak", "/contact"],
  ["Volunteer", "/volunteer"], ["Media", "/media"], ["Stay updated", "/stay-updated"],
];
const ABOUT = [
  ["About TTFC", "/about"], ["Partners", "/partners"], ["Catalyst Awards", "/awards"],
  ["Toronto 2026 highlights", "/highlights/2026"], ["Contact", "/contact"],
];

export default function BrandFooter() {
  const site = useSiteSettings();
  const { events } = useEvents();
  const upcoming = (events || []).filter((e) => Number(e.year) >= 2027).sort(compareEvents).slice(0, 6);
  const social = [
    ["LinkedIn", safeUrl(site["site.linkedin_url"]) || DEFAULT_SOCIAL.linkedin],
    ["Instagram", safeUrl(site["site.instagram_url"]) || DEFAULT_SOCIAL.instagram],
    ["X", safeUrl(site["site.x_url"]) || DEFAULT_SOCIAL.x],
  ];
  const col = { display: "grid", gap: 10, alignContent: "start" };
  const head = { fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#F5A623", margin: 0 };
  const link = { color: "rgba(255,255,255,0.82)", textDecoration: "none", fontSize: 14 };
  return (
    <footer className="tb" style={{ background: "#151035", color: "#fff", textAlign: "left" }}>
      <div className="tb-wrap" style={{ paddingBlock: "48px 28px", display: "grid", gap: 36 }}>
        <div className="tb-foot-grid">
          <div style={col}>
            <img src="/Tech_Festival_Canada_Logo_Dark_Transparent.webp" alt="The Tech Festival Canada" style={{ height: 56, width: "auto" }} />
            <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", fontSize: 14, maxWidth: "34ch" }}>
              Canada's technology decision-makers, in one room. Briefings across five cities and the Toronto Main Event.
            </p>
            <StoreBadges where="footer" size="sm" />
          </div>
          <div role="navigation" aria-label="2027 events" style={col}>
            <p style={head}>2027 events</p>
            {upcoming.map((e) => <Link key={e._id} to={eventPath(e)} style={link}>{e.name}</Link>)}
          </div>
          <div role="navigation" aria-label="Get involved" style={col}>
            <p style={head}>Get involved</p>
            {GET_INVOLVED.map(([l, to]) => <Link key={to} to={to} style={link}>{l}</Link>)}
          </div>
          <div role="navigation" aria-label="About" style={col}>
            <p style={head}>About</p>
            {ABOUT.map(([l, to]) => <Link key={to} to={to} style={link}>{l}</Link>)}
          </div>
          <div style={col}>
            <p style={head}>Contact</p>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.82)" }}>General: <b style={{ color: "#fff", fontWeight: 600 }}>enquire@thetechfestival.com</b></span>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.82)" }}>Sponsorship: <b style={{ color: "#fff", fontWeight: 600 }}>sales@thetechfestival.com</b></span>
            <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
              {social.map(([l, href]) => <a key={l} href={href} target="_blank" rel="noreferrer" style={{ ...link, fontWeight: 600 }}>{l}</a>)}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 22px", paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.14)", fontSize: 13, color: "rgba(255,255,255,0.65)" }}>
          <span>© {new Date().getFullYear()} The Tech Festival Canada</span>
          <Link to="/privacy" style={{ color: "inherit" }}>Privacy Policy</Link>
          <button type="button" onClick={openCookieSettings} style={{ background: "none", border: 0, padding: 0, color: "inherit", font: "inherit", textDecoration: "underline", cursor: "pointer" }}>Cookie settings</button>
        </div>
      </div>
    </footer>
  );
}
