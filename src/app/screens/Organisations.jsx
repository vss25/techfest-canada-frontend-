import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, ChevronRight, ChevronUp, Compass, ExternalLink, Grid3x3, Star } from "lucide-react";
import { useStore } from "../lib/store";
import { auth, isSignedIn } from "../lib/auth";
import { cms, partnerKey, refreshCMS, sponsorsShown } from "../lib/cms";
import { content, text } from "../lib/content";
import { canMessage, refreshPeople, social } from "../lib/social";
import { fileURL, shortTopic } from "../lib/config";
import { publicBadge } from "../lib/people";
import { safeHref } from "../lib/ui";
import { Avatar, Chip, DoneButton, Sheet, Spinner, TopBar } from "../components/ui";
import { BubbleFill } from "../components/Glyphs";

/* Every attending organisation (iOS PartnersListView = PartnersSection, expanded):
   the sponsors first (Featured Partners row, with their description and link),
   then "In attendance": filter by topic or kind, a grid of logo tiles, and a
   tap for what they are and who from there is coming. */

/** iOS PartnersSection.topicFilters / kindFilters. */
const TOPIC_FILTERS = [
  ["AI", "Artificial Intelligence"], ["Cybersecurity", "Cybersecurity"], ["Quantum", "Quantum Computing"],
  ["Robotics", "Robotics & Automation"], ["Finance", "Banking, Financial Services & Insurance"],
  ["Healthcare", "Healthcare & Lifesciences"], ["Supply chain", "Supply Chain, Manufacturing & Infrastructure"],
  ["Sustainability", "Sustainability & CleanTech"], ["Energy", "Energy & Utilities"], ["Defence", "Defence & Public Safety"],
];
const KIND_FILTERS = ["Government", "Startups", "Academia & research", "Associations"];
const FILTERS = ["All", ...TOPIC_FILTERS.map(([l]) => l), ...KIND_FILTERS];

/** iOS PartnerTile: the logo on a white tile (logos are made for white), the name under it. */
function PartnerTile({ p, onOpen }) {
  return (
    <button type="button" className="partner-tile pressable" onClick={() => onOpen(p)} aria-label={p.displayName}>
      <span className="partner-logo"><img src={p.logo} alt="" loading="lazy" crossOrigin="anonymous" style={{ maxHeight: `${Math.round(34 * Math.min(1.6, p.scale))}px` }} /></span>
      <span className="partner-name ellipsis">{p.displayName}</span>
    </button>
  );
}

/** iOS PartnerDetailView (without the bundled company news): the logo, what kind, topics, who's coming, the website. */
function PartnerSheet({ p, onClose }) {
  const c = useStore(cms);
  const s = useStore(social);
  const a = useStore(auth);
  const navigate = useNavigate();
  const key = partnerKey(p.displayName);
  const shortName = p.displayName.split(" ")[0];
  useEffect(() => { if (isSignedIn(a) && !social.get().people.length) refreshPeople(""); }, [a]);
  const speakers = c.speakers.filter((sp) => partnerKey(sp.company) === key || String(sp.company || "").toLowerCase().includes(p.displayName.toLowerCase()));
  const attendees = s.people.filter((x) => partnerKey(x.organization) === key && !speakers.some((sp) => sp.name === x.name));
  const href = safeHref(p.website);
  return (
    <Sheet open onClose={onClose} title={p.displayName} full actions={{ right: <DoneButton onClick={onClose} /> }}>
      <div className="sheet-body partner-sheet">
        <div className="partner-hero"><img src={p.logo} alt="" crossOrigin="anonymous" style={{ maxHeight: `${Math.round(70 * Math.min(1.4, p.scale))}px` }} /></div>
        <div className="stack-sm">
          <h2 className="partner-title">{p.displayName}</h2>
          <div className="row wrap" style={{ gap: 6 }}>
            {p.categoryLabel && <span className="kicker">{p.categoryLabel}</span>}
            {(p.topics || []).slice(0, 3).map((t) => <span key={t} className="kicker kicker--pur">{shortTopic(t)}</span>)}
          </div>
        </div>
        {(speakers.length > 0 || attendees.length > 0) && (
          <section className="stack-sm" style={{ gap: 10 }}>
            <h3 className="partner-people-h">From {shortName} at TTFC</h3>
            {speakers.map((sp) => (
              <Link key={sp.id} to={`/speakers/${encodeURIComponent(sp.id)}`} className="member-row pressable" style={{ color: "inherit", textDecoration: "none" }} onClick={onClose}>
                <Avatar name={sp.name} src={sp.photo} size={44} round={!!sp.photo} />
                <span style={{ flex: 1, minWidth: 0 }}><b className="ellipsis" style={{ display: "block" }}>{sp.name}</b><span className="ellipsis muted" style={{ display: "block", fontSize: 12.5 }}>{[sp.title, "Speaker"].filter(Boolean).join(" · ")}</span></span>
                <ChevronRight aria-hidden="true" style={{ width: 14, height: 14, color: "var(--tx2)" }} />
              </Link>
            ))}
            {attendees.map((x) => (
              <div key={x.id} className="member-row">
                <Avatar name={x.name} src={fileURL(x.avatarUrl)} size={44} tierRing={!!publicBadge(x)} />
                <span style={{ flex: 1, minWidth: 0 }}><b className="ellipsis" style={{ display: "block" }}>{x.name}</b><span className="ellipsis muted" style={{ display: "block", fontSize: 12.5 }}>{[x.jobTitle, publicBadge(x)].filter(Boolean).join(" · ")}</span></span>
                {x.onApp === false ? <span className="muted" style={{ fontSize: 11 }}>Not on the app</span>
                  : canMessage(x, s) ? <button type="button" className="plus-btn pressable" style={{ width: 36, height: 36 }} aria-label={`Message ${x.name}`} onClick={() => { onClose(); navigate(`/chat/${encodeURIComponent(x.id)}`); }}><BubbleFill /></button> : null}
              </div>
            ))}
          </section>
        )}
        {href && <a className="li-link li-link--lg" href={href} target="_blank" rel="noopener noreferrer"><Compass aria-hidden="true" />Visit website</a>}
      </div>
    </Sheet>
  );
}

