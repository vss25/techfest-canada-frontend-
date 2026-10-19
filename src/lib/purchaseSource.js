import { getConsent, CONSENT_EVENT } from "./trackers.js";

/* =========================================================
   Where a buyer came from, sent with the checkout (Oct 2026)
   ---------------------------------------------------------
   The organisers get a "New ticket" email for every purchase
   (backend services/purchaseAlert.js) that says how the buyer
   found us. On the first page of a visit we note:
     • utm_source / medium / campaign / content / term;
     • an ad click, as a label only ("Google ad"…), never the
       click ID itself;
     • the website they came from (its host only; our own site,
       Stripe and the backend don't count);
     • the page they landed on (no query string) and the time.
   "This visit" is kept in sessionStorage. A "first visit" copy is
   kept in localStorage only after "Accept All" in the cookie
   banner, and removed on "Essential only". Nothing leaves the
   browser until the buyer starts a checkout: the two lines then
   ride along in the checkout's metadata (src_visit, src_first).
   No third-party script, no new service.

   Pure parts (landingFrom, describe, sourceFields) are tested in
   purchaseSource.test.mjs: node --test src/lib/purchaseSource.test.mjs
========================================================= */

export const VISIT_KEY = "ttfc_src_visit";
export const FIRST_KEY = "ttfc_src_first";
export const SAME_AS_VISIT = "same as this visit";

const UTM_KEYS = ["source", "medium", "campaign", "content", "term"];
// Ad click IDs → who ran the ad. Only the label is kept.
export const AD_CLICKS = [
  ["fbclid", "Facebook/Instagram ad"],
  ["gclid", "Google ad"], ["gbraid", "Google ad"], ["wbraid", "Google ad"],
  ["li_fat_id", "LinkedIn ad"],
  ["ttclid", "TikTok ad"],
  ["msclkid", "Microsoft ad"],
];
// Our website (and its previews): a page of ours, not where someone came from.
const OUR_SITE = [/(^|\.)thetechfestival\.com$/, /^techfest-canada-frontend[a-z0-9-]*\.vercel\.app$/, /^localhost$/, /^127\.0\.0\.1$/];
// Round trips that come back to us (paying, signing in through the backend): ignored.
const ROUND_TRIPS = [/(^|\.)stripe\.com$/, /^techfest-(canada-backend|api)[a-z0-9-]*\.onrender\.com$/];

/** One short line: control and text-direction characters out, spaces collapsed, at most `max` characters. */
const clean = (v, max) => String(v ?? "")
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u001f\u007f-\u009f\u200b\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]+/g, " ")
  .replace(/\s+/g, " ").trim().slice(0, max).trim();

const bareHost = (h) => String(h || "").toLowerCase().replace(/^www\./, "");

/**
 * What one page load tells us about where the visitor came from, or null.
 * { v: 1, at, path, utm?: {source, medium, campaign, content, term}, ad?, ref?, own?, app? }
 *   ref = another website's host; own = another tab of our site; app = the TTFC web app (/app, or ?from=app).
 */
export function landingFrom({ href, referrer = "", now = new Date() } = {}) {
  let url;
  try { url = new URL(href); } catch { return null; }
  const q = url.searchParams;
  const utm = {};
  for (const k of UTM_KEYS) {
    const v = clean(q.get(`utm_${k}`), 60);
    if (v) utm[k] = v;
  }
  const ad = (AD_CLICKS.find(([p]) => q.get(p)) || [])[1] || "";
  const rec = { v: 1, at: new Date(now).toISOString(), path: clean(url.pathname, 100) || "/" };
  if (Object.keys(utm).length) rec.utm = utm;
  if (ad) rec.ad = ad;
  if (q.get("from") === "app") rec.app = true;
  if (referrer) {
    try {
      const r = new URL(referrer);
      const host = bareHost(r.hostname);
      if (host === bareHost(url.hostname) || OUR_SITE.some((re) => re.test(host))) {
        if (r.pathname === "/app" || r.pathname.startsWith("/app/")) rec.app = true;
        else if (!rec.app) rec.own = true;
      } else if (host && !ROUND_TRIPS.some((re) => re.test(host))) {
        rec.ref = clean(host, 80);
      }
    } catch { /* not a URL: nothing to say */ }
  }
  return rec;
}

