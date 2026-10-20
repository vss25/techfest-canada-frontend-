/* =========================================================
   The TTFC mark in a header row (Oct 20 2026, the organiser:
   "add branding colors/logo"; "Just the logo or brand colors is
   fine"). Decorative: not a link, hidden from screen readers
   (the screen keeps its own name for them). Used by Home and
   Profile. The logo's colours elsewhere: the hairline under the
   screen headers (TopBar, the Schedule header) and Home's
   divider (app.css, --brand-gradient). Pass colours (Profile)
   are never used for the brand.
========================================================= */

export default function BrandMark({ className = "" }) {
  return (
    <span className={`brand-mark ${className}`.trim()} aria-hidden="true">
      <img src="/app/brand/share-mark.png" alt="" width="22" height="28" decoding="async" />
    </span>
  );
}
