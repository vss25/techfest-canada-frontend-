import { useEffect, useState } from "react";
import { useStore, local } from "./store";
import { auth, isSignedIn } from "./auth";
import { social, bookmarks } from "./social";
import { cms } from "./cms";
import { points, pointsLine } from "./points";
import { loadAttending } from "./engage";
import { torontoDate } from "./time";
import { content } from "./content";
import { refreshSwag, swagNow, swagState } from "./swagState";
import { DISMISS_MS, eligibleCtas, feedWithCtas, seededShuffle, torontoDay } from "./feedCtas.js";

/* The feed's "Earn points" cards for this person (lib/feedCtas.js has the rules): the posts with the cards placed,
   and dismiss(key) for a card's "Not now" (hidden 3 days, on this device, per person). */

const FESTIVAL = [torontoDate(26).getTime(), torontoDate(28).getTime()];
const dismissKey = (uid) => `ttfc.feedCta.dismissed.${uid || "me"}`;

export function useFeedCtas(posts, now) {
  const a = useStore(auth);
  const s = useStore(social);
  const c = useStore(cms);
  const { me: pts } = useStore(points);
  const ct = useStore(content);
  const sw = useStore(swagState);
  const signedIn = isSignedIn(a);
  const uid = a.me?.id || a.user?._id || "";
  const [attendingPosted, setAttendingPosted] = useState(false);
  // "Not now" times, on this device per person; re-read after a dismiss (the counter re-renders).
  const [, setVersion] = useState(0);
  const dismissed = local.json(dismissKey(uid), {});

  // Whether their I'm-attending post is confirmed (and the link ready for the card's button).
  useEffect(() => {
    if (!signedIn) return undefined;
    let alive = true;
    loadAttending().then((e) => { if (alive) setAttendingPosted(!!e?.posted); }, () => {});
    refreshSwag();
    return () => { alive = false; };
  }, [signedIn]);

  const day = torontoDay(now);
  const festivalDay = now >= FESTIVAL[0] && now < FESTIVAL[1];
  const saved = bookmarks(s);
  // A session you saved that's on now (for "Vote in a live poll").
  const liveSession = festivalDay ? c.sessions.find((x) => saved.includes(x.id) && x.start <= now && x.end > now && x.type !== "break") || null : null;
  const me = a.me || {};
  // The swag kit giveaway (Admin › Swag kit giveaway): a card while it's on and points still count.
  const swag = swagNow(sw.data, ct.values, Number(now));
  // Recomputed each render (cheap); the order only changes with the person and the day (seeded shuffle).
  const keys = !signedIn ? [] : seededShuffle(eligibleCtas({
    counted: pts ? (k) => pointsLine(pts, k)?.count || 0 : null,
    activity: pts ? (k) => Number(pts.activity?.[k]) || 0 : null,
    attendingPosted, linkedinUrl: me.linkedinUrl || a.user?.linkedinUrl, topics: me.topics || a.user?.topics,
    availabilitySlots: me.availabilitySlots, saved: saved.length, requestsSent: s.connections.outgoing.length,
    festivalDay, liveSession, dismissed, now, swagOpen: swag.stage === "open",
  }), `${uid}|${day}`);

  const items = feedWithCtas(posts, keys);
  const dismiss = (key) => {
    const now = Date.now();
    // Keep only the ones still hidden, plus this one.
    const next = Object.fromEntries(Object.entries({ ...dismissed, [key]: now + DISMISS_MS }).filter(([, until]) => until > now));
    local.set(dismissKey(uid), JSON.stringify(next));
    setVersion((n) => n + 1);
  };
  return { items, dismiss, liveSession, swag, rules: pts?.rules || [] };
}
