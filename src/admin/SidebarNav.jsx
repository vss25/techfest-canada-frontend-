import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { NAV, navItemFor } from "./nav";
import { focusRing } from "./ui";
import { useAdmin } from "./adminContext";

/* =========================================================
   The sidebar's sections and links (nav.js). "More" folds away
   and remembers open or closed in this browser (localStorage,
   best effort: private windows just start folded). It opens by
   itself when the page you're on is inside it, so the current
   link is always visible.
========================================================= */

const cx = (...a) => a.filter(Boolean).join(" ");
const MORE_KEY = "ttfc-admin-more-open";

function readOpen() {
  try { return window.localStorage.getItem(MORE_KEY) === "1"; } catch { return false; }
}
function saveOpen(open) {
  try { window.localStorage.setItem(MORE_KEY, open ? "1" : "0"); } catch { /* storage off: it just isn't remembered */ }
}

function NavItem({ it, onNavigate }) {
  return (
    <li>
      <NavLink
        to={it.to ? `/admin/${it.to}` : "/admin"}
        end={it.end}
        onClick={onNavigate}
        className={({ isActive }) => cx(
          "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
          isActive
            ? "bg-gradient-to-r from-ttfc-pink/20 to-ttfc-purple/10 text-white shadow-[inset_2px_0_0_0_#E8458B]"
            : it.danger ? "text-red-300/80 hover:bg-red-500/10 hover:text-red-200" : "text-ttfc-muted hover:bg-white/5 hover:text-ttfc-text",
          focusRing,
        )}
      >
        <it.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        <span className="min-w-0 leading-snug">{it.label}</span>
      </NavLink>
    </li>
  );
}

/** Links of one section, with More's small sub-headings (Records, Logo strips, App reports, Settings). */
function ItemList({ items, onNavigate }) {
  const out = [];
  let sub = null;
  for (const it of items) {
    if (it.sub && it.sub !== sub) {
      sub = it.sub;
      out.push(<li key={`sub:${sub}`} className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-ttfc-dim/80 first:pt-1" aria-hidden="true">{sub}</li>);
    }
    out.push(<NavItem key={it.to} it={it} onNavigate={onNavigate} />);
  }
  return <ul className="space-y-0.5">{out}</ul>;
}

export default function SidebarNav({ onNavigate }) {
  const { isManagement } = useAdmin();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(readOpen);
  const inMore = !!navItemFor(pathname)?.group?.collapsible;

  // Arriving on a page inside More (a link, a bookmark, the search) opens it (once per page, so it can still be folded).
  const [openedFor, setOpenedFor] = useState("");
  if (inMore && openedFor !== pathname) {
    setOpenedFor(pathname);
    setMoreOpen(true);
  }
  useEffect(() => { saveOpen(moreOpen); }, [moreOpen]);

  const toggle = () => setMoreOpen((o) => !o);

  return (
    <div className="-mx-2 flex-1 space-y-6 overflow-y-auto px-2 pb-6">
      {NAV.filter((g) => !g.hidden).map((group, gi) => {
        const items = group.items.filter((it) => !it.hidden && (isManagement || !it.management));
        if (!items.length) return null;
        if (group.collapsible) {
          const id = `adm-nav-${gi}`;
          return (
            <div key={gi} className="border-t border-ttfc-line/70 pt-4">
              <button type="button" onClick={toggle} aria-expanded={moreOpen} aria-controls={id}
                className={cx("mb-1 flex w-full items-center justify-between rounded-lg px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-ttfc-dim hover:text-ttfc-text", focusRing)}>
                <span>{group.title}<span className="ml-1.5 font-semibold normal-case tracking-normal text-ttfc-dim/80">({items.length})</span></span>
                <ChevronDown className={cx("h-4 w-4 transition-transform", moreOpen && "rotate-180")} aria-hidden="true" />
              </button>
              {moreOpen && <div id={id}><ItemList items={items} onNavigate={onNavigate} /></div>}
            </div>
          );
        }
        return (
          <div key={gi}>
            {group.title && <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-ttfc-dim">{group.title}</p>}
            <ItemList items={items} onNavigate={onNavigate} />
          </div>
        );
      })}
    </div>
  );
}
