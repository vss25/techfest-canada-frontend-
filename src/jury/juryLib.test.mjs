// The jury portal's pure helpers (juryLib.js): the live total, anchors, links in statements, Toronto deadline times.
// Run: node --test src/jury/juryLib.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  anchorFor, fmtToronto, groupByCategory, isoFromTorontoInput, linkParts, matchesSearch, paragraphs, progressLine, savedAgo, scoredCount,
  torontoInputValue, totalOf,
} from "./juryLib.js";

const crit = ["innovation", "impact", "traction", "team", "fit"].map((key) => ({ key, weight: 1, anchors: { 1: "Low.", 3: "Mid.", 5: "High." } }));

test("the live total matches the server: 0–100, weighted over what's scored", () => {
  assert.equal(totalOf({}, crit), null);
  assert.equal(totalOf({ innovation: 1, impact: 1, traction: 1, team: 1, fit: 1 }, crit), 0);
  assert.equal(totalOf({ innovation: 3, impact: 3, traction: 3, team: 3, fit: 3 }, crit), 50);
  assert.equal(totalOf({ innovation: 5, impact: 4, traction: 4, team: 4, fit: 4 }, crit), 80);
  assert.equal(totalOf({ a: 5, b: 1 }, [{ key: "a", weight: 3 }, { key: "b", weight: 1 }]), 75);
  assert.equal(scoredCount({ innovation: 2, impact: 0, fit: 5 }, crit), 2);
});

test("anchors: 1, 3 and 5 as written; 2 and 4 in between", () => {
  assert.equal(anchorFor(crit[0], 3), "Mid.");
  assert.equal(anchorFor(crit[0], 4), 'Between "Mid" and "High".');
  assert.equal(anchorFor(crit[0], 0), "");
});

test("links in statements: http(s) and www., trailing punctuation left out", () => {
  assert.deepEqual(linkParts("See https://example.com/report. And www.example.org/a_(b))!"), [
    { type: "text", value: "See " },
    { type: "link", value: "https://example.com/report", href: "https://example.com/report" },
    { type: "text", value: "." },
    { type: "text", value: " And " },
    { type: "link", value: "www.example.org/a_(b)", href: "https://www.example.org/a_(b)" },
    { type: "text", value: ")!" },
  ]);
  assert.deepEqual(linkParts("javascript:alert(1) no link"), [{ type: "text", value: "javascript:alert(1) no link" }]);
  assert.deepEqual(paragraphs("One\nline two\n\n\nTwo"), [["One", "line two"], ["Two"]]);
});

test("deadline input in Toronto time, both ways, across the DST change", () => {
  assert.equal(torontoInputValue("2026-10-26T03:59:00.000Z"), "2026-10-25T23:59");
  assert.equal(isoFromTorontoInput("2026-10-25T23:59"), "2026-10-26T03:59:00.000Z");
  assert.equal(isoFromTorontoInput("2026-11-02T09:00"), "2026-11-02T14:00:00.000Z"); // EST after Nov 1
  assert.equal(isoFromTorontoInput("nope"), "");
  assert.equal(fmtToronto("2026-10-26T03:59:00.000Z"), "Sun, Oct 25, 11:59 PM ET");
});

test("list helpers", () => {
  const rows = [{ categoryKey: "a", categoryLabel: "A", nomineeName: "X" }, { categoryKey: "b", categoryLabel: "B", nomineeName: "Y" }, { categoryKey: "a", categoryLabel: "A", nomineeName: "Z" }];
  assert.deepEqual(groupByCategory(rows).map((g) => [g.label, g.rows.map((r) => r.nomineeName)]), [["A", ["X", "Z"]], ["B", ["Y"]]]);
  assert.equal(progressLine({ assigned: 12, submitted: 8, drafts: 2, editing: 1 }), "8 of 12 submitted · 2 drafts · 1 being edited");
  assert.equal(matchesSearch({ nomineeName: "Northwind Health" }, "north"), true);
  assert.equal(matchesSearch({ nomineeName: "Northwind Health" }, "zzz"), false);
  assert.equal(savedAgo(Date.now() - 5000), "Saved just now");
  assert.equal(savedAgo(Date.now() - 180e3), "Saved 3 min ago");
});
