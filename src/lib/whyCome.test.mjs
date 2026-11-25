import assert from "node:assert/strict";
import { VANCOUVER_BODY, WHY_DEFAULT_PHOTO, paragraphs, resolveWhy, whyBoxHeight, whyImageSrc } from "./whyCome.js";

const IMG = "https://cdn.sanity.io/images/021qtoci/production/abc-1600x900.jpg";
const GIF = "https://cdn.sanity.io/images/021qtoci/production/def-800x450.gif";
const MP4 = "https://cdn.sanity.io/files/021qtoci/production/0123abcd.mp4";

// Nothing set: the design, with the BC text only on Vancouver.
const van = resolveWhy({ city: "Vancouver" }, { cityId: "van", cityName: "Vancouver" });
assert.equal(van.eyebrow, "Why come");
assert.equal(van.heading, "Where Vancouver’s buyers, builders and policymakers meet.");
assert.deepEqual(van.body, [VANCOUVER_BODY]);
assert.equal(van.media.kind, "default");
assert.equal(van.media.src, WHY_DEFAULT_PHOTO);
assert.equal(van.heightPx, 340);
assert.equal(van.fit, "cover");
assert.equal(van.position, "50% 50%");
assert.equal(van.loop, true);

const cgy = resolveWhy({ city: "Calgary" }, { cityId: "cgy", cityName: "Calgary" });
assert.ok(!cgy.body.join(" ").includes("BC"), "no BC copy outside Vancouver");
assert.match(cgy.body[0], /Calgary’s technology buyers/);

// Staff's words win; blank lines make paragraphs.
const own = resolveWhy({ city: "Calgary", whyEyebrow: " Why Calgary ", whyHeading: "Meet the grid.", whyBody: "One.\n\nTwo\nlines." }, { cityId: "cgy" });
assert.equal(own.eyebrow, "Why Calgary");
assert.equal(own.heading, "Meet the grid.");
assert.deepEqual(own.body, ["One.", "Two lines."]);
assert.deepEqual(own.custom, { eyebrow: true, heading: true, body: true });

// Media: video when there is one (unset choice), image, GIF as uploaded, default when the choice has nothing.
assert.equal(resolveWhy({ whyVideoUrl: MP4 }).media.kind, "video");
assert.equal(resolveWhy({ whyVideoUrl: MP4 }).media.poster, WHY_DEFAULT_PHOTO);
assert.equal(resolveWhy({ whyVideoUrl: MP4, whyPosterUrl: IMG }).media.poster, `${IMG}?w=1200&fit=max&auto=format&q=78`);
assert.equal(resolveWhy({ whyVideoUrl: MP4, whyImageUrl: IMG, whyMedia: "image" }).media.kind, "image");
assert.equal(resolveWhy({ whyMedia: "video" }).media.kind, "default");
assert.equal(resolveWhy({ whyImageUrl: GIF }).media.src, GIF);
assert.equal(resolveWhy({ whyImageUrl: GIF }).media.gif, true);
assert.equal(resolveWhy({ whyVideoUrl: "https://evil.example/x.mp4" }).media.kind, "default");
assert.equal(resolveWhy({ whyImageUrl: "javascript:alert(1)" }).media.kind, "default");
assert.equal(resolveWhy({ whyVideoUrl: "blob:http://x/1" }, { preview: true }).media.kind, "video");
assert.equal(resolveWhy({ whyVideoUrl: "blob:http://x/1" }).media.kind, "default");

// Size, fit, framing, loop.
const sized = resolveWhy({ whyHeight: "l", whyFit: "contain", whyFocusX: 10, whyFocusY: 130, whyLoop: false });
assert.equal(sized.heightPx, 440);
assert.equal(sized.fit, "contain");
assert.equal(sized.position, "10% 100%");
assert.equal(sized.loop, false);
assert.equal(resolveWhy({ whyHeight: "xl" }).heightPx, 340);
assert.equal(whyBoxHeight("s"), "clamp(200px, 62vw, 260px)");

assert.equal(whyImageSrc(GIF), GIF);
assert.equal(whyImageSrc("http://cdn.sanity.io/images/a/b/c.jpg"), "");
assert.deepEqual(paragraphs(""), []);
console.log("whyCome ok");
