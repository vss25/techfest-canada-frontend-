/* node --test src/lib/speed.test.mjs: the Oct 31 2026 speed pass. The CMS reader (src/utils/sanity.js) asks Sanity's
   API CDN what @sanity/client used to ask (a GET with the GROQ and its $params, a POST when that's too long, an error
   on a non-2xx answer) and image links still come from cdn.sanity.io; vercel.json caches public images for a day
   without shortening the longer rules (/assets, the app's icons, hero and brochure); index.html no longer loads Google
   Sign-In or favicon.svg; pages and pop-ups other than Home load on demand; the images moved to WebP or renamed to their
   real format exist and are what their names say, and the old names are gone from the code; /resources reserves each
   photo's real size. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { client, urlFor, speakerPhotoUrl } from "../utils/sanity.js";
import { route } from "../checkin/lib/vercelRoutes.mjs";

const ROOT = new URL("../../", import.meta.url);
const read = (rel) => readFileSync(new URL(rel, ROOT), "utf8");
const bytes = (rel) => readFileSync(new URL(rel, ROOT));

/** Runs fn with a stand-in for fetch that answers with reply(url, init); returns the calls it got. */
async function withFetch(reply, fn) {
  const calls = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); return reply(url, init); };
  try { await fn(); } finally { globalThis.fetch = real; }
  return calls;
}
const answer = (result) => new Response(JSON.stringify({ ms: 1, result }), { status: 200, headers: { "Content-Type": "application/json" } });

test("CMS reads: a GET to the API CDN with the query and its $params; the answer's result comes back", async () => {
  const groq = '*[_type == "speaker" && slug == $slug]{ "label": name + " (" + company + ")" }';
  let got;
  const calls = await withFetch(() => answer([{ label: "A (B)" }]), async () => {
    got = await client.fetch(groq, { slug: "jane-doe", unused: undefined });
  });
  assert.deepEqual(got, [{ label: "A (B)" }]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init?.method ?? "GET", "GET");
  const url = new URL(calls[0].url);
  assert.equal(url.origin, "https://021qtoci.apicdn.sanity.io");
  assert.equal(url.pathname, "/v2024-01-01/data/query/production");
  assert.equal(url.searchParams.get("query"), groq); // "+" (GROQ's join) survives the URL encoding
  assert.equal(url.searchParams.get("$slug"), '"jane-doe"');
  assert.equal(url.searchParams.has("$unused"), false);
  assert.equal(url.searchParams.get("returnQuery"), "false");
});

test("CMS reads: a query too long for a URL is POSTed to the same place", async () => {
  const groq = `*[_id in [${Array.from({ length: 1500 }, (_, i) => `"doc-${i}"`).join(", ")}]]{ _id }`;
  const calls = await withFetch(() => answer([]), () => client.fetch(groq, { n: 1 }));
  assert.equal(calls[0].init.method, "POST");
  const url = new URL(calls[0].url);
  assert.equal(`${url.origin}${url.pathname}`, "https://021qtoci.apicdn.sanity.io/v2024-01-01/data/query/production");
  assert.deepEqual(JSON.parse(calls[0].init.body), { query: groq, params: { n: 1 } });
});

test("CMS reads: an error answer rejects, so the pages' .catch shows their empty state", async () => {
  await withFetch(() => new Response('{"error":{"description":"bad"}}', { status: 400 }), () =>
    assert.rejects(client.fetch("*["), /Sanity query failed \(400\)/));
});

test("Sanity image links still come from cdn.sanity.io for this project and dataset", () => {
  const image = { asset: { _ref: "image-abc123-400x600-png" } };
  assert.equal(urlFor(image).width(100).url(), "https://cdn.sanity.io/images/021qtoci/production/abc123-400x600.png?w=100");
  assert.match(speakerPhotoUrl(image, 200), /^https:\/\/cdn\.sanity\.io\/images\/021qtoci\/production\/abc123-400x600\.png\?.*w=200&h=200&fit=crop/);
});

test("vercel.json: public images cached for a day; /assets, the app's icons, hero and brochure keep their longer rules", () => {
  const vercel = JSON.parse(read("vercel.json"));
  assert.equal(Object.keys(vercel)[0], "git");
  assert.deepEqual(vercel.git, { deploymentEnabled: { main: true, "**": false } });
  const cache = (url) => route(vercel, url, () => true).headers["cache-control"];
  const DAY = "public, max-age=86400, stale-while-revalidate=604800";
  const MONTH = "public, max-age=2592000, stale-while-revalidate=86400";
  for (const url of ["/Tech_Festival_Canada_Logo_Dark_Transparent.webp", "/venue3.avif", "/ft-expo.jpg", "/swag/swag-kit-600.jpg",
    "/favicon.ico", "/og-image-2026.png", "/a.jpeg", "/a.svg"]) assert.equal(cache(url), DAY, url);
  assert.equal(cache("/assets/main-abc123.js"), "public, max-age=31536000, immutable");
  assert.equal(cache("/assets/logo-abc123.png"), "public, max-age=31536000, immutable");
  for (const url of ["/app/icons/icon-192.png", "/app/brand/logo.png", "/hero-poster.jpg", "/brochure-cover.jpg"]) assert.equal(cache(url), MONTH, url);
  assert.equal(cache("/app/sw.js"), "no-cache");
  for (const url of ["/", "/speakers", "/awards", "/resources"]) assert.equal(cache(url), undefined, url);
});

