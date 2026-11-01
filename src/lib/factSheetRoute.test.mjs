/* node --test src/lib/factSheetRoute.test.mjs: the unlisted fact sheet. Only its exact link is routed (not
   /fact-sheet, a wrong token or the token in capitals), it's lazy-loaded, nothing on the site links to it or names it
   (sitemap, robots.txt, menus), vercel.json sends noindex for it, and its text has the organiser's Oct 23 corrections. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { matchRoutes } from "react-router";
import { FACT_SHEET_PATH, FACT_SHEET_TOKEN, isFactSheetPath } from "./factSheetRoute.js";
import { FACT_SHEET, WEBSITE } from "../data/factSheet.js";

const ROOT = new URL("../../", import.meta.url);
const read = (rel) => readFileSync(new URL(rel, ROOT), "utf8");
const APP = read("src/App.jsx");

/** The website's routes, as App.jsx declares them: { path, caseSensitive }. */
function siteRoutes() {
  const consts = { FACT_SHEET_PATH };
  const routes = [];
  for (const m of APP.matchAll(/<Route\s+path=(?:"([^"]+)"|\{(\w+)\})(\s+caseSensitive)?/g)) {
    const path = m[1] ?? consts[m[2]];
    assert.ok(path, `unknown route path constant ${m[2]}`);
    routes.push({ path, caseSensitive: !!m[3] });
  }
  return routes;
}
/** The route an address opens; null for an unknown address (since Oct 31 2026 that's App.jsx's "*" route: "Page not found"). */
const routeFor = (url) => {
  const path = matchRoutes(siteRoutes(), url)?.at(-1)?.route.path ?? null;
  return path === "*" ? null : path;
};

test("the token: 12 random lowercase letters and digits, in one path", () => {
  assert.match(FACT_SHEET_TOKEN, /^[a-z0-9]{12}$/);
  assert.match(FACT_SHEET_TOKEN, /[a-z]/);
  assert.match(FACT_SHEET_TOKEN, /[0-9]/);
  assert.equal(FACT_SHEET_PATH, `/fact-sheet/${FACT_SHEET_TOKEN}`);
});

test("App.jsx routes the token path, case-sensitively, to the lazy-loaded page", () => {
  const routes = siteRoutes();
  assert.ok(routes.length > 30, "found the site's routes");
  assert.deepEqual(routes.filter((r) => r.path.startsWith("/fact-sheet")), [{ path: FACT_SHEET_PATH, caseSensitive: true }]);
  assert.match(APP, /const FactSheet = lazy\(\(\) => import\("\.\/pages\/FactSheet"\)\);/);
  assert.doesNotMatch(APP, /import FactSheet\b/, "never a static import (its text would be in the main bundle)");
  assert.match(APP, /<Route path=\{FACT_SHEET_PATH\} caseSensitive element=\{<Suspense[^]*?<FactSheet \/><\/Suspense>\} \/>/);
});

test("only the exact link opens it: /fact-sheet and wrong tokens are unknown pages", () => {
  assert.equal(routeFor(FACT_SHEET_PATH), FACT_SHEET_PATH);
  assert.equal(routeFor(`${FACT_SHEET_PATH}/`), FACT_SHEET_PATH);
  for (const url of [
    "/fact-sheet", "/fact-sheet/", "/Fact-Sheet", "/factsheet", "/fact-sheets",
    "/fact-sheet/aaaaaaaaaaaa", `/fact-sheet/${FACT_SHEET_TOKEN.slice(0, 11)}`, `/fact-sheet/${FACT_SHEET_TOKEN}x`,
    `/fact-sheet/${FACT_SHEET_TOKEN.toUpperCase()}`, `/FACT-SHEET/${FACT_SHEET_TOKEN}`, `${FACT_SHEET_PATH}/more`,
  ]) assert.equal(routeFor(url), null, url);
  // Same as any other unknown address on the site.
  assert.equal(routeFor("/no-such-page"), null);
  assert.equal(routeFor("/tickets"), "/tickets");
});

test("isFactSheetPath (hides the ticket bar, banners and app prompt) is true only on the page itself", () => {
  assert.equal(isFactSheetPath(FACT_SHEET_PATH), true);
  assert.equal(isFactSheetPath(`${FACT_SHEET_PATH}/`), true);
  for (const p of ["/fact-sheet", "/fact-sheet/", "/fact-sheet/aaaaaaaaaaaa", FACT_SHEET_PATH.toUpperCase(), "/", "", undefined]) {
    assert.equal(isFactSheetPath(p), false, String(p));
  }
});

