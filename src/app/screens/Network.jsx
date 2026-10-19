import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Building2, Check, Cpu, QrCode, ScanLine, Sparkles, Users, X, Heart, IdCard, Bookmark, ListFilter, Eye } from "lucide-react";
import { useStore } from "../lib/store";
import { auth, isSignedIn } from "../lib/auth";
import { cms, nameKey, sessionById, speakerById, speakerByName } from "../lib/cms";
import { content, text } from "../lib/content";
import { bookmarks, canMessage, canRequest, refreshConnections, refreshPeople, refreshThreads, social } from "../lib/social";
import { APPLIED_SECTORS, TECH_PILLARS } from "../lib/config";
import { recoSignals, recommend, topicPoints } from "../lib/people";
import { givenName, showAlert } from "../lib/ui";
import { DoneButton, IconButton, Popover, Segmented, Sheet, Spinner, TopBar } from "../components/ui";
import { FilterSelect, SearchField } from "../components/Filters";
import { ConnectedRow, PersonCard } from "../components/People";
import { AlphaIndexBar } from "../components/AlphaIndex";
import { jumpToRow, useAlphaTargets } from "../lib/alpha";
import { PeopleSlash } from "../components/Glyphs";
import SpeakersList from "../components/SpeakersList";

const BadgeScanner = lazy(() => import("../components/BadgeScanner"));

/* =========================================================
   Network (iOS NetworkView + AttendeeDirectoryView):
   Recommended · All · Connected · Speakers · Exhibitors · Staff,
   pinned under the title. Everyone at TTFC (GET
   /social/attendees), A to Z, with search (names and
   companies), Industry and Tech filters. Cards show name,
   company and icons; connect / withdraw / accept / message
   follow each person's switches and your account's rights.
   Guests get Connected and Speakers, as on iOS.
========================================================= */

const SECTIONS = [
  { id: "recommended", label: "Recommended", icon: Sparkles },
  { id: "all", label: "All" },
  { id: "connected", label: "Connected" },
  { id: "speakers", label: "Speakers" },
  { id: "exhibitors", label: "Exhibitors" },
  { id: "staff", label: "Staff" },
];
const GUEST_SECTIONS = ["connected", "speakers"];

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

/** Recommendations for every card ("Recommended" under the name) and the Recommended section. */
function useRecommendations(people) {
  const s = useStore(social);
  const a = useStore(auth);
  const c = useStore(cms);
  return useMemo(() => {
    const me = a.me || {};
    const saved = bookmarks(s).map((id) => sessionById(id, c)).filter(Boolean);
    const keys = new Map();
    for (const x of saved) for (const id of x.speakerIds) { const sp = speakerById(id, c); if (sp) keys.set(nameKey(sp.name), x.title); }
    const connected = new Set([...s.connections.accepted, ...s.connections.outgoing, ...s.connections.incoming].map((x) => x.user?.id));
    return recommend(people, { id: me.id, topics: me.topics || [], jobTitle: me.jobTitle || "", organization: me.organization || "", tagline: me.tagline || "", savedSessions: saved, savedSpeakerKeys: keys },
      { connectedIds: connected, canContact: (p) => canMessage(p, s) || canRequest(p, s), isBlocked: (id) => s.blocked.includes(id) });
  }, [people, s, a.me, c]);
}

/** "Why Maya": the reasons, in a popover by the dashed "Recommended". */
function useWhy() {
  const [why, setWhy] = useState(null);
  const close = useCallback(() => setWhy(null), []);
  const open = useCallback((p, rec, rect) => setWhy({ p, rec, rect }), []);
  const popover = why && (
    <Popover anchor={why.rect} onClose={close} label={`Why ${givenName(why.p.name)}`}>
      <h3 className="why-title">Why {givenName(why.p.name)}</h3>
      <ul className="why-list">
        {why.rec.reasons.slice(0, 4).map((r) => <li key={r}><Check aria-hidden="true" />{r}</li>)}
      </ul>
    </Popover>
  );
  return [open, popover];
}

