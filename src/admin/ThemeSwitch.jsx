import { useEffect, useId, useRef, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { focusRing } from "./ui";
import { useAdminTheme } from "./theme";

/* The top bar's theme menu: System (follows this device), Light or Dark. */

const cx = (...a) => a.filter(Boolean).join(" ");
const OPTIONS = [
  { key: "system", label: "System", hint: "Follows this device", icon: Monitor },
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
];

export default function ThemeSwitch() {
  const { choice, theme, systemTheme, setChoice } = useAdminTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const itemRefs = useRef([]);
  const menuId = useId();
  const current = OPTIONS.find((o) => o.key === choice) || OPTIONS[0];
  const label = `Theme: ${current.label}${choice === "system" ? ` (${theme})` : ""}`;

  // Opening puts focus on the current choice; a click outside closes.
  useEffect(() => {
    if (!open) return undefined;
    itemRefs.current[Math.max(0, OPTIONS.findIndex((o) => o.key === choice))]?.focus();
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open, choice]);

  const close = (refocus = true) => { setOpen(false); if (refocus) buttonRef.current?.focus(); };
  const pick = (key) => { setChoice(key); close(); };

  const onMenuKey = (e) => {
    const i = itemRefs.current.indexOf(document.activeElement);
    const n = OPTIONS.length;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      itemRefs.current[(i + (e.key === "ArrowDown" ? 1 : -1) + n) % n]?.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      itemRefs.current[e.key === "Home" ? 0 : n - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Tab") {
      close(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === "ArrowDown" && !open) { e.preventDefault(); setOpen(true); } }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        title={label}
        className={cx("inline-flex h-9 w-9 items-center justify-center rounded-xl text-ttfc-muted transition hover:bg-ttfc-contrast/5 hover:text-ttfc-text", open && "bg-ttfc-contrast/5 text-ttfc-text", focusRing)}
      >
        <current.icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Theme"
          onKeyDown={onMenuKey}
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-ttfc-line bg-ttfc-panel p-1.5 text-ttfc-text shadow-2xl shadow-black/30 animate-in fade-in slide-in-from-top-1"
        >
          <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-ttfc-dim" aria-hidden="true">Theme</p>
          {OPTIONS.map((o, i) => {
            const on = o.key === choice;
            return (
              <button
                key={o.key}
                ref={(el) => { itemRefs.current[i] = el; }}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                tabIndex={-1}
                onClick={() => pick(o.key)}
                className={cx(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-ttfc-contrast/5 focus-visible:bg-ttfc-contrast/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ttfc-purple",
                  on ? "font-semibold text-ttfc-text" : "text-ttfc-muted",
                )}
              >
                <o.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 leading-tight">
                  {o.label}
                  {o.hint && <span className="block text-xs font-normal text-ttfc-dim">{o.hint}{o.key === "system" ? ` (${systemTheme} now)` : ""}</span>}
                </span>
                <Check className={cx("h-4 w-4 shrink-0 text-ttfc-pink", !on && "invisible")} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
