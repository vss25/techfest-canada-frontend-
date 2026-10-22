import { useNavigate } from "react-router-dom";
import { BarChart3, CalendarClock, CalendarPlus, Gift, Hash, Linkedin, ScanLine, Send, UserRoundPlus, X } from "lucide-react";
import { openAttending } from "../lib/engage";
import { SWAG_ALT, SWAG_THUMB, swagShort } from "../../lib/swag.js";

/* =========================================================
   One "Earn points" card in the feed (lib/feedCtas.js decides which
   and where; lib/useFeedCtas.js gives them to Home): a small eyebrow,
   the title, one line on why, one button, and "Not now" (✕) that
   hides the card for 3 days. Points come from the server's rules.
   "Win the TTFC swag kit" (batch 7): the photo, the top N and the
   cutoff, "See how to win" → the Leaderboard tab.
========================================================= */

const CARDS = {
  attending: { icon: Linkedin, rule: "linkedin.attending", fallback: 50, title: "Tell the world you're attending",
    why: "Post your I'm attending image on LinkedIn. Points are added when you post with Post to LinkedIn.", button: "Post on LinkedIn" },
  linkedin: { icon: UserRoundPlus, rule: "profile.linkedin", fallback: 20, title: "Add your LinkedIn",
    why: "So people you meet at TTFC can find and follow up with you.", button: "Add LinkedIn", to: "/profile/edit" },
  topics: { icon: Hash, rule: "profile.topics", fallback: 10, title: "Pick 3 topics",
    why: "We'll suggest people and sessions that match what you care about.", button: "Pick topics", to: "/profile/edit" },
  availability: { icon: CalendarClock, title: "Set when you're free to meet",
    why: "People see when they can grab you for a chat at the festival.", button: "Set my times", to: "/profile/availability" },
  sessions: { icon: CalendarPlus, rule: "session.saved", fallback: 5, each: true, title: "Save sessions to your agenda",
    why: "Your day, ready on the schedule, with a nudge before each one starts.", button: "Open the schedule", to: "/schedule" },
  reachout: { icon: Send, rule: "network.request", fallback: 5, title: "Reach out to someone",
    why: "Send a connection request to someone you'd like to meet.", button: "Find people", to: "/network/all" },
  scan: { icon: ScanLine, rule: "network.inPerson", fallback: 10, title: "Met someone? Scan their badge",
    why: "Connect in a tap, then message them later.", button: "Scan a badge", to: "/network", state: { scan: true } },
  poll: { icon: BarChart3, rule: "live.vote", fallback: 5, title: "Vote in a live poll",
    why: "", button: "Vote now" },
  swag: { icon: Gift, eyebrow: "Giveaway", title: "Win the TTFC swag kit", why: "", button: "See how to win", to: "/points" },
};

export default function FeedCta({ ctaKey, rules, liveSession, swag, onDismiss }) {
  const navigate = useNavigate();
  const card = CARDS[ctaKey];
  if (!card) return null;
  const Icon = card.icon;
  const pts = card.rule ? (rules.find((r) => r.key === card.rule)?.points ?? card.fallback) : null;
  const points = pts ? `+${pts}${card.each ? " each" : ""}` : null;
  const why = ctaKey === "poll" && liveSession ? `${liveSession.title} is on now. Vote and see the room's answer.`
    : ctaKey === "swag" && swag ? `Earn points in the app. The top ${swag.kits} on the leaderboard at ${swag.cutoffShort || swagShort(swag.cutoff)} each win a backpack, bottle, mug and more.`
      : card.why;
  const title = ctaKey === "swag" && swag?.title ? swag.title : card.title;
  const go = () => {
    if (ctaKey === "attending") { openAttending(); return; }
    if (ctaKey === "poll" && liveSession) { navigate(`/session/${encodeURIComponent(liveSession.id)}/live`); return; }
    navigate(card.to, card.state ? { state: card.state } : undefined);
  };
  const titleId = `cta-${ctaKey}`;
  return (
    <section className={ctaKey === "swag" ? "feed-cta feed-cta--swag" : "feed-cta"} aria-labelledby={titleId}>
      {ctaKey === "swag" && <img className="feed-cta-photo" src={SWAG_THUMB} alt={SWAG_ALT} width="600" height="508" loading="lazy" decoding="async" />}
      <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
        <span className="feed-cta-ico" aria-hidden="true"><Icon /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="feed-cta-eyebrow">{card.eyebrow || "Earn points"}{points ? <b className="figure"> · {points}</b> : null}</span>
          <h3 id={titleId} className="feed-cta-title">{title}</h3>
          {why && <p className="feed-cta-why">{why}</p>}
        </div>
        <button type="button" className="feed-cta-x pressable" onClick={() => onDismiss(ctaKey)} aria-label={`Not now: hide “${title}” for 3 days`} title="Not now">
          <X aria-hidden="true" />
        </button>
      </div>
      <button type="button" className="btn btn-primary feed-cta-btn pressable" onClick={go}>{card.button}</button>
    </section>
  );
}