const initials = (name) => String(name || "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

function SponsorCard({ p }) {
  const href = safeHref(p.website);
  return (
    <article className="card sponsor-card" aria-label={p.displayName}>
      <div className="sponsor-logo" aria-hidden="true">
        {p.logo
          ? <img src={p.logo} alt="" loading="lazy" crossOrigin="anonymous" style={{ maxHeight: `${Math.round(46 * Math.min(1.4, p.scale))}px` }} />
          : <span className="sponsor-monogram">{initials(p.displayName)}</span>}
      </div>
      <h3 className="sponsor-name">{p.displayName}</h3>
      {p.description && <p className="sponsor-about">{p.description}</p>}
      {href && (
        <a className="sponsor-link pressable" href={href} target="_blank" rel="noopener noreferrer">
          <ExternalLink aria-hidden="true" /> Visit website
        </a>
      )}
    </article>
  );
}

export default function Organisations() {
  const c = useStore(cms);
  const { mode } = useStore(auth);
  const ct = useStore(content);
  const [filter, setFilter] = useState("All");
  const [showAll, setShowAll] = useState(true);
  const [opened, setOpened] = useState(null);
  useEffect(() => { refreshCMS(); }, []);

  const sponsors = useMemo(() => sponsorsShown(c, { demo: mode === "demo" }), [c, mode]);

  const visible = useMemo(() => {
    const list = c.partners.filter((p) => p.logo && !p.isSponsor);
    if (filter === "All") return list;
    const t = TOPIC_FILTERS.find(([l]) => l === filter);
    return t ? list.filter((p) => p.topics.includes(t[1])) : list.filter((p) => p.categoryLabel === filter);
  }, [c.partners, filter]);
  const shown = showAll ? visible : visible.slice(0, 9);

  return (
    <div className="page">
      <TopBar title="Organisations" />
      <main id="main" className="mt-16 stack">
        {sponsors.length > 0 && (
          <section className="pad stack-sm" aria-labelledby="g-sponsors">
            <h2 id="g-sponsors" className="section-h row sponsor-h">
              <Star aria-hidden="true" /> Featured Partners
            </h2>
            <div className="sponsor-grid">
              {sponsors.map((p) => <SponsorCard key={p.id} p={p} />)}
            </div>
          </section>
        )}
        <section className="pad stack" aria-labelledby="g-attending">
          <div className="row" style={{ alignItems: "baseline" }}>
            <h2 id="g-attending" className="attending-h"><Building2 aria-hidden="true" />{text(ct, "home.partners_title", "In attendance")}</h2>
            {showAll && visible.length > 9 && <button type="button" className="fewer-btn pressable" onClick={() => setShowAll(false)}><ChevronUp aria-hidden="true" />Show fewer</button>}
          </div>
          <div className="chips" role="group" aria-label="Filter organisations" style={{ margin: "0 -16px" }}>
            {FILTERS.map((f) => <Chip key={f} on={filter === f} onClick={() => setFilter(f)}>{f}</Chip>)}
          </div>
          {!c.loaded ? <Spinner /> : visible.length === 0 ? (
            <p className="muted" style={{ margin: 0, padding: "18px 0", fontSize: 13 }}>No partners tagged {filter} yet.</p>
          ) : (
            <>
              <div className="partner-grid">{shown.map((p) => <PartnerTile key={p.id} p={p} onOpen={setOpened} />)}</div>
              {visible.length > 9 && (
                <button type="button" className="all-btn pressable" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? <ChevronUp aria-hidden="true" /> : <Grid3x3 aria-hidden="true" />}{showAll ? "Show fewer" : "See all partners"}
                </button>
              )}
            </>
          )}
        </section>
      </main>
      {opened && <PartnerSheet p={opened} onClose={() => setOpened(null)} />}
    </div>
  );
}
