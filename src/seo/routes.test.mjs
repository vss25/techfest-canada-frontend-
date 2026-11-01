/* node --test src/seo/routes.test.mjs: the site's addresses for search engines (src/seo/routes.js, Oct 31 2026). One
   trimmed slug rule; canonicals on www, lowercase, no trailing slash, query or fragment; every page's title and
   description fit (60 / 160) and say nothing invented; every route in App.jsx is a page, a noindex page, an old address
   that redirects, a speaker or winner, or one of the two left out on purpose (the catch-all and the unlisted page). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { matchRoutes } from "react-router";
import { normalizeSpeakerSlug, speakerSlug } from "./slug.js";
import { slugifyName } from "../data/agenda.js";
import {
  DEFAULT_IMAGE, DESCRIPTION_MAX, DYNAMIC_ROUTES, INDEX_ROBOTS, NOINDEX_ROBOTS, NOINDEX_ROUTES, PAGES, REDIRECTS, SITE,
  SITE_LINKS, TITLE_MAX, breadcrumbsFor, canonicalUrl, cleanPath, clip, isNoindexPath, matchRoute, pageMeta, sanityImage,
  seoForPath, speakerMeta, winnerMeta,
} from "./routes.js";

const ROOT = new URL("../../", import.meta.url);
const read = (rel) => readFileSync(new URL(rel, ROOT), "utf8");
const APP = read("src/App.jsx");

/** App.jsx's routes: { path } (a constant's name for path={X}). */
const appRoutes = () => [...APP.matchAll(/<Route\s+path=(?:"([^"]+)"|\{(\w+)\})/g)].map((m) => ({ path: m[1] ?? `{${m[2]}}` }));
/** Left out on purpose: "Page not found" for any other address, and the unlisted page (its own constant, never named). */
const IGNORED = ["*", "{FACT_SHEET_PATH}"];
const sample = (pattern) => pattern.replace(/:\w+/g, "x").replace(/\*$/, "x");
const opens = (url) => matchRoutes(appRoutes().filter((r) => !r.path.startsWith("{")), url)?.at(-1)?.route.path ?? null;

test("speaker slugs: one trimmed rule everywhere; older addresses that end in '-' still match", () => {
  for (const [name, slug] of [
    ["Amy Flood", "amy-flood"], ["Dr. Noelle Ibrahim ", "dr-noelle-ibrahim"], ["Hon. Nina Tangri ", "hon-nina-tangri"],
    [" Vance Lockton", "vance-lockton"], ["Kulbir \"Colin\" Singh Dhillon", "kulbir-colin-singh-dhillon"],
    ["Heling (Alex) Pu", "heling-alex-pu"], ["Na'im Merchant", "naim-merchant"],
    // Accents are dropped as before (changing it would break addresses already shared).
    ["Alán Aspuru-Guzik", "aln-aspuru-guzik"], ["Geneviève DeCambra", "genevive-decambra"], ["", ""], [null, ""],
  ]) {
    assert.equal(speakerSlug(name), slug, String(name));
    assert.equal(slugifyName(name), slug, `agenda.js slugifyName(${name})`);
  }
  for (const [param, slug] of [["laila-burns-", "laila-burns"], ["-vance-lockton", "vance-lockton"], ["Amy-Flood", "amy-flood"], ["amy-flood", "amy-flood"]]) {
    assert.equal(normalizeSpeakerSlug(param), slug, param);
  }
  // No page builds the slug its own way any more.
  for (const f of ["src/pages/Speakers.jsx", "src/pages/Speakerprofile.jsx"]) {
    assert.doesNotMatch(read(f), /\.toLowerCase\(\)\.replace\(\/\\s\+\/g, "-"\)/, f);
  }
});

test("canonical URLs: www, https, lowercase, no trailing slash, query or fragment", () => {
  assert.equal(SITE, "https://www.thetechfestival.com");
  for (const [path, url] of [
    ["/", `${SITE}/`], ["", `${SITE}/`], ["/Awards/", `${SITE}/awards`], ["/awards?nominate=1#top", `${SITE}/awards`],
    ["/awards/winners/6AD000B5745957478367E34B?embed=1", `${SITE}/awards/winners/6ad000b5745957478367e34b`],
    ["//speakers//amy-flood/", `${SITE}/speakers/amy-flood`], ["exhibit/india-pavilion", `${SITE}/exhibit/india-pavilion`],
  ]) assert.equal(canonicalUrl(path), url, path);
  assert.equal(cleanPath("/STAY-UPDATED/#join"), "/stay-updated");
});

test("every page: a title of 60 characters at most, a description of 160 at most, one H1, an intro, nothing invented", () => {
  const titles = new Set();
  for (const p of PAGES) {
    assert.equal(p.path, cleanPath(p.path), `${p.path} is clean`);
    assert.ok(p.title.length <= TITLE_MAX, `${p.path} title: ${p.title.length}`);
    assert.ok(p.description.length >= 70 && p.description.length <= DESCRIPTION_MAX, `${p.path} description: ${p.description.length}`);
    assert.ok(p.h1 && p.intro && p.name, p.path);
    assert.ok(!titles.has(p.title), `${p.path}: a title of its own`);
    titles.add(p.title);
    const text = [p.title, p.description, p.h1, p.intro].join(" ");
    // No 2027 dates or venue beyond what the site says (Toronto, November 2027), no attendee numbers, no info@.
    assert.doesNotMatch(text, /\b(?:January|February|March|April|May|June|July|August|September|October|December)\s+\d{1,2},?\s+2027|\d{1,2}\s*[–-]\s*\d{1,2}\s+\w+\s+2027/, p.path);
    assert.doesNotMatch(text, /\battendees\b|info@/i, p.path);
    if (/2027/.test(text)) assert.doesNotMatch(text, /Westin/, `${p.path}: no 2027 venue`);
    for (const [href] of p.links) assert.ok(/^(\/|mailto:enquire@thetechfestival\.com$|https:\/\/www\.atlaslinkmarkets\.com\/$)/.test(href), `${p.path} links ${href}`);
  }
  // Duplicates point at a page that is its own canonical.
  for (const p of PAGES.filter((x) => x.canonical)) {
    const main = PAGES.find((x) => x.path === p.canonical);
    assert.ok(main && !main.canonical, `${p.path} → ${p.canonical}`);
    assert.equal(pageMeta(p).sitemap, false);
  }
  assert.deepEqual(PAGES.filter((p) => p.canonical).map((p) => [p.path, p.canonical]), [["/sponsors", "/partners2026"], ["/about", "/"]]);
  for (const [href] of SITE_LINKS) assert.ok(PAGES.some((p) => p.path === href && !p.canonical), href);
});

test("every route in App.jsx: a page, a noindex page, an old address, a speaker or winner, or left out on purpose", () => {
  const routes = appRoutes();
  assert.ok(routes.length > 40, "found App.jsx's routes");
  const known = new Set([...PAGES.map((p) => p.path), ...NOINDEX_ROUTES, ...Object.keys(REDIRECTS), ...DYNAMIC_ROUTES, ...IGNORED]);
  for (const { path } of routes) assert.ok(known.has(path), `App.jsx route ${path} isn't in src/seo/routes.js`);
  for (const p of IGNORED) assert.ok(routes.some((r) => r.path === p), `${p} is still a route`);
  // …and nothing listed is gone from the router.
  for (const p of [...PAGES.map((x) => x.path), ...NOINDEX_ROUTES, ...Object.keys(REDIRECTS), ...DYNAMIC_ROUTES]) {
    const r = opens(sample(p));
    assert.ok(r && r !== "*", `${p} doesn't open a route in App.jsx (${r})`);
  }
  for (const [from, to] of Object.entries(REDIRECTS)) {
    assert.ok(PAGES.some((p) => p.path === to), `${from} → ${to}`);
    assert.ok(!PAGES.some((p) => p.path === from), from);
  }
  // Pages are never noindex.
  for (const p of PAGES) assert.equal(isNoindexPath(p.path), false, p.path);
});

test("noindex routes: their own addresses only (/exhibit/india-pavilion stays indexable, /admin and below are noindex)", () => {
  for (const url of ["/admin", "/admin/", "/admin/people/x", "/Admin-Login", "/reset-password/abc", "/tickets/checkout", "/exhibit/india-pavilion/pay", "/survey", "/swag", "/linkedin", "/awards/jury-admin", "/awards/jury-admin/x", "/share/linkedin"]) {
    assert.equal(isNoindexPath(url), true, url);
  }
  for (const url of ["/", "/exhibit/india-pavilion", "/tickets", "/awards", "/administer", "/reset-password", "/surveys", "/share"]) {
    assert.equal(isNoindexPath(url), false, url);
  }
  assert.equal(matchRoute("/admin/*", "/admin"), true);
  assert.equal(matchRoute("/admin/*", "/administer"), false);
  assert.equal(matchRoute("/admin/*", "/admin/x"), true);
});

test("breadcrumbs: Home › parent › page; JSON-LD only on nested pages", () => {
  assert.deepEqual(breadcrumbsFor("/exhibit/india-pavilion").map((c) => c.name), ["Home", "Exhibit", "India Startup Pavilion"]);
  assert.deepEqual(breadcrumbsFor("/speakers/amy-flood", "Amy Flood").map((c) => [c.path, c.name]), [["/", "Home"], ["/speakers", "Speakers"], ["/speakers/amy-flood", "Amy Flood"]]);
  assert.deepEqual(breadcrumbsFor("/awards/winners/x", "Rootly").map((c) => c.name), ["Home", "Catalyst Awards", "Rootly"]);
  assert.equal(pageMeta(PAGES.find((p) => p.path === "/awards")).jsonLd, null);
  const ld = pageMeta(PAGES.find((p) => p.path === "/exhibit/india-pavilion")).jsonLd;
  assert.equal(ld["@graph"][0]["@type"], "BreadcrumbList");
  assert.deepEqual(ld["@graph"][0].itemListElement.map((i) => i.item), [`${SITE}/`, `${SITE}/exhibit`, `${SITE}/exhibit/india-pavilion`]);
});

const SPEAKER = {
  _id: "x", name: "Laila Burns ", title: "CRO & Co-Founder ", company: "Sielo Robotics ",
  bio: "Laila Burns is the co-founder of Sielo Robotics.\nShe leads revenue. ".repeat(6),
  linkedin: "https://www.linkedin.com/in/example/",
  image: { _type: "image", asset: { _ref: "image-c23fe3b776dafcb1db5e6679b80be5b24e1458ad-464x537-png" } },
};

test("speakerMeta: trimmed name and slug, title and description fit, the photo's original file, Person + breadcrumb JSON-LD", () => {
  const m = speakerMeta(SPEAKER);
  assert.equal(m.path, "/speakers/laila-burns");
  assert.equal(m.canonical, `${SITE}/speakers/laila-burns`);
  assert.equal(m.title, "Laila Burns, Sielo Robotics | TTFC 2026 Speaker");
  assert.ok(m.description.length <= DESCRIPTION_MAX && m.description.startsWith("Laila Burns is the co-founder"), m.description);
  assert.equal(m.h1, "Laila Burns");
  assert.deepEqual(m.image, { url: "https://cdn.sanity.io/images/021qtoci/production/c23fe3b776dafcb1db5e6679b80be5b24e1458ad-464x537.png", width: 464, height: 537, alt: "Laila Burns" });
  const [crumbs, person] = m.jsonLd["@graph"];
  assert.equal(crumbs["@type"], "BreadcrumbList");
  assert.deepEqual([person["@type"], person.name, person.jobTitle, person.worksFor.name, person.url, person.sameAs[0]],
    ["Person", "Laila Burns", "CRO & Co-Founder", "Sielo Robotics", `${SITE}/speakers/laila-burns`, "https://www.linkedin.com/in/example/"]);
  // A long name and company: the shorter title; no photo or bio: the share card and a plain line.
  const long = speakerMeta({ name: "Hon. Nina Tangri ", title: "Associate Minister of Small Business", company: " Progressive Conservative Party of Ontario" });
  assert.equal(long.title, "Hon. Nina Tangri | TTFC 2026 Speaker");
  assert.equal(long.image, DEFAULT_IMAGE);
  assert.match(long.description, /^Hon\. Nina Tangri, Associate Minister of Small Business, Progressive Conservative Party of Ontario: a speaker at/);
  assert.equal(speakerMeta({ name: "A", linkedin: "javascript:alert(1)" }).jsonLd["@graph"][1].sameAs, undefined);
  assert.equal(sanityImage({ asset: { _ref: "file-abc-pdf" } }), null);
});

const WINNERS = [
  { id: "6ad000b5745957478367e34b", award: "The Catalyst Award for Artificial Intelligence in Banking, Financial Services & Insurance", company: "Transient", presentedTo: "Transient", showCompany: false, presentedOn: "2026-10-26", citation: "", pillar: "Artificial Intelligence" },
  { id: "6ad000b9745957478367e398", award: "The Catalyst Award for Artificial Intelligence in Healthcare & Life Sciences", company: "Sielo Robotics", presentedTo: "Laila Burns", showCompany: true, presentedOn: "2026-10-26", citation: "", pillar: "Artificial Intelligence" },
  { id: "6ad000b8745957478367e395", award: "The Catalyst Award for Robotics in Healthcare & Life Sciences", company: "Sielo Robotics", presentedTo: "Laila Burns", showCompany: true, presentedOn: "2026-10-26", citation: "", pillar: "Robotics" },
  { id: "6ad12bb1745957478368923d", award: "The Catalyst Award for Robotics in Manufacturing, Supply Chain & Infrastructure", company: "AXIMETRIX AUTOMATION Inc", presentedTo: "STRIX Sustainable, Environmental Mechatronic R&D center.", showCompany: true, presentedOn: "2026-10-26", citation: "", pillar: "Robotics" },
  { id: "6AD000AB745957478367E30D", award: "The Catalyst Award for Quantum Computing in Defence, National Security & Public Safety", company: "Paraxiom Technologies Inc.", presentedTo: "Paraxiom Technologies Inc.", showCompany: false, presentedOn: "2026-10-26", citation: "For the work.", pillar: "Quantum Computing" },
  { id: "6ad000af745957478367e321", award: "The Catalyst Cross-Border Impact Award", company: "Rootly", presentedTo: "Rootly", showCompany: false, presentedOn: "2026-10-26", citation: "", pillar: "" },
];

test("winnerMeta: every title and description fits, one person's two awards get two titles, the canonical has no query", () => {
  const all = WINNERS.map(winnerMeta);
  for (const m of all) {
    assert.ok(m.title.length <= TITLE_MAX, m.title);
    assert.ok(m.description.length <= DESCRIPTION_MAX, m.description);
    assert.equal(m.canonical, `${SITE}/awards/winners/${m.id}`);
    assert.equal(m.jsonLd["@graph"][0]["@type"], "BreadcrumbList");
    assert.equal(m.image, DEFAULT_IMAGE);
  }
  assert.equal(new Set(all.map((m) => m.title)).size, all.length, "no two winner pages share a title");
  assert.equal(all[0].title, "Transient | Artificial Intelligence, Catalyst Awards 2026");
  assert.equal(all[0].description, "Transient received The Catalyst Award for Artificial Intelligence in Banking, Financial Services & Insurance at The Tech Festival Canada 2026 in Toronto.");
  assert.match(all[1].description, /^Laila Burns \(Sielo Robotics\) received/);
  assert.equal(all[4].id, "6ad000ab745957478367e30d");
  assert.match(all[4].title, /^Paraxiom Technologies Inc\. \|/, "Inc. keeps its full stop");
  assert.match(all[4].intro, /presented to Paraxiom Technologies Inc\. on 26 October 2026 at The Tech Festival Canada 2026, The Westin Harbour Castle, Toronto\. “For the work\.”$/);
  assert.equal(all[5].title, "Rootly | Catalyst Awards 2026 Winner");
  assert.equal(all[3].h1, "STRIX Sustainable, Environmental Mechatronic R&D center.");
});

test("seoForPath (the browser's per-route head): pages, old addresses, speakers, winners, noindex and unknown addresses", () => {
  const awards = seoForPath("/Awards/");
  assert.deepEqual([awards.title, awards.canonical, awards.robots], [PAGES.find((p) => p.path === "/awards").title, `${SITE}/awards`, INDEX_ROBOTS]);
  assert.equal(seoForPath("/awards/nominations").canonical, `${SITE}/awards`);
  assert.equal(seoForPath("/on-demand").canonical, `${SITE}/resources`);
  assert.equal(seoForPath("/sponsors").canonical, `${SITE}/partners2026`);
  assert.equal(seoForPath("/about").canonical, `${SITE}/`);
  assert.equal(seoForPath("/").canonical, `${SITE}/`);
  assert.equal(seoForPath("/speakers/Laila-Burns-").canonical, `${SITE}/speakers/laila-burns`);
  assert.equal(seoForPath("/awards/winners/6AD000B5745957478367E34B").canonical, `${SITE}/awards/winners/6ad000b5745957478367e34b`);
  assert.equal(seoForPath("/awards/winners/nope"), null);
  for (const url of ["/admin/people", "/survey", "/rsvp", "/tickets/checkout"]) {
    const s = seoForPath(url);
    assert.deepEqual([s.canonical, s.robots, s.title], [null, NOINDEX_ROBOTS, undefined], url);
  }
  assert.equal(seoForPath("/no-such-page"), null);
  assert.equal(clip("one two three four", 10), "one two…");
});

test("unlisted pages stay unnamed: no fact sheet or check-in address in the SEO files", () => {
  for (const f of ["src/seo/routes.js", "src/seo/slug.js", "src/seo/prerender.mjs", "src/seo/RouteSeo.jsx", "public/robots.txt"]) {
    assert.doesNotMatch(read(f), /fact-?sheet\/|check-?in/i, f);
  }
});
