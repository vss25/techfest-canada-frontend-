import { NAV } from "./nav.js";
import { maskName, maskText } from "./people/volunteerMask.js";

/* =========================================================
   Who sees what in the admin panel.
   - Staff accounts (role "admin"): every page; "management" also
     sees money, sales and Staff accounts (GET /console/me).
   - Volunteer accounts (role "volunteer", Oct 23 2026: "volunteer
     should only be able to access people details … these are
     students who are going to assist with running the event"):
     People only, read only. The list and one person's profile, and
     the top bar's search for people. No other page, no writes, no
     CSV, no bulk sends, no money, codes or marketing. The server
     enforces it (403 volunteer_forbidden everywhere else, and a safe
     projection of each person); this file only keeps the panel from
     showing or asking for anything else.
   Anyone else (an app account) gets "This account isn't staff".
========================================================= */

export const VOLUNTEER = "volunteer";
/** The server's `code` on a 403 for a volunteer account outside People. */
export const VOLUNTEER_FORBIDDEN = "volunteer_forbidden";
export const VOLUNTEER_FORBIDDEN_TEXT = "Volunteer accounts can only look up people.";
export const NOT_FOR_VOLUNTEERS = "Not available for volunteer accounts";

/** The account kind from GET /auth/me: "staff" (role admin), "volunteer", or "none". */
export function accountKind(me) {
  const role = String(me?.role || "");
  if (role === "admin") return "staff";
  if (role === VOLUNTEER) return VOLUNTEER;
  return "none";
}

export const isVolunteerAccount = (me) => accountKind(me) === VOLUNTEER;

/** The panel's access for a volunteer: never management, never asks GET /console/me (it would be refused). */
export const VOLUNTEER_ACCESS = Object.freeze({ staffRole: VOLUNTEER, isManagement: false, isVolunteer: true });

/** Sidebar groups for this account: volunteers get People only; staff everything but management items. */
export function navFor({ isManagement = false, isVolunteer = false } = {}) {
  const out = [];
  for (const g of NAV) {
    if (g.hidden) continue;
    const items = g.items.filter((it) => !it.hidden && (isVolunteer ? it.volunteer === true : isManagement || !it.management));
    if (items.length) out.push({ ...g, items, collapsible: isVolunteer ? false : g.collapsible });
  }
  return out;
}

/**
 * May a volunteer open this address? Only /admin/people (the list) and /admin/people/<id> (a profile).
 * `/admin` itself goes to People (the caller redirects); everything else is "Not available".
 */
export function volunteerMayOpen(pathname) {
  const rest = String(pathname || "").replace(/^\/admin\/?/, "").replace(/\/+$/, "");
  if (rest === "people") return true;
  const m = /^people\/([^/]+)$/.exec(rest);
  return !!m && m[1].length > 0;
}

/** A search result as a volunteer sees it: a name that is an email (or its local part) shows as "No name", and any
 * email or long number in the title or subtitle is masked (people/volunteerMask.js; the server masks them too). */
const volunteerItem = (it) => ({ ...it, title: maskName(it?.title) || "No name", subtitle: maskText(it?.subtitle, 200) });

/**
 * The global search for a volunteer: only the server's People group, and only links into People, masked. `exact`: the
 * query is an email or a ticket ID: no "See all in People" then (its link would carry the email or ticket ID).
 */
export function searchGroupsFor(groups = [], { isVolunteer = false, exact = false } = {}) {
  if (!isVolunteer) return groups;
  return groups
    .filter((g) => g?.key === "people")
    .map((g) => ({
      ...g,
      items: (g.items || []).filter((it) => volunteerMayOpen(String(it?.link || "").split("?")[0])).map(volunteerItem),
      seeAll: !exact && g.seeAll && String(g.seeAll.link || "").startsWith("/admin/people?") ? g.seeAll : null,
    }));
}

/** Recently opened search results a volunteer may still open (People only), masked like the results. */
export const volunteerRecents = (results = []) => results.filter((r) => volunteerMayOpen(String(r?.link || "").split("?")[0])).map(volunteerItem);
