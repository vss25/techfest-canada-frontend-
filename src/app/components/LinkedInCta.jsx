import { useEffect, useRef } from "react";
import { BadgeCheck, ChevronRight } from "lucide-react";
import { useStore } from "../lib/store";
import { auth, isSignedIn } from "../lib/auth";
import { points, pointsDone } from "../lib/points";
import { attendingPostedHint, openAttending, openShare, prefetchAttending, prefetchShare } from "../lib/engage";
import { AppMark } from "./PostShareSheet";

/* =========================================================
   LinkedIn from the app (Oct 22 2026):
   • "Tell your network you're attending · +50 points": a row on
     Profile (the feed has it as an "Earn points" card since Oct 22
     2026: FeedCta.jsx). It opens the website's I'm-attending page for this
     person (GET app/attending-link), where "Post to LinkedIn"
     posts it and earns the points.
   • "Share on LinkedIn" on a session chat (the session's discussion)
     and a poll's results: the website's draft page for it
     (POST app/linkedin/share).
   The links are fetched as the button shows, so the tap opens
   the page at once (lib/engage.js).
========================================================= */

const POINTS_NOTE = "Points are added when you post with Post to LinkedIn.";

/** Their I'm-attending post is confirmed (the points service counted it, or the link said so). */
function useAttendingPosted() {
  const { me } = useStore(points);
  return pointsDone(me, "linkedin.attending") > 0 || attendingPostedHint();
}

/** Profile: the same as a row (done once posted). */
export function AttendingRow() {
  const a = useStore(auth);
  const posted = useAttendingPosted();
  const signedIn = isSignedIn(a);
  useEffect(() => { if (signedIn && !posted) prefetchAttending(); }, [signedIn, posted]);
  if (!signedIn) return null;
  return (
    <button type="button" className="list-row pressable" style={{ padding: 14 }} onClick={openAttending}>
      <AppMark id="linkedin" />
      <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <b style={{ display: "block" }}>{posted ? "You posted that you're attending" : "Tell your network you're attending"}</b>
        <span className="tiny muted">{posted ? "+50 points earned. Thank you for spreading the word." : `+50 points. ${POINTS_NOTE}`}</span>
      </span>
      {posted ? <BadgeCheck aria-hidden="true" className="accent-text" style={{ width: 20, height: 20 }} /> : <ChevronRight className="chev" aria-hidden="true" />}
    </button>
  );
}

/**
 * "Share on LinkedIn": `item` is { kind: "discussion", sessionId } (a session's chat) or { kind: "poll", id,
 * sessionId, question, options } (the labels as shown; the server adds the results).
 */
export function ShareOnLinkedIn({ item, small = false, label = "Share on LinkedIn" }) {
  const full = label === "Share" ? "Share on LinkedIn" : label;
  const ref = useRef(null);
  const latest = useRef(item);
  useEffect(() => { latest.current = item; });
  const key = `${item.kind}:${item.sessionId || ""}:${item.id || ""}`;
  // Fetch the draft link once the button is on screen, so the tap opens it straight away.
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver !== "function") { prefetchShare(latest.current); return undefined; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { prefetchShare(latest.current); io.disconnect(); }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [key]);
  return (
    <button ref={ref} type="button" className={"li-share-btn pressable" + (small ? " li-share-btn--sm" : "")} onClick={() => openShare(latest.current)}
      aria-label={full} title={full} aria-description="Opens a LinkedIn post you can edit. +15 points when you post with Post to LinkedIn.">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><rect x="5" y="9.5" width="3" height="9" rx="0.5" /><circle cx="6.5" cy="6.3" r="1.8" /><path d="M10.5 9.5h2.9v1.3c.5-.9 1.6-1.5 3-1.5 2.4 0 3.1 1.5 3.1 3.9v5.3h-3v-4.7c0-1.1-.3-1.9-1.4-1.9s-1.6.8-1.6 1.9v4.7h-3z" /></svg>
      {label}
    </button>
  );
}
