import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ArrowUp, BarChart3, Circle, CircleCheck, ClockAlert, MessageSquareQuote, PauseCircle, QrCode, Triangle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useStore } from "../lib/store";
import { auth, isSignedIn } from "../lib/auth";
import { cms, dayLabel, isLiveWindow, minutesUntilLive, pollsFor, pollsOn, qaOn, roomOf, sessionById, timeRange } from "../lib/cms";
import { content, liveFlags, refreshContent } from "../lib/content";
import { get, post } from "../lib/api";
import { clockFaked, timeAgo } from "../lib/time";
import { sessionLivePayload } from "../lib/qr";
import { showAlert, useNow, usePolling } from "../lib/ui";
import { Empty, IconButton, Segmented, Sheet, Spinner, TopBar } from "../components/ui";

/* =========================================================
   In-session participation (iOS SessionLiveView): spot polls
   and audience Q&A, open from 10 minutes before the session to
   10 minutes after it. Results and questions refresh every 6 s;
   the organisers' switches every ~30 s.
========================================================= */

function PollCard({ poll, result, onVote, guest }) {
  const counts = result?.counts?.length === poll.options.length ? result.counts : poll.options.map(() => 0);
  const myVote = result?.myVote ?? null;
  const voted = myVote !== null && myVote !== undefined;
  const total = counts.reduce((a, b) => a + b, 0);
  return (
    <section className="card stack" aria-label={poll.question}>
      <span className="eyebrow">Spot poll</span>
      <h2 style={{ fontSize: 16, margin: 0 }}>{poll.question}</h2>
      <div className="stack-sm" role="group" aria-label="Options">
        {poll.options.map((o, i) => {
          const pct = voted && total ? Math.round((counts[i] / total) * 100) : 0;
          const mine = myVote === i;
          return (
            <button key={o} type="button" className={"poll-opt pressable" + (mine ? " poll-opt--mine" : "")} disabled={voted} aria-pressed={mine}
              onClick={() => (guest ? showAlert("Sign up to vote", "Guests can watch the poll. Sign in to take part.") : onVote(i))}
              aria-label={voted ? `${o}, ${pct}%${mine ? ", your vote" : ""}` : `Vote ${o}`}>
              {voted && <span className="fill" style={{ width: `${pct}%` }} aria-hidden="true" />}
              <span style={{ fontWeight: mine ? 700 : 500 }}>{o}</span>
              {voted ? <span className="figure small bold">{pct}%</span> : <Circle aria-hidden="true" style={{ width: 15, height: 15, color: "var(--pur-alt)", position: "relative" }} />}
            </button>
          );
        })}
      </div>
      <span className="tiny muted">
        {voted ? `Thanks for voting · ${total} ${total === 1 ? "vote" : "votes"}` : total === 0 ? "Tap an option to vote · be the first" : `Tap an option to vote · ${total} ${total === 1 ? "vote" : "votes"} so far`}
      </span>
    </section>
  );
}

