import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, PartyPopper, Trophy, X } from "lucide-react";
import { useStore } from "../lib/store";
import { auth } from "../lib/auth";
import { fileURL } from "../lib/config";
import { fromWinner, podiumSplit } from "../lib/podium";
import { browserStorage as storage, hideWinnersIn, isWinner, rememberCelebration, seenBefore, shouldCelebrate, winnersSignature } from "../lib/celebrate";
import { confettiBurst, prefersReducedMotion } from "../lib/confetti";
import { Avatar } from "./ui";
import Podium from "./Podium";

/* =========================================================
   "TTFC swag kit winners" (Oct 26 2026): once GET /api/app/swag
   says the winners are announced and sends them. On Points ›
   Leaderboard above the board, and pinned first in Home's feed
   for 24 h after the announcement (lib/feedPlan.js). The podium
   (2–1–3), anyone after the 3rd in a short list, and a confetti
   burst the first time on this device (lib/celebrate.js: one
   memory for Points and the feed); a winner sees "You won!" and a
   bigger burst. Reduce Motion: the card only. In the feed, a tap
   opens the leaderboard, and once it's been seen it can be hidden.
========================================================= */

const WINNERS_TITLE = "TTFC swag kit winners";

export default function SwagWinners({ winners, feed = false, onHidden }) {
  const a = useStore(auth);
  const myId = a.me?.id || a.user?._id || "";
  const won = isWinner(winners, myId);
  const [canHide, setCanHide] = useState(() => seenBefore(storage(), winners));
  const sig = winnersSignature(winners);

  // The first time on this device: a burst (a bigger one for a winner), remembered when it starts.
  useEffect(() => {
    if (!sig) return undefined;
    const t = setTimeout(() => {
      const st = storage();
      if (shouldCelebrate({ storage: st, winners, myId, reducedMotion: prefersReducedMotion() })) {
        confettiBurst({ big: won });
      }
      rememberCelebration({ storage: st, winners, myId });
    }, 350);
    const seen = setTimeout(() => setCanHide(true), 2800);
    return () => { clearTimeout(t); clearTimeout(seen); };
    // Once per announcement and person; `winners` is the same list while `sig` is.
  }, [sig, myId, won]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = winners.map(fromWinner);
  const { podium, rest } = podiumSplit(list);
  const titleId = feed ? "feed-winners-h" : "winners-h";
  const Heading = feed ? "h3" : "h2";

  return (
    <section className={"winners-card" + (feed ? " winners-card--feed" : "") + (won ? " is-winner" : "")} aria-labelledby={titleId}>
      <div className="winners-head">
        <span className="winners-ico" aria-hidden="true"><Trophy /></span>
        <Heading id={titleId} className="winners-title">{WINNERS_TITLE}</Heading>
        {feed && canHide && (
          <button type="button" className="feed-cta-x pressable" onClick={() => { hideWinnersIn(storage(), winners); onHidden?.(); }} aria-label="Hide the winners from the feed" title="Hide">
            <X aria-hidden="true" />
          </button>
        )}
      </div>
      {won
        ? <p className="winners-won" role="status"><PartyPopper aria-hidden="true" /><span><b>You won!</b> A TTFC swag kit is yours: collect it at the registration desk.</span></p>
        : <p className="winners-sub">Congratulations to the winners, and thank you for taking part.</p>}
      <Podium people={podium} myId={myId} label="The winners" compact={feed} />
      {rest.length > 0 && (
        <ol className="winners-rest" aria-label="More winners">
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
