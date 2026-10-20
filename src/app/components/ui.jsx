import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, X, Loader2 } from "lucide-react";
import { useStore } from "../lib/store";
import { cx, initialsOf, toasts, dismissToast } from "../lib/ui";

/* =========================================================
   Shared UI pieces (the web versions of the iOS Surface,
   Chip, BrandSegmented, MemberAvatar, sheets and alerts).
========================================================= */


// ---------- Avatar ----------

/** People: the iOS AvatarView monogram tile. Speakers: `round` (SpeakerAvatar). */
export function Avatar({ name, src, size = 40, tile = false, round = false, ring = false, tierRing = false, badge = null, label }) {
  const [failed, setFailed] = useState(false);
  const show = src && !failed;
  const crossOrigin = show && /^https?:/.test(src) ? "anonymous" : undefined;
  // iOS BrandShape.avatar: a 14pt corner at every size (small tiles read as circles).
  const radius = round ? "50%" : Math.min(14, size / 2);
  return (
    <span className="avatar-wrap" style={{ width: size, height: size }}>
      <span
        className={cx("avatar", tile && "avatar--tile", round && "avatar--round", ring && "avatar-ring")}
        style={{ width: size, height: size, borderRadius: radius, fontSize: Math.max(10, size * 0.34) }}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
      >
        {show ? <img src={src} alt="" loading="lazy" decoding="async" crossOrigin={crossOrigin} onError={() => setFailed(true)} /> : initialsOf(name)}
      </span>
      {/* iOS MemberAvatar: speakers and exhibitors get a purple ring around the tile. */}
      {tierRing && <span className="avatar-tier-ring" aria-hidden="true" style={{ borderWidth: Math.max(2, size * 0.05) }} />}
      {badge}
    </span>
  );
}

// ---------- Buttons ----------

export function IconButton({ icon, label, onClick, className, badge, round, filled, small, disabled, ...rest }) {
  const Icon = icon;
  return (
    <button
      type="button"
      className={cx("icon-btn pressable", round && "icon-btn--round", filled && "icon-btn--filled", small && "icon-btn--sm", className)}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      <Icon aria-hidden="true" />
      {badge > 0 && <span className="count-badge" aria-hidden="true">{badge > 10 ? "10+" : badge}</span>}
    </button>
  );
}

export function Button({ children, icon, variant, block, size, loading, className, ...rest }) {
  const Icon = icon;
  return (
    <button
      type="button"
      className={cx("btn pressable", variant && `btn-${variant}`, block && "btn-block", size && `btn-${size}`, className)}
      disabled={loading || rest.disabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="spin-icon" aria-hidden="true" style={{ animation: "spin .8s linear infinite" }} /> : Icon ? <Icon aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function Chip({ children, on, onClick, icon, count, ...rest }) {
  const Icon = icon;
  return (
    <button type="button" className="chip pressable" aria-pressed={!!on} onClick={onClick} {...rest}>
      {Icon && <Icon aria-hidden="true" />}
      {children}
      {count != null && <span className="chip-count">{count}</span>}
    </button>
  );
}

/** Day 1 / Day 2 / Venue style picker. */
export function Segmented({ options, value, onChange, label, scroll, capsule }) {
  return (
    <div className={cx("seg", scroll && "seg--scroll", capsule && "seg--capsule")} role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className="seg-btn pressable"
          onClick={() => onChange(o.value)}
          aria-label={o.ariaLabel}
        >
          {o.icon ? <o.icon aria-hidden="true" style={{ width: 15, height: 15 }} /> : null}
          {o.label}
          {o.count > 0 && <span className="pill-count">{o.count > 99 ? "99+" : o.count}</span>}
          {o.dot && value !== o.value && <span className="dot" aria-hidden="true" />}
        </button>
      ))}
    </div>
  );
}

export function Kicker({ children, tone, icon }) {
  const Icon = icon;
  return <span className={cx("kicker", tone && `kicker--${tone}`)}>{Icon && <Icon aria-hidden="true" style={{ width: 11, height: 11 }} />}{children}</span>;
}

export function Switch({ checked, onChange, label, description, disabled }) {
  const id = useId();
  return (
    <div className="toggle-row">
      <div style={{ flex: 1 }}>
        <label htmlFor={id} className="bold" style={{ display: "block" }}>{label}</label>
        {description && <div className="tiny muted">{description}</div>}
      </div>
      <span className="switch">
        <input id={id} type="checkbox" role="switch" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span />
      </span>
    </div>
  );
}

export function Spinner({ label = "Loading" }) {
  return <div className="row" style={{ justifyContent: "center", padding: 30 }} role="status"><div className="spinner" /><span className="sr-only">{label}</span></div>;
}

export function Empty({ icon, title, children, action }) {
  const Icon = icon;
  return (
    <div className="empty">
      {Icon && <Icon aria-hidden="true" />}
      {title && <h3>{title}</h3>}
      {children && <p>{children}</p>}
      {action && <div className="mt-16">{action}</div>}
    </div>
  );
}

// ---------- Top bar for pushed pages ----------

/** `brand` (default on): the 2px hairline in the logo's colours under the header (decorative, app.css). */
export function TopBar({ title, back = true, onBack, right, left, titleLeft, below, brand = true }) {
  const navigate = useNavigate();
  const goBack = () => {
    if (onBack) return onBack();
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate("/");
  };
  return (
    <header className={cx("topbar", brand && "topbar--brand")}>
      <div className="topbar-inner">
        {(left || back || !titleLeft) && (
          <div className="topbar-side">
            {left || (back && <IconButton icon={ChevronLeft} label="Back" onClick={goBack} />)}
          </div>
        )}
        <h1 className={cx("topbar-title", titleLeft && "topbar-title--left")}>{title}</h1>
        <div className="topbar-side topbar-side--end">{right}</div>
      </div>
      {/* Pills pinned under the title in the same material (iOS safeAreaInset(edge: .top)). */}
      {below && <div className="topbar-below">{below}</div>}
    </header>
  );
}

