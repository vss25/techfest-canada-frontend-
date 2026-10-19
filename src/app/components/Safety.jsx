import { useEffect, useRef, useState } from "react";
import { Ellipsis } from "lucide-react";
import { cx } from "../lib/ui";

/* A "…" menu that closes on an outside tap (iOS Menu). Report / Block items come from lib/safety.js. */

/** A small dropdown menu. items: [{ label, icon, onClick, danger }] (falsy entries skipped). */
export function MoreMenu({ items, label = "More options", icon = Ellipsis, className, align = "right", buttonClassName = "icon-btn pressable" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const Icon = icon;
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown, true); document.removeEventListener("keydown", onKey); };
  }, [open]);
  const shown = items.filter(Boolean);
  if (!shown.length) return null;
  return (
    <div ref={ref} className={cx("more-menu", className)}>
      <button type="button" className={buttonClassName} aria-label={label} title={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Icon aria-hidden="true" />
      </button>
      {open && (
        <div className="menu" role="menu" style={align === "left" ? { left: 0, right: "auto" } : { right: 0 }}>
          {shown.map((it) => {
            const I = it.icon;
            return (
              <button key={it.label} type="button" role="menuitem" className={it.danger ? "danger" : undefined} onClick={() => { setOpen(false); it.onClick(); }}>
                {I && <I aria-hidden="true" width={16} />}<span style={{ whiteSpace: "nowrap" }}>{it.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

