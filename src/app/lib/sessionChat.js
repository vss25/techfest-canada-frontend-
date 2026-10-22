/* =========================================================
   Session chats (Oct 21 2026): 30 minutes before a session
   starts, the server opens a group chat for it (the group's
   `sessionId`) with everyone registered; people who register
   later join it until the session ends, and it stays after the
   session. Meals, breaks and registration never get one.
   The session page (GET /community/groups/session/:sessionId,
   social.js fetchSessionGroup):
   "Open session chat" once you're in it; registered but you
   left it, "Join session chat"; registered and no chat yet,
   "Session chat opens 30 min before". Pure (sessionChat.test.mjs).
========================================================= */

export const SESSION_CHAT_LEAD_MS = 30 * 60 * 1000;

// Meals, breaks and registration; a "break-out" / "breakout" session is a normal one.
const NO_CHAT = /\b(breakfast|brunch|lunch|luncheon|dinner|registration)\b|\bbreak\b(?![-\s]?out)/i;

/** Sessions that get a chat: not a break / meal / registration (the server's rule). */
export const sessionGetsChat = (x) => !!x && x.type !== "break" && !NO_CHAT.test(String(x.title || ""));

/** The session's group in the groups list (GET /community/groups), or null. */
export function sessionGroupOf(x, groups) {
  if (!x) return null;
  const ids = new Set([x.id, x.cmsId].filter(Boolean).map(String));
  return (groups || []).find((g) => g?.sessionId && ids.has(String(g.sessionId))) || null;
}
