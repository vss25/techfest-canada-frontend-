import React, { useEffect, useState } from "react";
import { urlFor } from "../utils/sanity";
import { citySlugOf, formatDateRange } from "../lib/events";
import Skyline, { SkylineSvg } from "./Skyline";

/* =========================================================
   The event hero (Phase 4, visually enriched): a full-screen
   cinematic frame in the spirit of the big festival sites —
   media edge to edge, a brand aurora wash over it, the city
   skyline silhouetted at the base with a violet backlight —
   and still ONLY three things written on it: the event name,
   date · venue, one sentence. No buttons, no app badges, no
   QR (the one-button rule: Tickets lives in the header).
   The video is a short silent loop; the hero image is its
   poster, the fallback for small screens and reduced-motion
   visitors, and gets a slow Ken Burns drift when it stands
   alone. An event with no media yet still opens on a rich
   aurora-gradient sky over its skyline — never a black box.
========================================================= */

const isDirectVideo = (u) => /\.(mp4|webm|mov)(\?|#|$)/i.test(String(u || ""));

const HERO_CSS = `
  .ev-hero { min-height: 100vh; min-height: 100svh; }
  .ev-hero-media { animation: ev-hero-fade 1.4s ease both; }
  @keyframes ev-hero-fade { from { opacity: 0; } to { opacity: 1; } }
  .ev-hero-aurora {
    background:
      radial-gradient(58% 46% at 18% 30%, rgba(127, 90, 240, 0.55), transparent 70%),
      radial-gradient(46% 38% at 82% 22%, rgba(232, 69, 139, 0.32), transparent 70%),
      radial-gradient(60% 50% at 62% 88%, rgba(245, 166, 35, 0.20), transparent 70%),
      linear-gradient(160deg, #150a33 0%, #0a0618 58%, #070313 100%);
  }
  @media (prefers-reduced-motion: no-preference) {
    .ev-kenburns { animation: ev-kenburns 28s ease-in-out infinite alternate; will-change: transform; }
    @keyframes ev-kenburns { from { transform: scale(1) translateY(0); } to { transform: scale(1.09) translateY(-1.2%); } }
    .ev-hero-aurora { animation: ev-aurora-drift 26s ease-in-out infinite alternate; }
    @keyframes ev-aurora-drift { from { transform: scale(1); } to { transform: scale(1.12) translateX(-1.5%); } }
    .ev-rise { animation: ev-rise 1.05s cubic-bezier(.215, .61, .355, 1) both; }
    .ev-rise-1 { animation-delay: .14s; }
    .ev-rise-2 { animation-delay: .30s; }
    @keyframes ev-rise { from { opacity: 0; transform: translateY(28px); filter: blur(10px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
  }
`;

export default function EventHero({ ev, headingAs = "h1" }) {
  const Heading = headingAs === "h2" ? "h2" : "h1";
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
  const citySlug = citySlugOf(ev.city);
  const hasMedia = Boolean(poster || (showVideo && video));

  return (
    <section aria-label={ev.name} className="ev-hero" style={{ position: "relative", display: "flex", alignItems: "flex-end", overflow: "hidden", background: "#0a0618", color: "#fff" }}>
      <style>{HERO_CSS}</style>

      {/* The media frame: video, poster (Ken Burns when it stands
          alone), or the brand aurora sky when neither exists yet. */}
      <div className="ev-hero-media" aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
        {poster && (
          <img src={poster} alt=""
            srcSet={[480, 960, 1440, 1920].map((w) => `${urlFor(ev.heroImage).width(w).quality(80).auto("format").url()} ${w}w`).join(", ")}
            sizes="100vw"
            className={showVideo && video ? undefined : "ev-kenburns"}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        {showVideo && video && (
          <video src={video} poster={poster || undefined} autoPlay muted loop playsInline
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        {!hasMedia && <div className="ev-hero-aurora" style={{ position: "absolute", inset: 0 }} />}
      </div>

      {/* Brand wash + legibility gradients: a violet aurora tint over
          the media, shade at the top for the header, and a deep base
          that melts into the page below. */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(58% 46% at 16% 26%, rgba(127,90,240,0.28), transparent 70%), radial-gradient(44% 36% at 84% 18%, rgba(232,69,139,0.16), transparent 70%)", pointerEvents: "none" }} />
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(5,2,14,0.52) 0%, transparent 26%, transparent 52%, rgba(5,2,14,0.55) 78%, rgba(7,3,19,0.97) 100%)", pointerEvents: "none" }} />

      {/* The skyline, anchored at the base: a violet backlight layer
          behind the near-black silhouette gives the city depth. */}
      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "min(32vh, 300px)", color: "rgba(127,90,240,0.38)", filter: "blur(5px)", pointerEvents: "none" }}>
        <SkylineSvg citySlug={citySlug} />
      </div>
      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "min(26vh, 240px)", color: "rgba(6,2,15,0.94)", pointerEvents: "none" }}>
        <Skyline ev={ev} citySlug={citySlug} />
      </div>

      <div style={{ position: "relative", width: "100%", maxWidth: 1200, margin: "0 auto", padding: "150px 20px 72px" }}>
        {where && (
          <p className="ev-rise" style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 9, padding: "8px 15px", borderRadius: 999, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.20)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", fontFamily: "'Orbitron', sans-serif", fontSize: "0.72rem", fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#f5c86e" }}>
            <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: "linear-gradient(135deg, #7a3fd1, #f5a623)", flexShrink: 0 }} />
            {where}
          </p>
        )}
        <Heading className="ev-rise ev-rise-1" style={{ margin: "20px 0 0", fontFamily: "'Orbitron', sans-serif", fontWeight: 900, lineHeight: 0.99, letterSpacing: "-0.01em", fontSize: "clamp(2.6rem, 8vw, 6.1rem)", maxWidth: 1020, textShadow: "0 6px 44px rgba(3,0,10,0.55)" }}>
          {ev.name}
        </Heading>
        {sentence && (
          <p className="ev-rise ev-rise-2" style={{ margin: "20px 0 0", fontSize: "clamp(1.05rem, 2.1vw, 1.35rem)", lineHeight: 1.55, color: "rgba(255,255,255,0.9)", maxWidth: 660, textShadow: "0 2px 18px rgba(3,0,10,0.5)" }}>
            {sentence}
          </p>
        )}
      </div>
    </section>
  );
}
