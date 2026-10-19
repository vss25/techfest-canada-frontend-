import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, CircleCheck, Link as LinkIcon, MessagesSquare, Mic, Undo2, UserRoundCheck, UserRoundPlus } from "lucide-react";
import { useStore } from "../lib/store";
import { cms, dayLabel, nameKeys, roomOf, sessionsForSpeaker, speakerById } from "../lib/cms";
import { auth, isSignedIn } from "../lib/auth";
import { canMessage, canRequest, connectionWith, refreshPeople, social, withdrawConnection } from "../lib/social";
import { acceptWithSharing, connectWithSharing } from "../lib/myCard";
import { confirmDialog, givenName, safeHref, showAlert } from "../lib/ui";
import { FEATURES } from "../lib/config";
import { Avatar, Button, Empty, Spinner, TopBar } from "../components/ui";
import { ContactLimitNote } from "../components/People";
import { PhoneSlash } from "../components/Glyphs";
import { guestAlert } from "../lib/passes";

/* =========================================================
   Speaker profile (iOS SpeakerDetailView): Connect and
   "Ask {given} a question" (guests see them too, with sign-up
   prompts), what their switches allow, topics, About and the
   sessions they're in.
========================================================= */

export default function SpeakerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const c = useStore(cms);
  const a = useStore(auth);
  const s = useStore(social);
  const signedIn = isSignedIn(a);
  useEffect(() => { if (signedIn && !social.get().people.length) refreshPeople(""); }, [signedIn]);
  const sp = speakerById(decodeURIComponent(id), c);
  if (!sp) return <div className="page"><TopBar title="Speaker" />{c.loaded ? <Empty icon={Mic} title="Speaker not found" /> : <Spinner />}</div>;

  const keys = nameKeys(sp.name);
  const account = s.people.find((p) => p.onApp !== false && nameKeys(p.name).some((k) => keys.includes(k))) || null;
  const state = account ? connectionWith(account.id, s) : null;
  const sessions = sessionsForSpeaker(sp.id, c);
  const linkedin = safeHref(sp.linkedin);
  const given = givenName(sp.name);
  // iOS SyncService.canReach: guests (and anyone not signed in) see the buttons; signed in, only with an app account.
  const reach = FEATURES.network && (!signedIn || !!account);
  const mayRequest = !account || !!state || canRequest(account, s);
  const mayMessage = !account || canMessage(account, s);

  const connect = () => {
    if (!signedIn) { guestAlert("Sign up to connect", "Create a free profile to send connection requests.", "speaker"); return; }
    connectWithSharing(account, { given });
  };
  const message = () => {
    if (!signedIn) { guestAlert("Sign up to message", "Guests can browse speakers. Create a free profile to send a question.", "speaker"); return; }
    navigate(`/chat/${encodeURIComponent(account.id)}`);
  };
  const withdraw = async () => {
    const ok = await confirmDialog({ title: `Withdraw your request to ${sp.name}?`, message: "They won't be told. You can send a new request later.", confirm: "Withdraw request", destructive: true });
    if (ok && !(await withdrawConnection(state.conn))) showAlert("Couldn't withdraw", social.get().lastError || "Try again.");
  };

  return (
    <div className="page">
      <TopBar title="Speaker" />
      <main id="main">
        <div className="speaker-page">
          <div className="speaker-head">
            <Avatar name={sp.name} src={sp.photo} size={90} round={!!sp.photo} />
            <div>
              {sp.isKeynote && <span className="speaker-keynote">Keynote speaker</span>}
              <h1>{sp.name}</h1>
              <div className="speaker-title">{sp.title}</div>
              <div className="speaker-company">{sp.company}</div>
            </div>
          </div>
          {reach ? (
            <>
              {mayRequest && (state?.status === "accepted" ? (
                <Button size="lg" block icon={CircleCheck} onClick={() => showAlert("Already connected", `You and ${sp.name} are in each other's network. Your chat is in the Chats tab.`)}>Connected</Button>
              ) : state?.status === "pending" ? (
                <Button size="lg" block icon={Undo2} onClick={withdraw}>Request sent · Withdraw</Button>
              ) : state?.status === "incoming" ? (
                <Button variant="primary" size="lg" block icon={UserRoundCheck} onClick={() => acceptWithSharing(state.conn)}>Accept their invite</Button>
              ) : (
                <Button variant="primary" size="lg" block icon={UserRoundPlus} onClick={connect}>Connect with {given}</Button>
              ))}
              {FEATURES.chats && mayMessage && (
                <Button size="lg" block icon={MessagesSquare} onClick={message}>{state?.status === "accepted" ? `Message ${given}` : `Ask ${given} a question`}</Button>
              )}
              {account && <ContactLimitNote name={sp.name} canMsg={mayMessage} canReq={mayRequest} />}
            </>
          ) : FEATURES.network && (
            <div className="info-note"><PhoneSlash /><span>{given} hasn't joined the TTFC app yet. You'll be able to connect and message once they sign in.</span></div>
          )}
          {(sp.topics || []).length > 0 && <div className="chips chips--wrap" style={{ gap: 6 }}>{sp.topics.map((t) => <span key={t} className="chip">{t}</span>)}</div>}
          <section className="stack-sm">
            <h2 className="eyebrow eyebrow--muted">About</h2>
            <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 14 }}>{sp.bio}</p>
            {linkedin && <a className="li-link" href={linkedin} target="_blank" rel="noopener noreferrer"><LinkIcon aria-hidden="true" />View LinkedIn profile</a>}
          </section>
          {sessions.length > 0 && (
            <section className="stack-sm" style={{ gap: 10 }}>
              <h2 className="eyebrow eyebrow--muted">Appearing in</h2>
              {sessions.map((x) => {
                const room = roomOf(x.stage);
                return (
                  <Link key={x.id} to={`/session/${encodeURIComponent(x.id)}`} className="mini-session pressable">
                    <span className="mini-when"><span>{dayLabel(x)}</span><b>{x.startTime}</b></span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b className="clamp-2">{x.title}</b>
                      {room && <span className="ellipsis">{room}</span>}
                    </span>
                    <ChevronRight className="chev" aria-hidden="true" />
                  </Link>
                );
              })}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
