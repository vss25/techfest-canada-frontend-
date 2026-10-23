import { useEffect, useRef } from "react";
import { badgeOf, chipsOf, GROUP_COLORS } from "./lib/passColors.js";
import { boxLetter } from "./lib/search.js";
import { answerConfirm, dismissBanner, dismissToast, useDesk } from "./lib/desk.js";
import { ALLERGY_KEYS, DIETARY_LABELS, DIETARY_ORDER, EXTRA_LABELS, EXTRA_ORDER } from "./lib/constants.js";

/* Shared pieces of the TTFC Check-in screens. */

/** The guest's colour band: the group's colour with its words ("Media · Connect Pass"). */
export function PassBand({ guest, size = "m" }) {
  const b = badgeOf(guest);
  return (
    <span className={`ci-pass ci-pass-${size}`} style={{ background: b.bg, color: b.text }} title={b.full}>
      <span className="ci-pass-label">{b.label}</span>
      {b.sub && <span className="ci-pass-sub">{b.sub}</span>}
    </span>
  );
}

/** Yes / no marks (Exhibitor, Media, VIP, Speaker) and Pending. */
export function Chips({ guest }) {
  const chips = chipsOf(guest);
  if (!chips.length) return null;
  return (
    <span className="ci-chips">
      {chips.map((c) => <span key={c.key} className={`ci-chip ci-chip-${c.key}`}>{c.label}</span>)}
    </span>
  );
}

/** What their pass includes (the server's inclusions). */
export function Inclusions({ guest, highlight = "" }) {
  const on = EXTRA_ORDER.filter((k) => guest.extras?.[k]);
  if (!on.length) return <span className="ci-incl ci-incl-none">Conference only</span>;
  return (
    <span className="ci-incls">
      {on.map((k) => <span key={k} className={`ci-incl${highlight === k ? " is-hl" : ""}`}>{EXTRA_LABELS[k]}</span>)}
    </span>
  );
}

/** Dietary needs from their RSVP: allergies first and loud. */
export function Dietary({ guest, big = false }) {
  const list = DIETARY_ORDER.filter((k) => guest.rsvp?.dietary?.includes(k));
  if (!list.length) return null;
  return (
    <span className={`ci-diets${big ? " is-big" : ""}`}>
      {list.map((k) => (
        <span key={k} className={`ci-diet${ALLERGY_KEYS.includes(k) ? " is-allergy" : ""}`}>
          {ALLERGY_KEYS.includes(k) ? "⚠ " : ""}{k === "other" && guest.rsvp.dietaryOther ? `Other: ${guest.rsvp.dietaryOther}` : DIETARY_LABELS[k]}
        </span>
      ))}
    </span>
  );
}

export function BoxHint({ guest }) {
  return <span className="ci-box" aria-label={`Badge box ${boxLetter(guest)}`}>Box <b>{boxLetter(guest)}</b></span>;
}

/** The big search box. */
export function SearchBox({ value, onChange, inputRef, placeholder = "Search a guest: name, company…", autoFocus = false, label = "Search guests" }) {
  return (
    <div className="ci-search">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="ci-search-icon"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2.4" /><path d="M20 20l-4-4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
      <input
        ref={inputRef}
        type="search"
        inputMode="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="words"
        spellCheck={false}
        enterKeyHint="go"
      />
      {value && <button type="button" className="ci-search-clear" onClick={() => { onChange(""); inputRef?.current?.focus(); }} aria-label="Clear search">×</button>}
    </div>
  );
}

/** Counters across the top: the big numbers, then one chip per colour group, then the yes / no marks. */
export function Counters({ big = [], groups = [], marks = [] }) {
  return (
    <section className="ci-counters" aria-label="Counters">
      <div className="ci-counter-big">
        {big.map((b) => (
          <div key={b.label} className={`ci-stat${b.tone ? ` is-${b.tone}` : ""}`}>
            <span className="ci-stat-n">{b.n}{b.of !== undefined && <small> / {b.of}</small>}</span>
            <span className="ci-stat-l">{b.label}</span>
          </div>
        ))}
      </div>
      {(groups.length > 0 || marks.length > 0) && (
        <div className="ci-counter-chips">
          {groups.map((g) => {
            const c = GROUP_COLORS[g.group];
            return (
              <span key={g.group} className="ci-gchip" style={{ "--gbg": c.bg, "--gtx": c.text }} title={`${c.label}: ${g.text}`}>
                <span className="ci-gchip-dot" aria-hidden="true" />{c.label} <b>{g.text}</b>
              </span>
            );
          })}
          {marks.map((m) => <span key={m.label} className="ci-mchip">{m.label} <b>{m.text}</b></span>)}
        </div>
      )}
    </section>
  );
}

