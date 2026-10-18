import { useEffect } from "react";
import { useStore } from "../lib/store";
import { points, refreshPoints, loadLeaderboard, setLeaderboardHidden } from "../lib/points";
import { fileURL } from "../lib/config";
import { showAlert } from "../lib/ui";
import { Avatar, Spinner, Switch, TopBar } from "../components/ui";

/* =========================================================
   Points (iOS PointsView): level and progress, what you've
   earned, how to earn more, and the top 10 (with an opt-out).
========================================================= */

export default function Points() {
  const { me, board, error } = useStore(points);

  useEffect(() => { refreshPoints(true); loadLeaderboard(); }, []);

  const toggle = async (show) => {
    try { await setLeaderboardHidden(!show); } catch (e) { showAlert("Couldn't save", e.message); }
  };

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
              ) : <div className="small" style={{ opacity: 0.85, fontWeight: 500 }}>Top level reached — you're a Catalyst.</div>}
            </section>

            {me.breakdown?.some((l) => l.count > 0) && (
              <section className="stack-sm" aria-labelledby="earned-h">
                <h2 id="earned-h" className="eyebrow">You've earned</h2>
                {me.breakdown.filter((l) => l.count > 0).map((l) => (
                  <div key={l.key} className="row"><span style={{ flex: 1 }}>{l.label}</span><b className="figure accent-text">+{l.points}</b></div>
                ))}
              </section>
            )}

            <section className="stack-sm" aria-labelledby="earn-h">
              <h2 id="earn-h" className="eyebrow">How to earn</h2>
              {(me.rules || []).map((r) => (
                <div key={r.key} className="row-top" style={{ gap: 12 }}>
                  <b className="figure accent-text" style={{ width: 40, flex: "none", fontSize: 13 }}>+{r.points}</b>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: "block", fontWeight: 500 }}>{r.label}</span>
                    {r.description && <span className="tiny muted">{r.description}</span>}
                  </span>
                </div>
              ))}
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
              )) : <p className="small muted" style={{ margin: 0 }}>Be the first on the board — save a session or make a connection.</p>}
              <Switch label="Show me on the leaderboard" description="Your name, organisation and points. You keep earning either way."
                checked={!me.hideFromLeaderboard} onChange={toggle} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function progress(me) {
  const span = Math.max((me.nextLevel?.min ?? 0) - (me.level?.min ?? 0), 1);
  return Math.min(Math.max((me.total - (me.level?.min ?? 0)) / span, 0), 1);
}
