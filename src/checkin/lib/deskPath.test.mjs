/* node --test src/checkin/lib/deskPath.test.mjs: TTFC Check-in's address, /checkin/ (since Oct 24 2026; the organiser:
   "make the URL as https://www.thetechfestival.com/checkin but don't put this on the website. Only direct link should
   be there."). vercel.json, run through a stand-in for Vercel's routing (vercelRoutes.mjs): /checkin and every typed
   variant (/check-in, any capitalisation, with or without the slash) redirect to /checkin/, which serves the desk's own
   page (never the website's SPA), its worker, manifest and icons; everything carries noindex; the earlier address
   (/checkin-<token>/) redirects there except its sw.js, the worker that replaces the old one on devices; the deploy
   rule stays. The build publishes the app only there (never at /desk/), as its own installable app. Unlisted: no
   public website file links to it (no <a>, <Link>, nav / footer entry, router route, sitemap or robots.txt line), only
   the desk app itself and the staff-only Admin card (which reads the link at runtime: GET /api/checkin/desk/info,
   contract C5); after a build, neither do the website's or the attendee app's files. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { DESK_NAME, DESK_PATH, RETIRED_DESK_PATHS } from "../deskPath.js";
import { match, route } from "./vercelRoutes.mjs";

const ROOT = new URL("../../../", import.meta.url);
const read = (rel) => readFileSync(new URL(rel, ROOT), "utf8");
const VERCEL = JSON.parse(read("vercel.json"));
const DIST = new URL("dist/", ROOT);
const BUILT = existsSync(new URL("dist/index.html", ROOT));
const NOINDEX = "noindex, nofollow, noarchive";

/** The files of a deploy: dist/ when built, else the ones the build always writes. */
function deployFiles() {
  if (BUILT) {
    const out = new Set();
    for (const f of readdirSync(DIST, { recursive: true })) if (statSync(new URL(f, DIST)).isFile()) out.add(`/${f.split("\\").join("/")}`);
    return out;
  }
  return new Set(["/index.html", "/app/index.html", "/app/sw.js", "/app/manifest.webmanifest", "/assets/index-a1.js",
    `${DESK_PATH}index.html`, `${DESK_PATH}sw.js`, `${DESK_PATH}manifest.webmanifest`, `${DESK_PATH}icons/icon-192.png`, `${DESK_PATH}icons/apple-touch-icon.png`,
    ...RETIRED_DESK_PATHS.map((p) => `${p}sw.js`)]);
}
const FILES = deployFiles();
const at = (url) => route(VERCEL, url, (p) => FILES.has(p));

/** Every capitalisation of a word. */
const cases = (word) => {
  const out = [];
  for (let m = 0; m < 1 << word.length; m++) out.push([...word].map((c, i) => (m & (1 << i) ? c.toUpperCase() : c)).join(""));
  return [...new Set(out)];
};

test("the address: /checkin/; the earlier one is /checkin-<token>/", () => {
  assert.equal(DESK_PATH, "/checkin/");
  assert.equal(DESK_NAME, "TTFC Check-in");
  assert.ok(RETIRED_DESK_PATHS.length >= 1);
  for (const p of RETIRED_DESK_PATHS) {
    assert.match(p, /^\/checkin-[a-z0-9]{8,40}\/$/);
    assert.notEqual(p, DESK_PATH);
  }
});

test("vercel.json: the deploy rule stays", () => {
  assert.deepEqual(VERCEL.git, { deploymentEnabled: { main: true, "**": false } });
});

test("vercel.json: /checkin/ serves the desk's own page, worker, manifest and icons (never the website's SPA), noindex", () => {
  for (const url of [DESK_PATH, `${DESK_PATH}?source=pwa`, `${DESK_PATH}index.html`, `${DESK_PATH}some/deep/link`]) {
    const r = at(url);
    assert.equal(r.status, 200, url);
    assert.equal(r.file, `${DESK_PATH}index.html`, url);
    assert.equal(r.headers["x-robots-tag"], NOINDEX, url);
    assert.equal(r.headers["referrer-policy"], "no-referrer", url);
  }
  const sw = at(`${DESK_PATH}sw.js`);
  assert.deepEqual([sw.status, sw.file, sw.headers["cache-control"], sw.headers["x-robots-tag"]], [200, `${DESK_PATH}sw.js`, "no-cache", NOINDEX]);
  const mf = at(`${DESK_PATH}manifest.webmanifest`);
  assert.deepEqual([mf.status, mf.file, mf.headers["content-type"], mf.headers["cache-control"]], [200, `${DESK_PATH}manifest.webmanifest`, "application/manifest+json", "no-cache"]);
  const icon = at(`${DESK_PATH}icons/icon-192.png`);
  assert.deepEqual([icon.status, icon.file], [200, `${DESK_PATH}icons/icon-192.png`]);
  // Its rewrite comes before the website's catch-all.
  const rw = VERCEL.rewrites.map((r) => r.source);
  assert.ok(rw.indexOf(`${DESK_PATH}(.*)`) !== -1 && rw.indexOf(`${DESK_PATH}(.*)`) < rw.indexOf("/(.*)"));
});

