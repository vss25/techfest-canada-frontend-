import { useEffect, useRef, useState } from "react";
import { heroStillOnly, heroVideoSrc } from "../lib/siteFiles";

/* =========================================================
   An event's hero video (Nov 24 2026), laid over the city photo and sized exactly like it (absolute, inset 0,
   object-fit: cover, the photo's focal point), so it fills the hero at any screen size. Kept cheap:
   - Data saver and reduced motion never request it (heroStillOnly): they keep the photo. Phones and tablets play
     it only when staff chose "Video" for the event (anyDevice), otherwise they keep the photo too.
   - It's requested only after the page has loaded (the photo is the first paint), and fades in once it plays.
   - It pauses when scrolled away or the tab is hidden, and plays again when it's back.
   - One small file (≤ 1080p, ≤ 20 s, silent: admin cms/heroVideoPrep.js) from Sanity's CDN, cached by browsers.
========================================================= */

export default function HeroBackgroundVideo({ src, position = "center", anyDevice = false, onPlaying }) {
  const url = heroVideoSrc(src);
  const ref = useRef(null);
  const [ready, setReady] = useState(false);   // allowed and the page has loaded: render the <video>
  const [playing, setPlaying] = useState(false);

  // Give it key={src}: a new video is a new component, so nothing here resets by hand.
  useEffect(() => {
    if (!url || heroStillOnly({ anyDevice })) return undefined;
    let cancelled = false;
    let idle = 0;
    const go = () => {
      const start = () => { if (!cancelled) setReady(true); };
      if ("requestIdleCallback" in window) idle = window.requestIdleCallback(start, { timeout: 2000 });
      else idle = window.setTimeout(start, 300);
    };
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", go);
      if ("cancelIdleCallback" in window) window.cancelIdleCallback(idle);
      window.clearTimeout(idle);
    };
  }, [url, anyDevice]);

  // Pause off screen and in a hidden tab.
  useEffect(() => {
    const v = ref.current;
    if (!ready || !v) return undefined;
    let visible = true;
    const sync = () => {
      if (visible && !document.hidden) v.play().catch(() => {});
      else v.pause();
    };
    const io = "IntersectionObserver" in window
      ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, { threshold: 0.05 })
      : null;
    io?.observe(v);
    document.addEventListener("visibilitychange", sync);
    return () => { io?.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, [ready]);

  if (!ready) return null;
  return (
    <video
      ref={ref}
      src={url}
      muted
      loop
      autoPlay
      playsInline
      disablePictureInPicture
      preload="auto"
      aria-hidden="true"
      tabIndex={-1}
      onPlaying={() => { setPlaying(true); onPlaying?.(); }}
      onError={() => setReady(false)}
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: position,
        opacity: playing ? 1 : 0, transition: "opacity .8s ease", pointerEvents: "none",
      }}
    />
  );
}
