/* =========================================================
   TTFC admin UI kit — small, accessible building blocks used
   by every admin page so the whole panel looks and behaves
   the same. Tailwind + the `ttfc` palette (tailwind.config.js).
========================================================= */
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { AlertTriangle, Eye, EyeOff, Inbox, Loader2, RefreshCw, X } from "lucide-react";

const cx = (...a) => a.filter(Boolean).join(" ");

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ttfc-purple focus-visible:ring-offset-2 focus-visible:ring-offset-ttfc-ink";

/* ---------------- Buttons ---------------- */
const BTN_VARIANT = {
  primary:
    "bg-gradient-to-r from-ttfc-pink via-ttfc-purple to-ttfc-purple text-white shadow-lg shadow-ttfc-pink/20 hover:brightness-110",
  secondary: "border border-ttfc-line bg-ttfc-panel2 text-ttfc-text hover:border-ttfc-purple/60 hover:bg-ttfc-panel3",
  ghost: "text-ttfc-muted hover:bg-white/5 hover:text-ttfc-text",
  danger: "bg-red-500/90 text-white hover:bg-red-500 shadow-lg shadow-red-900/30",
  dangerOutline: "border border-red-400/40 text-red-300 hover:bg-red-500/10",
  success: "bg-emerald-500/90 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/30",
};
const BTN_SIZE = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-xs",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
  lg: "h-12 gap-2 rounded-2xl px-6 text-base",
};

export function Button({
  variant = "secondary", size = "md", icon: Icon, loading = false, className, children, type = "button", disabled, ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx(
        "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        BTN_VARIANT[variant], BTN_SIZE[size], focusRing, className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function IconButton({ icon, label, className, ...rest }) {
  const Icon = icon;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx("inline-flex h-9 w-9 items-center justify-center rounded-xl text-ttfc-muted transition hover:bg-white/5 hover:text-ttfc-text disabled:opacity-40", focusRing, className)}
      {...rest}
    >
      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
    </button>
  );
}

/* ---------------- Layout ---------------- */
export function Card({ className, children, as = "div", ...rest }) {
  const Tag = as;
  return (
    <Tag className={cx("rounded-[18px] border border-ttfc-line bg-ttfc-panel p-5 sm:p-6", className)} {...rest}>
      {children}
    </Tag>
  );
}

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-ttfc-orange">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight text-ttfc-text sm:text-[28px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ttfc-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ children, hint, className }) {
  return (
    <div className={cx("mb-3", className)}>
      <h2 className="text-base font-semibold text-ttfc-text">{children}</h2>
      {hint && <p className="mt-0.5 text-xs text-ttfc-muted">{hint}</p>}
    </div>
  );
}

/* ---------------- Forms ---------------- */
const inputBase =
  "w-full rounded-xl border border-ttfc-line bg-ttfc-ink/70 px-3.5 py-2.5 text-sm text-ttfc-text placeholder:text-ttfc-dim transition focus:border-ttfc-purple focus:outline-none focus:ring-2 focus:ring-ttfc-purple/30 disabled:cursor-not-allowed disabled:opacity-60";

export function Field({ label, hint, error, required, children, className, id: idProp }) {
  const auto = useId();
  const id = idProp || auto;
  const child = typeof children === "function" ? children(id) : children;
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-[13px] font-semibold text-ttfc-text/90">
          {label}{required && <span className="ml-0.5 text-ttfc-pink" aria-hidden="true">*</span>}
        </label>
      )}
      {child}
      {error ? <p className="text-xs text-red-300" role="alert">{error}</p> : hint ? <p className="text-xs text-ttfc-dim">{hint}</p> : null}
    </div>
  );
}

export function Input({ className, ...rest }) {
  return <input className={cx(inputBase, className)} {...rest} />;
}

export function PasswordInput({ id, value, onChange, autoComplete = "new-password", ...rest }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} value={value} onChange={onChange} autoComplete={autoComplete} className="pr-11" {...rest} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ttfc-dim hover:text-ttfc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ttfc-purple"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

