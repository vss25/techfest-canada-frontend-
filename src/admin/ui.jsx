/* =========================================================
   TTFC admin UI kit — small, accessible building blocks used
   by every admin page so the whole panel looks and behaves
   the same. Tailwind + the `ttfc` palette (tailwind.config.js).
========================================================= */
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { AlertTriangle, Eye, EyeOff, Inbox, Loader2, Lock, RefreshCw, X } from "lucide-react";
import { useAdmin } from "./adminContext";
import { navItemFor } from "./nav";
import HelpButton, { HelpLabel } from "./HelpButton";
import { useFieldHelp } from "./fieldHelp";
import { useAdminEvent } from "./eventContext";
import { isManagementError } from "./api";
import { twMerge } from "tailwind-merge";

// Later classes win (so `className="p-0"` overrides a default padding).
const cx = (...a) => twMerge(a.filter(Boolean).join(" "));

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ttfc-purple focus-visible:ring-offset-2 focus-visible:ring-offset-ttfc-ink";

/* ---------------- Buttons ---------------- */
const BTN_VARIANT = {
  primary:
    // The approved admin design: one solid magenta main action, white secondary buttons with a thin line.
    "border border-[#D6308C] bg-[#D6308C] text-white hover:bg-[#BF2A7C] hover:border-[#BF2A7C]",
  secondary: "border border-ttfc-line bg-ttfc-panel text-ttfc-text hover:bg-ttfc-panel2",
  ghost: "text-ttfc-muted hover:bg-ttfc-contrast/5 hover:text-ttfc-text",
  danger: "bg-ttfc-bad/90 text-white hover:bg-ttfc-bad shadow-lg shadow-red-900/30",
  dangerOutline: "border border-red-400/40 text-red-300 hover:bg-red-500/10",
  success: "bg-ttfc-good/90 text-white hover:bg-ttfc-good shadow-lg shadow-emerald-900/30",
};
const BTN_SIZE = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-xs",
  md: "h-[38px] gap-2 rounded-[9px] px-3.5 text-sm",
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
      className={cx("inline-flex h-9 w-9 items-center justify-center rounded-xl text-ttfc-muted transition hover:bg-ttfc-contrast/5 hover:text-ttfc-text disabled:opacity-40", focusRing, className)}
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
    // The approved design's section: white, 1px #E3E0EE, 12px corners, 18px padding.
    <Tag className={cx("rounded-xl border border-[#E3E0EE] bg-white p-[18px]", className)} {...rest}>
      {children}
    </Tag>
  );
}

/* Page heading in the approved admin design: where the page sits ("Content › Event website", from the
   menu; the page's own eyebrow when it isn't in the menu), the title, its actions on the right, then
   what the page is for. */
