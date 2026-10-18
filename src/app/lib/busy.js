/* Work the person would lose to a reload (uploads in flight). lib/pwa.js
   waits for these, and for typed-in text, before applying an update. */

let running = 0;

/** Call when the work starts; call the function it returns when it ends. */
export function beginTask() {
  running += 1;
  let ended = false;
  return () => { if (!ended) { ended = true; running = Math.max(0, running - 1); } };
}

export function isMidTask() {
  if (running > 0) return true;
  // Text typed into a composer, chat, comment or form (search boxes don't count).
  const fields = document.querySelectorAll("textarea, input:not([type]), input[type=text], input[type=email], input[type=url], input[type=tel], [contenteditable=true]");
  for (const el of fields) {
    if (el.closest("[data-no-busy]") || el.type === "search") continue;
    const v = el.isContentEditable ? el.textContent : el.value;
    if (v && v.trim()) return true;
  }
  return false;
}
