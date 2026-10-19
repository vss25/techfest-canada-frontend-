import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowUp, Bell, CircleX, Loader2, MessagesSquare, Reply } from "lucide-react";
import { useStore } from "../lib/store";
import { auth, can, isSignedIn } from "../lib/auth";
import { followDiscussion, refreshDiscussions, refreshReplies, replyToDiscussion, social } from "../lib/social";
import { listTime } from "../lib/time";
import { safetyItems } from "../lib/safety";
import { typingChanged, typingSent } from "../lib/typing";
import { showAlert } from "../lib/ui";
import { Avatar, Empty, Spinner, TopBar } from "../components/ui";
import { MoreMenu } from "../components/Safety";
import { ChatBubble, TypingIndicator } from "../components/ChatBubble";

/* =========================================================
   A discussion (iOS DiscussionDetailView): the question as a
   card, replies as chat bubbles (answers to a reply indented
   once, deeper ones quoting who they answer), Follow in the
   bar and the typing line over the composer.
========================================================= */

export default function DiscussionDetail() {
  const { id: raw } = useParams();
  const id = decodeURIComponent(raw);
  const a = useStore(auth);
  const s = useStore(social);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);
  const input = useRef(null);
  const d = s.discussions.find((x) => x.id === id);
  const all = s.replies[id];
  const signedIn = isSignedIn(a);

  useEffect(() => { if (!d) refreshDiscussions(); refreshReplies(id); }, [id, d]);

  if (!d) return <div className="page"><TopBar title="Discussion" />{s.discussionsLoaded || !signedIn ? <Empty icon={MessagesSquare} title="Discussion not found" /> : <Spinner />}</div>;

  // Others' held replies and blocked authors stay hidden.
  const replies = (all || []).filter((r) => (r.status !== "held" || r.mine) && !s.blocked.includes(r.authorId));
  const byId = new Map(replies.map((r) => [r.id, r]));
  const parentOf = (r) => (r.parentId ? byId.get(r.parentId) || null : null);
  const top = replies.filter((r) => !r.parentId || !parentOf(r));
  const kidsOf = (r) => replies.filter((x) => x.parentId === r.id && x.id !== r.id);
  const allowed = signedIn && can("comment", a);

  const startReply = (r) => { setReplyTo(r); setTimeout(() => input.current?.focus(), 30); };
  const thread = (r, depth) => {
    const kids = kidsOf(r);
    const parent = parentOf(r);
    return (
      <div key={r.id} className="stack-sm">
        <ChatBubble text={r.body} mine={r.mine} author={r.mine ? null : r.authorName} timestamp={r.createdAt} held={r.status === "held"}
          quote={depth > 1 && parent ? `${parent.authorName}: ${parent.body}` : null}
          onReply={signedIn ? () => startReply(r) : null}
          menu={r.mine || !signedIn ? null : safetyItems({ type: "reply", id: r.id, authorId: r.authorId, authorName: r.authorName })} />
        {kids.length > 0 && <div className={depth === 0 ? "reply-kids" : "stack-sm"}>{kids.map((k) => thread(k, depth + 1))}</div>}
      </div>
    );
  };

  const send = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending || !allowed) return;
    setSending(true);
    try {
      const r = await replyToDiscussion(id, body, replyTo?.id);
      setDraft(""); setReplyTo(null); typingSent("discussion", id);
      if (r.status === "held" || r.status === "rejected") showAlert("Reply held", "Our moderation check held this reply for review. Only you can see it for now.");
    } catch (err) { showAlert("Couldn't reply", err?.message || "Check your connection and try again."); } finally { setSending(false); }
  };

  const follow = signedIn ? (
    <button type="button" className={"glass-btn follow-btn pressable" + (d.following ? " follow-btn--on" : "")} onClick={() => followDiscussion(d, !d.following)}
      aria-description={d.following ? "Stops reply updates" : "Get an update when someone replies"}>
      <Bell aria-hidden="true" />{d.following ? "Following" : "Follow"}
    </button>
  ) : null;

  return (
    <div className="chat-page">
      <TopBar title="Discussion" right={follow} />
      <main id="main" className="column stack" style={{ padding: 16, gap: 14, flex: 1 }}>
        <article className="q-card">
          <div className="row" style={{ gap: 10 }}>
            <Avatar name={d.authorName} size={36} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <b style={{ display: "block", fontSize: 13, fontWeight: 600 }}>{d.authorName}</b>
              <time className="muted" style={{ fontSize: 11 }}>{listTime(d.createdAt)}</time>
            </span>
            {!d.mine && signedIn && <MoreMenu label="More options" buttonClassName="dots-btn pressable" items={safetyItems({ type: "discussion", id: d.id })} />}
          </div>
          <h1 className="q-title">{d.title}</h1>
          <p className="q-body">{d.body}</p>
          {(d.tags || []).length > 0 && <div className="chips chips--wrap" style={{ gap: 6 }}>{d.tags.map((t) => <span key={t} className="chip">{t}</span>)}</div>}
        </article>
        <h2 className="list-label">{replies.length === 0 ? "No replies yet" : `${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}</h2>
        {all === undefined ? <Spinner /> : top.map((r) => thread(r, 0))}
      </main>
      <div className="composer-wrap">
        <TypingIndicator scope="discussion" id={id} />
        {replyTo && (
          <div className="replying">
            <Reply aria-hidden="true" />
            <b>Replying to {replyTo.mine ? "yourself" : replyTo.authorName}</b>
            <span className="ellipsis">{replyTo.body}</span>
            <button type="button" className="replying-x pressable" aria-label="Cancel reply" onClick={() => setReplyTo(null)}><CircleX aria-hidden="true" /></button>
          </div>
        )}
        <form className="composer-bar column" onSubmit={send}>
          <textarea ref={input} className="input" rows={1} value={draft} maxLength={2000} disabled={!allowed}
            placeholder={!signedIn ? "Sign up to reply" : replyTo ? "Write your reply…" : "Add to the discussion…"} aria-label="Write a reply"
            onChange={(e) => { setDraft(e.target.value); typingChanged("discussion", id, e.target.value); }} />
          <button type="submit" className="icon-btn icon-btn--filled pressable" aria-label="Send reply" disabled={!draft.trim() || sending || !allowed}>
            {sending ? <Loader2 aria-hidden="true" style={{ animation: "spin .8s linear infinite" }} /> : <ArrowUp aria-hidden="true" />}
          </button>
        </form>
      </div>
    </div>
  );
}
