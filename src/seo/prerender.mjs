/* =========================================================
   The build's prerender (Oct 31 2026), run by vite.config.js
   (ttfcPrerender) once the site is built. Static files only: no
   Vercel functions, no middleware.
   Before, every address answered the same index.html: one title,
   one description, a canonical pointing every page at the home
   page, no H1 and no links for crawlers and link previews that
   don't run JavaScript (LinkedIn, WhatsApp, Slack, Bing at times).
   Now, from the built index.html (scripts, the stale-deploy reload
   and styles untouched):
     - <page>/index.html for every page in src/seo/routes.js, every
       speaker (/speakers/<slug>, Sanity's public CDN, the query the
       site already uses) and every Catalyst Awards winner
       (/awards/winners/<id>, GET {API}/awards/winners): its own
       title, description, canonical, og: / twitter: tags, robots,
       JSON-LD (BreadcrumbList on nested pages, Person for speakers;
       the Event only on /) and a <noscript> outline with its one
       H1, intro and plain links (/speakers and /awards list every
       speaker and winner);
     - index.html: the home page's copy;
     - spa.html: the plain site without the home page's canonical,
       og:url or Event, which vercel.json serves for every other
       address (noindex pages, unknown addresses, a speaker added
       after the deploy: <RouteSeo> fixes the head in the browser);
     - sitemap.xml: every indexable page, speaker and winner (www,
       no noindex or unlisted address; speakers with their photo's
       original file, no size or quality parameters).
   Short timeouts: if Sanity or the API doesn't answer (Render can
   take a while to wake: two tries), the fixed pages are written
   anyway, a warning is printed and the build goes on.
   TTFC_PRERENDER_OFFLINE=1 skips both fetches.
========================================================= */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PAGES, SITE_LINKS, canonicalUrl, isWinnerId, pageMeta, sanityImage, speakerMeta, winnerMeta } from "./routes.js";
import { speakerSlug } from "./slug.js";

const SPEAKER_QUERY = '*[_type == "speaker"] { _id, _updatedAt, name, title, company, bio, linkedin, image }';
export const SANITY_URL = `https://021qtoci.apicdn.sanity.io/v2024-01-01/data/query/production?query=${encodeURIComponent(SPEAKER_QUERY)}`;
export const API = (process.env.VITE_API_URL || "https://techfest-canada-backend.onrender.com/api").replace(/\/+$/, "");

/* ---------- HTML ---------- */

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** JSON for a <script> (no "</script>" can end it early). */
const scriptJson = (o) => JSON.stringify(o).replace(/</g, "\\u003c");

const tagRe = (attr, key) => new RegExp(`[ \\t]*<meta\\s+${attr}="${escRe(key)}"[^>]*>\\n?`);
const descriptionRe = /<meta\s+name="description"[^>]*>\n?/;

/** A <meta attr="key"> set, removed (null) or added after the description. */
function setMeta(html, attr, key, value) {
  const re = tagRe(attr, key);
  const tag = value === null || value === undefined ? "" : `    <meta ${attr}="${key}" content="${esc(value)}" />\n`;
  if (re.test(html)) return html.replace(re, () => tag); // functions throughout: a "$&" in a bio stays text
  return tag ? html.replace(descriptionRe, (m) => `${m}${tag}`) : html;
}

