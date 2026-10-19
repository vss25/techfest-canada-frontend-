import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, BarChart3, House as HomeIcon, Building2, CalendarDays, ChevronRight, ChevronUp, Circle, Eye, ImagePlus, ListChecks, Megaphone, MessageSquareQuote, Moon, Smartphone, Sun, X, UserRoundPen } from "lucide-react";
import { useStore, local } from "../lib/store";
import { auth, can, firstName, isSignedIn, signOut } from "../lib/auth";
import { cms, featuredOrganisations, featuredSpeakers, heroSession, pollsOn, qaOn, speakerById, timeRange, speakerLine } from "../lib/cms";
import { content, flag, liveFlags, optionalText, text } from "../lib/content";
import { markActivitySeen, refreshActivity, refreshFeed, social, bookmarks } from "../lib/social";
import { notificationItems, unreadCount } from "../lib/notifications";
import { countdownTarget, EVENT_END, parts, shortCountdown, showsSessionHero, twoDigits } from "../lib/time";
import { fileURL, FEATURES } from "../lib/config";
import { safeHref, useNow } from "../lib/ui";
import { Avatar, Button, IconButton, Spinner } from "../components/ui";
import { PeopleFill, TrophyFill } from "../components/Glyphs";
import { points, refreshPoints } from "../lib/points";
import { theme, setTheme, THEME_LABEL } from "../lib/theme";
import { WelcomeCard } from "../components/AppNotices";
import SiteAnnouncement from "../components/SiteAnnouncement";
import PostCard from "../components/PostCard";
import Composer from "../components/Composer";
import Coachmark from "../components/Coachmark";
import { GetPassCard } from "../components/PassesSheet";

/* =========================================================
   Home, merged with the feed (iOS FeedView / HomeTabView):
   welcome, the countdown (or, Oct 25–27, the session on now /
   next with its Polls and Q&A), the first-day checklist,
   Speakers and Organisations, then the feed. Once you're into
   the posts, a "What's on your mind?" bar pins to the top and
   the session line floats above the tab bar.
========================================================= */

function Countdown({ now, target }) {
  const left = target - now;
  if (left <= 0) {
    return <p className="hero-session-title">{now > EVENT_END.getTime() ? "Thanks for joining TTFC 2026" : "The festival is live"}</p>;
  }
  const p = parts(left);
  return (
    <div className="stack-sm">
      <span className="eyebrow" style={{ color: "var(--tx2)" }}>Days to the doors</span>
      <div className="countdown countdown--hero" role="timer" aria-label={`${p.d} days, ${p.h} hours and ${p.m} minutes to the doors`}>
        {[[p.d, "days"], [p.h, "hrs"], [p.m, "min"], [p.s, "sec"]].map(([v, l]) => (
          <div key={l} className="unit" aria-hidden="true"><b>{twoDigits(v)}</b><span>{l}</span></div>
        ))}
      </div>
    </div>
  );
}