function Directory({ people, recs, only, emptyText }) {
  const s = useStore(social);
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState(null);
  const [tech, setTech] = useState(null);
  const [company, setCompany] = useState(null);
  const [onWhy, whyPopover] = useWhy();
  const recById = useMemo(() => new Map(recs.map((r) => [r.person.id, r])), [recs]);

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

  // Typing part of a company name offers the companies that match; picking one lists the people there.
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

  const letters = useAlphaTargets(shown, { enabled: !q });
  const filtering = !!(q || industry || tech || company);

  return (
    <div className="stack">
      <div className="pad"><SearchField value={q} onChange={(v) => { setQ(v); if (!v) refreshPeople(""); }} placeholder="Search people or companies" /></div>
      {companies.length > 0 && (
        <div className="chips" aria-label="Companies">
          {companies.map(([name, n]) => (
            <button key={name} type="button" className="chip chip--menu chip--suggest pressable" onClick={() => { recoSignals.usedCompany(name); setCompany(name); setQ(""); }} aria-label={`${name}, ${n} ${n === 1 ? "person" : "people"}`}>
              <Building2 aria-hidden="true" />{name}<span className="chip-count">{n}</span>
            </button>
          ))}
        </div>
      )}
      {people.length > 0 && (
        <div className="chips" role="group" aria-label="Filters">
          <FilterSelect label="Industry" icon={Building2} value={industry} options={APPLIED_SECTORS} onChange={(v) => { setIndustry(v); if (v) recoSignals.usedTopic(v); }} />
          <FilterSelect label="Tech" icon={Cpu} value={tech} options={TECH_PILLARS} onChange={(v) => { setTech(v); if (v) recoSignals.usedTopic(v); }} />
          {company && (
            <button type="button" className="chip chip--menu chip--on pressable" onClick={() => setCompany(null)} aria-label={`Company: ${company}. Clear`}>
              <Building2 aria-hidden="true" />{company}<X aria-hidden="true" className="chev" />
            </button>
          )}
        </div>
      )}
      {!s.peopleLoaded ? <Spinner label="Loading people" /> : shown.length === 0 ? (
        <div className="empty-note"><Users aria-hidden="true" />{filtering ? "No one matches that yet." : emptyText}</div>
      ) : (
        <div className="stack" style={{ paddingLeft: 16, paddingRight: letters.length ? 30 : 16 }}>
          {shown.map((p) => <div key={p.id} id={`p-${p.id}`}><PersonCard person={p} state={s} rec={recById.get(p.id)} onWhy={onWhy} /></div>)}
        </div>
      )}
      {letters.length > 0 && <AlphaIndexBar letters={letters} onPick={(x) => jumpToRow(`p-${x.id}`)} />}
      {whyPopover}
    </div>
  );
}

const HOW = [
  [Heart, "The interests you chose for your profile"],
  [IdCard, "Your title, company and profile description"],
  [Bookmark, "Sessions you bookmarked, and who's speaking at them"],
  [ListFilter, "The industry and tech filters you use, and companies you search for"],
  [Eye, "The roles of people whose profiles you open"],
];

/** "How we pick" (iOS HowWeRecommendSheet): the signals, with the fine print at the bottom. */
function HowWePick({ onClose }) {
  return (
    <Sheet open onClose={onClose} title="How we pick" medium actions={{ right: <DoneButton onClick={onClose} /> }}
      footer="We leave out people you're already connected with, people who aren't on the app yet, and the TTFC team. The list updates as you use the app. It's worked out on your phone and isn't shared with anyone.">
      <div className="how-list">
        <p>People at TTFC you're likely to want to meet, picked from:</p>
        {HOW.map(([icon, t]) => { const Icon = icon; return <div key={t} className="row"><Icon aria-hidden="true" /><span>{t}</span></div>; })}
      </div>
    </Sheet>
  );
}

function Recommended({ recs }) {
  const s = useStore(social);
  const [how, setHow] = useState(false);
  const [onWhy, whyPopover] = useWhy();
  return (
    <div className="stack">
      <div className="pad row" style={{ alignItems: "baseline" }}>
        <h2 style={{ flex: 1, margin: 0, fontSize: 14, fontWeight: 600 }}>Picked for you</h2>
        <button type="button" className="dashed" onClick={() => setHow(true)} aria-description="Explains how recommendations are made">How we pick</button>
      </div>
      {!s.peopleLoaded ? <Spinner /> : recs.length === 0 ? (
        <div className="empty-note"><Sparkles aria-hidden="true" />Add your interests in Profile and save a few sessions, and we'll suggest people to meet.</div>
      ) : (
        <div className="pad stack">{recs.map((r) => <PersonCard key={r.person.id} person={r.person} state={s} rec={r} onWhy={onWhy} />)}</div>
      )}
      {how && <HowWePick onClose={() => setHow(false)} />}
      {whyPopover}
    </div>
  );
}