test("vercel.json: /checkin and every typed variant redirect to /checkin/ (308), with noindex; nothing else does", () => {
  const typed = [];
  for (const w of [...cases("checkin"), ...cases("check-in")]) for (const slash of ["", "/"]) typed.push(`/${w}${slash}`);
  assert.equal(typed.length, 512);
  for (const url of typed) {
    const r = at(url);
    if (url === DESK_PATH) { assert.equal(r.status, 200, url); continue; }
    assert.equal(r.status, 308, url);
    assert.equal(r.location, DESK_PATH, url);
    assert.equal(r.headers["x-robots-tag"], NOINDEX, url);
  }
  for (const url of ["/checkin", "/Checkin", "/CheckIn", "/CHECKIN", "/Checkin/", "/CheckIn/", "/CHECKIN/", "/check-in", "/check-in/", "/Check-In", "/Check-in/", "/CHECK-IN", "/CHECK-IN/"]) {
    assert.equal(at(url).location, DESK_PATH, url);
  }
  // Paths that only look alike stay the website's (no collision with its routes, no redirect).
  for (const url of ["/checkins", "/checking", "/check", "/checkin-", "/checkin-abc", "/check--in", "/check_in", "/xcheckin", "/admin/checkin", "/admin/check-in", "/app/checkin", "/tickets/checkout"]) {
    const r = at(url);
    assert.ok(r.status !== 308 && r.status !== 307, `${url} is redirected (${r.rule})`);
  }
  // The website's own routes are untouched.
  assert.deepEqual([at("/").file, at("/rsvp").file, at("/app/").file, at("/app/schedule").file], ["/index.html", "/index.html", "/app/index.html", "/app/index.html"]);
  assert.equal(at("/first-timers").location, "/briefings");
});

test("vercel.json: the earlier address redirects to /checkin/ (308), except its sw.js: the replacement worker", () => {
  for (const old of RETIRED_DESK_PATHS) {
    for (const url of [old.slice(0, -1), old, `${old}?source=pwa`, `${old}index.html`, `${old}manifest.webmanifest`, `${old}icons/icon-192.png`, `${old}a/b`, `${old}sw.jsx`]) {
      const r = at(url);
      assert.equal(r.status, 308, url);
      assert.ok(r.location === DESK_PATH || r.location.startsWith(`${DESK_PATH}?`), `${url} → ${r.location}`);
      assert.equal(r.headers["x-robots-tag"], NOINDEX, url);
    }
    const sw = at(`${old}sw.js`);
    assert.deepEqual([sw.status, sw.file, sw.headers["cache-control"], sw.headers["x-robots-tag"]], [200, `${old}sw.js`, "no-cache", NOINDEX]);
    assert.ok(FILES.has(`${old}sw.js`), "the build writes it");
  }
  // Every check-in token vercel.json names is an earlier address.
  for (const m of JSON.stringify(VERCEL).matchAll(/checkin-([a-z0-9]+)/g)) assert.ok(RETIRED_DESK_PATHS.includes(`/checkin-${m[1]}/`), m[0]);
});

test("vercel.json: every source compiles the way Vercel compiles it", () => {
  for (const r of [...VERCEL.headers, ...VERCEL.redirects, ...VERCEL.rewrites]) assert.doesNotThrow(() => match(r.source, "/"), r.source);
});