function SessionHero({ pick, now, c, flags }) {
  const { session, isOn, next } = pick;
  const speakers = session.speakerIds.map((id) => speakerById(id, c)).filter(Boolean);
  const names = speakers.length <= 2 ? speakers.map((s) => s.name).join(" & ") : `${speakers.slice(0, 2).map((s) => s.name).join(", ")} +${speakers.length - 2}`;
  const p = parts(session.start - now);
  const polls = FEATURES.live && pollsOn(session, flags), qa = FEATURES.live && qaOn(session, flags);
  return (
    <div className="stack" style={{ gap: 16 }}>
      {isOn ? (
        <span className="eyebrow row" style={{ gap: 6 }}><span className="live-dot" aria-hidden="true" />On now</span>
      ) : (
        <div className="stack-sm">
          <span className="eyebrow" style={{ color: "var(--tx2)" }}>Next session starts in</span>
          <div className="countdown" role="timer">
            {p.d > 0 && <div className="unit"><b>{twoDigits(p.d)}</b><span>days</span></div>}
            <div className="unit"><b>{twoDigits(p.h)}</b><span>hrs</span></div>
            <div className="unit"><b>{twoDigits(p.m)}</b><span>min</span></div>
            <div className="unit"><b>{twoDigits(p.s)}</b><span>sec</span></div>
          </div>
        </div>
      )}
      <Link to={`/session/${encodeURIComponent(session.id)}`} className="card-link pressable">
        <h2 className="hero-session-title">{session.title}</h2>
        <span className="small muted">{timeRange(session)}</span>
      </Link>
      {speakers.length > 0 && (
        <div className="row">
          <span className="avatar-stack">{speakers.slice(0, 3).map((s) => <Avatar key={s.id} name={s.name} src={s.photo} size={28} ring round />)}</span>
          <span className="small bold clamp-2">{names}</span>
        </div>
      )}
      {(polls || qa) && (
        <div className="row wrap" style={{ gap: 8 }}>
          {polls && <Link to={`/session/${encodeURIComponent(session.id)}/live`} className="live-pill pressable"><BarChart3 aria-hidden="true" />Polls</Link>}
          {qa && <Link to={`/session/${encodeURIComponent(session.id)}/live?qa=1`} className="live-pill live-pill--qa pressable"><MessageSquareQuote aria-hidden="true" />Submit a question</Link>}
        </div>
      )}
      <div className="row">
        {next && (
          <Link to={`/session/${encodeURIComponent(next.id)}`} className="small muted" style={{ textDecoration: "none" }}>
            Next session in <b className="figure" style={{ color: "var(--tx)" }}>{shortCountdown(next.start - now)}</b>
          </Link>
        )}
        <span className="spacer" />
        <Link to="/schedule" className="icon-btn icon-btn--round" aria-label="Open the schedule"><CalendarDays aria-hidden="true" /></Link>
      </div>
    </div>
  );
}

function Checklist({ steps, onDismiss }) {
  const remaining = steps.filter((x) => !x.done);
  return (
    <section className="card todo" aria-labelledby="todo-h">
      <div className="row">
        <span className="eyebrow" style={{ flex: 1 }}>Get started</span>
        <span className="todo-count">{steps.length - remaining.length}/{steps.length}</span>
        <button type="button" className="todo-x pressable" aria-label="Hide checklist" title="Hide checklist. It stays in the menu under the bell until it's done." onClick={onDismiss}><X aria-hidden="true" /></button>
      </div>
      <h2 id="todo-h">Your first-day checklist</h2>
      {remaining.map((x) => (
        <Link key={x.id} to={x.to} className="todo-step pressable">
          <Circle aria-hidden="true" className="todo-circle" />
          <span style={{ flex: 1 }}>{x.title}</span>
          <ChevronRight aria-hidden="true" className="todo-chev" />
        </Link>
      ))}
    </section>
  );
}

function MiniBar({ now, c, onTap }) {
  const pick = showsSessionHero(new Date(now)) ? heroSession(now, c) : null;
  let line;
  if (pick) {
    const speakers = pick.session.speakerIds.map((id) => speakerById(id, c)).filter(Boolean);
    line = (
      <span className="stack-sm" style={{ gap: 3, minWidth: 0 }}>
        <span className="ellipsis">{pick.isOn ? <><span className="live-dot" style={{ color: "var(--pur-alt)", marginRight: 6 }} /><span style={{ color: "var(--pur-alt)" }}>On now </span></> : <span className="muted figure">Next in {shortCountdown(pick.session.start - now)}  </span>}{pick.session.title}</span>
        {speakers.length > 0 && <span className="tiny muted ellipsis" style={{ fontWeight: 500 }}>With {speakerLine(speakers)}</span>}
      </span>
    );
  } else {
    const left = countdownTarget().getTime() - now;
    const p = parts(left);
    line = left > 0
      ? <span className="figure">{twoDigits(p.d)}d {twoDigits(p.h)}h {twoDigits(p.m)}m <span className="muted">to the doors</span></span>
      : <span>Thanks for joining TTFC 2026</span>;
  }
  return (
    <button type="button" className="mini-bar pressable" onClick={onTap} aria-label="Back to the top">
      <span style={{ flex: 1, minWidth: 0 }}>{line}</span>
      <ChevronUp aria-hidden="true" style={{ width: 16, height: 16, color: "var(--tx2)" }} />
    </button>
  );
}

