// A feed refresh never drops a post the app has shown unless it's known to be gone (Oct 22 2026).
// Run: node --test src/app/lib/feedMerge.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { mergeFeed } from "./feedMerge.js";

const p = (id, h) => ({ id, createdAt: new Date(Date.UTC(2026, 9, 22, h)).toISOString() });

test("a new post the server's page leaves out stays, in order, and is checked", () => {
  const shown = [p("new", 10), p("a", 9), p("b", 8)];
  const fresh = [p("a", 9), p("b", 8)];
  const { feed, check } = mergeFeed(fresh, shown, new Set(), 60);
  assert.deepEqual(feed.map((x) => x.id), ["new", "a", "b"]);
  assert.deepEqual(check.map((x) => x.id), ["new"]);
});

test("posts known to be gone go; a full page doesn't keep posts older than it", () => {
  const shown = [p("deleted", 10), p("a", 9), p("old", 1)];
  const fresh = [p("a", 9), p("b", 5)];
  const { feed, check } = mergeFeed(fresh, shown, new Set(["deleted"]), 2);
  assert.deepEqual(feed.map((x) => x.id), ["a", "b"]);
  assert.deepEqual(check, []);
});

test("nothing missing: the server's page as it is", () => {
  const fresh = [p("a", 9)];
  const out = mergeFeed(fresh, [p("a", 9)]);
  assert.equal(out.feed, fresh);
});
