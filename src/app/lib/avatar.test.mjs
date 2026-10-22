// Author photos: the server's URL (an upload or a speaker's website photo), else People's (Oct 22 2026).
// Run: node --test src/app/lib/avatar.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { avatarFor, isUploadedAvatar } from "./avatar.js";

const sanity = "https://cdn.sanity.io/images/x/production/abc-512x512.jpg?w=256&h=256&fit=crop&fm=webp&q=80";

test("the URL sent with the item wins, whatever it is", () => {
  assert.equal(avatarFor({ authorId: "u1", authorAvatarUrl: sanity }, [{ id: "u1", avatarUrl: "/api/files/avatar/u1?v=2" }]), sanity);
  assert.equal(avatarFor({ user: { id: "u1", avatarUrl: sanity } }), sanity);
});

test("else the person's photo from People, else none", () => {
  assert.equal(avatarFor({ authorId: "u1", authorAvatarUrl: "" }, [{ id: "u1", avatarUrl: sanity }]), sanity);
  assert.equal(avatarFor({ authorId: "u2" }, [{ id: "u1", avatarUrl: sanity }]), "");
  assert.equal(avatarFor(null), "");
});

test("uploaded vs filled-in speaker photo", () => {
  assert.equal(isUploadedAvatar("/api/files/avatar/u1?v=3"), true);
  assert.equal(isUploadedAvatar("data:image/jpeg;base64,xx"), true);
  assert.equal(isUploadedAvatar(sanity), false);
  assert.equal(isUploadedAvatar(""), false);
});
