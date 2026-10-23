import { PassBand, Chips } from "../components.jsx";
import { badgeOf } from "../lib/passColors.js";

/* One guest in a list: their colour, name, company / job title, marks, a status line and the station's buttons.
   The whole name area opens the guest's sheet; the button does the station's main action. */
export default function GuestRow({ guest, status, statusTone = "", actions, selected = false, onOpen, extra = null, id }) {
  const band = badgeOf(guest);
  const job = [guest.title, guest.company].filter(Boolean).join(" · ");
  return (
    <li id={id} className={`ci-row${selected ? " is-selected" : ""}`} style={{ "--gbg": band.bg }} aria-selected={selected || undefined}>
      <button type="button" className="ci-row-main" onClick={() => onOpen?.(guest)}>
        <span className="ci-row-name">{guest.name}</span>
        {job && <span className="ci-row-job">{job}</span>}
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
