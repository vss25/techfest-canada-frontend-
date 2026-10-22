import { Link } from "react-router-dom";
import { Bell, ChevronRight } from "lucide-react";
import { now } from "../lib/time";
import { useSwag } from "../lib/swagState";
import { SWAG_PAGE, SWAG_THUMB, swagBannerLine } from "../../lib/swag.js";

/* =========================================================
   The swag kit banner at the top of Points › Leaderboard (batch 7,
   Oct 22 2026): the photo, "Win the TTFC swag kit", "Only app users
   can win · Top 3 at Oct 26, 4 PM", opening the rules (the website's /swag page, in the
   browser). After the announcement time: "Winners announced — check
   your notifications", opening Notifications. Nothing while the
   giveaway is off (Admin › Website & app › Swag kit giveaway).
========================================================= */

export default function SwagBanner() {
  const s = useSwag(now().getTime());
  if (s.stage === "off") return null;
  const line = swagBannerLine(s);
  const inner = (
    <>
      <img className="swag-banner-photo" src={SWAG_THUMB} alt="" width="600" height="508" decoding="async" />
      <span className="swag-banner-text">
        <b>{s.title}</b>
        <span>{line}</span>
      </span>
      {s.stage === "announced" ? <Bell className="swag-banner-chev" aria-hidden="true" /> : <ChevronRight className="swag-banner-chev" aria-hidden="true" />}
    </>
  );
  return s.stage === "announced"
    ? <Link to="/notifications" className="swag-banner pressable" aria-label={`${s.title}. ${line}`}>{inner}</Link>
    : (
      <a href={SWAG_PAGE} target="_blank" rel="noopener" className="swag-banner pressable" aria-label={`${s.title}. ${line}. Opens the rules`}>{inner}</a>
    );
}
