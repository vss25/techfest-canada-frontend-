import { useEffect } from "react";

/* =========================================================
   A page's head for search engines and link previews, put back
   when leaving. useSeo(title, description, more):
     - title / description: also og: and twitter: (as before);
     - more.canonical: the canonical URL, also og:url (null = none);
     - more.robots: <meta name="robots" data-seo> (null = none);
     - more.image: { url, width, height, alt } for og: / twitter:;
     - more.jsonLd: the page's own JSON-LD, <script id="ld-page">;
     - more.level: 0 for <RouteSeo> (every route's defaults, from
       src/seo/routes.js), pages 1 (the default).
   Since Oct 31 2026 several of these run at once (<RouteSeo> in
   App.jsx and the page inside it), so each call is an entry and
   the head shows them merged: a page's values over the route's,
   whatever order React runs them in. A value nobody sets is left
   alone; when the last entry setting it goes, it's put back as it
   was (the HTML the build wrote for this address).
   Used by <RouteSeo>, /stay-updated, /programme, the speaker and
   award winner pages and the not-found page.
========================================================= */

const meta = (attr, key, extra = "") => ({
  sel: `meta[${attr}="${key}"]${extra}`,
  make: () => {
    const el = document.createElement("meta");
    el.setAttribute(attr, key);
    if (extra) el.setAttribute("data-seo", "");
    return el;
  },
  read: (el) => el.getAttribute("content"),
  write: (el, v) => el.setAttribute("content", v),
});

/* Each piece of the head, read and written the same way: null = not there. */
const SLOTS = {
  title: { read: () => document.title, write: (v) => { document.title = v ?? ""; } },
  description: meta("name", "description"),
  "og:title": meta("property", "og:title"),
  "og:description": meta("property", "og:description"),
  "og:url": meta("property", "og:url"),
  "og:image": meta("property", "og:image"),
  "og:image:width": meta("property", "og:image:width"),
  "og:image:height": meta("property", "og:image:height"),
  "og:image:alt": meta("property", "og:image:alt"),
  "twitter:title": meta("name", "twitter:title"),
  "twitter:description": meta("name", "twitter:description"),
  "twitter:image": meta("name", "twitter:image"),
  "twitter:image:alt": meta("name", "twitter:image:alt"),
  // Its own tag: pages that add a robots tag themselves (Rsvp, Survey…) keep theirs.
  robots: meta("name", "robots", "[data-seo]"),
  canonical: {
    sel: 'link[rel="canonical"]',
    make: () => Object.assign(document.createElement("link"), { rel: "canonical" }),
    read: (el) => el.getAttribute("href"),
    write: (el, v) => el.setAttribute("href", v),
  },
  jsonLd: {
    sel: "script#ld-page",
    make: () => Object.assign(document.createElement("script"), { type: "application/ld+json", id: "ld-page" }),
    read: (el) => el.textContent,
    write: (el, v) => { el.textContent = v; },
  },
};

function get(key) {
  const s = SLOTS[key];
  if (!s.sel) return s.read();
  const el = document.head.querySelector(s.sel);
  return el ? s.read(el) : null;
}

function put(key, value) {
  const s = SLOTS[key];
  if (!s.sel) return s.write(value);
  let el = document.head.querySelector(s.sel);
  if (value === null || value === undefined) { if (el) el.remove(); return; }
  if (!el) { el = s.make(); document.head.appendChild(el); }
  s.write(el, value);
}

/** An entry's pieces of the head: only what it sets (undefined = left to the others). */
function slotsOf({ title, description, canonical, robots, image, jsonLd }) {
  const out = {};
  if (title !== undefined) Object.assign(out, { title, "og:title": title, "twitter:title": title });
  if (description !== undefined) Object.assign(out, { description, "og:description": description, "twitter:description": description });
  if (canonical !== undefined) Object.assign(out, { canonical, "og:url": canonical });
  if (robots !== undefined) out.robots = robots;
  if (image !== undefined) {
    const alt = image?.alt ?? null;
    Object.assign(out, {
      "og:image": image?.url ?? null, "twitter:image": image?.url ?? null, "og:image:alt": alt, "twitter:image:alt": alt,
      "og:image:width": image?.width ? String(image.width) : null, "og:image:height": image?.height ? String(image.height) : null,
    });
  }
  if (jsonLd !== undefined) out.jsonLd = jsonLd === null ? null : JSON.stringify(jsonLd);
  return out;
}

const entries = [];       // { id, level, slots }
const before = new Map(); // a piece some entry sets → how it was before any did
let nextId = 0;

function apply() {
  const merged = {};
  [...entries].sort((a, b) => a.level - b.level || a.id - b.id).forEach((e) => Object.assign(merged, e.slots));
  for (const [key, was] of before) {
    if (key in merged) continue;
    put(key, was);
    before.delete(key);
  }
  for (const [key, value] of Object.entries(merged)) {
    if (!before.has(key)) before.set(key, get(key));
    put(key, value);
  }
}

export default function useSeo(title, description, more = {}) {
  const { level = 1, ...rest } = more;
  // One string for the effect, so a new object on each render doesn't re-run it (undefined = not set).
  const spec = JSON.stringify({ title, description, ...rest });
  useEffect(() => {
    const entry = { id: nextId++, level, slots: slotsOf(JSON.parse(spec)) };
    entries.push(entry);
    apply();
    return () => {
      entries.splice(entries.indexOf(entry), 1);
      apply();
    };
  }, [spec, level]);
}
