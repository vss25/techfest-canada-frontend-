import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Hand, IdCard, Mic, Ticket } from "lucide-react";

/* A person's profile colour (lib/profileTag.js): the glow at the screen's edge and the small pill under their name.
   Your own Profile and, since Oct 22 2026, other people's profiles (the server sends their profileTag). */

const TAG_ICON = { media: Camera, speaker: Mic, staff: IdCard, volunteer: Hand, pass: Ticket };

/** The glow at the screen's edge: fixed to the viewport (safe areas included), the upper half only. The soft glow
    sits under the header and its buttons, the 3px edge line over it (clear of the buttons), both under sheets and
    toasts, never in the way of a tap or a scroll. It grows in from the top centre, breathes, and a highlight sweeps
    the top edge now and then (app.css; still with reduced motion). Paused while the page is hidden; gone when you
    leave the screen. */
export function ProfileGlow({ tag }) {
  const [paused, setPaused] = useState(() => typeof document !== "undefined" && document.hidden);
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  const style = { "--tag": tag.colors.bg, "--tag-rgb": tag.colors.rgb };
  const state = paused ? " is-paused" : "";
  return createPortal(
    <>
      <div className={`profile-glow${state}`} data-tag={tag.key} style={style} aria-hidden="true" />
      <div className={`profile-glow-edge${state}`} data-tag={tag.key} style={style} aria-hidden="true"><span className="profile-glow-sweep" /></div>
    </>,
    document.body,
  );
}

/** Your pass type under your name: the colour and a small icon, no words (the icon tells the colours apart
    for anyone who can't see the difference); screen readers hear "Pass colour: Speaker". */
export function ProfileTagPill({ tag }) {
  const Icon = TAG_ICON[tag.key] || Ticket;
  return (
    <span className="profile-tag" data-tag={tag.key} style={{ "--tag": tag.colors.bg, "--tag-text": tag.colors.text, "--tag-rgb": tag.colors.rgb }}>
      <Icon aria-hidden="true" /><span className="sr-only">{`Pass colour: ${tag.text}`}</span>
    </span>
  );
}
