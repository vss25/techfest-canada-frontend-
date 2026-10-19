import { useEffect } from "react";
import { ChevronRight, Copy, IdCard, UserRoundPlus } from "lucide-react";
import { useStore } from "../lib/store";
import { firstName } from "../lib/auth";
import { refreshConnections } from "../lib/social";
import { canShareContact, cardOf, copyText, manageSharing, myCard, shareVCardFile } from "../lib/myCard";
import { detailsCount, displayValue, itemTitle, tapAction } from "../lib/contactCard";
import { Button, IconButton } from "./ui";
import { KindBubble } from "./ContactGlyphs";
import "./contactCard.css";

/* =========================================================
   On someone's profile (spec section 7): the contact details
   they share with me (accepted connections only), "Save to
   contacts", and "What I share with <First>" (pending too).
   `state` = connectionWith(person.id): { status, conn }.
========================================================= */

export default function SharedContact({ person, state }) {
  const st = useStore(myCard);
  useEffect(() => { refreshConnections(); }, [person.id]);
  if (!state?.conn) return null;
  const conn = state.conn;
  const given = firstName(person.name) || "They";
  const accepted = state.status === "accepted";
  const shared = Array.isArray(conn.sharedContact) ? conn.sharedContact : Array.isArray(person.sharedContact) ? person.sharedContact : [];
  const canShare = canShareContact(cardOf(st));
  const mine = Array.isArray(conn.myShare) ? conn.myShare.length : 0;

  const saveToContacts = () => shareVCardFile({ name: person.name, jobTitle: person.jobTitle || "", organization: person.organization || "", items: shared });

  return (
    <section className="stack-sm" aria-label="Contact details">
      {accepted && (
        <>
          <h2 className="section-title row" style={{ gap: 6 }}><IdCard aria-hidden="true" style={{ width: 15, height: 15 }} />Contact details</h2>
          {shared.length ? (
            <>
              <div className="shared-list">
                {shared.map((it, i) => {
                  const act = tapAction(it);
                  const inner = (
                    <>
                      <KindBubble kind={it.kind} size={32} />
                      <span className="cc-text"><b className="ellipsis">{itemTitle(it)}</b><span className="ellipsis">{displayValue(it)}</span></span>
                    </>
                  );
                  const external = act.href && /^https?:/.test(act.href);
                  return (
                    <div key={`${it.kind}-${i}`} className="shared-row" onContextMenu={(e) => { e.preventDefault(); copyText(it.value); }}>
                      {act.href
                        ? <a className="shared-main pressable" href={act.href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>{inner}</a>
                        : <button type="button" className="shared-main pressable" onClick={() => copyText(it.value)}>{inner}</button>}
                      <IconButton icon={Copy} label={`Copy ${itemTitle(it)}`} small onClick={() => copyText(it.value)} />
                    </div>
                  );
                })}
              </div>
              <Button block icon={UserRoundPlus} onClick={saveToContacts}>Save to contacts</Button>
            </>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>{given} hasn't shared contact details with you yet.</p>
          )}
        </>
      )}
      <button type="button" className="list-row pressable" onClick={() => manageSharing(person, conn)}>
        <span className="lead-icon"><IdCard aria-hidden="true" /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: "block" }}>What I share with {given}</b>
          <span className="tiny muted">{canShare ? detailsCount(mine) : "Sharing is off for your pass type"}</span>
        </span>
        <ChevronRight className="chev" aria-hidden="true" />
      </button>
    </section>
  );
}
