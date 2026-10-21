/* Small building blocks for the jury portal (light only, styles in jury.css). */
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { cx, linkParts, paragraphs, stateInfo } from "./juryLib";

export function Spinner({ className = "", label }) {
  return <Loader2 className={cx("j-spin", className)} aria-hidden={label ? undefined : "true"} aria-label={label} />;
}

export function Button({ variant = "secondary", size = "md", loading = false, icon: Icon, className = "", children, type = "button", disabled, ...rest }) {
  return (
    <button type={type} className={cx("j-btn", `j-btn-${variant}`, size !== "md" && `j-btn-${size}`, className)} disabled={disabled || loading} {...rest}>
      {loading ? <Spinner /> : Icon ? <Icon className="j-ico" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function Chip({ state, children, className = "" }) {
  const s = stateInfo(state);
  return <span className={cx("j-chip", `j-chip-${s.tone}`, className)}>{children || s.label}</span>;
}

/** Plain text with paragraphs, line breaks and clickable http(s) links. */
export function RichText({ text, className = "" }) {
  return (
    <div className={cx("j-rich", className)}>
      {paragraphs(text).map((lines, i) => (
        <p key={i}>
          {lines.map((ln, j) => (
            <span key={j}>
              {j > 0 && <br />}
              {linkParts(ln).map((part, k) => (part.type === "link"
                ? <a key={k} href={part.href} target="_blank" rel="noopener noreferrer nofollow">{part.value}</a>
                : <span key={k}>{part.value}</span>))}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** An accessible dialog: focus moves in and is kept there, Esc closes, focus returns after. */
export function Modal({ open, onClose, title, description, children, footer, tone }) {
  const panel = useRef(null);
  const titleId = useId();
  const descId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => {
      const el = panel.current;
      (el?.querySelector("[data-autofocus]") || el?.querySelector(FOCUSABLE) || el)?.focus();
    }, 20);
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); closeRef.current?.(); return; }
      if (e.key !== "Tab" || !panel.current) return;
      const els = [...panel.current.querySelectorAll(FOCUSABLE)];
      if (!els.length) return;
      if (e.shiftKey && document.activeElement === els[0]) { e.preventDefault(); els[els.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === els[els.length - 1]) { e.preventDefault(); els[0].focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (prev && typeof prev.focus === "function") prev.focus();
    };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div className="jury j-modal-wrap">
      <div className="j-modal-scrim" onClick={onClose} aria-hidden="true" />
      <div ref={panel} className={cx("j-modal", tone === "danger" && "j-modal-danger")} role="dialog" aria-modal="true" aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined} tabIndex={-1}>
        <div className="j-modal-head">
          <div>
            <h2 id={titleId} className="j-modal-title">{title}</h2>
            {description && <p id={descId} className="j-modal-desc">{description}</p>}
          </div>
          <button type="button" className="j-iconbtn" onClick={onClose} aria-label="Close"><X className="j-ico" aria-hidden="true" /></button>
        </div>
        {children && <div className="j-modal-body">{children}</div>}
        {footer && <div className="j-modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Polite announcements ("Saved", "Submitted") for screen readers and a short visible note. */
export function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => onDone?.(), 4200);
    return () => clearTimeout(t);
  }, [message, onDone]);
  return (
    <div className="j-toast-wrap" aria-live="polite" role="status">
      {message && <div className="j-toast">{message}</div>}
    </div>
  );
}
