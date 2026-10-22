import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BadgeCheck, ChevronDown } from "lucide-react";
import { useStore } from "../lib/store";
import { auth } from "../lib/auth";
import { loadLeaderboard, points, pointsLine, refreshPoints, setLeaderboardHidden } from "../lib/points";
import { doneLines, levelProgress, recommendedRules, ruleCap, ruleFinished, ruleGoal } from "../lib/pointsPlan.js";
import { fileURL } from "../lib/config";
import { showAlert } from "../lib/ui";
import { loadAttending, openAttending } from "../lib/engage";
import { now, torontoDate } from "../lib/time";
import { Avatar, Segmented, Spinner, Switch, TopBar } from "../components/ui";

/* =========================================================
   Points (iOS PointsView, Android ui/points/PointsScreen.kt).
   Batch 6 (Oct 22 2026; the organiser: "organise it and reduce
   scroll"): two tabs.
   - Leaderboard (default): your rank and points in one row,
     the "Show me on the leaderboard" switch, then the top 10.
   - Your activity (?tab=activity): Recommended (up to 4 things
     not done yet, one line each), Done (chips with the points
     earned), your level in one line, and every other way to
     earn (with its progress) folded under "All ways to earn
     points".
   The order and rules are in lib/pointsPlan.js (pure, tested).
   Nothing here animates (Reduce Motion needs nothing extra).
========================================================= */

const TABS = [{ value: "board", label: "Leaderboard" }, { value: "activity", label: "Your activity" }];
// Oct 26–27 in Toronto: the event-day rules (scan a badge, vote, ask) go first.
const FESTIVAL = [torontoDate(26).getTime(), torontoDate(28).getTime()];

export default function Points() {
  const { me, board, error, savingPrefs } = useStore(points);
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "activity" ? "activity" : "board";

  useEffect(() => { refreshPoints(true); loadLeaderboard(); }, []);

  // Flips on the first tap (lib/points.js): disabled while it saves, back as it was with an alert if it couldn't.
  const toggle = async (show) => {
    if (savingPrefs) return;
    try { await setLeaderboardHidden(!show); } catch (e) { showAlert("Couldn't save", e.message || "Try again."); }
  };

  const picker = (
    <Segmented capsule label="Points" value={tab} options={TABS}
      onChange={(v) => setParams(v === "activity" ? { tab: "activity" } : {}, { replace: true })} />
  );

  return (
    <div className="page">
      <TopBar title="Points" below={picker} />
      <main id="main" className="pad" style={{ paddingTop: 14 }}>
        {!me ? (error ? <p className="muted center">{error}</p> : <Spinner label="Loading your points" />)
          : tab === "board" ? <BoardTab me={me} board={board} savingPrefs={savingPrefs} onToggle={toggle} />
            : <ActivityTab me={me} />}
      </main>
    </div>
  );
}

/** Your rank and points in one row, the switch, then the board. Nothing else. */
function BoardTab({ me, board, savingPrefs, onToggle }) {
  const a = useStore(auth);
  const myId = a.me?.id || a.user?._id || "";
  return (
    <div role="tabpanel" aria-label="Leaderboard" className="stack">
      <div className="points-me" role="group" aria-label={`${me.rank ? `Your rank: ${me.rank}` : "Not ranked yet"}. ${me.level?.name || ""}. ${me.total} points`}>
        <b className="points-me-rank figure" aria-hidden="true">{me.rank ? `#${me.rank}` : "–"}</b>
        <span style={{ flex: 1, minWidth: 0 }} aria-hidden="true">
          <b style={{ display: "block", fontSize: 14 }}>{me.rank ? "Your rank" : "Not ranked yet"}</b>
          <span className="tiny ellipsis" style={{ display: "block", opacity: 0.85 }}>{me.level?.name}</span>
        </span>
        <span style={{ textAlign: "right" }} aria-hidden="true">
          <b className="figure" style={{ display: "block", fontSize: 20, lineHeight: 1.1 }}>{me.total}</b>
          <span className="tiny" style={{ opacity: 0.85 }}>points</span>
        </span>
      </div>
      <div className="points-switch">
        <Switch label="Show me on the leaderboard" checked={!me.hideFromLeaderboard} onChange={onToggle} disabled={savingPrefs} />
      </div>
      {board?.entries?.length ? (
        <ol className="board-list">
          {board.entries.map((e) => {
            const mine = !!myId && e.user.id === myId;
            return (
              <li key={e.user.id} className={mine ? "board-row is-me" : "board-row"}>
                <b className="figure muted board-rank">{e.rank}</b>
                <Avatar name={e.user.name} src={fileURL(e.user.avatarUrl)} size={34} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b className="ellipsis" style={{ display: "block", fontSize: 14 }}>{e.user.name}{mine && <span className="tiny muted"> (you)</span>}</b>
                  <span className="tiny muted ellipsis" style={{ display: "block" }}>{[e.level?.name, e.user.organization].filter(Boolean).join(" · ")}</span>
                </span>
                <b className="figure accent-text">{e.points}</b>
              </li>
            );
          })}
        </ol>
      ) : <p className="small muted" style={{ margin: 0 }}>Be the first on the board: save a session or make a connection.</p>}
    </div>
  );
}

