import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { badgeOf, chipsOf, GROUP_COLORS } from "./lib/passColors.js";
import { boxLetter } from "./lib/search.js";
import { answerConfirm, closeTray, dismissAllFailed, dismissBanner, dismissTap, dismissToast, openTray, retryTap, useDesk } from "./lib/desk.js";
import { describeTap, trayActions } from "./lib/tapText.js";
import { ISSUE_PASS, NO_DETAILS } from "./lib/special.js";
import { timeText } from "./lib/timers.js";
import { ALLERGY_KEYS, DIETARY_LABELS, DIETARY_ORDER, EXTRA_LABELS, EXTRA_ORDER } from "./lib/constants.js";

/* Shared pieces of the TTFC Check-in screens. */

/** The guest's colour band: the group's colour with its words ("Media · Connect Pass", "Speaker · No pass on file"). */
export function PassBand({ guest, size = "m" }) {
  const b = badgeOf(guest);
  return (
    <span className={`ci-pass ci-pass-${size}${b.noPass ? " is-nopass" : ""}${b.neutral ? " is-neutral" : ""}`} style={b.neutral ? undefined : { background: b.bg, color: b.text }} title={b.full}>
      <span className="ci-pass-label">{b.label}</span>
      {b.sub && <span className="ci-pass-sub">{b.sub}</span>}
    </span>
  );
}

/** ISSUE PASS (on the list, no pass on file) or NO DETAILS FOUND: icon + words + its own outline / pattern. */
export function SpecialBadge({ kind, size = "m" }) {
  const k = kind === "unknown" ? NO_DETAILS : ISSUE_PASS;
  return (
    <span className={`ci-flag ci-flag-${kind === "unknown" ? "unknown" : "issue"} ci-flag-${size}`}>
      <span className="ci-flag-icon" aria-hidden="true">{k.icon}</span>{k.badge}
    </span>
  );
}

/** Yes / no marks (Exhibitor, Media, VIP, Speaker), Pending, and ISSUE PASS first for a guest with no pass on file. */
export function Chips({ guest }) {
  const chips = chipsOf(guest);
  if (!chips.length) return null;
  return (
    <span className="ci-chips">
      {chips.map((c) => (c.key === "issue_pass" ? <SpecialBadge key={c.key} kind="issue" size="s" /> : <span key={c.key} className={`ci-chip ci-chip-${c.key}`}>{c.label}</span>))}
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
        enterKeyHint="search"
      />
      {value && <button type="button" className="ci-search-clear" onClick={() => { onChange(""); inputRef?.current?.focus(); }} aria-label="Clear search">×</button>}
    </div>
  );
}

/** Counters across the top: the big numbers, then one chip per colour group, ISSUE PASS / NO DETAILS FOUND, the yes / no marks. */
export function Counters({ big = [], groups = [], marks = [], special = [] }) {
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
      {(groups.length > 0 || marks.length > 0 || special.length > 0) && (
        <div className="ci-counter-chips">
          {groups.map((g) => {
            const c = GROUP_COLORS[g.group];
            return (
              <span key={g.group} className="ci-gchip" style={{ "--gbg": c.bg, "--gtx": c.text }} title={`${c.label}: ${g.text}`}>
                <span className="ci-gchip-dot" aria-hidden="true" />{c.label} <b>{g.text}</b>
              </span>
            );
          })}
          {special.map((x) => (
            <span key={x.kind} className={`ci-schip ci-schip-${x.kind}`} title={`${x.label}: ${x.text}`}>
              <span className="ci-flag-icon" aria-hidden="true">{x.kind === "unknown" ? NO_DETAILS.icon : ISSUE_PASS.icon}</span>{x.label} <b>{x.text}</b>
            </span>
          ))}
          {marks.map((m) => <span key={m.label} className="ci-mchip">{m.label} <b>{m.text}</b></span>)}
        </div>
      )}
    </section>
  );
}

