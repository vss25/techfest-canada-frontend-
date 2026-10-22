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
