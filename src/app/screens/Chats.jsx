import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Inbox, MessagesSquare, Plus, SquarePen, Users, Bell, Lock } from "lucide-react";
import { useStore } from "../lib/store";
import { auth, can, isSignedIn, signOut } from "../lib/auth";
import { content, flag } from "../lib/content";
import {
  canMessage, chatsHasNew, connectionWith, createDiscussion, createGroup, isMessageRequest, markChatsSeen,
  refreshConnections, refreshDiscussions, refreshGroups, refreshThreads, social, toggleJoinGroup,
} from "../lib/social";
import { APPLIED_SECTORS, TECH_PILLARS, fileURL, shortTopic } from "../lib/config";
import { timeAgo } from "../lib/time";
import { showAlert } from "../lib/ui";
import { Avatar, Button, Chip, Empty, IconButton, Segmented, Sheet, Spinner, TopBar } from "../components/ui";
import { ConnectionRow } from "../components/People";
import { SearchField } from "../components/Filters";

/* =========================================================
   Chats (iOS ChatsView): Chats (1:1 and your groups, newest
   first, then groups to browse), Requests (invitations and
   messages from people you're not connected with) and
   Discussions (with Follow).
========================================================= */

function ThreadRow({ t, s }) {
  const u = t.user || {};
  const conn = connectionWith(u.id, s);
  const unread = t.unread > 0 && !t.lastMessage?.sentByMe;
  return (
    <Link to={`/chat/${encodeURIComponent(u.id)}`} className="person-card pressable" style={{ color: "inherit", textDecoration: "none" }}>
      <Avatar name={u.name} src={fileURL(u.avatarUrl)} size={46} />
      <span className="info">
        <span className="row" style={{ gap: 6 }}>
          <span className="person-name ellipsis">{u.name}</span>
          {unread && <span className="live-dot" style={{ color: "var(--pur-alt)", animation: "none" }} aria-label="New message" />}
          {conn?.status !== "accepted" && <span className="kicker kicker--muted" style={{ fontSize: 10.5 }}>Not connected</span>}
          <span className="spacer" />
          <time className="tiny muted" dateTime={t.lastMessage?.createdAt}>{timeAgo(t.lastMessage?.createdAt)}</time>
        </span>
        <span className={"small ellipsis" + (unread ? " bold" : " muted")} style={{ display: "block" }}>{t.lastMessage?.sentByMe ? "You: " : ""}{t.lastMessage?.body || "Say hello —"}</span>
      </span>
    </Link>
  );
}

function GroupRow({ g, last }) {
  return (
    <Link to={`/group/${encodeURIComponent(g.id)}`} className="person-card pressable" style={{ color: "inherit", textDecoration: "none" }}>
      <span className="avatar avatar--tile" style={{ width: 44, height: 44, fontSize: 17 }} aria-hidden="true">{g.name.slice(0, 1).toUpperCase()}</span>
      <span className="info">
        <span className="row"><span className="person-name ellipsis" style={{ flex: 1 }}>{g.name}</span>{last && <time className="tiny muted">{timeAgo(last.createdAt)}</time>}</span>
        <span className="small muted ellipsis" style={{ display: "block" }}>{last ? `${last.mine ? "You" : last.authorName}: ${last.body}` : `${g.memberCount} members · open the group chat`}</span>
      </span>
    </Link>
  );
}

