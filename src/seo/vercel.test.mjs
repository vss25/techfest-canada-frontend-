/* node --test src/seo/vercel.test.mjs: vercel.json for search engines (Oct 31 2026), through the stand-in for Vercel's
   routing (src/checkin/lib/vercelRoutes.mjs). Each prerendered page is served from its own file by an explicit rewrite
   before the catch-all; speakers and winners rely on Vercel serving files first (no pattern rewrite: one to a missing
   file would be a 404); every other address gets the plain site (spa.html). Old addresses redirect straight to where
   they end up; private pages and the vercel.app copy of the site send noindex; public pages never do. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { route, match } from "../checkin/lib/vercelRoutes.mjs";
import { NOINDEX_ROUTES, PAGES, REDIRECTS } from "./routes.js";

const ROOT = new URL("../../", import.meta.url);
const TEXT = readFileSync(new URL("vercel.json", ROOT), "utf8");
const VERCEL = JSON.parse(TEXT);
const PAGE_FILES = PAGES.map((p) => (p.path === "/" ? "/index.html" : `${p.path}/index.html`));
/** A deploy with the build's files: the pages, the plain site, a speaker and a winner. */
const FILES = new Set([...PAGE_FILES, "/spa.html", "/sitemap.xml", "/robots.txt", "/speakers/amy-flood/index.html", "/awards/winners/6ad000b5745957478367e34b/index.html", "/assets/main-a1.js"]);
const at = (url, host) => route(VERCEL, url, (p) => FILES.has(p), host ? { host } : undefined);
const sample = (pattern) => pattern.replace(/:\w+/g, "x").replace(/\/\*$/, "/x");

