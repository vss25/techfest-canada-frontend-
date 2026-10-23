/* node --test src/checkin/lib/deskPath.test.mjs: TTFC Check-in's unlisted address. One random token (deskPath.js); the
   build publishes the app only there (never at /desk/); vercel.json sends noindex for it, rewrites its own paths to
   its page and keeps the deploy rule; nothing on the public website imports or links it; the manifest the build writes
   is a standalone app scoped to it with its own icons. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { DESK_NAME, DESK_PATH, DESK_TOKEN } from "../deskPath.js";

const ROOT = new URL("../../../", import.meta.url);
const read = (rel) => readFileSync(new URL(rel, ROOT), "utf8");

test("the token: 12 random lowercase letters and digits, one path", () => {
  assert.match(DESK_TOKEN, /^[a-z0-9]{12}$/);
  assert.match(DESK_TOKEN, /[a-z]/);
  assert.match(DESK_TOKEN, /[0-9]/);
  assert.equal(DESK_PATH, `/checkin-${DESK_TOKEN}/`);
  assert.equal(DESK_NAME, "TTFC Check-in");
});

test("vercel.json: the deploy rule stays; noindex, no-cache for the worker and manifest, its own rewrite before the site's", () => {
  const raw = read("vercel.json");
  const v = JSON.parse(raw);
  assert.deepEqual(v.git, { deploymentEnabled: { main: true, "**": false } });
  const header = (src) => v.headers.find((h) => h.source === src);
  assert.deepEqual(header(`/checkin-${DESK_TOKEN}/(.*)`).headers.find((h) => h.key === "X-Robots-Tag"), { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" });
  assert.equal(header(`/checkin-${DESK_TOKEN}/sw.js`).headers[0].value, "no-cache");
  assert.ok(header(`/checkin-${DESK_TOKEN}/manifest.webmanifest`).headers.some((h) => h.value === "application/manifest+json"));
  const rw = v.rewrites.map((r) => r.source);
  assert.ok(rw.indexOf(`/checkin-${DESK_TOKEN}/(.*)`) !== -1 && rw.indexOf(`/checkin-${DESK_TOKEN}/(.*)`) < rw.indexOf("/(.*)"));
  assert.equal(v.rewrites.find((r) => r.source === `/checkin-${DESK_TOKEN}/(.*)`).destination, `/checkin-${DESK_TOKEN}/index.html`);
  assert.equal(v.redirects.find((r) => r.source === `/checkin-${DESK_TOKEN}`).destination, DESK_PATH);
  // Every mention of a check-in path in vercel.json is this token's.
  for (const m of raw.matchAll(/checkin-([a-z0-9]+)/g)) assert.equal(m[1], DESK_TOKEN);
});

test("the build publishes it only at the token path, as its own installable app", () => {
  const cfg = read("vite.config.js");
  assert.match(cfg, /desk: fileURLToPath\(new URL\('\.\/desk\/index\.html'/);
  assert.match(cfg, /delete bundle\['desk\/index\.html'\]/, "never published at /desk/");
  assert.match(cfg, /import \{ DESK_NAME, DESK_PATH \} from '\.\/src\/checkin\/deskPath\.js'/);
  assert.ok(!cfg.includes(DESK_TOKEN), "the token is only in deskPath.js and vercel.json");
  for (const k of ["display: 'standalone'", "scope: base", "start_url: `${base}?source=pwa`", "purpose: 'maskable'", "id: base"]) assert.ok(cfg.includes(k), k);
  const html = read("desk/index.html");
  assert.match(html, /<meta name="robots" content="noindex, nofollow, noarchive" \/>/);
  assert.match(html, /<link rel="manifest" href="manifest.webmanifest" \/>/);
  assert.match(html, /<link rel="apple-touch-icon" sizes="180x180" href="icons\/apple-touch-icon.png" \/>/);
  assert.match(html, /apple-mobile-web-app-title" content="TTFC Check-in"/);
  for (const f of ["icon-192.png", "icon-512.png", "maskable-512.png", "apple-touch-icon.png", "icon-96.png"]) assert.ok(statSync(new URL(`src/checkin/icons/${f}`, ROOT)).size > 1000, f);
});

test("the public website never imports or links the app (only the admin panel's card does)", () => {
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(new URL(dir, ROOT))) {
      const rel = `${dir}${name}`;
      if (statSync(new URL(rel, ROOT)).isDirectory()) walk(`${rel}/`);
      else if (/\.(jsx?|tsx?|html|css|json|txt|xml)$/.test(name)) files.push(rel);
    }
  };
  walk("src/");
  walk("public/");
  const allowed = new Set(["src/checkin/", "src/admin/checkin/DeskApp.jsx"]);
  for (const f of files) {
    if ([...allowed].some((a) => f.startsWith(a))) continue;
    const text = read(f);
    assert.ok(!text.includes(DESK_TOKEN), `${f} names the token`);
    assert.ok(!/checkin\/deskPath/.test(text) || f === "src/admin/checkin/DeskApp.jsx", `${f} imports the desk path`);
  }
  // The website's own router has no route for it (it's its own page).
  assert.ok(!read("src/App.jsx").includes("checkin-"));
  assert.ok(!read("index.html").includes("checkin"));
});

test("no desktop block: the app never uses the attendee app's 'made for your phone' gate", () => {
  const src = readdirSync(new URL("src/checkin/", ROOT), { recursive: true }).filter((f) => /\.(jsx?|mjs)$/.test(f) && !f.endsWith(".test.mjs"));
  for (const f of src) {
    const text = read(`src/checkin/${f}`);
    assert.ok(!/desktopGate|DesktopGate|isMobileDevice/.test(text), f);
  }
});
