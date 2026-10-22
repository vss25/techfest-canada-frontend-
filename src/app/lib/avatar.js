/* =========================================================
   Which photo to show for a post / comment / message author:
   the URL the server sends with it (an uploaded photo, or a
   speaker's photo from the website when they haven't uploaded
   one, Oct 22 2026), else that person's photo from People, else
   none (initials). Never a client-side "no photo unless
   avatarVersion" shortcut: whatever URL the server sends shows.
   Pure; `node --test src/app/lib/avatar.test.mjs`.
========================================================= */

/** `item`: anything with authorAvatarUrl / avatarUrl / authorId / userId; `people`: the People list. → URL or "" */
export function avatarFor(item, people = []) {
  if (!item) return "";
  const own = item.authorAvatarUrl || item.avatarUrl || item.author?.avatarUrl || item.user?.avatarUrl || "";
  if (own) return own;
  const id = item.authorId || item.userId || item.author?.id || item.user?.id;
  if (!id) return "";
  const p = people.find((x) => x.id === id);
  return p?.avatarUrl || "";
}

/** The server's avatar URL is the person's own upload (/api/files/avatar/…), not a speaker photo it filled in. */
export const isUploadedAvatar = (url) => /\/api\/files\/avatar\//.test(String(url || "")) || /^(data|blob):/.test(String(url || ""));

/**
 * Where tapping an author's name or photo goes (Oct 22 2026, the organiser: "make their names clickable in the
 * comment section"): you → your profile; a speaker (authorSpeakerId on comments, discussions, replies and group
 * messages) → their speaker page; anyone else → their profile. Someone you blocked, or no id: nowhere (plain text).
 * `people`: false when the directory is off.
 */
export function authorPath(item, { meId = "", blocked = [], people = true } = {}) {
  const id = String(item?.authorId || item?.userId || item?.author?.id || "");
  if (!id || blocked.includes(id)) return null;
  if (meId && id === String(meId)) return "/profile";
  const speaker = item?.authorSpeakerId || item?.speakerId;
  if (speaker) return `/speakers/${encodeURIComponent(speaker)}`;
  return people ? `/people/${encodeURIComponent(id)}` : null;
}