/** Recommended (up to 4), Done, the level in one line, then every other way to earn, folded. */
function ActivityTab({ me }) {
  const [open, setOpen] = useState(false);
  // Whether their I'm-attending post is confirmed (it counts as done straight away), and the link ready for the
  // rule's button (a tap opens it at once).
  const [attendingPosted, setAttendingPosted] = useState(false);
  const hasAttending = !!me.rules?.some((r) => r.key === "linkedin.attending");
  useEffect(() => {
    if (!hasAttending) return undefined;
    let alive = true;
    loadAttending().then((e) => { if (alive) setAttendingPosted(!!e?.posted); }, () => {});
    return () => { alive = false; };
  }, [hasAttending]);

  const counted = (key) => Math.max(pointsLine(me, key)?.count || 0, key === "linkedin.attending" && attendingPosted ? 1 : 0);
  const t = now().getTime();
  const recommended = recommendedRules(me.rules, counted, t >= FESTIVAL[0] && t < FESTIVAL[1]);
  const done = doneLines(me.breakdown);
  const rest = (me.rules || []).filter((r) => !recommended.some((x) => x.key === r.key));
  const progress = levelProgress(me);

  return (
    <div role="tabpanel" aria-label="Your activity" className="stack-lg">
      {recommended.length > 0 && (
        <section className="stack-sm" aria-labelledby="rec-h">
          <h2 id="rec-h" className="eyebrow">Recommended</h2>
          {recommended.map((r) => <RecommendedRow key={r.key} rule={r} />)}
        </section>
      )}

      {done.length > 0 && (
        <section className="stack-sm" aria-labelledby="done-h">
          <h2 id="done-h" className="eyebrow">Done</h2>
          <ul className="done-chips">
            {done.map((l) => (
              <li key={l.key} className="done-chip" aria-label={`${l.label}: ${l.points} points`}>
                <BadgeCheck aria-hidden="true" />
                <span aria-hidden="true">{l.label}</span>
                <b className="figure" aria-hidden="true">+{l.points}</b>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="level-line" aria-label="Your level">
        <div className="row" style={{ gap: 8 }}>
          <b style={{ fontSize: 14 }}>{me.level?.name}</b>
          <span className="tiny muted ellipsis" style={{ flex: 1, minWidth: 0 }}>
            {me.nextLevel ? `${me.toNext} to ${me.nextLevel.name}` : "Top level reached"}
          </span>
          <b className="figure accent-text">{me.total} points</b>
        </div>
        <div className="rule-bar" role="progressbar" aria-label={me.nextLevel ? `Progress to ${me.nextLevel.name}` : "Top level reached"}
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <i style={{ width: `${progress * 100}%` }} />
        </div>
      </section>

      {rest.length > 0 && (
        <section className="stack-sm">
          <button type="button" className="fold-head pressable" aria-expanded={open} aria-controls="all-ways" onClick={() => setOpen((o) => !o)}>
            <span style={{ flex: 1 }}>All ways to earn points</span>
            <span className="tiny muted">{rest.length}</span>
            <ChevronDown aria-hidden="true" className={open ? "fold-chev is-open" : "fold-chev"} />
          </button>
          {open && (
            <div id="all-ways" className="stack-sm">
              {rest.map((r) => <RuleRow key={r.key} rule={r} me={me} counted={counted(r.key)} />)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/** The way to go and earn a rule: a link, or the I'm-attending page. */
function GoButton({ rule }) {
  const go = ruleGoal(rule.key);
  if (!go) return null;
  return go.action === "attending"
    ? <button type="button" className="rule-go pressable" onClick={openAttending} aria-label={`${go.title}: ${rule.label}`}>{go.title}</button>
    : <Link to={go.to} state={go.state} className="rule-go pressable" aria-label={`${go.title}: ${rule.label}`}>{go.title}</Link>;
}

/** One line: points, what to do, and the button. */
function RecommendedRow({ rule: r }) {
  return (
    <div className="rule-line">
      <b className="rule-points figure">+{r.points}</b>
      <b className="rule-line-label" title={r.description || undefined}>{r.label}</b>
      <GoButton rule={r} />
    </div>
  );
}

/** A rule in the folded list: its points, what it's for, progress towards an overall cap, and a way to earn it. */
function RuleRow({ rule: r, me, counted }) {
  const earned = pointsLine(me, r.key)?.points || 0;
  const cap = ruleCap(r);
  const finished = ruleFinished(r, counted);
  const shown = cap ? Math.min(counted, cap) : 0;
  return (
    <div className="rule-card">
      <div className="row-top" style={{ gap: 12 }}>
        <b className="rule-points figure">+{r.points}</b>
        <span style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: "block", fontSize: 14 }}>{r.label}</b>
          {r.description && <span className="tiny muted" style={{ display: "block", lineHeight: 1.4, marginTop: 2 }}>{r.description}</span>}
          {r.key.startsWith("linkedin.") && <span className="tiny muted" style={{ display: "block", lineHeight: 1.4, marginTop: 2 }}>Points are added when you post with Post to LinkedIn.</span>}
        </span>
        {!finished && <GoButton rule={r} />}
      </div>
      {cap > 1 ? (
        <div className="rule-progress">
          <div className="rule-bar" role="progressbar" aria-label={`${r.label}: ${shown} of ${cap}`} aria-valuemin={0} aria-valuemax={cap} aria-valuenow={shown}>
            <i style={{ width: `${(shown / cap) * 100}%` }} />
          </div>
          <div className="row tiny muted figure"><span style={{ flex: 1 }}>{finished ? `All ${cap} done` : `${counted} of ${cap}`}</span>{earned > 0 && <span>+{earned} earned</span>}</div>
        </div>
      ) : finished ? (
        <div className="row tiny bold accent-text" style={{ gap: 6 }}><BadgeCheck aria-hidden="true" style={{ width: 16, height: 16 }} />Done{earned > 0 ? `, +${earned} earned` : ""}</div>
      ) : earned > 0 ? <div className="tiny muted">+{earned} earned so far</div> : null}
    </div>
  );
}
