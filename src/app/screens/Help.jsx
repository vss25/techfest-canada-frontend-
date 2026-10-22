import { useEffect, useState } from "react";
import { ArrowUp, Check, LifeBuoy, MapPin, Phone, Send, ShieldAlert } from "lucide-react";
import { useStore } from "../lib/store";
import { auth, isSignedIn, signOut } from "../lib/auth";
import { addSosMessage, mySos, norm, SOS_DEFAULTS, SOS_MAX, SOS_STEPS, sendSos, sosOptions } from "../lib/sos";
import { listTime } from "../lib/time";
import { showAlert, usePolling } from "../lib/ui";
import { Button, Chip, IconButton, Spinner, TopBar } from "../components/ui";

/* =========================================================
   Help & SOS (/help, also /app/help from a staff reply's push;
   Oct 22 2026; iOS HelpSOSView, Android HelpSosScreen). Emergencies
   only: call 911 first for anything life-threatening; otherwise
   message TTFC staff (what, where, a message, a phone number) and
   follow your request: Sent → Seen by staff → Resolved, with their
   replies (refreshed every 15 s while open; a reply also pushes).
   Everyone signed in can send, hidden-from-app people included;
   guests get 911 and where to find staff. Calls: lib/sos.js.
========================================================= */

const DESK = "Find a TTFC staff member at the registration desk, Harbour Ballroom foyer.";

function Emergency() {
  return (
    <section className="sos-banner" role="note" aria-labelledby="sos-911-h">
      <ShieldAlert aria-hidden="true" className="sos-banner-ico" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 id="sos-911-h" className="sos-banner-title">Emergencies only</h2>
        <p className="sos-banner-text">For a life-threatening emergency call 911 first.</p>
      </div>
      <a href="tel:911" className="btn sos-911 pressable"><Phone aria-hidden="true" />Call 911</a>
    </section>
  );
}

/** Sent → Seen by staff → Resolved. */
function Steps({ status, labels }) {
  const at = SOS_STEPS.indexOf(status);
  return (
    <ol className="sos-steps" aria-label={`Status: ${labels[status]}`}>
      {SOS_STEPS.map((k, i) => (
        <li key={k} className={i <= at ? "is-done" : ""} aria-current={i === at ? "step" : undefined}>
          <span className="sos-step-dot" aria-hidden="true">{i <= at ? <Check /> : null}</span>{labels[k]}
        </li>
      ))}
    </ol>
  );
}

function Thread({ r, labels, onSent }) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const send = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try { onSent(await addSosMessage(r.id, body)); setDraft(""); }
    catch (err) { showAlert(err?.data?.code === "resolved" ? "This request is resolved" : "Couldn't send", err.message); }
    finally { setSending(false); }
  };
  return (
    <section className="card stack-sm sos-thread" aria-label={`Your request: ${r.categoryLabel}`}>
      <div className="row" style={{ gap: 8 }}>
        <b style={{ flex: 1 }}>{r.categoryLabel}</b>
        <time className="tiny muted" dateTime={r.createdAt}>{listTime(r.createdAt)}</time>
      </div>
      <Steps status={r.status} labels={labels} />
      {r.location && <p className="tiny muted row" style={{ gap: 4, margin: 0 }}><MapPin aria-hidden="true" style={{ width: 13, height: 13 }} />{r.location}</p>}
      <div className="sos-msg sos-msg--me"><p>{r.message}</p></div>
      {r.messages.map((m, i) => (
        <div key={i} className={"sos-msg" + (m.from === "staff" ? " sos-msg--staff" : " sos-msg--me")}>
          {m.from === "staff" && <b className="tiny">{m.staffName || "TTFC staff"}</b>}
          <p>{m.body}</p>
          <time className="tiny muted" dateTime={m.at}>{listTime(m.at)}</time>
        </div>
      ))}
      {r.status !== "resolved" && (
        <form className="composer-bar sos-reply" onSubmit={send} style={{ position: "static" }}>
          <textarea className="input" rows={1} value={draft} maxLength={SOS_MAX} onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a message for staff…" aria-label="Add a message for staff" />
          <IconButton icon={ArrowUp} label="Send to staff" filled type="submit" disabled={!draft.trim() || sending} />
        </form>
      )}
    </section>
  );
}