const CHECKLIST_KEY = "ttfc.app.checklistDismissed";
const THEME_ICON = { system: Smartphone, light: Sun, dark: Moon };
const NEXT_THEME = { system: "dark", dark: "light", light: "system" };

/** iOS TopBarChrome: points on the left; the bell capsule opens a small menu
    (checklist if hidden, theme, notifications) that closes itself after 6 s. */
function TopChrome({ total, unread, onChecklist, onNotifications }) {
  const [open, setOpen] = useState(false);
  const t = useStore(theme);
  useEffect(() => {
    if (!open) return undefined;
    const id = setTimeout(() => setOpen(false), 6000);
    return () => clearTimeout(id);
  }, [open, t.value]);
  const ThemeIcon = THEME_ICON[t.value] || Smartphone;
  return (
    <div className="home-top">
      {total != null && (
        <Link to="/points" className="points-pill pressable" aria-label={`${total} festival points. Opens your points and the leaderboard`}>
          <TrophyFill /><span className="figure">{total}</span>
        </Link>
      )}
      <span className="spacer" />
      <div className="bell-pill">
        {open && (
          <span className="bell-menu">
            {onChecklist && (
              <><button type="button" className="icon-btn pressable" aria-label="First-day checklist, steps left" onClick={() => { setOpen(false); onChecklist(); }}>
                <ListChecks aria-hidden="true" /><span className="dot-badge" aria-hidden="true" />
              </button><span className="divider" /></>
            )}
            <button type="button" className="icon-btn pressable" aria-label={`Theme: ${THEME_LABEL[t.value]}. Tap to change`} onClick={() => setTheme(NEXT_THEME[t.value] || "system")}>
              <ThemeIcon aria-hidden="true" />
            </button>
            <span className="divider" />
            <IconButton icon={Bell} label={unread ? `Notifications, ${unread} unread` : "Notifications"} badge={unread} onClick={() => { setOpen(false); onNotifications(); }} />
            <span className="divider" />
          </span>
        )}
        <IconButton icon={open ? X : Bell} badge={open ? 0 : unread} aria-expanded={open}
          label={open ? "Close menu" : unread ? `Notifications and settings, ${unread} unread` : "Notifications and settings"}
          onClick={() => setOpen((v) => !v)} />
      </div>
    </div>
  );
}

