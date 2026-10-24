import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Building2, ChevronDown, IdCard, MapPin, Plus, Share, Trash2 } from "lucide-react";
import { useStore } from "../lib/store";
import { cardOf, clearAddRequest, myCard, needsDetails, refreshCard, saveItems, setCardOpen, shareMyVCard } from "../lib/myCard";
import {
  cardRowLabel, cleanLabel, cleanValue, detailCount, displayValue, itemTitle, kindName, KIND_META, CONTACT_KINDS, LABEL_CHIPS, MAX_CONTACT_ITEMS,
  newItemId, PASS_SHARE_NOTE, PASS_SHARE_PATH, TOO_MANY_ERROR, waysSummary,
} from "../lib/contactCard";
import { confirmDialog, showAlert } from "../lib/ui";
import { Button, Chip, IconButton, Sheet, Switch } from "./ui";
import { KindBubble } from "./ContactGlyphs";
import "./contactCard.css";

/* =========================================================
   Profile › Contact card (spec sections 4 and 10): one accordion
   row, collapsed by default (remembered on this device), with a
   pink dot and "Add at least 2 ways to reach you" while fewer
   than 2 details are filled in. Expanded: the ways people can
   reach you, each with a "Share by default" switch, then
   Organization / Residence and "Share my contact". Every change
   saves the whole list (PUT /social/contact-card). Says that what
   you share is also given to anyone who scans your pass's QR.
========================================================= */

