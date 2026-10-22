// Session chats: which sessions get one (the server's rule) and finding a session's group.
// Run: node --test src/app/lib/sessionChat.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { sessionGetsChat, sessionGroupOf } from "./sessionChat.js";

const s = (title, type = "panel") => ({ id: "d1-08", cmsId: "abc", title, type });

test("meals, breaks and registration never get a chat", () => {
  for (const t of ["CxO Breakfast", "Networking Lunch", "Luncheon", "Gala Dinner", "Brunch", "AM Break", "PM Tea Break", "Networking break", "Registration & Coffee"]) {
    assert.equal(sessionGetsChat(s(t)), false, t);
  }
  assert.equal(sessionGetsChat(s("Anything", "break")), false);
});

test("everything else does, break-out sessions included", () => {
  for (const t of ["Past the Pilot: AI, Identity and the Plumbing of Finance", "Break-out: Quantum in Healthcare", "Breakout session: Robotics", "Break out: Energy", "Breaking the Grid"]) {
    assert.equal(sessionGetsChat(s(t)), true, t);
  }
  assert.equal(sessionGetsChat(null), false);
});

test("a session's group by its id", () => {
  const groups = [{ id: "g1", sessionId: null }, { id: "g2", sessionId: "d1-08" }];
  assert.equal(sessionGroupOf(s("x"), groups).id, "g2");
  assert.equal(sessionGroupOf({ id: "zz", cmsId: "abc" }, [{ id: "g3", sessionId: "abc" }]).id, "g3");
  assert.equal(sessionGroupOf(s("x"), [{ id: "g1" }]), null);
});
