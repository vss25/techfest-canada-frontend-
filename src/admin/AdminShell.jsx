import { Fragment, useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { titleFor } from "./nav";
import { volunteerMayOpen } from "./access";
import { PhoneTabs, WorkspaceMenu, WorkspaceRail } from "./WorkspaceNav";
import { focusRing } from "./ui";
import { initials } from "./format";
import { useAdmin } from "./adminContext";
import GlobalSearch from "./search/GlobalSearch";

const cx = (...a) => a.filter(Boolean).join(" ");

/* No website-status chip in the top bar: the kill switch is gone (the organiser, Oct 23 2026: "Its risky"). The website and the apps
   can't be taken offline from the panel; only the developers can, through Vercel / Render. */

/* The approved admin design (boards 16–18, Nov 2026): the navy workspace rail and the open workspace's
   menu on the left, a white top bar, pages on a pale lilac background. One light look (no dark mode). */
function Navigation({ onNavigate }) {
  return (
    <div className="flex h-full">
      <WorkspaceRail onNavigate={onNavigate} />
      <WorkspaceMenu onNavigate={onNavigate} />
    </div>
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
  // Bumped when the global search opens a link: the page starts fresh from its URL (search, drawer, highlight),
  // even when it's the page already open.
  const [searchNonce, setSearchNonce] = useState(0);
  const location = useLocation();
  // Volunteers: every address but People is "Not available", so the bar says so too.
  const title = isVolunteer && !volunteerMayOpen(location.pathname) && location.pathname.replace(/\/+$/, "") !== "/admin" ? "Not available" : titleFor(location.pathname);
  useHighlightFromUrl(location, searchNonce);


  return (
    <div className="ttfc-admin">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-ttfc-purple focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>

      {/* Desktop: rail + workspace menu */}
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        <Navigation />
      </div>

      <div className="lg:pl-[336px]">
        {/* Phone and tablet bar (board 18): navy, the logo, search and you */}
        <header className="sticky top-0 z-30 bg-[#151035] text-white lg:hidden">
          <div className="flex items-center gap-2.5 px-4 pb-3 pt-3.5">
            <Link to={isVolunteer ? "/admin/people" : "/admin"} className={cx("flex items-center gap-2.5 rounded-lg", focusRing)} aria-label="Staff panel home">
              <img src="/Tech_Festival_Canada_Logo_Dark_Transparent.webp" alt="" className="block h-[30px] w-auto" />
              <span className="text-xs font-semibold opacity-75">Admin</span>
            </Link>
            <p className="sr-only">{title}</p>
            <div className="adm-phone-search ml-auto"><GlobalSearch onNavigated={() => setSearchNonce((n) => n + 1)} /></div>
            {isVolunteer ? (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#151035]" title={me?.email || undefined} aria-label={me?.name || "Volunteer"}>{initials(me?.name, me?.email)}</span>
            ) : (
              <NavLink to="/admin/account" aria-label={`My account: ${me?.name || "Staff"}`} className={cx("inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#151035]", focusRing)}>
                {initials(me?.name, me?.email)}
              </NavLink>
            )}
            {isVolunteer && (
              <button type="button" onClick={onSignOut} aria-label="Sign out" className={cx("inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/[.14]", focusRing)}>
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </header>

        {/* Desktop top bar */}
        <header className="sticky top-0 z-30 hidden border-b border-[#E3E0EE] bg-white lg:block">
          <div className="flex h-16 items-center gap-3 px-6">
            <div className="flex min-w-0 max-w-[380px] flex-1 items-center">
              <GlobalSearch onNavigated={() => setSearchNonce((n) => n + 1)} />
            </div>
            <div className="ml-auto flex items-center gap-2.5">
              <a href="/" target="_blank" rel="noopener noreferrer"
                className={cx("hidden h-9 items-center rounded-[9px] border border-[#E3E0EE] px-3 text-[13px] font-semibold text-[#151035] hover:bg-[#F6F5FA] md:inline-flex", focusRing)}>
                View site
              </a>
              {isVolunteer ? (
                // Volunteers have no My account page (account settings are for staff): just who's signed in.
                <div className="flex min-w-0 items-center gap-2" title={me?.email || undefined}>
                  <span className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#151035] text-xs font-semibold text-white" aria-hidden="true">
                    {initials(me?.name, me?.email)}
                  </span>
                  <span className="hidden truncate text-[13px] font-semibold text-[#151035] md:inline">Volunteer · look-up only</span>
                </div>
              ) : (
              /* Your name opens My account (your level, change your password). */
              <NavLink to="/admin/account" aria-label={`My account: ${me?.name || "Staff"}`} title={`My account${me?.email ? ` (${me.email})` : ""}`}
                className={cx("flex min-w-0 items-center gap-2 rounded-[9px] hover:opacity-90", focusRing)}>
                <span className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#151035] text-xs font-semibold text-white" aria-hidden="true">
                  {initials(me?.name, me?.email)}
                </span>
                <span className="hidden min-w-0 leading-tight md:block">
                  <span className="block truncate text-[13px] font-semibold text-[#151035]">{me?.name || "Staff"}</span>
                  <span className="block truncate text-xs text-[#6B6688]">{isManagement ? "Management" : "Staff"}</span>
                </span>
              </NavLink>
              )}
              <button
                type="button"
                onClick={onSignOut}
                className={cx("inline-flex h-9 items-center gap-2 rounded-[9px] px-2.5 text-[13px] font-semibold text-[#4A4566] transition hover:bg-[#F6F5FA] hover:text-[#151035]", focusRing)}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </header>

        <main id="admin-main" className="mx-auto w-full max-w-[1400px] px-4 pb-[96px] pt-4 sm:px-6 lg:px-7 lg:pb-10 lg:pt-6" tabIndex={-1}>
          <Fragment key={searchNonce}>{children}</Fragment>
        </main>
      </div>
      <PhoneTabs onSignOut={onSignOut} />
    </div>
  );
}
