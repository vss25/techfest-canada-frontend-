import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BadgeCheck, CheckCircle2, Link2, Plus, Share2, ShieldOff, Sun, Ticket } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useStore } from "../lib/store";
import { auth, bestTicket, cleanTicketId, isSignedIn, loadAccount } from "../lib/auth";
import { post } from "../lib/api";
import { LINKS } from "../lib/config";
import { connectPayload, passPayload } from "../lib/qr";
import { showAlert } from "../lib/ui";
import { canShareContact, cardOf, myCard, queueQrShare, refreshCard, requestAddDetail } from "../lib/myCard";
import { defaultIds, keepKnown, qrContactFields, SHARE_OFF_ERROR } from "../lib/contactCard";
import { Button, Segmented, TopBar } from "../components/ui";
import { ShareChecklist } from "../components/ShareSheet";
import AppleWalletButton from "../components/AppleWallet";
import { passInclusions } from "../lib/inclusions";

/* =========================================================
   My pass: the door QR ("TECHFEST:<ticketId>", the same code
   the apps and the website wallet show), what the pass includes
   (iOS TicketDetailView "What's included": the server's
   tickets[].inclusions, else the pass's list, lib/inclusions.js)
   and the connect QR other attendees scan to connect in person.
========================================================= */

export default function Pass() {
  const a = useStore(auth);
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "connect" ? "connect" : "pass";
  const ticket = bestTicket(a.user);
  const me = a.me || {};
  const name = me.name || a.user?.name || "";

  return (
    <div className="page">
      <TopBar title={tab === "pass" ? "My pass" : "Connect QR"} />
      <main id="main" className="pad mt-16 stack-lg">
        <Segmented label="Code" value={tab} onChange={(v) => setParams(v === "connect" ? { tab: "connect" } : {}, { replace: true })}
          options={[{ value: "pass", label: "My pass" }, { value: "connect", label: "Connect QR" }]} />
        {tab === "pass" ? <PassCode ticket={ticket} name={name} /> : <ConnectCode me={me} name={name} />}
      </main>
    </div>
  );
}

function PassCode({ ticket, name }) {
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
        <span className="ticket-date">TTFC 2026 · Oct 26–27</span>
        <span className="ticket-linked"><BadgeCheck aria-hidden="true" />LINKED · {ticket.ticketId.toUpperCase()}</span>
        <div className="pass-qr" role="img" aria-label={`Pass QR code for ${ticket.ticketId}`}>
          <QRCodeSVG value={passPayload(ticket.ticketId)} size={208} level="M" marginSize={0} />
        </div>
        {ticket.checkedIn && <span className="ticket-linked"><CheckCircle2 aria-hidden="true" />Checked in</span>}
        <span className="ticket-venue">The Westin Harbour Castle · Toronto, Canada</span>
        <span className="tiny muted row" style={{ gap: 6, justifyContent: "center" }}><Sun aria-hidden="true" style={{ width: 13, height: 13 }} />Show this at the door. Turn your screen brightness up.</span>
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
 * The connect QR (spec section 9). "What they get" is a checklist of my contact card
 * (PUT /social/contact-card/qr-share): the server hands the ticked details to whoever
 * scans it. The QR format never changes (lib/qr.js); signed-in accounts leave its email
 * empty and carry the LinkedIn only when ticked. Demo mode (nothing to deliver them) puts
 * no user id in it and carries the first ticked email and LinkedIn instead.
 */
function ConnectCode({ me, name }) {
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

  const payload = connectPayload({
    name, title: me.jobTitle || "", org: me.organization || "",
    ...qrContactFields(items, ticked, { local: demo }),
    userId: demo ? "" : me.id || "",
  });
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ text: payload });
      else { await navigator.clipboard.writeText(payload); showAlert("Copied", "Your connect code is on your clipboard."); }
    } catch { /* cancelled */ }
  };
  return (
    <div className="stack" style={{ alignItems: "center", textAlign: "center" }}>
      <div>
        <div className="eyebrow">My connect QR</div>
        <h2 style={{ margin: "4px 0 0", fontSize: 21 }}>{name}</h2>
        {me.jobTitle && <div className="muted">{[me.jobTitle, me.organization].filter(Boolean).join(" · ")}</div>}
      </div>
      <div className="pass-qr" role="img" aria-label="Your connect QR code"><QRCodeSVG value={payload} size={240} level="M" marginSize={0} /></div>
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
      <p className="muted small" style={{ margin: 0 }}>Show this when you meet someone. When they scan it, you're connected in person and they get what's ticked here. You can change it later from their profile.</p>
      <Button block icon={Share2} onClick={share}>Share as text</Button>
    </div>
  );
}
