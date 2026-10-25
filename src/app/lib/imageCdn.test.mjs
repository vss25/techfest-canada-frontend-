// Image URLs sized for how they're shown (Oct 24 2026). Same cases as iOS ImageCDNChecks and Android ImageCdnTest.
// Run: node --test src/app/lib/imageCdn.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { sized } from "./imageCdn.js";

test("Cloudinary: a limit before the version, after their own transformations", () => {
  assert.equal(sized("https://res.cloudinary.com/pyizshnb/image/upload/v1792640196/ttfc/logos/quanser-6f190a3432.png", 480, 240),
    "https://res.cloudinary.com/pyizshnb/image/upload/c_limit,w_480,h_240/v1792640196/ttfc/logos/quanser-6f190a3432.png");
  // The backend's SVG/ICO logos as 512 px PNGs.
  assert.equal(sized("https://res.cloudinary.com/pyizshnb/image/upload/f_png,w_512,h_512,c_fit/v1792772862/ttfc/logos/amlok-0d8429e054.png", 480, 240),
    "https://res.cloudinary.com/pyizshnb/image/upload/f_png,w_512,h_512,c_fit/c_limit,w_480,h_240/v1792772862/ttfc/logos/amlok-0d8429e054.png");
  assert.equal(sized("https://res.cloudinary.com/x/image/upload/ttfc/posts/a.jpg", 1280, 1600),
    "https://res.cloudinary.com/x/image/upload/c_limit,w_1280,h_1600/ttfc/posts/a.jpg");
  const once = "https://res.cloudinary.com/x/image/upload/c_limit,w_480,h_240/v1/a.png";
  assert.equal(sized(once, 480, 240), once);
  assert.equal(sized("https://res.cloudinary.com/x/video/upload/v1/a.mp4", 480, 240), "https://res.cloudinary.com/x/video/upload/v1/a.mp4");
});

test("Sanity: our size replaces theirs, the format stays, SVGs become PNGs", () => {
  assert.equal(sized("https://cdn.sanity.io/images/021qtoci/production/abc-1200x677.png", 480, 240),
    "https://cdn.sanity.io/images/021qtoci/production/abc-1200x677.png?w=480&h=240&fit=max");
  assert.equal(sized("https://cdn.sanity.io/images/021qtoci/production/fd4-246x44.svg?fm=png&w=512&h=512&fit=clip", 480, 240),
    "https://cdn.sanity.io/images/021qtoci/production/fd4-246x44.svg?fm=png&w=480&h=240&fit=max");
  assert.equal(sized("https://cdn.sanity.io/images/021qtoci/production/x-10x10.svg", 1080, 480),
    "https://cdn.sanity.io/images/021qtoci/production/x-10x10.svg?w=1080&h=480&fit=max&fm=png");
});

test("other hosts, server paths and empty values are left alone", () => {
  for (const u of ["https://logo.example.com/acme.png", "https://techfest-canada-backend.onrender.com/api/files/avatar/u1?v=2",
    "http://127.0.0.1:5197/api/files/post/a.jpg?p=1", "/api/files/post/a.jpg", "blob:https://x/1", ""]) {
    assert.equal(sized(u, 480, 240), u);
  }
  assert.equal(sized(null, 480, 240), null);
});
