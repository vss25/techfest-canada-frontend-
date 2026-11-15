import React, { useEffect, useState } from "react";
import { urlFor } from "../utils/sanity";
import { citySlugOf, formatDateRange } from "../lib/events";
import Skyline from "./Skyline";

/* =========================================================
   The event hero (Phase 4): full-width video, the city made
   unmistakable, and ONLY three things written on it — the
   event name, date · venue, one sentence. No buttons, no app
   badges, no QR (the one-button rule: Tickets lives in the
   header). The video is a short silent loop; the hero image
   is its poster and the fallback for small screens and
   reduced-motion visitors.
========================================================= */

const isDirectVideo = (u) => /\.(mp4|webm|mov)(\?|#|$)/i.test(String(u || ""));

export default function EventHero({ ev }) {
  const [showVideo, setShowVideo] = useState(false);
  const poster = ev?.heroImage?.asset ? urlFor(ev.heroImage).width(1920).quality(80).auto("format").url() : null;
  const video = isDirectVideo(ev?.heroVideoUrl) ? ev.heroVideoUrl : null;

  // Preload only the poster (Phase 5 basics): it is the first paint.
  useEffect(() => {
    if (!poster) return undefined;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = poster;
    document.head.appendChild(link);
    return () => { link.remove(); };
  }, [poster]);

  useEffect(() => {
    if (!video) { setShowVideo(false); return; }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setShowVideo(!reduced && window.innerWidth >= 640);
  }, [video]);

  if (!ev) return null;
  const sentence = String(ev.description || "").split(/(?<=[.!?])\s/)[0] || "";
  const where = [formatDateRange(ev), ev.venueName].filter(Boolean).join(" · ");

  return (
    <section aria-label={ev.name} style={{ position: "relative", minHeight: "min(88vh, 760px)", display: "flex", alignItems: "flex-end", overflow: "hidden", background: "#0a0618", color: "#fff" }}>
      {poster && (
        <img src={poster} alt="" aria-hidden="true"
          srcSet={[480, 960, 1440, 1920].map((w) => `${urlFor(ev.heroImage).width(w).quality(80).auto("format").url()} ${w}w`).join(", ")}
          sizes="100vw"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      )}
      {showVideo && video && (
        <video src={video} poster={poster || undefined} autoPlay muted loop playsInline aria-hidden="true"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      )}
      {/* Legibility gradient + the skyline anchored at the base. */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,2,14,0.88) 0%, rgba(5,2,14,0.35) 45%, rgba(5,2,14,0.25) 100%)" }} />
      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "min(24vh, 210px)", color: "rgba(8,3,20,0.85)", pointerEvents: "none" }}>
        <Skyline ev={ev} citySlug={citySlugOf(ev.city)} />
      </div>

      <div style={{ position: "relative", width: "100%", maxWidth: 1200, margin: "0 auto", padding: "120px 20px 56px" }}>
        <p style={{ margin: 0, fontFamily: "'Orbitron', sans-serif", fontSize: "0.72rem", fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#f5c86e" }}>
          {where}
        </p>
        <h1 style={{ margin: "14px 0 0", fontFamily: "'Orbitron', sans-serif", fontWeight: 900, lineHeight: 1.04, fontSize: "clamp(2.2rem, 6.5vw, 4.4rem)", maxWidth: 900 }}>
          {ev.name}
        </h1>
        {sentence && (
          <p style={{ margin: "16px 0 0", fontSize: "clamp(1rem, 2vw, 1.2rem)", lineHeight: 1.55, color: "rgba(255,255,255,0.88)", maxWidth: 640 }}>
            {sentence}
          </p>
        )}
      </div>
    </section>
  );
}
