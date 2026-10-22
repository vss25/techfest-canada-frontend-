import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Compass } from "lucide-react";
import { useStore } from "../lib/store";
import { auth, isSignedIn } from "../lib/auth";
import { cms } from "../lib/cms";
import { canMessage, refreshPeople, social } from "../lib/social";
import { fileURL, shortTopic } from "../lib/config";
import { publicBadge } from "../lib/people";
import { companyKey, orgInitials } from "../lib/orgKey";
import { safeHref } from "../lib/ui";
import { Avatar, DoneButton, Sheet } from "./ui";
import { BubbleFill } from "./Glyphs";

/* =========================================================
   Organisations' pieces, shared by Home's preview and the
   Organisations page (Oct 21 2026: the organiser found the
   sponsors' long cards pushed the attending organisations off
   the screen). Featured Partners: one compact row of logo
   cards that scrolls sideways only. In attendance: a dense
   logo grid, three across on a phone. A tap opens the partner
   sheet (iOS PartnerDetailView): what they are, who from there
   is coming, their website.
========================================================= */

/** The logo on a white tile (logos are made for white), or a clean monogram when there's none or it won't load. */
export function OrgLogo({ o, max = 34 }) {
  const [failed, setFailed] = useState("");
  if (!o.logo || failed === o.logo) return <span className="org-monogram" aria-hidden="true">{orgInitials(o.displayName)}</span>;
  return <img src={o.logo} alt="" loading="lazy" decoding="async" onError={() => setFailed(o.logo)} style={{ maxHeight: `${Math.round(max * Math.min(1.6, o.scale || 1))}px` }} />;
}

/** One tile: logo, name under it. */
export function OrgTile({ o, onOpen }) {
  return (
    <button type="button" className="org-tile pressable" onClick={() => onOpen(o)} aria-label={o.displayName}>
      <span className="org-logo"><OrgLogo o={o} /></span>
      <span className="org-name">{o.displayName}</span>
    </button>
  );
}

/** Featured Partners: one row of logo cards, sideways only. */
export function FeaturedRow({ list, onOpen, label = "Featured Partners" }) {
  return (
    <div className="feat-row" role="list" aria-label={label}>
      {list.map((o) => (
        <div key={o.id} role="listitem" className="feat-item">
          <button type="button" className="feat-card pressable" onClick={() => onOpen(o)} aria-label={o.displayName}>
            <span className="feat-logo"><OrgLogo o={o} max={40} /></span>
            <span className="org-name">{o.displayName}</span>
          </button>
        </div>
      ))}
    </div>
  );
}

/** In attendance: the grid (three across on a phone). */
export function OrgGrid({ list, onOpen }) {
  return <div className="org-grid">{list.map((o) => <OrgTile key={o.id} o={o} onOpen={onOpen} />)}</div>;
}

/** iOS PartnerDetailView (without the bundled company news): the logo, what kind, topics, what they do (sponsors),
    who from there is coming (people matched by the organisation's key, as the server groups them), the website. */
export function PartnerSheet({ p, onClose }) {
  const c = useStore(cms);
  const s = useStore(social);
  const a = useStore(auth);
  const navigate = useNavigate();
  // People: the directory's `orgKey` (the server's own grouping, merges included) is this organisation's key; without
  // one, their organisation's name normalised as the server does (lib/orgKey.js) is the key or one merged into it.
  const key = p.key || companyKey(p.displayName);
  const keys = new Set([key, ...(p.aliases || [])]);
  const fromHere = (x) => (x.orgKey ? x.orgKey === key : keys.has(companyKey(x.organization)));
  const shortName = p.displayName.split(" ")[0];
  useEffect(() => { if (isSignedIn(a) && !social.get().people.length) refreshPeople(""); }, [a]);
  const speakers = c.speakers.filter((sp) => keys.has(companyKey(sp.company)));
  const attendees = s.people.filter((x) => fromHere(x) && !s.blocked.includes(x.id) && !speakers.some((sp) => sp.name === x.name));
  const href = safeHref(p.website);
  return (
    <Sheet open onClose={onClose} title={p.displayName} full actions={{ right: <DoneButton onClick={onClose} /> }}>
      <div className="sheet-body partner-sheet">
        <div className="partner-hero">
          {p.logo ? <OrgLogo o={p} max={70} /> : <span className="org-monogram org-monogram--lg" aria-hidden="true">{orgInitials(p.displayName)}</span>}
        </div>
        <div className="stack-sm">
          <h2 className="partner-title">{p.displayName}</h2>
          <div className="row wrap" style={{ gap: 6 }}>
            {p.categoryLabel && <span className="kicker">{p.categoryLabel}</span>}
            {(p.topics || []).slice(0, 3).map((t) => <span key={t} className="kicker kicker--pur">{shortTopic(t)}</span>)}
          </div>
        </div>
        {p.description && <p className="partner-about">{p.description}</p>}
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
