// The website's dark preview switch. Run: node --test src/lib/siteDarkPreview.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { SITE_THEME_KEY, previewTheme } from "./siteDarkPreview.js";

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

test("off unless ?theme=dark; stays on for the tab; ?theme=light turns it off", () => {
  const s = mem();
  assert.equal(previewTheme("", s), "");
  assert.equal(previewTheme("?theme=dark", s), "dark");
  assert.equal(s.getItem(SITE_THEME_KEY), "dark");
  assert.equal(previewTheme("?utm=x", s), "dark", "remembered while browsing");
  assert.equal(previewTheme("?theme=light", s), "");
  assert.equal(previewTheme("", s), "");
  assert.equal(previewTheme("?theme=purple", mem()), "");
});

test("works without storage", () => {
  assert.equal(previewTheme("?theme=dark", null), "dark");
  const broken = { getItem: () => { throw new Error("off"); }, setItem: () => { throw new Error("off"); }, removeItem: () => {} };
  assert.equal(previewTheme("?theme=dark", broken), "dark");
  assert.equal(previewTheme("", broken), "");
});
