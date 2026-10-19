import { get, post } from "./api";
import { auth } from "./auth";

/* =========================================================
   "Alex is typing" (iOS TypingAPI / TypingReporter): report
   your own typing at most every 3 s, `typing: false` after a
   send, and ask who else is typing. scope: group | discussion | post.
========================================================= */

const signedIn = () => ["user", "demo"].includes(auth.get().mode);
const lastSent = new Map();

export function typingChanged(scope, id, text) {
  if (!signedIn() || !id) return;
  if (!text) { typingSent(scope, id); return; }
  const key = `${scope}:${id}`;
  if (Date.now() - (lastSent.get(key) || 0) < 3000) return;
  lastSent.set(key, Date.now());
  post("community/typing", { scope, id, typing: true }).catch(() => {});
}

export function typingSent(scope, id) {
  if (!signedIn() || !id) return;
  lastSent.delete(`${scope}:${id}`);
  post("community/typing", { scope, id, typing: false }).catch(() => {});
}

export async function whoIsTyping(scope, id) {
  if (!signedIn() || !id) return [];
  try {
    const r = await get(`community/typing?scope=${encodeURIComponent(scope)}&id=${encodeURIComponent(id)}`);
    return Array.isArray(r?.typing) ? r.typing : [];
  } catch { return []; }
}
