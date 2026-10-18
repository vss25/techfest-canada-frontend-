import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Building2, Cpu, QrCode, ScanLine, Sparkles, Users, UserX, X, Heart, IdCard, Bookmark, SlidersHorizontal, Eye, MessageCircle } from "lucide-react";
import { useStore } from "../lib/store";
import { auth, isSignedIn, signOut } from "../lib/auth";
import { cms, nameKey, sessionById, speakerById, speakerByName } from "../lib/cms";
import { content, text } from "../lib/content";
import { bookmarks, canMessage, canRequest, refreshConnections, refreshPeople, refreshThreads, social } from "../lib/social";
import { APPLIED_SECTORS, TECH_PILLARS, fileURL } from "../lib/config";
import { recoSignals, recommend, topicPoints } from "../lib/people";
import { Avatar, Button, Empty, IconButton, Segmented, Sheet, Spinner, TopBar } from "../components/ui";
import { FilterSelect, SearchField } from "../components/Filters";
import { KindBadge, PersonCard } from "../components/People";
import SpeakersList from "../components/SpeakersList";

const BadgeScanner = lazy(() => import("../components/BadgeScanner"));

/* =========================================================
   Network (iOS NetworkView + AttendeeDirectoryView):
   Recommended · All · Connected · Speakers · Exhibitors · Staff.
   Everyone at TTFC (GET /social/attendees), A to Z, with search
   (names and companies), Industry and Tech filters. Cards show
   name, company and icons; connect / withdraw / accept / message
   follow each person's switches and your account's rights.
========================================================= */

const SECTIONS = [
  { id: "recommended", label: "Recommended", icon: Sparkles },
  { id: "all", label: "All" },
  { id: "connected", label: "Connected" },
  { id: "speakers", label: "Speakers" },
  { id: "exhibitors", label: "Exhibitors" },
  { id: "staff", label: "Staff" },
];

/** People with speaker details filled in from the CMS where the account doesn't have them. */
function useDirectory() {
  const s = useStore(social);
  const c = useStore(cms);
  return useMemo(() => s.people.map((p) => {
    const sp = speakerByName(p.name, c);
    if (!sp) return p;
    return {
      ...p,
      jobTitle: p.jobTitle || sp.title, organization: p.organization || sp.company,
      avatarUrl: p.avatarUrl || sp.photo, kind: p.kind || "speaker",
    };
  }), [s.people, c]);
}

function Directory({ people, only, emptyText }) {
  const s = useStore(social);
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState(null);
  const [tech, setTech] = useState(null);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) return undefined;
    const id = setTimeout(() => refreshPeople(t), 350);
    return () => clearTimeout(id);
  }, [q]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    let list = people.filter((p) => !s.blocked.includes(p.id));
    if (only) list = list.filter((p) => only.includes(p.kind));
    if (t) list = list.filter((p) => [p.name, p.organization, p.jobTitle, p.tagline].some((x) => String(x || "").toLowerCase().includes(t)) || (p.topics || []).some((x) => x.toLowerCase().includes(t)));
    if (industry) list = list.filter((p) => topicPoints(p, industry) > 0);
    if (tech) list = list.filter((p) => topicPoints(p, tech) > 0);
    if (company) list = list.filter((p) => String(p.organization).toLowerCase() === company.toLowerCase());
    return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [people, s.blocked, only, q, industry, tech, company]);

  const companies = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    const counts = new Map();
    for (const p of people) {
      const o = String(p.organization || "").trim();
      if (o.length > 1 && o.toLowerCase().includes(t)) counts.set(o, (counts.get(o) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(0, 6);
  }, [people, q]);

  const letters = useMemo(() => {
    if (q || shown.length < 12) return [];
    const out = [];
    for (const p of shown) {
      const l = (p.name.normalize("NFD").replace(/[̀-ͯ]/g, "")[0] || "#").toUpperCase();
      const key = /[A-Z]/.test(l) ? l : "#";
      if (!out.some((x) => x.l === key)) out.push({ l: key, id: p.id });
    }
    return out.length >= 4 ? out : [];
  }, [shown, q]);

  const jump = (id) => document.getElementById(`p-${id}`)?.scrollIntoView({ block: "start", behavior: "smooth" });

  return (
    <div className="stack">
      <div className="pad"><SearchField value={q} onChange={(v) => { setQ(v); if (!v) refreshPeople(""); }} placeholder="Search people or companies" /></div>
      {companies.length > 0 && (
        <div className="chips" aria-label="Companies">
          {companies.map(([name, n]) => (
            <button key={name} type="button" className="chip pressable" onClick={() => { recoSignals.usedCompany(name); setCompany(name); setQ(""); }} aria-label={`${name}, ${n} ${n === 1 ? "person" : "people"}`}>
              <Building2 aria-hidden="true" />{name}<span className="chip-count">{n}</span>
            </button>
          ))}
        </div>
      )}
      {people.length > 0 && (
        <div className="chips" role="group" aria-label="Filters">
          <FilterSelect label="Industry" icon={Building2} value={industry} options={APPLIED_SECTORS} onChange={(v) => { setIndustry(v); if (v) recoSignals.usedTopic(v); }} />
          <FilterSelect label="Tech" icon={Cpu} value={tech} options={TECH_PILLARS} onChange={(v) => { setTech(v); if (v) recoSignals.usedTopic(v); }} />
          {company && <button type="button" className="chip chip--on pressable" onClick={() => setCompany(null)} aria-label={`Company: ${company}. Clear`}><Building2 aria-hidden="true" />{company}<X aria-hidden="true" style={{ width: 11, height: 11 }} /></button>}
        </div>
      )}
      {!s.peopleLoaded ? <Spinner label="Loading people" /> : shown.length === 0 ? (
        <Empty icon={Users}>{q || industry || tech || company ? "No one matches that yet." : emptyText}</Empty>
      ) : (
        <div className="stack-sm" style={{ paddingLeft: 16, paddingRight: letters.length ? 30 : 16 }}>
          {shown.map((p) => <div key={p.id} id={`p-${p.id}`} style={{ scrollMarginTop: 120 }}><PersonCard person={p} state={s} /></div>)}
        </div>
      )}
      {letters.length > 0 && (
        <nav className="az-bar" aria-label="Jump to a letter">
          {letters.map((x) => <button key={x.l} type="button" onClick={() => jump(x.id)} aria-label={`Names starting with ${x.l}`}>{x.l}</button>)}
        </nav>
      )}
    </div>
  );
}

