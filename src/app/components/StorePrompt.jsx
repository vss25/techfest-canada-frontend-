import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import StoreBadges from "../../components/StoreBadges";
import { storeNames } from "../../lib/appStores";
import { detectOS } from "../../lib/pwaPlatform";
import { track } from "../../lib/pwaEvents";
import { isNativeVisit } from "../../lib/nativeVisit";
import { useStore, session } from "../lib/store";
import { auth } from "../lib/auth";
import { content } from "../lib/content";
import { getAppSnooze, snoozeGetApp } from "../lib/getAppSnooze";
import { DELAY_MS, SEEN_KEY, VISIBLE_KEY, promptBlocker, promptStore } from "../lib/storePrompt";
import { Sheet } from "./ui";

/* =========================================================
   "Get the TTFC app": a bottom sheet for web app users with ONE
   store, this device's own (Oct 24 2026): the App Store on an
   iPhone / iPad, Google Play on Android; nothing anywhere else.
   Who, where and when: lib/storePrompt.js (staff switch
   flag.pwaPrompt, once per session, 5 s on a calm screen, not for
   people who came from the iPhone or Android app). Here: it also
   waits while another sheet is open or someone is typing.
   "Not now", ×, Escape or the backdrop snooze it (and Home's card)
   for 7 days; so does the store button, which then opens the store.
   Events (lib/pwaEvents.js, the existing ones): pwa_prompt_shown,
   pwa_prompt_dismissed, and StoreBadges' pwa_store_click
   (where "app_prompt").
========================================================= */

/** Another sheet or dialog is open, or a text field has the keyboard: not now. */
function busy() {
  if (document.querySelector('[aria-modal="true"]')) return true;
  const el = document.activeElement;
  return !!el && el !== document.body && !!el.matches?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
}

export default function StorePrompt() {
  const ct = useStore(content);
  const { mode } = useStore(auth);
  const { until } = useStore(getAppSnooze);
  const { pathname } = useLocation();
  const [os] = useState(() => detectOS());
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const closing = useRef(0);
  const store = promptStore(os);

  // The address bar's path (/app/…): the router's pathname has /app taken off.
  const blocker = promptBlocker({
    values: ct.values, os, nativeVisit: isNativeVisit(), seen: session.get(SEEN_KEY) === "1",
    snoozedUntil: until, mode, pathname: `/app${pathname}`, now,
  });

  // 5 s of visible time on calm screens this session (paused while the tab is hidden), then open when nothing
  // else is on screen.
  useEffect(() => {
    if (open || blocker) return undefined;
    let last = Date.now();
    const tick = setInterval(() => {
      const t = Date.now();
      const visible = document.visibilityState === "visible";
      const total = Number(session.get(VISIBLE_KEY) || 0) + (visible ? Math.min(t - last, 1000) : 0);
      last = t;
      session.set(VISIBLE_KEY, String(total));
      if (total < DELAY_MS || !visible || busy()) return;
      clearInterval(tick);
      session.set(SEEN_KEY, "1");
      setNow(t);
      setOpen(true);
      track("pwa_prompt_shown", { where: "webapp", layout: "store_sheet", store, page: pathname.slice(0, 80) });
    }, 250);
    return () => clearInterval(tick);
  }, [open, blocker, store, pathname]);

  useEffect(() => () => clearTimeout(closing.current), []);

  if (!open) return null;

  const notNow = () => {
    snoozeGetApp();
    track("pwa_prompt_dismissed", { where: "webapp", reason: "not_now", store });
    setOpen(false);
  };
  // The store link opens the store itself (StoreBadges counts the tap). The sheet closes a moment later: a link
  // taken off the page while it's being followed would go nowhere.
  const onStore = (e) => {
    if (!e.target.closest?.("a[data-store]")) return;
    snoozeGetApp();
    clearTimeout(closing.current);
    closing.current = setTimeout(() => setOpen(false), 400);
  };

  return (
    <Sheet open onClose={notNow} labelledBy="store-prompt-h">
      <div className="sheet-body store-prompt">
        <img src="/app/icons/icon-192.png" alt="" width="72" height="72" className="app-icon" />
        <h2 id="store-prompt-h">Get the TTFC app</h2>
        <p>Your pass, the schedule, live polls and chat.<br />Free on {storeNames(undefined, os)}.</p>
        <div className="store-prompt-badge" onClickCapture={onStore}>
          <StoreBadges where="app_prompt" os={os} size="lg" />
        </div>
        <button type="button" className="link-btn store-prompt-later" onClick={notNow}>Not now</button>
      </div>
    </Sheet>
  );
}
