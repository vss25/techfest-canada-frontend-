import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarClock, Flag, Hand, Linkedin, MessageCircle, MoreHorizontal, Smartphone, Sparkles, Undo2, UserCheck, UserPlus, UserRoundCheck, UserX } from "lucide-react";
import { useStore } from "../lib/store";
import { auth, firstName } from "../lib/auth";
import { blockUser, canMessage, canRequest, connectionWith, fetchPerson, report, requestConnection, respondConnection, social, unblockUser, withdrawConnection } from "../lib/social";
import { fileURL } from "../lib/config";
import { recoSignals, slotSummary } from "../lib/people";
import { confirmDialog, safeHref, showAlert } from "../lib/ui";
import { Avatar, Button, Empty, IconButton, Kicker, Spinner, TopBar } from "../components/ui";

/* Someone's public profile (iOS PersonProfileView): what they share, and Connect / Message. */

const KIND_LABEL = { staff: "TTFC staff", volunteer: "Volunteer", vip: "VIP", vendor: "Vendor", speaker: "Speaker" };

export default function PersonProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const a = useStore(auth);
  const s = useStore(social);
  const [loaded, setLoaded] = useState(null);
  const [failed, setFailed] = useState(false);
  const [menu, setMenu] = useState(false);
  const viewed = useRef("");
  const pid = decodeURIComponent(id);
  const known = s.people.find((p) => p.id === pid);

  useEffect(() => {
    let alive = true;
    fetchPerson(pid).then((p) => { if (alive) setLoaded(p); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [pid]);

  const p = useMemo(() => (loaded && known ? { ...known, ...loaded } : known || loaded), [loaded, known]);
  useEffect(() => {
    if (p && viewed.current !== p.id) { viewed.current = p.id; recoSignals.viewed(p); }
  }, [p]);

  if (!p) return <div className="page"><TopBar title="Profile" />{failed ? <Empty icon={UserX} title="Profile unavailable">This person isn't sharing a profile right now.</Empty> : <Spinner />}</div>;

  const me = a.me?.id === p.id;
  const conn = connectionWith(p.id, s);
  const blocked = s.blocked.includes(p.id);
  const given = firstName(p.name);
  const work = [p.jobTitle, p.organization].filter(Boolean).join(" · ");
  const linkedin = safeHref(p.linkedinUrl);
  const kindLabel = p.kind === "exhibitor" ? (p.booth ? `Exhibitor · Booth ${p.booth}` : "Exhibitor") : KIND_LABEL[p.kind];

  const connect = async () => {
    if (await requestConnection(p)) showAlert("Request sent", `${given} will see your request in the app.`);
    else showAlert("Couldn't send", social.get().lastError || "Try again.");
  };
  const withdraw = async () => {
    const ok = await confirmDialog({ title: `Withdraw your request to ${p.name}?`, message: "They won't be told. You can send a new request later.", confirm: "Withdraw request", destructive: true });
    if (ok) await withdrawConnection(conn.conn);
  };
  const doReport = async () => {
    setMenu(false);
    const ok = await confirmDialog({ title: `Report ${p.name}?`, message: "The TTFC team reviews reports within 24 hours during the event.", confirm: "Report", destructive: true });
    if (ok && (await report("user", p.id))) showAlert("Thanks for telling us", "The TTFC team will review it.");
  };
  const doBlock = async () => {
    setMenu(false);
    if (blocked) { await unblockUser(p.id); return; }
    const ok = await confirmDialog({ title: `Block ${p.name}?`, message: "You won't see each other's posts or messages.", confirm: `Block ${given}`, destructive: true });
    if (ok && (await blockUser(p.id))) showAlert(`${p.name} is blocked`);
  };

  return (
    <div className="page">
      <TopBar title="Profile" right={!me && (
        <div style={{ position: "relative" }}>
          <IconButton icon={MoreHorizontal} label="More options" onClick={() => setMenu((v) => !v)} aria-expanded={menu} />
          {menu && (
            <div className="menu" role="menu" style={{ top: 44, right: 0 }}>
              <button type="button" role="menuitem" onClick={doReport}><Flag aria-hidden="true" width={16} />Report {given}</button>
              <button type="button" role="menuitem" className="danger" onClick={doBlock}><Hand aria-hidden="true" width={16} />{blocked ? `Unblock ${given}` : `Block ${given}`}</button>
            </div>
          )}
        </div>
      )} />
      <main id="main">
        <div className="profile-hero">
          <Avatar name={p.name} src={fileURL(p.avatarUrl)} size={96} />
          <h1>{p.name}</h1>
          {work && <div className="muted">{work}</div>}
          {kindLabel && <Kicker tone="accent">{kindLabel}</Kicker>}
          {p.tagline && <div className="muted small" style={{ maxWidth: 420 }}>“{p.tagline}”</div>}
        </div>
        <div className="pad stack-lg">
          {!me && !blocked && (
            p.onApp === false ? (
              <div className="note row-top"><Smartphone aria-hidden="true" style={{ width: 18, height: 18, flex: "none" }} /><span>{given} hasn't joined the TTFC app yet. You'll be able to connect and message once they sign in.</span></div>
            ) : (
              <div className="stack-sm">
                {conn?.status === "accepted" && <Button size="lg" block icon={UserRoundCheck} disabled>Connected</Button>}
                {conn?.status === "pending" && <Button size="lg" block icon={Undo2} onClick={withdraw}>Withdraw request</Button>}
                {conn?.status === "incoming" && <Button variant="primary" size="lg" block icon={UserCheck} onClick={() => respondConnection(conn.conn, true)}>Accept invite</Button>}
                {!conn && canRequest(p, s) && <Button variant="primary" size="lg" block icon={UserPlus} onClick={connect}>Connect</Button>}
                {canMessage(p, s) && <Button size="lg" block icon={MessageCircle} onClick={() => navigate(`/chat/${encodeURIComponent(p.id)}`)}>Message</Button>}
                {!conn && !canRequest(p, s) && !canMessage(p, s) && <p className="small muted center" style={{ margin: 0 }}>{given} connects in person only. Say hello at the festival.</p>}
              </div>
            )
          )}
          {(slotSummary(p.availabilitySlots) || p.meetingSpot) && (
            <section className="card stack-sm">
              <h2 className="section-title row" style={{ gap: 6 }}><CalendarClock aria-hidden="true" style={{ width: 15, height: 15 }} />Free to meet</h2>
              {slotSummary(p.availabilitySlots) && <b className="small">{slotSummary(p.availabilitySlots)}</b>}
              {p.meetingSpot && <span className="small muted">Find them at: {p.meetingSpot}</span>}
            </section>
          )}
          {p.topics?.length > 0 && (
            <section className="stack-sm">
              <h2 className="section-title row" style={{ gap: 6 }}><Sparkles aria-hidden="true" style={{ width: 15, height: 15 }} />Interested in</h2>
              <div className="tag-list">{p.topics.map((t) => <span key={t} className="tag">{t}</span>)}</div>
            </section>
          )}
          {linkedin && <a className="btn btn-block" href={linkedin} target="_blank" rel="noopener noreferrer"><Linkedin aria-hidden="true" />LinkedIn profile</a>}
          {conn?.status === "accepted" && conn.conn.email && <p className="small center" style={{ margin: 0 }}>Email: <a href={`mailto:${conn.conn.email}`}>{conn.conn.email}</a></p>}
        </div>
      </main>
    </div>
  );
}
