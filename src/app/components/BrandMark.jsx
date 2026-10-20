import { useRef } from "react";

/* =========================================================
   The TTFC mark in a header row (Oct 20 2026, the organiser:
   "add branding colors/logo"; "Just the logo or brand colors is
   fine"; "Make some interaction with logo"). Used by Home and
   Profile. A tap gives it a quick springy pop (transform only,
   app.css), a short buzz where the phone supports it, and
   scrolls the screen back to the top; it never navigates. With
   reduced motion: no pop, the scroll is instant. 44px to tap,
   the mark itself stays 22 × 28. The logo's colours elsewhere:
   the hairline under the screen headers (TopBar, the Schedule
   header), Home's divider, and Home in the tab bar (TabBar).
   Pass colours (Profile) are never used for the brand.
========================================================= */

const stillMotion = () => {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
};

/** `hidden`: out of the way for now (Home's bell menu is open): faded out, not tappable, skipped by screen readers. */
export default function BrandMark({ className = "", hidden = false }) {
  const img = useRef(null);
  const tap = () => {
    try { navigator.vibrate?.(10); } catch { /* no vibration here */ }
    const still = stillMotion();
    const el = img.current;
    if (!still && el) {
      el.classList.remove("is-popping");
      void el.offsetWidth; // restart the pop on a quick second tap
      el.classList.add("is-popping");
    }
    window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
  };
  return (
    <button type="button" className={`brand-mark ${className}${hidden ? " is-hidden" : ""}`.trim()} aria-label="The Tech Festival Canada, scroll to top"
      onClick={tap} aria-hidden={hidden || undefined} tabIndex={hidden ? -1 : undefined}>
      <img ref={img} src="/app/brand/share-mark.png" alt="" width="22" height="28" decoding="async"
        onAnimationEnd={(e) => e.currentTarget.classList.remove("is-popping")} />
    </button>
  );
}
