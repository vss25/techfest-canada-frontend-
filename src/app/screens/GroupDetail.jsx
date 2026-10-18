import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowUp, LogOut, MoreHorizontal, Users } from "lucide-react";
import { useStore } from "../lib/store";
import { auth, isSignedIn } from "../lib/auth";
import { refreshGroupMessages, refreshGroups, sendGroupMessage, social, toggleJoinGroup } from "../lib/social";
import { shortTopic } from "../lib/config";
import { confirmDialog, showAlert, usePolling } from "../lib/ui";
import { Button, Empty, IconButton, Spinner, TopBar } from "../components/ui";

/* A group (iOS GroupDetailView): join to get its chat, refreshed every 6 s. */

const timeFmt = (d) => new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export default function GroupDetail() {
  const { id: raw } = useParams();
  const id = decodeURIComponent(raw);
  const a = useStore(auth);
  const s = useStore(social);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const bottom = useRef(null);
  const g = s.groups.find((x) => x.id === id);
  const messages = s.groupMessages[id];

  useEffect(() => { if (!g) refreshGroups(); }, [g]);
  usePolling(() => (g?.joined ? refreshGroupMessages(id) : null), 6000, [id, g?.joined]);
  useLayoutEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [messages?.length]);

  if (!g) return <div className="page"><TopBar title="Group" />{s.groupsLoaded ? <Empty icon={Users} title="Group not found" /> : <Spinner />}</div>;

  const join = async () => {
    if (!isSignedIn(a)) { showAlert("Sign up to join", "Sign in to join groups and their chats."); return; }
    setBusy(true);
    const r = await toggleJoinGroup(g);
    setBusy(false);
    if (r?.joined) refreshGroupMessages(id);
    else if (!r) showAlert("Couldn't join", social.get().lastError);
  };
  const leave = async () => {
    setMenu(false);
    const ok = await confirmDialog({ title: `Leave ${g.name}?`, message: "You can join again any time.", confirm: "Leave group", destructive: true });
    if (ok) await toggleJoinGroup(g);
  };
  const send = async (e) => {
    e?.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    if (!(await sendGroupMessage(id, body))) { setDraft(body); showAlert("Couldn't send", social.get().lastError); }
  };

  return (
    <div className="chat-page">
      <TopBar title={g.name} right={g.joined && (
        <div style={{ position: "relative" }}>
          <IconButton icon={MoreHorizontal} label="More options" onClick={() => setMenu((v) => !v)} aria-expanded={menu} />
          {menu && <div className="menu" role="menu" style={{ top: 44, right: 0 }}><button type="button" role="menuitem" className="danger" onClick={leave}><LogOut aria-hidden="true" width={16} />Leave group</button></div>}
        </div>
      )} />
      <div className="column pad stack-sm" style={{ paddingTop: 12 }}>
        <p className="muted small" style={{ margin: 0 }}>{g.description}</p>
        <div className="row wrap" style={{ gap: 6 }}>
          <span className="tiny bold muted">{g.memberCount} members{g.joined ? " · you're in" : ""} · started by {g.ownerName}</span>
          {g.status === "pending" && <span className="kicker kicker--gold">Pending review</span>}
          {(g.tags || []).map((t) => <span key={t} className="tag" style={{ fontSize: 11 }}>{shortTopic(t)}</span>)}
        </div>
      </div>
      {!g.joined ? (
        <div className="column pad stack" style={{ marginTop: 20 }}>
          <Button variant="primary" size="lg" block icon={Users} loading={busy} onClick={join}>{isSignedIn(a) ? "Join group" : "Sign up to join"}</Button>
          <p className="small muted center" style={{ margin: 0 }}>Members get the group chat and a pinned list of the sessions that matter to it.</p>
        </div>
      ) : (
        <>
          <main id="main" className="column bubbles" aria-live="polite" aria-label={`${g.name} chat`}>
            {messages === undefined ? <Spinner /> : !messages?.length ? (
              <div className="center" style={{ padding: "30px 10px" }}><b>Say hi to the group</b><div className="small muted">Plan meetups, share notes from the sessions.</div></div>
            ) : messages.map((m) => (
              <div key={m.id} className={"bubble" + (m.mine ? " bubble--mine" : "")}>
                {!m.mine && <div className="bubble-author">{m.authorName}</div>}
                {m.body}
                <time dateTime={m.createdAt}>{timeFmt(m.createdAt)}</time>
              </div>
            ))}
            <div ref={bottom} />
          </main>
          <form className="composer-bar column" onSubmit={send}>
            <textarea className="input" rows={1} value={draft} maxLength={2000} onChange={(e) => setDraft(e.target.value)} placeholder={`Message ${g.name}…`} aria-label={`Message ${g.name}`}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) { e.preventDefault(); send(); } }} />
            <IconButton icon={ArrowUp} label="Send message" filled type="submit" disabled={!draft.trim()} />
          </form>
        </>
      )}
    </div>
  );
}
