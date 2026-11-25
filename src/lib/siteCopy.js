import { client } from "../utils/sanity";
import { cssUrls, fitSpaces, indexRules, isCopy, lookup, mediaKey, pageKey, squash } from "./siteCopyRules";

/* =========================================================
   Website text & media (Nov 25 2026): "every piece of content on the public website editable from
   the admin panel, with a preview of that element".

   Most of the website's wording and pictures are built into its pages (the approved design's own
   text, the older pages' headings, buttons, form labels…). Instead of one field per sentence, staff
   change any of it in Admin › Content › Website text & media, and this file puts their changes on
   the page: a row of the "siteCopy" document says "where the site shows <built-in text or file>,
   show <this> instead" (everywhere, or on one page).

   How: once the page is drawn, text and pictures that match a row are swapped, and a
   MutationObserver does the same for whatever React draws later. Only a text node's value or an
   attribute is ever changed (never the elements), so React keeps working; what React wrote is
   remembered, so removing a row puts the built-in content back. With no rows nothing runs at all:
   the site is exactly as built until someone edits.

   Rows are read like all other content (the published document; staged drafts for staff on the
   staging site), and kept in this browser so a returning visitor sees them from the first paint.

   Inside the staff panel's preview (an <iframe> named EDIT_FRAME, same origin) the rows come from
   the editor as the person types, and this file also reports what is on the page (the list staff
   pick from), outlines the piece being edited and lets staff click a piece to edit it.
========================================================= */

export const EDIT_FRAME = "ttfc-copy-edit";
const MSG = "ttfc-copy:";
const CACHE = "ttfc.siteCopy.v1";
const QUERY = `*[_id == "siteCopy"][0]{ texts[]{ match, page, text }, media[]{ match, page, url, alt } }`;

const TEXT_ATTRS = ["placeholder", "alt", "title", "aria-label"];
const MEDIA_ATTRS = { IMG: ["src"], VIDEO: ["src", "poster"], SOURCE: ["src"] };
const WATCHED = [...TEXT_ATTRS, "src", "poster", "style"];
const SKIP = "script,style,noscript,textarea,svg,[contenteditable],[data-nocopy]";
// Staff tools and private pages: never touched.
const OFF = /^\/(admin|admin-login|checkin|awards\/jury-admin|fact-sheet|auth-success|reset-password)(\/|$)/i;

// Production has no staged-content preview yet (lib/preview.js is on the redesign branch): published rows only.
const isPreview = () => false;

let rules = indexRules(null);
let editing = false;
let observer = null;
let page = "/";
const textState = new WeakMap(); // Text → { raw, out }: what React wrote, what we show
const attrState = new WeakMap(); // Element → { [attribute]: { raw, out } }

const on = () => !OFF.test(window.location.pathname);
const skipped = (el) => !el || !!el.closest(SKIP);

/* ---------- Swapping one piece ---------- */

function applyText(n) {
  if (skipped(n.parentElement)) return;
  const st = textState.get(n);
  let raw = n.nodeValue;
  if (st && st.out === raw) raw = st.raw;
  let out = raw;
  if (on()) {
    const key = squash(raw);
    const t = key ? lookup(rules.texts, page, key) : undefined;
    if (t !== undefined) out = fitSpaces(raw, t);
  }
  if (out === raw) { if (st) textState.delete(n); } else textState.set(n, { raw, out });
  if (n.nodeValue !== out) n.nodeValue = out;
}

/** The value React wrote for an attribute (ours undone), and a way to show another. */
function attrSlot(el, name, read, write) {
  const all = attrState.get(el);
  const st = all && all[name];
  let raw = read();
  if (st && st.out === raw) raw = st.raw;
  return {
    raw,
    show(out) {
      if (out === raw) { if (all) delete all[name]; } else attrState.set(el, { ...(all || {}), [name]: { raw, out } });
      if (read() !== out) { write(out); return true; }
      return false;
    },
  };
}
const plainAttr = (el, name) => attrSlot(el, name, () => el.getAttribute(name), (v) => { if (v == null) el.removeAttribute(name); else el.setAttribute(name, v); });

