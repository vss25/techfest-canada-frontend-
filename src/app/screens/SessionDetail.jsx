import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BarChart3, Bookmark, BookmarkCheck, CalendarDays, ChevronRight, Clock, CheckCircle2, MapPin, Share2, Tag, Layers } from "lucide-react";
import { useStore } from "../lib/store";
import { cms, dayLabel, isLiveWindow, liveOn, refreshCMS, roomOf, sessionById, speakerById, timeRange, typeLabel, liveWindow } from "../lib/cms";
import { content, liveFlags } from "../lib/content";
import { auth, isSignedIn } from "../lib/auth";
import { bookmarks, social, toggleBookmark } from "../lib/social";
import { clockFaked } from "../lib/time";
import { showAlert, useNow } from "../lib/ui";
import { Avatar, Button, Empty, Spinner, TopBar } from "../components/ui";
import { TypeIcon } from "../components/SessionRow";
import { EVENT, FEATURES } from "../lib/config";

/* Session page (iOS SessionDetailView). */

export default function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const c = useStore(cms);
  const ct = useStore(content);
  const a = useStore(auth);
  const s = useStore(social);
  const now = useNow(30000);
  useEffect(() => { refreshCMS(); }, []);

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

  const openLive = () => {
    if (open) { navigate(`/session/${encodeURIComponent(session.id)}/live`); return; }
    const [opens] = liveWindow(session);
    const mins = Math.ceil((opens - now) / 60000);
    showAlert("Opens 10 minutes before the session", mins > 0
      ? `Polls and Q&A open at ${new Date(opens).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" })}.`
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
      <main id="main" className="pad mt-16 stack-lg">
        <header className="detail-head stack-sm">
          <div className="row small" style={{ gap: 6, color: "var(--pur-alt)", fontWeight: 600 }}>
            <TypeIcon type={session.type} style={{ width: 14, height: 14 }} />
            <span>{typeLabel(session)}</span><span aria-hidden="true">·</span><span>{session.track}</span>
          </div>
          <h1>{session.title}</h1>
          <div className="detail-meta">
            <span><CalendarDays aria-hidden="true" />{dayLabel(session)}</span>
            <span><Clock aria-hidden="true" />{timeRange(session)}</span>
          </div>
          {saved && <div className="row small bold" style={{ gap: 6, color: "var(--pur-alt)" }}><CheckCircle2 aria-hidden="true" style={{ width: 15, height: 15 }} />You're going</div>}
        </header>

        <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{session.description}</p>

        {hasLive && (
          <button type="button" className={"live-card pressable" + (open ? " live-card--open" : "")} onClick={openLive}>
            <span className="ico"><BarChart3 aria-hidden="true" style={{ width: 18, height: 18 }} /></span>
            <span style={{ flex: 1 }}>
              <span className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6 }}>{open ? "Live now" : "Live polls & Q&A"}{open && <span className="live-dot" aria-hidden="true" />}</span>
              <b style={{ fontSize: 14 }}>{open ? "Vote in the spot poll and ask the speakers" : "Opens 10 min before start"}</b>
            </span>
            <ChevronRight aria-hidden="true" style={{ width: 16, height: 16, color: "var(--tx2)" }} />
          </button>
        )}

        {speakers.length > 0 && (
          <section className="stack-sm" aria-labelledby="spk">
            <h2 id="spk" className="section-title">Speakers</h2>
            {speakers.map((sp) => (
              <Link key={sp.id} to={sp.agendaOnly ? "#" : `/speakers/${encodeURIComponent(sp.id)}`} className="list-row pressable" onClick={(e) => { if (sp.agendaOnly) e.preventDefault(); }}>
                <Avatar name={sp.name} src={sp.photo} size={44} round />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: "block", fontSize: 14 }}>{sp.name}</b>
                  <span className="small muted ellipsis" style={{ display: "block" }}>{[sp.title, sp.company].filter(Boolean).join(" · ")}</span>
                </span>
                {!sp.agendaOnly && <ChevronRight className="chev" aria-hidden="true" />}
              </Link>
            ))}
          </section>
        )}

        <section className="stack-sm" aria-labelledby="det">
          <h2 id="det" className="section-title">Details</h2>
          <div className="card card--flat stack-sm">
            {room && <div className="detail-row"><MapPin aria-hidden="true" /><span className="muted">Room</span><span className="spacer" /><b>{room}</b></div>}
            <div className="detail-row"><Tag aria-hidden="true" /><span className="muted">Track</span><span className="spacer" /><b style={{ textAlign: "right" }}>{session.track}</b></div>
            <div className="detail-row"><Layers aria-hidden="true" /><span className="muted">Format</span><span className="spacer" /><b>{typeLabel(session)}</b></div>
          </div>
        </section>

        <div className="stack-sm">
          <Button variant={saved ? undefined : "primary"} size="lg" block icon={saved ? BookmarkCheck : Bookmark} onClick={() => toggleBookmark(session.id)}>
            {saved ? (isSignedIn(a) ? "Registered · Remove" : "Saved · Remove") : (isSignedIn(a) ? "Register & add to schedule" : "Save to my schedule")}
          </Button>
          {!isSignedIn(a) && <p className="tiny muted center" style={{ margin: 0 }}>Saved on this device. Sign in to join sessions, polls and Q&A.</p>}
          <Button size="lg" block icon={Share2} onClick={share}>Share session</Button>
        </div>
      </main>
    </div>
  );
}
