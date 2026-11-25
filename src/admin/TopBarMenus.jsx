import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { initials } from "./format";
import { THEME_OPTIONS, useAdminTheme } from "./theme";
import { useAdminEvent } from "./eventContext";
import { KINDS, countsOf, lowerSeen, readSeen, seenKey, unseenCount, writeSeen } from "./bellSeen";

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

/* "Seen" (Nov 23 2026, the owner): opening the bell clears its gold number until something new
   arrives. We keep, per person and per browser, how many of each kind there were when they last
   opened it; the number is only what has gone up since. The list inside always shows everything
   still open, so nothing is hidden. When a count drops (work done), "seen" drops with it, so the
   next new one shows again. */
export function AlertsBell({ me }) {
  const { attention } = useAdminEvent();
  const { open, setOpen, ref } = useMenu();
  const key = seenKey(me);
  const [seen, setSeen] = useState(() => readSeen(key));
  useEffect(() => { setSeen(readSeen(key)); }, [key]);
  // Work done since: bring "seen" down with it.
  useEffect(() => {
    if (!seen || !attention.ready) return;
    const low = lowerSeen(attention, seen);
    if (KINDS.some((k) => low[k] !== (Number(seen[k]) || 0))) { setSeen(low); writeSeen(key, low); }
  }, [attention, seen, key]);
  // Opening the bell (and while it's open) marks everything in it as seen.
  useEffect(() => {
    if (!open || !attention.ready) return;
    const now = countsOf(attention);
    if (!seen || KINDS.some((k) => now[k] !== (Number(seen[k]) || 0))) { setSeen(now); writeSeen(key, now); }
  }, [open, attention, seen, key]);
  const fresh = attention.ready ? unseenCount(attention, seen) : 0;
  const items = [
    { n: attention.flags, label: "Flags raised: someone needs help", to: "/admin/work?tab=flags" },
    { n: attention.overdue, label: "Your overdue tasks", to: "/admin/work" },
    { n: attention.changes, label: "Website changes waiting", to: "/admin/content/changes" },
    { n: attention.sos, label: "SOS requests open", to: "/admin/app/sos" },
  ].filter((i) => i.n > 0);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu"
        aria-label={attention.total ? `${attention.total} things need attention${fresh ? `, ${fresh} new` : ""}` : "Nothing needs attention"}
        className="relative flex h-9 w-9 items-center justify-center rounded-[9px] border border-[#E3E0EE] bg-white hover:bg-[#F6F5FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6308C]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#151035" strokeWidth="1.9" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0" /></svg>
        {fresh > 0 && (
          <span className="absolute -right-[5px] -top-[5px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#F5A623] px-1 text-[10px] font-bold text-[#151035]" aria-hidden="true">{fresh}</span>
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
          <ThemeChoice />
          <button type="button" role="menuitem" onClick={onSignOut} className={ITEM}>Sign out</button>
        </div>
      )}
    </div>
  );
}

/* Light / Dark / Match my device for the staff panel (theme.js; saved in this browser). */
function ThemeChoice() {
  const { choice, setChoice } = useAdminTheme();
  return (
    <div className="mx-1 my-1 border-t border-[#F0EEF6] px-1.5 pt-2">
      <p id="adm-theme-label" className="pb-1.5 text-xs text-[#6B6688]">Appearance</p>
      <div role="radiogroup" aria-labelledby="adm-theme-label" className="grid grid-cols-3 gap-1 rounded-lg bg-[#F6F5FA] p-1">
        {THEME_OPTIONS.map((o) => (
          <button key={o.key} type="button" role="radio" aria-checked={choice === o.key} onClick={() => setChoice(o.key)}
            className={`rounded-md px-1.5 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6308C] ${choice === o.key ? "bg-white text-[#151035] shadow-sm" : "text-[#6B6688] hover:text-[#151035]"}`}>
            {o.key === "system" ? "Device" : o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