/** The built index.html with a page's head and outline. page: routes.js pageMeta / speakerMeta / winnerMeta (+ lists). */
export function renderPage(shell, page) {
  let html = shell;
  if (!/<title>[\s\S]*?<\/title>/.test(html) || !descriptionRe.test(html) || !html.includes('<div id="root"></div>')) {
    throw new Error("prerender: the built index.html has no <title>, description or #root");
  }
  html = html.replace(/[ \t]*<!-- SEO\.[\s\S]*?-->\n/, ""); // index.html's note about itself (spa.html keeps it)
  html = html.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(page.title)}</title>`);
  html = setMeta(html, "name", "description", page.description);
  html = html.replace(/[ \t]*<link\s+rel="canonical"[^>]*>\n?/g, "");
  if (page.canonical) html = html.replace(descriptionRe, (m) => `${m}    <link rel="canonical" href="${esc(page.canonical)}" />\n`);
  html = setMeta(html, "name", "robots", null);
  if (page.robots) html = html.replace(descriptionRe, (m) => `${m}    <meta name="robots" content="${esc(page.robots)}" data-seo />\n`);
  const image = page.image;
  for (const [attr, key, value] of [
    ["property", "og:title", page.title], ["property", "og:description", page.description], ["property", "og:url", page.canonical ?? null],
    ["property", "og:image", image.url], ["property", "og:image:width", image.width ? String(image.width) : null],
    ["property", "og:image:height", image.height ? String(image.height) : null], ["property", "og:image:alt", image.alt],
    ["name", "twitter:title", page.title], ["name", "twitter:description", page.description],
    ["name", "twitter:image", image.url], ["name", "twitter:image:alt", image.alt],
  ]) html = setMeta(html, attr, key, value);
  if (!page.keepEvent) html = withoutEvent(html);
  const head = (tag) => { html = html.replace(/([ \t]*)<\/head>/, (m, indent) => `    ${tag}\n${indent}</head>`); };
  if (page.jsonLd) head(`<script type="application/ld+json" id="ld-page">${scriptJson(page.jsonLd)}</script>`);
  head(`<noscript><style>${OUTLINE_CSS}</style></noscript>`);
  return html.replace(/([ \t]*)<div id="root"><\/div>/, (m, indent) => `${indent}${outline(page)}\n${indent}<div id="root"></div>`);
}

/** The Event JSON-LD (index.html, id="ld-event") off, with its comment. */
function withoutEvent(html) {
  return html
    .replace(/[ \t]*<!-- Structured Data: Event[^]*?-->\n(?=[ \t]*<script type="application\/ld\+json" id="ld-event">)/, "")
    .replace(/[ \t]*<script type="application\/ld\+json" id="ld-event">[\s\S]*?<\/script>\n?/, "");
}

/** dist/spa.html: the plain site for every address without its own file (no canonical, og:url or Event). */
export function spaShell(shell) {
  return withoutEvent(setMeta(shell.replace(/[ \t]*<link\s+rel="canonical"[^>]*>\n?/g, ""), "property", "og:url", null));
}

const OUTLINE_CSS = ".ttfc-outline{display:block;max-width:760px;margin:0 auto;padding:110px 20px 56px;font:16px/1.65 system-ui,sans-serif;color:#fff;background:#06020f}.ttfc-outline a{color:#c4adff}";

const link = ([href, text]) => `<a href="${esc(href)}">${esc(text)}</a>`;

/** The <noscript> outline: the trail (nested pages), the one H1, the intro, the page's links and lists, the site's links. */
export function outline(page) {
  const parts = [];
  if (page.crumbs?.length > 2) {
    parts.push(`<nav class="tfc-nav" aria-label="Breadcrumb">${page.crumbs.map((c, i) => (i === page.crumbs.length - 1 ? esc(c.name) : link([c.path, c.name]))).join(" › ")}</nav>`);
  }
  parts.push(`<h1>${esc(page.h1)}</h1>`);
  if (page.intro) parts.push(`<p>${esc(page.intro)}</p>`);
  for (const list of page.lists || []) {
    parts.push(`<h2>${esc(list.heading)}</h2>`, `<ul>${list.items.map(([href, text, note]) => `<li>${link([href, text])}${esc(note || "")}</li>`).join("")}</ul>`);
  }
  if (page.links?.length) parts.push(`<ul>${page.links.map((l) => `<li>${link(l)}</li>`).join("")}</ul>`);
  // class="tfc-nav": the site's styles.css turns any other <nav> into the sticky menu bar.
  parts.push(`<nav class="tfc-nav" aria-label="The Tech Festival Canada">${SITE_LINKS.map(link).join(" · ")}</nav>`);
  return `<noscript><main class="ttfc-outline">${parts.join("")}</main></noscript>`;
}

/* ---------- sitemap.xml ---------- */

/** [{ loc, lastmod?, image? }] → sitemap.xml (with Google's image extension). */
export function sitemapXml(entries) {
  const urls = entries.map((e) => [
    "  <url>",
    `    <loc>${esc(e.loc)}</loc>`,
    ...(e.lastmod ? [`    <lastmod>${esc(e.lastmod)}</lastmod>`] : []),
    ...(e.image ? ["    <image:image>", `      <image:loc>${esc(e.image)}</image:loc>`, "    </image:image>"] : []),
    "  </url>",
  ].join("\n"));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join("\n")}\n</urlset>\n`;
}

/* ---------- live data ---------- */

async function fetchJson(url, { timeoutMs, tries }) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

