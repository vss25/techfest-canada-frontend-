import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { ArrowUp, CircleEllipsis, Flag, Hand, IdCard } from "lucide-react";
import { useStore } from "../lib/store";
import { auth } from "../lib/auth";
import { canMessage, connectionWith, fetchPerson, markChatRead, refreshMessages, sendMessage, social } from "../lib/social";
import { manageSharing } from "../lib/myCard";
import { blockFlow, reportFlow } from "../lib/safety";
import { fileURL } from "../lib/config";
import { givenName, showAlert, usePolling } from "../lib/ui";
import { Avatar, IconButton, Spinner, TopBar } from "../components/ui";
import { KindBadge } from "../components/People";
import { MoreMenu } from "../components/Safety";
import { ChatBubble } from "../components/ChatBubble";
import { receiptOf } from "../lib/receipts";

/* =========================================================
   1:1 chat (iOS ChatThreadView): who it's with under the bar,
   the bubbles with a relative time under each, a one-line
   composer. Pulled on open, then every 5 s while it's on
   screen (which also moves the ticks on your messages:
   sent, delivered, read). You don't need an accepted
   connection unless staff switched their messages off.
   Opened with { state: { draft } } (Home's "People to meet" › Book
   time, Oct 26 2026): the composer starts with that message, for
   them to change or send; nothing is sent by itself.
========================================================= */

export default function ChatThread() {
  const { userId } = useParams();
  const id = decodeURIComponent(userId);
  const a = useStore(auth);
  const s = useStore(social);
  const [peer, setPeer] = useState(() => s.people.find((p) => p.id === id) || s.threads.find((t) => t.user?.id === id)?.user || null);
  const location = useLocation();
  const [draft, setDraft] = useState(() => (typeof location.state?.draft === "string" ? location.state.draft.slice(0, 2000) : ""));
  const [sending, setSending] = useState(false);
  const bottom = useRef(null);
  const messages = s.messages[id];

  // Their name and photo from the server each time (the list's copy shows meanwhile).
  useEffect(() => {
    let alive = true;
    fetchPerson(id).then((p) => { if (alive && p) setPeer((cur) => ({ ...(cur || {}), ...p })); }).catch(() => {});
    return () => { alive = false; };
  }, [id]);

  // On screen and in front: a read (anything else would be a ?peek=1, lib/social.js).
  usePolling(() => refreshMessages(id, { open: true }), 5000, [id]);
  // Read when it opens, on each new message and when it closes (iOS ChatReadState).
  useEffect(() => { markChatRead(id); return () => markChatRead(id); }, [id]);
  useEffect(() => { if (messages?.length) markChatRead(id); }, [id, messages?.length]);
  useLayoutEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [messages?.length]);

  const conn = connectionWith(id, s);
  const name = peer?.name || "Chat";
  const given = givenName(name);
  const blocked = s.blocked.includes(id);
  const locked = peer && !blocked && !canMessage(peer, s);
  const sub = [peer?.organization, conn?.status === "accepted" ? (conn.conn.kind === "inPerson" ? "Met in person" : "Online") : "Not connected yet"].filter(Boolean).join(" · ");

  const send = async (e) => {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || sending || !peer) return;
    setSending(true);
    setDraft("");
    const ok = await sendMessage(peer, body);
    setSending(false);
    if (!ok) { setDraft(body); showAlert("Couldn't send", social.get().lastError || "Check your connection and try again."); }
  };

  const header = (
    <div className="chat-head">
      <Avatar name={name} src={fileURL(peer?.avatarUrl)} size={38} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <b className="ellipsis">{name}</b>
        <span className="sub ellipsis">{sub}</span>
      </span>
      {conn?.status === "accepted" && <KindBadge kind={conn.conn.kind} />}
    </div>
  );

  return (
    <div className="chat-page">
      <TopBar
        title=""
        below={header}
        right={
          <MoreMenu label="More options" icon={CircleEllipsis} items={[
            conn && { label: `What I share with ${given}`, icon: IdCard, onClick: () => manageSharing(peer || { id, name }, conn.conn) },
            { label: `Report ${given}`, icon: Flag, onClick: () => reportFlow("user", id) },
            { label: `Block ${given}`, icon: Hand, danger: true, onClick: () => blockFlow(id, name) },
          ]} />
        }
      />
      <main id="main" className="column bubbles" aria-live="polite" aria-label={`Messages with ${name}`}>
        {messages === undefined ? <Spinner /> : messages.map((m) => {
          const receipt = receiptOf(m);
          return <ChatBubble key={m.id} text={m.body} mine={m.sentByMe} timestamp={m.createdAt} held={receipt === "held"} receipt={receipt} />;
        })}
        <div ref={bottom} />
      </main>
      {blocked ? (
        <p className="composer-note">You blocked {given}.</p>
      ) : locked ? (
        <p className="composer-note">{given} isn't taking messages in the app.</p>
      ) : (
        <form className="composer-bar composer-bar--line column" onSubmit={send}>
          <input className="input" value={draft} maxLength={2000} onChange={(e) => setDraft(e.target.value)} enterKeyHint="send"
            placeholder={`Message ${given}…`} aria-label={`Message ${given}`} disabled={!a.me && !peer} />
          <IconButton icon={ArrowUp} label="Send message" filled type="submit" disabled={!draft.trim() || sending} />
        </form>
      )}
    </div>
  );
}