function NewChat({ onClose }) {
  const s = useStore(social);
  const a = useStore(auth);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const people = s.people.filter((p) => p.onApp !== false && p.id !== a.me?.id && !s.blocked.includes(p.id) && canMessage(p, s))
    .filter((p) => !q || [p.name, p.organization, p.jobTitle].some((x) => String(x || "").toLowerCase().includes(q.toLowerCase())))
    .sort((x, y) => x.name.localeCompare(y.name));
  return (
    <Sheet open onClose={onClose} title="New message" full>
      <div className="sheet-body stack-sm" style={{ flex: 1, overflow: "auto" }}>
        <SearchField value={q} onChange={setQ} placeholder="Name or company" />
        {people.length === 0 ? <Empty icon={Users}>{q ? "No one matches" : "No one to message yet"}</Empty> : people.map((p) => (
          <button key={p.id} type="button" className="list-row pressable" onClick={() => { onClose(); navigate(`/chat/${encodeURIComponent(p.id)}`); }}>
            <Avatar name={p.name} src={fileURL(p.avatarUrl)} size={36} />
            <span style={{ minWidth: 0 }}><b style={{ display: "block", fontSize: 14.5 }}>{p.name}</b><span className="small muted ellipsis" style={{ display: "block" }}>{[p.jobTitle, p.organization].filter(Boolean).join(" · ")}</span></span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

function TopicPicker({ value, onChange, max = 6 }) {
  return (
    <div className="chips chips--wrap">
      {[...TECH_PILLARS, ...APPLIED_SECTORS].map((t) => <Chip key={t} on={value.includes(t)} onClick={() => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t].slice(0, max))}>{shortTopic(t)}</Chip>)}
    </div>
  );
}

function NewGroup({ onClose }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState([]);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await createGroup({ name: name.trim(), description: desc.trim(), tags });
      onClose();
      showAlert("Group submitted", "Groups are reviewed by the TTFC team before they're listed.");
    } catch (err) { showAlert("Couldn't create the group", err.message); } finally { setBusy(false); }
  };
  return (
    <Sheet open onClose={onClose} title="New group" full>
      <form className="sheet-body stack" onSubmit={submit} style={{ flex: 1, overflow: "auto" }}>
        <label className="field"><span className="field-label">Name</span><input className="input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoFocus /></label>
        <label className="field"><span className="field-label">What's it for?</span><textarea className="textarea" value={desc} maxLength={500} onChange={(e) => setDesc(e.target.value)} /></label>
        <span className="section-title">Tags</span>
        <TopicPicker value={tags} onChange={setTags} />
        <p className="tiny muted" style={{ margin: 0 }}>Groups are reviewed by the TTFC team before they're listed.</p>
        <Button type="submit" variant="primary" size="lg" block loading={busy} disabled={name.trim().length < 3}>Create group</Button>
      </form>
    </Sheet>
  );
}

function NewDiscussion({ onClose }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState([]);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await createDiscussion({ title: title.trim(), body: body.trim(), tags });
      onClose();
      showAlert("Discussion submitted", "New discussions are reviewed by the TTFC team before they're visible to everyone.");
    } catch (err) { showAlert("Couldn't post it", err.message); } finally { setBusy(false); }
  };
  return (
    <Sheet open onClose={onClose} title="New discussion" full>
      <form className="sheet-body stack" onSubmit={submit} style={{ flex: 1, overflow: "auto" }}>
        <label className="field"><span className="field-label">Question or topic</span><input className="input" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} autoFocus /></label>
        <label className="field"><span className="field-label">Details</span><textarea className="textarea" value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)} /></label>
        <span className="section-title">Tags</span>
        <TopicPicker value={tags} onChange={setTags} />
        <p className="tiny muted" style={{ margin: 0 }}>New discussions are reviewed by the TTFC team before they're visible to everyone.</p>
        <Button type="submit" variant="primary" size="lg" block loading={busy} disabled={title.trim().length < 4 || !body.trim()}>Post discussion</Button>
      </form>
    </Sheet>
  );
}

