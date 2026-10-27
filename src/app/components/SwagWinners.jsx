import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Handshake, Trophy, X } from "lucide-react";
import { useStore } from "../lib/store";
import { auth } from "../lib/auth";
import { fileURL } from "../lib/config";
import { fromWinner, podiumSplit } from "../lib/podium";
import { browserStorage as storage, hideWinnersIn, isWinner, rememberCelebration, seenBefore, shouldCelebrate, winnersSignature } from "../lib/celebrate";
import { confettiBurst, prefersReducedMotion } from "../lib/confetti";
import { Avatar } from "./ui";
import Podium from "./Podium";
import { NETWORKERS_CARD_TITLE, NETWORKERS_HOME_TITLE, NETWORKERS_HOME_TITLE_ME, NETWORKERS_THANKS_ALL, NETWORKERS_THANKS_ME } from "../../lib/swag.js";

/* =========================================================
   The top networkers (Oct 26 2026; since Oct 27 appreciation, not a
   prize: the organiser, "appreciation for starting conversations
   and meeting people", src/lib/swag.js): once GET /api/app/swag
   sends them at the announce time. On Points › Leaderboard as "TTFC
   2026 top networkers", and pinned first in Home's feed for 24 h
   (lib/feedPlan.js) as "Our top networkers are in" ("You're one of
   TTFC's top networkers!" for one of them). The podium (2–1–3),
   anyone after the 3rd in a short list, and a confetti burst the
   first time on this device (lib/celebrate.js: one memory for
   Points and the feed), bigger for one of them, who also reads
   "You've been one of the best networkers at TTFC 2026! …". Reduce
   Motion: the card only. In the feed, "See the leaderboard", and
   once it's been seen it can be hidden.
========================================================= */

export default function SwagWinners({ winners, feed = false, onHidden }) {
  const a = useStore(auth);
  const myId = a.me?.id || a.user?._id || "";
  const mine = isWinner(winners, myId);
  const [canHide, setCanHide] = useState(() => seenBefore(storage(), winners));
  const sig = winnersSignature(winners);

  // The first time on this device: a burst (a bigger one for one of them), remembered when it starts.
  useEffect(() => {
    if (!sig) return undefined;
    const t = setTimeout(() => {
      const st = storage();
      if (shouldCelebrate({ storage: st, winners, myId, reducedMotion: prefersReducedMotion() })) {
        confettiBurst({ big: mine });
      }
      rememberCelebration({ storage: st, winners, myId });
    }, 350);
    const seen = setTimeout(() => setCanHide(true), 2800);
    return () => { clearTimeout(t); clearTimeout(seen); };
    // Once per announcement and person; `winners` is the same list while `sig` is.
  }, [sig, myId, mine]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = winners.map(fromWinner);
  const { podium, rest } = podiumSplit(list);
  const titleId = feed ? "feed-winners-h" : "winners-h";
  const Heading = feed ? "h3" : "h2";
  const title = feed ? (mine ? NETWORKERS_HOME_TITLE_ME : NETWORKERS_HOME_TITLE) : NETWORKERS_CARD_TITLE;

  return (
    <section className={"winners-card" + (feed ? " winners-card--feed" : "") + (mine ? " is-mine" : "")} aria-labelledby={titleId}>
      <div className="winners-head">
        <span className="winners-ico" aria-hidden="true"><Trophy /></span>
        <Heading id={titleId} className="winners-title">{title}</Heading>
        {feed && canHide && (
          <button type="button" className="feed-cta-x pressable" onClick={() => { hideWinnersIn(storage(), winners); onHidden?.(); }} aria-label="Hide the top networkers from the feed" title="Hide">
            <X aria-hidden="true" />
          </button>
        )}
      </div>
      {mine
        ? <p className="winners-won" role="status"><Handshake aria-hidden="true" /><span>{NETWORKERS_THANKS_ME}</span></p>
        : <p className="winners-sub">{NETWORKERS_THANKS_ALL}</p>}
      <Podium people={podium} myId={myId} label="The top networkers" compact={feed} />
      {rest.length > 0 && (
        <ol className="winners-rest" aria-label="More top networkers">
          {rest.map((p) => (
            <li key={p.id || p.name} className={"board-row" + (p.id && p.id === myId ? " is-me" : "")}>
              <b className="figure muted board-rank">{p.rank}</b>
              <Avatar name={p.name} src={fileURL(p.avatarUrl)} size={30} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <b className="ellipsis" style={{ display: "block", fontSize: 14 }}>{p.name}</b>
                {p.organization && <span className="tiny muted ellipsis" style={{ display: "block" }}>{p.organization}</span>}
              </span>
              <b className="figure accent-text">{p.points}</b>
            </li>
          ))}
        </ol>
      )}
      {feed && (
        <Link to="/points" className="btn btn-primary feed-cta-btn pressable">See the leaderboard<ChevronRight aria-hidden="true" /></Link>
      )}
    </section>
  );
}
