import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { BriefcaseBusiness, CalendarClock, CircleCheck, CircleUserRound, Hand, Link as LinkIcon, MapPin, Sparkles, Store, Undo2, UserRoundCheck, UserRoundPlus } from "lucide-react";
import { useStore } from "../lib/store";
import { auth } from "../lib/auth";
import { canMessage, canRequest, connectionWith, fetchPerson, social, unblockUser, withdrawConnection } from "../lib/social";
import { acceptWithSharing, connectWithSharing } from "../lib/myCard";
import { fileURL } from "../lib/config";
import { publicBadge, recoSignals } from "../lib/people";
import { availabilitySummary } from "../lib/availability";
import { safetyItems } from "../lib/safety";
import { confirmDialog, givenName, safeHref, showAlert } from "../lib/ui";
import { Avatar, Button, Empty, Spinner, TopBar } from "../components/ui";
import { MoreMenu } from "../components/Safety";
import { ContactLimitNote } from "../components/People";
import { BubbleFill } from "../components/Glyphs";
import SharedContact from "../components/SharedContact";
import { AvailabilityRows } from "../components/Availability";
import { ProfileGlow, ProfileTagPill } from "../components/ProfileTag";
import { profileTagView } from "../lib/profileTag";
import { avatarFor } from "../lib/avatar.js";

/* =========================================================
   Someone's public profile (iOS PersonProfileView): photo,
   name, role, a Speaker / Exhibitor badge, Connect and
   Message side by side, what their switches allow, free-to-meet
   times (merged ranges with their places), interests and LinkedIn. Report / Block in the "…" menu.
   Oct 22 2026: always fetched from the server when opened (the list's copy shows first), with
   everything they share: their photo (uploaded or their speaker photo), profile colour,
   country, booth, field of work, level and what they're looking for.
   Someone the server won't show you (404: they keep their profile private, blocks, hidden): the name and photo you
   already have (the People list's copy, or the comment / reply / chat / list you came from, passed as
   `state.peek`) with "This person keeps their profile private." — never an empty or broken profile.
========================================================= */