function mediaRuleFor(el) {
  const names = MEDIA_ATTRS[el.tagName];
  if (!names || !on()) return undefined;
  const all = attrState.get(el);
  const raw = all && all.src ? all.src.raw : el.getAttribute("src");
  const key = raw ? mediaKey(raw, window.location.origin) : "";
  return key ? lookup(rules.media, page, key) : undefined;
}

function applyElement(el, only) {
  if (el.nodeType !== 1 || skipped(el)) return;
  const live = on();
  for (const name of TEXT_ATTRS) {
    if ((only && only !== name) || !el.hasAttribute(name)) continue;
    const slot = plainAttr(el, name);
    let out = slot.raw;
    const swap = name === "alt" ? mediaRuleFor(el) : undefined;
    if (swap && swap.alt) out = swap.alt;
    else if (live) { const key = squash(slot.raw); const t = key ? lookup(rules.texts, page, key) : undefined; if (t !== undefined) out = t; }
    slot.show(out);
  }
  for (const name of MEDIA_ATTRS[el.tagName] || []) {
    if ((only && only !== name) || !el.hasAttribute(name)) continue;
    const slot = plainAttr(el, name);
    const key = live ? mediaKey(slot.raw, window.location.origin) : "";
    const m = key ? lookup(rules.media, page, key) : undefined;
    const changed = slot.show(m ? m.url : slot.raw);
    if (name === "src" && el.tagName === "IMG") {
      // A swapped picture mustn't be overruled by the built-in one's srcset.
      const set = attrSlot(el, "srcset", () => el.getAttribute("srcset"), (v) => { if (v == null) el.removeAttribute("srcset"); else el.setAttribute("srcset", v); });
      if (set.raw != null || m) set.show(m ? null : set.raw);
      if (m && m.alt && !only) applyElement(el, "alt");
    }
    if (changed && el.tagName === "SOURCE" && el.parentElement && el.parentElement.load) { try { el.parentElement.load(); } catch { /* not a media element */ } }
  }
  if ((!only || only === "style") && el.style) {
    const slot = attrSlot(el, "bg", () => el.style.backgroundImage || "", (v) => { el.style.backgroundImage = v; });
    if (slot.raw.includes("url(")) {
      let out = slot.raw;
      if (live) for (const u of cssUrls(slot.raw)) {
        const key = mediaKey(u.url, window.location.origin);
        const m = key ? lookup(rules.media, page, key) : undefined;
        if (m) out = out.replace(u.whole, `url("${m.url}")`);
      }
      slot.show(out);
    } else if (attrState.get(el) && attrState.get(el).bg) slot.show(slot.raw);
  }
}

function applyTree(root) {
  if (!root) return;
  if (root.nodeType === 3) { applyText(root); return; }
  if (root.nodeType !== 1 || skipped(root)) return;
  applyElement(root);
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeType === 1 && n.matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let n = walk.nextNode(); n; n = walk.nextNode()) { if (n.nodeType === 3) applyText(n); else applyElement(n); }
}

/* ---------- Keeping up with the page ---------- */

function onMutations(list) {
  const now = pageKey(window.location.pathname);
  let drawn = false;
  if (now !== page) { page = now; applyTree(document.body); drawn = true; }
  else for (const m of list) {
    if (m.type === "characterData") { applyText(m.target); drawn = drawn || !skipped(m.target.parentElement); }
    else if (m.type === "attributes") applyElement(m.target, m.attributeName);
    else for (const n of m.addedNodes) { applyTree(n); drawn = drawn || !skipped(n.nodeType === 1 ? n : n.parentElement); }
  }
  if (editing && drawn) { stale = true; scheduleCatalog(); }
}

function watch(yes) {
  if (yes && !observer && document.body) {
    observer = new MutationObserver(onMutations);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: WATCHED });
  } else if (!yes && observer) { observer.disconnect(); observer = null; }
}

function setRules(doc) {
  rules = indexRules(doc);
  page = pageKey(window.location.pathname);
  const run = () => {
    const need = editing || rules.size > 0;
    if (need) watch(true);
    if (need || observer) applyTree(document.body);   // also puts built-in content back when rows were removed
    if (!need) watch(false);
  };
  if (document.body) run(); else document.addEventListener("DOMContentLoaded", run, { once: true });
}

