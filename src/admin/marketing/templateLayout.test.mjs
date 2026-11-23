/* Uploaded post templates (Nov 23 2026): the layout rules in templateLayout.js. Pure, no network. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultBoxes, placePeople, rulesProblems, rulesText } from "./templateLayout.js";

const box = { x: 0.05, y: 0.5, w: 0.9, h: 0.4, align: "center", valign: "top", gap: 0.03, perRow: 6, maxCard: 0.3 };

test("one speaker: centred, never wider than the template allows", () => {
  const [p] = placePeople(1, box, 1200, 1000);
  assert.ok(p.w <= 0.3 * 1200 + 0.01);
  assert.ok(Math.abs(p.x + p.w / 2 - 600) < 0.5);   // centred on the image
  assert.equal(p.y, 500);
});

test("two or more: the same gap between each, centred as a group; extra people go to a second row", () => {
  const two = placePeople(2, box, 1200, 1000);
  assert.ok(Math.abs(two[1].x - (two[0].x + two[0].w) - 36) < 0.5);   // 3% of 1200
  const mid = (two[0].x + two[1].x + two[1].w) / 2;
  assert.ok(Math.abs(mid - 600) < 0.5);
  const five = placePeople(5, { ...box, perRow: 3 }, 1200, 1000);
  assert.deepEqual(five.map((p) => Math.round(p.y)), [five[0].y, five[0].y, five[0].y, five[3].y, five[3].y].map(Math.round));
  assert.ok(five[3].y > five[0].y);
  // The second row (2 people) is centred too.
  assert.ok(Math.abs((five[3].x + five[4].x + five[4].w) / 2 - 600) < 0.5);
  // Left-aligned groups start at the box's left edge.
  assert.equal(placePeople(2, { ...box, align: "left" }, 1200, 1000)[0].x, 60);
});

test("the rules in plain words, and what a post breaks of them", () => {
  const b = defaultBoxes("session");
  assert.ok(rulesText("session", b).some((r) => /side by side with a 3% gap, the group centred/.test(r)));
  const partner = defaultBoxes("partner");
  assert.ok(rulesText("partner", partner).some((r) => /files under 300px wide are flagged/.test(r)));
  const issues = rulesProblems({ kind: "partner", headline: "Welcome, " + "A very long partner name ".repeat(4), logo: { naturalWidth: 120 } }, { boxes: partner });
  assert.ok(issues.some((i) => /partner line is \d+ characters; this template allows 60/.test(i)));
  assert.ok(issues.some((i) => /only 120px wide/.test(i)));
  const missing = rulesProblems({ kind: "session", title: { accent: "A:", rest: "B" }, people: [{ name: "Ada Lovelace", img: null }] }, { boxes: defaultBoxes("session") });
  assert.deepEqual(missing, ["Ada Lovelace has no photo yet, so their initials show."]);
});
