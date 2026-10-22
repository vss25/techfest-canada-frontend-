import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BadgeCheck, BarChart3, Bookmark, CalendarDays, ChevronRight, CircleCheck, Clock, MapPin, MessagesSquare, Share, Tag, Layers, Ticket } from "lucide-react";
import { useStore } from "../lib/store";
import { cms, dayLabel, isLiveWindow, liveOn, refreshCMS, roomOf, sessionById, speakerById, timeRange, typeLabel, liveWindow } from "../lib/cms";
import { content, liveFlags } from "../lib/content";
import { auth, isSignedIn } from "../lib/auth";
import { bookmarks, fetchSessionGroup, refreshGroups, refreshRegistrations, social, toggleBookmark } from "../lib/social";
import { sessionGetsChat, sessionGroupOf } from "../lib/sessionChat";
import { post } from "../lib/api";
import { clockFaked } from "../lib/time";
import { showAlert, useNow } from "../lib/ui";
import { Avatar, Button, Empty, Spinner, TopBar } from "../components/ui";
import { TypeIcon } from "../components/SessionRow";
import { EVENT, FEATURES } from "../lib/config";
import { openPasses } from "../lib/passes";

/* Session page (iOS SessionDetailView). Its chat (lib/sessionChat.js, GET /community/groups/session/:id): "Open
   session chat" once you're in it; registered but you left it, "Join session chat"; registered with no chat yet
   (and not a meal or break), "Session chat opens 30 min before". */

