import { useEffect, useRef, useState } from "react";

/* =========================================================
   The media box of an event page's "Why come" section (Nov 25 2026): the approved design's box (16 px corners, the
   navy fill, beside the text, full width once it wraps) holding the event's photo, GIF or silent video loop, sized
   and framed as set in Admin › Event pages (src/lib/whyCome.js resolves it). Used by the website and by the
   admin's live preview, so both look the same.
   A video costs nothing until it's near the screen: the poster shows first; the video is requested only when the
   box is about to scroll into view, never with data saver or reduced motion on, and it pauses when scrolled away
   or the tab is hidden.
========================================================= */

function stillOnly() {
  if (typeof window === "undefined") return true;
  try {
    if (navigator.connection?.saveData) return true;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return true;
  } catch { /* old browser: play */ }
  return false;
}

const fill = (fit, position) => ({
  position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: fit, objectPosition: position, borderRadius: "inherit",
});

export default function WhyComeBox({ why, eager = false, style }) {
  const { media, fit, position, boxHeight, loop } = why;
  const boxRef = useRef(null);
  const videoRef = useRef(null);
  // Near the screen (or no way to tell): the video may load. Without IntersectionObserver it loads at once.
  const [near, setNear] = useState(() => eager || typeof window === "undefined" || !("IntersectionObserver" in window));
  const [playing, setPlaying] = useState(false);
  const isVideo = media.kind === "video";

  // Request the video only when the box is near the screen.
  useEffect(() => {
    if (!isVideo || near || stillOnly()) return undefined;
    const el = boxRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect(); } }, { rootMargin: "300px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [isVideo, near]);

  // Pause off screen and in a hidden tab.
  useEffect(() => {
    const v = videoRef.current;
    if (!near || !v) return undefined;
    let visible = true;
    const sync = () => { if (visible && !document.hidden) v.play().catch(() => {}); else v.pause(); };
    const io = "IntersectionObserver" in window ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, { threshold: 0.05 }) : null;
    io?.observe(v);
    document.addEventListener("visibilitychange", sync);
    return () => { io?.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, [near, media.src]);

  const showVideo = isVideo && near && !stillOnly();
  const still = isVideo ? media.poster : media.src;
  return (
    <div ref={boxRef} style={{ flex: "1 1 420px", height: boxHeight, borderRadius: "16px", background: "#2A2357", position: "relative", overflow: "hidden", ...style }}>
      {still && (
        <img src={still} alt={isVideo ? "" : media.alt} aria-hidden={isVideo ? "true" : undefined} loading={eager ? "eager" : "lazy"} decoding="async"
          style={{ ...fill(fit, position), opacity: showVideo && playing ? 0 : 1, transition: "opacity .5s ease" }} />
      )}
      {showVideo && (
        <video ref={videoRef} key={media.src} src={media.src} poster={media.poster || undefined} muted autoPlay playsInline loop={loop}
          disablePictureInPicture preload="auto" aria-hidden="true" tabIndex={-1}
          onPlaying={() => setPlaying(true)} onError={() => setPlaying(false)}
          style={{ ...fill(fit, position), opacity: playing ? 1 : 0, transition: "opacity .5s ease", pointerEvents: "none" }} />
      )}
    </div>
  );
}

/** The section's body: one paragraph per block, in the design's type. */
export function WhyComeBody({ why }) {
  return why.body.map((p, i) => (
    <p key={i} style={{ margin: 0, fontSize: "18px", lineHeight: "29px", color: "#3F3F46" }}>{p}</p>
  ));
}