export default function Help() {
  const a = useStore(auth);
  const signedIn = isSignedIn(a);
  const [opts, setOpts] = useState(SOS_DEFAULTS);
  const [requests, setRequests] = useState(null);
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState(null); // null until the server's prefill arrives (or they type)
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [justSent, setJustSent] = useState(false);

  useEffect(() => { let alive = true; sosOptions().then((o) => { if (alive) setOpts(o); }); return () => { alive = false; }; }, []);
  const load = async () => {
    try {
      const r = await mySos();
      setRequests(r.requests);
      setPhone((p) => (p === null ? r.phone || a.user?.phone || "" : p));
    } catch { setRequests((x) => x || []); }
  };
  // Every 15 s while this screen is open and in front (staff replies come in; a push says so too).
  usePolling(() => (signedIn ? load() : null), 15000, [signedIn]);

  const replaced = (r) => setRequests((list) => (list || []).map((x) => (x.id === r.id ? r : x)));
  const active = (requests || []).filter((r) => r.status !== "resolved");
  const past = (requests || []).filter((r) => r.status === "resolved").slice(0, 5);

  const send = async (e) => {
    e.preventDefault();
    if (sending) return;
    if (!category) { setError("Choose what's happening."); return; }
    if (!message.trim()) { setError("Tell staff what's happening."); return; }
    setSending(true);
    setError("");
    try {
      const r = norm(await sendSos({ category, location: location.trim(), message: message.trim(), phone: (phone || "").trim() }));
      setRequests((list) => [r, ...(list || [])]);
      setCategory(""); setLocation(""); setMessage("");
      setJustSent(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err?.data?.code === "rate_limited" || err?.status === 429 ? (err.message || "If this is urgent, call 911 or find a staff member.") : err.message || "Couldn't send. Call 911 if it's urgent.");
    } finally { setSending(false); }
  };

  return (
    <div className="page">
      <TopBar title="Help & SOS" />
      <main id="main" className="pad stack-lg" style={{ paddingTop: 16 }}>
        <Emergency />

        {!signedIn ? (
          <section className="card stack-sm">
            <p style={{ margin: 0 }}>{DESK}</p>
            <Button variant="primary" block onClick={() => signOut()}>Sign in to message staff</Button>
          </section>
        ) : (
          <>
            {justSent && (
              <p className="sos-sent" role="status"><Check aria-hidden="true" />Staff have been alerted. Keep your phone with you.</p>
            )}
            {requests === null ? <Spinner label="Loading your requests" /> : active.map((r) => <Thread key={r.id} r={r} labels={opts.statusLabels} onSent={replaced} />)}

            <form className="card stack sos-form" onSubmit={send} aria-labelledby="sos-form-h" noValidate>
              <h2 id="sos-form-h" className="row" style={{ gap: 8, margin: 0, fontSize: 17 }}><LifeBuoy aria-hidden="true" className="sos-lifebuoy" />Message TTFC staff</h2>
              <fieldset className="sos-field">
                <legend className="field-label">What's happening</legend>
                <div className="chips chips--wrap" role="radiogroup" aria-label="What's happening">
                  {opts.categories.map((c) => (
                    <button key={c.key} type="button" role="radio" aria-checked={category === c.key} className={"chip pressable" + (category === c.key ? " chip--on" : "")}
                      onClick={() => { setCategory(c.key); setError(""); }}>{c.label}</button>
                  ))}
                </div>
              </fieldset>
              <label className="field">
                <span className="field-label">Where are you?</span>
                <input className="input" value={location} maxLength={120} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Harbour Ballroom foyer" autoComplete="off" />
              </label>
              <div className="chips chips--wrap sos-places" aria-label="Places">
                {opts.locations.map((l) => <Chip key={l} on={location === l} onClick={() => setLocation(l)}>{l}</Chip>)}
              </div>
              <label className="field">
                <span className="field-label">Message</span>
                <textarea className="input" rows={4} required value={message} maxLength={SOS_MAX} onChange={(e) => { setMessage(e.target.value); setError(""); }}
                  placeholder="What's happening, and what do you need?" />
                <span className="tiny muted" style={{ alignSelf: "flex-end" }}>{message.length} / {SOS_MAX}</span>
              </label>
              <label className="field">
                <span className="field-label">Phone <span className="muted" style={{ fontWeight: 400 }}>(optional, so staff can call you)</span></span>
                <input className="input" type="tel" inputMode="tel" autoComplete="tel" value={phone ?? ""} maxLength={40} onChange={(e) => setPhone(e.target.value)} placeholder="+1 416 555 0100" />
              </label>
              {error && <p className="error-text" role="alert" style={{ margin: 0 }}>{error}</p>}
              <Button type="submit" variant="primary" size="lg" block icon={Send} loading={sending} className="sos-send">Send to staff now</Button>
              <p className="tiny muted" style={{ margin: 0 }}>{opts.note}</p>
            </form>

            {past.length > 0 && (
              <section className="stack-sm" aria-labelledby="sos-past-h">
                <h2 id="sos-past-h" className="eyebrow">Earlier requests</h2>
                {past.map((r) => (
                  <div key={r.id} className="list-row" style={{ padding: 12 }}>
                    <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block" }}>{r.categoryLabel}</b><span className="tiny muted ellipsis">{r.message}</span></span>
                    <span className="tiny muted">{opts.statusLabels.resolved} · {listTime(r.updatedAt || r.createdAt)}</span>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