function Connected({ onScan, signedIn }) {
  const s = useStore(social);
  const ct = useStore(content);
  const list = [...s.connections.accepted].filter((x) => !s.blocked.includes(x.user?.id))
    .sort((a, b) => (a.kind === "inPerson" ? 0 : 1) - (b.kind === "inPerson" ? 0 : 1) || Date.parse(a.createdAt) - Date.parse(b.createdAt));
  if (signedIn && !s.connectionsLoaded) return <Spinner />;
  if (!list.length) {
    // The one place the scan prompt still helps: before your first connection.
    return (
      <div className="pad">
        <div className="inperson">
          <span className="inperson-ico" aria-hidden="true"><ScanLine /></span>
          <div style={{ flex: 1, minWidth: 0 }}><b>Met someone? Scan their badge</b><span>Instant connection, contact details exchanged.</span></div>
          <button type="button" className="scan-btn pressable" onClick={onScan} aria-label="Scan a badge">SCAN</button>
        </div>
        <div className="net-empty">
          <PeopleSlash aria-hidden="true" />
          <h3>No connections yet</h3>
          <p>{text(ct, "network.empty", "Scan someone's badge QR when you meet, or open a speaker profile and tap 'Connect'.")}</p>
        </div>
      </div>
    );
  }
  return <div className="pad stack-sm" style={{ gap: 10 }}>{list.map((x) => <ConnectedRow key={x.id} conn={x} />)}</div>;
}

export default function Network() {
  const a = useStore(auth);
  const { section } = useParams();
  const navigate = useNavigate();
  const people = useDirectory();
  const [scan, setScan] = useState(false);
  const signedIn = isSignedIn(a);
  const sections = signedIn ? SECTIONS : SECTIONS.filter((x) => GUEST_SECTIONS.includes(x.id));
  const tab = sections.find((x) => x.id === section)?.id || sections[0].id;
  const recs = useRecommendations(signedIn ? people : []);

  useEffect(() => {
    if (!signedIn) return;
    refreshConnections(); refreshThreads(); refreshPeople("");
  }, [signedIn]);

  const openScanner = () => {
    if (!signedIn) { showAlert("Sign up to connect", "Create a free profile to scan badges and build your network."); return; }
    setScan(true);
  };
  const openMyQR = () => {
    if (!signedIn) { showAlert("Sign up for a badge QR", "Your connect QR is generated from your profile."); return; }
    navigate("/profile/pass?tab=connect");
  };

  const right = (
    <div className="glass-group">
      <IconButton icon={QrCode} label="My connect QR" onClick={openMyQR} />
      {/* Labelled, so it reads as "scan someone" next to your own QR. */}
      <button type="button" className="glass-item pressable" onClick={openScanner} aria-label="Scan a badge"><ScanLine aria-hidden="true" />Scan</button>
    </div>
  );
  const pills = (
    <Segmented scroll label="Network sections" value={tab} onChange={(v) => navigate(`/network/${v}`, { replace: true })}
      options={sections.map((x) => ({ value: x.id, label: x.icon ? "" : x.label, icon: x.icon, ariaLabel: x.label }))} />
  );

  return (
    <div className="page">
      <TopBar title="Network" back={false} right={right} titleLeft below={pills} />
      <main id="main" className="stack" style={{ paddingTop: 8 }}>
        {tab === "recommended" && <Recommended recs={recs} />}
        {tab === "all" && <Directory people={people} recs={recs} emptyText="Pass holders appear here. Check back soon." />}
        {tab === "connected" && <Connected onScan={openScanner} signedIn={signedIn} />}
        {tab === "speakers" && <SpeakersList />}
        {tab === "exhibitors" && <Directory people={people} recs={recs} only={["exhibitor"]} emptyText="Exhibitors appear here once they've joined the app." />}
        {tab === "staff" && <Directory people={people} recs={recs} only={["staff", "volunteer"]} emptyText="The TTFC team and volunteers appear here." />}
      </main>
      {scan && <Suspense fallback={null}><BadgeScanner onClose={() => setScan(false)} onConnected={() => navigate("/network/connected")} /></Suspense>}
    </div>
  );
}