/* ---------- The staff panel's preview ---------- */

const ROLE = { H1: "Main heading", H2: "Heading", H3: "Heading", H4: "Small heading", H5: "Small heading", H6: "Small heading", BUTTON: "Button", A: "Link", LABEL: "Form label", LI: "List item", P: "Paragraph", SUMMARY: "Question", TH: "Table heading", TD: "Table cell", FIGCAPTION: "Caption", OPTION: "Menu choice" };
const ATTR_ROLE = { placeholder: "Hint inside a form box", alt: "Picture description", title: "Tooltip", "aria-label": "Screen-reader label" };
const roleOf = (el) => { const hit = el.closest("button,a,[role=button],h1,h2,h3,h4,h5,h6,label,summary,figcaption,option,li,p,th,td"); return (hit && (ROLE[hit.tagName] || "Button")) || "Text"; };
const seen = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
const areaOf = (el) => (el.closest("footer") ? "Footer" : el.closest("header,nav,[role=navigation]") ? "Menu" : el.closest("aside,[role=dialog],dialog") ? "Panel or pop-up" : "");
const original = (n) => { const st = textState.get(n); return st ? st.raw : n.nodeValue; };
const originalAttr = (el, name, fallback) => { const all = attrState.get(el); return all && all[name] ? all[name].raw : fallback; };

/** Everything on the page that can be listed: [{ node | el, attr?, kind, key }]. Walked again at most
    every quarter second, and only after the page changed. */
let kept = [];
let keptAt = 0;
let stale = true;
function pieces(fresh) {
  const t = Date.now();
  if (!fresh && (!stale || t - keptAt < 250)) return kept;
  kept = walkPieces(); keptAt = t; stale = false;
  return kept;
}
function walkPieces() {
  const out = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeType === 1 && n.matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (n.nodeType === 3) {
      const key = squash(original(n));
      if (key && isCopy(key)) out.push({ node: n, el: n.parentElement, kind: "text", key });
      continue;
    }
    for (const name of TEXT_ATTRS) {
      if (!n.hasAttribute(name)) continue;
      const key = squash(originalAttr(n, name, n.getAttribute(name)));
      if (key && isCopy(key)) out.push({ el: n, attr: name, kind: "text", key });
    }
    for (const name of MEDIA_ATTRS[n.tagName] || []) {
      if (!n.hasAttribute(name)) continue;
      const key = mediaKey(originalAttr(n, name, n.getAttribute(name)), window.location.origin);
      if (key) out.push({ el: n.tagName === "SOURCE" ? n.parentElement || n : n, attr: name, kind: "media", key, type: name === "poster" || n.tagName === "IMG" || (n.tagName === "SOURCE" && n.parentElement && n.parentElement.tagName === "PICTURE") ? "image" : "video" });
    }
    const bg = originalAttr(n, "bg", n.style ? n.style.backgroundImage : "");
    if (bg && bg.includes("url(")) for (const u of cssUrls(bg)) {
      const key = mediaKey(u.url, window.location.origin);
      if (key) out.push({ el: n, attr: "bg", kind: "media", key, type: "image" });
    }
  }
  return out;
}

