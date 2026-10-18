import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Cpu, Mic } from "lucide-react";
import { useStore } from "../lib/store";
import { cms } from "../lib/cms";
import { APPLIED_SECTORS, TECH_PILLARS } from "../lib/config";
import { Avatar, Empty, Kicker, Spinner } from "./ui";
import { FilterSelect, SearchField } from "./Filters";

/* Network › Speakers (iOS NetworkSpeakersView): everyone on the website's speaker list, searchable, with Industry / Tech filters. */

export default function SpeakersList() {
  const c = useStore(cms);
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState(null);
  const [tech, setTech] = useState(null);

  // A speaker's topics: their CMS tags plus those of every session they're on.
  const topicsById = useMemo(() => {
    const m = new Map();
    for (const sp of c.speakers) m.set(sp.id, new Set(sp.topics));
    for (const s of c.sessions) for (const id of s.speakerIds) { if (!m.has(id)) m.set(id, new Set()); s.topics.forEach((t) => m.get(id).add(t)); }
    return m;
  }, [c.speakers, c.sessions]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return c.speakers.filter((sp) => {
      if (t && ![sp.name, sp.company, sp.title].some((x) => String(x).toLowerCase().includes(t))) return false;
      const topics = topicsById.get(sp.id) || new Set();
      if (industry && !topics.has(industry)) return false;
      if (tech && !topics.has(tech)) return false;
      return true;
    });
  }, [c.speakers, q, industry, tech, topicsById]);

  return (
    <div className="stack">
      <div className="pad"><SearchField value={q} onChange={setQ} placeholder="Search speakers or companies" /></div>
      <div className="chips" role="group" aria-label="Filters">
        <FilterSelect label="Industry" icon={Building2} value={industry} options={APPLIED_SECTORS} onChange={setIndustry} />
        <FilterSelect label="Tech" icon={Cpu} value={tech} options={TECH_PILLARS} onChange={setTech} />
      </div>
      {!c.loaded ? <Spinner /> : list.length === 0 ? <Empty icon={Mic}>No speakers match that yet.</Empty> : (
        <div className="pad stack-sm">
          {list.map((sp) => (
            <Link key={sp.id} to={`/speakers/${encodeURIComponent(sp.id)}`} className="person-card pressable" style={{ color: "inherit", textDecoration: "none" }}>
              <Avatar name={sp.name} src={sp.photo} size={48} />
              <span className="info">
                <span className="row" style={{ gap: 6 }}><span className="person-name ellipsis">{sp.name}</span>{sp.isKeynote && <Kicker tone="accent">Keynote</Kicker>}</span>
                <span className="small muted clamp-2" style={{ display: "-webkit-box" }}>{[sp.title, sp.company].filter(Boolean).join(" · ")}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
