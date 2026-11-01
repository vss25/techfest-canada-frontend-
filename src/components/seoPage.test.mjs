/* node --test src/components/seoPage.test.mjs: the page-level SEO fixes of Oct 31 2026 stay in place. One <h1> on
   Home, /awards and /privacy; every <img> on the public pages has an alt, and every local file it names is in public/
   (a missing one, like the old /exhibit-hero-bg.png, is answered with the SPA's HTML); the winner cards are real links
   to the winners' pages; the footer's Explore links go to routed pages, not redirects; the logos and trophies carry
   their files' own width/height; no template stats or filler on About. */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { matchRoutes } from "react-router";

const ROOT = new URL("../../", import.meta.url);
const read = (rel) => readFileSync(new URL(rel, ROOT), "utf8");
// The code without its comments ({/* … */} too, and whole-line //), so a comment that names a tag doesn't count.
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const imgTags = (rel) => [...code(rel).matchAll(/<(?:motion\.)?img\b[\s\S]*?\/>/g)].map((m) => m[0]);
const PUBLIC_UI = ["src/pages", "src/components"].flatMap((d) =>
  readdirSync(new URL(`${d}/`, ROOT)).filter((n) => /\.(jsx|tsx)$/.test(n)).map((n) => `${d}/${n}`));

/** An image's width and height from its header: PNG (IHDR) or WebP (VP8L lossless, VP8X, VP8). */
function imageSize(rel) {
  const b = readFileSync(new URL(rel, ROOT));
  if (b.toString("latin1", 1, 4) === "PNG") return [b.readUInt32BE(16), b.readUInt32BE(20)];
  assert.equal(b.toString("latin1", 0, 4) + b.toString("latin1", 8, 12), "RIFFWEBP", `${rel} is a PNG or a WebP`);
  const chunk = b.toString("latin1", 12, 16);
  if (chunk === "VP8L") { const v = b.readUInt32LE(21); return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1]; }
  if (chunk === "VP8X") return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
  return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff]; // VP8 (lossy)
}

test("one <h1> on Home, /awards and /privacy", () => {
  for (const f of ["src/pages/Home.jsx", "src/pages/Awards.jsx", "src/pages/Privacy.jsx"]) {
    assert.equal(code(f).match(/<(?:motion\.)?h1[\s>]/g)?.length ?? 0, 1, f);
  }
  // Privacy: the four policy titles are the <h1>'s <h2>s.
  assert.match(code("src/pages/Privacy.jsx"), /<h2 style=\{\{[\s\S]*?\}\}>\{title\}<\/h2>/);
});

test("every <img> on the public pages has an alt, and every local file it names is in public/", () => {
  const problems = [];
  for (const f of PUBLIC_UI) {
    for (const tag of imgTags(f)) {
      if (!/\balt=/.test(tag)) problems.push(`${f}: no alt in ${tag.slice(0, 80)}`);
      for (const [, p] of tag.matchAll(/\bsrc="(\/[^"?#]+)/g)) {
        if (!existsSync(new URL(`public${p}`, ROOT))) problems.push(`${f}: ${p} isn't in public/`);
      }
    }
  }
  assert.deepEqual(problems, []);
  assert.doesNotMatch(code("src/pages/Exhibit.jsx"), /exhibit-hero-bg/);
});

test("the winner cards are links to the winners' pages; only a plain left click opens the dialog instead", () => {
  const s = code("src/components/AwardWinnersSection.jsx");
  assert.match(s, /<a href=\{`\/awards\/winners\/\$\{w\.id\}`\} className="aw-winner-card" aria-haspopup="dialog"/);
  assert.doesNotMatch(s, /<button[^>]*aw-winner-card/);
  assert.match(s, /onClick=\{\(e\) => \{ if \(!plainClick\(e\)\) return; e\.preventDefault\(\); onOpen\(w\); \}\}/);
  const fn = s.match(/const plainClick = (\(e\) => [^;]+);/);
  const plainClick = new Function(`return ${fn[1]};`)();
  const click = (o = {}) => ({ button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...o });
  assert.equal(plainClick(click()), true);
  for (const o of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
    assert.equal(plainClick(click(o)), false, JSON.stringify(o));
  }
});

test("the footer's Explore links go to pages App.jsx routes (not redirects), the formerly orphaned ones included", () => {
  const list = code("src/components/Footer.jsx").match(/const EXPLORE = \[([\s\S]*?)\];/)[1];
  const links = [...list.matchAll(/to: "([^"]+)"/g)].map((m) => m[1]);
  const routes = [...read("src/App.jsx").matchAll(/<Route\s+path="([^"]+)"\s+element=\{<(\w+)/g)]
    .map((m) => ({ path: m[1], redirect: m[2] === "Navigate" }));
  assert.ok(routes.length > 30, "found the site's routes");
  for (const to of links) {
    const hit = matchRoutes(routes, to)?.at(-1)?.route;
    assert.ok(hit, `${to} has a route`);
    assert.equal(hit.redirect, false, `${to} isn't a redirect`);
  }
  for (const orphan of ["/partners2026", "/exhibit", "/volunteer", "/organizers", "/media", "/contact", "/venue"]) {
    assert.ok(links.includes(orphan), orphan);
  }
  assert.equal(new Set(links).size, links.length, "no link twice");
});

test("the logos and trophies carry their files' own width and height (their space is kept while they load)", () => {
  const [dw, dh] = imageSize("public/Tech_Festival_Canada_Logo_Dark_Transparent.webp");
  const [lw, lh] = imageSize("public/Tech_Festival_Canada_Logo_Light_Transparent.webp");
  const [tw, th] = imageSize("public/awards-trophy-single.webp");
  const sized = (tag, w, h) => new RegExp(`\\bwidth=\\{${w}\\}\\s+height=\\{${h}\\}`).test(tag);

  const homeLogo = imgTags("src/pages/Home.jsx").filter((t) => t.includes('src="/Tech_Festival_Canada_Logo_Dark_Transparent.webp"'));
  assert.equal(homeLogo.length, 1);
  assert.ok(sized(homeLogo[0], dw, dh), homeLogo[0]);

  const trophies = imgTags("src/pages/Awards.jsx").filter((t) => t.includes('src="/awards-trophy-single.webp"'));
  assert.equal(trophies.length, 3);
  for (const t of trophies) assert.ok(sized(t, tw, th), t);

  // The menu's logo: the dark or the light file, each with its own size.
  assert.match(code("src/components/Navbar.tsx"), new RegExp(`width=\\{dark \\? ${dw} : ${lw}\\} height=\\{dark \\? ${dh} : ${lh}\\}`));
});

test("About: no template stats and no filler text while it loads", () => {
  const s = code("src/components/AboutUs.tsx");
  assert.doesNotMatch(s, /INITIALIZING|Builds Completed|Success Rate|Event Years/);
  assert.match(s, /const FALLBACK_STATS = \[\]/);
});