// ---------- Sheet ----------

export function Sheet({ open, onClose, title, children, full, medium, footer, actions, labelledBy }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => {
      const el = ref.current;
      if (!el || el.contains(document.activeElement)) return;
      (el.querySelector("[autofocus]") || el.querySelector("input:not([type=hidden]):not([hidden]), textarea") || el.querySelector("button"))?.focus();
    }, 30);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div ref={ref} className={cx("sheet", full && "sheet--full", medium && "sheet--medium")} role="dialog" aria-modal="true" aria-labelledby={labelledBy || (title ? titleId : undefined)}>
        <div className="sheet-grip" aria-hidden="true" />
        {(title || onClose) && (
          <div className="sheet-head">
            <div style={{ minWidth: 44, flex: actions?.left || actions?.right ? "1 1 0" : undefined }}>{actions?.left}</div>
            <h2 id={titleId}>{title}</h2>
            <div style={{ minWidth: 44, display: "flex", justifyContent: "flex-end", flex: actions?.left || actions?.right ? "1 1 0" : undefined }}>
              {actions?.right || (onClose && <IconButton icon={X} label="Close" onClick={onClose} />)}
            </div>
          </div>
        )}
        {medium ? <div className="sheet-scroll">{children}</div> : children}
        {footer && <div className="sheet-footer">{footer}</div>}
      </div>
    </div>
  );
}

/** iOS "Done" in a sheet's top-right corner. */
export function DoneButton({ onClick, label = "Done" }) {
  return <button type="button" className="link-btn sheet-done" onClick={onClick}>{label}</button>;
}

// ---------- Popover (iOS .popover with compact adaptation) ----------

/** A small card anchored under (or over) `anchor` (a DOMRect). Closes on outside tap, Escape or scroll. */
export function Popover({ anchor, onClose, children, width = 280, label }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!anchor || !el) return undefined;
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = Math.min(width, vw - 24);
    el.style.width = `${w}px`;
    const h = el.offsetHeight;
    const left = Math.max(12, Math.min(anchor.left + anchor.width / 2 - w / 2, vw - w - 12));
    const below = anchor.bottom + 8 + h < vh - 90;
    el.style.left = `${left}px`;
    el.style.top = `${below ? anchor.bottom + 8 : Math.max(12, anchor.top - 8 - h)}px`;
    el.style.setProperty("--arrow", `${Math.max(16, Math.min(anchor.left + anchor.width / 2 - left, w - 16))}px`);
    el.classList.toggle("popover--above", !below);
    el.style.visibility = "visible";
    el.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    const onDown = (e) => { if (!el.contains(e.target)) onClose?.(); };
    const onScroll = () => onClose?.();
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("scroll", onScroll);
    };
  }, [anchor, width, onClose]);
  if (!anchor) return null;
  return (
    <div ref={ref} className="popover" role="dialog" aria-label={label} tabIndex={-1} style={{ visibility: "hidden", top: 0, left: 0, width }}>
      {children}
    </div>
  );
}

// ---------- Toasts & confirm dialogs ----------

export function ToastHost() {
  const { items, confirm } = useStore(toasts);
  const close = (v) => { confirm?.resolve(v); toasts.set((s) => ({ ...s, confirm: null })); };
  return (
    <>
      <div className="toast-wrap" aria-live="polite" aria-atomic="false">
        {items.map((t) => {
          const acts = t.actions || [];
          const button = (a, i) => (
            <button key={a.label} type="button" className={i === 0 ? "btn btn-primary btn-sm" : "btn btn-sm"} onClick={() => { a.run(); dismissToast(t.id); }}>{a.label}</button>
          );
          return (
            <div key={t.id} className={cx("toast", acts.length > 1 && "toast--actions")} role="status">
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{t.title}</b>
                {t.message && <p>{t.message}</p>}
                {acts.length > 1 && <div className="toast-actions">{acts.map(button)}</div>}
              </div>
              {acts.length === 1 && button(acts[0], 0)}
              <IconButton icon={X} label={acts.length > 1 ? "Not now" : "Dismiss"} small onClick={() => dismissToast(t.id)} />
            </div>
          );
        })}
      </div>
      <Sheet open={!!confirm} onClose={() => close(confirm?.choose ? null : false)} title={confirm?.title}>
        <div className="sheet-body stack">
          {confirm?.message && <p className="muted center" style={{ margin: 0, whiteSpace: "pre-line" }}>{confirm.message}</p>}
          {confirm?.okOnly ? (
            <Button variant="primary" block size="lg" onClick={() => close(true)} autoFocus>OK</Button>
          ) : confirm?.choose ? (
            <div className="stack-sm">
              {confirm.options.map((o, i) => (
                <Button key={o.label} block className={o.destructive ? "btn-danger" : ""} onClick={() => close(o.value ?? o.label)} autoFocus={i === 0}>{o.label}</Button>
              ))}
            </div>
          ) : (
            <Button variant={confirm?.destructive ? undefined : "primary"} className={confirm?.destructive ? "btn-danger" : ""} block size="lg" onClick={() => close(true)} autoFocus>
              {confirm?.confirm || "OK"}
            </Button>
          )}
          {!confirm?.okOnly && <Button block onClick={() => close(confirm?.choose ? null : false)}>Cancel</Button>}
        </div>
      </Sheet>
    </>
  );
}