test("vercel.json: the deploy rule is still the first key", () => {
  assert.equal(Object.keys(VERCEL)[0], "git");
  assert.deepEqual(VERCEL.git, { deploymentEnabled: { main: true, "**": false } });
  assert.match(TEXT, /^\{\n {2}"git": \{\n {4}"deploymentEnabled": \{ "main": true, "\*\*": false \}\n {2}\},/);
});

test("every prerendered page is served from its own file, by a rewrite before the catch-all", () => {
  const rw = VERCEL.rewrites.map((r) => r.source);
  const all = rw.indexOf("/(.*)");
  assert.equal(all, rw.length - 1, "the catch-all is last");
  assert.equal(VERCEL.rewrites[all].destination, "/spa.html");
  for (const p of PAGES) {
    const file = p.path === "/" ? "/index.html" : `${p.path}/index.html`;
    const i = rw.indexOf(p.path);
    assert.ok(i !== -1 && i < all, `${p.path} has its own rewrite before the catch-all`);
    assert.equal(VERCEL.rewrites[i].destination, file, p.path);
    for (const url of [p.path, `${p.path}?utm_source=x`]) {
      const r = at(url);
      assert.deepEqual([r.status, r.file], [200, file], url);
      assert.equal(r.headers["x-robots-tag"], undefined, `${url} is indexable`);
    }
  }
  // No rewrite for a speaker or a winner: a missing file would answer 404 instead of the site.
  for (const src of rw) assert.doesNotMatch(src, /^\/(speakers|awards\/winners)\/:/, src);
});

test("speakers and winners: their file when it exists; otherwise (a new one, a typo) the plain site, never a 404", () => {
  assert.deepEqual([at("/speakers/amy-flood/index.html").status, at("/speakers/amy-flood/index.html").file], [200, "/speakers/amy-flood/index.html"]);
  for (const url of ["/speakers/amy-flood", "/speakers/someone-new", "/awards/winners/6ad000b5745957478367e34b", "/awards/winners/nope"]) {
    const r = at(url);
    assert.equal(r.status, 200, url);
    assert.ok(["/spa.html", `${url}/index.html`].includes(r.file), `${url} → ${r.file}`);
  }
  // Every other address: the plain site (no home page canonical), as before with index.html.
  for (const url of ["/rsvp", "/no-such-page", "/Awards", "/awards/", "/admin/people"]) assert.deepEqual([at(url).status, at(url).file], [200, "/spa.html"], url);
  // Files of the deploy are served as themselves.
  for (const url of ["/robots.txt", "/sitemap.xml", "/assets/main-a1.js"]) assert.equal(at(url).file, url);
});

test("old addresses: one permanent redirect straight to where they end up (no chains)", () => {
  for (const [from, to] of Object.entries(REDIRECTS)) {
    for (const url of [from, `${from}/`]) {
      const r = at(url);
      assert.deepEqual([r.status, r.location], [308, to], url);
      // …and that's a page, not another redirect.
      assert.equal(at(to).status, 200, to);
    }
  }
  assert.equal(at("/first-timers?ref=email").location, "/?ref=email");
  assert.ok(!VERCEL.rewrites.some((r) => r.source === "/awards/nominations"), "no longer a duplicate of /awards");
  // Speaker addresses from names saved with a space: to the clean one.
  for (const [url, to] of [["/speakers/laila-burns-", "/speakers/laila-burns"], ["/speakers/-vance-lockton", "/speakers/vance-lockton"]]) {
    assert.deepEqual([at(url).status, at(url).location], [308, to], url);
  }
  for (const url of ["/speakers/laila-burns", "/speakers", "/speakers/-", "/first-timers-guide", "/kyc-form", "/awards/nominations-2027", "/resources"]) {
    assert.ok(![307, 308].includes(at(url).status), `${url} is redirected (${at(url).rule})`);
  }
});

test("private pages send noindex (X-Robots-Tag); /exhibit/india-pavilion and the public pages don't", () => {
  for (const r of NOINDEX_ROUTES) {
    for (const url of [sample(r), `${sample(r)}/`]) {
      assert.match(at(url).headers["x-robots-tag"] || "", /noindex/, url);
    }
  }
  for (const url of ["/admin", "/admin/", "/admin/people/x", "/reset-password/abc123", "/exhibit/india-pavilion/pay", "/tickets/checkout", "/linkedin", "/swag"]) {
    assert.match(at(url).headers["x-robots-tag"] || "", /noindex/, url);
  }
  for (const url of ["/", "/exhibit/india-pavilion", "/exhibit", "/tickets", "/administer", "/rates", "/speakers/amy-flood", "/awards/winners/6ad000b5745957478367e34b", "/sitemap.xml", "/robots.txt"]) {
    assert.equal(at(url).headers["x-robots-tag"], undefined, url);
  }
  // Nothing keyed on spa.html itself: the addresses that fall back to it (a speaker added after the deploy, /awards/)
  // must stay indexable whatever Vercel matches headers against. (The page puts noindex on /spa.html in the browser.)
  assert.ok(!JSON.stringify(VERCEL.headers).includes("spa.html"));
});

test("the techfest-canada-frontend.vercel.app copy of the site: noindex on every address; the real site: not", () => {
  const host = "techfest-canada-frontend.vercel.app";
  for (const url of ["/", "/awards", "/speakers/amy-flood", "/robots.txt", "/no-such-page"]) {
    assert.equal(at(url, host).headers["x-robots-tag"], "noindex", url);
    assert.equal(at(url, host).status, at(url).status, `${url}: the same page otherwise`);
    assert.equal(at(url, "www.thetechfestival.com").headers["x-robots-tag"], at(url).headers["x-robots-tag"], url);
  }
  // A stricter rule further down still wins there.
  assert.equal(at("/rsvp", host).headers["x-robots-tag"], "noindex, nofollow");
  // The stand-in: a host condition applies only to that host.
  const cfg = { headers: [{ source: "/(.*)", has: [{ type: "host", value: "a.example" }], headers: [{ key: "X", value: "1" }] }], rewrites: [{ source: "/(.*)", missing: [{ type: "host", value: "a.example" }], destination: "/b.html" }] };
  assert.equal(route(cfg, "/", () => true, { host: "a.example" }).headers.x, "1");
  assert.equal(route(cfg, "/", () => true).headers.x, undefined);
  assert.equal(route(cfg, "/x", (p) => p === "/b.html").file, "/b.html");
  assert.equal(route(cfg, "/x", (p) => p === "/b.html", { host: "a.example" }).status, 404);
});

test("every source compiles the way Vercel compiles it", () => {
  for (const r of [...VERCEL.headers, ...VERCEL.redirects, ...VERCEL.rewrites]) assert.doesNotThrow(() => match(r.source, "/"), r.source);
});
