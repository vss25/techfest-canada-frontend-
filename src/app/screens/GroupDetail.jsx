import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowUp, Bookmark, ChevronRight, CircleEllipsis, Flag, Info, Loader2, LogOut, MessagesSquare, Pin, Users } from "lucide-react";
import { useStore } from "../lib/store";
import { auth, isSignedIn } from "../lib/auth";
import { cms, isProgramme, speakerById, typeLabel } from "../lib/cms";
import { bookmarks, canMessage, fetchGroupMembers, markGroupRead, refreshGroupMessages, refreshGroups, sendGroupMessage, social, toggleJoinGroup } from "../lib/social";
import { TOPIC_SHORT, fileURL } from "../lib/config";
import { now } from "../lib/time";
import { reportFlow, safetyItems } from "../lib/safety";
import { publicBadge } from "../lib/people";
import { typingChanged, typingSent } from "../lib/typing";
import { alertDialog, showAlert, usePolling } from "../lib/ui";
import { Avatar, DoneButton, Empty, Sheet, Spinner, TopBar } from "../components/ui";
import { MoreMenu } from "../components/Safety";
import { ChatBubble, TypingIndicator } from "../components/ChatBubble";
import { BubbleFill, PeopleFill } from "../components/Glyphs";
import { guestAlert } from "../lib/passes";

/* =========================================================
   A group's home (iOS GroupDetailView): who's in it, the
   sessions it cares about pinned in place, and the members'
   chat (refreshed every 6 s). Join to get the chat.
========================================================= */

/** Programme sessions whose track or speakers match the group's tags (iOS MockData.sessions(matchingTags:)). */
function usePinned(tags) {
  const c = useStore(cms);
  return useMemo(() => {
    const needles = (tags || []).flatMap((t) => TOPIC_SHORT[t] || [t]).map((x) => x.toLowerCase());
    if (!needles.length) return [];
    return c.sessions.filter((s) => {
      if (!isProgramme(s)) return false;
      const track = String(s.track || "").toLowerCase();
      if (needles.some((n) => track.includes(n))) return true;
      const topics = s.speakerIds.map((id) => speakerById(id, c)).filter(Boolean).flatMap((sp) => sp.topics || []);
      return topics.some((t) => tags.includes(t)) && (s.type === "keynote" || s.type === "panel");
    }).sort((a, b) => a.start - b.start);
  }, [tags, c]);
}

/** Who's in a group (iOS GroupMembersView): organiser first, Message where you can. */
function Members({ g, onClose }) {
  const s = useStore(social);
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    let alive = true;
    fetchGroupMembers(g.id).then((r) => { if (alive) setList(Array.isArray(r) ? r : []); }).catch(() => { if (alive) setList([]); });
    return () => { alive = false; };
  }, [g.id]);
  const t = q.trim().toLowerCase();
  const shown = (list || []).filter((m) => !t || [m.name, m.organization, m.jobTitle].join(" ").toLowerCase().includes(t));
  return (
    <Sheet open onClose={onClose} title={g.name} full actions={{ right: <DoneButton onClick={onClose} /> }}>
      <div className="sheet-body stack-sm" style={{ flex: 1, overflow: "auto", gap: 10 }}>
        {list && <span className="list-label" style={{ paddingTop: 0 }}>{list.length} member{list.length === 1 ? "" : "s"}</span>}
        {list && list.length > 8 && <input className="input member-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members" aria-label="Search members" />}
        {!list ? <Spinner /> : shown.map((m) => (
          <div key={m.id} className="member-row">
            <Avatar name={m.name} src={fileURL(m.avatarUrl)} size={46} tierRing={!!publicBadge(m)} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="row" style={{ gap: 6 }}>
                <b className="ellipsis">{m.isMe ? `${m.name} (you)` : m.name}</b>
                {m.isOwner && <span className="kicker kicker--pur">Organiser</span>}
              </span>
              {(m.jobTitle || m.organization) && <span className="ellipsis muted" style={{ display: "block", fontSize: 12.5 }}>{[m.jobTitle, m.organization].filter(Boolean).join(" · ")}</span>}
            </span>
            {!m.isMe && canMessage(m, s) && (
              <button type="button" className="plus-btn pressable" aria-label={`Message ${m.name}`} onClick={() => { onClose(); navigate(`/chat/${encodeURIComponent(m.id)}`); }}><BubbleFill /></button>
            )}
          </div>
        ))}
      </div>
    </Sheet>
  );
}

