// The app invite email's #r= token: read once, reported, removed from the address.
// Run: node --test src/app/lib/inviteVisit.test.mjs
import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = { location: { hash: "" }, history: {} };
const { inviteTokenOf, hashWithoutToken, recordInviteVisit } = await import("./inviteVisit.js");

const TOKEN = `${"eyJjIjoiYXBwLWludml0ZS0yMDI2IiwiZSI6ImFAZXhhbXBsZS5jb20ifQ"}.${"A".repeat(22)}`;

test("the token is read from #r= and only when it looks like one", () => {
  assert.equal(inviteTokenOf(`#r=${TOKEN}`), TOKEN);
  assert.equal(inviteTokenOf(`#x=1&r=${TOKEN}`), TOKEN);
  assert.equal(inviteTokenOf("#r=nope"), "");
  assert.equal(inviteTokenOf(""), "");
  assert.equal(hashWithoutToken(`#x=1&r=${TOKEN}`), "#x=1");
  assert.equal(hashWithoutToken(`#r=${TOKEN}`), "");
});

test("a visit is sent once, as text/plain without cookies, and #r= comes off the address", async () => {
  const calls = [];
  const replaced = [];
  const loc = { pathname: "/app/", search: "?source=pwa", hash: `#r=${TOKEN}` };
  const history = { state: { k: 1 }, replaceState: (s, _t, url) => replaced.push(url) };
  const send = (url, opts) => { calls.push([url, opts]); return Promise.resolve(); };
  assert.equal(recordInviteVisit("https://api.example.com/api", loc, history, send), TOKEN);
  assert.deepEqual(replaced, ["/app/?source=pwa"]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "https://api.example.com/api/t/v");
  assert.deepEqual([calls[0][1].method, calls[0][1].headers["Content-Type"], calls[0][1].credentials, calls[0][1].body], ["POST", "text/plain;charset=UTF-8", "omit", JSON.stringify({ r: TOKEN })]);
  // Nothing to do without a token.
  assert.equal(recordInviteVisit("https://api.example.com/api", { pathname: "/app/", search: "", hash: "" }, history, send), "");
  assert.equal(calls.length, 1);
});
