// Where a buyer came from (purchaseSource.js): what a landing records and the line the team reads.
// Run: node --test src/lib/purchaseSource.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { landingFrom, describe, sourceFields, SAME_AS_VISIT } from "./purchaseSource.js";

const AT = new Date("2026-10-19T18:14:00Z");   // 2:14 p.m. in Toronto
const SITE = "https://www.thetechfestival.com";
const line = (href, referrer = "") => describe(landingFrom({ href: SITE + href, referrer, now: AT }));

test("a LinkedIn campaign link", () => {
  assert.equal(
    line("/tickets?utm_source=linkedin&utm_medium=social&utm_campaign=oct-launch", "https://www.linkedin.com/"),
    "utm: linkedin / social / oct-launch · landed /tickets · referrer linkedin.com · Oct 19, 2:14 p.m. Toronto time",
  );
  assert.equal(
    line("/?utm_source=newsletter&utm_campaign=oct&utm_content=hero&utm_term=ai%20summit"),
    "utm: newsletter / - / oct (content hero, term ai summit) · landed / · Oct 19, 2:14 p.m. Toronto time",
  );
});

test("a Google search, a direct visit, another tab of our site, the web app", () => {
  assert.equal(line("/", "https://www.google.com/"), "landed / · referrer google.com · Oct 19, 2:14 p.m. Toronto time");
  assert.equal(line("/tickets"), "landed /tickets · direct (no referrer) · Oct 19, 2:14 p.m. Toronto time");
  assert.equal(line("/tickets/checkout?tier=power", "https://www.thetechfestival.com/speakers"),
    "landed /tickets/checkout · from another tab of our website · Oct 19, 2:14 p.m. Toronto time");
  assert.equal(line("/tickets/checkout?tier=power&from=app"), "landed /tickets/checkout · from the TTFC web app · Oct 19, 2:14 p.m. Toronto time");
  assert.equal(line("/tickets/checkout?tier=power", "https://thetechfestival.com/app/"), "landed /tickets/checkout · from the TTFC web app · Oct 19, 2:14 p.m. Toronto time");
});

test("ad clicks become a label; the click ID itself is never kept", () => {
  const cases = [
    ["fbclid", "Facebook/Instagram ad"], ["gclid", "Google ad"], ["gbraid", "Google ad"], ["wbraid", "Google ad"],
    ["li_fat_id", "LinkedIn ad"], ["ttclid", "TikTok ad"], ["msclkid", "Microsoft ad"],
  ];
  for (const [param, label] of cases) {
    const rec = landingFrom({ href: `${SITE}/tickets?${param}=SECRET_CLICK_ID_123`, now: AT });
    assert.equal(rec.ad, label);
    assert.doesNotMatch(JSON.stringify(rec) + describe(rec), /SECRET_CLICK_ID_123/);
    assert.equal(describe(rec), `${label} · landed /tickets · Oct 19, 2:14 p.m. Toronto time`);
  }
  assert.equal(line("/tickets?fbclid=x&utm_source=facebook&utm_medium=paid", "https://l.facebook.com/"),
    "Facebook/Instagram ad · utm: facebook / paid / - · landed /tickets · referrer l.facebook.com · Oct 19, 2:14 p.m. Toronto time");
});

test("only the path is kept: no promo codes, emails or tokens from the query string; no referrer paths", () => {
  const rec = landingFrom({ href: `${SITE}/tickets/checkout?tier=apex&promo=SECRET50&email=jane@example.com&token=abc`, referrer: "https://www.google.com/search?q=jane+doe", now: AT });
  const all = JSON.stringify(rec) + describe(rec);
  assert.doesNotMatch(all, /SECRET50|jane|token|abc|search/);
  assert.equal(rec.path, "/tickets/checkout");
  assert.equal(rec.ref, "google.com");
});

test("Stripe and the backend are round trips, not sources; our previews and localhost are our own site", () => {
  assert.equal(line("/tickets?success=true", "https://checkout.stripe.com/"), "landed /tickets · direct (no referrer) · Oct 19, 2:14 p.m. Toronto time");
  assert.equal(landingFrom({ href: `${SITE}/`, referrer: "https://techfest-canada-backend.onrender.com/api/auth/linkedin/callback" }).ref, undefined);
  assert.equal(landingFrom({ href: "http://localhost:5173/", referrer: "http://localhost:5173/speakers" }).own, true);
  assert.equal(landingFrom({ href: `${SITE}/`, referrer: "https://techfest-canada-frontend.vercel.app/x" }).own, true);
});

test("untrusted values are cleaned and capped; the line is at most 500 characters", () => {
  const rec = landingFrom({ href: `${SITE}/?utm_source=${encodeURIComponent("a\u0000b\u202ec\n" + "x".repeat(300))}`, now: AT });
  assert.doesNotMatch(rec.utm.source, /[\u0000\u202e\n]/);
  assert.equal(rec.utm.source.length, 60);
  const long = describe({ v: 1, at: AT.toISOString(), path: "/" + "p".repeat(600), utm: { source: "s".repeat(600), medium: "m".repeat(600), campaign: "c".repeat(600), content: "t".repeat(600), term: "u".repeat(600) }, ref: "r".repeat(600), ad: "Google ad" });
  assert.ok(long.length <= 500);
  assert.equal(landingFrom({ href: "not a url" }), null);
  assert.equal(describe(null), "");
});

