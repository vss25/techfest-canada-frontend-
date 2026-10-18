import { useEffect, useMemo, useState } from "react";
import { Building2, Search } from "lucide-react";
import { useStore } from "../lib/store";
import { cms, refreshCMS } from "../lib/cms";
import { TECH_PILLARS, shortTopic } from "../lib/config";
import { safeHref } from "../lib/ui";
import { Chip, Empty, Spinner, TopBar } from "../components/ui";

/* Every attending organisation (iOS PartnersListView), from the CMS partner list. */

const ORDER = ["Corporate", "Startups", "Government", "Associations", "Academia & research", "International", "Partners", "Supporters"];

export default function Organisations() {
  const c = useStore(cms);
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState(null);
  useEffect(() => { refreshCMS(); }, []);

  const groups = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = c.partners.filter((p) => p.logo && (!t || p.displayName.toLowerCase().includes(t)) && (!topic || p.topics.includes(topic)));
    const by = new Map();
    for (const p of list) { if (!by.has(p.categoryLabel)) by.set(p.categoryLabel, []); by.get(p.categoryLabel).push(p); }
    return ORDER.filter((k) => by.has(k)).map((k) => ({ label: k, items: by.get(k) }));
  }, [c.partners, q, topic]);

  return (
    <div className="page">
      <TopBar title="Organisations" />
      <main id="main" className="mt-16 stack">
        <div className="pad search">
          <Search aria-hidden="true" style={{ left: 29 }} />
          <input className="input" type="search" placeholder="Search organisations" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search organisations" />
        </div>
        <div className="chips" role="group" aria-label="Filter by topic">
          <Chip on={!topic} onClick={() => setTopic(null)}>All</Chip>
          {TECH_PILLARS.map((t) => <Chip key={t} on={topic === t} onClick={() => setTopic(topic === t ? null : t)}>{shortTopic(t)}</Chip>)}
        </div>
        {!c.loaded ? <Spinner /> : groups.length === 0 ? <Empty icon={Building2} title="No organisations match" /> : groups.map((g) => (
          <section key={g.label} className="pad stack-sm" aria-labelledby={`g-${g.label}`}>
            <h2 id={`g-${g.label}`} className="section-title">{g.label}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 10 }}>
              {g.items.map((p) => {
                const href = safeHref(p.website);
                const tile = (
                  <>
                    <span className="logo-tile" style={{ width: "100%", height: 64 }}><img src={p.logo} alt="" loading="lazy" crossOrigin="anonymous" style={{ transform: `scale(${Math.min(1.3, p.scale)})` }} /></span>
                    <span className="tiny center ellipsis" style={{ display: "block", marginTop: 4 }}>{p.displayName}</span>
                  </>
                );
                return href
                  ? <a key={p.id} href={href} target="_blank" rel="noopener noreferrer" className="pressable" style={{ color: "inherit", textDecoration: "none" }} aria-label={p.displayName}>{tile}</a>
                  : <div key={p.id} aria-label={p.displayName}>{tile}</div>;
              })}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
