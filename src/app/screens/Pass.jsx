import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BadgeCheck, CheckCircle2, Link2, Plus, Share2, ShieldOff, Sun, Ticket } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useStore } from "../lib/store";
import { auth, bestTicket, cleanTicketId, isSignedIn, loadAccount } from "../lib/auth";
import { post } from "../lib/api";
import { LINKS } from "../lib/config";
import { connectPayload, passPayload, shownCode } from "../lib/qr";
import { showAlert } from "../lib/ui";
import { canShareContact, cardOf, myCard, queueQrShare, refreshCard, requestAddDetail } from "../lib/myCard";
import { defaultIds, keepKnown, PASS_DOOR_NOTE, PASS_SHARE_NOTE, PASS_SHARE_PATH, PASS_SHARE_WHERE, qrContactFields, SHARE_OFF_ERROR } from "../lib/contactCard";
import { Button, TopBar } from "../components/ui";
import { ShareChecklist } from "../components/ShareSheet";
import AppleWalletButton from "../components/AppleWallet";
import PassInclusions from "../components/PassInclusions";
import { passInclusions } from "../lib/inclusions";
import { profileTagView } from "../lib/profileTag";

/* =========================================================
   My pass (/profile/pass) and My QR (/profile/pass?tab=connect).
   One and only code (Oct 24 2026, the organiser: "make sure there
   is one and only code"): both show your entry QR
   ("TECHFEST:<ticketId>", the same code as the pass email, PDF,
   Apple Wallet and the apps). Staff scan it to check you in; the
   people you meet scan it to connect and get what My QR's "What
   they get" ticks. My pass also lists what the pass includes (per
   day under the name, PassInclusions; the full list below: the
   server's tickets[].inclusions, else the pass's list,
   lib/inclusions.js). Only someone with no pass at all gets the
   older networking QR on My QR (lib/qr.js shownCode).
========================================================= */

export default function Pass() {
  const a = useStore(auth);
  const [params] = useSearchParams();
  const tab = params.get("tab") === "connect" ? "connect" : "pass";
  const ticket = bestTicket(a.user);
  const me = a.me || {};
  const name = me.name || a.user?.name || "";

  return (
    <div className="page">
      <TopBar title={tab === "pass" ? "My pass" : "My QR"} />
      <main id="main" className="pad mt-16 stack-lg">
        {tab === "pass" ? <PassCode ticket={ticket} name={name} tickets={a.user?.tickets} tag={profileTagView(a.user?.profileTag)} /> : <MyCode me={me} name={name} ticket={ticket} />}
      </main>
    </div>
  );
}

function PassCode({ ticket, name, tickets, tag }) {
  const [lastName, setLastName] = useState("");
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const claim = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await post("auth/claim-ticket", { lastName: lastName.trim(), ticketId: cleanTicketId(id) });
      await loadAccount();
      showAlert("Pass linked", "Your QR pass is ready.");
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const form = (
    <form className="stack" onSubmit={claim}>
      <label className="field"><span className="field-label">Last name on the pass</span><input className="input" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} /></label>
      <label className="field"><span className="field-label">Pass ID</span><input className="input" autoCapitalize="characters" spellCheck="false" placeholder="a1b2c3d4e5f6" value={id} onChange={(e) => setId(e.target.value)} /></label>
      <p className="tiny muted" style={{ margin: "-4px 0 0" }}>12 characters, in your pass email under the QR code (e.g. a1b2c3d4e5f6).</p>
      {error && <p className="error-text" role="alert" style={{ margin: 0 }}>{error}</p>}
      <Button type="submit" variant="primary" size="lg" block icon={Link2} loading={busy} disabled={lastName.trim().length < 2 || cleanTicketId(id).length < 6}>Link pass</Button>
    </form>
  );

  if (!ticket) {
    return (
      <div className="stack">
        <div className="card stack-sm">
          <Ticket aria-hidden="true" style={{ width: 26, height: 26, color: "var(--pur-alt)" }} />
          <h2 style={{ margin: 0, fontSize: 19 }}>Link your pass</h2>
          <p className="muted" style={{ margin: 0 }}>Bought your pass with another email? Enter the last name and pass ID from the pass email.</p>
        </div>
        {form}
        <a className="btn btn-block" href={LINKS.tickets} target="_blank" rel="noopener noreferrer">Get a pass</a>
      </div>
    );
  }

  return (
    <div className="stack-lg">
      <section className="ticket" aria-label="Your pass">
        <span className="ticket-tier">{ticket.tierName}</span>
        <h2>{name}</h2>
        {/* What the pass includes, per day (Oct 24 2026). */}
        <PassInclusions tickets={tickets} tag={tag} />
        <span className="ticket-date">TTFC 2026 · Oct 26–27</span>
        <span className="ticket-linked"><BadgeCheck aria-hidden="true" />LINKED · {ticket.ticketId.toUpperCase()}</span>
        <div className="pass-qr" role="img" aria-label={`Pass QR code for ${ticket.ticketId}`}>
          <QRCodeSVG value={passPayload(ticket.ticketId)} size={208} level="M" marginSize={0} />
        </div>
        {/* The same QR as the pass email, PDF ticket and Apple Wallet: it also connects whoever scans it (Oct 24 2026). */}
        <p className="pass-share-note">{PASS_DOOR_NOTE} (<Link to={PASS_SHARE_PATH} replace>{PASS_SHARE_WHERE}</Link>).</p>
        {ticket.checkedIn && <span className="ticket-linked"><CheckCircle2 aria-hidden="true" />Checked in</span>}
        <span className="ticket-venue">The Westin Harbour Castle · Toronto, Canada</span>
        <span className="tiny muted row" style={{ gap: 6, justifyContent: "center" }}><Sun aria-hidden="true" style={{ width: 13, height: 13 }} />Turn your screen brightness up.</span>
      </section>
      {/* As on iOS (TicketDetailView): Apple devices only; the same badge as on the Profile. */}
      <AppleWalletButton ticketId={ticket.ticketId} />
      <Included ticket={ticket} />
      <section className="stack-sm" aria-labelledby="link-h">
        <h3 id="link-h" className="ticket-link-h">Link another pass</h3>
        <p className="tiny muted" style={{ margin: 0 }}>Bought with a different email? Enter the last name and ticket ID from that ticket email.</p>
        {form}
      </section>
    </div>
  );
}

