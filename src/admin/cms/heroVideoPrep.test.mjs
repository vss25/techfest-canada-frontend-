import assert from "node:assert/strict";
import { VIDEO_LIMITS, describe, planVideo, targetSize } from "./heroVideoPrep.js";

// Sizes: within 1920 × 1080, same shape, even.
assert.deepEqual(targetSize(3840, 2160), { width: 1920, height: 1080 });
assert.deepEqual(targetSize(1920, 1080), { width: 1920, height: 1080 });
assert.deepEqual(targetSize(1280, 720), { width: 1280, height: 720 });
assert.deepEqual(targetSize(2560, 1600), { width: 1728, height: 1080 });   // 16:10 fits by height
assert.deepEqual(targetSize(1081, 1921), { width: 608, height: 1080 });     // portrait

const ok = { type: "video/mp4", size: 5e6, width: 1920, height: 1080, duration: 15 };
assert.deepEqual(planVideo(ok, { canShrink: true }), { action: "keep" });
assert.deepEqual(planVideo(ok, { canShrink: false }), { action: "keep" });

const big = planVideo({ ...ok, width: 3840, height: 2160 }, { canShrink: true });
assert.equal(big.action, "shrink");
assert.match(big.reasons.join(), /3840 × 2160/);
assert.equal(planVideo({ ...ok, duration: 45 }, { canShrink: true }).action, "shrink");
assert.equal(planVideo({ ...ok, size: 30e6 }, { canShrink: true }).action, "shrink");
assert.equal(planVideo({ ...ok, type: "video/quicktime" }, { canShrink: true }).action, "shrink");
// 20.4 s still counts as 20.
assert.equal(planVideo({ ...ok, duration: VIDEO_LIMITS.maxSeconds + 0.4 }, { canShrink: false }).action, "keep");

const refused = planVideo({ ...ok, size: 30e6 }, { canShrink: false });
assert.equal(refused.action, "refuse");
assert.match(refused.error, /Chrome or Edge/);
assert.equal(planVideo({ ...ok, width: 0 }, { canShrink: true }).action, "refuse");
assert.equal(planVideo({ ...ok, duration: NaN }, { canShrink: true }).action, "refuse");

assert.equal(describe({ size: 5.8e6, width: 1920, height: 1080, duration: 19.6 }), "5.8 MB · 1920 × 1080 · 20 s");
assert.equal(describe({ size: 0, width: 0, height: 0, duration: NaN }), "");
console.log("heroVideoPrep ok");
