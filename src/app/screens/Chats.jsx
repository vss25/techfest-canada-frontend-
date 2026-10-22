import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Bell, ChevronRight, Inbox, Lock, MessageCircle, MessagesSquare, Plus, SquarePen, UserRoundSearch, Users } from "lucide-react";
import { useStore } from "../lib/store";
import { auth, can, isSignedIn } from "../lib/auth";
import { content, flag } from "../lib/content";
import {
  canMessage, connectionWith, createDiscussion, createGroup, groupUnread, isMessageRequest, markActivitySeen, markChatsSeen,
  refreshActivity, refreshConnections, refreshDiscussions, refreshGroupMessages, refreshGroups, refreshPeople, refreshThreads, social, threadUnread, toggleJoinGroup,
} from "../lib/social";
import { APPLIED_SECTORS, TECH_PILLARS, fileURL } from "../lib/config";
import { listTime } from "../lib/time";
import { showAlert } from "../lib/ui";
import { Avatar, Chip, Segmented, Sheet, Spinner, TopBar } from "../components/ui";
import { ConnectionRow } from "../components/People";
import { MoreMenu } from "../components/Safety";
import { Ticks } from "../components/ChatBubble";
import { PushBanner } from "../components/PushControls";
import { receiptOf } from "../lib/receipts";
import { SearchField } from "../components/Filters";
import { guestAlert } from "../lib/passes";
import { avatarFor } from "../lib/avatar.js";

/* =========================================================
   Chats (iOS ChatsView): Chats (1:1 and your groups, newest
   first, then every other group to browse and join), Requests
   (invitations and messages from people you're not connected
   with) and Discussions (with Follow). The picker is pinned
   under the title; guests see the same tab with "Get a pass"
   prompts, as on iOS.
========================================================= */

const GROUP_TAGS = [...TECH_PILLARS, ...APPLIED_SECTORS, "Networking", "Founders", "Investors"];

/** iOS ChatRow: name, unread dot, "Not connected", time; the last message underneath (ticks first when it's yours). */
function ThreadRow({ t, s }) {
  const u = t.user || {};
  const conn = connectionWith(u.id, s);
  const unread = threadUnread(t, s);
  const receipt = receiptOf(t.lastMessage);
  return (
    <Link to={`/chat/${encodeURIComponent(u.id)}`} className="conn-card pressable">
      <Avatar name={u.name} src={fileURL(u.avatarUrl)} size={46} />
      <span className="info" style={{ gap: 4 }}>
        <span className="row" style={{ gap: 6 }}>
          <span className="conn-name ellipsis">{u.name}</span>
          {unread && <span className="unread-dot" role="img" aria-label="New message" />}
          {conn?.status !== "accepted" && <span className="pill-outline">Not connected</span>}
          <span className="spacer" />
          {t.lastMessage?.createdAt && <time className="row-time" dateTime={t.lastMessage.createdAt}>{listTime(t.lastMessage.createdAt)}</time>}
        </span>
        <span className={"thread-preview" + (unread ? " bold" : " muted")}>
          {receipt && <Ticks state={receipt} />}
          <span className="ellipsis">{t.lastMessage?.body || "Say hello —"}</span>
        </span>
      </span>
    </Link>
  );
}

/** iOS GroupRow: gradient tile, name, time, last message; an unread count capsule. */
function GroupRow({ g, last, unread }) {
  return (
    <Link to={`/group/${encodeURIComponent(g.id)}`} className="conn-card pressable" style={{ borderRadius: 16 }}>
      <span className="group-tile" aria-hidden="true">{g.name.slice(0, 1).toUpperCase()}</span>
      <span className="info">
        <span className="row"><span className="conn-name ellipsis" style={{ flex: 1 }}>{g.name}</span>{last && <time className="row-time">{listTime(last.createdAt)}</time>}</span>
        <span className="muted ellipsis" style={{ fontSize: 12 }}>{last ? `${last.mine ? "You" : last.authorName}: ${last.body}` : `${g.memberCount} members · open the group chat`}</span>
      </span>
      {unread > 0 && <span className="count-pill" aria-label={`${unread} unread`}>{unread}</span>}
    </Link>
  );
}

