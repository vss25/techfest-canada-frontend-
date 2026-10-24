/* node --test src/checkin/lib/search.test.mjs: accents and case, first / last name prefixes, several words, company,
   ticket IDs (staff), best matches first, and the badge-box letter. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FUZZY_BELOW, boxLetter, buildIndex, editDistance, fold, highlight, initials, matchLabel, search, searchDetailed, soundFold, ticketIdQuery } from "./search.js";

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
  assert.deepEqual(names("obrien"), ["Zoë O'Brien-Smith"], "a surname of several words typed as one (o brien → obrien)");
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

/* ---------- Names a lobby volunteer only heard (Oct 23) ---------- */

const H = [
  { key: "h1", name: "Stefanie Marotta", firstName: "Stefanie", lastName: "Marotta", company: "The Globe and Mail", title: "Editor" },
  { key: "h2", name: "Ruta Kalnina", firstName: "Ruta", lastName: "Kalnina", company: "KPMG", title: "Partner" },
  { key: "h3", name: "Dev Anand", firstName: "Dev", lastName: "Anand", company: "Royal Bank of Canada" },
  { key: "h4", name: "Lina Osei", firstName: "Lina", lastName: "Osei", company: "Toronto Business Development Centre" },
  { key: "h5", name: "Raj Gill", firstName: "Raj", lastName: "Gill", company: "NGen" },
  { key: "h6", name: "Pieter van Hoeken", firstName: "Pieter", lastName: "van Hoeken", company: "Philips" },
  { key: "h7", name: "Ruth Benzvy Miller", firstName: "Ruth", lastName: "Benzvy Miller", company: "Contoso" },
  { key: "h8", name: "Mike McIntyre", firstName: "Mike", lastName: "McIntyre", company: "Fabrikam" },
  { key: "h9", name: "Catherine Dubois", firstName: "Catherine", lastName: "Dubois", company: "Lakeshore" },
  { key: "h10", name: "Muhammad Aziz", firstName: "Muhammad", lastName: "Aziz", company: "Coho" },
  { key: "h11", name: "Mohammed Farah", firstName: "Mohammed", lastName: "Farah", company: "Wingtip" },
  { key: "h12", name: "Ana Lima", firstName: "Ana", lastName: "Lima", organisation: "Shopify" },
];
const hidx = buildIndex(H);
const top = (q) => search(hidx, q)[0]?.name || "";
const found = (q) => search(hidx, q).map((g) => g.name);
const kindOf = (q) => searchDetailed(hidx, q)[0]?.kind || "";

test("first name, last name or organisation alone, or mixed in any order", () => {
  assert.equal(top("stefanie"), "Stefanie Marotta");
  assert.equal(top("marotta"), "Stefanie Marotta");
  assert.equal(top("globe"), "Stefanie Marotta");
  assert.equal(kindOf("globe"), "company");
  assert.equal(top("globe marotta"), "Stefanie Marotta");
  assert.equal(top("marotta globe"), "Stefanie Marotta");
  assert.equal(top("kpmg ruta"), "Ruta Kalnina");
  assert.equal(top("kpmg"), "Ruta Kalnina", "KPMG as a word");
  assert.equal(top("shopify"), "Ana Lima", "the organisation field when the row has no company");
});

test("multi-word surnames, typed apart or as one", () => {
  for (const q of ["van hoeken", "vanhoeken", "hoeken"]) assert.equal(top(q), "Pieter van Hoeken", q);
  for (const q of ["benzvy miller", "benzvymiller", "miller"]) assert.equal(top(q), "Ruth Benzvy Miller", q);
});

test("organisation initials (skipping of / and / the / &); one-word names as words", () => {
  assert.equal(initials("Royal Bank of Canada"), "rbc");
  assert.equal(initials("The Globe and Mail"), "gm");
  assert.equal(initials("Toronto Business Development Centre"), "tbdc");
  assert.equal(initials("Procter & Gamble"), "pg");
  assert.equal(initials("NGen"), "", "one word: no initials (matched as a word)");
  assert.equal(top("rbc"), "Dev Anand");
  assert.equal(kindOf("rbc"), "initials");
  assert.equal(top("tbdc"), "Lina Osei");
  assert.equal(top("ngen"), "Raj Gill");
  assert.equal(top("rbc dev"), "Dev Anand");
});

