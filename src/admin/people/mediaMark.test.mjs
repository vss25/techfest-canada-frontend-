// Media = Yes in the admin panel (mediaMark.js): who is Media, the type badges without a second Media,
// the pass lists' mark and the pass colour chip from the server's band. Run: node --test src/admin/people/mediaMark.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { MEDIA, MEDIA_FILTER, MEDIA_HELP, bandChip, isMedia, otherTypes, passRowMedia } from "./mediaMark.js";

test("the mark: dark blue with white words, the organiser's help text, a Yes / No / All filter", () => {
  assert.deepEqual([MEDIA.bg, MEDIA.text, MEDIA.label], ["#0B3D91", "#FFFFFF", "Media"]);
  assert.equal(MEDIA_HELP, "Media: Power Pass privileges with CxO Breakfasts");
  assert.deepEqual([MEDIA_FILTER.key, MEDIA_FILTER.any, MEDIA_FILTER.options.map((o) => o.key)], ["media", "All", ["yes", "no"]]);
});

test("who is Media: the server's yes / no first, else (an older server) the media type", () => {
  assert.equal(isMedia({ media: true, types: [] }), true);
  assert.equal(isMedia({ media: false, types: ["media"] }), false);
  assert.equal(isMedia({ types: ["speaker", "media"] }), true);
  assert.equal(isMedia({ types: ["speaker"] }), false);
  assert.equal(isMedia(null), false);
  assert.deepEqual(otherTypes(["speaker", "media", "exhibitor"]), ["speaker", "exhibitor"]);
  assert.deepEqual(otherTypes(undefined), []);
});

test("pass lists: the person as People has them when known, else the pass's own mark", () => {
  assert.equal(passRowMedia({ media: true, personMedia: false }), false);  // their account switched Media off
  assert.equal(passRowMedia({ media: false, personMedia: true }), true);   // Media on their account
  assert.equal(passRowMedia({ media: true, personMedia: null }), true);    // not known: the pass's mark
  assert.equal(passRowMedia({ media: true }), true);
  assert.equal(passRowMedia({}), false);
});

test("the pass colour chip: the band's word and colours, the pass's name small beside the other words", () => {
  assert.deepEqual(bandChip({ key: "media", label: "Media", bg: "#0B3D91", text: "#FFFFFF", passName: "Connect Pass" }), {
    key: "media", label: "Media", sub: "Connect Pass", bg: "#0B3D91", color: "#FFFFFF",
    title: "Pass colour: Media · Connect Pass. What door staff see at check-in.",
  });
  const vip = bandChip({ key: "vip", label: "VIP", bg: "#F5C400", text: "#3D2E00", passName: "Power Pass" });
  assert.deepEqual([vip.label, vip.sub, vip.bg], ["VIP", "Power Pass", "#F5C400"]);
  // The green band already says the pass: nothing beside it. An exhibitor's says which pass.
  assert.equal(bandChip({ key: "pass", label: "Connect Pass", bg: "#18A957", text: "#052E16", passName: "Connect Pass" }).sub, "");
  assert.equal(bandChip({ key: "pass", label: "Exhibitor", bg: "#18A957", text: "#052E16", passName: "Connect Pass" }).sub, "Connect Pass");
  // Media with no pass name (never sent today, but safe).
  assert.equal(bandChip({ key: "media", label: "Media", bg: "#0B3D91", text: "#FFFFFF" }).sub, "");
  // Nothing usable: no chip (no pass, or an older server).
  assert.equal(bandChip(null), null);
  assert.equal(bandChip({ key: "media", label: "Media", bg: "blue", text: "#FFFFFF" }), null);
  assert.equal(bandChip({ key: "media", label: "", bg: "#0B3D91", text: "#FFFFFF" }), null);
});
