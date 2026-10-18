import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowUp, Bell, BellOff, CornerDownRight, MessagesSquare, X } from "lucide-react";
import { useStore } from "../lib/store";
import { auth, can, isSignedIn } from "../lib/auth";
import { followDiscussion, refreshDiscussions, refreshReplies, replyToDiscussion, social } from "../lib/social";
import { shortTopic } from "../lib/config";
import { timeAgo } from "../lib/time";
import { showAlert } from "../lib/ui";
import { Avatar, Button, Empty, IconButton, Spinner, TopBar } from "../components/ui";

/* A discussion with threaded replies and Follow (iOS DiscussionDetailView). */

function Reply({ r, depth, all, allowed, onReply }) {
  const kids = all.filter((x) => x.parentId === r.id);
  return (
    <div className="stack-sm" style={{ marginLeft: depth ? 22 : 0 }}>
      <div className="comment">
        {depth > 0 && <CornerDownRight aria-hidden="true" style={{ width: 14, height: 14, color: "var(--tx2)", flex: "none", marginTop: 8 }} />}
        <Avatar name={r.authorName} size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="comment-bubble">
            <div className="row" style={{ gap: 6 }}><b className="small">{r.authorName}</b>{r.mine && <span className="tiny bold" style={{ color: "var(--pur-alt)" }}>You</span>}<span className="spacer" /><time className="tiny muted">{timeAgo(r.createdAt)}</time></div>
            <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{r.body}</div>
          </div>
          {allowed && <button type="button" className="link-btn" style={{ minHeight: 32, padding: "2px 12px", fontSize: 12.5 }} onClick={() => onReply(r)}>Reply</button>}
        </div>
      </div>
      {kids.map((c) => <Reply key={c.id} r={c} depth={Math.min(depth + 1, 3)} all={all} allowed={allowed} onReply={onReply} />)}
    </div>
  );
}

export default function DiscussionDetail() {
  const { id: raw } = useParams();
  const id = decodeURIComponent(raw);
  const a = useStore(auth);
  const s = useStore(social);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);
  const d = s.discussions.find((x) => x.id === id);
  const replies = s.replies[id];

  useEffect(() => { if (!d) refreshDiscussions(); refreshReplies(id); }, [id, d]);

  if (!d) return <div className="page"><TopBar title="Discussion" />{s.discussionsLoaded ? <Empty icon={MessagesSquare} title="Discussion not found" /> : <Spinner />}</div>;

  const allowed = isSignedIn(a) && can("comment", a);
  const top = (replies || []).filter((r) => !r.parentId);
  const send = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const r = await replyToDiscussion(id, body, replyTo?.id);
      setDraft(""); setReplyTo(null);
      if (r.status === "held" || r.status === "rejected") showAlert("Reply held", "It'll appear once the TTFC team has reviewed it.");
    } catch (err) { showAlert("Couldn't send", err.message); } finally { setSending(false); }
  };

  return (
    <div className="chat-page">
      <TopBar title="Discussion" right={isSignedIn(a) && (
        <IconButton icon={d.following ? BellOff : Bell} label={d.following ? "Stop following" : "Follow"} onClick={() => followDiscussion(d, !d.following)} />
      )} />
      <main id="main" className="column pad stack" style={{ paddingTop: 14, paddingBottom: 20, flex: 1 }}>
        <div className="row" style={{ gap: 8 }}><Avatar name={d.authorName} size={30} /><b className="small">{d.authorName}</b><span className="tiny muted">{timeAgo(d.createdAt)}</span>{d.status === "pending" && <span className="kicker kicker--gold">Pending review</span>}</div>
        <h1 style={{ fontSize: 21, margin: 0, lineHeight: 1.25 }}>{d.title}</h1>
        <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{d.body}</p>
        <div className="row wrap" style={{ gap: 6 }}>{(d.tags || []).map((t) => <span key={t} className="tag" style={{ fontSize: 11 }}>{shortTopic(t)}</span>)}</div>
        {isSignedIn(a) && <Button size="sm" icon={Bell} variant={d.following ? undefined : "primary"} aria-pressed={!!d.following} onClick={() => followDiscussion(d, !d.following)} style={{ alignSelf: "flex-start" }}>{d.following ? "Following" : "Follow"}{d.followerCount ? ` · ${d.followerCount}` : ""}</Button>}
        <hr className="hairline" />
        <h2 className="section-title">{d.replyCount === 1 ? "1 reply" : `${d.replyCount || 0} replies`}</h2>
        {replies === undefined ? <Spinner /> : top.length === 0 ? <p className="muted small" style={{ margin: 0 }}>No replies yet. Add the first one.</p> : top.map((r) => <Reply key={r.id} r={r} depth={0} all={replies} allowed={allowed} onReply={setReplyTo} />)}
      </main>
      {allowed && d.status === "approved" ? (
        <form className="composer-bar column" onSubmit={send} style={{ flexDirection: "column", alignItems: "stretch" }}>
          {replyTo && <div className="row tiny bold" style={{ color: "var(--pur-alt)" }}><span style={{ flex: 1 }}>Replying to {replyTo.mine ? "yourself" : replyTo.authorName}</span><IconButton icon={X} label="Cancel reply" small onClick={() => setReplyTo(null)} /></div>}
          <div className="row" style={{ alignItems: "flex-end" }}>
            <textarea className="input" rows={1} value={draft} maxLength={2000} onChange={(e) => setDraft(e.target.value)} placeholder={replyTo ? "Write your reply…" : "Add to the discussion…"} aria-label="Write a reply" />
            <IconButton icon={ArrowUp} label="Send reply" filled type="submit" disabled={!draft.trim() || sending} />
          </div>
        </form>
      ) : !isSignedIn(a) ? <p className="composer-bar small muted" style={{ justifyContent: "center" }}>Sign up to reply</p> : null}
    </div>
  );
}