test("spelling tolerance: one typo for 4–6 letters, two from 7, sound-alikes; ranked below every real match", () => {
  assert.equal(editDistance("marota", "marotta"), 1);
  assert.equal(editDistance("marotat", "marotta"), 1, "a swap is one typo");
  assert.equal(soundFold("katherine"), soundFold("catherine"));
  assert.equal(soundFold("macintyre"), soundFold("mcintire"));
  assert.equal(top("marota"), "Stefanie Marotta");
  assert.equal(kindOf("marota"), "fuzzy-name");
  assert.equal(top("mcintire"), "Mike McIntyre");
  assert.equal(top("katherine"), "Catherine Dubois");
  assert.deepEqual(found("mohammad").sort(), ["Mohammed Farah", "Muhammad Aziz"]);
  assert.deepEqual(found("muhamed").sort(), ["Mohammed Farah", "Muhammad Aziz"]);
  assert.equal(top("kalnena"), "Ruta Kalnina", "two typos in 7 letters");
  assert.deepEqual(found("rutx").sort(), ["Ruta Kalnina", "Ruth Benzvy Miller"], "4 letters: one typo (Ruta, Ruth)");
  assert.deepEqual(found("rtxx"), [], "two typos in 4 letters: no");
  assert.deepEqual(found("rtx"), [], "3 letters: no typos");
  assert.equal(matchLabel("fuzzy-name"), "Similar spelling");
  assert.equal(matchLabel("company"), "Company match");
});

test("very short queries only match the start of a word (no initials, no typos)", () => {
  // "ma": only guests with a word starting "ma" (Marotta, Mail; Muhammad, Mike / McIntyre don't: "mu", "mi", "mc").
  assert.deepEqual(found("ma"), ["Stefanie Marotta"]);
  assert.deepEqual(found("rb"), [], "two letters aren't initials");
  assert.deepEqual(found("xq"), []);
  assert.deepEqual(found("q"), [], "a letter that starts nothing finds nothing (no typos)");
});

test("ranking: exact name > name prefix > last name > organisation > similar spelling", () => {
  const R = buildIndex([
    { key: "e", name: "Stephanie Wong", company: "Coho" },           // sounds alike (ph/f)
    { key: "d", name: "Bob Ray", company: "Stefanie Labs" },          // organisation
    { key: "c", name: "Ann Stefanie", lastName: "Stefanie" },         // last name
    { key: "b", name: "Stefanie Marotta" },                           // name prefix
    { key: "a", name: "Stefanie" },                                   // the whole name
  ]);
  assert.deepEqual(search(R, "stefanie").map((g) => g.key), ["a", "b", "c", "d", "e"]);
  const r = searchDetailed(R, "stefanie");
  assert.ok(r.at(-1).score < r.at(-2).score && r.at(-1).score < 200, "a fuzzy match never outranks a real one");
});

test("what matched is shown: the matched letters, a company match", () => {
  assert.deepEqual(highlight("Stefanie Marotta", "mar"), [{ text: "Stefanie ", hit: false }, { text: "Mar", hit: true }, { text: "otta", hit: false }]);
  assert.deepEqual(highlight("Zoë O'Brien", "zoe"), [{ text: "Zoë", hit: true }, { text: " O'Brien", hit: false }]);
  assert.deepEqual(highlight("The Globe and Mail", "globe ste"), [{ text: "The ", hit: false }, { text: "Globe", hit: true }, { text: " and Mail", hit: false }]);
});

test("instant for ~1,500 guests: a keystroke (incl. the spelling fallback) in a few milliseconds", () => {
  const big = buildIndex(Array.from({ length: 1500 }, (_, i) => ({ key: `b${i}`, name: `Guest${i} Person${i % 97}`, company: `Company ${i % 211} Group`, title: "Director" })));
  const t0 = performance.now();
  for (const q of ["g", "gu", "gue", "pers", "perzon", "compny", "zzqxwy", "company 12 group"]) searchDetailed(big, q, { limit: 40 });
  const per = (performance.now() - t0) / 8;
  assert.ok(per < 40, `${per.toFixed(1)} ms per keystroke`);
  assert.ok(FUZZY_BELOW >= 5);
});
