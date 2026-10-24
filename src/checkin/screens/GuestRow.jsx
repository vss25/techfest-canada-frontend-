import { PassBand, Chips } from "../components.jsx";
import { badgeOf } from "../lib/passColors.js";
import { companyOf, highlight, matchLabel } from "../lib/search.js";

/** Text with the letters that matched the search in bold. */
function Marked({ text, q }) {
  if (!q) return text;
  return highlight(text, q).map((p, i) => (p.hit ? <b key={i} className="ci-hit">{p.text}</b> : <span key={i}>{p.text}</span>));
}

/* One guest in a list: their colour, name, company / job title, marks, a status line and the station's buttons.
   The whole name area opens the guest's sheet; the button does the station's main action. In search results
   (`match`: { q, kind }) the matched letters are bold and a company or spelling-tolerant match says so. A guest on the
   list with no pass on file (ISSUE PASS) has a dashed outline. */
export default function GuestRow({ guest, status, statusTone = "", actions, selected = false, onOpen, extra = null, id, match = null }) {
  const band = badgeOf(guest);
  const company = companyOf(guest);
  const job = [guest.title, company].filter(Boolean).join(" · ");
  const label = match ? matchLabel(match.kind) : "";
  const companyHit = match && (match.kind === "company" || match.kind === "initials" || match.kind === "mixed" || match.kind === "fuzzy-company");
  return (
    <li id={id} className={`ci-row${selected ? " is-selected" : ""}${band.noPass ? " is-issue" : ""}`} style={band.neutral ? undefined : { "--gbg": band.bg }} aria-selected={selected || undefined}>
      <button type="button" className="ci-row-main" onClick={() => onOpen?.(guest)}>
        <span className="ci-row-name"><Marked text={guest.name} q={match?.q} /></span>
        {job && <span className="ci-row-job">{companyHit ? <>{guest.title ? `${guest.title} · ` : ""}<Marked text={company} q={match.q} /></> : job}</span>}
        {label && <span className={`ci-match ci-match-${match.kind}`}>{label}</span>}
        <span className="ci-row-tags"><PassBand guest={guest} size="s" /><Chips guest={guest} /></span>
        {extra}
      </button>
      <div className="ci-row-side">
        {status && <span className={`ci-row-status${statusTone ? ` is-${statusTone}` : ""}`}>{status}</span>}
        <div className="ci-row-actions">{actions}</div>
      </div>
    </li>
  );
}