/** "New message": pick anyone on the app you can message (iOS NewChatSheet). */
function NewChat({ onClose }) {
  const s = useStore(social);
  const a = useStore(auth);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  useEffect(() => { if (!social.get().people.length) refreshPeople(""); }, []);
  const t = q.trim().toLowerCase();
  const people = s.people.filter((p) => p.onApp !== false && p.id !== a.me?.id && !s.blocked.includes(p.id) && canMessage(p, s))
    .filter((p) => !t || [p.name, p.organization, p.jobTitle].some((x) => String(x || "").toLowerCase().includes(t)))
    .sort((x, y) => x.name.localeCompare(y.name, undefined, { sensitivity: "base" }));
  return (
    <Sheet open onClose={onClose} title="New message" full actions={{ left: <button type="button" className="link-btn sheet-cancel" onClick={onClose}>Cancel</button>, right: <span /> }}>
      <div className="sheet-body stack-sm" style={{ flex: 1, overflow: "auto" }}>
        <SearchField value={q} onChange={setQ} placeholder="Name or company" />
        {people.length === 0 ? (
          <div className="net-empty" style={{ padding: "60px 20px" }}><UserRoundSearch aria-hidden="true" /><h3>{q ? "No one matches" : "No one to message yet"}</h3></div>
        ) : (
          <div className="inset-list">
            {people.map((p) => (
              <button key={p.id} type="button" className="inset-row pressable" onClick={() => { onClose(); navigate(`/chat/${encodeURIComponent(p.id)}`); }}>
                <Avatar name={p.name} src={fileURL(p.avatarUrl)} size={36} />
                <span style={{ minWidth: 0 }}>
                  <span className="ellipsis" style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{p.name}</span>
                  {(p.jobTitle || p.organization) && <span className="ellipsis muted" style={{ display: "block", fontSize: 12.5 }}>{[p.jobTitle, p.organization].filter(Boolean).join(" · ")}</span>}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}

function TagPicker({ options, value, onChange }) {
  return (
    <div className="chips chips--wrap">
      {options.map((t) => <Chip key={t} on={value.includes(t)} onClick={() => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t])}>{t}</Chip>)}
    </div>
  );
}

/** iOS FieldGroup: a 14pt label with a purple * when required. */
function Field({ label, required, children }) {
  return (
    <label className="field">
      <span className="field-label field-label--ios">{label}{required && <span className="req" aria-hidden="true">*</span>}</span>
      {children}
    </label>
  );
}

/** A composer sheet with Cancel on the left and the action (bold, purple when ready) on the right. */
function ComposerSheet({ title, action, busyAction, ready, busy, onSubmit, onClose, children }) {
  return (
    <Sheet open onClose={onClose} title={title} full actions={{
      left: <button type="button" className="link-btn sheet-cancel" onClick={onClose}>Cancel</button>,
      right: <button type="submit" form="composer-form" className="link-btn sheet-action" disabled={!ready || busy}>{busy ? busyAction : action}</button>,
    }}>
      <form id="composer-form" className="sheet-body stack" style={{ flex: 1, overflow: "auto", padding: "4px 20px 20px", gap: 16 }} onSubmit={(e) => { e.preventDefault(); if (ready && !busy) onSubmit(); }}>
        {children}
      </form>
    </Sheet>
  );
}

function NewGroup({ onClose }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState([]);
  const [busy, setBusy] = useState(false);
  const ready = name.trim().length >= 3 && desc.trim().length >= 10;
  const submit = async () => {
    setBusy(true);
    try {
      await createGroup({ name: name.trim(), description: desc.trim(), tags });
      onClose();
    } catch (err) { showAlert("Couldn't create", err?.message || "Try again."); } finally { setBusy(false); }
  };
  return (
    <ComposerSheet title="New group" action="Create" busyAction="Creating…" ready={ready} busy={busy} onSubmit={submit} onClose={onClose}>
      <Field label="Group name" required><input className="input input--ios" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="e.g. Quantum Builders" autoCapitalize="words" autoFocus /></Field>
      <Field label="What's it for?" required><input className="input input--ios" value={desc} maxLength={500} onChange={(e) => setDesc(e.target.value)} placeholder="One or two sentences" /></Field>
      <span className="eyebrow eyebrow--muted">Tags</span>
      <TagPicker options={GROUP_TAGS} value={tags} onChange={setTags} />
      <p className="muted" style={{ margin: 0, fontSize: 11 }}>Groups are reviewed by the TTFC team before they're listed.</p>
    </ComposerSheet>
  );
}

function NewDiscussion({ onClose }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState([]);
  const [busy, setBusy] = useState(false);
  const ready = title.trim().length >= 8 && body.trim().length >= 10;
  const submit = async () => {
    setBusy(true);
    try {
      await createDiscussion({ title: title.trim(), body: body.trim(), tags });
      onClose();
    } catch (err) { showAlert("Couldn't post", err?.message || "Try again."); } finally { setBusy(false); }
  };
  return (
    <ComposerSheet title="New discussion" action="Post" busyAction="Posting…" ready={ready} busy={busy} onSubmit={submit} onClose={onClose}>
      <Field label="Question or topic" required><input className="input input--ios" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder="What do you want to ask?" autoFocus /></Field>
      <Field label="Details" required><textarea className="textarea input--ios" value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)} /></Field>
      <span className="eyebrow eyebrow--muted">Tags</span>
      <TagPicker options={[...TECH_PILLARS, ...APPLIED_SECTORS]} value={tags} onChange={setTags} />
      <p className="muted" style={{ margin: 0, fontSize: 11 }}>New discussions are reviewed by the TTFC team before they're visible to everyone.</p>
    </ComposerSheet>
  );
}

/** SectionHeader (eyebrow + 18 bold title) with the round purple "+" (a lock for guests). */
function SectionHead({ id, eyebrow, title, plus }) {
  return (
    <div className="pad row">
      <div style={{ flex: 1 }}><span className="section-eyebrow">{eyebrow}</span><h2 id={id} className="section-h">{title}</h2></div>
      {plus && <button type="button" className="plus-btn pressable" aria-label={plus.label} onClick={plus.onClick}>{plus.locked ? <Lock aria-hidden="true" /> : <Plus aria-hidden="true" />}</button>}
    </div>
  );
}

/** "Browse groups" (iOS GroupsView, hideJoined): every other group, with its description, tags and Join. */
function BrowseGroups({ signedIn, canNewGroup, onNewGroup }) {
  const s = useStore(social);
  const a = useStore(auth);
  const navigate = useNavigate();
  const visible = s.groups.filter((g) => (g.status === "approved" || g.ownerId === a.me?.id) && !g.joined)
    .sort((x, y) => (y.memberCount || 0) - (x.memberCount || 0));
  const anyJoined = s.groups.some((g) => g.joined);
  const join = async (g) => {
    if (!signedIn) { guestAlert("Get a pass to join groups", "chats"); return; }
    const r = await toggleJoinGroup(g);
    if (r?.joined) navigate(`/group/${encodeURIComponent(g.id)}`);
    else showAlert("Couldn't join", social.get().lastError || "Try again.");
  };
  return (
    <section className="stack" aria-labelledby="browse-h">
      <SectionHead id="browse-h" eyebrow="Join a group chat on a topic" title="Browse groups"
        plus={canNewGroup ? { label: "New group", locked: !signedIn, onClick: () => (signedIn ? onNewGroup() : guestAlert("Get a pass to create a group", "chats")) } : null} />
      {visible.length === 0 && (
        <p className="pad muted" style={{ margin: 0, fontSize: 14 }}>
          {anyJoined ? (canNewGroup ? "You're in every group so far. Start one with +." : "You're in every group so far.") : (canNewGroup ? "No groups yet. Start one with +." : "No groups yet.")}
        </p>
      )}
      {visible.map((g) => (
        <div key={g.id} className="pad">
          <div className="group-card">
            <div className="row" style={{ alignItems: "flex-start" }}>
              <Link to={`/group/${encodeURIComponent(g.id)}`} className="group-card-link">
                <span className="row" style={{ gap: 6 }}><b>{g.name}</b>{g.status === "pending" && <span className="pending-label">Pending review</span>}</span>
                <span className="muted" style={{ fontSize: 11 }}>{g.memberCount} member{g.memberCount === 1 ? "" : "s"} · by {g.ownerName}</span>
              </Link>
              <button type="button" className="join-btn pressable" disabled={g.status !== "approved"} onClick={() => join(g)}>Join</button>
            </div>
            {g.description && <p className="muted" style={{ margin: 0, fontSize: 12 }}>{g.description}</p>}
            {(g.tags || []).length > 0 && <div className="chips chips--wrap" style={{ gap: 6 }}>{g.tags.map((t) => <span key={t} className="chip">{t}</span>)}</div>}
          </div>
        </div>
      ))}
    </section>
  );
}

/** iOS DiscussionsView + DiscussionRow. */
function Discussions({ signedIn }) {
  const s = useStore(social);
  const a = useStore(auth);
  const [filter, setFilter] = useState(null);
  const [following, setFollowing] = useState(false);
  const [composer, setComposer] = useState(false);
  useEffect(() => { refreshDiscussions(); }, []);
  const list = s.discussions.filter((d) => (d.status === "approved" || d.mine) && (!filter || (d.tags || []).includes(filter)) && (!following || d.following));
  const canStart = !signedIn || can("startDiscussions", a);
  return (
    <div className="stack">
      <SectionHead eyebrow="Ask the community" title="Discussions"
        plus={canStart ? { label: "New discussion", locked: !signedIn, onClick: () => (signedIn ? setComposer(true) : guestAlert("Get a pass to post", "chats")) } : null} />
      <div className="chips">
        <Chip on={!filter && !following} onClick={() => { setFilter(null); setFollowing(false); }}>All</Chip>
        <Chip on={following} onClick={() => setFollowing((v) => !v)}>Following</Chip>
        {[...TECH_PILLARS, ...APPLIED_SECTORS].map((t) => <Chip key={t} on={filter === t} onClick={() => setFilter(t)}>{t}</Chip>)}
      </div>
      {signedIn && !s.discussionsLoaded ? <Spinner /> : list.length === 0 ? (
        <p className="muted center" style={{ padding: "30px 16px", margin: 0, fontSize: 13 }}>{following ? "Follow a discussion to keep up with its replies." : "No discussions here yet."}</p>
      ) : list.map((d) => (
        <div key={d.id} className="pad">
          <Link to={`/discussion/${encodeURIComponent(d.id)}`} className="disc-card pressable">
            <span className="row" style={{ gap: 6 }}>
              <Avatar name={d.authorName} src={fileURL(avatarFor(d, s.people))} size={26} />
              <b style={{ fontSize: 12, fontWeight: 600 }}>{d.authorName}</b>
              {d.status === "pending" && <span className="pending-label">Pending review</span>}
              <span className="spacer" />
              <time className="row-time">{listTime(d.createdAt)}</time>
            </span>
            <b style={{ fontSize: 15, fontWeight: 600 }}>{d.title}</b>
            <span className="muted clamp-2" style={{ fontSize: 12 }}>{d.body}</span>
            <span className="row" style={{ gap: 6 }}>
              <span className="chips chips--wrap" style={{ gap: 6, flex: 1 }}>{(d.tags || []).slice(0, 2).map((t) => <span key={t} className="chip">{t}</span>)}</span>
              {d.following && <Bell aria-label="Following" role="img" className="disc-bell" />}
              <span className="row disc-count" style={{ gap: 4 }}><MessagesSquare aria-hidden="true" />{d.replyCount}</span>
            </span>
          </Link>
        </div>
      ))}
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
  const [newChat, setNewChat] = useState(false);
  const [newGroup, setNewGroup] = useState(false);
  const signedIn = isSignedIn(a);

  useEffect(() => {
    if (!signedIn) return undefined;
    refreshThreads(); refreshGroups(); refreshConnections(); refreshActivity();
    markChatsSeen();
    return () => markChatsSeen();
  }, [signedIn]);
  useEffect(() => { if (section === "discussions") markActivitySeen("discussions"); }, [section, s.activity.discussions]);

  const threads = useMemo(() => s.threads.filter((t) => t.user && !s.blocked.includes(t.user.id)), [s.threads, s.blocked]);
  const invites = s.connections.incoming.filter((c) => !s.blocked.includes(c.user?.id));
  const inviteIds = new Set(invites.map((c) => c.user?.id));
  const requests = threads.filter((t) => !inviteIds.has(t.user.id) && isMessageRequest(t, s));
  const direct = threads.filter((t) => !inviteIds.has(t.user.id) && !isMessageRequest(t, s));
  const myGroups = s.groups.filter((g) => g.joined);
  const myGroupIds = myGroups.map((g) => g.id).join(",");
  // Your groups' last messages (for the row preview and unread count).
  useEffect(() => { if (myGroupIds) myGroupIds.split(",").forEach((id) => { if (!social.get().groupMessages[id]) refreshGroupMessages(id); }); }, [myGroupIds]);
  const lastOf = (g) => { const m = s.groupMessages[g.id]; return Array.isArray(m) && m.length ? m[m.length - 1] : null; };
  const items = [
    ...direct.map((t) => ({ key: "c" + t.user.id, at: Date.parse(t.lastMessage?.createdAt) || 0, el: <ThreadRow key={"c" + t.user.id} t={t} s={s} /> })),
    ...myGroups.map((g) => ({ key: "g" + g.id, at: Date.parse(lastOf(g)?.createdAt || g.createdAt) || 0, el: <GroupRow key={"g" + g.id} g={g} last={lastOf(g)} unread={groupUnread(g, s)} /> })),
  ].sort((x, y) => y.at - x.at);
  const requestCount = invites.length + requests.length;
  const chatsNew = threads.some((t) => threadUnread(t, s)) || myGroups.some((g) => groupUnread(g, s) > 0);
  const discussionsNew = s.activity.discussions > 0;

  const canNewChat = can("sendMessages", a);
  const canNewGroup = flag(ct, "flag.allow_groups") && (!signedIn || can("createGroups", a));
  const pencil = signedIn && (canNewChat || canNewGroup) ? (
    <MoreMenu label="Start a chat" icon={SquarePen} items={[
      canNewChat && { label: "New message", icon: MessageCircle, onClick: () => setNewChat(true) },
      canNewGroup && { label: "New group", icon: Users, onClick: () => setNewGroup(true) },
    ]} />
  ) : null;
  const picker = (
    <Segmented label="Chats sections" value={section} onChange={(v) => navigate(v === "chats" ? "/chats" : `/chats/${v}`, { replace: true })}
      options={[
        { value: "chats", label: "Chats", dot: chatsNew, ariaLabel: "Chats" + (chatsNew && section !== "chats" ? ", new" : "") },
        { value: "requests", label: "Requests", count: requestCount, ariaLabel: "Requests" + (requestCount ? `, ${requestCount} open` : "") },
        { value: "discussions", label: "Discussions", dot: discussionsNew, ariaLabel: "Discussions" + (discussionsNew && section !== "discussions" ? ", new" : "") },
      ]} />
  );

  return (
    <div className="page">
      <TopBar title="Chats" back={false} right={pencil} below={picker} />
      <main id="main" className="stack" style={{ paddingTop: 8, gap: 10 }}>
        {section === "chats" && (
          <>
            {signedIn && <PushBanner className="pad" />}
            {requestCount > 0 && (
              <div className="pad">
                <Link to="/chats/requests" className="requests-row pressable">
                  <Inbox aria-hidden="true" />
                  <b>{requestCount === 1 ? "1 request" : `${requestCount} requests`}</b>
                  <ChevronRight className="chev" aria-hidden="true" />
                </Link>
              </div>
            )}
            <div className="pad stack-sm" style={{ gap: 10, paddingBottom: 8 }}>
              {signedIn && !s.threadsLoaded ? <Spinner /> : items.length === 0 ? (
                <div className="chats-empty"><MessagesSquare aria-hidden="true" /><h3>No chats yet</h3><p>Start one with the pencil above, or message anyone from their profile in Network. You don't need an accepted connection.</p></div>
              ) : items.map((x) => x.el)}
            </div>
            <BrowseGroups signedIn={signedIn} canNewGroup={canNewGroup} onNewGroup={() => setNewGroup(true)} />
          </>
        )}

        {section === "requests" && (
          <div className="pad stack-sm" style={{ gap: 10 }}>
            {requestCount === 0 && <div className="chats-empty"><Inbox aria-hidden="true" /><h3>No requests</h3><p>Invitations to connect and messages from people you're not connected with show up here.</p></div>}
            {invites.length > 0 && <h2 className="list-label">Invitations · {invites.length}</h2>}
            {invites.map((c) => {
              const t = threads.find((x) => x.user.id === c.user?.id);
              return <ConnectionRow key={c.id} conn={c} mode="invite" showMessage unread={t && threadUnread(t, s) ? t.unread : 0} lastMessage={t && !t.lastMessage?.sentByMe ? t.lastMessage.body : undefined} />;
            })}
            {requests.length > 0 && (
              <>
                <h2 className="list-label" style={{ marginTop: invites.length ? 8 : 0 }}>Message requests · {requests.length}</h2>
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>They'll move to Chats when you reply.</p>
                {requests.map((t) => <ThreadRow key={t.user.id} t={t} s={s} />)}
              </>
            )}
          </div>
        )}

        {section === "discussions" && <Discussions signedIn={signedIn} />}
      </main>
      {newChat && <NewChat onClose={() => setNewChat(false)} />}
      {newGroup && <NewGroup onClose={() => setNewGroup(false)} />}
    </div>
  );
}
