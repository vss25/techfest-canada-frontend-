import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChartColumn, MessagesSquare, X } from "lucide-react";
import { useStore } from "../lib/store";
import { cms, isLiveWindow, isProgramme, liveOn, pollsFor, sessionById } from "../lib/cms";
import { content, liveFlags } from "../lib/content";
import { bookmarks, social } from "../lib/social";
import { useNow } from "../lib/ui";

/* =========================================================
   The live pill (iOS LivePollPill): while one of your saved
   sessions is in its live window (10 min either side), a small
   black capsule at the top of every screen opens its polls /
   Q&A. The X hides it for that session.
========================================================= */

export default function LivePollPill() {
  const c = useStore(cms);
  const ct = useStore(content);
  const s = useStore(social);
  const now = useNow(30000);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [hidden, setHidden] = useState(null);
  const flags = liveFlags(ct);
  const live = bookmarks(s).map((id) => sessionById(id, c)).filter(Boolean)
    .filter((x) => isProgramme(x) && liveOn(x, flags) && isLiveWindow(x, now))
    .sort((a, b) => a.start - b.start)[0];
  if (!live || hidden === live.id || /\/live$/.test(pathname)) return null;
  const qaOnly = pollsFor(live, c).length === 0 || !flags.polls;
  const label = qaOnly ? "Live Q&A" : "Live poll";
  const Icon = qaOnly ? MessagesSquare : ChartColumn;
  return (
    <div className="live-float" role="button" tabIndex={0} aria-label={`${label}: ${live.title}`} aria-description="Opens the live session full screen"
      onClick={() => navigate(`/session/${encodeURIComponent(live.id)}/live`)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/session/${encodeURIComponent(live.id)}/live`); } }}>
      <span className="live-float-dot" aria-hidden="true"><i /></span>
      <Icon aria-hidden="true" className="live-float-ico" />
      <b>{label}</b>
      <button type="button" className="live-float-x" aria-label="Hide live poll" onClick={(e) => { e.stopPropagation(); setHidden(live.id); }}><X aria-hidden="true" /></button>
    </div>
  );
}
