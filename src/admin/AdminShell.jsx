import { Fragment, useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { LogOut, Menu, X, ExternalLink } from "lucide-react";
import { titleFor } from "./nav";
import { volunteerMayOpen } from "./access";
import SidebarNav from "./SidebarNav";
import { focusRing, IconButton } from "./ui";
import { initials } from "./format";
import { useAdmin } from "./adminContext";
import GlobalSearch from "./search/GlobalSearch";
import ThemeSwitch from "./ThemeSwitch";
import { useAdminTheme } from "./theme";

const cx = (...a) => a.filter(Boolean).join(" ");

/* No website-status chip in the top bar: the kill switch is gone (the organiser, Oct 23 2026: "Its risky"). The website and the apps
   can't be taken offline from the panel; only the developers can, through Vercel / Render. */

function SidebarContent({ onNavigate }) {
  const { theme } = useAdminTheme();
  const { isVolunteer } = useAdmin();
  return (
    <nav aria-label="Admin sections" className="adm-sidebar-nav">
      <Link to={isVolunteer ? "/admin/people" : "/admin"} onClick={onNavigate} className={cx("mb-6 flex items-center gap-3 rounded-xl px-2 py-1", focusRing)}>
        <img src={theme === "light" ? "/Tech_Festival_Canada_Logo_Light_Transparent.webp" : "/Tech_Festival_Canada_Logo_Dark_Transparent.webp"} alt="" className="h-12 w-auto" />
        <span className="leading-tight">
          <span className="font-display block text-[13px] font-bold text-ttfc-contrast">TTFC</span>
          <span className="block text-[11px] font-medium text-ttfc-muted">{isVolunteer ? "Volunteer view" : "Staff panel"}</span>
        </span>
      </Link>
      <SidebarNav onNavigate={onNavigate} />
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

/* ?highlight=<key> (links from the global search to a setting or a staff row): scroll to the element with that
   data-highlight once the page has drawn it, flash it and focus a setting's control. DOM only, no page state. */
function useHighlightFromUrl(location, nonce) {
  useEffect(() => {
    const target = new URLSearchParams(location.search).get("highlight");
    if (!target) return undefined;
    let el = null;
    let tries = 0;
    let retry;
    let unflash;
    const find = () => {
      el = [...document.querySelectorAll("[data-highlight]")].find((x) => x.getAttribute("data-highlight") === target) || null;
      if (!el) { if (tries++ < 40) retry = setTimeout(find, 150); return; }
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      el.classList.add("adm-flash");
      // A setting's own control gets focus; a table row (a staff account) is only shown, never a control in it.
      if (el.tagName !== "TR") el.querySelector('[role="switch"], input, textarea')?.focus({ preventScroll: true });
      unflash = setTimeout(() => el?.classList.remove("adm-flash"), 2600);
    };
    find();
    return () => { clearTimeout(retry); clearTimeout(unflash); el?.classList.remove("adm-flash"); };
  }, [location.pathname, location.search, nonce]);
}

export default function AdminShell({ me, onSignOut, children }) {
  const { isManagement, isVolunteer } = useAdmin();
  const [drawer, setDrawer] = useState(false);
  // Bumped when the global search opens a link: the page starts fresh from its URL (search, drawer, highlight),
  // even when it's the page already open.
  const [searchNonce, setSearchNonce] = useState(0);
  const location = useLocation();
  // Volunteers: every address but People is "Not available", so the bar says so too.
  const title = isVolunteer && !volunteerMayOpen(location.pathname) && location.pathname.replace(/\/+$/, "") !== "/admin" ? "Not available" : titleFor(location.pathname);
  useHighlightFromUrl(location, searchNonce);

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
            <GlobalSearch onNavigated={() => setSearchNonce((n) => n + 1)} />
            <ThemeSwitch />
            <div className="flex items-center gap-3 border-l border-ttfc-line pl-3">
              {isVolunteer ? (
                // Volunteers have no My account page (account settings are for staff): just who's signed in.
                <div className="flex min-w-0 items-center gap-3" title={me?.email || undefined}>
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ttfc-pink via-ttfc-purple to-ttfc-orange text-xs font-bold text-white" aria-hidden="true">
                    {initials(me?.name, me?.email)}
                  </span>
                  <div className="hidden min-w-0 leading-tight md:block">
                    <p className="truncate text-sm font-semibold text-ttfc-text">{me?.name || "Volunteer"}</p>
                    <p className="truncate text-xs text-ttfc-dim">Volunteer · look-up only</p>
                  </div>
                </div>
              ) : (
              /* Your name opens My account (your level, change your password). */
              <NavLink to="/admin/account" aria-label={`My account: ${me?.name || "Staff"}`} title={`My account${me?.email ? ` (${me.email})` : ""}`} className={cx("flex min-w-0 items-center gap-3 rounded-xl hover:opacity-90", focusRing)}>
              <span
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ttfc-pink via-ttfc-purple to-ttfc-orange text-xs font-bold text-white"
                aria-hidden="true"
              >
                {initials(me?.name, me?.email)}
              </span>
              <div className="hidden min-w-0 leading-tight md:block">
                <p className="truncate text-sm font-semibold text-ttfc-text">{me?.name || "Staff"}</p>
                <p className="truncate text-xs text-ttfc-dim">{isManagement ? "Management" : "Staff"} · My account</p>
              </div>
              </NavLink>
              )}
              <button
                type="button"
                onClick={onSignOut}
                className={cx("inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-ttfc-muted transition hover:bg-ttfc-contrast/5 hover:text-ttfc-text", focusRing)}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </header>

        <main id="admin-main" className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10" tabIndex={-1}>
          <Fragment key={searchNonce}>{children}</Fragment>
        </main>
      </div>
    </div>
  );
}
