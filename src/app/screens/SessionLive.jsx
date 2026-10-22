import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowUp, BarChart3, ChartColumn, Circle, CirclePause, ClockAlert, Loader2, MessagesSquare, QrCode, Triangle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useStore } from "../lib/store";
import { auth, isSignedIn } from "../lib/auth";
import { cms, dayLabel, isLiveWindow, minutesUntilLive, pollsFor, pollsOn, qaOn, roomOf, sessionById, timeRange } from "../lib/cms";
import { content, liveFlags, refreshContent } from "../lib/content";
import { get, post } from "../lib/api";
import { clockFaked, listTime } from "../lib/time";
import { sessionLivePayload } from "../lib/qr";
import { showAlert, useNow, usePolling } from "../lib/ui";
import { reportFlow } from "../lib/safety";
import { IconButton, Segmented, Sheet, Spinner, TopBar } from "../components/ui";
import { guestAlert } from "../lib/passes";
import { ShareOnLinkedIn } from "../components/LinkedInCta";

/* =========================================================
   In-session participation (iOS SessionLiveView): spot polls
   and audience Q&A, open from 10 minutes before the session to
   10 minutes after it. Results and questions refresh every 6 s;
   the organisers' switches every ~30 s.
========================================================= */

/** A full-screen state (switched off, closed) or a small empty block (iOS closedState / emptyBlock). */
function LiveState({ icon, title, children, small }) {
  const Icon = icon;
  return (
    <div className={small ? "live-state live-state--small" : "live-state"}>
      <Icon aria-hidden="true" />
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}

function PollCard({ poll, result, onVote, guest, sessionId }) {
  const counts = result?.counts?.length === poll.options.length ? result.counts : poll.options.map(() => 0);
  const myVote = result?.myVote ?? null;
  const voted = myVote !== null && myVote !== undefined;
  const total = counts.reduce((a, b) => a + b, 0);
  return (
    <section className="card poll-card" aria-label={poll.question}>
      <span className="eyebrow">Spot poll</span>
      <h2>{poll.question}</h2>
      {poll.options.map((o, i) => {
        const pct = voted ? Math.round((counts[i] / Math.max(1, total)) * 100) : 0;
        const mine = myVote === i;
        return (
          <button key={o} type="button" className={"poll-opt pressable" + (mine ? " poll-opt--mine" : "")} disabled={voted} aria-pressed={mine}
            onClick={() => (guest ? guestAlert("Get a pass to vote", "live") : onVote(i))}
            aria-label={voted ? `${o}, ${pct}%${mine ? ", your vote" : ""}` : `Vote ${o}`}>
            {voted && <span className="fill" style={{ width: `${pct}%` }} aria-hidden="true" />}
            <span className="poll-opt-label">{o}</span>
            {voted ? <span className="poll-opt-pct figure">{pct}%</span> : <Circle aria-hidden="true" className="poll-opt-circle" />}
          </button>
        );
      })}
      <span className="poll-foot">
        {voted ? `Thanks for voting · ${total} ${total === 1 ? "vote" : "votes"}` : total === 0 ? "Tap an option to vote · be the first" : `Tap an option to vote · ${total} ${total === 1 ? "vote" : "votes"} so far`}
      </span>
      {/* The results, on LinkedIn (Oct 22 2026): once you've voted and can see them. */}
      {voted && !guest && <ShareOnLinkedIn item={{ kind: "poll", id: poll.id, sessionId, question: poll.question, options: poll.options }} small label="Share results on LinkedIn" />}
    </section>
  );
}

export default function SessionLive() {
  const { id: raw } = useParams();
  const [params] = useSearchParams();
  const id = decodeURIComponent(raw);
  const navigate = useNavigate();
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

  if (!session) return <div className="page"><TopBar title="Live" />{c.loaded ? <LiveState icon={BarChart3} title="Session not found">The agenda may have changed. Check the Schedule for the latest times.</LiveState> : <Spinner />}</div>;

  const vote = async (poll, i) => {
    try {
      const r = await post(`social/sessions/${encodeURIComponent(session.id)}/polls/${encodeURIComponent(poll.id)}/vote`, { optionIndex: i, options: poll.options.length });
      setResults((x) => ({ ...x, [poll.id]: r }));
    } catch (e) { showAlert("Couldn't vote", e.message); }
  };
  const upvote = async (q) => {
    if (guest) { guestAlert("Get a pass to upvote questions", "live"); return; }
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
      if (q.status === "held" || q.status === "rejected") showAlert("Question held", "Your message was held by our moderation check and won't be shown to other attendees.");
    } catch (err) { showAlert("Couldn't send", err?.message || "Check your connection and try again."); } finally { setSending(false); }
  };

  const room = roomOf(session.stage);
  const visibleQs = (questions || []).filter((q) => q.status === "approved" || q.sentByMe)
    .sort((x, y) => y.upvotes - x.upvotes || Date.parse(y.createdAt) - Date.parse(x.createdAt));
  const mins = minutesUntilLive(session, now);

  const done = () => { if (window.history.state && window.history.state.idx > 0) navigate(-1); else navigate(`/session/${encodeURIComponent(session.id)}`); };
  const paused = !(flags.polls || flags.qa);

  return (
    <div className="chat-page">
      <TopBar title="Live" left={<IconButton icon={QrCode} label="Show on-stage QR" onClick={() => setShowQR(true)} />}
        right={<button type="button" className="link-btn sheet-action" onClick={done}>Done</button>} />
      <div className="column live-head">
        <span className="live-status"><span className={"live-status-dot" + (open ? " on" : "")} aria-hidden="true" />{open ? "Live now" : "Not yet open"}</span>
        <b className="live-title">{session.title}</b>
        <span className="live-when">{timeRange(session)}{room ? ` · ${room}` : ""}</span>
      </div>
      {tabs.length > 1 && open && <div className="column" style={{ padding: 16 }}><Segmented capsule label="Live" value={shown} onChange={setTab} options={[{ value: "polls", label: "Polls" }, { value: "qa", label: "Q&A" }]} /></div>}
      <main id="main" className="column live-body" aria-live="polite">
        {tabs.length === 0 ? (
          <LiveState icon={CirclePause} title={paused ? "Polls and Q&A are closed" : "No polls or Q&A for this session"}>
            {paused ? "The organisers have paused them for now." : "They run in the moderated sessions. Check the schedule for the next one."}
          </LiveState>
        ) : !open ? (
          <LiveState icon={ClockAlert} title="Polls open 10 minutes before the session">
            {mins > 0 ? `Opens in ${mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`} · ${dayLabel(session)} ${session.startTime}` : "This session's live window has closed."}
          </LiveState>
        ) : shown === "polls" ? (
          polls.length === 0 ? <LiveState small icon={ChartColumn} title="No polls for this session">The moderator hasn't put a question on screen yet.</LiveState> : (
            <>
              {polls.map((p) => <PollCard key={p.id} poll={p} result={results[p.id]} guest={guest} sessionId={session.id} onVote={(i) => vote(p, i)} />)}
              <p className="poll-note">{guest ? "Results are simulated until you sign in. Your vote is stored on this device." : "Live results from everyone in the room."}</p>
            </>
          )
        ) : guest && !questions ? (
          // Guests can't read the room's questions (the API needs an account); no sample questions are made up.
          <LiveState small icon={MessagesSquare} title="Sign in to see the questions">Questions with the most upvotes reach the moderator first.</LiveState>
        ) : questions === null ? <Spinner /> : visibleQs.length === 0 ? (
          <LiveState small icon={MessagesSquare} title="Ask the first question">Questions with the most upvotes reach the moderator first.</LiveState>
        ) : visibleQs.map((q) => <QuestionRow key={q.id} q={q} onUpvote={() => upvote(q)} />)}
      </main>
      {open && shown === "qa" && tabs.includes("qa") && (
        <form className="composer-bar composer-bar--line column" onSubmit={ask}>
          <input className="input" value={draft} maxLength={600} disabled={guest} onChange={(e) => setDraft(e.target.value)} placeholder={guest ? "Get a pass to ask a question" : "Ask the speakers…"} aria-label="Ask the speakers" />
          <button type="submit" className="icon-btn icon-btn--filled pressable" aria-label="Submit question" disabled={!draft.trim() || sending || guest}>
            {sending ? <Loader2 aria-hidden="true" style={{ animation: "spin .8s linear infinite" }} /> : <ArrowUp aria-hidden="true" />}
          </button>
        </form>
      )}
      {showQR && (
        <Sheet open onClose={() => setShowQR(false)}>
          <div className="sheet-body stage-qr">
            <span className="eyebrow">Scan to join the poll</span>
            <b className="stage-qr-title">{session.title}</b>
            <div className="pass-qr"><QRCodeSVG value={sessionLivePayload(session.id)} size={260} level="M" marginSize={0} /></div>
            <span className="figure stage-qr-url">{sessionLivePayload(session.id)}</span>
            <p>Put this on the room screen. Attendees point their camera at it; the app opens on this session's polls.</p>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/** iOS QuestionRow: the upvote tile, author, time, the question; long-press to report. */
function QuestionRow({ q, onUpvote }) {
  const held = q.status === "rejected" || q.status === "held";
  return (
    <div className="question">
      <button type="button" className="upvote pressable" aria-pressed={!!q.upvotedByMe} onClick={onUpvote} aria-label={`${q.upvotedByMe ? "Remove your upvote" : "Upvote"}, ${q.upvotes}`}>
        <Triangle aria-hidden="true" /><span className="figure">{q.upvotes}</span>
      </button>
      <div style={{ flex: 1, minWidth: 0 }} onContextMenu={q.sentByMe ? undefined : (e) => { e.preventDefault(); reportFlow("question", q.id); }}>
        <div className="row" style={{ gap: 6 }}>
          <b className="q-author">{q.authorName}</b>
          {held ? <span className="q-tag" style={{ color: "var(--red)" }}>Held</span> : q.sentByMe ? <span className="q-tag" style={{ color: "var(--pur-alt)" }}>You</span> : null}
          <span className="spacer" /><time className="row-time">{listTime(q.createdAt)}</time>
        </div>
        <div className="q-text" style={held ? { color: "var(--tx2)" } : undefined}>{q.body}</div>
      </div>
    </div>
  );
}
