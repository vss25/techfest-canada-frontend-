import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BadgeCheck, CheckCircle2, Link2, MinusCircle, Share2, Sun, Ticket } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useStore } from "../lib/store";
import { auth, bestTicket, cleanTicketId, loadAccount } from "../lib/auth";
import { post } from "../lib/api";
import { LINKS } from "../lib/config";
import { connectPayload, passPayload } from "../lib/qr";
import { showAlert } from "../lib/ui";
import { Button, Segmented, Switch, TopBar } from "../components/ui";

/* =========================================================
   My pass: the door QR ("TECHFEST:<ticketId>", the same code
   the apps and the website wallet show) and the connect QR
   other attendees scan to connect in person.
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
        {tab === "pass" ? <PassCode ticket={ticket} name={name} /> : <ConnectCode me={me} email={a.user?.email || me.email || ""} name={name} />}
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
      <section className="stack-sm" aria-labelledby="link-h">
        <h3 id="link-h" className="ticket-link-h">Link another pass</h3>
        <p className="tiny muted" style={{ margin: 0 }}>Bought with a different email? Enter the last name and ticket ID from that ticket email.</p>
        {form}
      </section>
    </div>
  );
}

function ConnectCode({ me, email, name }) {
  const [includeEmail, setIncludeEmail] = useState(true);
  const payload = connectPayload({ name, title: me.jobTitle || "", org: me.organization || "", linkedIn: me.linkedinUrl || "", email: includeEmail ? email : "", userId: me.id || "" });
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ text: payload });
      else { await navigator.clipboard.writeText(payload); showAlert("Copied", "Your connect code is on your clipboard."); }
    } catch { /* cancelled */ }
  };
  const has = (on) => (on ? <CheckCircle2 aria-label="Included" style={{ width: 17, height: 17, color: "var(--pur-alt)" }} /> : <MinusCircle aria-label="Not set" style={{ width: 17, height: 17, color: "var(--tx2)" }} />);
  return (
    <div className="stack" style={{ alignItems: "center", textAlign: "center" }}>
      <div>
        <div className="eyebrow">My connect QR</div>
        <h2 style={{ margin: "4px 0 0", fontSize: 21 }}>{name}</h2>
        {me.jobTitle && <div className="muted">{[me.jobTitle, me.organization].filter(Boolean).join(" · ")}</div>}
      </div>
      <div className="pass-qr" role="img" aria-label="Your connect QR code"><QRCodeSVG value={payload} size={240} level="M" marginSize={0} /></div>
      <div className="card" style={{ width: "100%", textAlign: "left" }}>
        <div className="section-title" style={{ marginBottom: 8 }}>What they get</div>
        <div className="row" style={{ minHeight: 36 }}><span style={{ flex: 1 }}>Name, title and organisation</span>{has(true)}</div>
        <div className="row" style={{ minHeight: 36 }}><span style={{ flex: 1 }}>LinkedIn</span>{has(!!me.linkedinUrl)}</div>
        <Switch label="Email address" checked={includeEmail} onChange={setIncludeEmail} />
      </div>
      <p className="muted small" style={{ margin: 0 }}>Show this when you meet someone. When they scan it in the TTFC app, you're connected as "met in person" and they get your card. No request to wait on.</p>
      <Button block icon={Share2} onClick={share}>Share as text</Button>
    </div>
  );
}