export function Textarea({ className, rows = 4, ...rest }) {
  return <textarea rows={rows} className={cx(inputBase, "resize-y leading-relaxed", className)} {...rest} />;
}

export function Select({ className, children, ...rest }) {
  return (
    <select className={cx(inputBase, "cursor-pointer appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9", className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23A9A1C2' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Switch({ checked, onChange, label, description, disabled, id: idProp, size = "md", ariaLabel }) {
  const auto = useId();
  const id = idProp || auto;
  const track = size === "lg" ? "h-8 w-14" : "h-6 w-11";
  const knob = size === "lg" ? "h-6 w-6" : "h-4 w-4";
  const shift = size === "lg" ? "translate-x-7" : "translate-x-6";
  const btn = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={!!checked}
      aria-label={label ? undefined : ariaLabel}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cx(
        "relative inline-flex shrink-0 items-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50",
        track, checked ? "border-transparent bg-gradient-to-r from-ttfc-pink to-ttfc-purple" : "border-ttfc-line bg-ttfc-panel3", focusRing,
      )}
    >
      <span className={cx("inline-block translate-x-1 rounded-full bg-white shadow transition", knob, checked && shift)} />
    </button>
  );
  if (!label) return btn;
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-semibold text-ttfc-text">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-relaxed text-ttfc-muted">{description}</span>}
      </label>
      {btn}
    </div>
  );
}

/* ---------------- Feedback ---------------- */
const BADGE = {
  neutral: "border-ttfc-line bg-white/5 text-ttfc-muted",
  pink: "border-ttfc-pink/30 bg-ttfc-pink/10 text-pink-200",
  purple: "border-ttfc-purple/30 bg-ttfc-purple/10 text-violet-200",
  orange: "border-ttfc-orange/30 bg-ttfc-orange/10 text-orange-200",
  good: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  bad: "border-red-400/30 bg-red-400/10 text-red-200",
  warn: "border-amber-400/30 bg-amber-400/10 text-amber-200",
};
export function Badge({ tone = "neutral", children, className, icon: Icon }) {
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold", BADGE[tone], className)}>
      {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function Spinner({ className }) {
  return <Loader2 className={cx("h-5 w-5 animate-spin text-ttfc-purple", className)} aria-hidden="true" />;
}

export function LoadingState({ label = "Loading…", className }) {
  return (
    <div className={cx("flex flex-col items-center justify-center gap-3 py-16 text-sm text-ttfc-muted", className)} role="status">
      <Spinner className="h-6 w-6" />
      {label}
    </div>
  );
}

export function SkeletonGrid({ count = 8, className = "aspect-[4/5]" }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cx("animate-pulse rounded-[18px] bg-ttfc-panel2", className)} />
      ))}
    </div>
  );
}