let lastCatalog = "";
let catalogTimer = 0;
function sendCatalog(force) {
  const items = new Map();
  let section = "";
  for (const p of pieces(true)) {
    const heading = p.el.closest("h1,h2,h3");
    if (heading && p.kind === "text" && !p.attr) section = squash(heading.textContent).slice(0, 80);
    const id = `${p.kind}\n${p.key}`;
    const visible = seen(p.el);
    const it = items.get(id);
    if (it) {
      it.count += 1; it.visible = it.visible || visible;
      // Wording that is both on the page and a hidden label is listed as what people see.
      if (p.kind === "text" && !p.attr && it.hidden) { it.role = roleOf(p.el); it.hidden = false; it.section = areaOf(p.el) || section; }
      continue;
    }
    const item = { id, kind: p.kind, key: p.key, count: 1, visible, section: areaOf(p.el) || section };
    if (p.kind === "text") {
      item.role = p.attr ? ATTR_ROLE[p.attr] : roleOf(p.el);
      item.hidden = !!p.attr && p.attr !== "placeholder";
      item.now = squash(p.attr ? p.el.getAttribute(p.attr) : p.node.nodeValue);
    } else {
      item.type = p.type;
      item.role = p.attr === "bg" ? "Background picture" : p.type === "video" ? "Video" : /\.gif$/i.test(p.key) ? "GIF" : "Picture";
      const all = attrState.get(p.el);
      item.now = p.attr === "bg" ? ((cssUrls(p.el.style.backgroundImage)[0] || {}).url || "") : (p.el.getAttribute(p.attr) || (p.el.currentSrc || ""));
      item.changed = !!(all && all[p.attr]);
      item.alt = p.el.getAttribute("alt") || "";
    }
    items.set(id, item);
  }
  const body = JSON.stringify({ path: page, items: [...items.values()] });
  if (!force && body === lastCatalog) return;
  lastCatalog = body;
  window.parent.postMessage({ type: `${MSG}catalog`, ...JSON.parse(body) }, window.location.origin);
}
function scheduleCatalog() { clearTimeout(catalogTimer); catalogTimer = setTimeout(() => sendCatalog(false), 450); }

/* The outline around the piece being edited (magenta) and the one under the pointer (dashed). */
let layer = null;
let focus = null;      // { kind, key }
let hover = null;      // a piece
let picking = true;
const rectOf = (p) => {
  if (p.node) { const r = document.createRange(); r.selectNodeContents(p.node); return r.getBoundingClientRect(); }
  return p.el.getBoundingClientRect();
};
function draw() {
  if (!layer) return;
  const boxes = [];
  if (focus) for (const p of pieces()) if (p.kind === focus.kind && p.key === focus.key && p.el.isConnected && seen(p.el) && boxes.length < 24) boxes.push({ r: rectOf(p), main: true });
  if (hover && picking && hover.el.isConnected) boxes.push({ r: rectOf(hover), main: false });
  while (layer.children.length > boxes.length) layer.lastChild.remove();
  boxes.forEach((b, i) => {
    const d = layer.children[i] || layer.appendChild(document.createElement("div"));
    const pad = 4;
    d.style.cssText = `position:fixed;left:${b.r.left - pad}px;top:${b.r.top - pad}px;width:${b.r.width + pad * 2}px;height:${b.r.height + pad * 2}px;`
      + `border-radius:6px;box-sizing:border-box;pointer-events:none;`
      + (b.main ? "outline:3px solid #D6308C;box-shadow:0 0 0 6px rgba(214,48,140,.22);" : "outline:2px dashed #D6308C;background:rgba(214,48,140,.08);");
  });
}
let drawLoop = 0;
function loop() { draw(); drawLoop = window.requestAnimationFrame(loop); }

function focusOn(kind, key) {
  focus = kind ? { kind, key } : null;
  if (!focus) return;
  const all = pieces(true).filter((p) => p.kind === kind && p.key === key);
  const p = all.find((x) => seen(x.el)) || all[0];
  window.parent.postMessage({ type: `${MSG}shown`, kind, key, found: all.length, visible: !!(p && seen(p.el)) }, window.location.origin);
  if (!p || !seen(p.el)) return;
  const r = rectOf(p);
  if (r.top < 80 || r.bottom > window.innerHeight - 80) p.el.scrollIntoView({ block: "center", behavior: "smooth" });
}

function pieceAt(x, y, target) {
  const inside = (r) => x >= r.left - 2 && x <= r.right + 2 && y >= r.top - 2 && y <= r.bottom + 2;
  if (!target || skipped(target)) return null;
  const range = document.caretRangeFromPoint ? document.caretRangeFromPoint(x, y)
    : (() => { const c = document.caretPositionFromPoint && document.caretPositionFromPoint(x, y); if (!c) return null; const r = document.createRange(); r.setStart(c.offsetNode, c.offset); return r; })();
  const n = range && range.startContainer;
  if (n && n.nodeType === 3 && !skipped(n.parentElement)) {
    const key = squash(original(n));
    const r = document.createRange(); r.selectNodeContents(n);
    if (key && isCopy(key) && [...r.getClientRects()].some(inside)) return { node: n, el: n.parentElement, kind: "text", key };
  }
  const all = pieces();
  for (let el = target, up = 0; el && up < 5; el = el.parentElement, up += 1) {
    const hit = all.find((p) => p.el === el && (p.kind === "media" || p.attr === "placeholder")) || (up === 0 && all.find((p) => p.kind === "text" && !p.attr && el.contains(p.node)));
    if (hit) return hit;
  }
  return null;
}

