import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Lock, LogOut } from "lucide-react";
import { navItemFor, workspaceFor } from "./nav";
import { workspacesFor } from "./access";
import { useAdmin } from "./adminContext";
import { useAdminEvent } from "./eventContext";
import { EventChip } from "./EventSwitcher";
import { ReadinessStrip } from "./cms/ReadinessCard";

/* =========================================================
   The approved admin design's navigation (boards 16–18):
   a navy rail of workspaces (Home, Content, Marketing, Sales,
   Operations, People, Event day, Awards; Settings at the bottom)
   and, beside it, the open workspace's menu: its name, what it's
   for, and its pages in groups. The workspace is the one the page
   you're on belongs to; picking another opens its first page.
   Volunteers see People only (access.js workspacesFor).
========================================================= */

const cx = (...a) => a.filter(Boolean).join(" ");
const pathOf = (to) => (to ? `/admin/${to}` : "/admin");
const RING = "outline-none focus-visible:ring-2 focus-visible:ring-[#D6308C] focus-visible:ring-offset-2";

function RailIcon({ d }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/* Gold counts (the board's badges): Home = website changes waiting; Event day = open SOS requests. */
function useBadges() {
  const { attention } = useAdminEvent();
  return {
    ws: { home: attention.changes, day: attention.sos },
    page: { "content/changes": attention.changes, "app/sos": attention.sos },
  };
}
const Gold = ({ n, className = "" }) => (n > 0 ? (
  <span className={cx("flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#F5A623] px-1 text-[10px] font-bold text-[#151035]", className)}>{n}</span>
) : null);

function RailButton({ w, current, onNavigate, badge = 0 }) {
  const first = w.groups[0].items[0];
  return (
    <Link
      to={pathOf(first.to)}
      onClick={onNavigate}
      aria-current={current ? "true" : undefined}
      className={cx("relative flex w-[72px] flex-col items-center gap-[5px] rounded-xl pb-[7px] pt-[9px] text-[11px] font-semibold transition-colors",
        current ? "bg-white/[.14] text-white" : "text-white/[.72] hover:bg-white/[.08] hover:text-white", RING)}
    >
      {current && <span className="absolute -left-1.5 top-3.5 h-7 w-1 rounded bg-[#D6308C]" aria-hidden="true" />}
      <Gold n={badge} className="absolute right-3 top-[5px]" />
      <RailIcon d={w.rail} />
      {w.label}
    </Link>
  );
}

/** The navy rail: the logo, the workspaces, Settings at the bottom. */
export function WorkspaceRail({ onNavigate }) {
  const { isManagement, isVolunteer } = useAdmin();
  const { pathname } = useLocation();
  const all = workspacesFor({ isManagement, isVolunteer });
  const current = workspaceFor(pathname).id;
  const badges = useBadges();
  const top = all.filter((w) => !w.bottom);
  const bottom = all.filter((w) => w.bottom);
  return (
    // Not a <nav>: the public site's CSS turns every <nav> into its 80px header bar.
    <div role="navigation" aria-label="Workspaces" className="flex h-full w-[84px] flex-col items-center gap-1 bg-[#151035] py-3.5">
      <Link to={isVolunteer ? "/admin/people" : "/admin"} onClick={onNavigate} className={cx("mb-3.5 mt-0.5 block rounded-lg", RING)} aria-label="The Tech Festival Canada staff panel, Home">
        <img src="/Tech_Festival_Canada_Logo_Dark_Transparent.webp" alt="" className="block h-auto w-16" />
      </Link>
      {top.map((w) => <RailButton key={w.id} w={w} current={w.id === current} onNavigate={onNavigate} badge={badges.ws[w.id] || 0} />)}
      <div className="flex-1" />
      {bottom.map((w) => <RailButton key={w.id} w={w} current={w.id === current} onNavigate={onNavigate} />)}
    </div>
  );
}

/** The open workspace's menu: name, what it's for, its pages in groups. */
export function WorkspaceMenu({ onNavigate }) {
  const { isManagement, isVolunteer } = useAdmin();
  const { pathname } = useLocation();
  const all = workspacesFor({ isManagement, isVolunteer });
  const id = workspaceFor(pathname).id;
  const ws = all.find((w) => w.id === id) || all[0];
  // A hidden page that is a tab of another (Featured partners) lights up that page.
  const hit = navItemFor(pathname)?.item;
  const active = hit?.parent || hit?.to;
  const badges = useBadges();
  if (!ws) return null;
  return (
    <aside aria-label={`${ws.label} pages`} className="flex h-full w-[252px] flex-col gap-3.5 overflow-y-auto border-r border-[#E3E0EE] bg-white px-3.5 py-5">
      <div className="flex flex-col gap-1 px-2">
        <h2 className="m-0 text-xl font-bold text-[#151035]">{ws.label}</h2>
        <span className="text-xs leading-[18px] text-[#6B6688]">{isVolunteer ? "Look someone up. Read only." : ws.job}</span>
      </div>
      {ws.scoped && !isVolunteer && <EventChip />}
      {ws.groups.map((g, gi) => (
        <div key={gi} className="flex flex-col gap-0.5">
          {g.title && <span className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8A86A0]">{g.title}</span>}
          {g.scoped && ws.id === "content" && !isVolunteer && <ReadinessStrip compact />}
          {g.items.map((it) => {
            const on = it.to === active;
            return (
              <NavLink
                key={it.to}
                to={pathOf(it.to)}
                end={it.end}
                onClick={onNavigate}
                aria-current={on ? "page" : undefined}
                className={cx("flex h-[38px] items-center gap-2 rounded-[9px] px-2.5 text-left text-sm transition-colors",
                  on ? "bg-[#151035] font-semibold text-white" : "font-medium text-[#151035] hover:bg-[#F6F5FA]", RING)}
              >
                <span className="min-w-0 truncate">{it.label}</span>
                {it.management && <Lock className={cx("h-3 w-3 shrink-0", on ? "text-[#F5A623]" : "text-[#B45309]")} aria-label="Management only" />}
                {badges.page[it.to] > 0 && <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#F5A623] px-1.5 text-[11px] font-bold text-[#151035]">{badges.page[it.to]}</span>}
              </NavLink>
            );
          })}
        </div>
      ))}
      <div className="flex-1" />
      <a href="/" target="_blank" rel="noopener noreferrer" className={cx("rounded-[9px] px-2.5 py-2 text-xs font-medium text-[#6B6688] hover:text-[#151035]", RING)}>
        Open the website ↗
      </a>
    </aside>
  );
}

/* ---------- Phones and tablets (board 18) ----------
   A white bar of five tabs at the bottom: Home, Content, People, Event day and More. A tab opens its
   workspace's pages as cards (/admin/ws/<id>); More opens a sheet with every other workspace's pages. */
const TABS = ["home", "content", "people", "day"];
// The phone board's own tab icons (Content is a calendar there, People a single person).
const TAB_ICON = {
  content: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  people: "M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
};
const MORE_DOTS = "M5 12h.01M12 12h.01M19 12h.01";

function TabButton({ to, label, d, on, onClick }) {
  const cls = cx("relative flex flex-col items-center justify-center gap-1 text-[11px] font-semibold", on ? "text-[#151035]" : "text-[#8A86A0]", RING);
  const inner = (
    <>
      {on && <span className="absolute top-0 h-[3px] w-7 rounded-[3px] bg-[#D6308C]" aria-hidden="true" />}
      <RailIcon d={d} />{label}
    </>
  );
  return to
    ? <Link to={to} className={cls} aria-current={on ? "page" : undefined}>{inner}</Link>
    : <button type="button" className={cls} onClick={onClick} aria-expanded={on}>{inner}</button>;
}

export function PhoneTabs({ onSignOut }) {
  const { isManagement, isVolunteer } = useAdmin();
  const { pathname } = useLocation();
  // The sheet is open for the page it was opened on, so following one of its links closes it.
  const [moreFor, setMoreFor] = useState(null);
  const more = moreFor === pathname;
  const setMore = (v) => setMoreFor((cur) => ((typeof v === "function" ? v(cur === pathname) : v) ? pathname : null));
  useEffect(() => {
    if (!more) return undefined;
    const esc = (e) => e.key === "Escape" && setMoreFor(null);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [more]);
  if (isVolunteer) return null;   // one page (People): nothing to switch between
  const all = workspacesFor({ isManagement, isVolunteer });
  const current = workspaceFor(pathname).id;
  const tabs = TABS.map((id) => all.find((w) => w.id === id)).filter(Boolean);
  const rest = all.filter((w) => !TABS.includes(w.id));
  return (
    <>
      {more && (
        <div className="fixed inset-0 z-40 bg-[#151035]/40 lg:hidden" onClick={() => setMore(false)} aria-hidden="true" />
      )}
      {more && (
        <div role="dialog" aria-modal="true" aria-label="More pages"
          className="fixed inset-x-0 z-50 flex max-h-[78vh] flex-col gap-3.5 overflow-auto rounded-t-[18px] bg-white px-4 pb-7 pt-[18px] lg:hidden"
          style={{ bottom: "calc(72px + var(--ttfc-staging-bar, 0px))" }}>
          <div className="h-1 w-10 self-center rounded bg-[#E3E0EE]" aria-hidden="true" />
          {rest.map((w) => (
            <div key={w.id} className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8A86A0]">{w.label}</span>
              <div className="flex flex-wrap gap-1.5">
                {w.groups.flatMap((g) => g.items).map((it) => (
                  <Link key={it.to} to={pathOf(it.to)} className={cx("rounded-full bg-[#F6F5FA] px-[11px] py-[7px] text-[13px] font-semibold text-[#151035]", RING)}>{it.label}</Link>
                ))}
              </div>
            </div>
          ))}
          <button type="button" onClick={onSignOut} className={cx("mt-1 inline-flex items-center gap-2 self-start rounded-[9px] px-1 py-1 text-[13px] font-semibold text-[#4A4566]", RING)}>
            <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
          </button>
        </div>
      )}
      <div role="navigation" aria-label="Workspaces"
        className="fixed inset-x-0 z-50 grid h-[72px] border-t border-[#E3E0EE] bg-white lg:hidden"
        // Above the staging banner when there is one (--ttfc-staging-bar, components/PreviewBar.jsx).
        style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))`, paddingBottom: "env(safe-area-inset-bottom, 0px)", bottom: "var(--ttfc-staging-bar, 0px)" }}>
        {tabs.map((w) => <TabButton key={w.id} to={`/admin/ws/${w.id}`} label={w.label} d={TAB_ICON[w.id] || w.rail} on={!more && w.id === current} />)}
        <TabButton label="More" d={MORE_DOTS} on={more || !TABS.includes(current)} onClick={() => setMore((m) => !m)} />
      </div>
    </>
  );
}
