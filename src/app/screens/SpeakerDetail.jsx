import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Link2, Mic, UserPlus, UserCheck, Undo2, MessageCircle, Smartphone } from "lucide-react";
import { useStore } from "../lib/store";
import { cms, dayLabel, nameKeys, sessionsForSpeaker, speakerById, timeRange } from "../lib/cms";
import { auth, firstName, isSignedIn } from "../lib/auth";
import { canMessage, canRequest, connectionWith, requestConnection, respondConnection, social, withdrawConnection } from "../lib/social";
import { confirmDialog, safeHref, showAlert } from "../lib/ui";
import { FEATURES } from "../lib/config";
import { Avatar, Button, Empty, Spinner, TopBar } from "../components/ui";

/* Speaker profile (iOS SpeakerDetailView), with Connect / Message when they're on the app. */

export default function SpeakerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const c = useStore(cms);
  const a = useStore(auth);
  const s = useStore(social);
  const sp = speakerById(decodeURIComponent(id), c);
  if (!sp) return <div className="page"><TopBar title="Speaker" />{c.loaded ? <Empty icon={Mic} title="Speaker not found" /> : <Spinner />}</div>;

  const keys = nameKeys(sp.name);
  const account = s.people.find((p) => p.onApp !== false && nameKeys(p.name).some((k) => keys.includes(k))) || null;
  const anyListing = s.people.find((p) => nameKeys(p.name).some((k) => keys.includes(k)));
  const state = account ? connectionWith(account.id, s) : null;
  const sessions = sessionsForSpeaker(sp.id, c);
  const linkedin = safeHref(sp.linkedin);
  const given = firstName(sp.name.replace(/^(Dr\.|Hon\.|Prof\.)\s*/i, ""));

  const connect = async () => {
    if (!isSignedIn(a)) { showAlert("Sign up to connect", "Sign in to send connection requests."); return; }
    if (await requestConnection(account)) showAlert("Request sent", `${given} will see your request in the app.`);
    else showAlert("Couldn't send", social.get().lastError || "Try again.");
  };
  const withdraw = async () => {
    const ok = await confirmDialog({ title: `Withdraw your request to ${sp.name}?`, message: "They won't be told. You can send a new request later.", confirm: "Withdraw request", destructive: true });
    if (ok) await withdrawConnection(state.conn);
  };

  return (
    <div className="page">
      <TopBar title="Speaker" />
      <main id="main">
        <div className="pad stack-lg" style={{ paddingTop: 18 }}>
          <div className="speaker-head">
            <Avatar name={sp.name} src={sp.photo} size={90} round />
            <div>
              {sp.isKeynote && <span className="speaker-keynote">Keynote speaker</span>}
              <h1>{sp.name}</h1>
              {sp.title && <div className="speaker-title">{sp.title}</div>}
              {sp.company && <div className="speaker-company">{sp.company}</div>}
            </div>
          </div>
          {FEATURES.network && isSignedIn(a) && account && (
            <div className="stack-sm">
              {state?.status === "accepted" ? (
                <Button size="lg" block icon={UserCheck} onClick={() => showAlert("Already connected", `You and ${sp.name} are in each other's network. Your chat is in the Chats tab.`)}>Connected</Button>
              ) : state?.status === "pending" ? (
                <Button size="lg" block icon={Undo2} onClick={withdraw}>Request sent · Withdraw</Button>
              ) : state?.status === "incoming" ? (
                <Button variant="primary" size="lg" block icon={UserCheck} onClick={() => respondConnection(state.conn, true)}>Accept their invite</Button>
              ) : canRequest(account, s) ? (
                <Button variant="primary" size="lg" block icon={UserPlus} onClick={connect}>Connect with {given}</Button>
              ) : null}
              {canMessage(account, s) && <Button size="lg" block icon={MessageCircle} onClick={() => navigate(`/chat/${encodeURIComponent(account.id)}`)}>Message</Button>}
            </div>
          )}
          {FEATURES.network && isSignedIn(a) && !account && anyListing && (
            <div className="note row-top"><Smartphone aria-hidden="true" style={{ width: 18, height: 18, flex: "none" }} /><span>{given} hasn't joined the TTFC app yet. You'll be able to connect and message once they sign in.</span></div>
          )}
          <section className="stack-sm">
            <h2 className="eyebrow eyebrow--muted">About</h2>
            <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 14 }}>{sp.bio}</p>
            {linkedin && <a className="edit-link" href={linkedin} target="_blank" rel="noopener noreferrer"><Link2 aria-hidden="true" />View LinkedIn profile</a>}
          </section>
          {sessions.length > 0 && (
            <section className="stack-sm">
              <h2 className="eyebrow eyebrow--muted">Appearing in</h2>
              {sessions.map((x) => (
                <Link key={x.id} to={`/session/${encodeURIComponent(x.id)}`} className="list-row pressable">
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="tiny bold" style={{ color: "var(--pur-alt)" }}>{dayLabel(x)} · {timeRange(x)}</span>
                    <b style={{ display: "block", fontSize: 14.5 }}>{x.title}</b>
                  </span>
                  <ChevronRight className="chev" aria-hidden="true" />
                </Link>
              ))}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
