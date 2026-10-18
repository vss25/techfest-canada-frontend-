import { Link, useNavigate } from "react-router-dom";
import { Check, X, MessageCircle, UserPlus, UserCheck, UserRoundCheck, Clock, Smartphone, Hand, Mic, Store, BadgeCheck, Star, Package, CalendarClock, Sparkles } from "lucide-react";
import { fileURL } from "../lib/config";
import { firstName } from "../lib/auth";
import { canMessage, canRequest, connectionWith, requestConnection, respondConnection, social, withdrawConnection } from "../lib/social";
import { confirmDialog, showAlert } from "../lib/ui";
import { Avatar, IconButton } from "./ui";

/* =========================================================
   People rows: an invitation / sent request (ConnectionRow) and
   the directory card (PersonCard: photo, name, company, badges,
   connect / withdraw / accept / message as icon buttons).
========================================================= */

export function KindBadge({ kind }) {
  const inPerson = kind === "inPerson";
  return (
    <span className="kicker" style={inPerson ? { background: "var(--pur)", color: "#fff", fontSize: 10 } : { fontSize: 10, color: "var(--tx2)" }}>
      {inPerson ? "Met in person" : "Online"}
    </span>
  );
}

export function ConnectionRow({ conn, mode = "invite", unread = 0, lastMessage }) {
  const navigate = useNavigate();
  const u = conn.user || {};
  const work = [u.jobTitle, u.organization].filter(Boolean).join(" · ");
  const accept = async () => { if (!(await respondConnection(conn, true))) showAlert("Couldn't accept", social.get().lastError); };
  const decline = async () => { await respondConnection(conn, false); };
  const withdraw = async () => {
    const ok = await confirmDialog({ title: `Withdraw your request to ${u.name}?`, message: "They won't be told. You can send a new request later.", confirm: "Withdraw request", destructive: true });
    if (ok && !(await withdrawConnection(conn))) showAlert("Couldn't withdraw", social.get().lastError);
  };
  return (
    <div className="person-card">
      <Link to={`/people/${encodeURIComponent(u.id)}`} aria-label={`${u.name}'s profile`}><Avatar name={u.name} src={fileURL(u.avatarUrl)} size={48} /></Link>
      <div className="info">
        <div className="row" style={{ gap: 6 }}><span className="person-name ellipsis">{u.name}</span>{conn.status === "accepted" && <KindBadge kind={conn.kind} />}</div>
        {work && <div className="tiny muted ellipsis">{work}</div>}
        {lastMessage && <div className={"small ellipsis" + (unread ? " bold" : " muted")}>{lastMessage}</div>}
        {conn.note && mode === "invite" && !lastMessage && <div className="small muted clamp-2">“{conn.note}”</div>}
      </div>
      {mode === "invite" && (
        <div className="row" style={{ gap: 6 }}>
          <IconButton icon={Check} label={`Accept ${u.name}`} round filled small onClick={accept} />
          <IconButton icon={X} label={`Decline ${u.name}`} round small onClick={decline} />
          <IconButton icon={MessageCircle} label={unread ? `${unread} unread from ${u.name}. Reply without accepting` : `Message ${u.name} without accepting`} round small badge={unread} onClick={() => navigate(`/chat/${encodeURIComponent(u.id)}`)} />
        </div>
      )}
      {mode === "sent" && <button type="button" className="btn btn-sm pressable" onClick={withdraw} aria-label={`Withdraw request to ${u.name}`}>Withdraw</button>}
    </div>
  );
}

const KIND_ICON = {
  staff: { icon: BadgeCheck, text: "Staff" }, volunteer: { icon: Hand, text: "Volunteer" }, vip: { icon: Star, text: "VIP" }, vendor: { icon: Package, text: "Vendor" },
};

/** Directory card (iOS AttendeeDirectoryView.personRow). */
export function PersonCard({ person: p, state, rec, onWhy, kind }) {
  const navigate = useNavigate();
  const s = state;
  const k = kind || p.kind || "";
  const conn = connectionWith(p.id, s);
  const meta = KIND_ICON[k];
  const MetaIcon = meta?.icon;
  const badge = k === "speaker" ? Mic : k === "exhibitor" ? Store : null;
  const BadgeIcon = badge;

  const connect = async () => {
    if (await requestConnection(p)) showAlert("Request sent", `${firstName(p.name)} will see your request in the app.`);
    else showAlert("Couldn't send", social.get().lastError || "Try again.");
  };
  const withdraw = async () => {
    const ok = await confirmDialog({ title: "Withdraw your request?", message: "They won't be told. You can send a new request later.", confirm: `Withdraw request to ${p.name}`, destructive: true });
    if (ok) await withdrawConnection(conn.conn);
  };

  let actions;
  if (p.onApp === false) {
    actions = <span className="icon-btn icon-btn--sm" role="img" aria-label="Not on the app yet" title="Not on the app yet" style={{ color: "var(--tx2)" }}><Smartphone aria-hidden="true" /></span>;
  } else if (!conn && !canRequest(p, s) && !canMessage(p, s)) {
    actions = <span className="icon-btn icon-btn--sm" role="img" aria-label="In person only" title="In person only" style={{ color: "var(--tx2)" }}><Hand aria-hidden="true" /></span>;
  } else {
    actions = (
      <div className="row" style={{ gap: 8 }}>
        {conn?.status === "accepted" && <IconButton icon={UserRoundCheck} label={`Connected with ${p.name}`} round small disabled />}
        {conn?.status === "pending" && <IconButton icon={Clock} label="Request sent. Withdraw" round small onClick={withdraw} />}
        {conn?.status === "incoming" && <IconButton icon={UserCheck} label={`Accept ${p.name}`} round filled small onClick={() => respondConnection(conn.conn, true)} />}
        {!conn && canRequest(p, s) && <IconButton icon={UserPlus} label={`Connect with ${p.name}`} round filled small onClick={connect} />}
        {canMessage(p, s) && <IconButton icon={MessageCircle} label={`Message ${p.name}`} round small onClick={() => navigate(`/chat/${encodeURIComponent(p.id)}`)} />}
      </div>
    );
  }

  return (
    <div className="person-card">
      <Link to={`/people/${encodeURIComponent(p.id)}`} className="row" style={{ flex: 1, minWidth: 0, color: "inherit", textDecoration: "none", gap: 12 }}>
        <Avatar name={p.name} src={fileURL(p.avatarUrl)} size={40}
          badge={BadgeIcon ? <span className="avatar-badge" aria-label={k === "speaker" ? "Speaker" : "Exhibitor"}><BadgeIcon aria-hidden="true" /></span> : null} />
        <span className="info">
          <span className="row" style={{ gap: 6 }}>
            <span className="person-name ellipsis">{p.name}</span>
            {k === "exhibitor" && p.booth && <span className="booth">Booth {p.booth}</span>}
          </span>
          {p.organization && <span className="small muted ellipsis" style={{ display: "block" }}>{p.organization}</span>}
          {(meta || p.availabilitySlots?.length > 0 || rec) && (
            <span className="meta-icons">
              {meta && <span className="row" style={{ gap: 3 }}><MetaIcon aria-hidden="true" />{meta.text}</span>}
              {p.availabilitySlots?.length > 0 && <CalendarClock aria-label="Free to meet" />}
            </span>
          )}
        </span>
      </Link>
      {rec && (
        <button type="button" className="dashed" onClick={() => onWhy?.(p, rec)} aria-label={`Why ${p.name} is recommended`}>
          <Sparkles aria-hidden="true" style={{ width: 11, height: 11 }} />Why
        </button>
      )}
      {actions}
    </div>
  );
}