export default function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const c = useStore(cms);
  const ct = useStore(content);
  const a = useStore(auth);
  const s = useStore(social);
  const now = useNow(30000);
  const signedIn = isSignedIn(a);
  useEffect(() => { refreshCMS(); }, []);
  useEffect(() => { if (signedIn) { refreshRegistrations(); refreshGroups(); } }, [signedIn]);
  // The session's chat: null until it exists (the server opens it 30 min before the start).
  const [chat, setChat] = useState(null);
  const sid = decodeURIComponent(id);
  const loadChat = useCallback(async () => {
    const x = sessionById(sid);
    setChat(signedIn && x ? await fetchSessionGroup(x.id) : null);
  }, [sid, signedIn]);
  const loaded = c.loaded;
  useEffect(() => { if (loaded) loadChat(); }, [loaded, loadChat]);
  const [joining, setJoining] = useState(false);

  const session = sessionById(decodeURIComponent(id), c);
  if (!session) {
    return (
      <div className="page">
        <TopBar title="Session" />
        {c.loaded ? <Empty icon={CalendarDays} title="Session not found">The agenda may have changed. Check the Schedule for the latest times.</Empty> : <Spinner />}
      </div>
    );
  }

  const saved = bookmarks(s).includes(session.id);
  const room = roomOf(session.stage);
  const speakers = session.speakerIds.map((x) => speakerById(x, c)).filter(Boolean);
  const flags = liveFlags(ct);
  const hasLive = FEATURES.live && session.type !== "break" && session.type !== "ceremony" && liveOn(session, flags);
  const open = isLiveWindow(session, now) || clockFaked();
  const group = signedIn ? chat || sessionGroupOf(session, s.groups) : null;
  const chatSoon = signedIn && saved && !group && sessionGetsChat(session) && now < session.end;
  // Registering adds you to the session's chat (and un-registering before it starts takes you out): read it again.
  const register = async () => { await toggleBookmark(session.id); refreshGroups(); loadChat(); };
  const openChat = (g) => navigate(`/group/${encodeURIComponent(g.id)}`);
  // You left the chat but you're registered: back in (POST …/join; the server says why if it refuses).
  const joinChat = async () => {
    if (joining) return;
    setJoining(true);
    try {
      const g = await post(`community/groups/${encodeURIComponent(group.id)}/join`, {});
      setChat(g?.id ? g : group);
      await refreshGroups();
      if (g?.joined !== false) openChat(group);
    } catch (e) {
      showAlert("Couldn't join the chat", e.message || "Try again.");
    } finally { setJoining(false); }
  };

  const openLive = () => {
    if (open) { navigate(`/session/${encodeURIComponent(session.id)}/live`); return; }
    const [opens] = liveWindow(session);
    const mins = Math.ceil((opens - now) / 60000);
    showAlert("Opens 10 minutes before the session", mins > 0
      ? `Polls and Q&A open at ${new Date(opens).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric", timeZone: "America/Toronto" })} at ${new Date(opens).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" })}.`
      : "This session's live window has closed.");
  };

  const share = async () => {
    const textLine = `${session.title} — ${dayLabel(session)} at ${timeRange(session)}${room ? `, ${room}` : ""}. ${EVENT.name}.`;
    const url = `https://www.thetechfestival.com/app/session/${encodeURIComponent(session.id)}`;
    try {
      if (navigator.share) await navigator.share({ title: session.title, text: textLine, url });
      else { await navigator.clipboard.writeText(`${textLine} ${url}`); showAlert("Copied", "The session details are on your clipboard."); }
    } catch { /* cancelled */ }
  };

  return (
    <div className="page">
      <TopBar title={typeLabel(session)} />
      <main id="main" className="session-page">
        <header className="detail-head">
          <div className="detail-kicker">
            <TypeIcon type={session.type} />
            <span>{typeLabel(session)}</span><span aria-hidden="true">·</span><span className="detail-track">{session.track}</span>
          </div>
          <h1>{session.title}</h1>
          <div className="detail-meta">
            <span><CalendarDays aria-hidden="true" />{dayLabel(session)}</span>
            <span><Clock aria-hidden="true" />{timeRange(session)}</span>
          </div>
          {saved && <span className="going-pill"><CircleCheck aria-hidden="true" />You're going</span>}
        </header>

        <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 15 }}>{session.description}</p>

        {hasLive && (
          <button type="button" className={"live-card pressable" + (open ? " live-card--open" : "")} onClick={openLive}>
            <span className="ico"><BarChart3 aria-hidden="true" /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="live-card-eyebrow">{open ? "Live now" : "Live polls & Q&A"}{open && <span className="on-dot" aria-hidden="true" />}</span>
              <b>{open ? "Vote in the spot poll and ask the speakers" : "Opens 10 min before start"}</b>
            </span>
            <ChevronRight aria-hidden="true" className="live-card-chev" />
          </button>
        )}

        {speakers.length > 0 && (
          <section className="stack-sm" style={{ gap: 12 }} aria-labelledby="spk">
            <h2 id="spk" className="eyebrow eyebrow--muted">Speakers</h2>
            {speakers.map((sp) => (
              <Link key={sp.id} to={sp.agendaOnly ? "#" : `/speakers/${encodeURIComponent(sp.id)}`} className="speaker-row pressable" onClick={(e) => { if (sp.agendaOnly) e.preventDefault(); }}>
                <Avatar name={sp.name} src={sp.photo} size={44} round={!!sp.photo} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b>{sp.name}</b>
                  <span className="ellipsis">{[sp.title, sp.company].filter(Boolean).join(" · ")}</span>
                </span>
                {!sp.agendaOnly && <ChevronRight className="chev" aria-hidden="true" />}
              </Link>
            ))}
          </section>
        )}

        <section className="stack-sm" aria-labelledby="det">
          <h2 id="det" className="eyebrow eyebrow--muted">Details</h2>
          <div className="card card--flat details-card">
            {room && <div className="detail-row"><MapPin aria-hidden="true" /><span>Room</span><span className="spacer" /><b>{room}</b></div>}
            <div className="detail-row"><Tag aria-hidden="true" /><span>Track</span><span className="spacer" /><b style={{ textAlign: "right" }}>{session.track}</b></div>
            <div className="detail-row"><Layers aria-hidden="true" /><span>Format</span><span className="spacer" /><b>{typeLabel(session)}</b></div>
          </div>
        </section>

        <div className="stack-sm" style={{ gap: 10 }}>
          {signedIn ? (
            <Button variant="primary" size="lg" block icon={saved ? BadgeCheck : Bookmark} onClick={register} className={saved ? "" : "icon-fill"}>
              {saved ? "Registered · Remove" : "Register & add to schedule"}
            </Button>
          ) : (
            <>
              <Button variant="primary" size="lg" block onClick={() => openPasses("session")}>Get a pass<Ticket aria-hidden="true" /></Button>
              <p className="center muted" style={{ margin: 0, fontSize: 11 }}>Sign in and choose a pass to join sessions, polls and Q&A.</p>
            </>
          )}
          {group?.joined && <Button size="lg" block icon={MessagesSquare} onClick={() => openChat(group)}>Open session chat</Button>}
          {group && !group.joined && saved && <Button size="lg" block icon={MessagesSquare} loading={joining} onClick={joinChat}>Join session chat</Button>}
          {chatSoon && <p className="session-chat-soon"><MessagesSquare aria-hidden="true" />Session chat opens 30 min before</p>}
          <Button size="lg" block icon={Share} onClick={share}>Share session</Button>
        </div>
      </main>
    </div>
  );
}