export default function PersonProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state: navState } = useLocation();
  const a = useStore(auth);
  const s = useStore(social);
  const [loaded, setLoaded] = useState(null);
  const [failed, setFailed] = useState(null); // the error: 404 = not available to you; else we keep what we have
  const viewed = useRef("");
  const pid = decodeURIComponent(id);
  const known = s.people.find((p) => p.id === pid);
  // What the screen you came from knew (name and photo at least), for while it loads and if it's private.
  const peek = navState?.peek?.name ? navState.peek : null;

  useEffect(() => {
    let alive = true;
    // Always from the server (the People list's copy shows meanwhile): their photo, everything they share.
    fetchPerson(pid).then((p) => { if (alive) setLoaded(p); }).catch((e) => { if (alive) setFailed(e || true); });
    return () => { alive = false; };
  }, [pid]);

  const gone = failed?.status === 404 || failed?.status === 403;
  const p = useMemo(() => (gone ? null : loaded && known ? { ...known, ...loaded } : known || loaded), [loaded, known, gone]);
  useEffect(() => {
    if (p && viewed.current !== p.id) { viewed.current = p.id; recoSignals.viewed(p); }
  }, [p]);

  if (!p) {
    const glimpse = known || peek;
    const blockedThem = s.blocked.includes(pid);
    const menu = glimpse && a.me?.id !== pid ? <MoreMenu label="More options" items={blockedThem
      ? [{ label: `Unblock ${givenName(glimpse.name)}`, icon: Hand, onClick: () => unblockUser(pid) }]
      : safetyItems({ type: "user", id: pid, authorId: pid, authorName: glimpse.name })} /> : null;
    return (
      <div className="page">
        <TopBar title="" right={failed ? menu : null} />
        {glimpse ? (
          <main id="main" className="person-page">
            <div className="profile-hero">
              <Avatar name={glimpse.name} src={fileURL(glimpse.avatarUrl || avatarFor({ authorId: pid }, s.people))} size={96} />
              <h1>{glimpse.name}</h1>
              {!failed && [glimpse.jobTitle, glimpse.organization].filter(Boolean).length > 0 && <div className="person-work">{[glimpse.jobTitle, glimpse.organization].filter(Boolean).join(" · ")}</div>}
            </div>
            {!failed ? <Spinner label="Loading their profile" />
              : <div className="info-note info-note--center">{gone ? "This person keeps their profile private." : "Couldn't load their profile. Check your connection and try again."}</div>}
          </main>
        ) : failed ? <Empty icon={CircleUserRound} title="Profile unavailable">{gone ? "This person keeps their profile private." : "Couldn't load this profile. Check your connection and try again."}</Empty> : <Spinner />}
      </div>
    );
  }

  const me = a.me?.id === p.id;
  const conn = connectionWith(p.id, s);
  const blocked = s.blocked.includes(p.id);
  const given = givenName(p.name);
  const work = [p.jobTitle, p.organization].filter(Boolean).join(" · ");
  const linkedin = safeHref(p.linkedinUrl);
  const badge = publicBadge(p);
  const mayMessage = canMessage(p, s);
  const mayRequest = !!conn || canRequest(p, s);
  const free = availabilitySummary(p.availabilitySlots, p.availabilitySpots, p.meetingSpot);
  const tag = profileTagView(p.profileTag);
  const photo = p.avatarUrl || avatarFor({ authorId: p.id }, s.people);
  const about = [p.fieldOfWork, p.jobLevel].filter(Boolean);
  const objectives = Array.isArray(p.objectives) ? p.objectives.filter((x) => typeof x === "string" && x) : [];

  // Both go through "Share your contact details" (lib/myCard.js).
  const connect = () => connectWithSharing(p, { given });
  const withdraw = async () => {
    const ok = await confirmDialog({ title: "Withdraw your request?", message: "They won't be told. You can send a new request later.", confirm: `Withdraw request to ${p.name}`, destructive: true });
    if (ok && !(await withdrawConnection(conn.conn))) showAlert("Couldn't withdraw", social.get().lastError || "Try again.");
  };

  return (
    <div className="page">
      <TopBar title="" right={!me && <MoreMenu label="More options" items={blocked
        // Web only: Settings has no blocked list yet, so unblocking stays here.
        ? [{ label: `Unblock ${given}`, icon: Hand, onClick: () => unblockUser(p.id) }]
        : safetyItems({ type: "user", id: p.id, authorId: p.id, authorName: p.name })} />} />
      {tag && <ProfileGlow tag={tag} />}
      <main id="main" className="person-page">
        <div className="profile-hero">
          <Avatar name={p.name} src={fileURL(photo)} size={96} tierRing={!!badge} />
          <h1>{p.name}</h1>
          {work && <div className="person-work">{work}</div>}
          {(p.country || p.booth) && (
            <div className="person-meta">
              {p.country && <span><MapPin aria-hidden="true" />{p.country}</span>}
              {p.booth && <span><Store aria-hidden="true" />Booth {p.booth}</span>}
            </div>
          )}
          {(badge || tag) && <div className="row" style={{ gap: 6, justifyContent: "center" }}>{badge && <span className="tier-badge">{badge}</span>}{tag && <ProfileTagPill tag={tag} />}</div>}
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
        {(free || p.meetingSpot) && (
          <section className="card person-section">
            <h2><CalendarClock aria-hidden="true" />Free to meet</h2>
            {free ? <AvailabilityRows slots={p.availabilitySlots} spots={p.availabilitySpots} meetingSpot={p.meetingSpot} />
              : <span className="muted" style={{ fontSize: 13 }}>Find them at: {p.meetingSpot}</span>}
          </section>
        )}
        {(about.length > 0 || objectives.length > 0) && (
          <section className="card person-section">
            <h2><BriefcaseBusiness aria-hidden="true" />About</h2>
            {about.length > 0 && <span style={{ fontSize: 14 }}>{about.join(" · ")}</span>}
            {objectives.length > 0 && (
              <>
                <span className="tiny muted">Here to</span>
                <div className="chips chips--wrap" style={{ gap: 6 }}>{objectives.map((t) => <span key={t} className="chip">{t}</span>)}</div>
              </>
            )}
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
