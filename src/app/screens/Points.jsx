import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpCircle, BadgeCheck, BarChart3, Bookmark, Hand, Heart, MessageCircleQuestion, MessageSquare, ScanLine, Send, SquarePen, Users,
} from "lucide-react";
import { useStore } from "../lib/store";
import {
  ACTIVITY_STATS, activityCount, loadLeaderboard, points, pointsLine, refreshPoints, ruleCap, ruleGoal, setLeaderboardHidden,
} from "../lib/points";
import { bookmarks, social } from "../lib/social";
import { fileURL } from "../lib/config";
import { showAlert } from "../lib/ui";
import { Avatar, Spinner, Switch, TopBar } from "../components/ui";

/* =========================================================
   Points (iOS PointsView): level and progress, "Your activity"
   (what you've done, zeros too), how to earn more (with a way
   to each one), and the top 10 (with an opt-out).
========================================================= */

const STAT_ICON = {
  "session.saved": Bookmark, "network.connection": Users, "feed.post": SquarePen, "feed.comment": MessageSquare,
  "live.vote": BarChart3, "live.question": MessageCircleQuestion, "session.attended": Hand, "network.inPerson": ScanLine,
  "network.request": Send, "feed.likes": Heart, "live.upvoted": ArrowUpCircle,
};

export default function Points() {
  const { me, board, error, savingPrefs } = useStore(points);
  const s = useStore(social);

  useEffect(() => { refreshPoints(true); loadLeaderboard(); }, []);

  // Flips on the first tap (lib/points.js): disabled while it saves, back as it was with an alert if it couldn't.
  const toggle = async (show) => {
    if (savingPrefs) return;
    try { await setLeaderboardHidden(!show); } catch (e) { showAlert("Couldn't save", e.message || "Try again."); }
  };

  // This browser's own numbers for these two (what the profile used to show).
  const local = { "session.saved": bookmarks(s).length, "network.connection": s.connections.accepted.length };

  return (
    <div className="page">
      <TopBar title="Points" />
      <main id="main" className="pad stack-lg" style={{ paddingTop: 16 }}>
        {!me ? (error ? <p className="muted center">{error}</p> : <Spinner label="Loading your points" />) : (
          <>
            <section className="level-card" aria-label="Your level">
              <div className="row" style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <h1>{me.level?.name}</h1>
                  {me.rank ? <div className="small" style={{ opacity: 0.8 }}>#{me.rank} on the leaderboard</div> : null}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="level-total figure">{me.total}</div>
                  <div className="tiny" style={{ opacity: 0.8 }}>points</div>
                </div>
              </div>
              {me.nextLevel ? (
                <>
                  <div className="level-bar" role="progressbar" aria-label={`Progress to ${me.nextLevel.name}`} aria-valuemin={0} aria-valuemax={100}
                    aria-valuenow={Math.round(progress(me) * 100)}>
                    <i style={{ width: `${progress(me) * 100}%` }} />
                  </div>
                  <div className="small" style={{ opacity: 0.85, fontWeight: 500 }}>{me.toNext} points to {me.nextLevel.name}</div>
                </>
              ) : <div className="small" style={{ opacity: 0.85, fontWeight: 500 }}>Top level reached. You're a Catalyst.</div>}
            </section>

            <section className="stack-sm" aria-labelledby="activity-h">
              <h2 id="activity-h" className="eyebrow">Your activity</h2>
              <ul className="activity-grid">
                {ACTIVITY_STATS.map((st) => {
                  const Icon = STAT_ICON[st.key] || ArrowUpCircle;
                  const n = activityCount(me, st.key, local[st.key]);
                  return (
                    <li key={st.key} className="activity-tile" aria-label={`${st.label}: ${n}`}>
                      <span className="activity-ico" aria-hidden="true"><Icon /></span>
                      <b className="figure" aria-hidden="true">{n}</b>
                      <span aria-hidden="true">{st.label}</span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="stack-sm" aria-labelledby="earn-h">
              <h2 id="earn-h" className="eyebrow">How to earn more</h2>
              {(me.rules || []).map((r) => <RuleRow key={r.key} rule={r} me={me} />)}
            </section>

            <section className="stack-sm" aria-labelledby="board-h">
              <h2 id="board-h" className="eyebrow">Leaderboard</h2>
              {board?.entries?.length ? board.entries.map((e) => (
                <div key={e.user.id} className="row" style={{ gap: 12 }}>
                  <b className="figure muted" style={{ width: 24, textAlign: "right" }}>{e.rank}</b>
                  <Avatar name={e.user.name} src={fileURL(e.user.avatarUrl)} size={34} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b className="ellipsis" style={{ display: "block", fontSize: 14 }}>{e.user.name}</b>
                    <span className="tiny muted ellipsis" style={{ display: "block" }}>{[e.level?.name, e.user.organization].filter(Boolean).join(" · ")}</span>
                  </span>
                  <b className="figure accent-text">{e.points}</b>
                </div>
              )) : <p className="small muted" style={{ margin: 0 }}>Be the first on the board: save a session or make a connection.</p>}
              <Switch label="Show me on the leaderboard" description="Your name, organisation and points. You keep earning either way."
                checked={!me.hideFromLeaderboard} onChange={toggle} disabled={savingPrefs} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

/** A rule: its points, what it's for, progress towards an overall cap, and a way to go and earn it. */
function RuleRow({ rule: r, me }) {
  const line = pointsLine(me, r.key);
  const counted = line?.count || 0;
  const earned = line?.points || 0;
  const cap = ruleCap(r);
  const finished = cap != null && counted >= cap;
  const go = ruleGoal(r.key);
  const shown = cap ? Math.min(counted, cap) : 0;
  return (
    <div className="rule-card">
      <div className="row-top" style={{ gap: 12 }}>
        <b className="rule-points figure">+{r.points}</b>
        <span style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: "block", fontSize: 14 }}>{r.label}</b>
          {r.description && <span className="tiny muted" style={{ display: "block", lineHeight: 1.4, marginTop: 2 }}>{r.description}</span>}
        </span>
        {go && !finished && <Link to={go.to} state={go.state} className="rule-go pressable">{go.title}</Link>}
      </div>
      {cap > 1 ? (
        <div className="rule-progress">
          <div className="rule-bar" role="progressbar" aria-label={`${r.label}: ${shown} of ${cap}`} aria-valuemin={0} aria-valuemax={cap} aria-valuenow={shown}>
            <i style={{ width: `${(shown / cap) * 100}%` }} />
          </div>
          <div className="row tiny muted figure"><span style={{ flex: 1 }}>{finished ? `All ${cap} done` : `${counted} of ${cap}`}</span>{earned > 0 && <span>+{earned} earned</span>}</div>
        </div>
      ) : finished ? (
        <div className="row tiny bold accent-text" style={{ gap: 6 }}><BadgeCheck aria-hidden="true" style={{ width: 16, height: 16 }} />Done, +{earned} earned</div>
      ) : earned > 0 ? <div className="tiny muted">+{earned} earned so far</div> : null}
    </div>
  );
}

function progress(me) {
  const span = Math.max((me.nextLevel?.min ?? 0) - (me.level?.min ?? 0), 1);
  return Math.min(Math.max((me.total - (me.level?.min ?? 0)) / span, 0), 1);
}
