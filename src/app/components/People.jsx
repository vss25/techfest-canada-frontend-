import { Link, useNavigate } from "react-router-dom";
import { Check, X, UserRoundCheck, Hand, Mic, Store, BadgeCheck, Star, Package, CalendarClock, Sparkles, Wifi, ScanLine } from "lucide-react";
import { fileURL, FEATURES } from "../lib/config";
import { canMessage, canRequest, connectionWith, respondConnection, social, withdrawConnection } from "../lib/social";
import { acceptWithSharing, connectWithSharing } from "../lib/myCard";
import { confirmDialog, cx, givenName, showAlert } from "../lib/ui";
import { publicBadge } from "../lib/people";
import { availabilitySummary } from "../lib/availability";
import { Avatar } from "./ui";
import { BubbleFill, FigureWave, PersonClock, PersonPlusFill, PhoneSlash } from "./Glyphs";

/* =========================================================
   People rows (iOS NetworkView / AttendeeDirectoryView):
   ConnectionRow (an invitation or a sent request), the
   Connected row, the directory PersonCard (photo, name,
   company, icons; connect / withdraw / accept / message as
   round icon buttons) and the contact-limit note.
========================================================= */

/** "Met in person" vs "Online" (iOS KindBadge). */
export function KindBadge({ kind }) {
  const inPerson = kind === "inPerson";
  const Icon = inPerson ? ScanLine : Wifi;
  return (
    <span className={cx("kind-badge", inPerson && "kind-badge--inperson")}>
      <Icon aria-hidden="true" />{inPerson ? "Met in person" : "Online"}
    </span>
  );
}

/** A 34pt round button in invitation rows (accept / decline / message). */
function RowButton({ icon, label, filled, onClick, badge }) {
  const Icon = icon;
  return (
    <button type="button" className={cx("row-btn pressable", filled && "row-btn--filled")} aria-label={label} title={label} onClick={onClick}>
      <Icon aria-hidden="true" />
      {badge > 0 && <span className="count-badge count-badge--out" aria-hidden="true">{badge > 10 ? "10+" : badge}</span>}
    </button>
  );
}

/**
 * Invitations (accept / decline, and message without accepting when `showMessage`)
 * and sent requests (Withdraw). iOS ConnectionRow.
 */
export function ConnectionRow({ conn, mode = "invite", unread = 0, lastMessage, showMessage = false }) {
  const navigate = useNavigate();
  const u = conn.user || {};
  const work = [u.jobTitle, u.organization].filter(Boolean).join(" · ");
  const accept = () => acceptWithSharing(conn);
  const decline = async () => { await respondConnection(conn, false); };
  const withdraw = async () => {
    const ok = await confirmDialog({ title: `Withdraw your request to ${u.name}?`, message: "They won't be told. You can send a new request later.", confirm: "Withdraw request", destructive: true });
    if (ok && !(await withdrawConnection(conn))) showAlert("Couldn't withdraw", social.get().lastError || "Try again.");
  };
  return (
    <div className="conn-card">
      <Link to={`/people/${encodeURIComponent(u.id)}`} className="avatar-link" aria-label={`${u.name}'s profile`}><Avatar name={u.name} src={fileURL(u.avatarUrl)} size={48} /></Link>
      <div className="info">
        <div className="row" style={{ gap: 6 }}><span className="conn-name ellipsis">{u.name}</span>{conn.status === "accepted" && <KindBadge kind={conn.kind} />}</div>
        {work && <div className="conn-work ellipsis">{work}</div>}
        {lastMessage && <div className={cx("ellipsis", unread ? "bold" : "muted")} style={{ fontSize: 12 }}>{lastMessage}</div>}
      </div>
      {mode === "invite" && (
        <div className="row" style={{ gap: 6 }}>
          <RowButton icon={Check} label={`Accept ${u.name}`} filled onClick={accept} />
          <RowButton icon={X} label={`Decline ${u.name}`} onClick={decline} />
          {showMessage && FEATURES.chats && (
            <RowButton icon={BubbleFill} badge={unread} onClick={() => navigate(`/chat/${encodeURIComponent(u.id)}`)}
              label={unread ? `${unread} unread from ${u.name}. Reply without accepting` : `Message ${u.name} without accepting`} />
          )}
        </div>
      )}
      {mode === "sent" && <button type="button" className="withdraw-btn pressable" onClick={withdraw} aria-label={`Withdraw request to ${u.name}`}>Withdraw</button>}
    </div>
  );
}

/** Network › Connected (iOS ConnectionRow with showChevron): opens the chat. */
export function ConnectedRow({ conn }) {
  const u = conn.user || {};
  const work = [u.jobTitle, u.organization].filter(Boolean).join(" · ");
  return (
    <Link to={`/chat/${encodeURIComponent(u.id)}`} className="conn-card pressable" aria-label={`${u.name}. Message`}>
      <Avatar name={u.name} src={fileURL(u.avatarUrl)} size={48} />
      <span className="info">
        <span className="row" style={{ gap: 6 }}><span className="conn-name ellipsis">{u.name}</span><KindBadge kind={conn.kind} /></span>
        {work && <span className="conn-work ellipsis">{work}</span>}
        {conn.kind === "inPerson" && conn.email && <span className="conn-email ellipsis">{conn.email}</span>}
      </span>
      <BubbleFill className="conn-chat" />
    </Link>
  );
}