export default function ContactCard({ org, country }) {
  const st = useStore(myCard);
  const card = cardOf(st);
  const items = card.items || [];
  const max = card.max || MAX_CONTACT_ITEMS;
  const full = items.length >= max;
  const hasAccount = items.some((it) => it.account);
  const suggestAccount = !!card.accountEmail && !hasAccount;
  const [picker, setPicker] = useState(false);
  const [editor, setEditor] = useState(null);   // { item, isNew }
  const [reorder, setReorder] = useState(false);
  const ref = useRef(null);
  const count = detailCount(items);
  const needs = needsDetails(st);
  const open = st.open;
  // A share sheet's "Add contact details" sends people here, expanded, with the picker open.
  const showPicker = (picker || st.wantAdd > 0) && !full;

  useEffect(() => { refreshCard(); }, []);
  useEffect(() => {
    if (st.wantAdd) ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [st.wantAdd]);

  // Stable close handlers, so an open sheet keeps its focus while the card re-renders.
  const closePicker = useCallback(() => { setPicker(false); clearAddRequest(); }, []);
  const closeEditor = useCallback(() => setEditor(null), []);
  const closeReorder = useCallback(() => setReorder(false), []);
  const save = async (next) => {
    const r = await saveItems(next);
    if (!r.ok) showAlert("Couldn't save", r.error);
    return r;
  };
  const toggleDefault = (id, on) => save(items.map((it) => (it.id === id ? { ...it, shareByDefault: on } : it)));
  const addAccount = () => save([...items, { id: newItemId(), kind: "email", label: "", value: card.accountEmail, shareByDefault: false, account: true }]);
  const pick = (kind) => {
    closePicker();
    const account = kind === "account";
    setEditor({ isNew: true, item: { id: newItemId(), kind: account ? "email" : kind, label: "", value: account ? card.accountEmail : "", shareByDefault: false, ...(account ? { account: true } : {}) } });
  };

  // "Add your account email" when the sign-in email can be a contact detail and isn't one yet.
  const suggestion = suggestAccount && (
    <div className="cc-suggest">
      <KindBubble kind="email" size={30} />
      <span className="cc-text">
        <b>Add your account email</b>
        <span className="ellipsis">{card.accountEmail}</span>
      </span>
      <Button size="sm" onClick={addAccount} disabled={full}>Add</Button>
    </div>
  );

  const atLeastTwo = needs && <p className="cc-needs">Add at least 2 ways to reach you</p>;

  return (
    <section className="stack-sm" aria-labelledby="cc-acc-title">
      <button type="button" className={"cc-acc pressable" + (open ? " cc-acc--open" : "")} aria-expanded={open} aria-controls="cc-panel"
        aria-label={cardRowLabel(count)} onClick={() => setCardOpen(!open)}>
        <span className="kind-bubble" style={{ width: 36, height: 36 }} aria-hidden="true"><IdCard width={18} height={18} /></span>
        <span className="cc-text">
          <span className="cc-acc-title">
            <b id="cc-acc-title">Contact card</b>
            {needs && !open && <span className="cc-dot" aria-hidden="true" />}
          </span>
          <span>{waysSummary(count)}</span>
          {needs && !open && <span className="cc-needs">Add at least 2 ways to reach you</span>}
        </span>
        <ChevronDown className="cc-chev" aria-hidden="true" />
      </button>
      <div id="cc-panel" hidden={!open}>
        {open && (
          <div ref={ref} className="card contact-card cc-panel">
            {items.length === 0 ? (
              <div className="cc-empty">
                <span className="cc-empty-ico" aria-hidden="true"><IdCard /></span>
                <b>Add the ways people can reach you</b>
                <p>Email, phone, WhatsApp, LinkedIn and more. You pick what to share each time you connect.</p>
                <p className="pass-share-note">{PASS_SHARE_NOTE}</p>
                {atLeastTwo}
                <Button size="sm" icon={Plus} onClick={() => setPicker(true)}>Add contact detail</Button>
              </div>
            ) : null}
            {items.length === 0 && suggestion}
            {items.length > 0 && (
              <>
                <div className="cc-head">
                  <b>Your details</b>
                  <small aria-hidden="true">Share by default</small>
                </div>
                <div className="cc-rows">
                  {items.map((it) => (
                    <div key={it.id} className="cc-row">
                      <button type="button" className="cc-row-main pressable" onClick={() => setEditor({ isNew: false, item: it })} aria-label={`${itemTitle(it)}: ${displayValue(it)}. Edit`}>
                        <KindBubble kind={it.kind} />
                        <span className="cc-text">
                          <b className="ellipsis">{itemTitle(it)}</b>
                          <span className="ellipsis">{displayValue(it)}</span>
                        </span>
                      </button>
                      <span className="switch">
                        <input type="checkbox" role="switch" aria-label="Share by default" checked={!!it.shareByDefault} onChange={(e) => toggleDefault(it.id, e.target.checked)} />
                        <span />
                      </span>
                    </div>
                  ))}
                </div>
                <p className="tiny muted" style={{ margin: 0 }}>Switched-on details are ticked for you each time you share. You still choose every time.</p>
                {/* Pass scans give what My QR ticks: these switches until they tick there, then that list (Oct 24 2026). */}
                {card.qrSharePicked ? (
                  <p className="pass-share-note" style={{ margin: 0 }}>Anyone who scans the QR code on your pass (your email, PDF ticket, Apple Wallet or the app) gets what's ticked on <Link to={PASS_SHARE_PATH}>My QR</Link>.</p>
                ) : (
                  <p className="pass-share-note" style={{ margin: 0 }}>{PASS_SHARE_NOTE}</p>
                )}
                {suggestion}
                {atLeastTwo}
                <div className="row" style={{ gap: 8 }}>
                  <Button size="sm" icon={Plus} onClick={() => setPicker(true)} disabled={full}>Add contact detail</Button>
                  <span className="spacer" />
                  {items.length >= 2 && <button type="button" className="link-btn" style={{ minHeight: 36, padding: "0 4px" }} onClick={() => setReorder(true)}>Reorder</button>}
                </div>
                {full && <p className="tiny muted" style={{ margin: "-4px 0 0" }}>{TOO_MANY_ERROR}</p>}
              </>
            )}
            <hr className="hairline" />
            <Link to="/profile/edit" className="contact-row"><Building2 aria-hidden="true" /><span>Organization</span><b className="ellipsis">{org || "Not added"}</b></Link>
            <hr className="hairline" />
            <Link to="/profile/edit" className="contact-row"><MapPin aria-hidden="true" /><span>Residence</span><b className="ellipsis">{country || "Not added"}</b></Link>
            <button type="button" className="share-contact pressable" onClick={() => shareMyVCard()}><Share aria-hidden="true" />Share my contact</button>
          </div>
        )}
      </div>
      {showPicker && <KindPicker accountEmail={suggestAccount ? card.accountEmail : ""} onPick={pick} onClose={closePicker} />}
      {editor && <Editor key={editor.item.id} item={editor.item} isNew={editor.isNew} items={items} onClose={closeEditor} />}
      {reorder && <Reorder items={items} onClose={closeReorder} />}
    </section>
  );
}

/** "Add a contact detail": the account email first (when it isn't on the card), then the nine kinds. */
function KindPicker({ accountEmail, onPick, onClose }) {
  return (
    <Sheet open onClose={onClose} title="Add a contact detail">
      <div className="sheet-body stack">
        {accountEmail && (
          <button type="button" className="list-row pressable" onClick={() => onPick("account")}>
            <KindBubble kind="email" size={32} />
            <span className="cc-text"><b>Account email</b><span className="ellipsis">{accountEmail}</span></span>
            <Plus aria-hidden="true" className="chev" style={{ width: 16, height: 16 }} />
          </button>
        )}
        <div className="kind-grid">
          {CONTACT_KINDS.map((k) => (
            <button key={k} type="button" className="kind-tile pressable" onClick={() => onPick(k)}>
              <KindBubble kind={k} size={38} />
              <span>{kindName(k)}</span>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

/** New / Edit <kind>: value (checked like the server), label with quick chips, share by default, delete. */
function Editor({ item, isNew, items, onClose }) {
  const meta = KIND_META[item.kind] || KIND_META.other;
  const [value, setValue] = useState(item.account ? item.value : item.value || "");
  const [label, setLabel] = useState(item.label || "");
  const [byDefault, setByDefault] = useState(!!item.shareByDefault);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const title = item.account ? "Account email" : `${isNew ? "New" : "Edit"} ${kindName(item.kind)}`;

  const submit = async (e) => {
    e?.preventDefault();
    if (busy) return;
    let v = item.value;
    if (!item.account) {
      const r = cleanValue(item.kind, value);
      if (r.error) { setError(r.error); return; }
      v = r.value;
    }
    const next = { ...item, value: v, label: cleanLabel(label), shareByDefault: byDefault };
    const list = isNew ? [...items, next] : items.map((it) => (it.id === item.id ? next : it));
    const index = list.findIndex((it) => it.id === item.id);
    setBusy(true); setError("");
    const r = await saveItems(list);
    setBusy(false);
    if (r.ok) { onClose(); return; }
    if (r.index === index || r.index < 0) setError(r.error);
    else showAlert("Couldn't save", r.error);
  };

  const remove = async () => {
    const ok = await confirmDialog({ title: "Delete this detail?", message: "People you shared it with won't see it anymore.", confirm: "Delete", destructive: true });
    if (!ok) return;
    setBusy(true);
    const r = await saveItems(items.filter((it) => it.id !== item.id));
    setBusy(false);
    if (r.ok) onClose();
    else setError(r.error);
  };

  return (
    <Sheet open onClose={onClose} title={title}>
      <form className="sheet-body stack" onSubmit={submit} noValidate>
        {item.account ? (
          <div className="field">
            <span className="field-label">Email</span>
            <div className="input cc-readonly">{item.value}</div>
            <span className="tiny muted">Your sign-in email. It changes if your account email changes.</span>
          </div>
        ) : (
          <label className="field">
            <span className="field-label">{kindName(item.kind)}</span>
            <input className="input" value={value} onChange={(e) => { setValue(e.target.value); setError(""); }} autoFocus
              type={meta.type} inputMode={meta.inputMode} placeholder={meta.placeholder} autoCapitalize={meta.autoCapitalize}
              autoComplete={meta.autoComplete} autoCorrect="off" spellCheck="false" maxLength={300}
              aria-invalid={error ? true : undefined} aria-describedby={error ? "cc-value-error" : undefined} />
          </label>
        )}
        {error && <p id="cc-value-error" className="error-text" role="alert" style={{ margin: "-6px 0 0" }}>{error}</p>}
        <label className="field">
          <span className="field-label">Label (optional)</span>
          <input className="input" value={label} maxLength={30} onChange={(e) => setLabel(e.target.value)} autoComplete="off" />
        </label>
        <div className="chips chips--wrap" style={{ marginTop: -4 }}>
          {LABEL_CHIPS.map((c) => <Chip key={c} on={label.trim().toLowerCase() === c.toLowerCase()} onClick={() => setLabel((l) => (l.trim().toLowerCase() === c.toLowerCase() ? "" : c))}>{c}</Chip>)}
        </div>
        <Switch label="Share by default" description="Ticked for you each time you share" checked={byDefault} onChange={setByDefault} />
        <div className="stack-sm">
          <Button type="submit" variant="primary" block className="cc-big" loading={busy}>Save</Button>
          <Button block onClick={onClose}>Cancel</Button>
          {!isNew && <Button block icon={Trash2} className="btn-danger btn-ghost" onClick={remove} disabled={busy}>Delete this detail</Button>}
        </div>
      </form>
    </Sheet>
  );
}

/** Up / down arrows per row, then Save (the whole list, in the new order). */
function Reorder({ items, onClose }) {
  const [order, setOrder] = useState(items);
  const [busy, setBusy] = useState(false);
  const move = (i, d) => setOrder((o) => {
    const j = i + d;
    if (j < 0 || j >= o.length) return o;
    const next = [...o];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const save = async () => {
    setBusy(true);
    const r = await saveItems(order);
    setBusy(false);
    if (r.ok) onClose();
    else showAlert("Couldn't save", r.error);
  };
  return (
    <Sheet open onClose={onClose} title="Reorder">
      <div className="sheet-body stack">
        <div className="share-list">
          {order.map((it, i) => (
            <div key={it.id} className="share-row">
              <KindBubble kind={it.kind} size={32} />
              <span className="cc-text"><b className="ellipsis">{itemTitle(it)}</b><span className="ellipsis">{displayValue(it)}</span></span>
              <IconButton icon={ArrowUp} label="Move up" small disabled={i === 0} onClick={() => move(i, -1)} />
              <IconButton icon={ArrowDown} label="Move down" small disabled={i === order.length - 1} onClick={() => move(i, 1)} />
            </div>
          ))}
        </div>
        <div className="stack-sm">
          <Button variant="primary" block className="cc-big" loading={busy} onClick={save}>Save</Button>
          <Button block onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Sheet>
  );
}
