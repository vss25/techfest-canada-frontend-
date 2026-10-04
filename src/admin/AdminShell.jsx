import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { LogOut, Menu, X, ExternalLink } from "lucide-react";
import { NAV, titleFor } from "./nav";
import { focusRing, IconButton } from "./ui";
import { initials } from "./format";

const cx = (...a) => a.filter(Boolean).join(" ");

function SiteStatusChip({ kill }) {
  if (!kill) return null;
  const off = kill.enabled;
  return (
    <Link
      to="/admin/kill-switch"
      className={cx(
        "hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold sm:inline-flex",
        off ? "border-red-400/40 bg-red-500/15 text-red-200" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
        focusRing,
      )}
      title={off ? "The website and app are offline — click to manage" : "The website and app are live"}
    >
      <span className={cx("h-2 w-2 rounded-full", off ? "animate-pulse bg-red-400" : "bg-emerald-400")} aria-hidden="true" />
      {off ? "Site OFFLINE" : "Site live"}
    </Link>
  );
}

function SidebarContent({ onNavigate }) {
  return (
    <nav aria-label="Admin sections" className="adm-sidebar-nav">
      <Link to="/admin" onClick={onNavigate} className={cx("mb-6 flex items-center gap-3 rounded-xl px-2 py-1", focusRing)}>
        <img src="/Tech_Festival_Canada_Logo_Dark_Transparent.png" alt="" className="h-12 w-auto" />
        <span className="leading-tight">
          <span className="font-display block text-[13px] font-bold text-white">TTFC</span>
          <span className="block text-[11px] font-medium text-ttfc-muted">Staff panel</span>
        </span>
      </Link>
      <div className="-mx-2 flex-1 space-y-6 overflow-y-auto px-2 pb-6">
        {NAV.map((group, gi) => (
          <div key={gi}>
            {group.title && (
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-ttfc-dim">{group.title}</p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((it) => (
                <li key={it.to}>
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
                    <span className="truncate">{it.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className={cx("mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-ttfc-dim hover:text-ttfc-text", focusRing)}
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Open the website
      </a>
    </nav>
  );
}

export default function AdminShell({ me, kill, onSignOut, children }) {
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  const title = titleFor(location.pathname);

  useEffect(() => {
    if (!drawer) return undefined;
    const onKey = (e) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawer]);

  return (
    <div className="ttfc-admin">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-ttfc-purple focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] border-r border-ttfc-line bg-ttfc-ink/85 px-4 py-6 backdrop-blur-xl lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawer(false)} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 w-[84%] max-w-[300px] border-r border-ttfc-line bg-ttfc-ink px-4 py-6 shadow-2xl animate-in slide-in-from-left" aria-label="Menu">
            <IconButton icon={X} label="Close menu" onClick={() => setDrawer(false)} className="absolute right-3 top-5" />
            <SidebarContent onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[264px]">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-ttfc-line bg-ttfc-ink/80 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-10">
            <IconButton icon={Menu} label="Open menu" onClick={() => setDrawer(true)} className="lg:hidden" aria-expanded={drawer} />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ttfc-text">{title}</p>
            <SiteStatusChip kill={kill} />
            <div className="flex items-center gap-3 border-l border-ttfc-line pl-3">
              <span
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ttfc-pink via-ttfc-purple to-ttfc-orange text-xs font-bold text-white"
                aria-hidden="true"
              >
                {initials(me?.name, me?.email)}
              </span>
              <div className="hidden min-w-0 leading-tight md:block">
                <p className="truncate text-sm font-semibold text-ttfc-text">{me?.name || "Staff"}</p>
                <p className="truncate text-xs text-ttfc-dim">{me?.email}</p>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className={cx("inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-ttfc-muted transition hover:bg-white/5 hover:text-ttfc-text", focusRing)}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </header>

        <main id="admin-main" className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
