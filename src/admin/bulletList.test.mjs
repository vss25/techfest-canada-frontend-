import assert from "node:assert/strict";
import { cleanItem, finishList, splitPasted } from "./bulletList.js";

assert.equal(cleanItem("• Gala dinner"), "Gala dinner");
assert.equal(cleanItem("  - Both days  "), "Both days");
assert.equal(cleanItem("✓ Expo floor"), "Expo floor");
assert.equal(cleanItem("1. Keynotes"), "Keynotes");
assert.equal(cleanItem("2) Lunch"), "Lunch");
assert.equal(cleanItem("a) VIP lounge"), "VIP lounge");
// Words that only look like markers stay.
assert.equal(cleanItem("2× Day conference access"), "2× Day conference access");
assert.equal(cleanItem("A seat at the gala"), "A seat at the gala");
assert.equal(cleanItem("1:1 meetings"), "1:1 meetings");
assert.equal(cleanItem("Day   1   and 2"), "Day 1 and 2");

assert.deepEqual(splitPasted("• One\n\n- Two\r\n* Three\n"), ["One", "Two", "Three"]);
assert.deepEqual(splitPasted("Just one"), ["Just one"]);
assert.deepEqual(finishList([" a ", "", "• b", "   "]), ["a", "b"]);
assert.deepEqual(finishList(null), []);
console.log("bulletList ok");
