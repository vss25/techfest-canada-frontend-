// Post share card + share items, same cases as the iOS and Android tests.
// Run: node --test src/app/lib/share.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { caption, copiedNote, orderedItems, shareUrl } from "./share.js";
import { hashtags, normalize, overflow, runs, textStyle, tiles } from "./shareCardLayout.js";

test("caption per app", () => {
  assert.equal(caption("Marcus Chen", "  Demo day!  ", "", "instagram"), "Marcus Chen on TTFC: Demo day!\n\n@thetechfestival");
  assert.equal(caption("Marcus Chen", "Demo day!", "https://example.com/x", "linkedin"),
    "Marcus Chen on TTFC: Demo day!\n\nhttps://example.com/x\n\nThe Tech Festival Canada · https://www.linkedin.com/company/thetechfestival");
  assert.equal(caption("Marcus Chen", "Demo day!", "", "whatsapp"), "Marcus Chen on TTFC: Demo day!\n\nthetechfestival.com");
  assert.equal(caption("Marcus Chen", "Demo day!", "", null), "Marcus Chen on TTFC: Demo day!\n\nthetechfestival.com");
  assert.equal(caption("Marcus Chen", "", "", "x"), "Marcus Chen on TTFC\n\n@thetechfestival");
  assert.equal(caption("Marcus Chen", "Line 1\nLine 2 @thetechfestival", "", "x"), "Marcus Chen on TTFC: Line 1\nLine 2 @thetechfestival");
  assert.equal(shareUrl("whatsapp", "Hi there"), "https://wa.me/?text=Hi%20there");
  assert.equal(shareUrl("instagram", "Hi"), null);
});

test("media first, caption last", () => {
  const photos = ["p1", "p2", "p3", "p4"];
  assert.deepEqual(orderedItems("instagram", "card", photos, ["v"], "cap"), ["card", "p1", "p2", "p3", "p4", "v"]);
  assert.deepEqual(orderedItems("whatsapp", "card", ["p1"], ["v"], "cap"), ["card", "p1", "v", "cap"]);
  assert.deepEqual(orderedItems(null, "card", [], [], "cap"), ["card", "cap"]);
  assert.deepEqual(orderedItems("x", "card", photos, ["v"], "cap"), ["card", "p1", "p2", "p3", "cap"]);
  assert.deepEqual(orderedItems("linkedin", "card", ["p1"], ["v"], "cap"), ["card", "p1", "cap"]);
  assert.equal(copiedNote("instagram"), "Caption copied. Paste it in Instagram.");
  assert.equal(copiedNote("whatsapp"), "Pick WhatsApp. Caption copied too.");
});

const r = (text, highlight) => ({ text, highlight });

test("highlights tags and mentions", () => {
  assert.deepEqual(runs("Hi @Priya Raman, see #AI\nand @bob.", ["Priya Raman"]),
    [r("Hi ", false), r("@Priya Raman", true), r(", see ", false), r("#AI", true), r("\nand ", false), r("@bob", true), r(".", false)]);
  assert.deepEqual(runs("mail a@b.com or C# #", []), [r("mail a@b.com or C# #", false)]);
  assert.deepEqual(runs("@Ann @Ann Lee!", ["Ann", "Ann Lee"]), [r("@Ann", true), r(" ", false), r("@Ann Lee", true), r("!", false)]);
  assert.deepEqual(runs("#Toronto2026 #AI", []), [r("#Toronto2026", true), r(" ", false), r("#AI", true)]);
});

test("text rules", () => {
  assert.equal(normalize("  a\r\nb\n\n\n\nc  "), "a\nb\n\nc");
  assert.equal(hashtags(["Artificial Intelligence", "Robotics & Automation"]), "#ArtificialIntelligence #RoboticsAutomation");
  assert.equal(textStyle(300, true).maxLines, 6);
  assert.equal(textStyle(80, false).size, 56);
  assert.equal(textStyle(300, false).maxLines, 12);
});

test("photo grid", () => {
  const rect = { x: 96, y: 500, w: 888, h: 584 };
  assert.deepEqual(tiles(1, rect), [rect]);
  assert.deepEqual(tiles(2, rect), [{ x: 96, y: 500, w: 439, h: 584 }, { x: 545, y: 500, w: 439, h: 584 }]);
  assert.deepEqual(tiles(5, rect), [{ x: 96, y: 500, w: 509, h: 584 }, { x: 615, y: 500, w: 369, h: 287 }, { x: 615, y: 797, w: 369, h: 287 }]);
  assert.equal(overflow(5), 2);
});
