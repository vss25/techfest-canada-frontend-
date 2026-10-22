// The Profile screen's colour tag, from GET /auth/me `profileTag`.
// Run: node --test src/app/lib/profileTag.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { PROFILE_TAG_COLORS, profileTagView } from "./profileTag.js";

test("the five colours, the same as the apps (no VIP)", () => {
  assert.deepEqual(Object.fromEntries(Object.entries(PROFILE_TAG_COLORS).map(([k, v]) => [k, [v.bg, v.text]])), {
    media: ["#0B3D91", "#FFFFFF"], speaker: ["#D01F2F", "#FFFFFF"],
    staff: ["#7B2FD0", "#FFFFFF"], volunteer: ["#FF6B00", "#3A1500"], pass: ["#18A957", "#052E16"],
  });
  for (const v of Object.values(PROFILE_TAG_COLORS)) {
    const hex = v.bg.slice(1).match(/../g).map((h) => parseInt(h, 16)).join(", ");
    assert.equal(v.rgb, hex);
  }
});

test("what the pill says", () => {
  assert.equal(profileTagView({ key: "media", label: "Media" }).text, "Media");
  assert.equal(profileTagView({ key: "speaker", label: "Speaker" }).text, "Speaker");
  assert.equal(profileTagView({ key: "staff", label: "Staff" }).text, "Staff");
  assert.equal(profileTagView({ key: "volunteer", label: "Volunteer" }).text, "Volunteer");
  assert.equal(profileTagView({ key: "pass", label: "Power" }).text, "Power Pass");
  assert.equal(profileTagView({ key: "pass", label: "Apex" }).text, "Apex Pass");
  assert.equal(profileTagView({ key: "pass", label: "Exhibitor" }).text, "Exhibitor");
  assert.equal(profileTagView({ key: "pass", label: "Connect Pass" }).text, "Connect Pass");
  assert.equal(profileTagView({ key: "staff" }).text, "Staff");   // a missing label: the tag's own word
});

test("nothing for no tag, an unknown key or an older server", () => {
  assert.equal(profileTagView(null), null);
  assert.equal(profileTagView(undefined), null);
  assert.equal(profileTagView({ key: "gold", label: "Gold" }), null);
  assert.equal(profileTagView({ key: "vip", label: "VIP" }), null); // never labelled VIP (an older server)
  assert.equal(profileTagView({ key: "pass", label: "" }), null);
});
