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

test("names and photos open the right profile (Oct 22 2026)", async () => {
  const { authorPath } = await import("./avatar.js");
  assert.equal(authorPath({ authorId: "u1" }, { meId: "u9" }), "/people/u1");
  assert.equal(authorPath({ authorId: "u9" }, { meId: "u9" }), "/profile");
  assert.equal(authorPath({ authorId: "u2", authorSpeakerId: "sp-7" }), "/speakers/sp-7");
  assert.equal(authorPath({ authorId: "u2", authorSpeakerId: "" }), "/people/u2");
  assert.equal(authorPath({ authorId: "u3" }, { blocked: ["u3"] }), null);
  assert.equal(authorPath({ authorName: "No id" }), null);
  assert.equal(authorPath({ authorId: "u1" }, { people: false }), null);
});

test("a post's photo opens what its name does; announcements stay plain (Oct 24 2026)", async () => {
  const { postAuthorPath, photoLabel } = await import("./avatar.js");
  assert.equal(postAuthorPath({ authorId: "u1", kind: "member" }, { meId: "u9" }), "/people/u1");
  assert.equal(postAuthorPath({ authorId: "u9", kind: "member" }, { meId: "u9" }), "/profile");
  assert.equal(postAuthorPath({ authorId: "admin1", kind: "announcement" }, { meId: "u9" }), null);
  assert.equal(postAuthorPath({ authorId: "u9", kind: "announcement" }, { meId: "u9" }), null);
  assert.equal(postAuthorPath({ authorId: "u3", kind: "member" }, { blocked: ["u3"] }), null);
  assert.equal(postAuthorPath({ authorName: "No id" }), null);
  assert.equal(postAuthorPath(null), null);
  // Guests (no meId): someone with an id still opens; the directory off: nowhere.
  assert.equal(postAuthorPath({ authorId: "u1" }), "/people/u1");
  assert.equal(postAuthorPath({ authorId: "u1" }, { people: false }), null);
  assert.equal(photoLabel("Alex Morgan"), "View Alex Morgan's profile");
  assert.equal(photoLabel("  Jane Doe \n"), "View Jane Doe's profile");
  assert.equal(photoLabel(""), "View profile");
});
