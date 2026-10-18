import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, X, Loader2 } from "lucide-react";
import { useStore } from "../lib/store";
import { cx, initialsOf, toasts, dismissToast } from "../lib/ui";

/* =========================================================
   Shared UI pieces (the web versions of the iOS Surface,
   Chip, BrandSegmented, MemberAvatar, sheets and alerts).
========================================================= */


// ---------- Avatar ----------

export function Avatar({ name, src, size = 40, tile = false, ring = false, badge = null, label }) {
  const [failed, setFailed] = useState(false);
  const show = src && !failed;
  const crossOrigin = show && /^https?:/.test(src) ? "anonymous" : undefined;
  return (
    <span className="avatar-wrap" style={{ width: size, height: size }}>
      <span
        className={cx("avatar", tile && "avatar--tile", ring && "avatar-ring")}
        style={{ width: size, height: size, fontSize: Math.max(11, size * 0.36) }}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
      >
        {show ? <img src={src} alt="" loading="lazy" decoding="async" crossOrigin={crossOrigin} onError={() => setFailed(true)} /> : initialsOf(name)}
      </span>
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
export function Segmented({ options, value, onChange, label, scroll }) {
  return (
    <div className={cx("seg", scroll && "seg--scroll")} role="tablist" aria-label={label}>
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

export function TopBar({ title, back = true, onBack, right, left, titleLeft }) {
  const navigate = useNavigate();
  const goBack = () => {
    if (onBack) return onBack();
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate("/");
  };
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="topbar-side">
          {left || (back && <IconButton icon={ChevronLeft} label="Back" onClick={goBack} />)}
        </div>
        <h1 className={cx("topbar-title", titleLeft && "topbar-title--left")}>{title}</h1>
        <div className="topbar-side topbar-side--end">{right}</div>
      </div>
    </header>
  );
}

// ---------- Sheet ----------

export function Sheet({ open, onClose, title, children, full, actions, labelledBy }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => ref.current?.querySelector("[autofocus], input, textarea, button")?.focus(), 30);
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
      <div ref={ref} className={cx("sheet", full && "sheet--full")} role="dialog" aria-modal="true" aria-labelledby={labelledBy || (title ? titleId : undefined)}>
        <div className="sheet-grip" aria-hidden="true" />
        {(title || onClose) && (
          <div className="sheet-head">
            <div style={{ width: 44 }}>{actions?.left}</div>
            <h2 id={titleId}>{title}</h2>
            <div style={{ minWidth: 44, display: "flex", justifyContent: "flex-end" }}>
              {actions?.right || (onClose && <IconButton icon={X} label="Close" onClick={onClose} />)}
            </div>
          </div>
        )}
        {children}
      </div>
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
        {items.map((t) => (
          <div key={t.id} className="toast" role="status">
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{t.title}</b>
              {t.message && <p>{t.message}</p>}
            </div>
            {t.action && <button type="button" className="btn btn-primary btn-sm" onClick={() => { t.action.run(); dismissToast(t.id); }}>{t.action.label}</button>}
            <IconButton icon={X} label="Dismiss" small onClick={() => dismissToast(t.id)} />
          </div>
        ))}
      </div>
      <Sheet open={!!confirm} onClose={() => close(false)} title={confirm?.title}>
        <div className="sheet-body stack">
          {confirm?.message && <p className="muted center" style={{ margin: 0 }}>{confirm.message}</p>}
          <Button variant={confirm?.destructive ? undefined : "primary"} className={confirm?.destructive ? "btn-danger" : ""} block size="lg" onClick={() => close(true)} autoFocus>
            {confirm?.confirm || "OK"}
          </Button>
          <Button block onClick={() => close(false)}>Cancel</Button>
        </div>
      </Sheet>
    </>
  );
}

