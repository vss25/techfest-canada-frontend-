import { createStore, session } from "./store";

/* The guest announcement banner's dismissal, per tab session and per text (iOS SiteAnnouncementState). */

const KEY = "ttfc.siteAnnouncement.dismissed";
export const announcement = createStore({ dismissed: session.get(KEY) || "" });

/** Shown to guests while its text is set and hasn't been dismissed. */
export const announcementShown = (authState, text, s = announcement.get()) => authState.mode === "guest" && !!text && s.dismissed !== text;

export function dismissAnnouncement(text) {
  session.set(KEY, text);
  announcement.set({ dismissed: text });
}
