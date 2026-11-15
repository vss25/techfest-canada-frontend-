import React from "react";
import { Link } from "react-router-dom";
import { urlFor } from "../utils/sanity";
import { speakerSlug } from "../seo/slug";
import { decodeEntities } from "../utils/decodeEntities";

/* =========================================================
   The Phase 4 speaker card (§8): photo, name, title · company
   and ONE short line — the short bio when there is one, else a
   brief excerpt of the long bio — clamped to a few lines so
   cards stay even. The full bio lives on the speaker's own
   profile page only, never on a card. A LinkedIn button sits
   in the card footer, the way the site's own speakers page
   presents it. The headshot is cropped square from its
   hotspot, with real alt text and responsive sizes.
========================================================= */

export function speakerPhoto(image, w, h) {
  if (!image?.asset) return null;
  return urlFor(image).width(w).height(h || w).fit("crop").quality(80).auto("format").url();
}

const LinkedInIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

/** The card's one short line: the short bio when there is one,
    else a brief excerpt of the long bio — its first sentence,
    capped — never the whole bio. */
function cardLine(speaker) {
  const short = decodeEntities(speaker?.shortBio || "").trim();
  if (short) return short;
  const bio = decodeEntities(speaker?.bio || "").trim();
  if (!bio) return "";
  const first = bio.split(/(?<=[.!?])\s/)[0] || bio;
  return first.length > 180 ? `${first.slice(0, 177).trimEnd()}…` : first;
}

const clamp3 = {
  display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
};

export default function SpeakerCard({ speaker, to }) {
  const src = speakerPhoto(speaker.image, 480);
  const srcSet = [240, 480, 720].map((w) => `${speakerPhoto(speaker.image, w)} ${w}w`).join(", ");
  const line = cardLine(speaker);
  const main = (
    <>
      {src ? (
        <img src={src} srcSet={srcSet} sizes="(max-width: 640px) 45vw, 240px" alt={speaker.image?.alt || speaker.name}
          loading="lazy" width={480} height={480}
          style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block", background: "rgba(122,63,209,0.12)" }} />
      ) : (
        <div aria-hidden="true" style={{ width: "100%", aspectRatio: "1 / 1", background: "rgba(122,63,209,0.12)" }} />
      )}
      <div style={{ padding: "14px 16px 18px" }}>
        <div style={{ fontWeight: 800, fontSize: "1rem", lineHeight: 1.25 }}>{speaker.name}</div>
        <div style={{ marginTop: 3, fontSize: "0.85rem", opacity: 0.75 }}>
          {[speaker.title, speaker.company].filter(Boolean).join(" · ")}
        </div>
        {line && (
          <p style={{ margin: "10px 0 0", fontSize: "0.88rem", lineHeight: 1.55, opacity: 0.85, ...clamp3 }}>
            {line}
          </p>
        )}
      </div>
    </>
  );
  const cardStyle = {
    display: "flex", flexDirection: "column", height: "100%", borderRadius: 18, overflow: "hidden",
    background: "rgba(127,90,240,0.07)", border: "1px solid rgba(127,90,240,0.16)", color: "inherit",
  };
  return (
    <article style={cardStyle}>
      {to ? (
        <Link to={to} style={{ display: "block", color: "inherit", textDecoration: "none" }} aria-label={`${speaker.name} — speaker profile`}>{main}</Link>
      ) : main}
      {speaker.linkedin && (
        <div style={{ padding: "0 16px 16px", marginTop: "auto" }}>
          <a href={speaker.linkedin} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "9px 0", borderRadius: 8, background: "#0A66C2", color: "#fff", fontFamily: "'Orbitron', sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.06em", textDecoration: "none", textTransform: "uppercase", boxSizing: "border-box" }}>
            <LinkedInIcon /> View on LinkedIn
          </a>
        </div>
      )}
    </article>
  );
}

export const speakerPathIn = (basePath, speaker) => `${basePath}/speakers/${speakerSlug(speaker.name)}`;
