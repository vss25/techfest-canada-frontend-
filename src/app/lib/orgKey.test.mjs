// Organisation keys: the same as the server's (backend services/companies.js companyKey).
// Run: node --test src/app/lib/orgKey.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { companyKey, orgInitials } from "./orgKey.js";

test("one key per organisation, the server's way", () => {
  assert.equal(companyKey("Dell Technologies, Inc."), "dell technologies");
  assert.equal(companyKey("dell technologies"), "dell technologies");
  assert.equal(companyKey("Dell"), "dell");
  assert.equal(companyKey("AT&T"), "at and t");
  assert.equal(companyKey("J.P. Morgan"), "jp morgan");
  assert.equal(companyKey("The Christy Clark Show"), "christy clark show");
  assert.equal(companyKey("Acme Holdings Ltd."), "acme holdings");
  assert.equal(companyKey("Société Générale S.A."), "societe generale");
  assert.equal(companyKey("Inc"), "inc"); // a name that is only a legal form stays
  assert.equal(companyKey(""), "");
  assert.equal(companyKey(null), "");
});

test("conservative: a longer name is a different organisation", () => {
  assert.notEqual(companyKey("IBM"), companyKey("IBM Consulting"));
  assert.notEqual(companyKey("Government of Ontario"), companyKey("Ontario Government"));
});

test("monogram letters for tiles without a logo", () => {
  assert.equal(orgInitials("Lakeshore Insurance"), "LI");
  assert.equal(orgInitials("DHL"), "DHL");
  assert.equal(orgInitials("Ontario Teachers' Pension Plan"), "OT");
  assert.equal(orgInitials("Procter & Gamble"), "PG");
  assert.equal(orgInitials("Department of Digital Affairs"), "DD");
  assert.equal(orgInitials("The Christy Clark Show"), "CC");
  assert.equal(orgInitials(""), "");
});
