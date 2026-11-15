import React from "react";
import WaitlistForm from "./WaitlistForm";
import useSiteSettings from "../hooks/useSiteSettings";
import { stayFrom } from "../lib/stayUpdated";

/* =========================================================
   The pricing presentation while an event's pricing is NOT
   announced (Vishwa, 2026-11-14 — plan §10): no numbers, no
   tiers, no packages anywhere. Just the word that pricing
   will be announced soon, an invitation to check back, and
   the site's existing Stay Updated form (components/
   WaitlistForm.jsx, the same form as /stay-updated) so the
   visitor can leave an email to be kept updated. The form's
   `source` tags where the signup came from — here, the event.
========================================================= */

const SU_VARS = {
  "--su-text": "#ffffff",
  "--su-mid": "rgba(225,215,255,0.82)",
  "--su-dim": "rgba(200,185,255,0.6)",
  "--su-card": "rgba(255,255,255,0.045)",
  "--su-line": "rgba(155,135,245,0.25)",
  "--su-accent": "#c4adff",
  "--su-chip": "rgba(155,135,245,0.16)",
  "--su-input": "rgba(255,255,255,0.06)",
  "--su-err": "#ff9b9b",
};

export default function AnnouncedSoon({ eventKey, source, title, message }) {
  const settings = useSiteSettings();
  const copy = stayFrom(settings);
  const tag = source || (eventKey ? `event:${eventKey}` : "website");
  return (
    <div style={{ ...SU_VARS, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(155,135,245,0.22)", borderRadius: 24, padding: "clamp(22px, 4vw, 40px)" }}>
      <h3 style={{ margin: 0, fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(1.15rem, 2.6vw, 1.5rem)", fontWeight: 800, color: "#fff" }}>
        {title || "Pricing announced soon"}
      </h3>
      <p style={{ margin: "10px 0 0", fontSize: "1rem", lineHeight: 1.65, color: "rgba(225,215,255,0.82)", maxWidth: 640 }}>
        {message || "Pricing for this event will be announced soon — check back here, or leave your email below and we'll let you know the moment it's live."}
      </p>
      <WaitlistForm copy={copy} source={tag} />
    </div>
  );
}