test("the build publishes it only at /checkin/, as its own installable app", () => {
  const cfg = read("vite.config.js");
  assert.match(cfg, /desk: fileURLToPath\(new URL\('\.\/desk\/index\.html'/);
  assert.match(cfg, /delete bundle\['desk\/index\.html'\]/, "never published at /desk/");
  assert.match(cfg, /import \{ DESK_NAME, DESK_PATH, RETIRED_DESK_PATHS \} from '\.\/src\/checkin\/deskPath\.js'/);
  for (const k of ["display: 'standalone'", "scope: base", "start_url: `${base}?source=pwa`", "purpose: 'maskable'", "id: base"]) assert.ok(cfg.includes(k), k);
  const html = read("desk/index.html");
  assert.match(html, /<meta name="robots" content="noindex, nofollow, noarchive" \/>/);
  assert.match(html, /<link rel="manifest" href="manifest.webmanifest" \/>/);
  assert.match(html, /<link rel="apple-touch-icon" sizes="180x180" href="icons\/apple-touch-icon.png" \/>/);
  assert.match(html, /apple-mobile-web-app-title" content="TTFC Check-in"/);
  for (const f of ["icon-192.png", "icon-512.png", "maskable-512.png", "apple-touch-icon.png", "icon-96.png"]) assert.ok(statSync(new URL(`src/checkin/icons/${f}`, ROOT)).size > 1000, f);
});

/** Text files of the public website and the attendee app (src/, public/, the two pages). */
function siteFiles() {
  const files = ["index.html", "app/index.html"];
  const walk = (dir) => {
    for (const name of readdirSync(new URL(dir, ROOT))) {
      const rel = `${dir}${name}`;
      if (statSync(new URL(rel, ROOT)).isDirectory()) walk(`${rel}/`);
      else if (/\.(jsx?|mjs|tsx?|html|css|json|txt|xml|md|webmanifest|svg)$/.test(name)) files.push(rel);
    }
  };
  walk("src/");
  walk("public/");
  return files;
}
/** The desk app itself and the staff-only Admin card (and its link helper) may name it. */
const MAY_NAME = (f) => f.startsWith("src/checkin/") || ["src/admin/checkin/DeskApp.jsx", "src/admin/checkin/deskLink.js", "src/admin/checkin/deskLink.test.mjs"].includes(f);
const DESK_URL = String.raw`(?:https?:\/\/(?:www\.)?thetechfestival\.com)?\/check-?in(?![a-z0-9_])`;
/** A link to the desk: href / to / path / url… = "/checkin…", navigate("/checkin…"), location = …, or its full URL. */
const LINK = new RegExp(String.raw`(?:\b(?:href|to|path|url|link|src|action|formAction)\s*[=:]\s*\{?\s*|\b(?:navigate|assign|replace|open|push|redirect)\s*\(\s*|\blocation(?:\.href)?\s*=\s*)["'\x60]${DESK_URL}`, "i");
const FULL_URL = /thetechfestival\.com\/check-?in(?![a-z0-9_])/i;

test("unlisted: no public website or attendee app file links to it (no <a>, <Link>, nav, footer, route, sitemap, robots.txt)", () => {
  // What counts as a link (and what doesn't: the API's own /api/checkin/… calls, look-alike paths).
  for (const bad of ['<a href="/checkin">', "<Link to='/CheckIn/'>", '{ label: "Check-in", path: "/check-in" }', 'navigate("/checkin/")', "window.location.href = '/checkin'",
    "href={`https://www.thetechfestival.com/checkin`}", "<Route path=\"/checkin\" />", "Go to thetechfestival.com/checkin", "href: \"/checkin-j0s8e5p4akvh/\"", 'u:"/checkin/",href:"/checkin/"']) {
    assert.ok(LINK.test(bad) || FULL_URL.test(bad), bad);
  }
  for (const fine of ['adminFetch("/checkin/scan", {', 'api.get("/checkin/desk/info")', 'href="/checkout"', 'to="/admin/checkin"', 'path: "/checking"', "href: path", "Check-in desk app"]) {
    assert.ok(!LINK.test(fine) && !FULL_URL.test(fine), fine);
  }
  const files = siteFiles();
  assert.ok(files.length > 100, "the site's files were found");
  for (const f of files) {
    if (MAY_NAME(f)) continue;
    const text = read(f);
    const hit = text.match(LINK) || text.match(FULL_URL);
    assert.ok(!hit, `${f} links to the check-in desk: ${hit && hit[0]}`);
    assert.ok(!/checkin\/deskPath/.test(text), `${f} imports the desk path`);
    for (const p of RETIRED_DESK_PATHS) assert.ok(!text.includes(p.slice(1, -1)), `${f} names the earlier address`);
  }
  // The website's router has no route for it (it's its own page), the website's page doesn't mention it.
  assert.ok(!/path=["'{`]*\/check-?in/i.test(read("src/App.jsx")));
  assert.ok(!/check-?in/i.test(read("index.html")));
  // No sitemap or robots.txt names it (there are none today; if one is added, it mustn't).
  for (const f of readdirSync(new URL("public/", ROOT))) {
    if (/^(robots\.txt|sitemap.*\.xml)$/i.test(f)) assert.ok(!/check-?in/i.test(read(`public/${f}`)), `public/${f} names the check-in desk`);
  }
  assert.ok(!/sitemap/i.test(read("vite.config.js")), "no sitemap is generated");
  // The Admin card reads the link from the server at runtime.
  assert.match(read("src/admin/checkin/DeskApp.jsx"), /api\.get\("\/checkin\/desk\/info"\)/);
  // The earlier address's token is only in deskPath.js (and vercel.json's redirects).
  for (const p of RETIRED_DESK_PATHS) assert.ok(!read("vite.config.js").includes(p.slice(1, -1)));
});

test("no desktop block: the app never uses the attendee app's 'made for your phone' gate", () => {
  const src = readdirSync(new URL("src/checkin/", ROOT), { recursive: true }).filter((f) => /\.(jsx?|mjs)$/.test(f) && !f.endsWith(".test.mjs"));
  for (const f of src) {
    const text = read(`src/checkin/${f}`);
    assert.ok(!/desktopGate|DesktopGate|isMobileDevice/.test(text), f);
  }
});

/** The files a page loads, following every chunk a loaded file names (static imports, Vite's preload map). */
function reachable(page) {
  const seen = new Set();
  const todo = [...readFileSync(new URL(page, DIST), "utf8").matchAll(/(?:src|href)="\/(assets\/[^"]+)"/g)].map((m) => m[1]);
  while (todo.length) {
    const f = todo.pop();
    if (seen.has(f) || !existsSync(new URL(f, DIST))) continue;
    seen.add(f);
    if (!f.endsWith(".js")) continue;
    for (const m of readFileSync(new URL(f, DIST), "utf8").matchAll(/(?:\.\/|assets\/)([\w.-]+\.(?:js|css))/g)) todo.push(`assets/${m[1]}`);
  }
  return seen;
}

test("after a build: the desk app at /checkin/ (page, manifest, worker, icons), a replacement worker at the earlier address, nothing at /desk/", { skip: !BUILT && "no dist/ (run vite build first)" }, () => {
  const dir = DESK_PATH.slice(1);
  const html = readFileSync(new URL(`${dir}index.html`, DIST), "utf8");
  assert.match(html, /<meta name="robots" content="noindex, nofollow, noarchive"/);
  assert.match(html, /<link rel="manifest" href="manifest.webmanifest"/);
  const mf = JSON.parse(readFileSync(new URL(`${dir}manifest.webmanifest`, DIST), "utf8"));
  assert.deepEqual([mf.id, mf.start_url, mf.scope, mf.name, mf.display], [DESK_PATH, `${DESK_PATH}?source=pwa`, DESK_PATH, DESK_NAME, "standalone"]);
  for (const i of mf.icons) {
    assert.ok(i.src.startsWith(`${DESK_PATH}icons/`), i.src);
    assert.equal(at(i.src).status, 200, i.src);
  }
  for (const f of ["apple-touch-icon.png", "icon-96.png"]) assert.ok(FILES.has(`${DESK_PATH}icons/${f}`), f);
  const sw = readFileSync(new URL(`${dir}sw.js`, DIST), "utf8");
  assert.ok(sw.includes(`const SCOPE = ${JSON.stringify(DESK_PATH)};`));
  assert.ok(sw.includes(`[${JSON.stringify(DESK_PATH)},`), "the page is precached");
  assert.ok(sw.includes(`"${DESK_PATH}manifest.webmanifest"`));
  assert.ok(!sw.includes("self.__DESK_"), "every placeholder filled");
  // Every file the page names resolves on the deploy.
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const u = m[1].startsWith("/") ? m[1] : `${DESK_PATH}${m[1]}`;
    assert.equal(at(u).status, 200, u);
    assert.ok(at(u).file === u || u === DESK_PATH, u);
  }
  for (const old of RETIRED_DESK_PATHS) {
    const files = [...FILES].filter((f) => f.startsWith(old));
    assert.deepEqual(files, [`${old}sw.js`], "only the replacement worker");
    const r = readFileSync(new URL(`${old.slice(1)}sw.js`, DIST), "utf8");
    assert.ok(r.includes(`const TARGET = ${JSON.stringify(DESK_PATH)};`) && !r.includes("self.__DESK_"));
  }
  assert.ok(![...FILES].some((f) => f.startsWith("/desk/")), "never at /desk/");
});

test("after a build: no file the public website or the attendee app loads links to the desk", { skip: !BUILT && "no dist/ (run vite build first)" }, () => {
  assert.ok(!/check-?in/i.test(readFileSync(new URL("index.html", DIST), "utf8")));
  assert.ok(!/check-?in/i.test(readFileSync(new URL("app/index.html", DIST), "utf8")));
  const publicFiles = new Set([...reachable("index.html"), ...reachable("app/index.html")]);
  assert.ok(publicFiles.size > 5, "the website's chunks were found");
  const desk = reachable(`${DESK_PATH.slice(1)}index.html`);
  for (const f of publicFiles) {
    if (desk.has(f)) continue; // shared chunks (React…)
    const text = readFileSync(new URL(f, DIST), "utf8");
    const hit = text.match(LINK) || text.match(FULL_URL);
    assert.ok(!hit, `${f} links to the check-in desk: ${hit && hit[0]}`);
    for (const p of RETIRED_DESK_PATHS) assert.ok(!text.includes(p.slice(1, -1)), `${f} names the earlier address`);
  }
});
