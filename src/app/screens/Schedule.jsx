import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronRight, CircleDot, Map as MapIcon, TramFront, Car, Plane, Ship } from "lucide-react";
import { useStore, session as sessionStore } from "../lib/store";
import { cms, eventDay, highlightedSession, refreshCMS, sessionsForDay } from "../lib/cms";
import { content, optionalText, text } from "../lib/content";
import { auth, isSignedIn } from "../lib/auth";
import { bookmarks, refreshRegistrations, social, toggleBookmark } from "../lib/social";
import { hourLabel } from "../lib/time";
import { useNow } from "../lib/ui";
import { Chip, Segmented, Spinner } from "../components/ui";
import SessionRow from "../components/SessionRow";
import Coachmark from "../components/Coachmark";
import { EVENT, LINKS } from "../lib/config";
import SiteAnnouncement from "../components/SiteAnnouncement";
import { announcement, announcementShown } from "../lib/announcement";
import { guestAlert } from "../lib/passes";

/* =========================================================
   Schedule (iOS ScheduleView): Day 1 / Day 2 / Venue, type
   filters and My Sessions, sessions under pinned hour headings,
   a bookmark on every card. On the festival days it opens on
   what's on now (or next). Guests are asked to get a pass
   before saving, as on iOS.
========================================================= */

const FILTERS = [
  { id: "all", label: "All", match: () => true },
  { id: "keynotes", label: "Keynotes", match: (s) => s.type === "keynote" },
  { id: "sessions", label: "Sessions", match: (s) => s.type !== "keynote" && s.type !== "break" },
  { id: "breaks", label: "Breaks", match: (s) => s.type === "break" },
];

