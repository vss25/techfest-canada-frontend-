// Website text & media: the rules. Run: node --test src/lib/siteCopyRules.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { applyDiff, cssUrls, diffRows, fitSpaces, hashText, indexRules, isCopy, lookup, mediaKey, pageKey, plainRows, rowFor, squash, withRow } from "./siteCopyRules.js";

test("text is compared with its spaces squashed; numbers and arrows alone aren't copy", () => {
  assert.equal(squash("  Why \n  come here "), "Why come here");
  assert.equal(isCopy("Get tickets"), true);
  assert.equal(isCopy("02"), false);
  assert.equal(isCopy("→"), false);
});

test("a page's own row wins over the everywhere row; no rows changes nothing", () => {
  const r = indexRules({ texts: [{ match: "Get tickets", text: "Book now" }, { match: "Get  tickets", page: "/venue", text: "Reserve" }, { match: "x", text: "" }] });
  assert.equal(r.size, 2);
  assert.equal(lookup(r.texts, "/", "Get tickets"), "Book now");
  assert.equal(lookup(r.texts, "/venue", "Get tickets"), "Reserve");
  assert.equal(lookup(r.texts, "/", "Other"), undefined);
  assert.equal(lookup(indexRules(null).texts, "/", "Get tickets"), undefined);
});

test("media rows need an https address", () => {
  const r = indexRules({ media: [{ match: "/a.webp", url: "https://cdn.sanity.io/a.jpg", alt: "A" }, { match: "/b.webp", url: "javascript:1" }] });
  assert.deepEqual(lookup(r.media, "/", "/a.webp"), { url: "https://cdn.sanity.io/a.jpg", alt: "A" });
  assert.equal(lookup(r.media, "/", "/b.webp"), undefined);
});

test("page and file addresses", () => {
  assert.equal(pageKey("/venue/?x=1"), "/venue");
  assert.equal(pageKey("/"), "/");
  assert.equal(mediaKey("/ft-audience.webp?v=2", "https://site.test"), "/ft-audience.webp");
  assert.equal(mediaKey("https://site.test/a/b.png#x", "https://site.test"), "/a/b.png");
  assert.equal(mediaKey("https://cdn.sanity.io/images/p/d/a.jpg?w=800", "https://site.test"), "https://cdn.sanity.io/images/p/d/a.jpg");
  assert.equal(mediaKey("data:image/png;base64,AAAA", "https://site.test"), "");
});

test("a replacement keeps the original's surrounding spaces", () => {
  assert.equal(fitSpaces(" · Toronto 2026 ", "· Toronto"), " · Toronto ");
  assert.equal(fitSpaces("Plain", "New"), "New");
});

test("background pictures inside a CSS value", () => {
  assert.deepEqual(cssUrls('linear-gradient(red, blue), url("/a.jpg"), url(/b.png)').map((u) => u.url), ["/a.jpg", "/b.png"]);
  assert.deepEqual(cssUrls("none"), []);
});

test("editing one item: set, scope and remove its row", () => {
  let rows = withRow([], { match: "Why come" }, { text: "Why attend" });
  rows = withRow(rows, { match: "Why come", page: "/venue" }, { text: "Why visit" });
  assert.equal(rowFor(rows, "Why come", "/venue").scope, "page");
  assert.equal(rowFor(rows, "Why come", "/").scope, "all");
  assert.equal(rowFor(rows, "Other", "/"), null);
  rows = withRow(rows, { match: "Why come" }, null);
  assert.deepEqual(plainRows(rows, "text"), [{ match: "Why come", page: "/venue", text: "Why visit" }]);
});

test("my changes go on top of someone else's newer list", () => {
  const before = [{ match: "A", text: "1" }, { match: "B", text: "2" }];
  const mine = [{ match: "A", text: "1!" }, { match: "C", text: "3" }];           // changed A, removed B, added C
  const theirs = [{ match: "A", text: "1" }, { match: "B", text: "2" }, { match: "D", text: "4" }];
  const merged = applyDiff(theirs, diffRows(before, mine));
  assert.deepEqual(merged.map((r) => `${r.match}=${r.text}`).sort(), ["A=1!", "C=3", "D=4"]);
  assert.deepEqual(diffRows(before, before), {});
});

test("hashes are stable unsigned numbers", () => {
  assert.equal(hashText("Get tickets"), hashText("Get tickets"));
  assert.notEqual(hashText("Get tickets"), hashText("Get ticket"));
  assert.ok(hashText("é") >= 0);
});
