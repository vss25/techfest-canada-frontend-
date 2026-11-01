/* node --test src/seo/prerender.test.mjs: the build's prerender (src/seo/prerender.mjs, Oct 31 2026). Each page's
   copy of index.html has its own title, description, canonical, share tags, robots and JSON-LD (the Event only on /),
   one H1 in a <noscript> outline, and everything else of index.html untouched; spa.html is the plain site; the
   sitemap lists only indexable www addresses. After a build (dist/), the same checks on every file it wrote. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { outline, prerenderSite, renderPage, sitePages, sitemapXml, spaShell } from "./prerender.mjs";
import { DESCRIPTION_MAX, PAGES, SITE, TITLE_MAX, isNoindexPath } from "./routes.js";

const ROOT = new URL("../../", import.meta.url);
const SHELL = readFileSync(new URL("index.html", ROOT), "utf8");
const DIST = new URL("dist/", ROOT);
const BUILT = existsSync(new URL("dist/spa.html", ROOT));

const SPEAKERS = [
  { _id: "a", _updatedAt: "2026-10-20T10:00:00Z", name: "Laila Burns ", title: "CRO & Co-Founder", company: "Sielo Robotics", bio: "Laila Burns co-founded Sielo Robotics.", image: { asset: { _ref: "image-c23fe3b776dafcb1db5e6679b80be5b24e1458ad-464x537-png" } } },
  { _id: "b", name: "Amy Flood", title: "Executive Director", company: "Women's Health Collective Canada", bio: "Amy Flood leads <the> collective & more; $& and $' stay text." },
  { _id: "c", name: "Amy  Flood" }, // the same slug: the first one wins
  { _id: "d", name: "  " },          // no name: no page
];
const WINNERS = [
  { id: "6ad000af745957478367e321", award: "The Catalyst Cross-Border Impact Award", company: "Rootly", presentedTo: "Rootly", showCompany: false, presentedOn: "2026-10-26", citation: "" },
  { id: "not-an-id", award: "x", presentedTo: "x" },
];

/** The head's value of a tag, or null. */
const metaOf = (html, attr, key) => html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1] ?? null;
const canonicalOf = (html) => html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? null;
const titleOf = (html) => html.match(/<title>([^<]*)<\/title>/)[1];
const unesc = (s) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const count = (html, re) => (html.match(re) || []).length;
const jsonLds = (html) => [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
/** What must survive in every copy: the scripts (the stale-deploy reload guard first), the stylesheet links, #root. */
const kept = (html) => [...html.matchAll(/<script(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>|<link rel="(?:stylesheet|modulepreload|icon|apple-touch-icon)"[^>]*>/g)].map((m) => m[0]);

test("each page's copy: its own head, the Event only on the home page, one H1, and index.html's scripts untouched", () => {
  const { pages, people, awards } = sitePages({ speakers: SPEAKERS.slice(0, 2), winners: WINNERS.slice(0, 1) });
  for (const p of [...pages, ...people, ...awards]) {
    const html = renderPage(SHELL, p);
    assert.equal(unesc(titleOf(html)), p.title, p.path);
    assert.equal(unesc(metaOf(html, "name", "description")), p.description, p.path);
    assert.equal(canonicalOf(html), p.canonical, p.path);
    assert.equal(count(html, /rel="canonical"/g), 1, p.path);
    assert.equal(metaOf(html, "property", "og:url"), p.canonical, p.path);
    assert.equal(unesc(metaOf(html, "property", "og:title")), p.title, p.path);
    assert.equal(unesc(metaOf(html, "name", "twitter:description")), p.description, p.path);
    assert.equal(metaOf(html, "property", "og:image"), p.image.url, p.path);
    assert.equal(metaOf(html, "name", "twitter:image"), p.image.url, p.path);
    assert.match(html, /<meta name="robots" content="index, follow, max-image-preview:large" data-seo \/>/, p.path);
    assert.equal(count(html, /<h1>/g), 1, `${p.path}: one H1`);
    assert.equal(count(html, /<meta name="description"/g), 1, p.path);
    assert.deepEqual(kept(html), kept(SHELL), `${p.path}: the scripts and links are index.html's`);
    const types = jsonLds(html).map((j) => j["@type"] || j["@graph"].map((g) => g["@type"]).join("+"));
    assert.equal(types.includes("Event"), p.path === "/", `${p.path}: ${types}`);
    assert.ok(types.includes("WebSite") && types.includes("Organization"), p.path);
    assert.ok(html.length < 64 * 1024, `${p.path}: ${html.length} bytes`);
  }
  const speaker = renderPage(SHELL, people.find((s) => s.slug === "laila-burns"));
  assert.ok(jsonLds(speaker).some((j) => j["@graph"]?.some((g) => g["@type"] === "Person" && g.name === "Laila Burns")));
  assert.equal(metaOf(speaker, "property", "og:image:width"), "464");
  assert.match(speaker, /<nav class="tfc-nav" aria-label="Breadcrumb"><a href="\/">Home<\/a> › <a href="\/speakers">Speakers<\/a> › Laila Burns<\/nav><h1>Laila Burns<\/h1>/);
  // The lists: /speakers and /awards link every speaker and winner.
  const list = renderPage(SHELL, pages.find((p) => p.path === "/speakers"));
  assert.match(list, /<li><a href="\/speakers\/amy-flood">Amy Flood<\/a>, Executive Director, Women&#39;s Health Collective Canada<\/li>/);
  assert.match(list, /<a href="\/speakers\/laila-burns">/);
  assert.match(renderPage(SHELL, pages.find((p) => p.path === "/awards")), /<li><a href="\/awards\/winners\/6ad000af745957478367e321">Rootly<\/a>: The Catalyst Cross-Border Impact Award<\/li>/);
  // Text is escaped.
  const amy = renderPage(SHELL, people.find((s) => s.slug === "amy-flood"));
  assert.match(amy, /<meta name="description" content="Amy Flood leads &lt;the&gt; collective &amp; more; \$&amp; and \$&#39; stay text\." \/>/);
  assert.match(amy, /<h1>Amy Flood<\/h1><p>Executive Director, Women&#39;s Health Collective Canada\. Amy Flood leads &lt;the&gt; collective &amp; more; \$&amp; and \$&#39; stay text\.<\/p>/);
});

test("the outline: the trail on nested pages only, the H1, the intro, the links, then the site's links", () => {
  const page = sitePages().pages.find((p) => p.path === "/exhibit/india-pavilion");
  const html = outline(page);
  assert.match(html, /^<noscript><main class="ttfc-outline"><nav class="tfc-nav" aria-label="Breadcrumb"><a href="\/">Home<\/a> › <a href="\/exhibit">Exhibit<\/a> › India Startup Pavilion<\/nav><h1>India Startup Pavilion Application<\/h1><p>/);
  assert.match(html, /<nav class="tfc-nav" aria-label="The Tech Festival Canada"><a href="\/">Home<\/a> · <a href="\/stay-updated">/);
  assert.doesNotMatch(outline(sitePages().pages.find((p) => p.path === "/awards")), /aria-label="Breadcrumb"/);
});

test("spa.html: the plain site, without the home page's canonical, og:url or Event", () => {
  const html = spaShell(SHELL);
  assert.equal(canonicalOf(html), null);
  assert.equal(metaOf(html, "property", "og:url"), null);
  assert.doesNotMatch(html, /id="ld-event"|"@type": "Event"|Structured Data: Event/);
  assert.doesNotMatch(html, /<noscript>|<h1>|name="robots"/);
  assert.deepEqual(kept(html), kept(SHELL));
  assert.equal(titleOf(html), "The Tech Festival Canada");
  assert.equal(jsonLds(html).length, 2);
});

test("index.html: no fixed canonical, www everywhere, the Event without offers, the Organization's real links", () => {
  assert.doesNotMatch(SHELL, /rel="canonical"/);
  assert.doesNotMatch(SHELL, /https?:\/\/thetechfestival\.com/);
  const [event, site, org] = jsonLds(SHELL);
  assert.deepEqual([event["@type"], event.eventStatus, event.url, event.offers], ["Event", "https://schema.org/EventScheduled", `${SITE}/`, undefined]);
  assert.deepEqual(event.organizer, { "@type": "Organization", name: "AtlasLink Markets Inc.", url: "https://www.atlaslinkmarkets.com/" });
  assert.deepEqual([site["@type"], site.url, site.alternateName], ["WebSite", `${SITE}/`, "TTFC"]);
  assert.deepEqual([org["@type"], org.url, org.contactPoint.email], ["Organization", `${SITE}/`, "enquire@thetechfestival.com"]);
  assert.ok(org.sameAs.includes("https://www.linkedin.com/company/thetechfestival/"));
  assert.equal(metaOf(SHELL, "property", "og:url"), `${SITE}/`);
});

test("sitemap.xml: www addresses, escaped, with the speakers' photos", () => {
  const xml = sitemapXml([{ loc: `${SITE}/` }, { loc: `${SITE}/speakers/a`, lastmod: "2026-10-20T10:00:00Z", image: "https://cdn.sanity.io/images/x/y/a-1x1.png?x=1&y=2" }]);
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9" xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1">/);
  assert.match(xml, /<url>\n {4}<loc>https:\/\/www\.thetechfestival\.com\/speakers\/a<\/loc>\n {4}<lastmod>2026-10-20T10:00:00Z<\/lastmod>\n {4}<image:image>\n {6}<image:loc>https:\/\/cdn\.sanity\.io\/images\/x\/y\/a-1x1\.png\?x=1&amp;y=2<\/image:loc>/);
});

test("the whole site into a folder: every page, spa.html and the sitemap; one speaker per slug; bad winner ids skipped", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ttfc-prerender-"));
  try {
    const r = await prerenderSite({ outDir: dir, shell: SHELL, data: { speakers: SPEAKERS, winners: WINNERS }, warn: () => {} });
    assert.deepEqual([r.pages, r.speakers, r.winners, r.warnings], [PAGES.length, 2, 1, []]);
    for (const p of PAGES) assert.ok(existsSync(join(dir, p.path === "/" ? "" : p.path.slice(1), "index.html")), p.path);
    for (const f of ["spa.html", "sitemap.xml", "speakers/laila-burns/index.html", "speakers/amy-flood/index.html", "awards/winners/6ad000af745957478367e321/index.html"]) assert.ok(existsSync(join(dir, f)), f);
    assert.ok(!existsSync(join(dir, "awards/winners/not-an-id")));
    const locs = [...readFileSync(join(dir, "sitemap.xml"), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    assert.equal(locs.length, r.urls);
    assert.deepEqual(locs.slice(0, 3), [`${SITE}/`, `${SITE}/stay-updated`, `${SITE}/awards`]);
    assert.ok(locs.includes(`${SITE}/speakers/laila-burns`) && locs.includes(`${SITE}/awards/winners/6ad000af745957478367e321`));
    assert.ok(!locs.includes(`${SITE}/about`) && !locs.includes(`${SITE}/sponsors`), "duplicates stay out");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("Sanity or the API not answering: the fixed pages are still written, with a warning", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ttfc-prerender-"));
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("offline"); };
  try {
    const warned = [];
    const r = await prerenderSite({ outDir: dir, shell: SHELL, fetchData: true, warn: (m) => warned.push(m) });
    assert.deepEqual([r.pages, r.speakers, r.winners], [PAGES.length, 0, 0]);
    assert.equal(warned.length, 2);
    assert.match(warned.join("\n"), /speakers not loaded from Sanity \(offline\)[^]*award winners not loaded from the API \(offline\)/);
    assert.ok(existsSync(join(dir, "awards", "index.html")) && existsSync(join(dir, "sitemap.xml")));
  } finally {
    globalThis.fetch = realFetch;
    rmSync(dir, { recursive: true, force: true });
  }
});

/** Every index.html the prerender wrote in dist/ (not the apps'). */
function builtPages() {
  const out = [];
  for (const f of readdirSync(DIST, { recursive: true })) {
    const rel = f.split("\\").join("/");
    if (!rel.endsWith("index.html") || /^(app|checkin|get-app)\//.test(rel) || !statSync(new URL(rel, DIST)).isFile()) continue;
    out.push({ path: rel === "index.html" ? "/" : `/${rel.slice(0, -"/index.html".length)}`, html: readFileSync(new URL(rel, DIST), "utf8") });
  }
  return out;
}

test("after a build: every page file has its own head, one H1, a canonical on itself (duplicates: their main page)", { skip: !BUILT && "no dist/ (run vite build first)" }, () => {
  const pages = builtPages();
  assert.ok(pages.length >= PAGES.length, `${pages.length} pages`);
  for (const p of PAGES) assert.ok(pages.some((b) => b.path === p.path), `${p.path} was written`);
  const titles = new Map();
  for (const { path, html } of pages) {
    const title = unesc(titleOf(html));
    assert.ok(title.length <= TITLE_MAX, `${path}: ${title}`);
    assert.ok(unesc(metaOf(html, "name", "description")).length <= DESCRIPTION_MAX, path);
    assert.equal(count(html, /<h1>/g), 1, `${path}: one H1`);
    const page = PAGES.find((x) => x.path === path);
    assert.equal(canonicalOf(html), `${SITE}${page?.canonical || path}`, path);
    assert.equal(metaOf(html, "property", "og:url"), canonicalOf(html), path);
    assert.doesNotMatch(html, /noindex/, path);
    assert.equal(/id="ld-event"/.test(html), path === "/", path);
    assert.ok(!titles.has(title), `${path} has the title of ${titles.get(title)}`);
    titles.set(title, path);
  }
  const spa = readFileSync(new URL("spa.html", DIST), "utf8");
  assert.equal(canonicalOf(spa), null);
  assert.deepEqual(kept(spa), kept(readFileSync(new URL("index.html", DIST), "utf8")), "the home page and spa.html load the same build");
});

test("after a build: sitemap.xml lists only indexable www pages that have a file; robots.txt points to it", { skip: !BUILT && "no dist/ (run vite build first)" }, () => {
  const xml = readFileSync(new URL("sitemap.xml", DIST), "utf8");
  assert.doesNotMatch(xml, /fact-?sheet|check-?in|\/admin|\/rsvp|\/survey/i);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.equal(new Set(locs).size, locs.length, "no address twice");
  assert.ok(locs.length >= PAGES.filter((p) => !p.canonical).length);
  for (const loc of locs) {
    assert.ok(loc.startsWith(`${SITE}/`), loc);
    const path = loc.slice(SITE.length);
    assert.equal(path, path.toLowerCase(), loc);
    assert.ok(path === "/" || !path.endsWith("/"), loc);
    assert.equal(isNoindexPath(path), false, loc);
    assert.ok(existsSync(new URL(path === "/" ? "index.html" : `${path.slice(1)}/index.html`, DIST)), `${loc} has a file`);
  }
  for (const img of xml.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)) assert.match(img[1], /^https:\/\/cdn\.sanity\.io\/images\/021qtoci\/production\/[a-f0-9]+-\d+x\d+\.[a-z]+$/, img[1]);
  assert.equal(readFileSync(new URL("robots.txt", DIST), "utf8"), "User-agent: *\nAllow: /\n\nSitemap: https://www.thetechfestival.com/sitemap.xml\n");
});