export default function Schedule() {
  const c = useStore(cms);
  const ct = useStore(content);
  const a = useStore(auth);
  const s = useStore(social);
  const now = useNow(30000);
  const [day, setDay] = useState(() => Number(sessionStore.get("ttfc.schedule.day")) || eventDay(now) || 1);
  const [filter, setFilter] = useState("all");
  const [mine, setMine] = useState(false);
  const headRef = useRef(null);
  const [headH, setHeadH] = useState(150);
  const followed = useRef("");
  const signedIn = isSignedIn(a);
  const ann = useStore(announcement);

  // Agenda edits made in the admin panel show up while the schedule is open (every 5 min).
  useEffect(() => {
    refreshCMS();
    const t = setInterval(() => refreshCMS({ force: true }), 300000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (signedIn) refreshRegistrations(); }, [signedIn]);
  useEffect(() => { sessionStore.set("ttfc.schedule.day", String(day)); }, [day]);

  // Pinned hour headings sit right under the header.
  useLayoutEffect(() => {
    const el = headRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setHeadH(el.getBoundingClientRect().height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const saved = bookmarks(s);
  const f = FILTERS.find((x) => x.id === filter) || FILTERS[0];
  const list = useMemo(() => sessionsForDay(day, c).filter(f.match).filter((x) => !mine || saved.includes(x.id)), [day, c, f, mine, saved]);
  const hi = highlightedSession(day, now, c);
  const groups = useMemo(() => {
    const out = [];
    for (const x of list) {
      const h = hourLabel(x.startTime);
      if (out.length && out[out.length - 1].label === h) out[out.length - 1].items.push(x);
      else out.push({ label: h, items: [x] });
    }
    return out;
  }, [list]);

  // Oct 26 / 27: open on what's on now (or next), only on appear or a day / filter change (iOS followNow).
  useEffect(() => {
    if (!hi || eventDay(now) !== day) return;
    const key = `${day}-${filter}`;
    if (followed.current === key) return;
    followed.current = key;
    requestAnimationFrame(() => {
      const el = document.getElementById(`s-${hi.id}`);
      if (!el) return;
      const room = window.innerHeight - headH;
      const y = el.getBoundingClientRect().top + window.scrollY - headH - room * 0.12;
      window.scrollTo({ top: Math.max(0, y), behavior: "auto" });
    });
  }, [hi, day, filter, now, headH]);

  const onToggle = async (x) => {
    if (!signedIn) { guestAlert("Get a pass to save sessions", "schedule"); return; }
    await toggleBookmark(x.id);
  };

  const banner = announcementShown(a, optionalText(ct, "site.announcement"), ann);

  return (
    <div className="page" style={{ paddingTop: 0 }}>
      <div className="sched-head" ref={headRef}>
        <div className="column">
          {banner && <div className="pad sched-ann"><SiteAnnouncement where="schedule" /></div>}
          <h1 className="page-title pad">{text(ct, "schedule.title", "Schedule")}</h1>
          <div className="pad">
            <Segmented
              capsule
              label="Day"
              value={day}
              onChange={(v) => { setDay(v); window.scrollTo(0, 0); }}
              options={[{ value: 1, label: "Day 1 · Oct 26" }, { value: 2, label: "Day 2 · Oct 27" }, { value: 3, label: "Venue" }]}
            />
          </div>
          {day !== 3 && (
            <div className="chips" role="group" aria-label="Filter sessions">
              {FILTERS.map((x) => <Chip key={x.id} on={filter === x.id} onClick={() => setFilter(x.id)}>{x.label}</Chip>)}
              <Chip on={mine} onClick={() => setMine((v) => !v)}>My Sessions</Chip>
            </div>
          )}
        </div>
      </div>

      <main id="main" className="column" style={{ paddingTop: 12 }}>
        {day === 3 ? <Venue /> : !c.loaded ? <Spinner label="Loading the agenda" /> : list.length === 0 ? (
          <div className="sched-empty" style={{ minHeight: `calc(100dvh - ${headH}px - var(--tab-space) - 60px)` }}>
            <h2>Nothing here yet</h2>
            <p>{mine ? "Save sessions from the full agenda and they'll appear here." : "No sessions match this filter."}</p>
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.label} aria-label={g.label}>
              <h2 className="hour-head" style={{ top: headH, margin: "0 0 8px" }}>{g.label}</h2>
              <div className="session-list" style={{ marginBottom: 8 }}>
                {g.items.map((x) => (
                  <SessionRow key={x.id} session={x} cmsState={c} saved={saved.includes(x.id)}
                    highlighted={hi?.id === x.id} onNow={hi?.id === x.id && x.start <= now && x.end > now} onToggle={onToggle} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>
      <Coachmark id="schedule" title="Two days, one timeline" message="Switch days, filter by type, tap a session to register." icon={Calendar} />
    </div>
  );
}

const isApple = () => /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
/** iOS action.openMaps: Apple Maps on Apple devices, Google Maps elsewhere. */
const mapsURL = (q) => (isApple() ? `https://maps.apple.com/?q=${encodeURIComponent(q)}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`);

function Venue() {
  const rows = [
    { icon: TramFront, title: "Union Station", detail: "12-minute walk south via Bay St", q: "Union Station Toronto" },
    { icon: Car, title: "Westin valet & garage", detail: "Entrance on Harbour Square", q: EVENT.address },
    { icon: Plane, title: "Pearson YYZ", detail: "30 min via UP Express + 5 min walk", q: "Toronto Pearson Airport" },
    { icon: Ship, title: "Toronto Island Ferry", detail: "5 min walk to terminal", q: "Jack Layton Ferry Terminal Toronto" },
  ];
  return (
    <div className="venue">
      <div className="venue-head">
        <span className="venue-kicker"><CircleDot aria-hidden="true" />Toronto · Canada</span>
        <h2>{EVENT.venue}</h2>
        <span className="venue-addr">{EVENT.address}</span>
      </div>
      <section className="stack-sm" style={{ gap: 10 }}>
        <h3 className="eyebrow">Getting here</h3>
        <div className="card venue-card">
          {rows.map((r) => {
            const Icon = r.icon;
            return (
              <a key={r.title} href={mapsURL(r.q)} target="_blank" rel="noopener noreferrer" className="transit-row pressable">
                <span className="transit-ico" aria-hidden="true"><Icon /></span>
                <span style={{ flex: 1, minWidth: 0 }}><b>{r.title}</b><span>{r.detail}</span></span>
                <ChevronRight aria-hidden="true" className="transit-chev" />
              </a>
            );
          })}
        </div>
      </section>
      <a className="btn btn-primary btn-lg btn-block" href={mapsURL(EVENT.address)} target="_blank" rel="noopener noreferrer">
        {isApple() ? "Open in Apple Maps" : "Open in Google Maps"}<MapIcon aria-hidden="true" />
      </a>
      {/* No interactive floor plan on the web: the venue guide stands in for it. */}
      <a className="btn btn-lg btn-block" href={LINKS.venue} target="_blank" rel="noopener noreferrer">Floor plan and venue guide<ChevronRight aria-hidden="true" /></a>
    </div>
  );
}