/** Live / Reconnecting / Offline, taps waiting to be sent (and whether they're saved on the device), refused taps. */
export function ConnPill() {
  const d = useDesk();
  const n = d.queueItems.filter((x) => x.state !== "failed").length;
  const failed = d.queueItems.filter((x) => x.state === "failed").length;
  const label = { live: "Live", reconnecting: "Reconnecting", offline: "Offline" }[d.conn] || "Connecting";
  return (
    <span className="ci-conn-wrap">
      <span className={`ci-conn is-${d.conn}`} role="status" aria-live="polite"><span className="ci-conn-dot" aria-hidden="true" />{label}</span>
      {n > 0 && (d.persistOk
        ? <span className="ci-pending" title="Taps saved on this device, sent when the connection is back">{n} pending</span>
        : <span className="ci-pending is-failed" title="These taps could NOT be saved on this device: don't reload or close the app until they're sent">{n} pending · not saved</span>)}
      {failed > 0 && <button type="button" className="ci-pending is-failed ci-pending-btn" onClick={openTray} aria-label={`${failed} not recorded: review`}>{failed} not recorded ›</button>}
    </span>
  );
}

/** Needs attention: the taps the server refused (they stay on the device until retried or dismissed, reloads too). */
export function AttentionSheet() {
  const d = useDesk();
  const list = d.queueItems.filter((x) => x.state === "failed");
  return (
    <Sheet title="Needs attention" onClose={closeTray}>
      <p className="ci-small ci-muted">These taps were not recorded: the server refused them. Admit anyway, try again, or dismiss once it's sorted.</p>
      {!list.length && <p className="ci-empty">Nothing needs attention.</p>}
      <ul className="ci-attention">
        {list.map((it) => {
          const t = describeTap(it, { state: d.state, items: d.queueItems });
          const acts = trayActions(it);
          return (
            <li key={it.clientId} className="ci-attention-row">
              <div className="ci-attention-main">
                <b>{t.who || "Someone"}</b> · {t.what}
                <span className="ci-small ci-muted">{[t.where, timeText(t.at), t.by ? `by ${t.by}` : ""].filter(Boolean).join(" · ")}</span>
                <span className="ci-attention-why">{it.window?.text || it.error || "Not recorded."}</span>
              </div>
              <div className="ci-attention-actions">
                {acts.includes("override") && <button type="button" className="ci-btn ci-btn-warn" onClick={() => retryTap(it.clientId, { override: true })}>Admit anyway</button>}
                {acts.includes("retry") && <button type="button" className="ci-btn ci-btn-primary" onClick={() => retryTap(it.clientId)}>Try again</button>}
                <button type="button" className="ci-btn ci-btn-ghost" onClick={() => dismissTap(it.clientId)}>Dismiss</button>
              </div>
            </li>
          );
        })}
      </ul>
      {list.length > 1 && <p className="ci-center"><button type="button" className="ci-btn ci-btn-ghost" onClick={dismissAllFailed}>Dismiss all</button></p>}
    </Sheet>
  );
}

/** Each arrival at this station flashes the screen's edge in the guest's colour (for when the sound is down). */
export function ArrivalFlash() {
  const d = useDesk();
  const f = d.flash;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!f?.seq) return undefined;
    const t = setTimeout(() => setShown(f.seq), 1700);
    return () => clearTimeout(t);
  }, [f?.seq]);
  if (!f?.seq || shown === f.seq) return null;
  return <div key={f.seq} className={`ci-flash${f.unknown ? " is-unknown" : ""}`} style={f.bg ? { "--gbg": f.bg } : undefined} aria-hidden="true" />;
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
        if (x.unknown) {
          return (
            <div key={x.key} className="ci-banner is-unknown">
              <span className="ci-banner-text"><span className="ci-flag-icon" aria-hidden="true">{NO_DETAILS.icon}</span>{x.text}</span>
              <button type="button" className="ci-banner-ok" onClick={() => dismissBanner(station, x.key)}>Got it</button>
            </div>
          );
        }
        const band = badgeOf(x.guest);
        return (
          <div key={x.key} className={`ci-banner${band.noPass ? " is-issue" : ""}`} style={band.neutral ? undefined : { "--gbg": band.bg }}>
            <button type="button" className="ci-banner-text" onClick={() => onOpen?.(x.guest)}>
              <span className="ci-banner-bell" aria-hidden="true">{band.noPass ? ISSUE_PASS.icon : "🔔"}</span>{x.text}
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

/**
 * A plain side sheet / bottom sheet (phones). The focus moves into it once, when it opens, and back when it closes:
 * never on a re-render (live updates re-render every second at peak; a note being typed keeps its keyboard).
 */
export function Sheet({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  useLayoutEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    const prev = document.activeElement;
    // Into the sheet once (a field of its own with autoFocus keeps it).
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") closeRef.current?.(); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); prev?.focus?.({ preventScroll: true }); };
  }, []);
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

