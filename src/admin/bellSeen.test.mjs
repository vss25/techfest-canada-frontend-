import assert from "node:assert/strict";
import { lowerSeen, unseenCount } from "./bellSeen.js";

const a = (changes, sos = 0, flags = 0, overdue = 0) => ({ changes, sos, flags, overdue });
// Never opened: everything counts.
assert.equal(unseenCount(a(12, 1), null), 13);
// Opened at 12 changes + 1 SOS: nothing new.
assert.equal(unseenCount(a(12, 1), a(12, 1)), 0);
// One new SOS arrives.
assert.equal(unseenCount(a(12, 2), a(12, 1)), 1);
// Changes published (12 -> 3): still nothing new, and seen comes down to 3.
assert.equal(unseenCount(a(3, 1), a(12, 1)), 0);
assert.deepEqual(lowerSeen(a(3, 1), a(12, 1)), a(3, 1));
// ...so a 4th change afterwards shows as new.
assert.equal(unseenCount(a(4, 1), lowerSeen(a(3, 1), a(12, 1))), 1);
console.log("bellSeen: ok");
