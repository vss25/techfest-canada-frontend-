// The home page's layout from Admin › Content › Home page. Run: node --test src/lib/homeLayout.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { HOME_SECTIONS, editorRows, homeCityFor, homeEyebrow, homeOrder } from "./homeLayout.js";

test("nothing saved = the design's order, everything shown", () => {
  assert.deepEqual(homeOrder(undefined), HOME_SECTIONS);
  assert.deepEqual(homeOrder([]), HOME_SECTIONS);
});

test("saved order wins, hidden ones are left out, missing ones go last", () => {
  assert.deepEqual(homeOrder([{ key: "highlights" }, { key: "season", on: false }, { key: "agenda" }]), ["highlights", "agenda", "form"]);
  assert.deepEqual(homeOrder([{ key: "nope" }, { key: "form" }, { key: "form", on: false }]), ["form", "season", "agenda", "highlights"]);
});

test("the editor lists every section once", () => {
  assert.deepEqual(editorRows([{ key: "form", on: false }]), [
    { key: "form", on: false }, { key: "season", on: true }, { key: "agenda", on: true }, { key: "highlights", on: true },
  ]);
});

test("the top of the page: pinned event, else the next one, else Vancouver", () => {
  const byCity = {
    van: { _id: "e-van", startDate: "2027-02-03" },
    mtl: { _id: "e-mtl", startDate: "2027-04-14" },
    tor: { _id: "e-tor", startDate: "2027-10-26", endDate: "2027-10-27" },
    ott: null,
  };
  assert.equal(homeCityFor("e-mtl", byCity, "2026-11-25"), "mtl");
  assert.equal(homeCityFor("", byCity, "2026-11-25"), "van");
  assert.equal(homeCityFor("", byCity, "2027-02-04"), "mtl", "Vancouver is over");
  assert.equal(homeCityFor("e-gone", byCity, "2027-02-04"), "mtl", "a pinned event that isn't listed falls back");
  assert.equal(homeCityFor("", byCity, "2027-10-27"), "tor", "on its last day");
  assert.equal(homeCityFor("", byCity, "2028-01-01"), "van");
  assert.equal(homeCityFor("", {}, "2027-01-01"), "van");
});

test("the line above the name", () => {
  assert.equal(homeEyebrow({ date: "April 14, 2027", name: "Montreal", theme: "Theme announced soon" }), "April 14, 2027 · Montreal");
  assert.equal(homeEyebrow({ date: "February 3, 2027", name: "Vancouver", theme: "Energy" }), "February 3, 2027 · Vancouver · Energy");
});
