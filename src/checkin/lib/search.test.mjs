/* node --test src/checkin/lib/search.test.mjs: accents and case, first / last name prefixes, several words, company,
   ticket IDs (staff), best matches first, and the badge-box letter. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { boxLetter, buildIndex, fold, search, ticketIdQuery } from "./search.js";

const G = [
  { key: "1", name: "Priya Sharma", firstName: "Priya", lastName: "Sharma", company: "Northwind", title: "CTO", ticketIds: ["pow100000001"] },
  { key: "2", name: "Zoë O'Brien-Smith", firstName: "Zoë", lastName: "O'Brien-Smith", company: "Acme Labs", title: "Engineer" },
  { key: "3", name: "Sharon Price", firstName: "Sharon", lastName: "Price", company: "Sharma Holdings", title: "Partner" },
  { key: "4", name: "Pria Shah", firstName: "Pria", lastName: "Shah", company: "Contoso", booth: "A12" },
  { key: "5", name: "José Álvarez", firstName: "José", lastName: "Álvarez", company: "Banco", title: "VP" },
  { key: "6", name: "Priyanka Sharma-Rao", firstName: "Priyanka", lastName: "Sharma-Rao", company: "Northwind" },
];
const idx = buildIndex(G);
const names = (q, o) => search(idx, q, o).map((g) => g.name);

test("accent- and case-insensitive", () => {
  assert.equal(fold("Zoë  O'Brien-Smith"), "zoe o brien smith");
  assert.deepEqual(names("ZOE"), ["Zoë O'Brien-Smith"]);
  assert.deepEqual(names("jose alv"), ["José Álvarez"]);
  assert.deepEqual(names("ÁLVAREZ"), ["José Álvarez"]);
  assert.deepEqual(names("obrien"), [], "a word is matched from its start (o brien)");
  assert.deepEqual(names("brien"), ["Zoë O'Brien-Smith"]);
});

test("first or last name prefix, several words in any order, best first", () => {
  // The whole name first, then names that start with it.
  assert.deepEqual(names("priya sharma"), ["Priya Sharma", "Priyanka Sharma-Rao"]);
  assert.deepEqual(names("pri"), ["Pria Shah", "Priya Sharma", "Priyanka Sharma-Rao", "Sharon Price"]);
  assert.deepEqual(names("sharma").slice(0, 2), ["Priya Sharma", "Priyanka Sharma-Rao"], "surnames before a company called Sharma");
  assert.equal(names("sharma").at(-1), "Sharon Price");
  // Sharon Price works at Sharma Holdings: a part-name, part-company match, after the name matches.
  assert.deepEqual(names("sharma pri"), ["Priya Sharma", "Priyanka Sharma-Rao", "Sharon Price"]);
  assert.deepEqual(names("p sha"), ["Pria Shah", "Priya Sharma", "Priyanka Sharma-Rao", "Sharon Price"], "Sharon Price: both words, her first name last");
  assert.deepEqual(names("  "), []);
  assert.deepEqual(names("xyz"), []);
});

test("company, job title and booth", () => {
  assert.deepEqual(names("northw"), ["Priya Sharma", "Priyanka Sharma-Rao"]);
  assert.deepEqual(names("acme"), ["Zoë O'Brien-Smith"]);
  assert.deepEqual(names("a12"), ["Pria Shah"]);
  assert.deepEqual(names("priya northwind"), ["Priya Sharma", "Priyanka Sharma-Rao"]);
});

test("ticket IDs (staff rows carry them): exact first, then 4+ character prefixes", () => {
  assert.deepEqual(names("POW100000001"), ["Priya Sharma"]);
  assert.deepEqual(names("pow1"), ["Priya Sharma"]);
  assert.deepEqual(names("pow"), [], "too short for an ID, and no name starts with it");
  assert.equal(ticketIdQuery("TECHFEST:POW1000 00001"), "pow100000001");
  assert.equal(ticketIdQuery("priya"), "", "names aren't ticket IDs");
  assert.equal(ticketIdQuery("ab12"), "");
});

test("ties broken by the station's rank (the lobby: not arrived first), then by name", () => {
  const arrived = new Set(["1"]);
  const got = search(idx, "sharma", { rank: (g) => (arrived.has(g.key) ? 1 : 0) }).map((g) => g.name);
  assert.equal(got.indexOf("Priya Sharma") > -1, true);
  assert.deepEqual(search(idx, "pri", { limit: 2 }).length, 2);
});

test("the badge box is the first letter of the surname", () => {
  assert.equal(boxLetter(G[0]), "S");
  assert.equal(boxLetter(G[1]), "S", "O'Brien-Smith → the last part");
  assert.equal(boxLetter(G[4]), "A", "Álvarez → A");
  assert.equal(boxLetter({ name: "Madonna" }), "M");
  assert.equal(boxLetter({ name: "李 小龍" }), "#");
  assert.equal(boxLetter({}), "#");
});