function HowWePick({ onClose }) {
  const rows = [
    [Heart, "The interests you chose for your profile"],
    [IdCard, "Your title, company and profile description"],
    [Bookmark, "Sessions you bookmarked, and who's speaking at them"],
    [SlidersHorizontal, "The industry and tech filters you use, and companies you search for"],
    [Eye, "The roles of people whose profiles you open"],
  ];
  return (
    <Sheet open onClose={onClose} title="How we pick">
      <div className="sheet-body stack">
        <p style={{ margin: 0 }}>People at TTFC you're likely to want to meet, picked from:</p>
        {rows.map(([icon, t]) => { const Icon = icon; return <div key={t} className="row"><Icon aria-hidden="true" style={{ width: 17, height: 17, color: "var(--pur-alt)", flex: "none" }} /><span className="muted">{t}</span></div>; })}
        <p className="tiny muted" style={{ margin: 0 }}>We leave out people you're already connected with, people who aren't on the app yet, and the TTFC team. The list updates as you use the app. It's worked out on this device and isn't shared with anyone.</p>
      </div>
    </Sheet>
  );
}

function Recommended({ people }) {
  const s = useStore(social);
  const a = useStore(auth);
  const c = useStore(cms);
  const [how, setHow] = useState(false);
  const [why, setWhy] = useState(null);
  const recs = useMemo(() => {
    const me = a.me || {};
    const saved = bookmarks(s).map((id) => sessionById(id, c)).filter(Boolean);
    const keys = new Map();
    for (const x of saved) for (const id of x.speakerIds) { const sp = speakerById(id, c); if (sp) keys.set(nameKey(sp.name), x.title); }
    const connected = new Set([...s.connections.accepted, ...s.connections.outgoing, ...s.connections.incoming].map((x) => x.user?.id));
    return recommend(people, { id: me.id, topics: me.topics || [], jobTitle: me.jobTitle || "", organization: me.organization || "", tagline: me.tagline || "", savedSessions: saved, savedSpeakerKeys: keys },
      { connectedIds: connected, canContact: (p) => canMessage(p, s) || canRequest(p, s), isBlocked: (id) => s.blocked.includes(id) });
  }, [people, s, a.me, c]);
  return (
    <div className="stack">
      <div className="pad row">
        <b style={{ flex: 1 }}>Picked for you</b>
        <button type="button" className="dashed" onClick={() => setHow(true)}>How we pick</button>
      </div>
      {!s.peopleLoaded ? <Spinner /> : recs.length === 0 ? (
        <Empty icon={Sparkles}>Add your interests in Profile and save a few sessions, and we'll suggest people to meet.</Empty>
      ) : (
        <div className="pad stack-sm">{recs.map((r) => <PersonCard key={r.person.id} person={r.person} state={s} rec={r} onWhy={(p, rec) => setWhy({ p, rec })} />)}</div>
      )}
      {how && <HowWePick onClose={() => setHow(false)} />}
      {why && (
        <Sheet open onClose={() => setWhy(null)} title={`Why ${why.p.name.split(" ")[0]}`}>
          <ul className="sheet-body stack-sm" style={{ listStyle: "none", margin: 0 }}>
            {why.rec.reasons.slice(0, 4).map((r) => <li key={r} className="row" style={{ alignItems: "flex-start" }}><Sparkles aria-hidden="true" style={{ width: 15, height: 15, color: "var(--pur-alt)", flex: "none", marginTop: 3 }} /><span className="muted">{r}</span></li>)}
          </ul>
        </Sheet>
      )}
    </div>
  );
}

