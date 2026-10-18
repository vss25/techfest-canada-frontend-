import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CalendarX2, MapPin, Navigation, TrainFront, Car, Plane, Ship, ExternalLink } from "lucide-react";
import { useStore, session as sessionStore } from "../lib/store";
import { cms, eventDay, highlightedSession, refreshCMS, sessionsForDay } from "../lib/cms";
import { content, text } from "../lib/content";
import { auth, isSignedIn } from "../lib/auth";
import { bookmarks, refreshRegistrations, social, toggleBookmark } from "../lib/social";
import { hourLabel } from "../lib/time";
import { showAlert, useNow } from "../lib/ui";
import { Chip, Empty, Segmented, Spinner } from "../components/ui";
import SessionRow from "../components/SessionRow";
import { EVENT, LINKS } from "../lib/config";
import { OfferBanner } from "../components/GuestOffer";

/* =========================================================
   Schedule (iOS ScheduleView): Day 1 / Day 2 / Venue, type
   filters and My schedule, sessions under pinned hour headings,
   a bookmark on every card. On the festival days it opens on
   what's on now (or next).
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

  useEffect(() => { refreshCMS(); if (isSignedIn(a)) refreshRegistrations(); }, [a]);
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

  // Oct 26 / 27: open on what's on now (or next), not the top of the day.
  useEffect(() => {
    if (!hi || eventDay(now) !== day) return;
    const key = `${day}-${filter}-${hi.id}`;
    if (followed.current === key) return;
    followed.current = key;
    requestAnimationFrame(() => {
      const el = document.getElementById(`s-${hi.id}`);
      if (!el) return;
      const y = el.getBoundingClientRect().top + window.scrollY - headH - 44;
      window.scrollTo({ top: Math.max(0, y), behavior: "auto" });
    });
  }, [hi, day, filter, now, headH]);

  const onToggle = async (x) => {
    const wasSaved = saved.includes(x.id);
    const nowSaved = await toggleBookmark(x.id);
    if (!isSignedIn(a) && nowSaved && !wasSaved && saved.length === 0) {
      showAlert("Saved on this device", "Sign in to keep your schedule in sync with the TTFC app.");
    }
  };

  return (
    <div className="page" style={{ paddingTop: 0 }}>
      <div className="sched-head" ref={headRef}>
        <div className="column">
          {!isSignedIn(a) && <OfferBanner wrap="pad" />}
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
              <Chip on={mine} onClick={() => setMine((v) => !v)}>My schedule</Chip>
            </div>
          )}
        </div>
      </div>

      <main id="main" className="column" style={{ paddingTop: 12 }}>
        {day === 3 ? <Venue /> : !c.loaded ? <Spinner label="Loading the agenda" /> : list.length === 0 ? (
          <Empty icon={CalendarX2} title="Nothing here yet">
            {mine ? "Save sessions from the full agenda and they'll appear here." : "No sessions match this filter."}
          </Empty>
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
        {c.error && !c.live && day !== 3 && <p className="tiny muted center pad">Showing the last saved agenda. It updates when you're back online.</p>}
      </main>
    </div>
  );
}

function Venue() {
  const maps = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  const rows = [
    { icon: TrainFront, title: "Union Station", detail: "12-minute walk south via Bay St", q: "Union Station Toronto" },
    { icon: Car, title: "Westin valet & garage", detail: "Entrance on Harbour Square", q: EVENT.address },
    { icon: Plane, title: "Pearson YYZ", detail: "30 min via UP Express + 5 min walk", q: "Toronto Pearson Airport" },
    { icon: Ship, title: "Toronto Island Ferry", detail: "5 min walk to terminal", q: "Jack Layton Ferry Terminal Toronto" },
  ];
  return (
    <div className="pad stack-lg">
      <div className="pass-card">
        <div className="row small" style={{ gap: 6, opacity: 0.9 }}><MapPin aria-hidden="true" style={{ width: 15, height: 15 }} /> Toronto · Canada</div>
        <h2 style={{ margin: "8px 0 2px", fontSize: 24 }}>{EVENT.venue}</h2>
        <div style={{ opacity: 0.85 }}>{EVENT.address}</div>
        <div className="small" style={{ opacity: 0.85, marginTop: 8 }}>Main stage: Harbour Ballroom. Rooms are shown on each session.</div>
      </div>
      <section className="stack-sm">
        <h3 className="eyebrow" style={{ margin: 0 }}>Getting here</h3>
        <div className="card" style={{ padding: 4 }}>
          {rows.map((r, i) => {
            const Icon = r.icon;
            return (
              <a key={r.title} href={maps(r.q)} target="_blank" rel="noopener noreferrer" className="row" style={{ padding: "12px", color: "inherit", textDecoration: "none", borderTop: i ? "1px solid var(--border)" : 0, minHeight: 56 }}>
                <span className="lead-icon" style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--pur-tint)", color: "var(--pur-alt)" }}><Icon aria-hidden="true" style={{ width: 17, height: 17 }} /></span>
                <span style={{ flex: 1 }}><b style={{ display: "block", fontSize: 14 }}>{r.title}</b><span className="small muted">{r.detail}</span></span>
                <ExternalLink aria-hidden="true" style={{ width: 15, height: 15, color: "var(--tx2)" }} />
              </a>
            );
          })}
        </div>
      </section>
      <a className="btn btn-primary btn-lg btn-block" href={maps(EVENT.address)} target="_blank" rel="noopener noreferrer"><Navigation aria-hidden="true" />Directions in Maps</a>
      <a className="btn btn-block" href={LINKS.venue} target="_blank" rel="noopener noreferrer">Floor plan and venue guide</a>
    </div>
  );
}
