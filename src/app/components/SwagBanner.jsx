import { ChevronRight, Handshake } from "lucide-react";
import { now } from "../lib/time";
import { useNetworkers } from "../lib/swagState";
import { SWAG_PAGE } from "../../lib/swag.js";

/* =========================================================
   The leaderboard banner at the top of Points › Leaderboard (batch
   7; since Oct 27 2026 appreciation, not a prize, src/lib/swag.js):
   while the celebration is still to come, the title ("Top
   networkers of TTFC 2026") and "Start conversations and meet
   people. At 5:00 PM on Tuesday, October 27 we'll celebrate the top
   3 networkers.", opening "How the leaderboard works" (the website's
   /swag page, in the browser). Once they're announced the top
   networkers card takes its place (components/SwagWinners.jsx);
   nothing while Admin › Top networkers › Celebrate is off.
========================================================= */

export default function SwagBanner() {
  const v = useNetworkers(now().getTime());
  if (!v.before) return null;
  return (
    <a href={SWAG_PAGE} target="_blank" rel="noopener" className="swag-banner pressable" aria-label={`${v.title}. ${v.line} Opens how the leaderboard works`}>
      <span className="swag-banner-ico" aria-hidden="true"><Handshake /></span>
      <span className="swag-banner-text">
        <b>{v.title}</b>
        <span>{v.line}</span>
      </span>
      <ChevronRight className="swag-banner-chev" aria-hidden="true" />
    </a>
  );
}
