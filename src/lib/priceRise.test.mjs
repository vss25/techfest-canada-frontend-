// The Oct 23 2026 price rise display. Run: node --test src/lib/priceRise.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { PRICE_RISE, RISE_NOTICE, announcementText, wasPrice } from "./priceRise.js";

const before = PRICE_RISE.at - 1;
const after = PRICE_RISE.at;

test("the earlier price shows only after 3 PM and only when the price went up", () => {
  assert.equal(wasPrice("connect", 824, before), null);
  assert.equal(wasPrice("connect", 824, after), 749);
  assert.equal(wasPrice("apex", 1649, after), 1499);
  assert.equal(wasPrice("power", 999, after), null);       // inventory not switched yet: no fake "was"
  assert.equal(wasPrice("booth-single", 2499, after), null);
});

test("a 'prices go up' notice turns into 'prices went up' after the rise", () => {
  const old = "Prices go up on Friday 23rd October. Get your pass now →";
  assert.equal(announcementText(old, before), old);
  assert.equal(announcementText(old, after), RISE_NOTICE);
  assert.equal(announcementText("Agenda is live", after), "Agenda is live");
  assert.equal(announcementText("", after), "");
});
