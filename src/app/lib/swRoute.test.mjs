// Where a notification tap goes (the service worker's routeOf, src/app/sw/sw.js), Oct 22 2026 kinds included.
// Run: node --test src/app/lib/swRoute.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../sw/sw.js", import.meta.url), "utf8");
const fn = src.match(/function routeOf\(d\) \{[\s\S]*?\n\}\n/);
const routeOf = new Function(`${fn[0]}; return routeOf;`)();

test("activity on a post opens the post with its replies", () => {
  assert.equal(routeOf({ kind: "comment", thread: "post.p1", id: "p1", url: "/app/post/p1" }), "/app/post/p1?comments=1");
  assert.equal(routeOf({ kind: "like", thread: "post.p2" }), "/app/post/p2?comments=1");
  assert.equal(routeOf({ kind: "reply", id: "p3" }), "/app/post/p3?comments=1");
  assert.equal(routeOf({ kind: "mention", thread: "post.p4", url: "/app/post/p4?comments=1" }), "/app/post/p4?comments=1");
});

test("discussions, groups and chats as before", () => {
  assert.equal(routeOf({ kind: "mention", thread: "disc.d1", url: "/app/discussion/d1" }), "/app/discussion/d1");
  assert.equal(routeOf({ kind: "group", thread: "group.g1" }), "/app/group/g1");
  assert.equal(routeOf({ kind: "disc", thread: "disc.d2" }), "/app/discussion/d2");
  assert.equal(routeOf({ kind: "dm", thread: "dm.u1" }), "/app/chat/u1");
  assert.equal(routeOf({ kind: "dm", from: "u2" }), "/app/chat/u2");
  assert.equal(routeOf({ link: "ttfc://tab/schedule" }), "/app/schedule");
  assert.equal(routeOf({}), "/app/");
  assert.equal(routeOf({ url: "https://evil.example/app/x" }), "/app/");
});