const KIND_ICON = {
  staff: { icon: BadgeCheck, text: "Staff" }, volunteer: { icon: Hand, text: "Volunteer" }, vip: { icon: Star, text: "VIP" }, vendor: { icon: Package, text: "Vendor" },
};

/** A round icon button on Network cards (iOS NetworkIconButton). */
export function NetButton({ icon, label, filled, onClick, disabled }) {
  const Icon = icon;
  return (
    <button type="button" className={cx("net-btn pressable", filled && "net-btn--filled")} aria-label={label} title={label} onClick={onClick} disabled={disabled}>
      <Icon aria-hidden="true" />
    </button>
  );
}

/**
 * Connect / withdraw / accept and message for one directory person (or a speaker's
 * app account). No account → "Not on the app yet"; switches off → "In person only".
 */
export function PersonActions({ person: p, state: s, onConnect }) {
  const navigate = useNavigate();
  if (!p || p.onApp === false) {
    return <span className="net-state" role="img" aria-label="Not on the app yet" title="Not on the app yet"><PhoneSlash /></span>;
  }
  const conn = connectionWith(p.id, s);
  const mayRequest = canRequest(p, s), mayMessage = canMessage(p, s);
  if (!conn && !mayRequest && !mayMessage) {
    return <span className="net-state" role="img" aria-label="In person only" title="In person only"><FigureWave /></span>;
  }
  const withdraw = async () => {
    const ok = await confirmDialog({ title: "Withdraw your request?", message: "They won't be told. You can send a new request later.", confirm: `Withdraw request to ${p.name}`, destructive: true });
    if (ok && !(await withdrawConnection(conn.conn))) showAlert("Couldn't withdraw", social.get().lastError || "Try again.");
  };
  const connect = onConnect || (() => connectWithSharing(p, { given: givenName(p.name) }));
  return (
    <div className="net-actions">
      {conn?.status === "accepted" && <NetButton icon={UserRoundCheck} label={`Connected with ${p.name}`} disabled />}
      {conn?.status === "pending" && <NetButton icon={PersonClock} label="Request sent. Withdraw" onClick={withdraw} />}
      {conn?.status === "incoming" && <NetButton icon={UserRoundCheck} label={`Accept ${p.name}`} filled onClick={() => acceptWithSharing(conn.conn)} />}
      {!conn && mayRequest && <NetButton icon={PersonPlusFill} label={`Connect with ${p.name}`} filled onClick={connect} />}
      {mayMessage && <NetButton icon={BubbleFill} label={`Message ${p.name}`} onClick={() => navigate(`/chat/${encodeURIComponent(p.id)}`)} />}
    </div>
  );
}

/** Directory card (iOS AttendeeDirectoryView.personRow): name and company in text, the rest as icons. */
export function PersonCard({ person: p, state, rec, onWhy, kind }) {
  const k = kind || p.kind || "";
  const meta = KIND_ICON[k];
  const MetaIcon = meta?.icon;
  const BadgeIcon = k === "speaker" ? Mic : k === "exhibitor" ? Store : null;
  const href = `/people/${encodeURIComponent(p.id)}`;
  const free = availabilitySummary(p.availabilitySlots, p.availabilitySpots, p.meetingSpot);

  return (
    <div className="person-card">
      <Link to={href} tabIndex={-1} aria-hidden="true" className="avatar-link">
        <Avatar name={p.name} src={fileURL(p.avatarUrl)} size={40} tierRing={!!publicBadge(p, k)}
          badge={BadgeIcon ? <span className="avatar-badge" aria-label={k === "speaker" ? "Speaker" : "Exhibitor"}><BadgeIcon aria-hidden="true" /></span> : null} />
      </Link>
      <span className="info">
        <Link to={href} className="person-link">
          <span className="row" style={{ gap: 6 }}>
            <span className="person-name ellipsis">{p.name}</span>
            {k === "exhibitor" && p.booth && <span className="booth">Booth {p.booth}</span>}
          </span>
          {p.organization && <span className="person-org ellipsis">{p.organization}</span>}
        </Link>
        {(meta || rec) && (
          <span className="meta-icons">
            {meta && <span className="row" style={{ gap: 3 }}><MetaIcon aria-hidden="true" />{meta.text}</span>}
            {rec && (
              <button type="button" className="dashed" onClick={(e) => onWhy?.(p, rec, e.currentTarget.getBoundingClientRect())} aria-label={`Recommended. Why ${p.name} is recommended`}>
                <Sparkles aria-hidden="true" />Recommended
              </button>
            )}
          </span>
        )}
        {/* Free to meet, one line without places: "Oct 26: All day · Oct 27: 12–8 PM". */}
        {free && <span className="meta-free"><CalendarClock aria-hidden="true" /><span className="ellipsis"><span className="sr-only">Free to meet: </span>{free}</span></span>}
      </span>
      <PersonActions person={p} state={state} />
    </div>
  );
}

/** iOS ContactLimitNote: what someone's switches allow. Null when they take both. */
export function ContactLimitNote({ name, canMsg, canReq }) {
  const given = givenName(name);
  const text = !canMsg && !canReq ? `${given} isn't taking messages or connection requests in the app. Catch them in person at the festival.`
    : !canMsg ? `${given} isn't taking messages in the app. Send a connection request instead.`
      : !canReq ? `${given} isn't taking connection requests in the app.` : null;
  if (!text) return null;
  return <div className="info-note"><Hand aria-hidden="true" /><span>{text}</span></div>;
}