test("the checkout's two fields: this visit, and the first visit or \"same as this visit\"", () => {
  const visit = landingFrom({ href: `${SITE}/tickets?utm_source=linkedin`, now: AT });
  const first = landingFrom({ href: `${SITE}/`, referrer: "https://www.google.com/", now: new Date("2026-10-02T13:05:00Z") });
  assert.deepEqual(sourceFields(visit, first), {
    src_visit: "utm: linkedin / - / - · landed /tickets · Oct 19, 2:14 p.m. Toronto time",
    src_first: "landed / · referrer google.com · Oct 2, 9:05 a.m. Toronto time",
  });
  assert.deepEqual(sourceFields(visit, { ...visit }), { src_visit: describe(visit), src_first: SAME_AS_VISIT });
  assert.deepEqual(sourceFields(visit, null), { src_visit: describe(visit) });
  assert.deepEqual(sourceFields(null, null), {});
  for (const v of Object.values(sourceFields(visit, first))) assert.ok(v.length <= 500);
});

/* ---------- in the browser: storage and the cookie choice (a stand-in window, fresh module each time) ---------- */

let fresh = 0;
const load = () => import(`./purchaseSource.js?case=${++fresh}`);
const memoryStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); }, map: m };
};
function browser({ href, referrer = "", consent = null, local = memoryStorage(), session = memoryStorage(), blocked = false }) {
  const listeners = {};
  const win = {
    location: { href },
    addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn); },
    dispatchEvent: (e) => { for (const fn of listeners[e.type] || []) fn(e); return true; },
  };
  for (const [name, s] of [["localStorage", local], ["sessionStorage", session]]) {
    Object.defineProperty(win, name, { get() { if (blocked) throw new Error("SecurityError: storage is blocked"); return s; } });
  }
  if (consent && !blocked) local.setItem("tfc_cookie_consent", consent);
  globalThis.window = win;
  globalThis.document = { referrer };
  return { win, local, session };
}
const { setConsent } = await import("./trackers.js");

test("\"Essential only\": this visit in sessionStorage, nothing in localStorage, only src_visit is sent", async () => {
  const b = browser({ href: `${SITE}/tickets?utm_source=linkedin&utm_medium=social&utm_campaign=oct-launch`, referrer: "https://www.linkedin.com/", consent: "essential" });
  const m = await load();
  m.captureLanding();
  assert.ok(b.session.getItem(m.VISIT_KEY));
  assert.equal(b.local.getItem(m.FIRST_KEY), null);
  const out = m.checkoutSource();
  assert.deepEqual(Object.keys(out), ["src_visit"]);
  assert.match(out.src_visit, /^utm: linkedin \/ social \/ oct-launch · landed \/tickets · referrer linkedin\.com · /);
});

test("\"Accept All\" keeps the first visit in localStorage; a later visit sends both; \"Essential only\" removes it", async () => {
  // Visit 1: no choice yet, then Accept All in the banner.
  const local = memoryStorage();
  let b = browser({ href: `${SITE}/`, referrer: "https://www.google.com/", local });
  let m = await load();
  m.captureLanding();
  assert.equal(local.getItem(m.FIRST_KEY), null, "nothing before a choice");
  setConsent("all");
  assert.ok(local.getItem(m.FIRST_KEY), "kept after Accept All");
  assert.deepEqual(m.checkoutSource().src_first, m.SAME_AS_VISIT);

  // Visit 2 (a new tab session, same browser): a LinkedIn ad.
  b = browser({ href: `${SITE}/tickets?li_fat_id=abc123`, referrer: "https://www.linkedin.com/", local });
  m = await load();
  m.captureLanding();
  const out = m.checkoutSource();
  assert.match(out.src_visit, /^LinkedIn ad · landed \/tickets · referrer linkedin\.com · /);
  assert.match(out.src_first, /^landed \/ · referrer google\.com · /);
  assert.doesNotMatch(JSON.stringify([...local.map.values(), ...b.session.map.values()]), /abc123/);

  // Cookie settings → Essential only: the first-visit copy goes.
  setConsent("essential");
  assert.equal(local.getItem(m.FIRST_KEY), null);
  assert.deepEqual(Object.keys(m.checkoutSource()), ["src_visit"]);
});

test("a later page load in the same visit keeps the landing unless it brings a new campaign", async () => {
  const session = memoryStorage();
  browser({ href: `${SITE}/speakers`, referrer: "https://www.google.com/", session });
  let m = await load();
  m.captureLanding();
  // Back from signing in with LinkedIn, or from Stripe: the landing stays.
  browser({ href: `${SITE}/tickets`, referrer: "https://www.linkedin.com/", session });
  m = await load();
  m.captureLanding();
  assert.match(m.checkoutSource().src_visit, /^landed \/speakers · referrer google\.com/);
  // A new campaign link: that's where this visit came from now.
  browser({ href: `${SITE}/tickets?utm_source=newsletter&utm_medium=email`, session });
  m = await load();
  m.captureLanding();
  assert.match(m.checkoutSource().src_visit, /^utm: newsletter \/ email \/ - · landed \/tickets/);
});

test("storage blocked: nothing throws, and this page load's landing is still sent", async () => {
  browser({ href: `${SITE}/tickets?gclid=zzz`, blocked: true });
  const m = await load();
  assert.doesNotThrow(() => m.captureLanding());
  assert.doesNotThrow(() => m.syncFirstVisit());
  const out = m.checkoutSource();
  assert.deepEqual(Object.keys(out), ["src_visit"]);
  assert.match(out.src_visit, /^Google ad · landed \/tickets · Oct /);
});