export default function Home() {
  const a = useStore(auth);
  const s = useStore(social);
  const c = useStore(cms);
  const ct = useStore(content);
  const now = useNow(1000);
  const navigate = useNavigate();
  // Points › "Write a post" lands here with { compose: true }: the composer opens (when posting is on).
  const location = useLocation();
  const [composer, setComposer] = useState(() => !!location.state?.compose);
  useEffect(() => {
    if (location.state?.compose) navigate(location.pathname + location.search, { replace: true, state: null });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [pinned, setPinned] = useState(false);
  const [checklistHidden, setChecklistHidden] = useState(() => local.get(CHECKLIST_KEY) === "1");
  const sentinel = useRef(null);
  const signedIn = isSignedIn(a);
  const me = a.me;
  const pts = useStore(points);

  useEffect(() => { if (signedIn) { refreshFeed(); refreshPoints(); } }, [signedIn]);
  // You've seen the feed's activity by opening Home (iOS ActivityService.markSeen("feed")).
  useEffect(() => { if (signedIn) refreshActivity().then(() => markActivitySeen("feed")); }, [signedIn]);

  // The feed's bar (compose prompt + bell) pins to the top, and the session bar floats above the
  // tab bar, once Organisations has scrolled up under the top chrome. A plain scroll check: the
  // IntersectionObserver version compared against the wrong edge and never switched on.
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const el = sentinel.current;
      if (el) setPinned(el.getBoundingClientRect().top < 56);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(check); };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const flags = liveFlags(ct);
  const pick = showsSessionHero(new Date(now)) ? heroSession(now, c) : null;
  const items = signedIn ? notificationItems({ social: s, cms: c, auth: a, now }) : [];
  const unread = unreadCount(items, s.readNotifs);
  const canPost = signedIn && flag(ct, "flag.allow_posts") && can("post", a);
  const announcement = optionalText(ct, "home.announcement");
  const announcementLink = safeHref(optionalText(ct, "home.announcement_link"));
  const faces = featuredSpeakers(now, 3, c);
  const orgs = featuredOrganisations(now, 3, c);
  const posts = s.feed.filter((p) => !s.blocked.includes(p.authorId));
  const greeting = me?.name ? firstName(me.name) : "";

  const linkedin = !!(me?.linkedinUrl || a.user?.linkedinUrl);
  const sent = s.connections.outgoing.length + s.connections.accepted.length;
  const saved = bookmarks(s).length;
  const steps = signedIn ? [
    { id: "linkedin", title: "Add your LinkedIn profile", done: linkedin, to: "/profile/edit" },
    { id: "requests", title: sent === 1 ? "Send a request to 1 more person" : "Send requests to 2 people", done: sent >= 2, to: "/network" },
    { id: "bookmarks", title: saved > 0 && saved < 3 ? `Bookmark ${3 - saved} more session${3 - saved === 1 ? "" : "s"}` : "Bookmark 3 sessions", done: saved >= 3, to: "/schedule" },
  ] : [];
  const showChecklist = signedIn && !checklistHidden && steps.some((x) => !x.done);
  const checklistWaiting = signedIn && checklistHidden && steps.some((x) => !x.done);
  const needsProfile = signedIn && a.user && a.user.appOnboarded === false;

  const bell = (
    <IconButton icon={Bell} label={unread ? `Notifications, ${unread} unread` : "Notifications"} badge={unread} onClick={() => navigate("/notifications")} />
  );
  const composePrompt = (compact) => (
    <button type="button" className="compose-prompt pressable" onClick={() => setComposer(true)} aria-label="Write a post" style={compact ? { padding: "2px 8px 2px 12px" } : undefined}>
      <Avatar name={me?.name} src={fileURL(me?.avatarUrl)} size={compact ? 32 : 36} />
      <span className="fake-input">What's on your mind?</span>
      <ImagePlus aria-hidden="true" style={{ width: 20, height: 20, color: "var(--pur-alt)" }} />
    </button>
  );

  return (
    <div className="page">
      {pinned && (
        <div className="pinned-bar">
          <div className="inner">
            {canPost ? <div style={{ flex: 1 }}>{composePrompt(true)}</div> : <b style={{ flex: 1, paddingLeft: 16 }}>The TTFC feed</b>}
            {signedIn && bell}
          </div>
        </div>
      )}
      {!signedIn && <div className="site-ann-wrap"><SiteAnnouncement where="home" /></div>}
      <TopChrome total={signedIn ? pts.me?.total ?? null : null} unread={unread}
        onChecklist={checklistWaiting ? () => { local.set(CHECKLIST_KEY, null); setChecklistHidden(false); } : null}
        onNotifications={() => navigate("/notifications")} />

      <main id="main" className="stack-lg" style={{ paddingTop: 10 }}>
        <div className="pad stack">
          <WelcomeCard />
          {!signedIn && (
            <div className="banner">
              <Eye aria-hidden="true" style={{ width: 18, height: 18, flex: "none" }} fill="currentColor" stroke="var(--pur)" />
              <div style={{ flex: 1 }}><b className="small">You're browsing as a guest</b><p>Sign up to connect, chat, and join groups.</p></div>
              <button type="button" className="btn" onClick={() => signOut()}>Sign up</button>
            </div>
          )}
          {!signedIn && <GetPassCard where="home" />}
          {needsProfile && (
            <Link to="/profile/edit" className="announcement pressable">
              <span className="ico"><UserRoundPen aria-hidden="true" style={{ width: 17, height: 17 }} /></span>
              <span style={{ flex: 1 }}><b>Finish your profile</b><span className="small" style={{ display: "block", opacity: 0.9 }}>Add your title, company and topics so people at TTFC can find and message you.</span></span>
              <ChevronRight aria-hidden="true" style={{ width: 16, height: 16, alignSelf: "center" }} />
            </Link>
          )}
          {announcement && (
            announcementLink
              ? <a href={announcementLink} target="_blank" rel="noopener noreferrer" className="announcement pressable"><span className="ico"><Megaphone aria-hidden="true" style={{ width: 17, height: 17 }} /></span><b style={{ flex: 1 }}>{announcement}</b><ChevronRight aria-hidden="true" style={{ width: 16, height: 16, alignSelf: "center" }} /></a>
              : <div className="announcement"><span className="ico"><Megaphone aria-hidden="true" style={{ width: 17, height: 17 }} /></span><b style={{ flex: 1 }}>{announcement}</b></div>
          )}
        </div>

        <section className="pad hero stack" aria-label="Festival">
          {greeting ? <h1>Welcome back, {greeting}.</h1> : <h1 className="lockup">MEET · BUILD · SCALE</h1>}
          {pick ? <SessionHero pick={pick} now={now} c={c} flags={flags} /> : <Countdown now={now} target={countdownTarget().getTime()} />}
          <hr className="rule" style={{ marginTop: 6 }} />
        </section>

        <div className="pad stack">
          {showChecklist && <Checklist steps={steps} onDismiss={() => { local.set(CHECKLIST_KEY, "1"); setChecklistHidden(true); }} />}
          <Link to="/network/speakers" className="speakers-tile card-link pressable" aria-label="See all speakers">
            <span className="row" style={{ gap: 8, fontWeight: 600, fontSize: 16 }}><PeopleFill />Speakers</span>
            <span className="row" style={{ marginTop: 14 }}>
              <span className="avatar-stack" aria-hidden="true" style={{ gap: 0 }}>{faces.map((f) => <Avatar key={f.id} name={f.name} src={f.photo} size={44} round />)}</span>
              <span className="spacer" />
              <span className="see-all">See all speakers <ChevronRight aria-hidden="true" style={{ width: 14, height: 14 }} /></span>
            </span>
          </Link>
          <Link to="/organisations" className="orgs-tile pressable" aria-label="See all attending organisations">
            <span style={{ flex: 1 }}>
              <span className="row" style={{ gap: 8, fontWeight: 600, fontSize: 15 }}><Building2 aria-hidden="true" style={{ width: 18, height: 18 }} />Organisations</span>
              <span className="row" style={{ gap: 8, marginTop: 10 }}>
                {orgs.map((o) => <span key={o.id} className="logo-tile"><img src={o.logo} alt={o.displayName} loading="lazy" crossOrigin="anonymous" /></span>)}
              </span>
            </span>
            <span className="small bold row" style={{ gap: 2, color: "var(--pur-alt)" }}>See all <ChevronRight aria-hidden="true" style={{ width: 14, height: 14 }} /></span>
          </Link>
        </div>

        <div ref={sentinel} aria-hidden="true" style={{ height: 1 }} />

        <section className="feed-panel stack-sm" aria-label="The TTFC feed">
          {canPost && <div className="column">{composePrompt(false)}</div>}
          {!signedIn ? (
            <div className="pad stack" style={{ textAlign: "center", padding: "30px 24px" }}>
              <MessageSquareQuote aria-hidden="true" style={{ width: 30, height: 30, color: "var(--pur-alt)", margin: "0 auto" }} />
              <p className="muted" style={{ margin: 0 }}>You're browsing as a guest. Sign in to see the feed, post, comment and connect.</p>
              <Button variant="primary" onClick={() => signOut()}>Sign in</Button>
            </div>
          ) : !s.feedLoaded ? <Spinner label="Loading the feed" /> : posts.length === 0 ? (
            <div className="feed-empty">
              <MessageSquareQuote aria-hidden="true" />
              <p>{s.feedError ? "Couldn't load the feed. Pull down or come back in a moment." : text(ct, "feed.empty", "Be the first to post. Everyone at TTFC will see it.")}</p>
            </div>
          ) : (
            <div className="column stack-sm">{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
          )}
        </section>
      </main>

      {pinned && <MiniBar now={now} c={c} onTap={() => window.scrollTo({ top: 0, behavior: "smooth" })} />}
      {composer && canPost && <Composer onClose={() => setComposer(false)} />}
      <Coachmark id="home" title="Your TTFC home" message="What's on, then the feed. Scroll down for posts; discussions and groups are in Chats." icon={HomeIcon} />
    </div>
  );
}