/** iOS checkmark.circle.fill / Android CheckCircle: a filled circle with a white tick. */
const FilledCheck = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <circle cx="8" cy="8" r="8" fill="currentColor" />
    <path d="M4.7 8.2l2.1 2.1 4.5-4.6" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** "What's included", as iOS (TicketDetailView includedBlock) and Android (TicketDetailScreen). */
function Included({ ticket }) {
  const list = passInclusions(ticket);
  if (!list.length) return null;
  return (
    <section className="stack-sm" aria-labelledby="incl-h">
      <h3 id="incl-h" className="eyebrow">What's included</h3>
      <ul className="card pass-incl">
        {list.map((f) => <li key={f}><FilledCheck /><span>{f}</span></li>)}
      </ul>
    </section>
  );
}

/**
 * My QR: your one code (lib/qr.js shownCode): the entry QR of your pass, which the door scans to check you in and the
 * people you meet scan to connect. "What they get" is a checklist of my contact card (PUT /social/contact-card/qr-share):
 * the server hands the ticked details to whoever scans it (a pass scan or, from older screenshots, a networking QR).
 * The pass code is never shared as text (its ID signs you in with your last name).
 * No pass at all (rare, e.g. a staff account): the older networking QR (spec section 9; its format never changes):
 * signed-in accounts leave its email empty and carry the LinkedIn only when ticked; demo mode (nothing to deliver them)
 * puts no user id in it and carries the first ticked email and LinkedIn instead.
 */
function MyCode({ me, name, ticket }) {
  const a = useStore(auth);
  const st = useStore(myCard);
  const navigate = useNavigate();
  const signedIn = isSignedIn(a);
  const demo = a.mode === "demo";
  const card = cardOf(st);
  const items = signedIn ? card.items || [] : [];
  const canShare = signedIn && canShareContact(card);
  const ticked = canShare ? keepKnown(Array.isArray(card.qrShare) ? card.qrShare : defaultIds(items), items) : [];
  useEffect(() => { if (signedIn) refreshCard(); }, [signedIn]);

  const code = shownCode({
    ticketId: ticket?.ticketId,
    connect: connectPayload({
      name, title: me.jobTitle || "", org: me.organization || "",
      ...qrContactFields(items, ticked, { local: demo }),
      userId: demo ? "" : me.id || "",
    }),
  });
  const isPass = code.kind === "pass";
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ text: code.value });
      else { await navigator.clipboard.writeText(code.value); showAlert("Copied", "Your code is on your clipboard."); }
    } catch { /* cancelled */ }
  };
  return (
    <div className="stack" style={{ alignItems: "center", textAlign: "center" }}>
      <div>
        <div className="eyebrow">Your TTFC code</div>
        <h2 style={{ margin: "4px 0 0", fontSize: 21 }}>{name}</h2>
        {me.jobTitle && <div className="muted">{[me.jobTitle, me.organization].filter(Boolean).join(" · ")}</div>}
        <p className="small" style={{ margin: "8px 0 0" }}>{isPass ? "Show it at the door and to people you meet." : "Show it to people you meet."}</p>
      </div>
      <div className="pass-qr" role="img" aria-label={isPass ? `Your TTFC code, pass ${ticket.ticketId}` : "Your TTFC code"}><QRCodeSVG value={code.value} size={240} level="M" marginSize={0} /></div>
      <section className="stack-sm" style={{ width: "100%", textAlign: "left" }} aria-labelledby="qr-get-h">
        {canShare && items.length > 0 ? (
          <ShareChecklist items={items} ticked={ticked} onChange={queueQrShare} fixed="Name, title and company" heading={<h3 id="qr-get-h" className="eyebrow">What they get</h3>} />
        ) : (
          <>
            <ShareChecklist items={[]} ticked={[]} onChange={() => {}} fixed="Name, title and company" heading={<h3 id="qr-get-h" className="eyebrow">What they get</h3>} />
            {signedIn && !canShare && <div className="note row-top"><ShieldOff aria-hidden="true" style={{ width: 18, height: 18, flex: "none", marginTop: 1 }} /><span>{SHARE_OFF_ERROR}</span></div>}
            {canShare && (
              <div className="cc-empty cc-empty--sheet">
                <p style={{ margin: 0 }}>You haven't added any contact details yet.</p>
                <Button size="sm" icon={Plus} onClick={() => { requestAddDetail(); navigate("/profile"); }}>Add contact details</Button>
              </div>
            )}
          </>
        )}
      </section>
      {signedIn && canShare && <p className="pass-share-note" style={{ textAlign: "left", width: "100%" }}>{PASS_SHARE_NOTE}</p>}
      <p className="muted small" style={{ margin: 0 }}>
        {isPass
          ? "Staff scan it to check you in. When someone you meet scans it, you're connected and they get what's ticked here."
          : "When someone you meet scans it, you're connected in person and they get what's ticked here. You can change it later from their profile."}
      </p>
      {/* The pass code stays off the clipboard: its ID signs you in with your last name. */}
      {!isPass && <Button block icon={Share2} onClick={share}>Share as text</Button>}
    </div>
  );
}
