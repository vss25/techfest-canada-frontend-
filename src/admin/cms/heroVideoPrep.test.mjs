import assert from "node:assert/strict";
import { VIDEO_LIMITS, clipPlan, clock, defaultClip, describe, keepsOriginal, planVideo, targetSize } from "./heroVideoPrep.js";

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
// Trim and speed (Nov 25 2026).
assert.deepEqual(defaultClip(45), { start: 0, end: 20, speed: 1, quality: "1080" });
assert.deepEqual(defaultClip(8), { start: 0, end: 8, speed: 1, quality: "1080" });
const p1 = clipPlan({ duration: 45, start: 5, end: 25, speed: 1 });
assert.equal(p1.outSeconds, 20);
assert.equal(p1.bytes, 6_250_000);
// 40 s sped up 2× plays for 20 s: allowed. 30 s at 1×: too long, and the message says how to fix it.
assert.equal(clipPlan({ duration: 60, start: 0, end: 40, speed: 2 }).outSeconds, 20);
assert.match(clipPlan({ duration: 60, start: 0, end: 30, speed: 1 }).error, /trim it shorter or speed it up/);
assert.match(clipPlan({ duration: 60, start: 0, end: 50, speed: 2 }).error, /trim it shorter or speed it up/);
// 4× and 8×: a 2-minute clip at 8× plays for 15 s; 3 minutes at 8× is too long, and there's no faster speed.
assert.equal(clipPlan({ duration: 200, start: 0, end: 120, speed: 8 }).outSeconds, 15);
assert.equal(clipPlan({ duration: 200, start: 0, end: 80, speed: 4 }).outSeconds, 20);
assert.match(clipPlan({ duration: 200, start: 0, end: 180, speed: 8 }).error, /trim it shorter\./);
// Slow motion doubles the length.
assert.equal(clipPlan({ duration: 20, start: 0, end: 10, speed: 0.5 }).outSeconds, 20);
assert.match(clipPlan({ duration: 20, start: 3, end: 4, speed: 1 }).error, /at least 2 seconds/);
assert.match(clipPlan({ duration: 20, speed: 3 }).error, /Pick a speed: 0.5×, 1×, 1.5×, 2×, 4×, 8×/);
// Out-of-range handles are clamped to the clip.
assert.deepEqual([clipPlan({ duration: 10, start: -4, end: 99 }).start, clipPlan({ duration: 10, start: -4, end: 99 }).end], [0, 10]);
// 720p: about half the bytes.
assert.equal(clipPlan({ duration: 20, end: 20, quality: "720" }).bytes, 3_250_000);
// Untouched: only the whole clip at 1× in 1080p, and only when it was already fine.
assert.equal(keepsOriginal({ action: "keep" }, defaultClip(15), 15), true);
assert.equal(keepsOriginal({ action: "keep" }, { ...defaultClip(15), speed: 2 }, 15), false);
assert.equal(keepsOriginal({ action: "keep" }, { ...defaultClip(15), start: 1 }, 15), false);
assert.equal(keepsOriginal({ action: "shrink" }, defaultClip(15), 15), false);
assert.equal(clock(7.5), "0:07.5");
assert.equal(clock(75), "1:15.0");
console.log("heroVideoPrep ok");
