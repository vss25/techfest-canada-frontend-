import { Link } from "react-router-dom";
import { Bookmark, MapPin, Mic, Users, Flame, Briefcase, Zap, MessagesSquare, Hammer, Trophy, Coffee } from "lucide-react";
import { roomOf, speakerById, typeLabel } from "../lib/cms";
import { Avatar, Kicker } from "./ui";

/* =========================================================
   A session card (iOS TimelineRow): the time in the accent
   colour on the top line with the type kicker, the title, the
   room only when it isn't the main stage, and the speakers.
   The bookmark sits beside the link, so tapping it saves
   without opening the session.
========================================================= */

const TYPE_ICON = { keynote: Mic, panel: Users, fireside: Flame, briefing: Briefcase, provocation: Zap, dialogue: MessagesSquare, workshop: Hammer, ceremony: Trophy, break: Coffee };
export function TypeIcon({ type, ...rest }) {
  const I = TYPE_ICON[type] || Mic;
  return <I aria-hidden="true" {...rest} />;
}

export default function SessionRow({ session, cmsState, saved, highlighted, onNow, onToggle }) {
  const [digits, meridiem = ""] = session.startTime.split(" ");
  const room = roomOf(session.stage);
  const speakers = session.speakerIds.map((id) => speakerById(id, cmsState)).filter(Boolean);
  const first = speakers[0];
  return (
    <div className="tl-row" id={`s-${session.id}`}>
      <Link to={`/session/${encodeURIComponent(session.id)}`} className={"tl-card pressable" + (highlighted ? " tl-card--hi" : "")}>
        <div className="tl-top">
          <span className="tl-time" aria-label={session.startTime}>{digits}<small>{meridiem}</small></span>
          {session.type !== "break" && <Kicker tone={session.type === "keynote" ? "accent" : undefined}>{typeLabel(session)}</Kicker>}
          {highlighted && (onNow
            ? <Kicker tone="accent"><span className="live-dot" aria-hidden="true" /> On now</Kicker>
            : <Kicker tone="accent">Up next</Kicker>)}
        </div>
        <h3 className="tl-title">{session.title}</h3>
        {room && <div className="tl-meta"><MapPin aria-hidden="true" />{room}</div>}
        {first && (
          <div className="tl-meta" style={{ marginTop: 7 }}>
            <span className="avatar-stack">
              {speakers.slice(0, 3).map((s) => <Avatar key={s.id} name={s.name} src={s.photo} size={22} ring />)}
            </span>
            <span className="ellipsis">{first.name}{speakers.length > 1 ? ` +${speakers.length - 1}` : ""}</span>
          </div>
        )}
      </Link>
      <button
        type="button"
        className="icon-btn tl-bookmark pressable"
        aria-pressed={!!saved}
        aria-label={saved ? `Remove ${session.title} from my schedule` : `Save ${session.title} to my schedule`}
        onClick={() => onToggle(session)}
      >
        <Bookmark aria-hidden="true" />
      </button>
    </div>
  );
}
