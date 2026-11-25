/* A session's card media (Nov 25 2026): Admin › Agenda › a session › "On the session's card".
   mediaUrl holds a GIF or MP4 uploaded to our own Sanity file CDN; only those play on the website (a pasted
   link to another site never does). Pure, unit-tested (sessionMedia.test.mjs). */

const OURS = /^https:\/\/cdn\.sanity\.io\/files\/[\w-]+\/[\w-]+\/[\w.-]+\.(mp4|gif)$/i;

/** "video" | "gif" | "" for a session's mediaUrl. */
export function sessionMediaKind(url) {
  const m = OURS.exec(String(url || "").trim());
  return m ? (m[1].toLowerCase() === "mp4" ? "video" : "gif") : "";
}

/** What a card shows: { kind: "video" | "gif" | "image", src, poster } or null.
    imageUrl = the session picture's address (already sized), mediaUrl = its GIF / video. */
export function sessionCardMedia(imageUrl, mediaUrl) {
  const kind = sessionMediaKind(mediaUrl);
  const img = String(imageUrl || "").trim();
  if (kind) return { kind, src: String(mediaUrl).trim(), poster: img };
  return img ? { kind: "image", src: img, poster: "" } : null;
}
