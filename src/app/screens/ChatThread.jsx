import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowUp, Flag, Hand, MoreHorizontal } from "lucide-react";
import { useStore } from "../lib/store";
import { auth, firstName } from "../lib/auth";
import { blockUser, canMessage, connectionWith, fetchPerson, markChatRead, refreshMessages, report, sendMessage, social } from "../lib/social";
import { fileURL } from "../lib/config";
import { confirmDialog, showAlert, usePolling } from "../lib/ui";
import { Avatar, IconButton, Spinner, TopBar } from "../components/ui";
import { KindBadge } from "../components/People";

/* =========================================================
   1:1 chat (iOS ChatThreadView): pulled on open, then every
   5 s while it's on screen. You don't need an accepted
   connection unless staff switched their messages off.
========================================================= */

const dayFmt = (d) => new Date(d).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
const timeFmt = (d) => new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export default function ChatThread() {
  const { userId } = useParams();
  const id = decodeURIComponent(userId);
  const a = useStore(auth);
  const s = useStore(social);
  const [peer, setPeer] = useState(() => s.people.find((p) => p.id === id) || s.threads.find((t) => t.user?.id === id)?.user || null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [menu, setMenu] = useState(false);
  const bottom = useRef(null);
  const messages = s.messages[id];

  useEffect(() => {
    if (peer) return undefined;
    let alive = true;
    fetchPerson(id).then((p) => { if (alive) setPeer(p); }).catch(() => {});
    return () => { alive = false; };
  }, [id, peer]);

  usePolling(() => refreshMessages(id), 5000, [id]);
  useEffect(() => () => markChatRead(id), [id]);
  useLayoutEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [messages?.length]);

  const conn = connectionWith(id, s);
  const name = peer?.name || "Chat";
  const given = firstName(name);
  const locked = peer && !canMessage(peer, s) && !s.blocked.includes(id);
  const blocked = s.blocked.includes(id);

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

  const doReport = async () => {
    setMenu(false);
    const ok = await confirmDialog({ title: `Report ${name}?`, message: "The TTFC team reviews reports within 24 hours during the event.", confirm: "Report", destructive: true });
    if (ok && (await report("user", id))) showAlert("Thanks for telling us", "The TTFC team will review it.");
  };
  const doBlock = async () => {
    setMenu(false);
    const ok = await confirmDialog({ title: `Block ${name}?`, message: "You won't see each other's posts or messages.", confirm: `Block ${given}`, destructive: true });
    if (ok && (await blockUser(id))) showAlert(`${name} is blocked`);
  };

  let lastDay = "";
  return (
    <div className="chat-page">
      <TopBar
        title={
          <Link to={`/people/${encodeURIComponent(id)}`} className="row" style={{ justifyContent: "center", gap: 8, color: "inherit", textDecoration: "none" }}>
            <Avatar name={name} src={fileURL(peer?.avatarUrl)} size={30} />
            <span style={{ minWidth: 0, textAlign: "left" }}>
              <span className="ellipsis" style={{ display: "block", fontSize: 15 }}>{name}</span>
              <span className="tiny muted ellipsis" style={{ display: "block", fontWeight: 500 }}>{[peer?.organization, conn?.status === "accepted" ? (conn.conn.kind === "inPerson" ? "Met in person" : "Online") : "Not connected yet"].filter(Boolean).join(" · ")}</span>
            </span>
          </Link>
        }
        right={
          <div style={{ position: "relative" }}>
            <IconButton icon={MoreHorizontal} label="More options" onClick={() => setMenu((v) => !v)} aria-expanded={menu} />
            {menu && (
              <div className="menu" role="menu" style={{ top: 44, right: 0 }}>
                <button type="button" role="menuitem" onClick={doReport}><Flag aria-hidden="true" width={16} />Report {given}</button>
                <button type="button" role="menuitem" className="danger" onClick={doBlock}><Hand aria-hidden="true" width={16} />Block {given}</button>
              </div>
            )}
          </div>
        }
      />
      <main id="main" className="column bubbles" aria-live="polite" aria-label={`Messages with ${name}`}>
        {conn?.status === "accepted" && <div className="center"><KindBadge kind={conn.conn.kind} /></div>}
        {messages === undefined ? <Spinner /> : messages.length === 0 ? (
          <p className="muted center small" style={{ margin: "30px 0" }}>Say hello to {given}. They'll see your message in the TTFC app.</p>
        ) : messages.map((m) => {
          const day = dayFmt(m.createdAt);
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <div key={m.id} style={{ display: "contents" }}>
              {showDay && <div className="tiny muted center" style={{ margin: "6px 0" }}>{day}</div>}
              <div className={"bubble" + (m.sentByMe ? " bubble--mine" : "")}>
                {m.body}
                <time dateTime={m.createdAt}>{timeFmt(m.createdAt)}{m.status === "held" ? " · Held for review" : ""}</time>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </main>
      {blocked ? (
        <p className="composer-bar small muted" style={{ justifyContent: "center" }}>You blocked {given}.</p>
      ) : locked ? (
        <p className="composer-bar small muted" style={{ justifyContent: "center" }}>{given} isn't taking messages in the app.</p>
      ) : (
        <form className="composer-bar column" onSubmit={send}>
          <textarea className="input" rows={1} value={draft} maxLength={2000} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) { e.preventDefault(); send(); } }}
            placeholder={`Message ${given}…`} aria-label={`Message ${given}`} disabled={!a.me && !peer} />
          <IconButton icon={ArrowUp} label="Send message" filled type="submit" disabled={!draft.trim() || sending} />
        </form>
      )}
    </div>
  );
}
