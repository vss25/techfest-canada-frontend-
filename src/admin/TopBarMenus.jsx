import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { initials } from "./format";
import { useAdminEvent } from "./eventContext";

/* The right end of the desktop top bar (approved admin design, board 17): the alerts bell with a
   gold count, and you (initials and level). Both open a small menu. */

const MENU = "absolute right-0 top-[46px] z-30 w-[280px] rounded-xl border border-[#E3E0EE] bg-white p-1.5 shadow-[0_14px_34px_rgba(21,16,53,.14)]";
const ITEM = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] text-left text-sm text-[#151035] hover:bg-[#F6F5FA]";

function useMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const down = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", esc); };
  }, [open]);
  return { open, setOpen, ref };
}

const Count = ({ n }) => (
  <span className="ml-auto min-w-[20px] rounded-full bg-[#F5A623] px-1.5 text-center text-[11px] font-bold leading-5 text-[#151035]">{n}</span>
);

export function AlertsBell() {
  const { attention } = useAdminEvent();
  const { open, setOpen, ref } = useMenu();
  const items = [
    { n: attention.flags, label: "Flags raised: someone needs help", to: "/admin/work?tab=flags" },
    { n: attention.overdue, label: "Your overdue tasks", to: "/admin/work" },
    { n: attention.changes, label: "Website changes waiting", to: "/admin/content/changes" },
    { n: attention.sos, label: "SOS requests open", to: "/admin/app/sos" },
  ].filter((i) => i.n > 0);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu"
        aria-label={attention.total ? `${attention.total} things need attention` : "Nothing needs attention"}
        className="relative flex h-9 w-9 items-center justify-center rounded-[9px] border border-[#E3E0EE] bg-white hover:bg-[#F6F5FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6308C]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#151035" strokeWidth="1.9" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0" /></svg>
        {attention.total > 0 && (
          <span className="absolute -right-[5px] -top-[5px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#F5A623] px-1 text-[10px] font-bold text-[#151035]">{attention.total}</span>
        )}
      </button>
      {open && (
        <div role="menu" aria-label="Needs attention" className={MENU}>
          {items.length ? items.map((i) => (
            <Link key={i.to} to={i.to} role="menuitem" onClick={() => setOpen(false)} className={ITEM}>{i.label}<Count n={i.n} /></Link>
          )) : <p className="px-2.5 py-2 text-sm text-[#6B6688]">Nothing needs your attention.</p>}
        </div>
      )}
    </div>
  );
}

export function AccountMenu({ me, role, onSignOut, volunteer }) {
  const { open, setOpen, ref } = useMenu();
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu" title={me?.email || undefined}
        aria-label={`${me?.name || "Your account"}, ${role}`}
        className="flex items-center gap-2 rounded-[9px] text-[13px] font-semibold text-[#151035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6308C]">
        <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#151035] text-xs text-white" aria-hidden="true">{initials(me?.name, me?.email)}</span>
        {role}
      </button>
      {open && (
        <div role="menu" aria-label="Your account" className={MENU}>
          <p className="px-2.5 pb-1.5 pt-1 text-xs text-[#6B6688]">{me?.name || "Signed in"}{me?.email ? ` · ${me.email}` : ""}</p>
          {!volunteer && <Link to="/admin/account" role="menuitem" onClick={() => setOpen(false)} className={ITEM}>My account</Link>}
          <button type="button" role="menuitem" onClick={onSignOut} className={ITEM}>Sign out</button>
        </div>
      )}
    </div>
  );
}