function Connected({ onScan }) {
  const s = useStore(social);
  const ct = useStore(content);
  const list = [...s.connections.accepted].filter((x) => !s.blocked.includes(x.user?.id))
    .sort((a, b) => (a.kind === "inPerson" ? 0 : 1) - (b.kind === "inPerson" ? 0 : 1) || Date.parse(a.createdAt) - Date.parse(b.createdAt));
  if (!s.connectionsLoaded) return <Spinner />;
  if (!list.length) {
    return (
      <div className="pad stack">
        <div className="person-card">
          <span className="icon-btn icon-btn--round icon-btn--filled" aria-hidden="true"><ScanLine /></span>
          <div className="info"><b className="small">Met someone? Scan their badge</b><div className="tiny muted">Instant connection, contact details exchanged.</div></div>
          <Button size="sm" variant="primary" onClick={onScan}>Scan</Button>
        </div>
        <Empty icon={UserX} title="No connections yet">{text(ct, "network.empty", "Scan someone's badge QR when you meet, or open a speaker profile and tap 'Connect'.")}</Empty>
      </div>
    );
  }
  return (
    <div className="pad stack-sm">
      {list.map((x) => (
        <Link key={x.id} to={`/chat/${encodeURIComponent(x.user.id)}`} className="person-card pressable" style={{ color: "inherit", textDecoration: "none" }}>
          <Avatar name={x.user.name} src={fileURL(x.user.avatarUrl)} size={48} />
          <span className="info">
            <span className="row" style={{ gap: 6 }}><span className="person-name ellipsis">{x.user.name}</span><KindBadge kind={x.kind} /></span>
            <span className="tiny muted ellipsis" style={{ display: "block" }}>{[x.user.jobTitle, x.user.organization].filter(Boolean).join(" · ")}</span>
            {x.kind === "inPerson" && x.email && <span className="tiny bold ellipsis" style={{ display: "block", color: "var(--pur-alt)" }}>{x.email}</span>}
          </span>
          <MessageCircle aria-label={`Message ${x.user.name}`} style={{ width: 18, height: 18, color: "var(--pur-alt)" }} />
        </Link>
      ))}
    </div>
  );
}

export default function Network() {
  const a = useStore(auth);
  const { section } = useParams();
  const navigate = useNavigate();
  const people = useDirectory();
  const [scan, setScan] = useState(false);
  const signedIn = isSignedIn(a);
  const tab = signedIn ? (SECTIONS.find((x) => x.id === section)?.id || "recommended") : "speakers";

  useEffect(() => {
    if (!signedIn) return;
    refreshConnections(); refreshThreads(); refreshPeople("");
  }, [signedIn]);

  const right = signedIn ? (
    <div className="row" style={{ gap: 0 }}>
      <IconButton icon={QrCode} label="My connect QR" onClick={() => navigate("/profile/pass?tab=connect")} />
      <button type="button" className="btn btn-sm btn-ghost" style={{ border: 0, padding: "0 8px" }} onClick={() => setScan(true)} aria-label="Scan a badge"><ScanLine aria-hidden="true" />Scan</button>
    </div>
  ) : null;

  return (
    <div className="page">
      <TopBar title="Network" back={false} right={right} />
      <main id="main" className="mt-16 stack">
        {signedIn ? (
          <Segmented scroll label="Network sections" value={tab} onChange={(v) => navigate(`/network/${v}`, { replace: true })}
            options={SECTIONS.map((x) => ({ value: x.id, label: x.icon ? "" : x.label, icon: x.icon, ariaLabel: x.label }))} />
        ) : (
          <div className="pad">
            <div className="banner">
              <Users aria-hidden="true" style={{ width: 20, height: 20, flex: "none" }} />
              <div style={{ flex: 1 }}><b className="small">Meet the people at TTFC</b><p>Sign in to see who's coming, get recommendations, connect and message.</p></div>
              <button type="button" className="btn" onClick={() => signOut()}>Sign in</button>
            </div>
          </div>
        )}
        {tab === "recommended" && <Recommended people={people} />}
        {tab === "all" && <Directory people={people} emptyText="Pass holders appear here. Check back soon." />}
        {tab === "connected" && <Connected onScan={() => setScan(true)} />}
        {tab === "speakers" && <SpeakersList />}
        {tab === "exhibitors" && <Directory people={people} only={["exhibitor"]} emptyText="Exhibitors appear here once they've joined the app." />}
        {tab === "staff" && <Directory people={people} only={["staff", "volunteer"]} emptyText="The TTFC team and volunteers appear here." />}
      </main>
      {scan && <Suspense fallback={null}><BadgeScanner onClose={() => setScan(false)} onConnected={() => navigate("/network/connected")} /></Suspense>}
    </div>
  );
}
