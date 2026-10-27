import { Link, useNavigate } from "react-router-dom";
import { CalendarClock, ChevronRight, Sparkles, UserRoundPlus } from "lucide-react";
import { useStore } from "../lib/store";
import { canMessage, canRequest, social } from "../lib/social";
import { connectWithSharing } from "../lib/myCard";
import { fileURL } from "../lib/config";
import { givenName } from "../lib/ui";
import { meetMessage, nextFreeSlot } from "../lib/feedPlan";
import { BubbleFill } from "./Glyphs";
import { Avatar } from "./ui";

/* =========================================================
   "People to meet" in Home's feed (Oct 26 2026, the organiser:
   "people-to-meet recommendations to book time in the feed"):
   after the 2nd post and once more later (lib/feedPlan.js), a row
   that scrolls sideways with the first eight people Network
   recommends (lib/useRecommendations.js: not connected, can be
   contacted). Each: the photo, name, title · company, the top
   reason, and their next free time if they share it ("Free 2–4 PM
   · Harbour Ballroom foyer"). "Book time" opens a chat with them
   that starts with "Are you free 2–4 PM today (…)?" for them to
   read and send; with no free time shared, Connect or Message as
   their profile allows. "See all" → Network › Recommended.
   Signed-in people only.
========================================================= */

function PersonTile({ rec, now }) {
  const navigate = useNavigate();
  const s = useStore(social);
  const p = rec.person;
  const given = givenName(p.name);
  const slot = nextFreeSlot(p, now);
  const mayMessage = canMessage(p, s);
  const mayRequest = canRequest(p, s);
  const work = [p.jobTitle, p.organization].filter(Boolean).join(" · ");
  const open = `/people/${encodeURIComponent(p.id)}`;
  let action = null;
  if (slot && mayMessage) {
    action = (
      <button type="button" className="btn btn-primary btn-sm ptm-btn pressable" onClick={() => navigate(`/chat/${encodeURIComponent(p.id)}`, { state: { draft: meetMessage(given, slot) } })}
        aria-label={`Book time with ${p.name}: ${slot.text}. Opens a chat with a message ready to send`}>
        <CalendarClock aria-hidden="true" />Book time
      </button>
    );
  } else if (mayRequest) {
    action = (
      <button type="button" className="btn btn-sm ptm-btn pressable" onClick={() => connectWithSharing(p, { given })} aria-label={`Connect with ${p.name}`}>
        <UserRoundPlus aria-hidden="true" />Connect
      </button>
    );
  } else if (mayMessage) {
    action = (
      <button type="button" className="btn btn-sm ptm-btn pressable" onClick={() => navigate(`/chat/${encodeURIComponent(p.id)}`)} aria-label={`Message ${p.name}`}>
        <BubbleFill />Message
      </button>
    );
  }
  return (
    <li className="ptm-tile">
      <Link to={open} className="ptm-who pressable" aria-label={`${p.name}${work ? `, ${work}` : ""}. Opens their profile`}>
        <Avatar name={p.name} src={fileURL(p.avatarUrl)} size={52} round />
        <b className="ptm-name clamp-2">{p.name}</b>
        {work && <span className="ptm-work clamp-2">{work}</span>}
      </Link>
      {rec.reasons?.[0] && <span className="ptm-why"><Sparkles aria-hidden="true" /><span className="clamp-2">{rec.reasons[0]}</span></span>}
      {slot && <span className="ptm-slot"><CalendarClock aria-hidden="true" /><span className="clamp-2">{slot.text}</span></span>}
      <span className="spacer" />
      {action}
    </li>
  );
}

export default function PeopleToMeet({ recs, now, id }) {
  if (!recs?.length) return null;
  const titleId = `ptm-h-${id}`;
  return (
    <section className="ptm" aria-labelledby={titleId}>
      <div className="row ptm-head">
        <h3 id={titleId} className="row"><Sparkles aria-hidden="true" />People to meet</h3>
        <span className="spacer" />
        <Link to="/network/recommended" className="orgs-see-all pressable">See all<ChevronRight aria-hidden="true" /></Link>
      </div>
      <ul className="ptm-list" aria-label="People recommended for you">
        {recs.map((r) => <PersonTile key={r.person.id} rec={r} now={now} />)}
      </ul>
    </section>
  );
}