test("unlisted: nothing on the site links to it or names it (no sitemap or robots.txt entry)", () => {
  const TEXT = /\.(jsx?|tsx?|mjs|cjs|html|xml|txt|json|webmanifest|css|md)$/i;
  // Only the route module (and this test) may contain the token. Only the router, the page's own files and
  // vercel.json's header rule may mention "/fact-sheet/" (in comments): no link, menu entry or sitemap line anywhere.
  const ALLOWED = new Set(["src/lib/factSheetRoute.js", "src/lib/factSheetRoute.test.mjs"]);
  const MAY_MENTION = new Set(["vercel.json", "src/App.jsx", "src/pages/FactSheet.jsx", "src/pages/FactSheet.css", "src/data/factSheet.js"]);
  const files = ["index.html", "app/index.html", "vercel.json"];
  for (const dir of ["src", "public", "email-templates"]) {
    if (!existsSync(new URL(`${dir}/`, ROOT))) continue;
    for (const rel of readdirSync(new URL(`${dir}/`, ROOT), { recursive: true })) {
      const path = `${dir}/${rel}`;
      if (TEXT.test(path) && statSync(new URL(path, ROOT)).isFile()) files.push(path);
    }
  }
  assert.ok(files.length > 100, "scanned the site's files");
  for (const path of files) {
    if (ALLOWED.has(path)) continue;
    const text = read(path);
    assert.ok(!text.includes(FACT_SHEET_TOKEN), `${path} contains the fact sheet's token`);
    if (!MAY_MENTION.has(path)) assert.ok(!/fact-?sheet\//i.test(text), `${path} links to /fact-sheet/`);
  }
  for (const f of ["public/robots.txt", "public/sitemap.xml"]) {
    if (existsSync(new URL(f, ROOT))) assert.doesNotMatch(read(f), /fact-?sheet/i, `${f} must not reveal the page`);
  }
});

test("vercel.json: X-Robots-Tag noindex for /fact-sheet/(.*), and the no-preview rule is kept", () => {
  const vercel = JSON.parse(read("vercel.json"));
  assert.deepEqual(vercel.git, { deploymentEnabled: { main: true, "**": false } });
  const rule = vercel.headers.find((h) => h.source === "/fact-sheet/(.*)");
  assert.deepEqual(rule?.headers, [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }]);
  assert.equal(JSON.stringify(vercel).includes(FACT_SHEET_TOKEN), false);
});

/** Every piece of text in the fact sheet, links' addresses included. */
function allText(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(allText);
  if (value && typeof value === "object") return Object.values(value).flatMap(allText);
  return [];
}

test("the text: the organiser's sections in order, with the Oct 23 corrections", () => {
  assert.equal(FACT_SHEET.title, "The Tech Festival Canada 2026: Fact Sheet");
  assert.equal(FACT_SHEET.tagline, "Meet | Build | Scale");
  assert.deepEqual(FACT_SHEET.sections.map((s) => s.title), [
    "About the Festival", "Event at a Glance", "By the Numbers", "Programme: The 5 × 5 Framework", "Session Formats",
    "Agenda Highlights", "Catalyst Awards", "Venue and Exhibition", "Partners", "Contacts",
  ]);
  const text = allText(FACT_SHEET).join("\n");
  // Correction 1: no info@ address anywhere; the producer office is enquire@ (+ phone).
  assert.doesNotMatch(text, /info@/i);
  const contacts = FACT_SHEET.sections.find((s) => s.id === "contacts").blocks[0];
  assert.deepEqual(contacts.head, ["Purpose", "Contact"]);
  assert.deepEqual(contacts.table.map(([k]) => k), ["General enquiries", "Sales and sponsorship", "Partnerships", "Media and PR", "Speaker enquiries", "Producer office"]);
  assert.deepEqual(contacts.table.at(-1)[1], [
    { a: "enquire@thetechfestival.com", href: "mailto:enquire@thetechfestival.com" }, " / ", { a: "+1 647 946 4643", href: "tel:+16479464643" },
  ]);
  // Correction 2: "90+ speakers", nothing about 36 / 50+ / 19 August.
  const numbers = FACT_SHEET.sections.find((s) => s.id === "numbers").blocks[0].ul;
  assert.equal(numbers[3], "90+ speakers");
  assert.equal(numbers.length, 6);
  assert.doesNotMatch(text, /\b36\b|50\+|19 August/);
  // Links: every email is a mailto: of itself, the website is a real link.
  const links = JSON.stringify(FACT_SHEET).match(/"a":"[^"]+","href":"[^"]+"/g);
  assert.equal(links.length, 9, "2 website links, 6 emails, 1 phone");
  for (const l of links) {
    const { a, href } = JSON.parse(`{${l}}`);
    if (href.startsWith("mailto:")) assert.equal(href, `mailto:${a}`);
    else if (href.startsWith("tel:")) assert.equal(href, `tel:${a.replace(/[^+\d]/g, "")}`);
    else assert.equal(href, WEBSITE);
  }
  assert.equal(WEBSITE, "https://www.thetechfestival.com");
});