/** The published speakers, one per slug (the first, as the profile page finds them). */
export async function loadSpeakers() {
  const body = await fetchJson(SANITY_URL, { timeoutMs: 10000, tries: 2 });
  if (!Array.isArray(body?.result)) throw new Error("no result");
  return uniqueSpeakers(body.result);
}

export function uniqueSpeakers(docs) {
  const seen = new Set();
  return docs.filter((d) => {
    const slug = speakerSlug(d?.name);
    if (!slug || seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });
}

/** The winners on show (none while the switch is off). */
export async function loadWinners() {
  const body = await fetchJson(`${API}/awards/winners`, { timeoutMs: 20000, tries: 2 });
  if (!body || !Array.isArray(body.winners)) throw new Error("no winners list");
  return body.live ? body.winners.filter((w) => isWinnerId(String(w?.id || ""))) : [];
}

/* ---------- the whole site ---------- */

const byName = (a, b) => a.name.localeCompare(b.name, "en");

/** Every file's page record, from the routes and the live data. */
export function sitePages({ speakers = [], winners = [] } = {}) {
  const people = speakers.map((d) => ({ ...speakerMeta(d), updatedAt: d._updatedAt, photo: sanityImage(d.image) })).sort(byName);
  const awards = winners.map(winnerMeta);
  const pages = PAGES.map((p) => {
    const m = pageMeta(p);
    if (p.path === "/") return { ...m, keepEvent: true };
    if (p.path === "/speakers" && people.length) {
      return { ...m, lists: [{ heading: "The speakers", items: people.map((s) => [s.path, s.name, s.about ? `, ${s.about}` : ""]) }] };
    }
    if (p.path === "/awards" && awards.length) {
      return {
        ...m,
        intro: `The results are out. Meet the winners of the Catalyst Awards 2026. ${m.intro}`,
        lists: [{ heading: "The winners", items: awards.map((w) => [w.path, w.h1, `: ${w.award}`]) }],
      };
    }
    return m;
  });
  return { pages, people, awards };
}

const SAFE_PATH = /^\/[a-z0-9-]+(\/[a-z0-9-]+)*$/;

/**
 * Writes the pages, spa.html and sitemap.xml into outDir. shell: the built index.html; data: { speakers, winners }
 * instead of fetching them (tests). → { pages, speakers, winners, urls, warnings }
 */
export async function prerenderSite({ outDir, shell, data, fetchData = process.env.TTFC_PRERENDER_OFFLINE !== "1", warn = console.warn }) {
  const warnings = [];
  const note = (m) => { warnings.push(m); warn(m); };
  let speakers = data ? uniqueSpeakers(data.speakers || []) : [];
  let winners = data ? (data.winners || []).filter((w) => isWinnerId(String(w?.id || ""))) : [];
  if (fetchData && !data) {
    const [s, w] = await Promise.allSettled([loadSpeakers(), loadWinners()]);
    if (s.status === "fulfilled") speakers = s.value;
    else note(`prerender: speakers not loaded from Sanity (${s.reason?.message || s.reason}); their pages fall back to the plain site`);
    if (w.status === "fulfilled") winners = w.value;
    else note(`prerender: award winners not loaded from the API (${w.reason?.message || w.reason}); their pages fall back to the plain site`);
  }
  const { pages, people, awards } = sitePages({ speakers, winners });

  const write = (path, html) => {
    if (path === "/") return writeFileSync(join(outDir, "index.html"), html);
    if (!SAFE_PATH.test(path)) return note(`prerender: skipped ${JSON.stringify(path)} (not a plain address)`);
    const dir = join(outDir, ...path.slice(1).split("/"));
    if (existsSync(join(dir, "index.html"))) return note(`prerender: skipped ${path} (the build already has a file there)`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), html);
  };

  writeFileSync(join(outDir, "spa.html"), spaShell(shell));
  for (const p of [...pages, ...people, ...awards]) write(p.path, renderPage(shell, p));

  const entries = [
    ...pages.filter((p) => p.sitemap).map((p) => ({ loc: canonicalUrl(p.path) })),
    ...people.map((s) => ({ loc: s.url, lastmod: /^\d{4}-\d{2}-\d{2}T/.test(s.updatedAt || "") ? s.updatedAt : undefined, image: s.photo?.url })),
    ...awards.map((w) => ({ loc: w.url })),
  ];
  writeFileSync(join(outDir, "sitemap.xml"), sitemapXml(entries));
  return { pages: pages.length, speakers: people.length, winners: awards.length, urls: entries.length, warnings };
}