const torontoTime = (iso) => {
  try {
    return `${new Date(iso).toLocaleString("en-CA", { timeZone: "America/Toronto", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} Toronto time`;
  } catch {
    return String(iso || "");
  }
};

/** A record as one line for the team, e.g. "utm: linkedin / social / oct-launch · landed /tickets · referrer linkedin.com · Oct 19, 2:14 p.m. Toronto time". */
export function describe(rec) {
  if (!rec || typeof rec !== "object") return "";
  const parts = [];
  if (rec.ad) parts.push(clean(rec.ad, 40));
  const u = rec.utm || {};
  if (UTM_KEYS.some((k) => u[k])) {
    const main = ["source", "medium", "campaign"].map((k) => clean(u[k], 60) || "-").join(" / ");
    const extra = [u.content ? `content ${clean(u.content, 60)}` : "", u.term ? `term ${clean(u.term, 60)}` : ""].filter(Boolean);
    parts.push(`utm: ${main}${extra.length ? ` (${extra.join(", ")})` : ""}`);
  }
  parts.push(`landed ${clean(rec.path, 100) || "/"}`);
  if (rec.app) parts.push("from the TTFC web app");
  else if (rec.ref) parts.push(`referrer ${clean(rec.ref, 80)}`);
  else if (rec.own) parts.push("from another tab of our website");
  else if (!rec.ad && !parts[0].startsWith("utm:")) parts.push("direct (no referrer)");
  if (rec.at) parts.push(torontoTime(rec.at));
  return parts.join(" · ").slice(0, 500);
}

/** True when two records are the same landing. */
const same = (a, b) => !!a && !!b && a.at === b.at && a.path === b.path;

/** The checkout's metadata fields from the two records: { src_visit?, src_first? }. */
export function sourceFields(visit, first) {
  const out = {};
  if (visit) out.src_visit = describe(visit);
  if (first) out.src_first = same(first, visit) ? SAME_AS_VISIT : describe(first);
  return out;
}

/* ---------- the browser part ---------- */

const store = (kind) => { try { return window[kind]; } catch { return null; } };
function read(s, key) {
  try {
    const r = JSON.parse(s?.getItem(key) || "null");
    return r && typeof r === "object" && r.v === 1 ? r : null;
  } catch { return null; }
}
function write(s, key, value) { try { s?.setItem(key, JSON.stringify(value)); } catch { /* storage blocked */ } }
function remove(s, key) { try { s?.removeItem(key); } catch { /* storage blocked */ } }

let memory = null;      // this page load's record, for when storage is blocked
let listening = false;

/** Keeps the "first visit" copy in step with the cookie choice: kept with "Accept All", removed with "Essential only". */
export function syncFirstVisit() {
  try {
    const consent = getConsent();
    const local = store("localStorage");
    if (consent === "all") {
      if (!read(local, FIRST_KEY)) {
        const visit = read(store("sessionStorage"), VISIT_KEY) || memory;
        if (visit) write(local, FIRST_KEY, visit);
      }
    } else if (consent === "essential") {
      remove(local, FIRST_KEY);
    }
  } catch { /* never in the way */ }
}

/**
 * Once per page load (src/main.jsx). The first landing of a visit is kept; a later page load replaces it
 * only when it carries a new campaign (utm or an ad click), so a sign-in or payment round trip never does.
 */
export function captureLanding() {
  try {
    const rec = landingFrom({ href: window.location.href, referrer: document.referrer });
    if (!rec) return;
    const session = store("sessionStorage");
    const had = read(session, VISIT_KEY) || memory;
    const campaign = (r) => JSON.stringify([r?.utm || null, r?.ad || ""]);
    if (!had || ((rec.utm || rec.ad) && campaign(rec) !== campaign(had))) {
      memory = rec;
      write(session, VISIT_KEY, rec);
    } else {
      memory = had;
    }
    syncFirstVisit();
    if (!listening) {
      listening = true;
      window.addEventListener(CONSENT_EVENT, syncFirstVisit);
    }
  } catch { /* never in the way */ }
}

/** For the checkout request's metadata: { src_visit?, src_first? } (first visit only with "Accept All"). */
export function checkoutSource() {
  try {
    syncFirstVisit();
    const visit = read(store("sessionStorage"), VISIT_KEY) || memory;
    const first = getConsent() === "all" ? read(store("localStorage"), FIRST_KEY) : null;
    return sourceFields(visit, first);
  } catch {
    return {};
  }
}
