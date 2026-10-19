import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarClock, CircleCheck, CircleUserRound, Link as LinkIcon, Sparkles, Undo2, UserRoundCheck, UserRoundPlus } from "lucide-react";
import { useStore } from "../lib/store";
import { auth } from "../lib/auth";
import { canMessage, canRequest, connectionWith, fetchPerson, social, withdrawConnection } from "../lib/social";
import { acceptWithSharing, connectWithSharing } from "../lib/myCard";
import { fileURL } from "../lib/config";
import { publicBadge, recoSignals, slotSummary } from "../lib/people";
import { safetyItems } from "../lib/safety";
import { confirmDialog, givenName, safeHref, showAlert } from "../lib/ui";
import { Avatar, Button, Empty, Spinner, TopBar } from "../components/ui";
import { MoreMenu } from "../components/Safety";
import { ContactLimitNote } from "../components/People";
import { BubbleFill } from "../components/Glyphs";
import SharedContact from "../components/SharedContact";

/* =========================================================
   Someone's public profile (iOS PersonProfileView): photo,
   name, role, a Speaker / Exhibitor badge, Connect and
   Message side by side, what their switches allow, free-to-meet
   times, interests and LinkedIn. Report / Block in the "…" menu.
========================================================= */

export default function PersonProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const a = useStore(auth);
  const s = useStore(social);
  const [loaded, setLoaded] = useState(null);
  const [failed, setFailed] = useState(false);
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

  if (!p) return <div className="page"><TopBar title="" />{failed ? <Empty icon={CircleUserRound} title="Profile unavailable">This person isn't sharing a profile right now.</Empty> : <Spinner />}</div>;

  const me = a.me?.id === p.id;
  const conn = connectionWith(p.id, s);
  const blocked = s.blocked.includes(p.id);
  const given = givenName(p.name);
  const work = [p.jobTitle, p.organization].filter(Boolean).join(" · ");
  const linkedin = safeHref(p.linkedinUrl);
  const badge = publicBadge(p);
  const mayMessage = canMessage(p, s);
  const mayRequest = !!conn || canRequest(p, s);

  // Both go through "Share your contact details" (lib/myCard.js).
  const connect = () => connectWithSharing(p, { given });
  const withdraw = async () => {
    const ok = await confirmDialog({ title: "Withdraw your request?", message: "They won't be told. You can send a new request later.", confirm: `Withdraw request to ${p.name}`, destructive: true });
    if (ok && !(await withdrawConnection(conn.conn))) showAlert("Couldn't withdraw", social.get().lastError || "Try again.");
  };

  return (
    <div className="page">
      <TopBar title="" right={!me && <MoreMenu label="More options" items={safetyItems({ type: "user", id: p.id, authorId: p.id, authorName: p.name })} />} />
      <main id="main" className="person-page">
        <div className="profile-hero">
          <Avatar name={p.name} src={fileURL(p.avatarUrl)} size={96} tierRing={!!badge} />
          <h1>{p.name}</h1>
          {work && <div className="person-work">{work}</div>}
          {badge && <span className="tier-badge">{badge}</span>}
          {p.tagline && <div className="person-tagline">“{p.tagline}”</div>}
        </div>
        {!me && !blocked && (
          p.onApp === false ? (
            <div className="info-note info-note--center">{given} hasn't joined the TTFC app yet. You'll be able to connect and message once they sign in.</div>
          ) : (
            <>
              {(mayMessage || mayRequest) && (
                <div className="person-actions">
                  {conn?.status === "accepted" && <Button size="lg" block icon={CircleCheck} disabled>Connected</Button>}
                  {conn?.status === "pending" && <Button size="lg" block icon={Undo2} onClick={withdraw}>Withdraw request</Button>}
                  {conn?.status === "incoming" && <Button variant="primary" size="lg" block icon={UserRoundCheck} onClick={() => acceptWithSharing(conn.conn)}>Accept invite</Button>}
                  {!conn && mayRequest && <Button variant="primary" size="lg" block icon={UserRoundPlus} onClick={connect}>Connect</Button>}
                  {mayMessage && <Button size="lg" block icon={BubbleFill} onClick={() => navigate(`/chat/${encodeURIComponent(p.id)}`)}>Message</Button>}
                </div>
              )}
              <ContactLimitNote name={p.name} canMsg={mayMessage} canReq={mayRequest} />
            </>
          )
        )}
        {!me && !blocked && <SharedContact person={p} state={conn} />}
        {(slotSummary(p.availabilitySlots) || p.meetingSpot) && (
          <section className="card person-section">
            <h2><CalendarClock aria-hidden="true" />Free to meet</h2>
            {slotSummary(p.availabilitySlots) && <b style={{ fontSize: 14, fontWeight: 600 }}>{slotSummary(p.availabilitySlots)}</b>}
            {p.meetingSpot && <span className="muted" style={{ fontSize: 13 }}>Find them at: {p.meetingSpot}</span>}
          </section>
        )}
        {p.topics?.length > 0 && (
          <section className="card person-section">
            <h2><Sparkles aria-hidden="true" />Interested in</h2>
            <div className="chips chips--wrap" style={{ gap: 6 }}>{p.topics.map((t) => <span key={t} className="chip">{t}</span>)}</div>
          </section>
        )}
        {linkedin && <a className="li-link li-link--lg" href={linkedin} target="_blank" rel="noopener noreferrer"><LinkIcon aria-hidden="true" />LinkedIn profile</a>}
      </main>
    </div>
  );
}