export function PageHeader({ eyebrow, title, description, actions, status }) {
  const { pathname } = useLocation();
  const { current } = useAdminEvent();
  const hit = navItemFor(pathname);
  // The board's crumbs: workspace  ›  the chosen event (pages about one event)  ›  page.
  const crumbs = hit
    ? [hit.group.workspaceLabel, hit.group.scoped && current ? current.name : null, hit.item.label].filter(Boolean).join("  ›  ")
    : eyebrow;
  return (
    <header className="mb-6 flex flex-col gap-1">
      {crumbs && <p className="whitespace-pre text-xs text-[#6B6688]">{crumbs}</p>}
      {/* The title keeps its width (it only wraps when it alone is wider than the page); when the buttons don't
          fit beside it they move to the next line together, instead of squeezing the title onto two lines. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 max-w-full shrink-0 flex-wrap items-center gap-2.5">
          <h1 className="min-w-0 text-[26px] font-bold leading-[34px] tracking-[-0.01em] text-ttfc-text">{title}</h1>
          {hit && <HelpButton to={hit.item.to} title={hit.item.label} />}
          {status && <span className="flex flex-wrap items-center gap-1.5">{status}</span>}
        </div>
        {actions && <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {description && <p className="max-w-[760px] text-sm leading-relaxed text-ttfc-muted">{description}</p>}
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
// The approved design's field: 38px, 9px corners, 1px #E3E0EE, white, 14px navy text.
const inputBase =
  "w-full min-h-[38px] rounded-[9px] border border-[#E3E0EE] bg-white px-3 py-[8px] text-sm leading-[21px] text-[#151035] placeholder:text-[#8A86A0] transition focus:border-[#D6308C] focus:outline-none focus:ring-2 focus:ring-[#D6308C]/20 disabled:cursor-not-allowed disabled:bg-[#F6F5FA] disabled:text-[#6B6688]";

export function Field({ label, hint, error, required, children, className, id: idProp }) {
  const auto = useId();
  const id = idProp || auto;
  const child = typeof children === "function" ? children(id) : children;
  return (
    <div className={cx("flex flex-col gap-[5px]", className)}>
      {label && (
        // The ⓘ after the label explains the field when the page's guide does (help.js FIELD_HELP).
        <HelpLabel label={label} htmlFor={id}>
          {label}{required && <span className="ml-0.5 text-ttfc-pink" aria-hidden="true">*</span>}
        </HelpLabel>
      )}
      {child}
      {error ? <p className="text-xs text-[#B91C1C]" role="alert">{error}</p> : hint ? <p className="text-[11px] leading-4 text-[#8A86A0]">{hint}</p> : null}
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
    // Arrow styling lives in `style`: as Tailwind classes, tailwind-merge took
    // them for background colours and dropped the dark background (white box).
    // The arrow (--adm-select-arrow in admin.css) follows the light / dark theme.
    <select className={cx(inputBase, "cursor-pointer appearance-none pr-9", className)}
      style={{
        backgroundImage: "var(--adm-select-arrow)",
        backgroundSize: "16px",
        backgroundPosition: "right 12px center",
        backgroundRepeat: "no-repeat",
      }}
      {...rest}
    >
      {children}
    </select>
  );
}

/** `onColor`: the track's colour when on (e.g. Media's dark blue), instead of the pink-purple gradient. */
export function Switch({ checked, onChange, label, description, disabled, id: idProp, size = "md", ariaLabel, onColor }) {
  const auto = useId();
  const id = idProp || auto;
  // The approved design's switch: 40 × 22 with an 18px knob.
  const track = size === "lg" ? "h-8 w-14" : "h-[22px] w-10";
  const knob = size === "lg" ? "h-6 w-6" : "h-[18px] w-[18px]";
  const shift = size === "lg" ? "translate-x-7" : "translate-x-[18px]";
  const btn = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={!!checked}
      aria-label={label ? undefined : ariaLabel}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      style={checked && onColor ? { background: onColor, borderColor: onColor } : undefined}
      className={cx(
        "relative inline-flex shrink-0 items-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50",
        track, checked ? (onColor ? "" : "border-transparent bg-[#D6308C]") : "border-transparent bg-[#CFCBE0]", focusRing,
      )}
    >
      <span className={cx("inline-block rounded-full bg-white shadow transition", size === "lg" ? "translate-x-1" : "translate-x-px", knob, checked && shift)} />
    </button>
  );
  if (!label) return btn;
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <SwitchHelp label={label}>
          <label htmlFor={id} className="cursor-pointer text-sm font-semibold text-ttfc-text">{label}</label>
        </SwitchHelp>
        {description && <span className="mt-0.5 block text-xs leading-relaxed text-ttfc-muted">{description}</span>}
      </div>
      {btn}
    </div>
  );
}

/* ---------------- Feedback ---------------- */
// The approved design's status pills (the event switcher's tags use the same colours).
const BADGE = {
  neutral: "border-transparent bg-[#F1F0F5] text-[#4A4566]",
  pink: "border-transparent bg-[#FBE9F3] text-[#9D1D63]",
  purple: "border-transparent bg-[#EDE9FE] text-[#5B21B6]",
  orange: "border-transparent bg-[#FFEDD5] text-[#9A3412]",
  good: "border-transparent bg-[#DCFCE7] text-[#166534]",
  bad: "border-transparent bg-[#FEE2E2] text-[#991B1B]",
  warn: "border-transparent bg-[#FEF3C7] text-[#92400E]",
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
      <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-ttfc-contrast/5 text-ttfc-muted">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="font-semibold text-ttfc-text">{title}</p>
      {body && <p className="mt-1 max-w-md text-sm text-ttfc-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Friendly state for pages / sections limited to management. */
export function ManagementState({ className, compact = false }) {
  return (
    <div role="status" className={cx("flex flex-col items-center justify-center rounded-[18px] border border-ttfc-line bg-ttfc-panel px-6 text-center", compact ? "py-8" : "py-16", className)}>
      <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-ttfc-purple/15 text-violet-200">
        <Lock className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="font-semibold text-ttfc-text">This is for management</p>
      <p className="mt-1 max-w-md text-sm text-ttfc-muted">Sales, revenue, promo codes and staff settings are only visible to management. Ask a manager if you need something here.</p>
    </div>
  );
}

/** Renders children for management; everyone else sees ManagementState. */
export function ManagementOnly({ children, fallback }) {
  const { isManagement } = useAdmin();
  if (isManagement) return children;
  return fallback === undefined ? <ManagementState /> : fallback;
}

export function ErrorState({ error, onRetry, title = "Couldn't load this", className }) {
  if (isManagementError(error)) return <ManagementState className={className} />;
  return (
    <div role="alert" className={cx("flex flex-col items-center justify-center rounded-[18px] border border-red-400/30 bg-red-500/5 px-6 py-12 text-center", className)}>
      <AlertTriangle className="mb-3 h-7 w-7 text-red-300" aria-hidden="true" />
      <p className="font-semibold text-ttfc-text">{title}</p>
      <p className="mt-1 max-w-md text-sm text-red-200/80">{error?.message || String(error || "Something went wrong")}</p>
      {onRetry && <Button className="mt-4" icon={RefreshCw} onClick={onRetry}>Try again</Button>}
    </div>
  );
}

// The approved design's notes: solid light fills, 10px corners, 13px text.
const BANNER = {
  info: "border-[#E3E0EE] bg-[#F6F5FA] text-[#4A4566]",
  warn: "border-[#F5E1B8] bg-[#FFF7E6] text-[#7A4B00]",
  danger: "border-[#FBD5D5] bg-[#FEF2F2] text-[#991B1B]",
  good: "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]",
};
export function Banner({ tone = "info", icon: Icon, title, children, className, action }) {
  return (
    <div className={cx("adm-banner flex flex-col gap-3 rounded-[10px] border px-3 py-2.5 text-[13px] leading-[19px] sm:flex-row sm:items-center", BANNER[tone], className)} role={tone === "danger" ? "alert" : undefined}>
      <div className="flex flex-1 items-start gap-2.5">
        {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
        <div className="min-w-0">
          {title && <p className="font-semibold">{title}</p>}
          {children && <div className={title ? "mt-0.5 opacity-85" : ""}>{children}</div>}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ---------------- Data display ---------------- */
export function StatTile({ label, value, icon: Icon, tone = "purple", hint, to }) {
  // The approved design's number card: white, 12px corners, 16px padding; label, a 26px number, a coloured line.
  const hintColor = { good: "#166534", bad: "#B91C1C", orange: "#B45309", pink: "#9D1D63", purple: "#5B21B6", neutral: "#4A4566" }[tone] || "#4A4566";
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs text-[#6B6688]">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-[#8A86A0]" aria-hidden="true" />}
      </div>
      <b className="text-[26px] font-bold leading-8 tabular-nums text-[#151035]">{value ?? "—"}</b>
      {hint && <span className="text-xs" style={{ color: hintColor }}>{hint}</span>}
    </>
  );
  const cls = "flex flex-col gap-1 rounded-xl border border-[#E3E0EE] bg-white p-4";
  return to ? (
    <Link to={to} className={cx(cls, "transition hover:bg-[#F6F5FA]", focusRing)}>{body}</Link>
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
            <div className="mt-1 h-1.5 rounded-full bg-ttfc-contrast/5">
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
    <div role="tablist" aria-label={label} className={cx("mb-5 flex gap-1 overflow-x-auto border-b border-[#F0EEF6]", className)}>
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
              // The approved design's tabs: 34px, 13px semibold, a 2px magenta line under the open one.
              "inline-flex h-[34px] shrink-0 items-center gap-1.5 whitespace-nowrap px-3 text-[13px] font-semibold transition",
              active ? "text-[#151035] shadow-[inset_0_-2px_0_#D6308C]" : "text-[#6B6688] hover:text-[#151035]",
              focusRing,
            )}
          >
            {t.label}
            {t.count !== undefined && <span className={cx("rounded-full px-1.5 text-[10px] font-bold tabular-nums", active ? "bg-[#FBE9F3] text-[#9D1D63]" : "bg-[#F1F0F5] text-[#4A4566]")}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Horizontal-scrolling table container (styles in admin.css → .adm-table). */
export function TableWrap({ children, className }) {
  return (
    <div className={cx("overflow-x-auto rounded-[10px] border border-[#F0EEF6] bg-white", className)}>
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
  const width = size === "xl" ? "max-w-5xl" : size === "lg" ? "max-w-2xl" : size === "sm" ? "max-w-sm" : "max-w-md";
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

/* A switch's label with its ⓘ (the label stays the switch's own clickable label). */
function SwitchHelp({ label, children }) {
  const text = useFieldHelp(label);
  const [open, setOpen] = useState(false);
  const panel = useId();
  return (
    <>
      <span className="flex items-center gap-1.5">
        {children}
        {text && (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={panel} aria-label={`What is ${label}?`} title={`What is ${label}?`}
            className={cx("inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border text-[11px] font-bold leading-none", open ? "border-[#D6308C] bg-[#D6308C] text-white" : "border-[#CFCBE0] bg-white text-[#6B6688] hover:border-[#D6308C] hover:text-[#D6308C]", focusRing)}>
            i
          </button>
        )}
      </span>
      {text && open && <span id={panel} role="note" className="mt-1.5 block rounded-lg border border-[#E3E0EE] bg-[#F6F5FA] px-3 py-2 text-xs leading-relaxed text-[#4A4566]">{text}</span>}
    </>
  );
}

/* The approved design's inline editor (board 17: "Edit speaker: Maya Chen" under the table): the same props as
   Drawer, shown as a section on the page and scrolled into view when it opens. */
export function EditPanel({ open, onClose, title, description, children, footer }) {
  const ref = useRef(null);
  useEffect(() => {
    if (open) ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [open]);
  if (!open) return null;
  return (
    <section ref={ref} aria-label={typeof title === "string" ? title : "Edit"} className="mt-3.5 scroll-mt-20 rounded-xl border border-[#E3E0EE] bg-white p-[18px]">
      <div className="mb-3.5 flex flex-wrap items-baseline gap-2.5">
        <h2 className="text-base font-bold text-[#151035]">{title}</h2>
        {description && <span className="text-xs text-[#6B6688]">{description}</span>}
        {onClose && (
          <button type="button" onClick={onClose} className={cx("ml-auto rounded-lg px-2 py-1 text-[13px] font-semibold text-[#6B6688] hover:bg-[#F6F5FA] hover:text-[#151035]", focusRing)}>Close</button>
        )}
      </div>
      {children}
      {footer && <div className="mt-[18px] flex flex-wrap items-center gap-2 border-t border-[#F0EEF6] pt-3.5">{footer}</div>}
    </section>
  );
}
