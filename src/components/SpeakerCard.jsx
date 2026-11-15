import React from "react";
import { Link } from "react-router-dom";
import { urlFor } from "../utils/sanity";
import { speakerSlug } from "../seo/slug";

/* =========================================================
   The Phase 4 speaker card (§8): the SHORT bio (never the
   long one), the headshot cropped square from its hotspot,
   real alt text, responsive sizes, lazy below the fold.
========================================================= */

export function speakerPhoto(image, w, h) {
  if (!image?.asset) return null;
  return urlFor(image).width(w).height(h || w).fit("crop").quality(80).auto("format").url();
}

export default function SpeakerCard({ speaker, to }) {
  const src = speakerPhoto(speaker.image, 480);
  const srcSet = [240, 480, 720].map((w) => `${speakerPhoto(speaker.image, w)} ${w}w`).join(", ");
  const body = (
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
        {(speaker.shortBio || speaker.bio) && (
          <p style={{ margin: "10px 0 0", fontSize: "0.88rem", lineHeight: 1.55, opacity: 0.85 }}>
            {speaker.shortBio || speaker.bio}
          </p>
        )}
      </div>
    </>
  );
  const style = { display: "block", borderRadius: 18, overflow: "hidden", background: "rgba(127,90,240,0.07)", border: "1px solid rgba(127,90,240,0.16)", color: "inherit", textDecoration: "none" };
  return to ? (
    <Link to={to} style={style} aria-label={`${speaker.name} — speaker profile`}>{body}</Link>
  ) : (
    <article style={style}>{body}</article>
  );
}

export const speakerPathIn = (basePath, speaker) => `${basePath}/speakers/${speakerSlug(speaker.name)}`;
