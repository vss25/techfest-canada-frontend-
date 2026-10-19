/**
 * Sponsors: the partners in the Partners page's "Featured Partners" row (the
 * paid partners). One Sanity `partner` record per sponsor is the only source:
 * the website, the web app (/app), the iOS and Android apps and the admin
 * panel all read it.
 *
 * Where a partner shows:
 *   - `active`        master switch, off = hidden everywhere
 *   - `showOnWebsite` off = not on thetechfestival.com
 *   - `showInApp`     off = not in the apps (iOS, Android, web app)
 * A missing switch counts as on.
 *
 * The apps keep a copy of these rules (iOS PartnerService.swift, Android
 * PartnerRepository.kt); keep them in step.
 */
import { FEATURED_GROUP, matrixGroupOf } from "./partnerMatrix";

export var SPONSOR_DESCRIPTION_MAX = 600;

export function isSponsor(partner) {
  return !!partner && matrixGroupOf(partner) === FEATURED_GROUP.key;
}

export function onWebsite(partner) {
  return !!partner && partner.active !== false && partner.showOnWebsite !== false;
}

export function inApp(partner) {
  return !!partner && partner.active !== false && partner.showInApp !== false;
}

/** GROQ filter for partners the website shows (`active` must be set, as before). */
export var WEBSITE_PARTNER_FILTER = 'active == true && showOnWebsite != false';

/** Display order (admin "Display order"), then name. */
export function bySponsorOrder(a, b) {
  var ao = typeof a.order === "number" ? a.order : 9999;
  var bo = typeof b.order === "number" ? b.order : 9999;
  return ao - bo || String(a.name || "").localeCompare(String(b.name || ""));
}