export default function SessionLive() {
  const { id: raw } = useParams();
  const [params] = useSearchParams();
  const id = decodeURIComponent(raw);
  const a = useStore(auth);
  const c = useStore(cms);
  const ct = useStore(content);
  const now = useNow(15000);
  const [tab, setTab] = useState(params.get("qa") === "1" ? "qa" : "polls");
  const [results, setResults] = useState({});
  const [questions, setQuestions] = useState(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [round, setRound] = useState(0);
  const session = sessionById(id, c);
  const flags = liveFlags(ct);
  const guest = !isSignedIn(a);
  const polls = useMemo(() => (session ? pollsFor(session, c) : []), [session, c]);
  const tabs = session ? ["polls", "qa"].filter((t) => (t === "polls" ? pollsOn(session, flags) : qaOn(session, flags))) : [];
  const shown = tabs.includes(tab) ? tab : tabs[0];
  const open = session && (isLiveWindow(session, now) || clockFaked());

  usePolling(async () => {
    if (!session || !open || guest) return;
    setRound((r) => r + 1);
    if (round % 5 === 4) refreshContent({ force: true });
    if (tabs.includes("qa")) {
      try { setQuestions(await get(`social/sessions/${encodeURIComponent(session.id)}/questions`)); } catch { setQuestions((q) => q || []); }
    }
    if (tabs.includes("polls")) {
      for (const p of polls) {
        try {
          const r = await get(`social/sessions/${encodeURIComponent(session.id)}/polls/${encodeURIComponent(p.id)}/results?options=${p.options.length}`);
          setResults((x) => ({ ...x, [p.id]: r }));
        } catch { /* next round */ }
      }
    }
  }, 6000, [session?.id, open, guest, tabs.join(","), polls.length]);

  if (!session) return <div className="page"><TopBar title="Live" />{c.loaded ? <Empty icon={BarChart3} title="Session not found" /> : <Spinner />}</div>;

  const vote = async (poll, i) => {
    try {
      const r = await post(`social/sessions/${encodeURIComponent(session.id)}/polls/${encodeURIComponent(poll.id)}/vote`, { optionIndex: i, options: poll.options.length });
      setResults((x) => ({ ...x, [poll.id]: r }));
    } catch (e) { showAlert("Couldn't vote", e.message); }
  };
  const upvote = async (q) => {
    if (guest) { showAlert("Sign up to upvote", "Sign in to vote questions up."); return; }
    setQuestions((list) => list.map((x) => (x.id === q.id ? { ...x, upvotedByMe: !x.upvotedByMe, upvotes: x.upvotes + (x.upvotedByMe ? -1 : 1) } : x)));
    try {
      const r = await post(`social/sessions/questions/${encodeURIComponent(q.id)}/upvote`, {});
      setQuestions((list) => list.map((x) => (x.id === q.id ? r : x)));
    } catch (e) { showAlert("Couldn't upvote", e.message); }
  };
  const ask = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const q = await post(`social/sessions/${encodeURIComponent(session.id)}/questions`, { body });
      setQuestions((list) => [q, ...(list || []).filter((x) => x.id !== q.id)]);
      setDraft("");
      if (q.status === "held" || q.status === "rejected") showAlert("Question held", "It'll show once the moderator has reviewed it.");
    } catch (err) { showAlert("Couldn't send", err.message); } finally { setSending(false); }
  };

  const room = roomOf(session.stage);
  const visibleQs = (questions || []).filter((q) => q.status === "approved" || q.sentByMe)
    .sort((x, y) => y.upvotes - x.upvotes || Date.parse(y.createdAt) - Date.parse(x.createdAt));
  const mins = minutesUntilLive(session, now);

  return (
    <div className="chat-page">
      <TopBar title="Live" right={<IconButton icon={QrCode} label="Show on-stage QR" onClick={() => setShowQR(true)} />} />
      <div className="column pad stack-sm" style={{ paddingTop: 12 }}>
        <div className="card card--tight stack-sm">
          <span className="eyebrow row" style={{ gap: 6, color: open ? undefined : "var(--tx2)" }}>{open ? <><span className="live-dot" aria-hidden="true" />Live now</> : "Not yet open"}</span>
          <b style={{ fontSize: 16 }}>{session.title}</b>
          <span className="tiny muted">{timeRange(session)}{room ? ` · ${room}` : ""}</span>
        </div>
        {tabs.length > 1 && open && <Segmented label="Live" value={shown} onChange={setTab} options={[{ value: "polls", label: "Polls" }, { value: "qa", label: "Q&A" }]} />}
      </div>
      <main id="main" className="column pad stack" style={{ flex: 1, paddingTop: 12, paddingBottom: 16 }} aria-live="polite">
        {tabs.length === 0 ? (
          <Empty icon={PauseCircle} title="Polls and Q&A are closed">The organisers have paused them for now.</Empty>
        ) : !open ? (
          <Empty icon={ClockAlert} title="Polls open 10 minutes before the session">
            {mins > 0 ? `Opens in ${mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`} · ${dayLabel(session)} ${session.startTime}` : "This session's live window has closed."}
          </Empty>
        ) : guest && !questions && shown === "qa" ? (
          <Empty icon={MessageSquareQuote} title="Sign in to see the questions">Questions with the most upvotes reach the moderator first.</Empty>
        ) : shown === "polls" ? (
          polls.length === 0 ? <Empty icon={BarChart3} title="No polls for this session">The moderator hasn't put a question on screen yet.</Empty> : (
            <>
              {polls.map((p) => <PollCard key={p.id} poll={p} result={results[p.id]} guest={guest} onVote={(i) => vote(p, i)} />)}
              <p className="tiny muted center" style={{ margin: 0 }}>{guest ? "Sign in to vote and see live results." : "Live results from everyone in the room."}</p>
            </>
          )
        ) : questions === null ? <Spinner /> : visibleQs.length === 0 ? (
          <Empty icon={MessageSquareQuote} title="Ask the first question">Questions with the most upvotes reach the moderator first.</Empty>
        ) : visibleQs.map((q) => (
          <div key={q.id} className="question">
            <button type="button" className="upvote pressable" aria-pressed={!!q.upvotedByMe} onClick={() => upvote(q)} aria-label={`${q.upvotedByMe ? "Remove your upvote" : "Upvote"}, ${q.upvotes}`}>
              <Triangle aria-hidden="true" /><span className="figure">{q.upvotes}</span>
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row" style={{ gap: 6 }}>
                <b className="small">{q.authorName}</b>
                {q.status === "rejected" || q.status === "held" ? <span className="tiny bold" style={{ color: "var(--red)" }}>Held</span> : q.sentByMe ? <span className="tiny bold" style={{ color: "var(--pur-alt)" }}>You</span> : null}
                <span className="spacer" /><time className="tiny muted">{timeAgo(q.createdAt)}</time>
              </div>
              <div className="small" style={{ overflowWrap: "anywhere", color: q.status === "rejected" ? "var(--tx2)" : undefined }}>{q.body}</div>
            </div>
          </div>
        ))}
      </main>
      {open && shown === "qa" && tabs.includes("qa") && (
        <form className="composer-bar column" onSubmit={ask}>
          <input className="input" value={draft} maxLength={600} disabled={guest} onChange={(e) => setDraft(e.target.value)} placeholder={guest ? "Sign up to ask a question" : "Ask the speakers…"} aria-label="Ask the speakers" />
          <IconButton icon={sending ? CircleCheck : ArrowUp} label="Submit question" filled type="submit" disabled={!draft.trim() || sending || guest} />
        </form>
      )}
      {showQR && (
        <Sheet open onClose={() => setShowQR(false)} title="Scan to join the poll">
          <div className="sheet-body stack" style={{ alignItems: "center", textAlign: "center" }}>
            <b>{session.title}</b>
            <div className="pass-qr"><QRCodeSVG value={sessionLivePayload(session.id)} size={240} level="M" marginSize={0} /></div>
            <span className="tiny muted figure">{sessionLivePayload(session.id)}</span>
            <p className="small muted" style={{ margin: 0 }}>Put this on the room screen. Attendees point their TTFC app's scanner at it and land on this session's polls.</p>
          </div>
        </Sheet>
      )}
    </div>
  );
}