function Discussions() {
  const s = useStore(social);
  const a = useStore(auth);
  const [filter, setFilter] = useState(null);
  const [following, setFollowing] = useState(false);
  const [composer, setComposer] = useState(false);
  useEffect(() => { refreshDiscussions(); }, []);
  const list = s.discussions.filter((d) => (d.status === "approved" || d.mine) && (!filter || (d.tags || []).includes(filter)) && (!following || d.following));
  return (
    <div className="stack">
      <div className="pad row">
        <div style={{ flex: 1 }}><div className="eyebrow">Ask the community</div><h2 style={{ margin: 0, fontSize: 20 }}>Discussions</h2></div>
        {can("startDiscussions", a) && <IconButton icon={Plus} label="New discussion" round filled onClick={() => setComposer(true)} />}
      </div>
      <div className="chips">
        <Chip on={!filter && !following} onClick={() => { setFilter(null); setFollowing(false); }}>All</Chip>
        <Chip on={following} onClick={() => setFollowing((v) => !v)}>Following</Chip>
        {[...TECH_PILLARS, ...APPLIED_SECTORS].map((t) => <Chip key={t} on={filter === t} onClick={() => setFilter(filter === t ? null : t)}>{t}</Chip>)}
      </div>
      {!s.discussionsLoaded ? <Spinner /> : list.length === 0 ? (
        <p className="muted center small" style={{ padding: 30 }}>{following ? "Follow a discussion to keep up with its replies." : "No discussions here yet."}</p>
      ) : (
        <div className="pad stack-sm">
          {list.map((d) => (
            <Link key={d.id} to={`/discussion/${encodeURIComponent(d.id)}`} className="card card--tight card-link pressable stack-sm">
              <span className="row" style={{ gap: 6 }}>
                <Avatar name={d.authorName} size={26} />
                <b className="small">{d.authorName}</b>
                {d.status === "pending" && <span className="kicker kicker--gold">Pending review</span>}
                <span className="spacer" />
                <time className="tiny muted">{timeAgo(d.createdAt)}</time>
              </span>
              <b style={{ fontSize: 15 }}>{d.title}</b>
              <span className="small muted clamp-2" style={{ display: "-webkit-box" }}>{d.body}</span>
              <span className="row" style={{ gap: 6 }}>
                {(d.tags || []).slice(0, 2).map((t) => <span key={t} className="tag" style={{ fontSize: 11 }}>{shortTopic(t)}</span>)}
                <span className="spacer" />
                {d.following && <Bell aria-label="Following" style={{ width: 13, height: 13, color: "var(--pur-alt)" }} />}
                <span className="row tiny bold" style={{ gap: 4, color: "var(--pur-alt)" }}><MessagesSquare aria-hidden="true" style={{ width: 13, height: 13 }} />{d.replyCount}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
      {composer && <NewDiscussion onClose={() => setComposer(false)} />}
    </div>
  );
}

export default function Chats() {
  const a = useStore(auth);
  const s = useStore(social);
  const ct = useStore(content);
  const navigate = useNavigate();
  const { section: param } = useParams();
  const section = ["requests", "discussions"].includes(param) ? param : "chats";
  const [menu, setMenu] = useState(false);
  const [newChat, setNewChat] = useState(false);
  const [newGroup, setNewGroup] = useState(false);
  const signedIn = isSignedIn(a);

  useEffect(() => {
    if (!signedIn) return undefined;
    refreshThreads(); refreshGroups(); refreshConnections();
    markChatsSeen();
    return () => markChatsSeen();
  }, [signedIn]);

  const threads = useMemo(() => s.threads.filter((t) => t.user && !s.blocked.includes(t.user.id)), [s.threads, s.blocked]);
  const invites = s.connections.incoming.filter((c) => !s.blocked.includes(c.user?.id));
  const inviteIds = new Set(invites.map((c) => c.user?.id));
  const requests = threads.filter((t) => !inviteIds.has(t.user.id) && isMessageRequest(t, s));
  const direct = threads.filter((t) => !inviteIds.has(t.user.id) && !isMessageRequest(t, s));
  const myGroups = s.groups.filter((g) => g.joined);
  const otherGroups = s.groups.filter((g) => !g.joined && g.status === "approved");
  const lastOf = (g) => { const m = s.groupMessages[g.id]; return Array.isArray(m) && m.length ? m[m.length - 1] : null; };
  const items = [
    ...direct.map((t) => ({ key: "c" + t.user.id, at: Date.parse(t.lastMessage?.createdAt) || 0, el: <ThreadRow key={"c" + t.user.id} t={t} s={s} /> })),
    ...myGroups.map((g) => ({ key: "g" + g.id, at: Date.parse(lastOf(g)?.createdAt || g.createdAt) || 0, el: <GroupRow key={"g" + g.id} g={g} last={lastOf(g)} /> })),
  ].sort((x, y) => y.at - x.at);
  const requestCount = invites.length + requests.length;

  if (!signedIn) {
    return (
      <div className="page">
        <TopBar title="Chats" back={false} />
        <main id="main" className="pad mt-16"><Empty icon={Lock} title="Sign in to chat" action={<Button variant="primary" onClick={() => signOut()}>Sign in</Button>}>Message attendees and speakers, join group chats and ask the community.</Empty></main>
      </div>
    );
  }

  const canNewChat = can("sendMessages", a);
  const canNewGroup = flag(ct, "flag.allow_groups") && can("createGroups", a);
  return (
    <div className="page">
      <TopBar title="Chats" back={false} right={(canNewChat || canNewGroup) && (
        <div style={{ position: "relative" }}>
          <IconButton icon={SquarePen} label="Start a chat" onClick={() => setMenu((v) => !v)} aria-expanded={menu} />
          {menu && (
            <div className="menu" role="menu" style={{ top: 44, right: 0 }} onMouseLeave={() => setMenu(false)}>
              {canNewChat && <button type="button" role="menuitem" onClick={() => { setMenu(false); setNewChat(true); }}><MessagesSquare aria-hidden="true" width={16} />New message</button>}
              {canNewGroup && <button type="button" role="menuitem" onClick={() => { setMenu(false); setNewGroup(true); }}><Users aria-hidden="true" width={16} />New group</button>}
            </div>
          )}
        </div>
      )} />
      <main id="main" className="mt-16 stack">
        <div className="pad">
          <Segmented label="Chats sections" value={section} onChange={(v) => navigate(v === "chats" ? "/chats" : `/chats/${v}`, { replace: true })}
            options={[
              { value: "chats", label: "Chats", dot: chatsHasNew(s) },
              { value: "requests", label: "Requests", count: requestCount },
              { value: "discussions", label: "Discussions" },
            ]} />
        </div>

        {section === "chats" && (
          <>
            {requestCount > 0 && (
              <div className="pad">
                <Link to="/chats/requests" className="list-row pressable">
                  <Inbox aria-hidden="true" style={{ width: 18, height: 18, color: "var(--pur-alt)" }} />
                  <b style={{ flex: 1, fontSize: 14 }}>{requestCount === 1 ? "1 request" : `${requestCount} requests`}</b>
                  <ChevronRight className="chev" aria-hidden="true" />
                </Link>
              </div>
            )}
            <div className="pad stack-sm">
              {!s.threadsLoaded ? <Spinner /> : items.length === 0 ? (
                <Empty icon={MessagesSquare} title="No chats yet">Start one with the pencil above, or message anyone from their profile in Network. You don't need an accepted connection.</Empty>
              ) : items.map((x) => x.el)}
            </div>
            {otherGroups.length > 0 && (
              <section className="pad stack-sm" aria-labelledby="browse-h">
                <div><div className="eyebrow">Join a group chat on a topic</div><h2 id="browse-h" style={{ margin: 0, fontSize: 18 }}>Browse groups</h2></div>
                {otherGroups.map((g) => (
                  <div key={g.id} className="person-card">
                    <Link to={`/group/${encodeURIComponent(g.id)}`} className="row" style={{ flex: 1, minWidth: 0, gap: 12, color: "inherit", textDecoration: "none" }}>
                      <span className="avatar avatar--tile" style={{ width: 44, height: 44, fontSize: 17 }} aria-hidden="true">{g.name.slice(0, 1).toUpperCase()}</span>
                      <span className="info"><span className="person-name ellipsis" style={{ display: "block" }}>{g.name}</span><span className="tiny muted ellipsis" style={{ display: "block" }}>{g.memberCount} member{g.memberCount === 1 ? "" : "s"} · by {g.ownerName}</span></span>
                    </Link>
                    <Button size="sm" variant="primary" onClick={async () => { const r = await toggleJoinGroup(g); if (r?.joined) navigate(`/group/${encodeURIComponent(g.id)}`); }}>Join</Button>
                  </div>
                ))}
              </section>
            )}
          </>
        )}

        {section === "requests" && (
          <div className="pad stack-sm">
            {requestCount === 0 && <Empty icon={Inbox} title="No requests">Invitations to connect and messages from people you're not connected with show up here.</Empty>}
            {invites.length > 0 && <h2 className="section-title">Invitations · {invites.length}</h2>}
            {invites.map((c) => {
              const t = threads.find((x) => x.user.id === c.user?.id);
              return <ConnectionRow key={c.id} conn={c} mode="invite" unread={t?.unread || 0} lastMessage={t && !t.lastMessage?.sentByMe ? t.lastMessage.body : undefined} />;
            })}
            {requests.length > 0 && (
              <>
                <h2 className="section-title" style={{ marginTop: invites.length ? 8 : 0 }}>Message requests · {requests.length}</h2>
                <p className="tiny muted" style={{ margin: 0 }}>They'll move to Chats when you reply.</p>
                {requests.map((t) => <ThreadRow key={t.user.id} t={t} s={s} />)}
              </>
            )}
          </div>
        )}

        {section === "discussions" && <Discussions />}
      </main>
      {newChat && <NewChat onClose={() => setNewChat(false)} />}
      {newGroup && <NewGroup onClose={() => setNewGroup(false)} />}
    </div>
  );
}