test("index.html: no Google Sign-In script (the sign-in pop-up fetches it) and no favicon.svg; the other icons stay", () => {
  const html = read("index.html");
  assert.doesNotMatch(html, /<script[^>]*accounts\.google\.com\/gsi\/client/);
  assert.doesNotMatch(html, /favicon\.svg/);
  assert.match(html, /<link rel="icon"[^>]*href="\/favicon\.ico"/);
  assert.match(html, /<link rel="apple-touch-icon"[^>]*href="\/apple-touch-icon\.png"/);
  assert.match(read("src/components/AuthModal.jsx"), /"https:\/\/accounts\.google\.com\/gsi\/client"/);
});

test("pages other than Home, and the pop-ups that start closed, are loaded on demand", () => {
  // NotFound (the few-line "page not found") may stay in the main script; every other page is React.lazy.
  const app = read("src/App.jsx");
  const eager = [...app.matchAll(/^import\s+\w+\s+from\s+"\.\/pages\/([^"]+)"/gm)].map((m) => m[1]).filter((p) => p !== "NotFound");
  assert.deepEqual(eager, ["Home"]);
  assert.match(app, /<Suspense fallback=\{.*\/>\}>\s*<Routes>/);
  const home = read("src/pages/Home.jsx");
  for (const modal of ["InquiryModal", "PostPurchaseModal", "OnboardingSurvey"]) {
    assert.doesNotMatch(home, new RegExp(`^import ${modal}\\b`, "m"), modal);
    assert.match(home, new RegExp(`const ${modal} = lazy\\(`), modal);
  }
  const nav = read("src/components/Navbar.tsx");
  assert.doesNotMatch(nav, /^import AuthModal\b/m);
  assert.match(nav, /const AuthModal = lazy\(/);
});

const MAGIC = {
  png: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  webp: (b) => b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP",
  avif: (b) => b.toString("latin1", 4, 12) === "ftypavif",
};

test("images: the files the pages now use exist and are what their names say; the old names are gone from the code", () => {
  for (const f of ["Tech_Festival_Canada_Logo_Dark_Transparent.webp", "Tech_Festival_Canada_Logo_Light_Transparent.webp",
    "awards-trophy-single.webp", "toronto-skyline.jpg", "venue1.webp", "venue3.avif", "venue5.webp",
    "Tech_Festival_Canada_Logo_Dark_Transparent.png" /* the certificate's (src/lib/certificate.js) */]) {
    const ext = f.split(".").pop();
    assert.ok(MAGIC[ext](bytes(`public/${f}`)), `public/${f} is not a ${ext}`);
  }
  const OLD = ["/awards-trophy-single.png", "/toronto-skyline.png", "/venue1.jpg", "/venue3.jpg", "/venue5.jpg"];
  const code = readdirSync(new URL("src/", ROOT), { recursive: true })
    .filter((f) => /\.(jsx?|tsx?|mjs|css|html)$/.test(f) && !f.endsWith(".test.mjs"))
    .map((f) => [`src/${f}`, read(`src/${f}`)]);
  code.push(["index.html", read("index.html")]);
  for (const [file, text] of code) for (const old of OLD) assert.ok(!text.includes(old), `${file} still uses ${old}`);
});

/** A JPEG's [width, height], from its first frame header. */
function jpegSize(b) {
  for (let i = 2; i < b.length;) {
    const marker = b[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}

test("/resources: each photo's width and height are its real size; all but the first wait until they're near the screen", () => {
  const page = read("src/pages/Resources.jsx");
  const rows = [...page.matchAll(/<ContentRow[\s\S]*?image="([^"]+)"\s+imageSize=\{\[(\d+), (\d+)\]\}(\s+lazy)?/g)];
  assert.equal(rows.length, 6);
  rows.forEach(([, src, w, h, lazy], i) => {
    assert.deepEqual([Number(w), Number(h)], jpegSize(bytes(`public${src}`)), src);
    assert.equal(Boolean(lazy), i > 0, src);
  });
});

test("vercel.json: the old addresses of renamed or converted images go straight to the new file (308)", () => {
  const vercel = JSON.parse(read("vercel.json"));
  const moved = {
    "/awards-trophy-single.png": "/awards-trophy-single.webp", "/venue1.jpg": "/venue1.webp", "/venue3.jpg": "/venue3.avif",
    "/venue5.jpg": "/venue5.webp", "/toronto-skyline.png": "/toronto-skyline.jpg",
  };
  const inPublic = new Set(readdirSync(new URL("../../public/", import.meta.url)));
  for (const [from, to] of Object.entries(moved)) {
    const r = route(vercel, from, (p) => inPublic.has(p.slice(1)));
    assert.deepEqual([r.status, r.location], [308, to], from);
    assert.ok(inPublic.has(to.slice(1)), `${to} is in public/`);
    assert.ok(!inPublic.has(from.slice(1)), `${from} is gone from public/`);
  }
});