function startEditing() {
  editing = true;
  page = pageKey(window.location.pathname);
  const tell = (type, extra) => window.parent.postMessage({ type: MSG + type, path: pageKey(window.location.pathname), ...(extra || {}) }, window.location.origin);
  let gotRules = false;
  window.addEventListener("message", (e) => {
    if (e.source !== window.parent || e.origin !== window.location.origin || !e.data || typeof e.data.type !== "string" || !e.data.type.startsWith(MSG)) return;
    const d = e.data;
    if (d.type === `${MSG}rules`) { gotRules = true; setRules({ texts: d.texts, media: d.media }); sendCatalog(true); }
    else if (d.type === `${MSG}scan`) sendCatalog(true);
    else if (d.type === `${MSG}focus`) focusOn(d.kind, d.key);
    else if (d.type === `${MSG}mode`) { picking = !!d.pick; hover = null; document.documentElement.style.cursor = picking ? "crosshair" : ""; }
  });
  const ready = () => {
    layer = document.createElement("div");
    layer.setAttribute("data-nocopy", "");
    layer.style.cssText = "position:fixed;inset:0;z-index:2147483646;pointer-events:none;";
    document.body.appendChild(layer);
    setRules(null);
    document.documentElement.style.cursor = "crosshair";
    loop();
    tell("ready");
    // The editor may still be loading: keep saying hello until it has sent the rows.
    const again = setInterval(() => { if (gotRules) clearInterval(again); else tell("ready"); }, 800);
  };
  if (document.body) ready(); else document.addEventListener("DOMContentLoaded", ready, { once: true });

  // Pick mode: a click chooses the piece under the pointer instead of following the link or button.
  const stop = (e) => {
    if (!picking) return;
    const p = pieceAt(e.clientX, e.clientY, e.target);
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "click" && p) { focus = { kind: p.kind, key: p.key }; tell("pick", { kind: p.kind, key: p.key }); }
  };
  for (const type of ["click", "auxclick", "dblclick", "submit"]) document.addEventListener(type, stop, true);
  let moved = 0;
  document.addEventListener("mousemove", (e) => {
    const x = e.clientX, y = e.clientY, target = e.target;
    window.cancelAnimationFrame(moved);
    moved = window.requestAnimationFrame(() => { hover = picking ? pieceAt(x, y, target) : null; });
  }, true);
  document.addEventListener("mouseleave", () => { hover = null; }, true);
  window.addEventListener("pagehide", () => window.cancelAnimationFrame(drawLoop));
}

/* ---------- The website ---------- */

let started = false;
/** Called once before the site is drawn (src/main.jsx). */
export function startSiteCopy() {
  if (started || typeof window === "undefined" || typeof MutationObserver === "undefined") return;
  started = true;
  if (window.parent !== window && window.name === EDIT_FRAME) { startEditing(); return; }
  if (OFF.test(window.location.pathname)) return;   // opened on a staff page: nothing to do, nothing to fetch
  const staged = isPreview();
  if (!staged) {
    try { const kept = JSON.parse(localStorage.getItem(CACHE) || "null"); if (kept) setRules(kept); } catch { /* no storage: wait for the answer */ }
  }
  client.fetch(QUERY).then((doc) => {
    setRules(doc || null);
    if (staged) return;
    try { if (doc && (doc.texts || doc.media)) localStorage.setItem(CACHE, JSON.stringify(doc)); else localStorage.removeItem(CACHE); } catch { /* ignore */ }
  }).catch(() => { /* offline or blocked: the built-in site (or the kept rows) */ });
}
