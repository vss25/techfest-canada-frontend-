import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { useStore } from "../lib/store";
import { auth, can, isSignedIn } from "../lib/auth";
import { addComment, fetchComments, social } from "../lib/social";
import { avatarFor } from "../lib/avatar.js";
import { fileURL } from "../lib/config";
import { listTime } from "../lib/time";
import { cms } from "../lib/cms";
import { FEATURES } from "../lib/config";
import { insertMention, keptMentions, mentionPath, mentionQuery, mentionSuggestions, splitMentions } from "../lib/mentions";
import { useMentionCandidates } from "../lib/useMentionCandidates";
import { MentionList } from "./Mentions";
import { showAlert } from "../lib/ui";
import { Avatar, IconButton, Sheet, Spinner } from "./ui";

/* Replies on a post (iOS CommentsSheet). Each reply shows the photo the server sends with it, else the
   author's photo from People (lib/avatar.js). A reply to a post that's gone says so (lib/social.js addComment).
   "@Name" tags someone as in the post composer (Oct 22 2026: the server tells them); tags in replies link. */

export default function Comments({ post, onClose }) {
  const a = useStore(auth);
  const [list, setList] = useState(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [gone, setGone] = useState(false);
  const [caret, setCaret] = useState(0);
  const [mentions, setMentions] = useState([]);
  const input = useRef(null);
  const s = useStore(social);
  const cm = useStore(cms);
  const candidates = useMentionCandidates();
  const suggestions = mentionSuggestions(candidates, mentionQuery(draft, caret));
  const tag = (x) => {
    const next = insertMention(draft, x.name, caret);
    setDraft(next);
    if (!mentions.some((m) => m.id === x.id)) setMentions((ms) => [...ms, { type: x.type, id: x.id, name: x.name }]);
    setTimeout(() => { const el = input.current; if (!el) return; el.focus(); el.setSelectionRange(next.length, next.length); setCaret(next.length); }, 30);
  };
  const signedIn = isSignedIn(a);
  const allowed = signedIn && can("comment", a);

  useEffect(() => {
    let alive = true;
    fetchComments(post.id).then((x) => { if (alive) setList(Array.isArray(x) ? x : []); }).catch(() => { if (alive) setList([]); });
    return () => { alive = false; };
  }, [post.id]);

  const send = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const c = await addComment(post.id, body, keptMentions(body, mentions));
      setList((xs) => [...(xs || []), c]);
      setDraft("");
      setMentions([]);
      if (c.status === "held" || c.status === "rejected") showAlert("Reply held", "It'll appear once the TTFC team has reviewed it.");
    } catch (err) {
      if (err?.data?.gone) { setGone(true); showAlert("This post isn't available any more."); }
      else showAlert("Couldn't send", err.message);
    } finally { setSending(false); }
  };

  return (
    <Sheet open onClose={onClose} title="Replies" full>
      <div className="sheet-body stack" style={{ flex: 1, overflow: "auto", paddingBottom: 12 }}>
        {list === null ? <Spinner /> : list.length === 0 ? (
          <p className="muted center" style={{ margin: "30px 0" }}>No replies yet — start the conversation.</p>
        ) : list.map((c) => (
          <div key={c.id} className="comment">
            <Avatar name={c.authorName} src={fileURL(avatarFor(c, s.people) || (c.authorId && c.authorId === a.me?.id ? a.me?.avatarUrl : ""))} size={32} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="comment-bubble">
                <div className="row" style={{ gap: 6 }}>
                  <b className="small">{c.authorName}</b>
                  {c.authorId === a.me?.id && <span className="tiny bold" style={{ color: "var(--pur-alt)" }}>You</span>}
                  {c.status === "rejected" || c.status === "held" ? <span className="tiny bold" style={{ color: "var(--red)" }}>Held</span> : null}
                </div>
                <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {splitMentions(c.body || "", c.mentions, s.people).map((part, i) => {
                    if (!part.mention) return <span key={i}>{part.text}</span>;
                    const to = part.mention.type === "speaker" || FEATURES.network ? mentionPath(part.mention, cm) : null;
                    return to ? <Link key={i} to={to} className="mention" onClick={onClose}>{part.text}</Link> : <span key={i} className="mention">{part.text}</span>;
                  })}
                </div>
              </div>
              <time className="tiny muted" dateTime={c.createdAt} style={{ marginLeft: 12 }}>{listTime(c.createdAt)}</time>
            </div>
          </div>
        ))}
      </div>
      {gone ? (
        <p className="small muted center pad">This post isn't available any more.</p>
      ) : signedIn && !allowed ? (
        <p className="small muted center pad">Your account can read replies here but can't add them.</p>
      ) : (
        <>
          {signedIn && <div className="comment-mentions"><MentionList suggestions={suggestions} onPick={tag} /></div>}
          <form className="composer-bar" onSubmit={send} style={{ position: "static" }}>
            <textarea ref={input} className="input" rows={1} value={draft} disabled={!signedIn}
              onChange={(e) => { setDraft(e.target.value); setCaret(e.target.selectionStart ?? e.target.value.length); }}
              onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? draft.length)}
              placeholder={signedIn ? "Write a reply… type @ to tag someone" : "Get a pass to reply"} aria-label="Write a reply" maxLength={2000} />
            <IconButton icon={ArrowUp} label="Send reply" filled type="submit" disabled={!draft.trim() || sending || !signedIn} />
          </form>
        </>
      )}
    </Sheet>
  );
}
