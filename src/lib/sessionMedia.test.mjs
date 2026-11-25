// A session's card media. Run: node --test src/lib/sessionMedia.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { sessionCardMedia, sessionMediaKind } from "./sessionMedia.js";

const CDN = "https://cdn.sanity.io/files/021qtoci/production/";

test("only our own uploads count: an MP4 is a video, a GIF is a gif", () => {
  assert.equal(sessionMediaKind(CDN + "abc123.mp4"), "video");
  assert.equal(sessionMediaKind(CDN + "abc123.GIF"), "gif");
  assert.equal(sessionMediaKind("https://example.com/a.mp4"), "");
  assert.equal(sessionMediaKind(CDN + "abc123.pdf"), "");
  assert.equal(sessionMediaKind(""), "");
  assert.equal(sessionMediaKind(undefined), "");
});

test("the GIF / video wins, the picture is its first frame; a picture alone is an image; nothing = null", () => {
  assert.deepEqual(sessionCardMedia("https://img/x.jpg", CDN + "v.mp4"), { kind: "video", src: CDN + "v.mp4", poster: "https://img/x.jpg" });
  assert.deepEqual(sessionCardMedia("", CDN + "g.gif"), { kind: "gif", src: CDN + "g.gif", poster: "" });
  assert.deepEqual(sessionCardMedia("https://img/x.jpg", ""), { kind: "image", src: "https://img/x.jpg", poster: "" });
  assert.deepEqual(sessionCardMedia("https://img/x.jpg", "https://elsewhere.com/v.mp4"), { kind: "image", src: "https://img/x.jpg", poster: "" });
  assert.equal(sessionCardMedia("", ""), null);
});
