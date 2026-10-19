import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Cpu, Mic } from "lucide-react";
import { useStore } from "../lib/store";
import { auth, isSignedIn } from "../lib/auth";
import { cms, nameKeys } from "../lib/cms";
import { refreshPeople, social } from "../lib/social";
import { recoSignals } from "../lib/people";
import { APPLIED_SECTORS, TECH_PILLARS } from "../lib/config";
import { Avatar, Spinner } from "./ui";
import { FilterSelect, SearchField } from "./Filters";
import { PersonActions } from "./People";
import { AlphaIndexBar } from "./AlphaIndex";
import { jumpToRow, useAlphaTargets } from "../lib/alpha";

/* =========================================================
   Network › Speakers (iOS NetworkSpeakersView): every
   confirmed speaker, A to Z, in the same cards as the rest of
   Network: photo, name and company, with Connect / Message
   icon buttons when they're on the app ("Not on the app yet"
   otherwise). Search and the Industry / Tech filters work as
   in Network › All; a card opens the speaker page.
========================================================= */

export default function SpeakersList() {
  const c = useStore(cms);
  const s = useStore(social);
  const a = useStore(auth);
  const signedIn = isSignedIn(a);
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState(null);
  const [tech, setTech] = useState(null);

  // Speakers' app accounts come from the directory (iOS: fetched when it's empty).
  useEffect(() => { if (signedIn && !social.get().people.length) refreshPeople(""); }, [signedIn]);

  // A speaker's topics: their CMS tags plus those of every session they're on (iOS SpeakerService).
  const topicsById = useMemo(() => {
    const m = new Map();
    for (const sp of c.speakers) m.set(sp.id, new Set(sp.topics));
    for (const x of c.sessions) for (const id of x.speakerIds) { if (!m.has(id)) m.set(id, new Set()); x.topics.forEach((t) => m.get(id).add(t)); }
    return m;
  }, [c.speakers, c.sessions]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return c.speakers.filter((sp) => {
      if (t && ![sp.name, sp.company, sp.title].some((x) => String(x || "").toLowerCase().includes(t))) return false;
      const topics = topicsById.get(sp.id) || new Set();
      if (industry && !topics.has(industry)) return false;
      if (tech && !topics.has(tech)) return false;
      return true;
    }).sort((x, y) => x.name.localeCompare(y.name, undefined, { sensitivity: "base" }));
  }, [c.speakers, q, industry, tech, topicsById]);

  /** iOS SyncService.appAccount(for:): someone on the app with the speaker's name. */
  const accounts = useMemo(() => {
    const m = new Map();
    if (!signedIn) return m;
    for (const p of s.people) {
      if (p.onApp === false) continue;
      for (const k of nameKeys(p.name)) if (!m.has(k)) m.set(k, p);
    }
    return m;
  }, [s.people, signedIn]);
  const accountOf = (sp) => { for (const k of nameKeys(sp.name)) if (accounts.has(k)) return accounts.get(k); return null; };

  const letters = useAlphaTargets(list, { enabled: !q });

  return (
    <div className="stack">
      <div className="pad"><SearchField value={q} onChange={setQ} placeholder="Search speakers or companies" /></div>
      <div className="chips" role="group" aria-label="Filters">
        <FilterSelect label="Industry" icon={Building2} value={industry} options={APPLIED_SECTORS} onChange={(v) => { setIndustry(v); if (v) recoSignals.usedTopic(v); }} />
        <FilterSelect label="Tech" icon={Cpu} value={tech} options={TECH_PILLARS} onChange={(v) => { setTech(v); if (v) recoSignals.usedTopic(v); }} />
      </div>
      {!c.loaded ? <Spinner label="Loading speakers" /> : list.length === 0 ? (
        <div className="empty-note"><Mic aria-hidden="true" />No speakers match that yet.</div>
      ) : (
        <div className="stack-sm" style={{ gap: 10, paddingLeft: 16, paddingRight: letters.length ? 30 : 16 }}>
          {list.map((sp) => {
            const href = `/speakers/${encodeURIComponent(sp.id)}`;
            return (
              <div key={sp.id} id={`sp-${sp.id}`} className="person-card">
                <Link to={href} tabIndex={-1} aria-hidden="true" className="avatar-link">
                  <Avatar name={sp.name} src={sp.photo} size={40} round={!!sp.photo} />
                </Link>
                <Link to={href} className="info person-link">
                  <span className="person-name ellipsis">{sp.name}</span>
                  {sp.company && <span className="person-org ellipsis">{sp.company}</span>}
                </Link>
                <PersonActions person={accountOf(sp)} state={s} />
              </div>
            );
          })}
        </div>
      )}
      {letters.length > 0 && <AlphaIndexBar letters={letters} onPick={(x) => jumpToRow(`sp-${x.id}`)} />}
    </div>
  );
}
