// Server notification rows in the Notifications list, incl. "<name> connected with you" (connect by pass, Oct 24 2026).
// Run: node --test src/app/lib/notifRows.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { serverItem } from "./notifRows.js";

const at = "2026-10-26T14:00:00.000Z";

test("someone scanned my pass: a connection row that opens their profile, unread until read", () => {
  const n = serverItem({ id: "n1", kind: "conn", title: "Sid Scanner connected with you", body: "Scanned your TTFC pass", link: "ttfc://tab/network",
    sentByName: "Sid Scanner", createdAt: at, readAt: null, fromUserId: "u-sid", avatarUrl: "https://x.example/a.webp", connectionId: "c9" });
  assert.deepEqual(n, {
    id: "pn-n1", title: "Sid Scanner connected with you", detail: "Scanned your TTFC pass", date: at, serverRead: false, from: "Sid Scanner",
    kind: "connection", to: "/people/u-sid", connectionId: "c9", avatarUrl: "https://x.example/a.webp",
  });
  assert.equal(serverItem({ id: "n2", kind: "conn", readAt: at }).serverRead, true);
  // No sender id (shouldn't happen): their connections.
  assert.equal(serverItem({ id: "n3", kind: "conn" }).to, "/network/connected");
});

test("messages from the TTFC team stay as they were", () => {
  assert.deepEqual(serverItem({ id: "n4", kind: "personal", title: "Doors open", body: "Come in", link: "", sentByName: "Sam", createdAt: at, readAt: null }), {
    id: "pn-n4", title: "Doors open", detail: "Come in", date: at, serverRead: false, from: "Sam", kind: "personal", link: "ttfc://tab/home",
  });
  // Older servers send no kind; reports open their link.
  assert.equal(serverItem({ id: "n5", title: "x", body: "y" }).kind, "personal");
  assert.equal(serverItem({ id: "n6", kind: "report", link: "ttfc://moderation" }).link, "ttfc://moderation");
});