/** Live / Reconnecting / Offline, and taps waiting to be sent. */
export function ConnPill() {
  const d = useDesk();
  const n = d.queueItems.filter((x) => x.state !== "failed").length;
  const failed = d.queueItems.filter((x) => x.state === "failed").length;
  const label = { live: "Live", reconnecting: "Reconnecting", offline: "Offline" }[d.conn] || "Connecting";
  return (
    <span className="ci-conn-wrap">
      <span className={`ci-conn is-${d.conn}`} role="status" aria-live="polite"><span className="ci-conn-dot" aria-hidden="true" />{label}</span>
      {n > 0 && <span className="ci-pending" title="Taps saved on this device, sent when the connection is back">{n} pending</span>}
      {failed > 0 && <span className="ci-pending is-failed">{failed} not recorded</span>}
    </span>
  );
}

/** Toasts at the bottom ("Priya Sharma: Arrived · Undo"). */
export function Toasts() {
  const d = useDesk();
  if (!d.toasts.length) return null;
  return (
    <div className="ci-toasts" role="status" aria-live="polite">
      {d.toasts.map((t) => (
        <div key={t.id} className={`ci-toast is-${t.tone}`}>
          <span>{t.text}</span>
          {t.action && <button type="button" onClick={() => { dismissToast(t.id); t.action.fn(); }}>{t.action.label}</button>}
          <button type="button" className="ci-toast-x" aria-label="Close" onClick={() => dismissToast(t.id)}>×</button>
        </div>
      ))}
    </div>
  );
}

/** A station's arrival banners (newest on top, three at once). */
export function Banners({ station, onOpen, max = 3 }) {
  const d = useDesk();
  const b = d.banners[station];
  if (!b) return null;
  const all = b.view();
  const v = { visible: all.visible.slice(0, max), more: all.more + Math.max(0, all.visible.length - max) };
  if (!v.visible.length) return null;
  return (
    <div className="ci-banners" role="alert" aria-live="assertive">
      {v.visible.map((x) => {
        const band = badgeOf(x.guest);
        return (
          <div key={x.key} className="ci-banner" style={{ "--gbg": band.bg }}>
            <button type="button" className="ci-banner-text" onClick={() => onOpen?.(x.guest)}>
              <span className="ci-banner-bell" aria-hidden="true">🔔</span>{x.text}
            </button>
            <button type="button" className="ci-banner-ok" onClick={() => dismissBanner(station, x.key)}>Got it</button>
          </div>
        );
      })}
      {v.more > 0 && <div className="ci-banner-more">+{v.more} more on the way</div>}
    </div>
  );
}

/** The "Admit anyway?" question. */
export function ConfirmDialog() {
  const d = useDesk();
  const yesRef = useRef(null);
  useEffect(() => { if (d.confirm) yesRef.current?.focus(); }, [d.confirm]);
  if (!d.confirm) return null;
  const q = d.confirm;
  return (
    <div className="ci-modal" data-modal-open role="dialog" aria-modal="true" aria-labelledby="ci-confirm-t"
      onKeyDown={(e) => { if (e.key === "Escape") answerConfirm(false); }}>
      <div className={`ci-modal-card is-${q.tone || "warn"}`}>
        <h2 id="ci-confirm-t">{q.title}</h2>
        {q.text && <p>{q.text}</p>}
        {q.detail && <p className="ci-muted">{q.detail}</p>}
        <div className="ci-modal-actions">
          <button type="button" className="ci-btn ci-btn-ghost" onClick={() => answerConfirm(false)}>{q.no || "Cancel"}</button>
          <button type="button" ref={yesRef} className={`ci-btn ${q.tone === "bad" ? "ci-btn-bad" : "ci-btn-warn"}`} onClick={() => answerConfirm(true)}>{q.yes || "Yes"}</button>
        </div>
      </div>
    </div>
  );
}

/** A plain side sheet / bottom sheet (phones). */
export function Sheet({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="ci-sheet-wrap" data-modal-open onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className={`ci-sheet${wide ? " is-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <header className="ci-sheet-head">
          <h2>{title}</h2>
          <button type="button" className="ci-icon-btn" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="ci-sheet-body">{children}</div>
      </aside>
    </div>
  );
}

