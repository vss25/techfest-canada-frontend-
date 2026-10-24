import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Plus, ShieldOff } from "lucide-react";
import { useStore } from "../lib/store";
import { firstName } from "../lib/auth";
import { canShareContact, cardOf, closeShareSheet, myCard, requestAddDetail } from "../lib/myCard";
import { displayValue, itemTitle, keepKnown, preTicked, SHARE_OFF_ERROR } from "../lib/contactCard";
import { Button, Sheet, Spinner } from "./ui";
import { KindBubble } from "./ContactGlyphs";
import "./contactCard.css";

/* =========================================================
   "Share your contact details": one sheet for every exchange
   moment (request, accept, scan, vcard, manage), opened with
   openShareSheet() in lib/myCard.js and mounted once in App.
   Also the checklist the connect QR page uses.
========================================================= */

/** Checkbox rows for contact card items, with "Select all" / "Select none" (beside `heading` when given). */
export function ShareChecklist({ items, ticked, onChange, fixed, heading }) {
  const all = items.length > 0 && items.every((it) => ticked.includes(it.id));
  const toggle = (id, on) => onChange(items.filter((it) => (it.id === id ? on : ticked.includes(it.id))).map((it) => it.id));
  return (
    <div className="stack-sm">
      {(heading || items.length > 0) && (
        <div className="row share-list-head">
          {heading}
          <span className="spacer" />
          {items.length > 0 && <button type="button" className="link-btn" onClick={() => onChange(all ? [] : items.map((it) => it.id))}>{all ? "Select none" : "Select all"}</button>}
        </div>
      )}
      <div className="share-list">
        {fixed && (
          <label className="share-row share-row--fixed">
            <span className="kind-bubble" style={{ width: 32, height: 32 }} aria-hidden="true"><Check width={16} height={16} /></span>
            <span className="cc-text"><b>{fixed}</b></span>
            <input type="checkbox" className="share-input" checked disabled readOnly />
            <span className="share-tick" aria-hidden="true"><Check /></span>
          </label>
        )}
        {items.map((it) => {
          const on = ticked.includes(it.id);
          return (
            <label key={it.id} className="share-row pressable">
              <KindBubble kind={it.kind} size={32} />
              <span className="cc-text">
                <b className="ellipsis">{itemTitle(it)}</b>
                <span className="ellipsis">{displayValue(it)}</span>
              </span>
              <input type="checkbox" className="share-input" checked={on} onChange={(e) => toggle(it.id, e.target.checked)} />
              <span className="share-tick" aria-hidden="true"><Check /></span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/** Mounted once (App.jsx): shows the sheet lib/myCard.js asks for. */
export default function ShareSheetHost() {
  const st = useStore(myCard);
  if (!st.sheet) return null;
  return <ShareSheet key={st.sheet.key} sh={st.sheet} />;
}

const ACTION_MOMENTS = ["request", "accept", "scan"];

function ShareSheet({ sh }) {
  const st = useStore(myCard);
  const navigate = useNavigate();
  const card = cardOf(st);
  const items = card.items || [];
  const canShare = canShareContact(card);
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { moment, person } = sh;
  const full = person?.name || "them";
  const given = firstName(person?.name) || "them";
  // Ticks follow the card until the first change (it may still be loading when the sheet opens).
  const ticked = keepKnown(picked ?? preTicked(moment, items, sh.conn), items);
  const none = ticked.length === 0;
  const acts = ACTION_MOMENTS.includes(moment);

  const title = moment === "manage" ? `What I share with ${given}` : "Share your contact details";
  const subtitle = {
    request: `${full} sees what you tick once they accept.`,
    accept: `With ${full}`,
    scan: sh.pass ? "With the person whose pass you scanned" : `With ${full}`,
    vcard: "Sent as a contact card (.vcf) with your name, title and company.",
    manage: `${given} sees only what's ticked. Changes show for them straight away.`,
  }[moment];
  const primary = canShare ? {
    request: none ? "Send without sharing" : "Send request",
    accept: none ? "Accept without sharing" : "Accept and share",
    scan: none ? "Connect without sharing" : "Connect and share",
    vcard: "Share",
    manage: "Save",
  }[moment] : { request: "Send request", accept: "Accept", scan: "Connect" }[moment];

  // Stable, so the sheet doesn't hand focus back and forth on every tick.
  const cancel = useCallback(() => closeShareSheet(false), []);
  const fail = (msg) => { setBusy(false); setError(msg || "Something went wrong. Try again."); };

  // Runs straight from the tap: the vCard share needs the user's gesture.
  const confirm = () => {
    if (busy) return;
    setError("");
    const share = canShare ? ticked : undefined;
    let r;
    try { r = sh.onConfirm(share); } catch (e) { fail(e?.message); return; }
    if (r && typeof r.then === "function") {
      setBusy(true);
      r.then((res) => (res?.ok ? closeShareSheet(true) : res?.close ? closeShareSheet(false) : fail(res?.error)), (e) => fail(e?.message));
    } else if (r?.ok) closeShareSheet(true);
    else if (r?.close) closeShareSheet(false);
    else fail(r?.error);
  };

  const addDetails = () => {
    closeShareSheet(false);
    requestAddDetail();
    navigate("/profile");
  };

  const loading = !st.card && st.loading;

  return (
    <Sheet open onClose={cancel} title={title}>
      <div className="sheet-body stack">
        {subtitle && <p className="muted center small" style={{ margin: "-4px 0 0" }}>{subtitle}</p>}
        {loading ? <Spinner label="Loading your contact card" /> : !canShare ? (
          <div className="note row-top">
            <ShieldOff aria-hidden="true" style={{ width: 18, height: 18, flex: "none", marginTop: 1 }} />
            <span>
              <b style={{ display: "block" }}>{SHARE_OFF_ERROR}</b>
              {acts && <span className="small muted">Your connection still goes ahead. No contact details are shared.</span>}
            </span>
          </div>
        ) : items.length === 0 ? (
          <div className="cc-empty cc-empty--sheet">
            <p style={{ margin: 0 }}>You haven't added any contact details yet.</p>
            <Button size="sm" icon={Plus} onClick={addDetails}>Add contact details</Button>
          </div>
        ) : (
          <ShareChecklist items={items} ticked={ticked} onChange={(ids) => { setPicked(ids); setError(""); }} />
        )}
        {error && <p className="error-text center" role="alert" style={{ margin: 0 }}>{error}</p>}
        <div className="stack-sm">
          {primary && (
            <Button variant="primary" block className="cc-big" loading={busy} onClick={confirm} disabled={loading || (moment === "vcard" && none)}>
              {primary}
            </Button>
          )}
          <Button block onClick={cancel}>{primary ? "Cancel" : "Close"}</Button>
        </div>
        {acts && canShare && <p className="tiny muted center" style={{ margin: 0 }}>You can change this later from their profile.</p>}
      </div>
    </Sheet>
  );
}