export default function GroupDetail() {
  const { id: raw } = useParams();
  const id = decodeURIComponent(raw);
  const a = useStore(auth);
  const s = useStore(social);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [members, setMembers] = useState(false);
  const bottom = useRef(null);
  const g = s.groups.find((x) => x.id === id);
  const all = s.groupMessages[id];
  const pinned = usePinned(g?.tags);
  const saved = bookmarks(s);
  const signedIn = isSignedIn(a);
  const at = now().getTime();

  useEffect(() => { if (!g) refreshGroups(); }, [g]);
  usePolling(() => (g?.joined ? refreshGroupMessages(id) : null), 6000, [id, g?.joined]);
  useEffect(() => { markGroupRead(id); return () => markGroupRead(id); }, [id]);
  useEffect(() => { if (all?.length) markGroupRead(id); }, [id, all?.length]);
  useLayoutEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [all?.length]);

  if (!g) return <div className="page"><TopBar title="Group" />{s.groupsLoaded || !signedIn ? <Empty icon={Users} title="Group not found" /> : <Spinner />}</div>;

  // Others' held messages and blocked authors stay hidden; your own held ones fade.
  const messages = Array.isArray(all) ? all.filter((m) => (m.status !== "held" || m.mine) && !s.blocked.includes(m.authorId)) : all;

  const toggleJoin = async () => {
    if (!signedIn) { guestAlert("Sign up to join", "Create a free profile to join groups.", "group"); return; }
    const r = await toggleJoinGroup(g);
    if (!r) showAlert("Couldn't update", social.get().lastError || "Try again.");
    else if (r.joined) refreshGroupMessages(id);
  };
  const send = async (e) => {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    const ok = await sendGroupMessage(id, body);
    setSending(false);
    if (ok) { setDraft(""); typingSent("group", id); } else showAlert("Couldn't send", social.get().lastError || "Try again.");
  };
  const about = () => alertDialog({ title: g.name, message: `${g.description || ""}\n\n${g.memberCount} members · started by ${g.ownerName}` });

  return (
    <div className="chat-page">
      <TopBar title={g.name} right={
        <MoreMenu label="More options" icon={CircleEllipsis} items={[
          { label: "About this group", icon: Info, onClick: about },
          { label: "Report group", icon: Flag, onClick: () => reportFlow("group", g.id) },
          g.joined && { label: "Leave group", icon: LogOut, danger: true, onClick: toggleJoin },
        ]} />
      } />
      <div className="column group-head">
        <span className="group-tile group-tile--lg" aria-hidden="true">{g.name.slice(0, 1).toUpperCase()}</span>
        <span style={{ minWidth: 0 }}>
          <b className="ellipsis" style={{ display: "block", fontSize: 16, fontWeight: 600 }}>{g.name}</b>
          <button type="button" className="members-link pressable" onClick={() => setMembers(true)} aria-description="Shows who's in this group">
            {g.memberCount} members{g.joined ? " · you're in" : ""}<ChevronRight aria-hidden="true" />
          </button>
        </span>
      </div>
      {pinned.length > 0 && (
        <div className="column pinned-strip">
          <span className="pinned-label"><Pin aria-hidden="true" />Pinned sessions for this group</span>
          <div className="pinned-row">
            {pinned.slice(0, 8).map((x) => {
              const live = at >= x.start && at <= x.end;
              return (
                <Link key={x.id} to={`/session/${encodeURIComponent(x.id)}`} className={"pinned-card pressable" + (live ? " pinned-card--live" : "")}>
                  <span className="row" style={{ gap: 6 }}>
                    {live ? <><span className="unread-dot" style={{ width: 6, height: 6 }} /><b className="pinned-live">Live now</b></> : <span className="pinned-when">{x.day === 1 ? "Mon" : "Tue"} · {x.startTime}</span>}
                    <span className="spacer" />
                    {saved.includes(x.id) && <Bookmark aria-label="Saved" role="img" className="pinned-saved" />}
                  </span>
                  <span className="pinned-title clamp-2">{x.title}</span>
                  <span className="pinned-type">{typeLabel(x)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
      {!g.joined ? (
        <div className="column join-prompt">
          {g.description && <p>{g.description}</p>}
          <button type="button" className="btn btn-primary btn-lg btn-block ios-primary pressable" onClick={toggleJoin} disabled={g.status !== "approved"}>
            {signedIn ? "Join group" : "Sign up to join"}<PeopleFill aria-hidden="true" />
          </button>
          <p className="tiny-note">Members get the group chat and a pinned list of the sessions that matter to it.</p>
        </div>
      ) : (
        <>
          <main id="main" className="column bubbles" style={{ padding: 16, gap: 10 }} aria-live="polite" aria-label={`${g.name} chat`}>
            {messages === undefined ? <Spinner /> : !messages?.length ? (
              <div className="group-empty"><MessagesSquare aria-hidden="true" /><b>Say hi to the group</b><span>Plan meetups, share notes from the pinned sessions.</span></div>
            ) : messages.map((m) => (
              <ChatBubble key={m.id} text={m.body} mine={m.mine} author={m.mine ? null : m.authorName} timestamp={m.createdAt} held={m.status === "held"}
                menu={m.mine ? null : safetyItems({ type: "groupMessage", id: m.id, authorId: m.authorId, authorName: m.authorName })} />
            ))}
            <div ref={bottom} />
          </main>
          <div className="composer-wrap">
            <TypingIndicator scope="group" id={id} />
            <form className="composer-bar column" onSubmit={send}>
              <textarea className="input" rows={1} value={draft} maxLength={2000} placeholder={`Message ${g.name}…`} aria-label={`Message ${g.name}`}
                onChange={(e) => { setDraft(e.target.value); typingChanged("group", id, e.target.value); }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) { e.preventDefault(); send(); } }} />
              <button type="submit" className="icon-btn icon-btn--filled pressable" aria-label="Send to group" disabled={!draft.trim() || sending}>
                {sending ? <Loader2 aria-hidden="true" style={{ animation: "spin .8s linear infinite" }} /> : <ArrowUp aria-hidden="true" />}
              </button>
            </form>
          </div>
        </>
      )}
      {members && <Members g={g} onClose={() => setMembers(false)} />}
    </div>
  );
}