export function EmptyState({ icon = Inbox, title = "Nothing here yet", body, action, className }) {
  const Icon = icon;
  return (
    <div className={cx("flex flex-col items-center justify-center rounded-[18px] border border-dashed border-ttfc-line px-6 py-14 text-center", className)}>
      <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-ttfc-muted">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="font-semibold text-ttfc-text">{title}</p>
      {body && <p className="mt-1 max-w-md text-sm text-ttfc-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = "Couldn't load this", className }) {
  return (
    <div role="alert" className={cx("flex flex-col items-center justify-center rounded-[18px] border border-red-400/30 bg-red-500/5 px-6 py-12 text-center", className)}>
      <AlertTriangle className="mb-3 h-7 w-7 text-red-300" aria-hidden="true" />
      <p className="font-semibold text-ttfc-text">{title}</p>
      <p className="mt-1 max-w-md text-sm text-red-200/80">{error?.message || String(error || "Something went wrong")}</p>
      {onRetry && <Button className="mt-4" icon={RefreshCw} onClick={onRetry}>Try again</Button>}
    </div>
  );
}

const BANNER = {
  info: "border-ttfc-purple/30 bg-ttfc-purple/10 text-violet-100",
  warn: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  danger: "border-red-400/40 bg-red-500/10 text-red-100",
  good: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
};
export function Banner({ tone = "info", icon: Icon, title, children, className, action }) {
  return (
    <div className={cx("flex flex-col gap-3 rounded-2xl border px-4 py-3.5 text-sm sm:flex-row sm:items-center", BANNER[tone], className)} role={tone === "danger" ? "alert" : undefined}>
      <div className="flex flex-1 items-start gap-3">
        {Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />}
        <div className="min-w-0 leading-relaxed">
          {title && <p className="font-semibold">{title}</p>}
          {children && <div className={title ? "mt-0.5 opacity-85" : ""}>{children}</div>}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ---------------- Data display ---------------- */
const TILE_TONE = {
  pink: "from-ttfc-pink/25", purple: "from-ttfc-purple/25", orange: "from-ttfc-orange/25",
  good: "from-emerald-400/20", bad: "from-red-400/25", neutral: "from-white/5",
};
export function StatTile({ label, value, icon: Icon, tone = "purple", hint, to }) {
  const body = (
    <>
      <div className={cx("pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br to-transparent blur-2xl", TILE_TONE[tone])} />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-ttfc-muted">{label}</p>
        {Icon && <Icon className="h-[18px] w-[18px] text-ttfc-muted" aria-hidden="true" />}
      </div>
      <p className="relative mt-3 text-[28px] font-bold leading-none tracking-tight text-ttfc-text">{value ?? "—"}</p>
      {hint && <p className="relative mt-2 text-xs text-ttfc-dim">{hint}</p>}
    </>
  );
  const cls = "relative overflow-hidden rounded-[18px] border border-ttfc-line bg-ttfc-panel p-5";
  return to ? (
    <Link to={to} className={cx(cls, "block transition hover:border-ttfc-purple/50", focusRing)}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function Bars({ rows = [], empty = "No data yet" }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-ttfc-dim">{empty}</p>;
  const max = rows[0]?.count || 1;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
          <div className="min-w-0">
            <p className="truncate text-ttfc-text/90" title={r.key}>{r.key}</p>
            <div className="mt-1 h-1.5 rounded-full bg-white/5">
              <div className="h-1.5 rounded-full bg-gradient-to-r from-ttfc-pink to-ttfc-orange" style={{ width: `${Math.max(4, (r.count / max) * 100)}%` }} />
            </div>
          </div>
          <span className="tabular-nums text-ttfc-muted">{r.count}</span>
        </li>
      ))}
    </ul>
  );
}

export function Tabs({ tabs, value, onChange, label = "Sections", className }) {
  const refs = useRef([]);
  const onKey = (e, i) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const n = (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    refs.current[n]?.focus();
    onChange(tabs[n].key);
  };
  return (
    <div role="tablist" aria-label={label} className={cx("-mx-1 mb-5 flex gap-1 overflow-x-auto px-1 pb-1", className)}>
      {tabs.map((t, i) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            ref={(el) => { refs.current[i] = el; }}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => onChange(t.key)}
            className={cx(
              "inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition",
              active ? "bg-white/10 text-ttfc-text shadow-inner" : "text-ttfc-muted hover:bg-white/5 hover:text-ttfc-text",
              focusRing,
            )}
          >
            {t.label}
            {t.count !== undefined && <span className={cx("rounded-full px-1.5 text-[11px] tabular-nums", active ? "bg-ttfc-pink/30 text-white" : "bg-white/5")}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Horizontal-scrolling table container (styles in admin.css → .adm-table). */
export function TableWrap({ children, className }) {
  return (
    <div className={cx("overflow-x-auto rounded-[18px] border border-ttfc-line bg-ttfc-panel", className)}>
      <table className="adm-table">{children}</table>
    </div>
  );
}

/* ---------------- Overlays ---------------- */
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Stack of open overlays: only the top-most one reacts to Esc / Tab.
const overlayStack = [];

function useOverlay(open, onClose, panelRef) {
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    if (!open) return undefined;
    const token = {};
    overlayStack.push(token);
    const prev = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => {
      const el = panelRef.current;
      if (!el) return;
      const auto = el.querySelector("[data-autofocus]") || el.querySelector(FOCUSABLE);
      (auto || el).focus();
    }, 20);
    const onKey = (e) => {
      if (overlayStack[overlayStack.length - 1] !== token) return;
      if (e.key === "Escape") { e.stopPropagation(); closeRef.current?.(); return; }
      if (e.key !== "Tab" || !panelRef.current) return;
      const els = [...panelRef.current.querySelectorAll(FOCUSABLE)];
      if (!els.length) return;
      const first = els[0]; const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      const i = overlayStack.indexOf(token);
      if (i >= 0) overlayStack.splice(i, 1);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (prev && typeof prev.focus === "function") prev.focus();
    };
  }, [open, panelRef]);
}

export function Modal({ open, onClose, title, description, children, footer, size = "md", tone }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const descId = useId();
  useOverlay(open, onClose, panelRef);
  if (!open) return null;
  const width = size === "lg" ? "max-w-2xl" : size === "sm" ? "max-w-sm" : "max-w-md";
  return createPortal(
    <div className="ttfc-admin-portal fixed inset-0 z-[99990] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cx(
          "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[22px] border bg-ttfc-panel text-ttfc-text shadow-2xl shadow-black/60 outline-none animate-in fade-in slide-in-from-bottom-4 sm:rounded-[22px]",
          width, tone === "danger" ? "border-red-400/40" : "border-ttfc-line",
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-6">
          <div>
            <h2 id={titleId} className="text-lg font-bold">{title}</h2>
            {description && <p id={descId} className="mt-1 text-sm leading-relaxed text-ttfc-muted">{description}</p>}
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} className="-mr-2 -mt-1" />
        </div>
        <div className="overflow-y-auto px-6 py-3">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-ttfc-line px-6 py-4 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Confirm a destructive / important action. `onConfirm` may be async;
 * a thrown error is shown inside the dialog and the dialog stays open.
 */
export function ConfirmDialog({
  open, onClose, onConfirm, title, body, confirmLabel = "Confirm", tone = "danger", children,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const close = () => { if (!busy) { setError(""); onClose(); } };
  const confirm = async () => {
    setBusy(true); setError("");
    try { await onConfirm(); setBusy(false); onClose(); }
    catch (err) { setBusy(false); setError(err?.message || "Something went wrong"); }
  };
  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      description={body}
      tone={tone}
      size="sm"
      footer={
        <>
          <Button onClick={close} disabled={busy} data-autofocus={tone === "danger" ? true : undefined}>Cancel</Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} loading={busy} onClick={confirm} data-autofocus={tone === "danger" ? undefined : true}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {error && <p role="alert" className="mt-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
    </Modal>
  );
}

export function Drawer({ open, onClose, title, description, children, footer, width = "max-w-xl" }) {
  const panelRef = useRef(null);
  const titleId = useId();
  useOverlay(open, onClose, panelRef);
  if (!open) return null;
  return createPortal(
    <div className="ttfc-admin-portal fixed inset-0 z-[99980] flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx("relative flex h-full w-full flex-col border-l border-ttfc-line bg-ttfc-panel text-ttfc-text shadow-2xl shadow-black/60 outline-none animate-in slide-in-from-right", width)}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ttfc-line px-6 py-5">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-lg font-bold">{title}</h2>
            {description && <p className="mt-1 text-sm text-ttfc-muted">{description}</p>}
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} className="-mr-2" />
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer && <div className="flex flex-wrap items-center gap-2 border-t border-ttfc-line bg-ttfc-panel px-6 py-4">{footer}</div>}
      </aside>
    </div>,
    document.body,
  );
}
